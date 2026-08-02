import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedReaction, runOnJS, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { getVisionBoard, saveVisionBoard, setVisionBoardLock, uploadImage, createCheckout } from '../../services/api';
import GradientBackground from '../../components/GradientBackground';
import UpgradeModal from '../../components/UpgradeModal';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { usePlanStore } from '../../store/planStore';
import { colors, fonts, radii } from '../../constants/theme';
import * as Linking from 'expo-linking';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CANVAS_WIDTH = SCREEN_WIDTH * 1.6;
const CANVAS_HEIGHT = 1000;
const ITEM_SIZE = 120;
const MIN_ITEM_SIZE = 60;

function DraggableImage({ item, index, isLocked, onMove, onResize, onRemove }) {
  const translateX = useSharedValue(item.x || 0);
  const translateY = useSharedValue(item.y || 0);
  const startX = useSharedValue(item.x || 0);
  const startY = useSharedValue(item.y || 0);

  const width = useSharedValue(item.w || ITEM_SIZE);
  const height = useSharedValue(item.h || ITEM_SIZE);
  const startW = useSharedValue(item.w || ITEM_SIZE);
  const startH = useSharedValue(item.h || ITEM_SIZE);

  // Re-sync from props when something outside this gesture changes position/size
  // (e.g. Tidy, or a fresh load) — without this the shared values would keep
  // showing the stale spot since they only update from the gestures below.
  useEffect(() => {
    translateX.value = item.x || 0;
    translateY.value = item.y || 0;
  }, [item.x, item.y]);

  useEffect(() => {
    width.value = item.w || ITEM_SIZE;
    height.value = item.h || ITEM_SIZE;
  }, [item.w, item.h]);

  const resizePan = Gesture.Pan()
    .enabled(!isLocked)
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
    .enabled(!isLocked)
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

  const containerStyle = useAnimatedStyle(() => ({
    width: width.value,
    height: height.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={movePan}>
      <Animated.View style={[styles.draggable, containerStyle]}>
        <Image source={{ uri: item.url }} style={styles.image} />
        {!isLocked && (
          <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(index)} hitSlop={8}>
            <Ionicons name="close" size={13} color="#fff" />
          </TouchableOpacity>
        )}
        {!isLocked && (
          <GestureDetector gesture={resizePan}>
            <View style={styles.resizeHandle}>
              <Ionicons name="resize" size={11} color="#9a5fa8" />
            </View>
          </GestureDetector>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export default function VisionBoard() {
  const { limits, loaded, hasFeature, refresh } = usePlanStore();
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [items, setItems] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

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

  // zoom is the live, gesture-driven scale (0.5–2.0). zoomPct mirrors it back
  // to JS state purely for the % readout and for sizing the ScrollView's
  // scrollable content area, which has to be a real layout number.
  const zoom = useSharedValue(1);
  const savedZoom = useSharedValue(1);
  const [zoomPct, setZoomPct] = useState(100);

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
    const clamped = Math.max(0.5, Math.min(2, value));
    zoom.value = withTiming(clamped, { duration: 200 });
    savedZoom.value = clamped;
  };

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedZoom.value = zoom.value;
    })
    .onUpdate((e) => {
      const next = savedZoom.value * e.scale;
      zoom.value = Math.max(0.5, Math.min(2, next));
    })
    .onEnd(() => {
      savedZoom.value = zoom.value;
    });

  const canvasAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: zoom.value }],
  }));

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

  const handleRemove = async (index) => {
    if (isLocked) { setError('Unlock the board to remove images.'); return; }
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    persist(updatedItems);
  };

  const handleToggleLock = async () => {
    const next = !isLocked;
    setIsLocked(next);
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

  return (
    <GradientBackground>
      <View style={{ paddingTop: 50, paddingHorizontal: 16 }}>
        <ScreenHeader lead="Your" accent="Vision Board" subtitle="Pin your dreams. See them. Feel them. Receive them." />

        <View style={styles.controlRow}>
          <TouchableOpacity activeOpacity={0.75} style={[styles.controlPill, isLocked && styles.controlPillActive]} onPress={handleToggleLock}>
            <Ionicons name={isLocked ? 'lock-closed' : 'lock-open'} size={14} color={isLocked ? '#fff' : colors.purpleDark} />
            <Text style={[styles.controlText, isLocked && styles.controlTextActive]}>{isLocked ? 'Locked' : 'Unlocked'}</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.75} style={styles.controlPill} onPress={handleTidy}>
            <Ionicons name="sparkles" size={14} color={colors.purpleDark} />
            <Text style={styles.controlText}>Tidy</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.75} style={styles.controlPill} onPress={handleDownload} disabled={downloading}>
            {downloading ? <ActivityIndicator size="small" color={colors.purpleDark} /> : (
              <>
                <Ionicons name="download-outline" size={14} color={colors.purpleDark} />
                <Text style={styles.controlText}>Download</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.75} style={styles.controlPill} onPress={handleShare} disabled={sharing}>
            {sharing ? <ActivityIndicator size="small" color={colors.purpleDark} /> : (
              <>
                <Ionicons name="share-social-outline" size={14} color={colors.purpleDark} />
                <Text style={styles.controlText}>Share</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.75} style={[styles.controlPill, styles.controlPillDanger]} onPress={handleClear}>
            <Ionicons name="trash-outline" size={14} color={colors.danger} />
            <Text style={[styles.controlText, styles.controlTextDanger]}>Clear</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.zoomRow}>
          <TouchableOpacity activeOpacity={0.75} style={styles.zoomBtn} onPress={() => setZoomTo(zoom.value - 0.1)}>
            <Ionicons name="remove" size={16} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.zoomPct}>{zoomPct}%</Text>
          <TouchableOpacity activeOpacity={0.75} style={styles.zoomBtn} onPress={() => setZoomTo(zoom.value + 0.1)}>
            <Ionicons name="add" size={16} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.75} style={styles.fitBtn} onPress={() => setZoomTo(1)}>
            <Ionicons name="scan-outline" size={13} color={colors.purpleDark} />
            <Text style={styles.fitBtnText}>Fit</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {info ? <Text style={styles.infoText}>{info}</Text> : null}
        <Text style={styles.hintText}>Pinch to zoom · Drag to move · Corner to resize ✨</Text>
      </View>

      <ScrollView horizontal style={{ flex: 1, marginTop: 10 }}>
        <ScrollView>
          <View style={[styles.canvasWrap, { width: CANVAS_WIDTH * (zoomPct / 100), height: CANVAS_HEIGHT * (zoomPct / 100) }]}>
            <GestureDetector gesture={pinchGesture}>
              <Animated.View
                ref={canvasRef}
                collapsable={false}
                style={[styles.canvas, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }, canvasAnimatedStyle]}
              >
                {items.map((item, i) => (
                  <DraggableImage key={i} item={item} index={i} isLocked={isLocked} onMove={handleMove} onResize={handleResize} onRemove={handleRemove} />
                ))}
                {items.length === 0 && (
                  <Text style={styles.emptyText}>Your vision board is empty — add your first image ✨</Text>
                )}
              </Animated.View>
            </GestureDetector>
          </View>
        </ScrollView>
      </ScrollView>

      <Button
        title="+ Add Image"
        onPress={handleAddImage}
        loading={uploading}
        disabled={isLocked}
        fullWidth
        style={{ marginHorizontal: 16, marginVertical: 14 }}
      />

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
  controlRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  controlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: radii.pill,
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.35)',
    minWidth: 44,
    ...shadows.cardSm,
  },
  controlPillActive: { backgroundColor: colors.purpleMid, borderColor: colors.purpleMid },
  controlPillDanger: { borderColor: colors.dangerBorder, backgroundColor: colors.dangerBg },
  controlText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.ink, fontWeight: '500' },
  controlTextActive: { color: '#fff' },
  controlTextDanger: { color: colors.danger },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.35)',
    ...shadows.cardSm,
  },
  zoomPct: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.mist, minWidth: 40, textAlign: 'center' },
  fitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.35)',
    ...shadows.cardSm,
  },
  fitBtnText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.purpleDark, fontWeight: '500' },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 12, marginBottom: 6 },
  infoText: { fontFamily: fonts.body, color: colors.purpleDark, fontSize: 12, marginBottom: 6 },
  hintText: { fontFamily: fonts.displayItalic, color: colors.mist, fontSize: 12, marginBottom: 4, fontStyle: 'italic' },
  canvasWrap: { padding: 10 },
  canvas: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(201,168,201,0.45)',
    position: 'relative',
    ...shadows.card,
  },
  draggable: { position: 'absolute' },
  image: { width: '100%', height: '100%', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.4)' },
  removeBtn: {
    position: 'absolute',
    top: -7,
    right: -7,
    backgroundColor: colors.danger,
    borderRadius: 12,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    ...shadows.cardSm,
  },
  resizeHandle: {
    position: 'absolute',
    bottom: -7,
    right: -7,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(154,95,168,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.cardSm,
  },
  emptyText: { color: '#6b5c66', fontSize: 13, textAlign: 'center', marginTop: 300, paddingHorizontal: 30, width: '100%' },
});
