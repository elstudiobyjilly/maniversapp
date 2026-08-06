// NowPlayingPlayer.jsx — full-screen "now playing" player for Stories and
// Affirmations, modeled on Apple Music / Spotify / YouTube Music: full-bleed
// artwork, big caption text, a real scrubber, skip ±10s, like, shuffle,
// repeat, a volume slider, a speed picker, and a swipe-up queue drawer.
// Owns its own Audio.Sound entirely -- the calling screen just hands it a
// queue + a way to resolve each item's audio URL, and this component
// handles load/play/pause/seek/next/prev/favorite/share/queue on its own.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator,
  Image, ScrollView, Share, PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radii } from '../constants/theme';
import { safeImageUri } from '../services/imageUri';

const SPEEDS = [0.75, 1, 1.25, 1.5];
const REPEAT_PRESETS = [1, 3, 7, 33, 100];

function fmtTime(ms) {
  if (!ms || ms < 0 || !isFinite(ms)) return '00:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Minimal draggable slider -- no extra native dependency, just a View
// measured via onLayout plus a PanResponder converting touch x into a 0..1
// fraction. Used for both the scrubber and the volume control.
function ScrubBar({ value, onChange, onSlideStart, onSlideEnd, trackColor = 'rgba(255,255,255,0.25)', fillColor = '#fff', height = 4, knob = true }) {
  const widthRef = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [dragVal, setDragVal] = useState(value);

  const clamp = (v) => Math.max(0, Math.min(1, v));

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        setDragging(true);
        onSlideStart?.();
        const frac = clamp(e.nativeEvent.locationX / (widthRef.current || 1));
        setDragVal(frac);
      },
      onPanResponderMove: (e) => {
        const frac = clamp(e.nativeEvent.locationX / (widthRef.current || 1));
        setDragVal(frac);
      },
      onPanResponderRelease: (e) => {
        const frac = clamp(e.nativeEvent.locationX / (widthRef.current || 1));
        setDragging(false);
        onChange(frac);
        onSlideEnd?.(frac);
      },
    })
  ).current;

  const shown = dragging ? dragVal : value;

  return (
    <View
      style={{ paddingVertical: 10, justifyContent: 'center' }}
      onLayout={(e) => { widthRef.current = e.nativeEvent.layout.width; }}
      {...pan.panHandlers}
    >
      <View style={{ height, borderRadius: height / 2, backgroundColor: trackColor, overflow: 'visible' }}>
        <View style={{ height, borderRadius: height / 2, backgroundColor: fillColor, width: `${shown * 100}%` }} />
      </View>
      {knob && (
        <View
          pointerEvents="none"
          style={[
            styles.scrubKnob,
            { left: `${shown * 100}%`, backgroundColor: fillColor, transform: [{ translateX: -7 }] },
          ]}
        />
      )}
    </View>
  );
}

export default function NowPlayingPlayer({
  visible,
  onClose,
  queue = [],
  startIndex = 0,
  getAudioUri,
  isFavorited,
  onToggleFavorite,
  onReadFull,
  onTrackStart,
  onTrackFinish,
  kicker = 'Now Playing',
}) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  // Repeat = how many times the current track plays before advancing —
  // matches the website's REPEAT stepper (×1/×3/×7/×33/×100), not a plain
  // on/off loop toggle.
  const [repeatTarget, setRepeatTarget] = useState(1);
  const [shuffle, setShuffle] = useState(false);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [queueOpen, setQueueOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [seeking, setSeeking] = useState(false);

  const soundRef = useRef(null);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const repeatTargetRef = useRef(repeatTarget);
  repeatTargetRef.current = repeatTarget;
  // How many times the current track has already played this cycle.
  const repeatDoneRef = useRef(0);

  const item = queue[currentIndex] || null;

  const unload = useCallback(async () => {
    if (soundRef.current) {
      try { await soundRef.current.unloadAsync(); } catch (_) {}
      soundRef.current = null;
    }
  }, []);

  const goToIndex = useCallback(async (idx) => {
    if (!queue.length) return;
    const clamped = ((idx % queue.length) + queue.length) % queue.length;
    await unload();
    repeatDoneRef.current = 0;
    setCurrentIndex(clamped);
    setPosition(0); setDuration(0); setLoading(true);
    try {
      const uri = await getAudioUri(queue[clamped]);
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume, rate, shouldCorrectPitch: true }
      );
      soundRef.current = sound;
      setIsPlaying(true);
      onTrackStart?.(queue[clamped], clamped);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        setPosition(status.positionMillis || 0);
        setDuration(status.durationMillis || 0);
        setIsPlaying(status.isPlaying);
        if (status.didJustFinish) {
          repeatDoneRef.current += 1;
          if (repeatDoneRef.current < repeatTargetRef.current) { sound.replayAsync(); }
          else { repeatDoneRef.current = 0; onTrackFinish?.(queue[clamped], clamped); goNextRef.current?.(); }
        }
      });
    } catch (e) {
      setIsPlaying(false);
    } finally {
      setLoading(false);
    }
  }, [queue, getAudioUri, unload, volume, rate, onTrackStart, onTrackFinish]);

  // goNext/goPrev captured in a ref so the onPlaybackStatusUpdate closure
  // (created once per load) always calls the latest version.
  const goNext = useCallback(() => {
    if (!queue.length) return;
    const next = shuffle
      ? Math.floor(Math.random() * queue.length)
      : currentIndexRef.current + 1;
    if (!shuffle && next >= queue.length) { setIsPlaying(false); return; }
    goToIndex(next);
  }, [queue.length, shuffle, goToIndex]);
  const goPrev = useCallback(() => goToIndex(currentIndexRef.current - 1), [goToIndex]);
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;

  useEffect(() => {
    if (visible) goToIndex(startIndex);
    else unload();
    return () => { if (!visible) unload(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, startIndex]);

  useEffect(() => () => { unload(); }, [unload]);

  const togglePlayPause = async () => {
    if (!soundRef.current) return;
    if (isPlaying) { await soundRef.current.pauseAsync(); setIsPlaying(false); }
    else { await soundRef.current.playAsync(); setIsPlaying(true); }
  };

  const seekFraction = async (frac) => {
    if (!soundRef.current || !duration) return;
    const ms = frac * duration;
    setPosition(ms);
    try { await soundRef.current.setPositionAsync(ms); } catch (_) {}
  };

  const skip = async (deltaSec) => {
    if (!soundRef.current || !duration) return;
    const ms = Math.max(0, Math.min(duration, position + deltaSec * 1000));
    setPosition(ms);
    try { await soundRef.current.setPositionAsync(ms); } catch (_) {}
  };

  const changeVolume = async (frac) => {
    setVolume(frac);
    if (soundRef.current) { try { await soundRef.current.setVolumeAsync(frac); } catch (_) {} }
  };

  const changeRate = async (r) => {
    setRate(r);
    if (soundRef.current) { try { await soundRef.current.setRateAsync(r, true); } catch (_) {} }
  };

  const handleShare = () => {
    if (!item) return;
    Share.share({ message: item.content || item.title || '', title: item.title }).catch(() => {});
  };

  // Restarts the current track from the top without changing the queue
  // position — matches the website's Reset button alongside Shuffle.
  const handleReset = async () => {
    repeatDoneRef.current = 0;
    setPosition(0);
    if (soundRef.current) { try { await soundRef.current.setPositionAsync(0); } catch (_) {} }
  };

  const handleClose = async () => {
    await unload();
    onClose?.();
  };

  if (!item) return null;
  const coverUri = safeImageUri(item.coverImage);
  const favorited = isFavorited ? isFavorited(item) : false;
  const prevItem = queue[(currentIndex - 1 + queue.length) % queue.length];
  const nextItem = queue[(currentIndex + 1) % queue.length];
  const progressFrac = duration ? Math.min(1, position / duration) : 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.root}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} blurRadius={30} />
        ) : null}
        <LinearGradient
          colors={['rgba(20,10,25,0.55)', 'rgba(20,10,25,0.75)', 'rgba(10,6,14,0.92)']}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleClose}>
            <Text style={styles.iconBtnText}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.kicker}>{kicker}</Text>
            <Text style={styles.topTitle} numberOfLines={1}>{item.title}</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setSettingsOpen(true)}>
            <Text style={styles.iconBtnText}>⚙</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {!coverUri && <View style={styles.coverFallback}><Text style={{ fontSize: 44 }}>{item.icon || '✨'}</Text></View>}

          {loading ? (
            <ActivityIndicator color="#fff" size="large" style={{ marginVertical: 30 }} />
          ) : (
            <Text style={styles.caption}>{item.caption || item.content}</Text>
          )}

          {onReadFull && item.content && (
            <TouchableOpacity style={styles.readFullBtn} onPress={() => onReadFull(item)}>
              <Text style={styles.readFullText}>📖 Read the full {kicker === 'Now Playing — Affirmations' ? 'set' : 'story'}</Text>
            </TouchableOpacity>
          )}

          {queue.length > 1 && (
            <TouchableOpacity style={styles.upNextRow} onPress={() => setQueueOpen(true)}>
              <Text style={styles.upNextText} numberOfLines={1}>{prevItem?.title || ''}</Text>
              <Text style={styles.upNextArrow}>⇄</Text>
              <Text style={[styles.upNextText, { textAlign: 'right' }]} numberOfLines={1}>{nextItem?.title || ''}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={[styles.controlsWrap, { paddingBottom: insets.bottom + 16 }]}>
          <ScrubBar value={seeking ? undefined : progressFrac} onChange={seekFraction} onSlideStart={() => setSeeking(true)} onSlideEnd={() => setSeeking(false)} />
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{fmtTime(position)}</Text>
            <Text style={styles.timeText}>-{fmtTime(Math.max(0, duration - position))}</Text>
          </View>

          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.smallCtl} onPress={() => onToggleFavorite?.(item)}>
              <Text style={[styles.smallCtlText, favorited && { color: colors.pinkAccent }]}>{favorited ? '♥' : '♡'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallCtl} onPress={() => skip(-10)}>
              <Text style={styles.smallCtlText}>⟲10</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.playBtn} onPress={togglePlayPause} disabled={loading}>
              <Text style={styles.playBtnText}>{isPlaying ? '❚❚' : '▶'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallCtl} onPress={() => skip(10)}>
              <Text style={styles.smallCtlText}>⟳10</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallCtl} onPress={() => setShuffle((v) => !v)}>
              <Text style={[styles.smallCtlText, shuffle && { color: colors.pinkAccent }]}>🔀</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.shareRow}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Text style={styles.shareBtnText}>⬆ Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={handleReset}>
              <Text style={styles.shareBtnText}>↺ Reset</Text>
            </TouchableOpacity>
          </View>

          {queue.length > 1 && (
            <TouchableOpacity style={styles.queueHandle} onPress={() => setQueueOpen(true)}>
              <View style={styles.queueHandleBar} />
              <Text style={styles.queueHandleText}>Your Queue</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Settings sheet: volume, speed, loop ─────────────────────── */}
        <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
          <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setSettingsOpen(false)}>
            <View style={styles.sheet} onStartShouldSetResponder={() => true}>
              <Text style={styles.sheetTitle}>Playback</Text>

              <Text style={styles.sheetLabel}>VOLUME</Text>
              <ScrubBar value={volume} onChange={changeVolume} trackColor="rgba(0,0,0,0.12)" fillColor={colors.purpleAccent} />

              <Text style={styles.sheetLabel}>SPEED</Text>
              <View style={styles.speedRow}>
                {SPEEDS.map((s) => (
                  <TouchableOpacity key={s} style={[styles.speedChip, rate === s && styles.speedChipOn]} onPress={() => changeRate(s)}>
                    <Text style={[styles.speedChipText, rate === s && styles.speedChipTextOn]}>{s}x</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sheetLabel}>REPEAT — PLAY THIS {kicker === 'Now Playing — Affirmations' ? 'SET' : 'TRACK'}...</Text>
              <View style={styles.repeatStepperRow}>
                <TouchableOpacity style={styles.repeatStepBtn} onPress={() => setRepeatTarget((n) => Math.max(1, n - 1))}>
                  <Text style={styles.repeatStepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.repeatValue}>{repeatTarget}×</Text>
                <TouchableOpacity style={styles.repeatStepBtn} onPress={() => setRepeatTarget((n) => Math.min(1000, n + 1))}>
                  <Text style={styles.repeatStepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.speedRow}>
                {REPEAT_PRESETS.map((n) => (
                  <TouchableOpacity key={n} style={[styles.speedChip, repeatTarget === n && styles.speedChipOn]} onPress={() => setRepeatTarget(n)}>
                    <Text style={[styles.speedChipText, repeatTarget === n && styles.speedChipTextOn]}>{n}×</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setSettingsOpen(false)}>
                <Text style={styles.sheetCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ── Queue drawer ─────────────────────────────────────────────── */}
        <Modal visible={queueOpen} transparent animationType="slide" onRequestClose={() => setQueueOpen(false)}>
          <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setQueueOpen(false)}>
            <View style={[styles.queueSheet, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
              <View style={styles.queueHandleBar} />
              <Text style={styles.sheetTitle}>Your Queue</Text>
              <ScrollView style={{ maxHeight: 420 }}>
                {queue.map((q, i) => (
                  <TouchableOpacity
                    key={q.id ?? i}
                    style={[styles.queueRow, i === currentIndex && styles.queueRowOn]}
                    onPress={() => { setQueueOpen(false); goToIndex(i); }}
                  >
                    <Text style={styles.queueRowIndex}>{i === currentIndex ? '▶' : i + 1}</Text>
                    <Text style={[styles.queueRowTitle, i === currentIndex && styles.queueRowTitleOn]} numberOfLines={1}>{q.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0710' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 6 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { color: '#fff', fontSize: 18 },
  kicker: { fontFamily: fonts.bodyMedium, color: 'rgba(255,255,255,0.55)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  topTitle: { fontFamily: fonts.displayItalic, color: '#fff', fontSize: 18, fontStyle: 'italic', marginTop: 2 },

  body: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 20, justifyContent: 'center' },
  coverFallback: { alignSelf: 'center', width: 120, height: 120, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  caption: { fontFamily: fonts.displayItalic, color: '#fff', fontSize: 24, lineHeight: 34, fontStyle: 'italic', textAlign: 'left' },

  readFullBtn: { alignSelf: 'flex-start', marginTop: 18, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radii.pill, paddingVertical: 8, paddingHorizontal: 14 },
  readFullText: { color: '#fff', fontSize: 12.5, fontFamily: fonts.bodyMedium },

  upNextRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 30 },
  upNextText: { flex: 1, color: 'rgba(255,255,255,0.6)', fontSize: 12.5, fontFamily: fonts.displayItalic, fontStyle: 'italic' },
  upNextArrow: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },

  controlsWrap: { paddingHorizontal: 24, paddingTop: 4 },
  scrubKnob: { position: 'absolute', top: 6, width: 14, height: 14, borderRadius: 7 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  timeText: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: fonts.body },

  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 },
  smallCtl: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  smallCtlText: { color: '#fff', fontSize: 20 },
  playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  playBtnText: { color: '#1e1220', fontSize: 24 },

  shareRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 22 },
  shareBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radii.pill, paddingVertical: 10, paddingHorizontal: 18 },
  shareBtnText: { color: '#fff', fontSize: 13, fontFamily: fonts.bodyMedium },

  queueHandle: { alignItems: 'center', marginTop: 22 },
  queueHandleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 8 },
  queueHandleText: { color: 'rgba(255,255,255,0.65)', fontSize: 12.5, fontFamily: fonts.bodyMedium },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fdfbfe', borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: 22, paddingBottom: 34 },
  sheetTitle: { fontFamily: fonts.displayMedium, fontSize: 18, color: colors.ink, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  sheetLabel: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 14, marginBottom: 4 },

  speedRow: { flexDirection: 'row', gap: 8 },
  speedChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: 'rgba(154,95,168,0.1)', borderWidth: 1, borderColor: 'rgba(154,95,168,0.25)' },
  speedChipOn: { backgroundColor: colors.purpleMid, borderColor: colors.purpleMid },
  speedChipText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.ink2 },
  speedChipTextOn: { color: '#fff', fontWeight: '700' },

  repeatStepperRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  repeatStepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(154,95,168,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(154,95,168,0.25)' },
  repeatStepBtnText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.purpleDark, fontWeight: '700' },
  repeatValue: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.ink, fontWeight: '600', minWidth: 44, textAlign: 'center' },

  sheetCloseBtn: { marginTop: 22, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 24, borderRadius: radii.pill, backgroundColor: colors.purpleMid },
  sheetCloseText: { color: '#fff', fontFamily: fonts.bodyMedium, fontWeight: '600' },

  queueSheet: { backgroundColor: '#fdfbfe', borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: 22, alignItems: 'center', maxHeight: '70%' },
  queueRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, width: '100%', borderBottomWidth: 1, borderBottomColor: 'rgba(154,95,168,0.1)' },
  queueRowOn: { backgroundColor: 'rgba(154,95,168,0.06)' },
  queueRowIndex: { width: 24, textAlign: 'center', color: colors.mist2, fontSize: 12, fontFamily: fonts.bodyMedium },
  queueRowTitle: { flex: 1, color: colors.ink, fontSize: 14, fontFamily: fonts.body },
  queueRowTitleOn: { color: colors.purpleDark, fontFamily: fonts.bodyMedium, fontWeight: '600' },
});
