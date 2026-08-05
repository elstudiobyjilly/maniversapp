import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedReaction, runOnJS, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { getVisionBoard, saveVisionBoard, setVisionBoardLock, uploadImage, createCheckout, getMindMovies } from '../../services/api';
import GradientBackground from '../../components/GradientBackground';
import UpgradeModal from '../../components/UpgradeModal';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { usePlanStore } from '../../store/planStore';
import { colors, fonts, radii, shadows } from '../../constants/theme';
import * as Linking from 'expo-linking';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CANVAS_WIDTH = SCREEN_WIDTH * 1.6;
const CANVAS_HEIGHT = 1000;
// The board's visible frame — fixed size, matches the website. Zooming
// scales/pans the content inside this frame; the frame itself never resizes.
const VIEWPORT_WIDTH = SCREEN_WIDTH - 32;
const VIEWPORT_HEIGHT = 500;
const ITEM_SIZE = 120;
// Zoom range for the board viewport. Max was 2x, which wasn't enough to
// actually inspect a busy board.
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const MIN_ITEM_SIZE = 60;

const CATEGORIES = ['💰 Wealth', '💕 Love', '🌿 Health', '🚀 Career', '🏡 Home', '✨ Purpose', '🕊️ Peace'];

// Board items can carry the image under different keys depending on where
// they were created: the website writes `src` locally and normalises to
// `url` when syncing to the backend (explore.js), and the Mind Movie
// picker hands over `image`. Reading only `url` left website-authored
// items rendering blank, so accept all three like the site does.
function itemUri(item) {
  return item?.url || item?.src || item?.image || '';
}

// An item's image URL can 404 or expire (R2 objects are replaceable) — show
// a visible placeholder instead of a blank tile so the board never looks
// silently empty.
function BoardImage({ uri, style }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={[style, styles.imageFallback]}>
        <Text style={styles.imageFallbackIcon}>🖼️</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={style} onError={() => setFailed(true)} />;
}

function DraggableImage({ item, index, isLocked, selectMode, selected, onMove, onResize, onRemove, onToggleSelect, onLongPressItem }) {
  const translateX = useSharedValue(item.x || 0);
  const translateY = useSharedValue(item.y || 0);
  const startX = useSharedValue(item.x || 0);
  const startY = useSharedValue(item.y || 0);

  const width = useSharedValue(item.w || ITEM_SIZE);
  const height = useSharedValue(item.h || ITEM_SIZE);
  const startW = useSharedValue(item.w || ITEM_SIZE);
  const startH = useSharedValue(item.h || ITEM_SIZE);

  // Re-sync from props when something outside this gesture changes position/size
  // (e.g. Tidy, Group, or a fresh load) — without this the shared values would
  // keep showing the stale spot since they only update from the gestures below.
  useEffect(() => {
    translateX.value = item.x || 0;
    translateY.value = item.y || 0;
  }, [item.x, item.y]);

  useEffect(() => {
    width.value = item.w || ITEM_SIZE;
    height.value = item.h || ITEM_SIZE;
  }, [item.w, item.h]);

  const resizePan = Gesture.Pan()
    .enabled(!isLocked && !selectMode)
    .hitSlop(10)
    .onStart(() => {
      startW.value = width.value;
      startH.value = height.value;
    })
    .onUpdate((e) => {
      width.value = Math.max(MIN_ITEM_SIZE, startW.value + e.translationX);
      height.value = Math.max(MIN_ITEM_SIZE, startH.value + e.translationY);
    })
    .onEnd(() => {
      runOnJS(onResize)(index, width.value, height.value);
    });

  const movePan = Gesture.Pan()
    .enabled(!isLocked && !selectMode)
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      const clampedX = Math.max(0, Math.min(CANVAS_WIDTH - width.value, translateX.value));
      const clampedY = Math.max(0, Math.min(CANVAS_HEIGHT - height.value, translateY.value));
      translateX.value = clampedX;
      translateY.value = clampedY;
      runOnJS(onMove)(index, clampedX, clampedY);
    });

  // The resize handle sits on the same draggable container as the move gesture.
  // Without this, a touch on the handle could activate both gestures at once
  // (move AND resize from a single drag). requireExternalGestureToFail makes
  // movePan wait to see whether the touch landed on the handle first.
  movePan.requireExternalGestureToFail(resizePan);

  // Press-and-hold on the image opens the category picker — matches the
  // website's "Press and hold an image for a moment to add a category" hint.
  const longPress = Gesture.LongPress()
    .enabled(!isLocked && !selectMode)
    .minDuration(500)
    .onStart(() => {
      runOnJS(onLongPressItem)(index);
    });

  const moveOrLongPress = Gesture.Race(longPress, movePan);

  const tapToSelect = Gesture.Tap().onEnd(() => {
    runOnJS(onToggleSelect)(index);
  });

  const containerStyle = useAnimatedStyle(() => ({
    width: width.value,
    height: height.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={selectMode ? tapToSelect : moveOrLongPress}>
      <Animated.View style={[styles.draggable, containerStyle, selected && styles.draggableSelected]}>
        <BoardImage uri={itemUri(item)} style={styles.image} />
        {item.category ? (
          <View style={styles.categoryBadge}><Text style={styles.categoryBadgeText}>{item.category}</Text></View>
        ) : null}
        {selectMode && (
          <View style={[styles.selectCheck, selected && styles.selectCheckOn]}>
            {selected ? <Text style={styles.selectCheckText}>✓</Text> : null}
          </View>
        )}
        {!isLocked && !selectMode && (
          <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(index)}>
            <Text style={styles.removeText}>✕</Text>
          </TouchableOpacity>
        )}
        {!isLocked && !selectMode && (
          <GestureDetector gesture={resizePan}>
            <View style={styles.resizeHandle}>
              <Text style={styles.resizeHandleIcon}>◢</Text>
            </View>
          </GestureDetector>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export default function VisionBoard() {
  const insets = useSafeAreaInsets();
  const { limits, loaded, hasFeature, refresh } = usePlanStore();
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [items, setItems] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loadingMM, setLoadingMM] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savingWallpaper, setSavingWallpaper] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [fullscreen, setFullscreen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [categorizingIndex, setCategorizingIndex] = useState(null);

  useEffect(() => {
    refresh().finally(() => setCheckingPlan(false));
  }, []);

  const imageCap = limits?.vision_board_images_active; // paid: 40, free: n/a (blocked entirely)

  const handleSelectPlan = async (priceKey) => {
    try {
      const res = await createCheckout(priceKey);
      if (res?.url) await Linking.openURL(res.url);
    } catch (e) {
      setError(e.message || 'Could not start checkout');
    }
  };

  const canvasRef = useRef(null);

  // The board FRAME is a fixed-size viewport (matches the website — zooming
  // never resizes the board itself). zoom/pan only move the content around
  // inside that fixed frame, like a camera zooming into a photo rather than
  // the photo's frame growing.
  const zoom = useSharedValue(1);
  const savedZoom = useSharedValue(1);
  const [zoomPct, setZoomPct] = useState(100);

  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const startPanX = useSharedValue(0);
  const startPanY = useSharedValue(0);

  useAnimatedReaction(
    () => zoom.value,
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setZoomPct)(Math.round(current * 100));
      }
    },
    []
  );

  const setZoomTo = (value) => {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value));
    zoom.value = withTiming(clamped, { duration: 200 });
    savedZoom.value = clamped;
    if (clamped === 1) { panX.value = withTiming(0); panY.value = withTiming(0); }
  };

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedZoom.value = zoom.value;
    })
    .onUpdate((e) => {
      const next = savedZoom.value * e.scale;
      zoom.value = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
    })
    .onEnd(() => {
      savedZoom.value = zoom.value;
    });

  // While editing, a single finger drags individual images, so panning the
  // board needs two fingers. When the board is locked or in fullscreen the
  // images aren't draggable, so a single finger should pan — requiring two
  // fingers just to look around a zoomed-in board is what made viewing feel
  // stuck.
  const panNeedsTwoFingers = !isLocked && !fullscreen;
  const panGesture = Gesture.Pan()
    .minPointers(panNeedsTwoFingers ? 2 : 1)
    .onStart(() => {
      startPanX.value = panX.value;
      startPanY.value = panY.value;
    })
    .onUpdate((e) => {
      panX.value = startPanX.value + e.translationX;
      panY.value = startPanY.value + e.translationY;
    });

  const canvasGestures = Gesture.Simultaneous(pinchGesture, panGesture);

  // The board's boundary (border/background) stays a fixed size — only the
  // content inside it scales+pans. Pan is clamped so the content can never
  // be dragged fully out of the fixed frame.
  const canvasAnimatedStyle = useAnimatedStyle(() => {
    const scaledW = CANVAS_WIDTH * zoom.value;
    const scaledH = CANVAS_HEIGHT * zoom.value;
    const maxPanX = Math.max(0, (scaledW - VIEWPORT_WIDTH) / 2);
    const maxPanY = Math.max(0, (scaledH - VIEWPORT_HEIGHT) / 2);
    const clampedX = Math.min(maxPanX, Math.max(-maxPanX, panX.value));
    const clampedY = Math.min(maxPanY, Math.max(-maxPanY, panY.value));
    return {
      transform: [
        { translateX: clampedX },
        { translateY: clampedY },
        { scale: zoom.value },
      ],
    };
  });

  const load = async () => {
    try {
      const board = await getVisionBoard();
      setItems(board.items || []);
      setIsLocked(board.is_locked || false);
    } catch (e) {
      setError(e.message || 'Could not load vision board');
    }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const persist = async (updatedItems) => {
    try { await saveVisionBoard(updatedItems); } catch (e) { setError(e.message || 'Could not save'); }
  };

  const handleMove = (index, x, y) => {
    setItems((prev) => {
      const updated = prev.map((it, i) => (i === index ? { ...it, x, y } : it));
      persist(updated);
      return updated;
    });
  };

  const handleResize = (index, w, h) => {
    setItems((prev) => {
      const updated = prev.map((it, i) => (i === index ? { ...it, w, h } : it));
      persist(updated);
      return updated;
    });
  };

  const handleAddImage = async () => {
    if (isLocked) { setError('Unlock the board to add images.'); return; }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Photo library permission needed.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;

    // Active-slot cap check (paid plans: 40 images at a time) — mirrors
    // vision_board.py's img_cap check, done client-side too so the user
    // gets an immediate message instead of a round-trip 422.
    if (imageCap != null && items.length >= imageCap) {
      setError(`Vision board limit is ${imageCap} images — remove some to add more. ✨`);
      return;
    }

    setUploading(true); setError('');
    try {
      const cloudUrl = await uploadImage(result.assets[0].uri, 'vision-board');
      const randX = Math.floor(Math.random() * Math.max(1, CANVAS_WIDTH - ITEM_SIZE));
      const randY = Math.floor(Math.random() * Math.max(1, CANVAS_HEIGHT - ITEM_SIZE));
      const newItem = { url: cloudUrl, label: '', type: 'image', x: randX, y: randY, w: ITEM_SIZE, h: ITEM_SIZE };
      const updatedItems = [...items, newItem];
      const saved = await saveVisionBoard(updatedItems);
      setItems(saved.items || updatedItems);
    } catch (e) {
      // Backend may still reject (403 upgrade_required / 422 cap) even if
      // our client-side checks passed (e.g. plan changed elsewhere) — show
      // the paywall for the 403 case instead of a raw error string.
      if (e.status === 403) setShowUpgrade(true);
      else setError(e.message || 'Could not upload image');
    } finally { setUploading(false); }
  };

  // Pulls every scene image out of the user's saved Mind Movies and adds any
  // not already on the board — matches the website's "From Mind Movies" button.
  const handleFromMindMovies = async () => {
    if (isLocked) { setError('Unlock the board to add images.'); return; }
    setLoadingMM(true); setError(''); setInfo('');
    try {
      const movies = await getMindMovies();
      const urls = [];
      (movies || []).forEach((m) => (m.scenes || []).forEach((s) => { if (s.img) urls.push(s.img); }));
      const existing = new Set(items.map(itemUri));
      const fresh = [...new Set(urls)].filter((u) => !existing.has(u));
      if (fresh.length === 0) { setInfo('No new Mind Movie images to add.'); setTimeout(() => setInfo(''), 3000); return; }

      const capRemaining = imageCap != null ? Math.max(0, imageCap - items.length) : fresh.length;
      const toAdd = fresh.slice(0, capRemaining);
      if (toAdd.length === 0) { setError(`Vision board limit is ${imageCap} images — remove some to add more. ✨`); return; }

      const newItems = toAdd.map((url) => ({
        url, label: '', type: 'image',
        x: Math.floor(Math.random() * Math.max(1, CANVAS_WIDTH - ITEM_SIZE)),
        y: Math.floor(Math.random() * Math.max(1, CANVAS_HEIGHT - ITEM_SIZE)),
        w: ITEM_SIZE, h: ITEM_SIZE,
      }));
      const updatedItems = [...items, ...newItems];
      const saved = await saveVisionBoard(updatedItems);
      setItems(saved.items || updatedItems);
      setInfo(`Added ${toAdd.length} image${toAdd.length === 1 ? '' : 's'} from Mind Movies ✨`);
      setTimeout(() => setInfo(''), 3000);
    } catch (e) {
      if (e.status === 403) setShowUpgrade(true);
      else setError(e.message || 'Could not load Mind Movies');
    } finally { setLoadingMM(false); }
  };

  const handleRemove = async (index) => {
    if (isLocked) { setError('Unlock the board to remove images.'); return; }
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    persist(updatedItems);
  };

  const handleToggleLock = async () => {
    const next = !isLocked;
    setIsLocked(next);
    if (next) { setSelectMode(false); setSelectedIndices([]); }
    try { await setVisionBoardLock(next); } catch (e) { setError(e.message || 'Could not update lock'); }
  };

  const handleTidy = () => {
    if (isLocked) { setError('Unlock the board to tidy it.'); return; }
    const cols = Math.max(1, Math.floor(CANVAS_WIDTH / (ITEM_SIZE + 14)));
    const tidied = items.map((it, i) => ({
      ...it,
      x: (i % cols) * (ITEM_SIZE + 14) + 10,
      y: Math.floor(i / cols) * (ITEM_SIZE + 14) + 10,
    }));
    setItems(tidied);
    persist(tidied);
  };

  // Toggling on enters selection mode (tap images to select instead of
  // dragging them); toggling off clusters whatever's selected together —
  // matches the website's "Group" button.
  const handleGroupToggle = () => {
    if (isLocked) { setError('Unlock the board to group images.'); return; }
    if (selectMode) {
      if (selectedIndices.length > 1) {
        const cx = CANVAS_WIDTH / 2 - ITEM_SIZE / 2;
        const cy = CANVAS_HEIGHT / 2 - ITEM_SIZE / 2;
        const updated = items.map((it, i) => {
          const pos = selectedIndices.indexOf(i);
          return pos === -1 ? it : { ...it, x: cx + pos * 18, y: cy + pos * 18 };
        });
        setItems(updated);
        persist(updated);
      }
      setSelectedIndices([]);
    }
    setSelectMode((v) => !v);
  };

  const toggleSelect = (index) => {
    setSelectedIndices((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
  };

  const handleLongPressItem = (index) => setCategorizingIndex(index);

  const handleSetCategory = (cat) => {
    if (categorizingIndex == null) return;
    const updated = items.map((it, i) => (i === categorizingIndex ? { ...it, category: cat } : it));
    setItems(updated);
    persist(updated);
    setCategorizingIndex(null);
  };

  const handleClear = () => {
    if (isLocked) { setError('Unlock the board to clear it.'); return; }
    setItems([]);
    persist([]);
  };

  const handleDownload = async () => {
    setError(''); setInfo(''); setDownloading(true);
    try {
      const uri = await captureRef(canvasRef, { format: 'png', quality: 1 });
      const { granted } = await MediaLibrary.requestPermissionsAsync();
      if (!granted) {
        setError('Photo library permission is needed to save your vision board.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      setInfo('Saved to your photos ✨');
      setTimeout(() => setInfo(''), 3000);
    } catch (e) {
      setError(e.message || 'Could not save your vision board');
    } finally { setDownloading(false); }
  };

  // Expo has no cross-platform "set system wallpaper" API, so this saves a
  // full-quality capture to Photos and tells the user to set it from there.
  const handleWallpaper = async () => {
    setError(''); setInfo(''); setSavingWallpaper(true);
    try {
      const uri = await captureRef(canvasRef, { format: 'png', quality: 1 });
      const { granted } = await MediaLibrary.requestPermissionsAsync();
      if (!granted) {
        setError('Photo library permission is needed to save your wallpaper.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      setInfo('Saved to Photos — set it as your wallpaper from there ✨');
      setTimeout(() => setInfo(''), 3500);
    } catch (e) {
      setError(e.message || 'Could not create wallpaper');
    } finally { setSavingWallpaper(false); }
  };

  const handleShare = async () => {
    setError(''); setInfo(''); setSharing(true);
    try {
      const uri = await captureRef(canvasRef, { format: 'png', quality: 1 });
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        setInfo('Sharing isn\'t available on this device.');
        return;
      }
      await Sharing.shareAsync(uri);
    } catch (e) {
      setError(e.message || 'Could not share your vision board');
    } finally { setSharing(false); }
  };

  if (checkingPlan || loading) {
    return <GradientBackground><View style={styles.center}><ActivityIndicator size="large" color="#c9a8c9" /></View></GradientBackground>;
  }

  // Free users never see the toolbar or grid at all — matches website's
  // plan-gate.js rule #1 (Vision Board upsell preview replaces the panel).
  if (loaded && !hasFeature('vision_board')) {
    return (
      <GradientBackground>
        <View style={styles.upsellWrap}>
          <Text style={styles.upsellIcon}>🖼️</Text>
          <ScreenHeader lead="Your" accent="Vision Board" subtitle="Pin your dreams, see them daily, and watch them become real." style={{ alignItems: 'center', marginBottom: 20 }} />
          <View style={styles.upsellPerks}>
            <Text style={styles.upsellPerk}>✓ Drag, resize, and arrange your own board</Text>
            <Text style={styles.upsellPerk}>✓ Up to 40 images, saved forever</Text>
            <Text style={styles.upsellPerk}>✓ Download or share your board anytime</Text>
          </View>
          <Button title="Upgrade to Unlock ✨" onPress={() => setShowUpgrade(true)} />
        </View>
        <UpgradeModal
          visible={showUpgrade}
          message="Vision Board is a Basic Manifestor feature — upgrade to start pinning your dreams."
          onClose={() => setShowUpgrade(false)}
          onSelectPlan={handleSelectPlan}
        />
      </GradientBackground>
    );
  }

  const canvasNode = (
    <View style={[styles.viewport, fullscreen && styles.viewportFullscreen]}>
      <GestureDetector gesture={canvasGestures}>
        <Animated.View
          ref={canvasRef}
          collapsable={false}
          style={[styles.canvas, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }, canvasAnimatedStyle]}
        >
          {items.map((item, i) => (
            <DraggableImage
              key={i}
              item={item}
              index={i}
              isLocked={isLocked}
              selectMode={selectMode}
              selected={selectedIndices.includes(i)}
              onMove={handleMove}
              onResize={handleResize}
              onRemove={handleRemove}
              onToggleSelect={toggleSelect}
              onLongPressItem={handleLongPressItem}
            />
          ))}
          {items.length === 0 && (
            <Text style={styles.emptyText}>Your vision board is empty — add your first image ✨</Text>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );

  return (
    <GradientBackground>
      {!fullscreen && (
        <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 16 }}>
          <ScreenHeader lead="Your" accent="Vision Board" subtitle="Pin your dreams. See them. Feel them. Receive them." />

          <View style={styles.controlRow}>
            <Button title="📸 Add Photos" size="sm" onPress={handleAddImage} loading={uploading} disabled={isLocked} />
            <TouchableOpacity style={styles.controlPill} onPress={handleFromMindMovies} disabled={loadingMM}>
              {loadingMM ? <ActivityIndicator size="small" color="#2e2530" /> : <Text style={styles.controlText}>🎬 From Mind Movies</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlPill, isLocked && styles.controlPillActive]} onPress={handleToggleLock}>
              <Text style={[styles.controlText, isLocked && styles.controlTextActive]}>{isLocked ? '🔒 Locked' : '🔓 Lock'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlPill} onPress={() => setFullscreen(true)}>
              <Text style={styles.controlText}>⛶ Fullscreen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlPill} onPress={handleTidy}>
              <Text style={styles.controlText}>✨ Tidy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlPill, selectMode && styles.controlPillActive]} onPress={handleGroupToggle}>
              <Text style={[styles.controlText, selectMode && styles.controlTextActive]}>🗂 Group{selectMode && selectedIndices.length ? ` (${selectedIndices.length})` : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlPill} onPress={handleDownload} disabled={downloading}>
              {downloading ? <ActivityIndicator size="small" color="#2e2530" /> : <Text style={styles.controlText}>⬇️ Board</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlPill} onPress={handleWallpaper} disabled={savingWallpaper}>
              {savingWallpaper ? <ActivityIndicator size="small" color="#2e2530" /> : <Text style={styles.controlText}>📱 Wallpaper</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlPill} onPress={handleShare} disabled={sharing}>
              {sharing ? <ActivityIndicator size="small" color="#2e2530" /> : <Text style={styles.controlText}>🔗 Share</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlPill, styles.controlPillDanger]} onPress={handleClear}>
              <Text style={[styles.controlText, styles.controlTextDanger]}>🗑️ Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.zoomRow}>
            <TouchableOpacity style={styles.zoomBtn} onPress={() => setZoomTo(zoom.value - 0.1)}>
              <Text style={styles.zoomBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.zoomPct}>{zoomPct}%</Text>
            <TouchableOpacity style={styles.zoomBtn} onPress={() => setZoomTo(zoom.value + 0.1)}>
              <Text style={styles.zoomBtnText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fitBtn} onPress={() => setZoomTo(1)}>
              <Text style={styles.fitBtnText}>⟳ Fit</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {info ? <Text style={styles.infoText}>{info}</Text> : null}
          <Text style={styles.hintText}>Drag to move · Pinch or two-finger drag to zoom/pan the board · Resize from corner · Lock when done ✨</Text>
          <Text style={styles.hintText}>Press and hold an image for a moment to add a category 🏷️</Text>
        </View>
      )}

      {canvasNode}

      {fullscreen && (
        <TouchableOpacity style={styles.fullscreenClose} onPress={() => setFullscreen(false)}>
          <Text style={styles.fullscreenCloseText}>✕ Exit Fullscreen</Text>
        </TouchableOpacity>
      )}

      {!fullscreen && (
        <Button
          title="+ Add Image"
          onPress={handleAddImage}
          loading={uploading}
          disabled={isLocked}
          fullWidth
          style={{ marginHorizontal: 16, marginVertical: 14 }}
        />
      )}

      {categorizingIndex != null && (
        <View style={styles.categoryOverlay}>
          <View style={styles.categoryPanel}>
            <Text style={styles.categoryPanelTitle}>Tag this image</Text>
            <View style={styles.categoryChipRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c} style={styles.categoryChip} onPress={() => handleSetCategory(c)}>
                  <Text style={styles.categoryChipText}>{c}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.categoryChip, styles.categoryChipClear]} onPress={() => handleSetCategory('')}>
                <Text style={styles.categoryChipText}>✕ Remove</Text>
              </TouchableOpacity>
            </View>
            <Button title="Close" size="sm" variant="ghost" onPress={() => setCategorizingIndex(null)} style={{ marginTop: 12 }} />
          </View>
        </View>
      )}

      <UpgradeModal
        visible={showUpgrade}
        message="You've reached your Vision Board image limit — upgrade for more room."
        onClose={() => setShowUpgrade(false)}
        onSelectPlan={handleSelectPlan}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  upsellWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingTop: 60 },
  upsellIcon: { fontSize: 44, marginBottom: 10 },
  upsellPerks: { alignSelf: 'stretch', marginBottom: 24 },
  upsellPerk: { fontFamily: fonts.body, fontSize: 13, color: colors.ink2, marginBottom: 8, textAlign: 'center' },
  controlRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10, alignItems: 'center' },
  controlPill: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: radii.pill, paddingVertical: 9, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', minWidth: 44, alignItems: 'center' },
  controlPillActive: { backgroundColor: colors.pinkAccent, borderColor: colors.pinkAccent },
  controlPillDanger: { borderColor: colors.dangerBorder },
  controlText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.ink, fontWeight: '500' },
  controlTextActive: { color: '#fff' },
  controlTextDanger: { color: colors.danger },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  zoomBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)' },
  zoomBtnText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.ink, fontWeight: '600' },
  zoomPct: { fontFamily: fonts.body, fontSize: 13, color: colors.mist, minWidth: 40, textAlign: 'center' },
  fitBtn: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: radii.pill, paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)' },
  fitBtnText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.ink, fontWeight: '500' },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 12, marginBottom: 6 },
  infoText: { fontFamily: fonts.body, color: colors.purpleDark, fontSize: 12, marginBottom: 6 },
  hintText: { fontFamily: fonts.displayItalic, color: colors.mist, fontSize: 12, marginBottom: 4, fontStyle: 'italic' },
  // Fixed-size frame — never resizes with zoom, matching the website. Content
  // inside it scales/pans via canvasAnimatedStyle; overflow is clipped here.
  viewport: {
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    alignSelf: 'center',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(200,120,180,0.35)',
    overflow: 'hidden',
    marginTop: 10,
    ...shadows.card,
  },
  viewportFullscreen: { flex: 1, width: '100%', height: '100%', borderRadius: 0, marginTop: 0 },
  canvas: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    position: 'absolute',
    left: (VIEWPORT_WIDTH - CANVAS_WIDTH) / 2,
    top: (VIEWPORT_HEIGHT - CANVAS_HEIGHT) / 2,
  },
  draggable: { position: 'absolute' },
  draggableSelected: { borderWidth: 2, borderColor: colors.pinkAccent, borderRadius: 14 },
  image: { width: '100%', height: '100%', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.4)' },
  imageFallback: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(201,168,201,0.18)',
    borderWidth: 1, borderColor: 'rgba(201,168,201,0.35)', borderStyle: 'dashed',
  },
  imageFallbackIcon: { fontSize: 26, opacity: 0.55 },
  removeBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: '#c04040', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  removeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  resizeHandle: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(154,95,168,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resizeHandleIcon: { fontSize: 10, color: '#9a5fa8' },
  emptyText: { color: '#6b5c66', fontSize: 13, textAlign: 'center', marginTop: 300, paddingHorizontal: 30, width: '100%' },

  categoryBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 7 },
  categoryBadgeText: { color: '#fff', fontSize: 9.5, fontFamily: fonts.bodyMedium, fontWeight: '600' },

  selectCheck: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1.5, borderColor: colors.pinkAccent, justifyContent: 'center', alignItems: 'center' },
  selectCheckOn: { backgroundColor: colors.pinkAccent },
  selectCheckText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  fullscreenClose: { position: 'absolute', top: 50, right: 16, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radii.pill, paddingVertical: 8, paddingHorizontal: 14, zIndex: 10 },
  fullscreenCloseText: { color: '#fff', fontFamily: fonts.bodyMedium, fontSize: 12, fontWeight: '600' },

  categoryOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  categoryPanel: { backgroundColor: '#fdfbfe', borderRadius: radii.md, padding: 20, width: '100%', maxWidth: 360 },
  categoryPanelTitle: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.ink, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  categoryChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  categoryChip: { backgroundColor: 'rgba(201,168,201,0.15)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.35)', borderRadius: radii.pill, paddingVertical: 8, paddingHorizontal: 12 },
  categoryChipClear: { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder },
  categoryChipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.ink2, fontWeight: '500' },
});
