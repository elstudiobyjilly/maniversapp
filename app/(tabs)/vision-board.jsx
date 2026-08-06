import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedReaction, runOnJS, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { getVisionBoard, saveVisionBoard, setVisionBoardLock, uploadImage, createCheckout, getMindMovies } from '../../services/api';
import { safeImageUri } from '../../services/imageUri';
import GradientBackground from '../../components/GradientBackground';
import UpgradeModal from '../../components/UpgradeModal';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { usePlanStore } from '../../store/planStore';
import { useUiStore } from '../../store/uiStore';
import { colors, fonts, radii, shadows } from '../../constants/theme';
import * as Linking from 'expo-linking';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
// Matches the website exactly (explore.js: V_BOARD_W / V_BOARD_H) — a
// FIXED 1600×2000 board, not something derived from the phone's screen
// size. Every item's x/y is a pixel position within this exact canvas on
// both platforms, and the website clamps every item to stay inside these
// bounds on every move/save — so this size is always big enough to reach
// every item, on any device.
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 2000;
// The board's visible frame — fixed size. Zooming scales/pans the content
// inside this frame; the frame itself never resizes.
const VIEWPORT_WIDTH = SCREEN_WIDTH - 32;
// The toolbar is now two compact, horizontally-scrollable rows instead of
// a wrapping cluster of pills that could eat 3-4 rows of vertical space —
// that freed-up room goes straight to the board, which is why this now
// only reserves 300px above/below instead of 380.
const VIEWPORT_HEIGHT = Math.max(420, Math.min(960, SCREEN_HEIGHT - 300));
const ITEM_SIZE = 120;
// Zoom range. Max was 2x, which wasn't enough to actually inspect a busy
// board. The minimum is NOT a flat constant — see minZoomFor() below,
// which matches the website's rule (explore.js _vMinZoom): the board can
// never zoom out past "cover scale" (still fully filling the frame on
// both axes, like CSS background-size:cover). A flat 0.2 minimum let the
// board shrink well past that, exposing the frame's own background as
// dead space around it — that's the "a lot of space behind the board"
// bug. Bottoming out at cover-scale instead means the frame's background
// is never visible, at any zoom, exactly like the website.
const ZOOM_MAX = 3;
function minZoomFor(viewportW, viewportH) {
  return Math.max(viewportW / CANVAS_WIDTH, viewportH / CANVAS_HEIGHT, 0.05);
}
const MIN_ITEM_SIZE = 60;

const CATEGORIES = ['💰 Wealth', '💕 Love', '🌿 Health', '🚀 Career', '🏡 Home', '✨ Purpose', '🕊️ Peace'];

// Board items can carry the image under different keys depending on where
// they were created: the website writes `src` locally and normalises to
// `url` when syncing to the backend (explore.js), and the Mind Movie
// picker hands over `image`. Reading only `url` left website-authored
// items rendering blank, so accept all three like the site does.
function itemUri(item) {
  const candidate = item?.url || item?.src || item?.image || '';
  // Guard against a non-string value (e.g. a nested {url,...} object under
  // `image`) reaching <Image>, which fails to load immediately with no
  // useful error — every tile would show the fallback at once, which is
  // exactly the "nothing loads" symptom this was likely causing.
  return typeof candidate === 'string' ? candidate : (candidate?.url || candidate?.src || '');
}

// An item's image URL can 404 or expire (R2 objects are replaceable) — show
// a visible placeholder instead of a blank tile so the board never looks
// silently empty.
function BoardImage({ uri, style }) {
  const [failed, setFailed] = useState(false);
  // R2 keys with spaces/special characters in the original filename hit
  // iOS's "Protocol error" in RN's Image (which, unlike a browser <img>,
  // doesn't auto-encode the URL) — confirmed from the on-device debug text.
  // safeImageUri re-encodes the path/query safely without double-encoding
  // URLs that are already clean.
  const safeUri = safeImageUri(uri);
  if (!safeUri || failed) {
    return (
      <View style={[style, styles.imageFallback]}>
        <Text style={styles.imageFallbackIcon}>🖼️</Text>
      </View>
    );
  }
  return <Image source={{ uri: safeUri }} style={style} onError={() => setFailed(true)} />;
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
  // Mind Movie picker -- a grid of every scene image across all saved
  // Mind Movies, so adding to the board is a deliberate pick rather than
  // a silent "add everything new" dump.
  const [mmPickerOpen, setMmPickerOpen] = useState(false);
  const [mmImages, setMmImages] = useState([]); // [{ url, movieTitle }]
  const [mmSelected, setMmSelected] = useState(() => new Set());
  const [mmAdding, setMmAdding] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savingWallpaper, setSavingWallpaper] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [fullscreen, setFullscreen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [categorizingIndex, setCategorizingIndex] = useState(null);
  const setTabBarHidden = useUiStore((s) => s.setTabBarHidden);

  useEffect(() => {
    refresh().finally(() => setCheckingPlan(false));
  }, []);

  // The floating tab bar is a screen-wide overlay drawn by the tab layout,
  // not something this screen's own layout can push below itself -- in
  // fullscreen mode the board fills the entire screen, so the tab bar was
  // sitting on top of (overlapping) the bottom of the board. Hide it while
  // fullscreen is active, and always restore it on the way out (including
  // navigating away without exiting fullscreen first).
  useEffect(() => {
    setTabBarHidden(fullscreen);
    return () => setTabBarHidden(false);
  }, [fullscreen]);

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

  // The frame is the full screen in fullscreen mode, the normal fixed
  // viewport otherwise — minZoom (cover-scale) is recalculated for
  // whichever is currently active, same as the website re-applying scale
  // on its own viewport-size changes.
  const viewportW = fullscreen ? SCREEN_WIDTH : VIEWPORT_WIDTH;
  const viewportH = fullscreen ? SCREEN_HEIGHT : VIEWPORT_HEIGHT;
  const minZoom = useMemo(() => minZoomFor(viewportW, viewportH), [viewportW, viewportH]);

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

  // Bottoms out the board at cover-scale instead of a flat minimum — the
  // board always completely fills the frame, at any zoom, so the frame's
  // own background is never visible as dead space around it (matches the
  // website's _vApplyScale / _vMinZoom exactly). Re-clamps whenever the
  // frame itself changes size (entering/exiting fullscreen).
  useEffect(() => {
    if (zoom.value < minZoom) {
      zoom.value = withTiming(minZoom, { duration: 200 });
      savedZoom.value = minZoom;
    }
  }, [minZoom]);

  const setZoomTo = (value) => {
    const clamped = Math.max(minZoom, Math.min(ZOOM_MAX, value));
    zoom.value = withTiming(clamped, { duration: 200 });
    savedZoom.value = clamped;
  };

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedZoom.value = zoom.value;
    })
    .onUpdate((e) => {
      const next = savedZoom.value * e.scale;
      zoom.value = Math.max(minZoom, Math.min(ZOOM_MAX, next));
    })
    .onEnd(() => {
      savedZoom.value = zoom.value;
    });

  // Single finger pans the board by dragging empty canvas space, matching
  // the website ("Drag empty space to pan"). This doesn't conflict with
  // per-image dragging: each DraggableImage has its own nested
  // GestureDetector (movePan), and react-native-gesture-handler gives a
  // touch that starts on an image to that inner handler first — this outer
  // canvas pan only ever gets touches that start on empty background.
  // Previously this required two fingers whenever the board was unlocked,
  // which is why panning felt broken/stuck and only pinch-zoom worked.
  const panGesture = Gesture.Pan()
    .minPointers(1)
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
    const maxPanX = Math.max(0, (scaledW - viewportW) / 2);
    const maxPanY = Math.max(0, (scaledH - viewportH) / 2);
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

  // Pulls every scene image out of the user's saved Mind Movies and opens a
  // picker grid so adding to the board is a deliberate choice, not a
  // silent "add everything new" dump like before.
  const handleFromMindMovies = async () => {
    if (isLocked) { setError('Unlock the board to add images.'); return; }
    setLoadingMM(true); setError(''); setInfo('');
    try {
      const movies = await getMindMovies();
      const seen = new Set();
      const all = [];
      (movies || []).forEach((m) => (m.scenes || []).forEach((s) => {
        if (s.img && !seen.has(s.img)) { seen.add(s.img); all.push({ url: s.img, movieTitle: m.title || 'Mind Movie' }); }
      }));
      if (all.length === 0) { setInfo('No Mind Movie images yet — add some scenes first.'); setTimeout(() => setInfo(''), 3000); return; }

      const existing = new Set(items.map(itemUri));
      setMmImages(all);
      // Pre-select whatever isn't already on the board, so confirming with
      // no changes reproduces the old "add everything new" behaviour.
      setMmSelected(new Set(all.filter((img) => !existing.has(img.url)).map((img) => img.url)));
      setMmPickerOpen(true);
    } catch (e) {
      if (e.status === 403) setShowUpgrade(true);
      else setError(e.message || 'Could not load Mind Movies');
    } finally { setLoadingMM(false); }
  };

  const toggleMmSelected = (url) => {
    setMmSelected((prev) => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  };

  const handleConfirmMmSelection = async () => {
    const existing = new Set(items.map(itemUri));
    const chosen = mmImages.map((img) => img.url).filter((u) => mmSelected.has(u) && !existing.has(u));
    if (chosen.length === 0) { setMmPickerOpen(false); return; }

    const capRemaining = imageCap != null ? Math.max(0, imageCap - items.length) : chosen.length;
    const toAdd = chosen.slice(0, capRemaining);
    if (toAdd.length === 0) {
      setError(`Vision board limit is ${imageCap} images — remove some to add more. ✨`);
      setMmPickerOpen(false);
      return;
    }

    setMmAdding(true);
    try {
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
      setMmPickerOpen(false);
    } catch (e) {
      if (e.status === 403) setShowUpgrade(true);
      else setError(e.message || 'Could not add images');
    } finally { setMmAdding(false); }
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
          style={[
            styles.canvas,
            {
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              left: (viewportW - CANVAS_WIDTH) / 2,
              top: (viewportH - CANVAS_HEIGHT) / 2,
            },
            canvasAnimatedStyle,
          ]}
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
      {/* The page itself has to scroll -- previously this whole screen was
          a plain View (no ScrollView), so once the toolbar wrapped across
          several rows there was simply no way to reach anything below the
          board (including the "+ Add Image" button). Fullscreen mode still
          renders outside this ScrollView since it fills the whole screen
          on its own. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={fullscreen ? { flex: 1 } : { paddingBottom: 40 }}
        scrollEnabled={!fullscreen}
      >
      {!fullscreen && (
        <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 16 }}>
          <ScreenHeader lead="Your" accent="Vision Board" subtitle="Pin your dreams. See them. Feel them. Receive them." />

          {/* Row 1: Add Photos / Movies are the only things hidden while
              locked -- Board, Wallpaper, Lock and Fullscreen always apply
              regardless of lock state. Horizontally scrollable. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolRow} contentContainerStyle={styles.toolRowContent}>
            {!isLocked && (
              <>
                <TouchableOpacity style={styles.controlPill} onPress={handleAddImage} disabled={uploading}>
                  {uploading ? <ActivityIndicator size="small" color="#2e2530" /> : <Text style={styles.controlText}>📸 Add Photos</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlPill} onPress={handleFromMindMovies} disabled={loadingMM}>
                  {loadingMM ? <ActivityIndicator size="small" color="#2e2530" /> : <Text style={styles.controlText}>🎬 Movies</Text>}
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.controlPill} onPress={handleDownload} disabled={downloading}>
              {downloading ? <ActivityIndicator size="small" color="#2e2530" /> : <Text style={styles.controlText}>⬇️ Board</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlPill} onPress={handleWallpaper} disabled={savingWallpaper}>
              {savingWallpaper ? <ActivityIndicator size="small" color="#2e2530" /> : <Text style={styles.controlText}>📱 Wallpaper</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlPill, isLocked && styles.controlPillActive]} onPress={handleToggleLock}>
              <Text style={[styles.controlText, isLocked && styles.controlTextActive]}>{isLocked ? '🔒 Locked' : '🔓 Lock'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlPill} onPress={() => setFullscreen(true)}>
              <Text style={styles.controlText}>⛶ Full</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Row 2: Tidy, Group, zoom controls, Share, Clear All -- all
              always visible; Tidy/Group/Clear still no-op with an error
              while locked (see their handlers) rather than disappearing. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolRow} contentContainerStyle={styles.toolRowContent}>
            <TouchableOpacity style={styles.controlPill} onPress={handleTidy}>
              <Text style={styles.controlText}>✨ Tidy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlPill, selectMode && styles.controlPillActive]} onPress={handleGroupToggle}>
              <Text style={[styles.controlText, selectMode && styles.controlTextActive]}>🗂 Group{selectMode && selectedIndices.length ? ` (${selectedIndices.length})` : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.zoomBtn} onPress={() => setZoomTo(zoom.value - 0.1)}>
              <Text style={styles.zoomBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.zoomPct}>{zoomPct}%</Text>
            <TouchableOpacity style={styles.zoomBtn} onPress={() => setZoomTo(zoom.value + 0.1)}>
              <Text style={styles.zoomBtnText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fitBtn} onPress={() => { setZoomTo(minZoom); panX.value = withTiming(0); panY.value = withTiming(0); }}>
              <Text style={styles.fitBtnText}>⟳ Fit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlPill} onPress={handleShare} disabled={sharing}>
              {sharing ? <ActivityIndicator size="small" color="#2e2530" /> : <Text style={styles.controlText}>🔗 Share</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlPill, styles.controlPillDanger]} onPress={handleClear}>
              <Text style={styles.controlTextDanger}>🗑️ Clear All</Text>
            </TouchableOpacity>
          </ScrollView>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {info ? <Text style={styles.infoText}>{info}</Text> : null}
          <Text style={styles.hintText}>Drag an image to move it · Pinch to zoom · Drag empty space to pan · Resize from corner · Lock when done ✨</Text>
          <Text style={styles.hintText}>Press and hold an image for a moment to add a category 🏷️</Text>
        </View>
      )}

      {canvasNode}

      {!fullscreen && (
        <Button
          title="+ Add Image"
          onPress={handleAddImage}
          loading={uploading}
          disabled={isLocked}
          fullWidth
          // Extra bottom clearance -- the tab bar floats as a rounded pill
          // now (position: absolute, ~104px tall including its own bottom
          // margin) instead of reserving space in normal layout flow, so
          // this button needs to clear it manually.
          style={{ marginHorizontal: 16, marginTop: 14, marginBottom: 104 }}
        />
      )}
      </ScrollView>

      {/* Rendered as ScrollView siblings, not children -- these are
          full-screen overlays and must stay fixed over the viewport
          regardless of the page's current scroll position. */}
      {fullscreen && (
        <TouchableOpacity style={styles.fullscreenClose} onPress={() => setFullscreen(false)}>
          <Text style={styles.fullscreenCloseText}>✕ Exit Fullscreen</Text>
        </TouchableOpacity>
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

      <Modal visible={mmPickerOpen} animationType="slide" transparent onRequestClose={() => setMmPickerOpen(false)}>
        <View style={styles.mmOverlay}>
          <View style={styles.mmSheet}>
            <View style={styles.mmHeaderRow}>
              <Text style={styles.mmTitle}>Select images to add</Text>
              <TouchableOpacity onPress={() => setMmPickerOpen(false)}>
                <Text style={styles.mmCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.mmSubtitle}>{mmSelected.size} selected · from your Mind Movies</Text>
            <ScrollView contentContainerStyle={styles.mmGrid}>
              {mmImages.map((img) => {
                const selected = mmSelected.has(img.url);
                const already = items.some((it) => itemUri(it) === img.url);
                return (
                  <TouchableOpacity
                    key={img.url}
                    style={styles.mmCell}
                    onPress={() => !already && toggleMmSelected(img.url)}
                    disabled={already}
                  >
                    <BoardImage uri={img.url} style={styles.mmCellImage} />
                    {already ? (
                      <View style={styles.mmAlreadyBadge}><Text style={styles.mmAlreadyBadgeText}>On board</Text></View>
                    ) : (
                      <View style={[styles.mmCheck, selected && styles.mmCheckOn]}>
                        {selected && <Text style={styles.mmCheckText}>✓</Text>}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Button
              title={`+ Add ${mmSelected.size || ''} Image${mmSelected.size === 1 ? '' : 's'}`}
              onPress={handleConfirmMmSelection}
              loading={mmAdding}
              disabled={mmSelected.size === 0}
              fullWidth
              style={{ marginTop: 14 }}
            />
          </View>
        </View>
      </Modal>

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
  // Two compact, horizontally-scrollable rows instead of a wrapping
  // cluster of pills -- that used to eat 3-4 rows of vertical space
  // depending on screen width, which was most of the "can't scroll to
  // reach the board" problem along with the missing ScrollView itself.
  toolRow: { marginBottom: 8 },
  toolRowContent: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
  controlPill: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: radii.pill, paddingVertical: 8, paddingHorizontal: 13, borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', minWidth: 40, alignItems: 'center' },
  controlPillActive: { backgroundColor: colors.pinkAccent, borderColor: colors.pinkAccent },
  controlPillDanger: { borderColor: colors.dangerBorder },
  controlText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.ink, fontWeight: '500' },
  controlTextActive: { color: '#fff' },
  controlTextDanger: { color: colors.danger, fontSize: 12, fontFamily: fonts.bodyMedium, fontWeight: '500' },
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
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
    // The board's own white surface — always fills the frame edge to edge,
    // independent of zoom. Previously only `canvas` (the pannable/zoomable
    // layer) had a background, so at any zoom below 100% the canvas
    // shrank visually smaller than the frame and the page's pink
    // background showed through around it like a mat/border, instead of
    // the board looking like a solid page the way it does on the website.
    // No visible border/shadow now either — the website's board is a flush
    // white surface with no frame around it.
    backgroundColor: '#fff',
  },
  viewportFullscreen: { flex: 1, width: '100%', height: '100%', borderRadius: 0, marginTop: 0 },
  // width/height/left/top are applied inline (see canvasNode) since left/top
  // depend on whether fullscreen is active and can't be static here.
  canvas: {
    backgroundColor: '#fff',
    position: 'absolute',
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

  mmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  mmSheet: { backgroundColor: '#fdfbfe', borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: 20, maxHeight: '82%' },
  mmHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mmTitle: { fontFamily: fonts.displayMedium, fontSize: 17, color: colors.ink, fontWeight: '600' },
  mmCloseText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.mist2 },
  mmSubtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.mist, marginTop: 4, marginBottom: 12 },
  mmGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mmCell: { width: '31%', aspectRatio: 1, borderRadius: radii.sm, overflow: 'hidden', backgroundColor: 'rgba(201,168,201,0.15)' },
  mmCellImage: { width: '100%', height: '100%' },
  mmCheck: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1.5, borderColor: colors.pinkAccent, alignItems: 'center', justifyContent: 'center' },
  mmCheckOn: { backgroundColor: colors.pinkAccent },
  mmCheckText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  mmAlreadyBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 3, alignItems: 'center' },
  mmAlreadyBadgeText: { color: '#fff', fontSize: 9, fontFamily: fonts.bodyMedium, fontWeight: '600' },
});
