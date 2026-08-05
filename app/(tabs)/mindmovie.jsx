import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import {
  getMindMovies, createMindMovie, updateMindMovie, deleteMindMovie,
  uploadImage, finalizeMindMovie, generateMindMovieAudio, createCheckout,
  startSession, completeSession,
} from '../../services/api';
import { safeImageUri } from '../../services/imageUri';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import Dropdown from '../../components/Dropdown';
import ScreenHeader from '../../components/ScreenHeader';
import TabPill from '../../components/TabPill';
import Button from '../../components/Button';
import { colors, fonts, radii } from '../../constants/theme';
import UpgradeModal from '../../components/UpgradeModal';
import { usePlanStore } from '../../store/planStore';
import * as Linking from 'expo-linking';

const VOICE_OPTIONS = [
  { value: 'luna', label: '🌸 Luna' },
  { value: 'orion', label: '🌙 Orion' },
  { value: 'sage', label: '🍃 Sage' },
];

const MOOD_OPTIONS = [
  { value: 'spiritual', label: '✨ Uplifting (Spiritual)' },
  { value: 'calm', label: '🌙 Calm' },
  { value: 'epic', label: '🎬 Epic' },
  { value: 'none', label: '🔇 No Music' },
];
const DURATION_OPTIONS = [
  { value: 3, label: '3 sec' },
  { value: 5, label: '5 sec' },
  { value: 8, label: '8 sec' },
  { value: 12, label: '12 sec' },
];

// A scene's img is legitimately null whenever the picture never made it to
// storage — the backend strips any non-http value before saving (hub.js's
// _cloudinaryOnly does the same on the website). Rendering <Image uri={null}>
// just draws nothing, which is why saved movies looked empty; show a real
// placeholder instead, and fall back the same way if the URL 404s later.
function SceneImage({ uri, style, iconSize = 22 }) {
  const [failed, setFailed] = useState(false);
  // Same fix as Vision Board: R2 keys with spaces/special characters in the
  // filename hit iOS's "Protocol error" in RN's Image, which — unlike a
  // browser <img> — doesn't auto-encode the URL before requesting it.
  const safeUri = safeImageUri(uri);
  if (!safeUri || failed) {
    return (
      <View style={[style, styles.sceneFallback]}>
        <Text style={{ fontSize: iconSize, opacity: 0.5 }}>🎬</Text>
      </View>
    );
  }
  return <Image source={{ uri: safeUri }} style={style} onError={() => setFailed(true)} />;
}

export default function MindMovie() {
  const insets = useSafeAreaInsets();
  const { playId } = useLocalSearchParams();
  const { limits, loaded, hasFeature, refresh } = usePlanStore();
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');

  const [tab, setTab] = useState('create');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState('spiritual');
  const [slideDur, setSlideDur] = useState(5);
  const [loop, setLoop] = useState(false);
  // Voice is picked ONCE at creation and locked for the movie's lifetime.
  const [voice, setVoice] = useState('luna');
  const [scenes, setScenes] = useState([]);
  const [uploadingScene, setUploadingScene] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { refresh().finally(() => setCheckingPlan(false)); }, []);

  const maxActive = limits?.mind_movies_active;
  const activeCount = movies.filter((m) => !m.locked).length;

  const handleSelectPlan = async (priceKey) => {
    try {
      const res = await createCheckout(priceKey);
      if (res?.url) await Linking.openURL(res.url);
    } catch (e) {
      setError(e.message || 'Could not start checkout');
    }
  };

  const [playingMovie, setPlayingMovie] = useState(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [narrationLoading, setNarrationLoading] = useState(false);
  const soundRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  // Open /sessions row for the movie currently playing, so watching a Mind
  // Movie reaches the Tracker's totals/streak like affirmations do.
  const trackedSessionId = useRef(null);

  const load = async () => {
    try { setMovies(await getMindMovies()); } catch (e) { setError(e.message || 'Could not load movies'); }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  // Tapping a movie tile on Home's Mind Movies widget links here with
  // ?playId=<id> so playback starts immediately instead of landing on
  // the library/create tab.
  const autoPlayedRef = useRef(false);
  useEffect(() => {
    if (playId && movies.length && !autoPlayedRef.current) {
      const target = movies.find((m) => String(m.id) === String(playId));
      if (target && !target.locked) { autoPlayedRef.current = true; startPlayback(target); }
    }
  }, [playId, movies]);

  const resetForm = () => {
    setTitle(''); setMood('spiritual'); setSlideDur(5); setLoop(false); setScenes([]); setEditingId(null); setVoice('luna');
  };

  const handleAddScene = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Photo library permission needed.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;

    if (scenes.length >= 10) {
      setError('Max 10 scenes per mind movie ✨');
      return;
    }

    setUploadingScene(true); setError('');
    try {
      const cloudUrl = await uploadImage(result.assets[0].uri, 'mind-movie');
      setScenes((prev) => [...prev, { img: cloudUrl, text: '' }]);
    } catch (e) {
      if (e.status === 403) { setUpgradeMsg('Mind Movies are a Basic Manifestor feature.'); setShowUpgrade(true); }
      else setError(e.message || 'Could not upload scene image');
    } finally { setUploadingScene(false); }
  };

  const updateSceneText = (index, text) => {
    setScenes((prev) => prev.map((s, i) => (i === index ? { ...s, text } : s)));
  };

  const removeScene = (index) => {
    setScenes((prev) => prev.filter((_, i) => i !== index));
  };

  // Backend: create/update saves a DRAFT (never counts against the plan
  // cap, however many times you edit it). Only /finalize consumes a slot.
  const handleSave = async (andPlay) => {
    if (!title.trim()) { setError('Give your movie a title.'); return; }
    if (scenes.length === 0) { setError('Add at least one scene.'); return; }
    if (maxActive != null && maxActive === 0) {
      setUpgradeMsg('Mind Movies are a Basic Manifestor feature.');
      setShowUpgrade(true);
      return;
    }
    if (!editingId && maxActive != null && activeCount >= maxActive) {
      setUpgradeMsg(`You've used all ${maxActive} of your Mind Movie slots — upgrade for more, or delete one first.`);
      setShowUpgrade(true);
      return;
    }

    setError(''); setCreating(true);
    try {
      let movie;
      if (editingId) {
        movie = await updateMindMovie(editingId, { title: title.trim(), scenes, mood, slideDur, loop });
      } else {
        movie = await createMindMovie({ title: title.trim(), scenes, mood, slideDur, loop, voice });
      }

      try {
        movie = await finalizeMindMovie(movie.id);
      } catch (e) {
        if (e.status === 403) {
          setUpgradeMsg(e.message || 'Mind Movie limit reached — upgrade for more slots.');
          setShowUpgrade(true);
          setCreating(false);
          return;
        }
        throw e;
      }

      try {
        movie = { ...movie, ...(await generateMindMovieAudio(movie.id)) };
      } catch (_) { /* audio pre-gen best-effort */ }

      setMovies((prev) => {
        const exists = prev.some((m) => m.id === movie.id);
        return exists ? prev.map((m) => (m.id === movie.id ? movie : m)) : [movie, ...prev];
      });

      resetForm();
      setTab('mymovies');
      if (andPlay) startPlayback(movie);
    } catch (e) {
      setError(e.message || 'Could not save movie');
    } finally { setCreating(false); }
  };

  const handleEdit = (movie) => {
    if (movie.locked) {
      setUpgradeMsg('This Mind Movie is locked — upgrade to edit it again, or free up a slot.');
      setShowUpgrade(true);
      return;
    }
    setEditingId(movie.id);
    setTitle(movie.title);
    setMood(movie.mood || 'spiritual');
    setSlideDur(movie.slideDur || 5);
    setLoop(!!movie.loop);
    setScenes(movie.scenes || []);
    setVoice(movie.voice || 'luna');
    setTab('create');
  };

  const handleDelete = async (movieId) => {
    try {
      await deleteMindMovie(movieId);
      setMovies((prev) => prev.filter((m) => m.id !== movieId));
    } catch (e) {
      setError(e.message || 'Could not delete movie');
    }
  };

  const cleanupPlayback = async () => {
    clearTimeout(fallbackTimerRef.current);
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch (_) {}
      soundRef.current = null;
    }
  };

  const playScene = async (movie, index) => {
    await cleanupPlayback();
    setSceneIndex(index);
    const scene = movie.scenes[index];

    const goNext = () => {
      const next = index + 1;
      if (next < movie.scenes.length) playScene(movie, next);
      else if (movie.loop) playScene(movie, 0);
      else {
        // Watched to the end — close the Tracker session as completed.
        const id = trackedSessionId.current;
        if (id) {
          trackedSessionId.current = null;
          completeSession(id, 1).catch(() => {});
        }
        setPlayingMovie(null);
      }
    };

    // Prefer the pre-generated cached narration URL for this movie's
    // locked voice over live TTS.
    const movieVoice = movie.voice || 'luna';
    const cachedUrl = scene[`mm_audio_${movieVoice}`];

    if (cachedUrl) {
      setNarrationLoading(true);
      try {
        const { sound } = await Audio.Sound.createAsync({ uri: cachedUrl }, { shouldPlay: true });
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => { if (status.didJustFinish) goNext(); });
      } catch (e) {
        fallbackTimerRef.current = setTimeout(goNext, (movie.slideDur || 5) * 1000);
      } finally { setNarrationLoading(false); }
    } else {
      fallbackTimerRef.current = setTimeout(goNext, (movie.slideDur || 5) * 1000);
    }
  };

  const startPlayback = async (movie) => {
    setPlayingMovie(movie);
    playScene(movie, 0);
    // Best-effort tracking — never let it interrupt playback.
    try {
      const sess = await startSession({ affirmationId: null, repeatTarget: 1 });
      trackedSessionId.current = sess?.id ?? null;
    } catch (_) { trackedSessionId.current = null; }
  };

  // Closing early leaves the session open-but-incomplete, matching the
  // affirmation/story players.
  const closePlayback = async () => {
    await cleanupPlayback();
    trackedSessionId.current = null;
    setPlayingMovie(null);
  };

  if (checkingPlan || loading) {
    return <GradientBackground><View style={styles.center}><ActivityIndicator size="large" color="#c9a8c9" /></View></GradientBackground>;
  }

  if (loaded && !hasFeature('mind_movies_active')) {
    return (
      <GradientBackground>
        <View style={styles.upsellWrap}>
          <Text style={styles.upsellIcon}>🎬</Text>
          <ScreenHeader lead="Mind" accent="Movie" subtitle="Write your dream life, watch it, feel it, become it." style={{ alignItems: 'center', marginBottom: 20 }} />
          <View style={styles.upsellPerks}>
            <Text style={styles.upsellPerk}>✓ Build cinematic scenes from your own photos</Text>
            <Text style={styles.upsellPerk}>✓ AI narration in your chosen voice</Text>
            <Text style={styles.upsellPerk}>✓ Save, replay, and loop anytime</Text>
          </View>
          <Button title="Upgrade to Unlock ✨" onPress={() => { setUpgradeMsg('Mind Movies are a Basic Manifestor feature.'); setShowUpgrade(true); }} />
        </View>
        <UpgradeModal
          visible={showUpgrade}
          message={upgradeMsg}
          onClose={() => setShowUpgrade(false)}
          onSelectPlan={handleSelectPlan}
        />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 14, paddingBottom: 40 }}>
        <ScreenHeader lead="Mind" accent="Movie" subtitle="Write your dream life. Watch it. Feel it. Become it. 🎬" />

        <TabPill
          style={{ marginBottom: 16 }}
          value={tab}
          onChange={(v) => { if (v === 'create') resetForm(); setTab(v); }}
          options={[
            { value: 'create', label: '🎬 Create' },
            { value: 'mymovies', label: '📚 My Movies' },
          ]}
        />

        {tab === 'create' ? (
          <>
            <GlassCard style={{ marginBottom: 16 }}>
              <Text style={styles.label}>MOVIE TITLE</Text>
              <View style={styles.inputBox}>
                <TextInput style={styles.input} placeholder="e.g. My Dream Life 2026 ✨" placeholderTextColor="rgba(46,37,48,0.4)" value={title} onChangeText={setTitle} />
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={styles.label}>MUSIC MOOD</Text>
                <Dropdown value={mood} options={MOOD_OPTIONS} onSelect={setMood} fullWidth />
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={styles.label}>SLIDE DURATION</Text>
                <Dropdown value={slideDur} options={DURATION_OPTIONS} onSelect={setSlideDur} fullWidth />
              </View>

              <View style={styles.loopRow}>
                <Text style={styles.label}>LOOP — Repeat the movie continuously</Text>
                <Switch value={loop} onValueChange={setLoop} trackColor={{ false: '#e8d5e8', true: '#c9a8c9' }} thumbColor="#fff" />
              </View>

              <View style={{ marginTop: 14 }}>
                <Text style={styles.label}>VOICE {editingId ? '(locked for this movie)' : '— permanent once saved'}</Text>
                <Dropdown value={voice} options={VOICE_OPTIONS} onSelect={editingId ? () => {} : setVoice} fullWidth disabled={!!editingId} />
              </View>
            </GlassCard>

            <Text style={styles.sectionLabel}>Your Scenes</Text>
            <Text style={styles.sectionHint}>Each scene is one moment of your dream life. Write it in present tense. ✨</Text>

            {scenes.map((scene, i) => (
              <GlassCard key={i} style={{ marginBottom: 10 }}>
                <View style={styles.sceneHeaderRow}>
                  <View style={styles.sceneNum}><Text style={styles.sceneNumText}>{i + 1}</Text></View>
                  <TouchableOpacity onPress={() => removeScene(i)}><Text style={styles.removeText}>✕</Text></TouchableOpacity>
                </View>
                <SceneImage uri={scene.img} style={styles.sceneImage} iconSize={24} />
                <View style={[styles.inputBox, { marginTop: 10 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Narration for this scene..."
                    placeholderTextColor="rgba(46,37,48,0.4)"
                    value={scene.text}
                    onChangeText={(t) => updateSceneText(i, t)}
                  />
                </View>
              </GlassCard>
            ))}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity style={styles.addSceneButton} onPress={handleAddScene} disabled={uploadingScene}>
              {uploadingScene ? <ActivityIndicator color="#9a5fa8" /> : <Text style={styles.addSceneText}>+ Add Slide</Text>}
            </TouchableOpacity>

            <View style={styles.row}>
              <Button title="🎬 Save & Play" onPress={() => handleSave(true)} loading={creating} style={{ flex: 1 }} />
              <Button title="💾 Save" variant="ghost" onPress={() => handleSave(false)} disabled={creating} />
              <Button title="Clear" variant="ghost" onPress={resetForm} />
            </View>
          </>
        ) : (
          movies.length === 0 ? (
            <Text style={styles.muted}>No mind movies yet — create your first one ✨</Text>
          ) : (
            movies.map((m) => (
              <GlassCard key={m.id} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.movieTitle}>{m.title}</Text>
                  {m.locked ? <Text style={styles.lockBadge}>🔒 Locked</Text> : null}
                </View>
                <Text style={styles.muted}>{m.scenes?.length || 0} slides · {m.slideDur || 5}s · {m.loop ? 'Loop' : 'Once'} · {(m.voice || 'luna')}</Text>
                <ScrollView horizontal style={{ marginTop: 10, marginBottom: 12 }}>
                  {(m.scenes || []).map((s, i) => (
                    <SceneImage key={i} uri={s.img} style={styles.thumb} iconSize={16} />
                  ))}
                </ScrollView>
                <View style={styles.row}>
                  <Button title="▶ Play" style={{ flex: 1 }} disabled={m.locked} onPress={() => m.locked ? setShowUpgrade(true) : startPlayback(m)} />
                  <Button title="✏️ Edit" variant="ghost" onPress={() => handleEdit(m)} />
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(m.id)}>
                    <Text style={styles.deleteText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))
          )
        )}
      </ScrollView>

      <Modal visible={!!playingMovie} animationType="fade" onRequestClose={closePlayback}>
        {playingMovie && (
          <View style={styles.playerContainer}>
            <SceneImage uri={playingMovie.scenes[sceneIndex]?.img} style={styles.playerImage} iconSize={54} />
            <View style={styles.playerCaptionWrap}>
              {narrationLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.playerCaption}>{playingMovie.scenes[sceneIndex]?.text}</Text>}
            </View>
            <TouchableOpacity style={styles.closePlayer} onPress={closePlayback}>
              <Text style={styles.closePlayerText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>

      <UpgradeModal
        visible={showUpgrade}
        message={upgradeMsg}
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
  lockBadge: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.goldDeep, backgroundColor: 'rgba(224,192,128,0.25)', borderRadius: radii.pill, paddingVertical: 2, paddingHorizontal: 8, fontWeight: '600' },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  inputBox: { borderWidth: 1, borderColor: 'rgba(154,95,168,0.22)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  input: { fontFamily: fonts.body, fontSize: 14.5, color: colors.ink },
  loopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  sectionLabel: { fontFamily: fonts.displayMedium, fontSize: 17, fontWeight: '600', color: colors.ink, marginBottom: 4 },
  sectionHint: { fontFamily: fonts.body, fontSize: 12, color: colors.mist, marginBottom: 14, lineHeight: 17 },
  sceneHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sceneNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.purpleMid, justifyContent: 'center', alignItems: 'center' },
  sceneNumText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  removeText: { color: colors.danger, fontSize: 16 },
  sceneImage: { width: '100%', height: 140, borderRadius: radii.sm, backgroundColor: 'rgba(255,255,255,0.35)' },
  sceneFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(201,168,201,0.18)' },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginVertical: 10, textAlign: 'center' },
  addSceneButton: { borderWidth: 1.5, borderColor: colors.purpleMid, borderRadius: radii.pill, paddingVertical: 13, alignItems: 'center', marginVertical: 12 },
  addSceneText: { fontFamily: fonts.bodyMedium, color: colors.purpleDark, fontWeight: '600', fontSize: 14 },
  row: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 30 },
  deleteButton: { paddingVertical: 13, paddingHorizontal: 12 },
  deleteText: { fontSize: 15 },
  muted: { fontFamily: fonts.body, color: colors.mist, fontSize: 13, textAlign: 'center', marginTop: 10 },
  movieTitle: { fontFamily: fonts.displayMedium, fontSize: 18, fontWeight: '600', color: colors.purpleDark, marginBottom: 4 },
  thumb: { width: 56, height: 56, borderRadius: 10, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.35)' },
  playerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  playerImage: { width: '100%', height: '70%', resizeMode: 'contain' },
  playerCaptionWrap: { position: 'absolute', bottom: 80, paddingHorizontal: 30, minHeight: 40, justifyContent: 'center' },
  playerCaption: { fontFamily: fonts.displayItalic, color: '#fff', fontSize: 19, textAlign: 'center', fontWeight: '500', fontStyle: 'italic' },
  closePlayer: { position: 'absolute', top: 50, right: 24, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  closePlayerText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
