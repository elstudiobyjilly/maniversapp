import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import {
  getSubPreloaded, getSubBackgrounds, getSubAffirmationSets, saveSubSession,
  getSubSessions, deleteSubSession, resolveMusicUrl, createCheckout,
} from '../../services/api';
import { generateToneFile } from '../../services/toneGenerator';
import GlassCard from '../../components/GlassCard';
import ScreenHeader from '../../components/ScreenHeader';
import Chip from '../../components/Chip';
import Button from '../../components/Button';
import { colors, fonts, radii } from '../../constants/theme';
import GradientBackground from '../../components/GradientBackground';
import UpgradeModal from '../../components/UpgradeModal';
import { usePlanStore } from '../../store/planStore';
import * as Linking from 'expo-linking';

const VOLUME_GAIN = { hidden: 0.06, soft: 0.18, audible: 0.4 };
const BG_TYPES = ['music', 'binaural', 'frequency'];

export default function Subliminal() {
  const { limits, loaded, hasFeature, refresh } = usePlanStore();
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [backgrounds, setBackgrounds] = useState({ music: [], binaural: [], frequency: [] });
  const [affSets, setAffSets] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [preloaded, setPreloaded] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [bgType, setBgType] = useState('music');
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [volumeLevel, setVolumeLevel] = useState('soft');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [playingId, setPlayingId] = useState(null);
  const [generatingTone, setGeneratingTone] = useState(false);
  const [bgSound, setBgSound] = useState(null);
  const [affSound, setAffSound] = useState(null);

  const canCreate = hasFeature('subliminal_active_cap'); // false on free -- 0 cap
  const maxActive = limits?.subliminal_active_cap; // paid: 20, free: 0
  const activeCount = sessions.filter((s) => !s.locked).length;

  const handleSelectPlan = async (priceKey) => {
    try {
      const res = await createCheckout(priceKey);
      if (res?.url) await Linking.openURL(res.url);
    } catch (e) {
      setError(e.message || 'Could not start checkout');
    }
  };

  const loadAll = async () => {
    try {
      // Preloaded samples are available to EVERYONE regardless of plan.
      const preloadedRes = await getSubPreloaded().catch(() => ({ samples: [] }));
      setPreloaded(preloadedRes.samples || []);

      // Everything else (custom sessions, backgrounds, affirmation-set
      // picker) is paid-only -- backend 403s these for free, so only call
      // them once we know the plan allows it.
      if (canCreate) {
        const [bg, sets, sess] = await Promise.all([
          getSubBackgrounds(), getSubAffirmationSets(), getSubSessions(),
        ]);
        setBackgrounds(bg);
        setAffSets(sets || []);
        setSessions(sess || []);
      }
    } catch (e) {
      setError(e.message || 'Could not load subliminal data');
    }
  };

  useEffect(() => {
    refresh().then(() => setCheckingPlan(false));
  }, []);

  useEffect(() => {
    if (!checkingPlan) loadAll().finally(() => setLoading(false));
  }, [checkingPlan]);

  const stopPlayback = async () => {
    if (bgSound) { await bgSound.stopAsync().catch(() => {}); await bgSound.unloadAsync().catch(() => {}); }
    if (affSound) { await affSound.stopAsync().catch(() => {}); await affSound.unloadAsync().catch(() => {}); }
    setBgSound(null); setAffSound(null); setPlayingId(null);
  };

  const handleCreate = async () => {
    if (!canCreate) { setShowUpgrade(true); return; }
    if (!selectedSet) { setError('Pick an affirmation set first.'); return; }
    if (!selectedTrack) { setError('Pick a background.'); return; }
    if (maxActive != null && activeCount >= maxActive) {
      setError(`You've reached your ${maxActive} active subliminal sessions -- delete one to make room, or upgrade.`);
      return;
    }
    setError(''); setCreating(true);
    try {
      const session = await saveSubSession({
        affirmation_set_ids: [selectedSet],
        background_type: bgType,
        background_track: selectedTrack,
        volume_level: volumeLevel,
        session_mins: 20,
      });
      setSessions((prev) => [session, ...prev]);
    } catch (e) {
      if (e.status === 403) setShowUpgrade(true);
      else setError(e.message || 'Could not create session');
    } finally { setCreating(false); }
  };

  const resolveBackgroundUri = async (session) => {
    if (session.background_type === 'music') {
      return resolveMusicUrl(session.background_track);
    }
    if (session.background_type === 'binaural') {
      const track = (backgrounds.binaural || []).find((t) => t.id === session.background_track);
      if (!track) throw new Error('Binaural track not found');
      setGeneratingTone(true);
      const uri = await generateToneFile({
        leftFreq: track.baseFreq - track.beatHz / 2,
        rightFreq: track.baseFreq + track.beatHz / 2,
      });
      setGeneratingTone(false);
      return uri;
    }
    if (session.background_type === 'frequency') {
      const track = (backgrounds.frequency || []).find((t) => t.id === session.background_track);
      const hz = track ? track.hz : parseInt(session.background_track, 10) || 528;
      setGeneratingTone(true);
      const uri = await generateToneFile({ leftFreq: hz, rightFreq: hz });
      setGeneratingTone(false);
      return uri;
    }
    throw new Error('Unknown background type');
  };

  const handlePlay = async (session) => {
    if (session.locked) { setShowUpgrade(true); return; }
    await stopPlayback();
    setPlayingId(session.id);
    setError('');
    try {
      const affUrl = session.audio_items?.[0]?.audio_url || session.audio_urls?.[0];
      if (!affUrl) throw new Error('Affirmation audio not ready yet');
      const bgUri = await resolveBackgroundUri(session);

      const { sound: newBg } = await Audio.Sound.createAsync({ uri: bgUri }, { shouldPlay: true, isLooping: true, volume: 0.5 });
      const { sound: newAff } = await Audio.Sound.createAsync(
        { uri: affUrl },
        { shouldPlay: true, isLooping: true, volume: VOLUME_GAIN[session.volume_level] || 0.18 }
      );
      setBgSound(newBg); setAffSound(newAff);
    } catch (e) {
      setError(e.message || 'Could not play session');
      setPlayingId(null);
      setGeneratingTone(false);
    }
  };

  const handlePlayPreloaded = async (sample) => {
    await stopPlayback();
    if (!sample.audio_url) { setError('This sample isn\'t available yet -- check back soon.'); return; }
    setPlayingId(sample.sample_id);
    setError('');
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: sample.audio_url }, { shouldPlay: true, isLooping: true });
      setAffSound(sound);
    } catch (e) {
      setError(e.message || 'Could not play sample');
      setPlayingId(null);
    }
  };

  const handleDelete = async (sessionId) => {
    try {
      await deleteSubSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (playingId === sessionId) await stopPlayback();
    } catch (e) {
      setError(e.message || 'Could not delete session');
    }
  };

  if (checkingPlan || loading) {
    return <GradientBackground><View style={styles.center}><ActivityIndicator size="large" color="#c9a8c9" /></View></GradientBackground>;
  }

  const currentTracks = backgrounds[bgType] || [];

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <ScreenHeader lead="Sublimin" accent="al" subtitle="Binaural & frequency tones work best with headphones 🎧" />

        {/* Preloaded samples -- always visible, works on every plan */}
        <GlassCard style={styles.cardMargin}>
          <Text style={styles.label}>TRY IT FREE</Text>
          {preloaded.length === 0 ? (
            <Text style={styles.muted}>Loading samples…</Text>
          ) : (
            preloaded.map((s) => (
              <View key={s.sample_id} style={styles.sampleRow}>
                <Text style={styles.sampleLabel}>{s.label}</Text>
                {playingId === s.sample_id ? (
                  <Button title="Stop ⏹" variant="ghost" size="sm" onPress={stopPlayback} />
                ) : (
                  <Button title="Play 🔊" size="sm" onPress={() => handlePlayPreloaded(s)} />
                )}
              </View>
            ))
          )}
        </GlassCard>

        {!canCreate ? (
          // Free plan -- matches website's plan-gate.js: no custom builder
          // at all, just the upsell.
          <GlassCard style={styles.cardMargin}>
            <Text style={styles.upsellIcon}>🎧</Text>
            <Text style={styles.upsellTitle}>Create Your Own Sessions</Text>
            <Text style={styles.upsellSubtitle}>
              Combine your own affirmations with music, binaural beats, or solfeggio frequencies -- unlimited sessions on Basic Manifestor.
            </Text>
            <Button title="Upgrade to Unlock ✨" onPress={() => setShowUpgrade(true)} fullWidth />
          </GlassCard>
        ) : (
        <>
        <GlassCard style={styles.cardMargin}>
          <Text style={styles.label}>1. CHOOSE AN AFFIRMATION SET</Text>
          {affSets.length === 0 ? (
            <Text style={styles.muted}>No affirmation sets yet — generate some on the Affirmations tab first.</Text>
          ) : (
            <View style={styles.chipRow}>
              {affSets.map((s) => (
                <Chip key={s.id} label={s.desire} active={selectedSet === s.id} onPress={() => setSelectedSet(s.id)} />
              ))}
            </View>
          )}
        </GlassCard>

        <GlassCard style={styles.cardMargin}>
          <Text style={styles.label}>2. CHOOSE A BACKGROUND TYPE</Text>
          <View style={styles.chipRow}>
            {BG_TYPES.map((t) => (
              <Chip key={t} label={t} active={bgType === t} onPress={() => { setBgType(t); setSelectedTrack(null); }} />
            ))}
          </View>

          <Text style={styles.subLabel}>{bgType === 'music' ? 'Track' : bgType === 'binaural' ? 'Brainwave state' : 'Solfeggio frequency'}</Text>
          <View style={styles.chipRow}>
            {currentTracks.map((t) => (
              <Chip key={t.id} label={t.label} active={selectedTrack === t.id} onPress={() => setSelectedTrack(t.id)} />
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.cardMargin}>
          <Text style={styles.label}>3. AFFIRMATION VOLUME</Text>
          <View style={styles.chipRow}>
            {['hidden', 'soft', 'audible'].map((v) => (
              <Chip key={v} label={v} active={volumeLevel === v} onPress={() => setVolumeLevel(v)} />
            ))}
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Button title="Create Session ✨" onPress={handleCreate} loading={creating} fullWidth style={{ marginTop: 12 }} />
        </GlassCard>

        <Text style={styles.sectionLabel}>Your Sessions</Text>
        {sessions.length === 0 ? (
          <Text style={styles.muted}>No sessions yet.</Text>
        ) : (
          sessions.map((s) => (
            <GlassCard key={s.id} style={styles.cardMargin}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.storyTitle}>{s.label || `Session #${s.id}`}</Text>
                {s.locked ? <Text style={styles.lockBadge}>🔒 Locked</Text> : null}
              </View>
              <Text style={styles.muted}>{s.background_type} · {s.background_track} · {s.volume_level}</Text>
              <View style={styles.row}>
                {playingId === s.id ? (
                  <Button title="Stop ⏹" variant="ghost" size="sm" onPress={stopPlayback} />
                ) : (
                  <Button title="Play 🔊" size="sm" disabled={s.locked} loading={generatingTone && playingId === s.id} onPress={() => handlePlay(s)} />
                )}
                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(s.id)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))
        )}
        </>
        )}
      </ScrollView>

      <UpgradeModal
        visible={showUpgrade}
        message="Custom subliminal sessions are a Basic Manifestor feature -- upgrade for unlimited sessions with your own affirmations."
        onClose={() => setShowUpgrade(false)}
        onSelectPlan={handleSelectPlan}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sampleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  sampleLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink, fontWeight: '500', flex: 1, paddingRight: 10 },
  upsellIcon: { fontSize: 34, textAlign: 'center', marginBottom: 6 },
  upsellTitle: { fontFamily: fonts.displayMedium, fontSize: 18, fontWeight: '600', color: colors.ink, textAlign: 'center', marginBottom: 6 },
  upsellSubtitle: { fontFamily: fonts.body, fontSize: 12.5, color: colors.mist, textAlign: 'center', marginBottom: 14, lineHeight: 18 },
  lockBadge: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.goldDeep, backgroundColor: 'rgba(224,192,128,0.25)', borderRadius: radii.pill, paddingVertical: 2, paddingHorizontal: 8, fontWeight: '600' },
  cardMargin: { marginBottom: 16 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  subLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.mist, marginTop: 10, marginBottom: 8 },
  muted: { fontFamily: fonts.body, color: colors.mist, fontSize: 13 },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginVertical: 8, textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionLabel: { fontFamily: fonts.displayMedium, fontSize: 17, fontWeight: '600', color: colors.ink, marginBottom: 12, marginTop: 4 },
  storyTitle: { fontFamily: fonts.bodyMedium, fontSize: 15, fontWeight: '600', color: colors.ink, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  deleteButton: { paddingVertical: 10, paddingHorizontal: 16, justifyContent: 'center' },
  deleteText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13 },
});
