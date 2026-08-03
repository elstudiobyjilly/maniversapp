import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Audio } from 'expo-av';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import {
  getSubPreloaded, getSubBackgrounds, getSubAffirmationSets, saveSubSession,
  getSubSessions, deleteSubSession, resolveMusicUrl, createCheckout,
} from '../../services/api';
import { generateToneFile } from '../../services/toneGenerator';
import GlassCard from '../../components/GlassCard';
import ScreenHeader from '../../components/ScreenHeader';
import TabPill from '../../components/TabPill';
import Chip from '../../components/Chip';
import Button from '../../components/Button';
import { colors, fonts, radii, shadows } from '../../constants/theme';
import GradientBackground from '../../components/GradientBackground';
import UpgradeModal from '../../components/UpgradeModal';
import { usePlanStore } from '../../store/planStore';
import * as Linking from 'expo-linking';

// ─── Ported exactly from the website's subliminal.js ───────────────────────
const BG_TYPES = [
  { key: 'music', icon: '🎵', label: 'Music', desc: 'Calm tracks' },
  { key: 'binaural', icon: '🎶', label: 'Binaural', desc: 'Brainwave beats' },
  { key: 'frequency', icon: '✨', label: 'Frequency', desc: 'Solfeggio tones' },
];
const BINAURAL_DEFAULTS = { delta: 2, alpha: 10, beta: 20, gamma: 40 };
const DEFAULT_HZ = 528;
const STEP_LABELS = ['Affirmations', 'Background Sound', 'Activate'];
const DURATIONS = [5, 10, 20, 30, 60];
const SPEEDS = [0.75, 1.0, 1.5, 2.0];
const BG_GAIN = 0.75;
const MAX_SESSIONS = 15;

// Real ultrasonic (19kHz carrier AM) modulation and WSOLA time-stretch need
// raw-PCM DSP the site does client-side with Web Audio's OfflineAudioContext
// -- there's no RN equivalent without a native DSP module, so "Silent" is
// approximated with a very low, near-inaudible playback volume instead of
// true carrier modulation. Speed change IS real (expo-av's pitch-corrected
// playback rate matches the site's pitch-preserving intent).
const PRESETS = {
  audible: {
    icon: '🔊', label: 'Audible',
    desc: 'Words play at normal pitch beneath the background. Clear and gentle — best for conscious reinforcement while you work or rest.',
    tags: ['Normal pitch', 'Max 30% volume', 'Speed control'],
    voicePct: 50,
  },
  subliminal: {
    icon: '🔕', label: 'Silent',
    desc: 'Affirmations play at a level completely inaudible to your conscious mind. Pure silence — no noise you can hear — while your subconscious receives every word.',
    tags: ['100% Volume', 'Ultrasonic Carrier', 'Pure Silence'],
    voicePct: 12,
  },
};

// Voice volume curve, ported exactly: ceiling .70, curve 1.2, floor .10
function voiceVol(pct) {
  const x = pct / 100;
  if (x <= 0) return 0;
  return Math.max(0.10, 0.70 * Math.pow(x, 1.2));
}

function sessionName(s) {
  return s.label || `${PRESETS[s.volume_level]?.label || 'Subliminal'} Subliminal`;
}

export default function Subliminal() {
  const { limits, hasFeature, refresh } = usePlanStore();
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [backgrounds, setBackgrounds] = useState({ music: [], binaural: [], frequency: [] });
  const [affSets, setAffSets] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [preloaded, setPreloaded] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [view, setView] = useState('generator'); // 'generator' | 'station'
  const viewManuallySet = useRef(false);

  // ── Generator wizard state ──
  const [step, setStep] = useState(1);
  const [setsTab, setSetsTab] = useState('ai'); // 'ai' | 'own'
  const [search, setSearch] = useState('');
  const [selectedSetId, setSelectedSetId] = useState(null);
  const [bgType, setBgType] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [preset, setPreset] = useState(null);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [previewingId, setPreviewingId] = useState(null);
  const previewSoundRef = useRef(null);
  const previewTimerRef = useRef(null);

  // ── Station (now playing) state ──
  const [activeSession, setActiveSession] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [durationMin, setDurationMin] = useState(20);
  const [speed, setSpeed] = useState(1.0);
  const [voicePct, setVoicePct] = useState(50);
  const [bgPct, setBgPct] = useState(75);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [generatingTone, setGeneratingTone] = useState(false);

  // ── Library select mode ──
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);

  const bgSoundRef = useRef(null);
  const affSoundRef = useRef(null);
  const timerRef = useRef(null);

  const canCreate = hasFeature('subliminal_active_cap');
  const maxActive = limits?.subliminal_active_cap;
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
      const preloadedRes = await getSubPreloaded().catch(() => ({ samples: [] }));
      setPreloaded(preloadedRes.samples || []);

      if (canCreate) {
        const [bg, sets, sess] = await Promise.all([
          getSubBackgrounds(), getSubAffirmationSets(), getSubSessions(),
        ]);
        setBackgrounds(bg);
        setAffSets(sets || []);
        setSessions(sess || []);
        if ((sess || []).length > 0 && !viewManuallySet.current) setView('station');
      }
    } catch (e) {
      setError(e.message || 'Could not load subliminal data');
    }
  };

  useEffect(() => { refresh().then(() => setCheckingPlan(false)); }, []);
  useEffect(() => { if (!checkingPlan) loadAll().finally(() => setLoading(false)); }, [checkingPlan]);

  useEffect(() => () => { stopAll(); stopPreview(); }, []);

  // ── Timer driving the ring ──
  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= durationMin * 60) {
            stopAll();
            Alert.alert('Session complete ✨');
            return 0;
          }
          return next;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, durationMin]);

  const changeView = (v) => { viewManuallySet.current = true; setView(v); };

  // ── Track preview (▶ 8s snippet) ──
  const stopPreview = async () => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    if (previewSoundRef.current) {
      await previewSoundRef.current.stopAsync().catch(() => {});
      await previewSoundRef.current.unloadAsync().catch(() => {});
      previewSoundRef.current = null;
    }
    setPreviewingId(null);
  };

  const previewTrack = async (type, track) => {
    await stopPreview();
    setPreviewingId(track.id);
    try {
      let uri;
      if (type === 'music') {
        uri = resolveMusicUrl(track.id);
      } else if (type === 'binaural') {
        uri = await generateToneFile({ leftFreq: (track.baseFreq || 200) - (track.beatHz || 6) / 2, rightFreq: (track.baseFreq || 200) + (track.beatHz || 6) / 2 });
      } else {
        uri = await generateToneFile({ leftFreq: track.hz || DEFAULT_HZ, rightFreq: track.hz || DEFAULT_HZ });
      }
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, volume: 0.3 });
      previewSoundRef.current = sound;
      previewTimerRef.current = setTimeout(stopPreview, 8000);
    } catch (_) {
      setPreviewingId(null);
    }
  };

  // ── Session playback ──
  const stopAll = async () => {
    if (bgSoundRef.current) { await bgSoundRef.current.stopAsync().catch(() => {}); await bgSoundRef.current.unloadAsync().catch(() => {}); bgSoundRef.current = null; }
    if (affSoundRef.current) { await affSoundRef.current.stopAsync().catch(() => {}); await affSoundRef.current.unloadAsync().catch(() => {}); affSoundRef.current = null; }
    setPlaying(false);
    setElapsed(0);
  };

  const resolveBackgroundUri = async (session) => {
    if (!session.background_type) return null;
    if (session.background_type === 'music') return resolveMusicUrl(session.background_track);
    if (session.background_type === 'binaural') {
      const track = (backgrounds.binaural || []).find((t) => t.id === session.background_track);
      const key = (session.background_track || '').toLowerCase();
      const beatHz = track?.beatHz ?? Object.keys(BINAURAL_DEFAULTS).find((k) => key.includes(k)) ? BINAURAL_DEFAULTS[Object.keys(BINAURAL_DEFAULTS).find((k) => key.includes(k))] : 6;
      const baseFreq = track?.baseFreq ?? 200;
      setGeneratingTone(true);
      const uri = await generateToneFile({ leftFreq: baseFreq - beatHz / 2, rightFreq: baseFreq + beatHz / 2 });
      setGeneratingTone(false);
      return uri;
    }
    if (session.background_type === 'frequency') {
      const track = (backgrounds.frequency || []).find((t) => t.id === session.background_track);
      const hz = track ? track.hz : parseInt(session.background_track, 10) || DEFAULT_HZ;
      setGeneratingTone(true);
      const uri = await generateToneFile({ leftFreq: hz, rightFreq: hz });
      setGeneratingTone(false);
      return uri;
    }
    return null;
  };

  const startSession = async (session) => {
    await stopAll();
    setError('');
    setActiveSession(session);
    changeView('station');
    const presetDef = PRESETS[session.volume_level] || PRESETS.audible;
    setDurationMin(session.session_mins || 20);
    setSpeed(1.0);
    setVoicePct(presetDef.voicePct);
    setBgPct(75);
    try {
      const affUrl = session.audio_items?.[0]?.audio_url || session.audio_urls?.[0];
      if (!affUrl) throw new Error('Affirmation audio not ready yet');
      const bgUri = await resolveBackgroundUri(session);

      if (bgUri) {
        const { sound: newBg } = await Audio.Sound.createAsync({ uri: bgUri }, { shouldPlay: true, isLooping: true, volume: BG_GAIN * 0.75 });
        bgSoundRef.current = newBg;
      }
      const { sound: newAff } = await Audio.Sound.createAsync(
        { uri: affUrl },
        { shouldPlay: true, isLooping: true, volume: voiceVol(presetDef.voicePct) }
      );
      affSoundRef.current = newAff;
      setPlaying(true);
    } catch (e) {
      setError(e.message || 'Could not play session');
      setPlaying(false);
      setGeneratingTone(false);
    }
  };

  const togglePlayPause = async () => {
    if (!affSoundRef.current) return;
    if (playing) {
      await affSoundRef.current.pauseAsync().catch(() => {});
      if (bgSoundRef.current) await bgSoundRef.current.pauseAsync().catch(() => {});
      setPlaying(false);
    } else {
      await affSoundRef.current.playAsync().catch(() => {});
      if (bgSoundRef.current) await bgSoundRef.current.playAsync().catch(() => {});
      setPlaying(true);
    }
  };

  const restartSession = async () => {
    if (affSoundRef.current) await affSoundRef.current.setPositionAsync(0).catch(() => {});
    if (bgSoundRef.current) await bgSoundRef.current.setPositionAsync(0).catch(() => {});
    setElapsed(0);
    if (!playing) { await togglePlayPause(); }
  };

  const applyVoicePct = async (pct) => {
    setVoicePct(pct);
    if (affSoundRef.current) await affSoundRef.current.setVolumeAsync(voiceVol(pct)).catch(() => {});
  };
  const applyBgPct = async (pct) => {
    setBgPct(pct);
    if (bgSoundRef.current) await bgSoundRef.current.setVolumeAsync(BG_GAIN * (pct / 100)).catch(() => {});
  };
  const applySpeed = async (rate) => {
    setSpeed(rate);
    if (affSoundRef.current) await affSoundRef.current.setRateAsync(rate, true).catch(() => {});
  };
  const applyDuration = (mins) => { setDurationMin(mins); setElapsed(0); };

  // ── Generator: create + save ──
  const handlePlayPreloaded = async (sample) => {
    await stopAll();
    if (!sample.audio_url) { setError("This sample isn't ready yet — check back soon ✨"); return; }
    setError('');
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: sample.audio_url }, { shouldPlay: true, isLooping: true });
      affSoundRef.current = sound;
      setPlaying(true);
    } catch (e) {
      setError(e.message || 'Could not play sample');
    }
  };

  const selectedSet = affSets.find((s) => s.id === selectedSetId);
  const filteredSets = affSets.filter((s) => {
    const isOwn = s.source === 'own';
    if (setsTab === 'own' && !isOwn) return false;
    if (setsTab === 'ai' && isOwn) return false;
    if (search.trim() && !(s.desire || '').toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });
  const aiCount = affSets.filter((s) => s.source !== 'own').length;
  const ownCount = affSets.filter((s) => s.source === 'own').length;

  const resetWizard = () => {
    setStep(1); setSelectedSetId(null); setBgType(null); setSelectedTrack(null); setPreset(null); setLabel('');
  };

  const handleSave = async () => {
    if (!preset) return;
    if (maxActive != null && activeCount >= MAX_SESSIONS) {
      setError(`You have ${MAX_SESSIONS} subliminals — delete one to make room ✨`);
      return;
    }
    setError(''); setCreating(true);
    try {
      const session = await saveSubSession({
        affirmation_set_ids: [selectedSetId],
        background_type: bgType,
        background_track: selectedTrack,
        layered: true,
        volume_level: preset,
        session_mins: 20,
        label: label.trim(),
      });
      setSessions((prev) => [session, ...prev]);
      resetWizard();
      await startSession(session);
    } catch (e) {
      if (e.status === 403) setShowUpgrade(true);
      else setError(e.message || 'Could not create session');
    } finally { setCreating(false); }
  };

  // ── Library actions ──
  const toggleSelectMode = () => { setSelectMode((v) => !v); setSelectedIds(new Set()); };
  const toggleSelected = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleDeleteOne = (session) => {
    Alert.alert('Delete this subliminal?', null, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteSubSession(session.id);
          setSessions((prev) => prev.filter((s) => s.id !== session.id));
          if (activeSession?.id === session.id) await stopAll();
        } catch (e) { setError(e.message || 'Could not delete'); }
      } },
    ]);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(`Delete ${selectedIds.size} subliminal(s)?`, null, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        for (const id of selectedIds) { try { await deleteSubSession(id); } catch (_) {} }
        setSessions((prev) => prev.filter((s) => !selectedIds.has(s.id)));
        setSelectedIds(new Set()); setSelectMode(false);
      } },
    ]);
  };

  const handleDeleteAll = () => {
    Alert.alert(`Delete ALL ${sessions.length} subliminals?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete All', style: 'destructive', onPress: async () => {
        for (const s of sessions) { try { await deleteSubSession(s.id); } catch (_) {} }
        setSessions([]); setSelectedIds(new Set()); setSelectMode(false);
        await stopAll(); setActiveSession(null);
      } },
    ]);
  };

  if (checkingPlan || loading) {
    return <GradientBackground><View style={styles.center}><ActivityIndicator size="large" color="#c9a8c9" /></View></GradientBackground>;
  }

  const currentTracks = bgType ? (backgrounds[bgType] || []) : [];
  const totalSeconds = durationMin * 60;
  const ringProgress = totalSeconds > 0 ? Math.min(1, elapsed / totalSeconds) : 0;
  const R = 50, C = 2 * Math.PI * R;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <ScreenHeader lead="Sublimin" accent="al" subtitle="Affirmations layered silently beneath sound — your subconscious listens while you rest. 🎧" />

        {/* Preloaded samples — always visible, free on every plan */}
        <GlassCard style={styles.cardMargin}>
          <Text style={styles.label}>TRY IT FREE</Text>
          {preloaded.length === 0 ? (
            <Text style={styles.muted}>Loading samples…</Text>
          ) : (
            preloaded.map((s) => (
              <View key={s.sample_id} style={styles.sampleRow}>
                <Text style={styles.sampleIcon}>{s.mode === 'silent' ? '🌙' : '🔊'}</Text>
                <Text style={styles.sampleLabel}>{s.label || 'Sample'}</Text>
                {playing && affSoundRef.current && !activeSession ? (
                  <Button title="Stop ⏹" variant="ghost" size="sm" onPress={stopAll} />
                ) : (
                  <Button title={s.audio_url ? '▶ Play' : 'Coming soon'} size="sm" disabled={!s.audio_url} onPress={() => handlePlayPreloaded(s)} />
                )}
              </View>
            ))
          )}
        </GlassCard>

        {!canCreate ? (
          <GlassCard style={styles.cardMargin}>
            <Text style={styles.upsellIcon}>🎧</Text>
            <Text style={styles.upsellTitle}>Subliminal Audio</Text>
            <Text style={styles.upsellSubtitle}>
              Real subliminals — your own voice frequency-shifted beneath binaural beats. Try our free samples above, or upgrade for unlimited sessions with your own affirmations.
            </Text>
            {['🌙 Sleep mode — ultrasonic, near-inaudible', '🧘 Meditate mode — binaural beats for focus', '☀️ Passive mode — faster playback, works while you live your life', '🎵 Background music or solfeggio frequencies', '✨ Your own affirmations, unlimited sessions'].map((line) => (
              <Text key={line} style={styles.perkLine}>{line}</Text>
            ))}
            <Button title="Upgrade to Manifestor ✨" onPress={() => setShowUpgrade(true)} fullWidth style={{ marginTop: 12 }} />
          </GlassCard>
        ) : (
          <>
            <TabPill
              style={{ marginBottom: 16 }}
              value={view}
              onChange={changeView}
              options={[
                { value: 'generator', label: '✨ Generator' },
                { value: 'station', label: sessions.length ? `🎧 Station (${sessions.length})` : '🎧 Station' },
              ]}
            />

            {view === 'generator' ? (
              <>
                {/* Stepbar */}
                <View style={styles.stepbar}>
                  {STEP_LABELS.map((lbl, i) => {
                    const n = i + 1;
                    const done = n < step;
                    const active = n === step;
                    return (
                      <View key={lbl} style={styles.stepItem}>
                        <TouchableOpacity onPress={() => setStep(n)} style={[styles.stepDot, active && styles.stepDotActive, done && styles.stepDotDone]}>
                          <Text style={[styles.stepDotText, (active || done) && styles.stepDotTextOn]}>{done ? '✓' : n}</Text>
                        </TouchableOpacity>
                        <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{lbl}</Text>
                        {i < STEP_LABELS.length - 1 && <View style={styles.stepLine} />}
                      </View>
                    );
                  })}
                </View>

                {step === 1 && (
                  <GlassCard style={styles.cardMargin}>
                    <Text style={styles.stepHeading}>Pick a Set</Text>
                    <Text style={styles.stepSub}>Green dot = audio ready. Orange = no audio yet.</Text>

                    <View style={styles.subTabRow}>
                      <TouchableOpacity style={[styles.subTab, setsTab === 'ai' && styles.subTabActive]} onPress={() => setSetsTab('ai')}>
                        <Text style={[styles.subTabText, setsTab === 'ai' && styles.subTabTextActive]}>✨ AI ({aiCount})</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.subTab, setsTab === 'own' && styles.subTabActive]} onPress={() => setSetsTab('own')}>
                        <Text style={[styles.subTabText, setsTab === 'own' && styles.subTabTextActive]}>✍️ Own ({ownCount})</Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search sets..."
                      placeholderTextColor="rgba(46,37,48,0.4)"
                      value={search}
                      onChangeText={setSearch}
                    />

                    {filteredSets.length === 0 ? (
                      <Text style={styles.muted}>No affirmation sets yet — generate some on the Affirmations tab first.</Text>
                    ) : (
                      filteredSets.map((s) => {
                        const active = selectedSetId === s.id;
                        const name = (s.desire || '').length > 42 ? `${s.desire.slice(0, 40)}...` : s.desire;
                        return (
                          <TouchableOpacity key={s.id} style={[styles.setRow, active && styles.setRowActive]} onPress={() => setSelectedSetId(active ? null : s.id)}>
                            <View style={[styles.radioCircle, active && styles.radioCircleActive]} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.setName}>{name}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                                <View style={[styles.statusDot, { backgroundColor: s.audio_url ? '#4caf50' : '#ff9800' }]} />
                                <Text style={styles.setMeta}>{s.aff_count || 0} affs · {s.audio_url ? 'audio ready' : 'no audio yet'}</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}

                    <View style={styles.wizardFooterRow}>
                      <Button title="Clear" size="sm" variant="ghost" onPress={() => setSelectedSetId(null)} />
                      <Button title="Background →" size="sm" disabled={!selectedSetId} onPress={() => setStep(2)} />
                    </View>
                  </GlassCard>
                )}

                {step === 2 && (
                  <GlassCard style={styles.cardMargin}>
                    <Text style={styles.stepHeading}>Background Sound</Text>
                    <Text style={styles.stepSub}>Plays beneath your affirmations. Pick a track — or skip to use no background.</Text>

                    <View style={styles.bgGrid}>
                      {BG_TYPES.map((t) => (
                        <TouchableOpacity key={t.key} style={[styles.bgCard, bgType === t.key && styles.bgCardActive]} onPress={() => { setBgType(t.key); setSelectedTrack(null); }}>
                          <Text style={styles.bgCardIcon}>{t.icon}</Text>
                          <Text style={styles.bgCardLabel}>{t.label}</Text>
                          <Text style={styles.bgCardDesc}>{t.desc}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {bgType && (
                      <View style={{ marginTop: 12 }}>
                        {currentTracks.length === 0 ? (
                          <Text style={styles.muted}>No tracks available.</Text>
                        ) : currentTracks.map((t) => (
                          <View key={t.id} style={styles.trackRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.trackLabel, selectedTrack === t.id && styles.trackLabelActive]} onPress={() => setSelectedTrack(t.id)}>{t.label}</Text>
                              {t.description ? <Text style={styles.trackDesc}>{t.description}</Text> : null}
                            </View>
                            <TouchableOpacity style={styles.previewBtn} onPress={() => previewingId === t.id ? stopPreview() : previewTrack(bgType, t)}>
                              <Text style={styles.previewBtnText}>{previewingId === t.id ? '⏹' : '▶'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.radioCircleSm, selectedTrack === t.id && styles.radioCircleActive]} onPress={() => setSelectedTrack(t.id)} />
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.wizardFooterRow}>
                      <Button title="← Back" size="sm" variant="ghost" onPress={() => setStep(1)} />
                      <Button title="Activate →" size="sm" onPress={() => setStep(3)} />
                    </View>
                  </GlassCard>
                )}

                {step === 3 && (
                  <GlassCard style={styles.cardMargin}>
                    <Text style={styles.stepHeading}>Activate Subliminal</Text>
                    <Text style={styles.stepSub}>Choose your transmission output level.</Text>

                    {Object.entries(PRESETS).map(([key, p]) => (
                      <TouchableOpacity key={key} style={[styles.presetCard, preset === key && styles.presetCardActive]} onPress={() => setPreset(key)}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.presetIcon}>{p.icon}</Text>
                          <Text style={styles.presetLabel}>{p.label}</Text>
                          {preset === key && <Text style={styles.presetCheck}>✓</Text>}
                        </View>
                        <Text style={styles.presetDesc}>{p.desc}</Text>
                        <View style={styles.chipRow}>
                          {p.tags.map((tag) => <View key={tag} style={styles.presetTag}><Text style={styles.presetTagText}>{tag}</Text></View>)}
                        </View>
                      </TouchableOpacity>
                    ))}

                    <View style={styles.reviewBox}>
                      <View style={styles.reviewRow}>
                        <Text style={styles.reviewLabel}>Selected Items</Text>
                        <Text style={styles.reviewValue}>{selectedSet ? `${selectedSet.aff_count || 0} Affirmations Layered` : '—'}</Text>
                      </View>
                      <View style={styles.reviewRow}>
                        <Text style={styles.reviewLabel}>Background Layer</Text>
                        <Text style={styles.reviewValue}>{bgType ? `${bgType} · ${selectedTrack || '—'}` : 'None'}</Text>
                      </View>
                    </View>

                    <TextInput
                      style={[styles.searchInput, { marginTop: 12 }]}
                      placeholder="Give this session a name (optional)"
                      placeholderTextColor="rgba(46,37,48,0.4)"
                      value={label}
                      onChangeText={setLabel}
                      maxLength={60}
                    />

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <View style={styles.wizardFooterRow}>
                      <Button title="← Back" size="sm" variant="ghost" onPress={() => setStep(2)} />
                      <Button title="🔄 Reset" size="sm" variant="ghost" onPress={resetWizard} />
                      <Button title={creating ? 'Activating…' : '💾 Save & Play'} size="sm" disabled={!preset} loading={creating} onPress={handleSave} />
                    </View>
                  </GlassCard>
                )}
              </>
            ) : (
              <>
                {/* Now Playing */}
                {activeSession ? (
                  <GlassCard style={styles.nowPlayingCard}>
                    <Text style={styles.npLabel}>NOW PLAYING</Text>
                    <Text style={styles.npName}>{sessionName(activeSession)}</Text>

                    <View style={styles.ringWrap}>
                      <Svg width={140} height={140} viewBox="0 0 120 120">
                        <Defs>
                          <SvgLinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor="#f8b8c8" />
                            <Stop offset="100%" stopColor="#a878b8" />
                          </SvgLinearGradient>
                        </Defs>
                        <Circle cx="60" cy="60" r={R} stroke="rgba(201,168,201,0.2)" strokeWidth="7" fill="none" />
                        <Circle
                          cx="60" cy="60" r={R} stroke="url(#ringGrad)" strokeWidth="7" fill="none"
                          strokeDasharray={`${C} ${C}`} strokeDashoffset={C * (1 - ringProgress)}
                          strokeLinecap="round" rotation="-90" origin="60,60"
                        />
                      </Svg>
                      <View style={styles.ringCenter}>
                        <Text style={styles.ringTime}>{String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</Text>
                        <Text style={styles.ringTotal}>of {durationMin}:00</Text>
                        <Text style={{ fontSize: 18, marginTop: 2 }}>{PRESETS[activeSession.volume_level]?.icon || '🎵'}</Text>
                      </View>
                    </View>

                    {generatingTone && <Text style={styles.muted}>Preparing tone…</Text>}

                    <View style={styles.transportRow}>
                      <TouchableOpacity style={styles.transportSm} onPress={restartSession}><Text style={styles.transportIcon}>↩</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.transportMain} onPress={togglePlayPause}><Text style={styles.transportMainIcon}>{playing ? '⏸' : '▶'}</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.transportSm} onPress={stopAll}><Text style={styles.transportIcon}>⏹</Text></TouchableOpacity>
                    </View>

                    <Text style={styles.controlLabel}>DURATION</Text>
                    <View style={styles.pillRow}>
                      {DURATIONS.map((m) => (
                        <TouchableOpacity key={m} style={[styles.durPill, durationMin === m && styles.durPillActive]} onPress={() => applyDuration(m)}>
                          <Text style={[styles.durPillText, durationMin === m && styles.durPillTextActive]}>{m}m</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.controlLabel}>SPEED</Text>
                    <View style={styles.pillRow}>
                      {SPEEDS.map((r) => (
                        <TouchableOpacity key={r} style={[styles.durPill, speed === r && styles.durPillActive]} onPress={() => applySpeed(r)}>
                          <Text style={[styles.durPillText, speed === r && styles.durPillTextActive]}>{r}×</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TouchableOpacity style={styles.settingsToggle} onPress={() => setSettingsOpen((v) => !v)}>
                      <Text style={styles.settingsToggleText}>⚙️ Settings {settingsOpen ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                    {settingsOpen && (
                      <View>
                        <Text style={styles.controlLabel}>VOICE VOLUME</Text>
                        <View style={styles.pillRow}>
                          {[10, 25, 50, 75, 100].map((p) => (
                            <TouchableOpacity key={p} style={[styles.durPill, voicePct === p && styles.durPillActive]} onPress={() => applyVoicePct(p)}>
                              <Text style={[styles.durPillText, voicePct === p && styles.durPillTextActive]}>{p}%</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <Text style={styles.controlLabel}>BACKGROUND VOLUME</Text>
                        <View style={styles.pillRow}>
                          {[10, 25, 50, 75, 100].map((p) => (
                            <TouchableOpacity key={p} style={[styles.durPill, bgPct === p && styles.durPillActive]} onPress={() => applyBgPct(p)}>
                              <Text style={[styles.durPillText, bgPct === p && styles.durPillTextActive]}>{p}%</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </GlassCard>
                ) : (
                  <GlassCard style={styles.cardMargin}>
                    <Text style={styles.upsellIcon}>🎧</Text>
                    <Text style={styles.upsellTitle}>Nothing playing</Text>
                    <Text style={styles.upsellSubtitle}>Create a subliminal in Generator or pick one below ✨</Text>
                    <Button title="Open Generator" onPress={() => changeView('generator')} fullWidth />
                  </GlassCard>
                )}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Library */}
                <View style={styles.libHeadRow}>
                  <Text style={styles.sectionLabel}>Your Subliminals</Text>
                  <Text style={styles.libCount}>{sessions.length} saved</Text>
                  {sessions.length > 0 && (
                    <TouchableOpacity onPress={toggleSelectMode}>
                      <Text style={styles.libSelectToggle}>{selectMode ? '✕ Cancel' : '☑ Select'}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {selectMode && (
                  <View style={styles.bulkBar}>
                    <Text style={styles.muted}>{selectedIds.size} selected</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button title="🗑 Delete Selected" size="sm" variant="ghost" disabled={selectedIds.size === 0} onPress={handleDeleteSelected} />
                      <Button title="🗑 Delete All" size="sm" variant="danger" onPress={handleDeleteAll} />
                    </View>
                  </View>
                )}

                {sessions.length === 0 ? (
                  <Text style={styles.muted}>No subliminals yet — create one in Generator ✨</Text>
                ) : (
                  sessions.map((s) => {
                    const p = PRESETS[s.volume_level];
                    const isPlaying = activeSession?.id === s.id;
                    return (
                      <View key={s.id}>
                        <TouchableOpacity
                          style={styles.libItem}
                          onPress={() => {
                            if (selectMode) return toggleSelected(s.id);
                            if (s.locked) return setShowUpgrade(true);
                            startSession(s);
                          }}
                        >
                          {selectMode ? (
                            <View style={[styles.checkbox, selectedIds.has(s.id) && styles.checkboxOn]} />
                          ) : (
                            <Text style={{ fontSize: 16 }}>{s.locked ? '🔒' : isPlaying ? '▶' : (p?.icon || '🎵')}</Text>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.libName}>{sessionName(s)}{s.locked ? ' 🔒 Manifestor' : ''}</Text>
                            <Text style={styles.libMeta}>{p ? `${p.icon} ${p.label}` : '✨ Subliminal'} · {s.aff_count ?? '?'} affs</Text>
                          </View>
                          {!selectMode && (
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                              <TouchableOpacity onPress={() => setExpandedId(expandedId === s.id ? null : s.id)}><Text style={styles.libIcon}>ℹ</Text></TouchableOpacity>
                              <TouchableOpacity onPress={() => handleDeleteOne(s)}><Text style={styles.libIcon}>🗑</Text></TouchableOpacity>
                            </View>
                          )}
                        </TouchableOpacity>
                        {expandedId === s.id && (
                          <View style={styles.libExpand}>
                            {(s.affirmation_texts || []).length === 0 ? (
                              <Text style={styles.muted}>No affirmation text saved.</Text>
                            ) : s.affirmation_texts.map((t, i) => (
                              <Text key={i} style={styles.libExpandLine}>• {t}</Text>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </>
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
  cardMargin: { marginBottom: 16 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  muted: { fontFamily: fonts.body, color: colors.mist, fontSize: 13 },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginVertical: 8, textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  sectionLabel: { fontFamily: fonts.displayMedium, fontSize: 17, fontWeight: '600', color: colors.ink },

  sampleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  sampleIcon: { fontSize: 16 },
  sampleLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink, fontWeight: '500', flex: 1 },

  upsellIcon: { fontSize: 34, textAlign: 'center', marginBottom: 6 },
  upsellTitle: { fontFamily: fonts.displayMedium, fontSize: 18, fontWeight: '600', color: colors.ink, textAlign: 'center', marginBottom: 6 },
  upsellSubtitle: { fontFamily: fonts.body, fontSize: 12.5, color: colors.mist, textAlign: 'center', marginBottom: 10, lineHeight: 18 },
  perkLine: { fontFamily: fonts.body, fontSize: 12.5, color: colors.ink2, marginBottom: 6, textAlign: 'center' },

  // Stepbar
  stepbar: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(201,168,201,0.4)', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  stepDotActive: { backgroundColor: colors.purpleMid, borderColor: colors.purpleMid, ...shadows.button },
  stepDotDone: { backgroundColor: 'rgba(201,168,201,0.25)', borderColor: colors.purpleMid },
  stepDotText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.mist, fontWeight: '700' },
  stepDotTextOn: { color: colors.purpleDark },
  stepLabel: { fontFamily: fonts.body, fontSize: 9.5, color: colors.mist, marginLeft: 4, marginRight: 4, display: 'none' },
  stepLabelActive: { color: colors.purpleDark, fontWeight: '600' },
  stepLine: { flex: 1, height: 1, backgroundColor: 'rgba(201,168,201,0.3)' },

  stepHeading: { fontFamily: fonts.displayMedium, fontSize: 18, color: colors.ink, marginBottom: 4 },
  stepSub: { fontFamily: fonts.body, fontSize: 12, color: colors.mist, marginBottom: 12, lineHeight: 17 },

  subTabRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  subTab: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)' },
  subTabActive: { backgroundColor: colors.purpleMid, borderColor: colors.purpleMid },
  subTabText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.ink2, fontWeight: '500' },
  subTabTextActive: { color: '#fff', fontWeight: '700' },

  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: radii.md, paddingVertical: 10, paddingHorizontal: 14,
    fontSize: 13, color: colors.ink, marginBottom: 10, borderWidth: 1.5, borderColor: 'rgba(248,184,200,0.35)',
  },

  setRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radii.sm, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.5)' },
  setRowActive: { backgroundColor: 'rgba(201,168,201,0.18)' },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: 'rgba(201,168,201,0.5)' },
  radioCircleActive: { backgroundColor: colors.purpleMid, borderColor: colors.purpleMid },
  radioCircleSm: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(201,168,201,0.5)' },
  setName: { fontFamily: fonts.displayItalic, fontSize: 14, fontStyle: 'italic', color: colors.ink },
  setMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.mist },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  wizardFooterRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },

  bgGrid: { flexDirection: 'row', gap: 8 },
  bgCard: { flex: 1, borderRadius: radii.md, padding: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)' },
  bgCardActive: { backgroundColor: 'rgba(201,168,201,0.22)', borderColor: colors.purpleMid },
  bgCardIcon: { fontSize: 20, marginBottom: 4 },
  bgCardLabel: { fontFamily: fonts.bodyMedium, fontSize: 12.5, fontWeight: '700', color: colors.ink },
  bgCardDesc: { fontFamily: fonts.body, fontSize: 10, color: colors.mist, marginTop: 2 },

  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(201,168,201,0.12)' },
  trackLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink, fontWeight: '600' },
  trackLabelActive: { color: colors.purpleDark },
  trackDesc: { fontFamily: fonts.body, fontSize: 11, color: colors.mist, marginTop: 1 },
  previewBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(201,168,201,0.15)', alignItems: 'center', justifyContent: 'center' },
  previewBtnText: { fontSize: 11, color: colors.purpleDark },

  presetCard: { borderRadius: radii.md, padding: 14, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', marginBottom: 10 },
  presetCardActive: { backgroundColor: 'rgba(201,168,201,0.2)', borderColor: colors.purpleMid },
  presetIcon: { fontSize: 18 },
  presetLabel: { fontFamily: fonts.displayMedium, fontSize: 15, color: colors.ink, fontWeight: '600' },
  presetCheck: { color: colors.purpleDark, fontWeight: '700', marginLeft: 'auto' },
  presetDesc: { fontFamily: fonts.body, fontSize: 12, color: colors.mist, lineHeight: 17, marginTop: 6 },
  presetTag: { backgroundColor: 'rgba(201,168,201,0.15)', borderRadius: radii.pill, paddingVertical: 3, paddingHorizontal: 9 },
  presetTagText: { fontFamily: fonts.body, fontSize: 10, color: colors.purpleDark },

  reviewBox: { backgroundColor: 'rgba(201,168,201,0.1)', borderRadius: radii.sm, padding: 12, marginTop: 6 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  reviewLabel: { fontFamily: fonts.body, fontSize: 11.5, color: colors.mist },
  reviewValue: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.ink, fontWeight: '600', textTransform: 'capitalize' },

  // Now Playing / Station
  nowPlayingCard: { marginBottom: 16, alignItems: 'center', paddingVertical: 24 },
  npLabel: { fontFamily: fonts.bodyMedium, fontSize: 10, letterSpacing: 1.5, color: colors.purpleDark, opacity: 0.7, textTransform: 'uppercase', marginBottom: 4 },
  npName: { fontFamily: fonts.displayMedium, fontSize: 17, color: colors.ink, marginBottom: 16 },
  ringWrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringTime: { fontFamily: fonts.bodyMedium, fontSize: 22, fontWeight: '700', color: colors.purpleDark },
  ringTotal: { fontFamily: fonts.body, fontSize: 11, color: colors.mist },

  transportRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 18 },
  transportMain: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.purpleMid, alignItems: 'center', justifyContent: 'center', ...shadows.button },
  transportMainIcon: { fontSize: 26, color: '#fff' },
  transportSm: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.4)', alignItems: 'center', justifyContent: 'center' },
  transportIcon: { fontSize: 16, color: colors.purpleDark },

  controlLabel: { fontFamily: fonts.bodyMedium, fontSize: 9.5, color: colors.mist, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 10, marginBottom: 6, alignSelf: 'flex-start' },
  pillRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  durPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)' },
  durPillActive: { backgroundColor: colors.purpleMid, borderColor: colors.purpleMid },
  durPillText: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.ink2, fontWeight: '500' },
  durPillTextActive: { color: '#fff', fontWeight: '700' },

  settingsToggle: { marginTop: 12, alignSelf: 'center' },
  settingsToggleText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.purpleDark, fontWeight: '600' },

  libHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 4 },
  libCount: { fontFamily: fonts.body, fontSize: 11, color: colors.mist, backgroundColor: 'rgba(201,168,201,0.15)', borderRadius: radii.pill, paddingVertical: 2, paddingHorizontal: 8 },
  libSelectToggle: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.purpleDark, marginLeft: 'auto', fontWeight: '600' },
  bulkBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 },

  libItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: radii.sm, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(201,168,201,0.2)' },
  libName: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: colors.ink, fontWeight: '600' },
  libMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.mist, marginTop: 1, textTransform: 'capitalize' },
  libIcon: { fontSize: 14 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.5)' },
  checkboxOn: { backgroundColor: colors.purpleMid, borderColor: colors.purpleMid },
  libExpand: { backgroundColor: 'rgba(201,168,201,0.08)', borderRadius: radii.sm, padding: 12, marginTop: -4, marginBottom: 8 },
  libExpandLine: { fontFamily: fonts.displayItalic, fontSize: 12.5, color: colors.ink2, fontStyle: 'italic', marginBottom: 4 },
});
