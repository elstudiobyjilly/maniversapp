import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import {
  getMeditationLibrary, playMeditationLibraryItem,
  generateMeditation, getMyMeditations, deleteMeditation,
} from '../../services/api';

const CARD_COLORS = [
  'rgba(173,196,230,0.35)', 'rgba(245,200,150,0.35)', 'rgba(240,215,140,0.35)',
  'rgba(160,210,200,0.35)', 'rgba(200,170,225,0.35)', 'rgba(245,190,205,0.35)',
  'rgba(180,215,180,0.35)', 'rgba(210,195,230,0.35)',
];

const STYLE_META = {
  classic: { icon: '✨', label: 'Classic', desc: 'Manifestation-focused — settle, breathe, vivid visualisation, feel it, affirm, return.' },
  deep_immersive: { icon: '🌊', label: 'Deep Immersive', desc: 'ASMR-paced, slow and expansive — heavy body relaxation, long sensory visualisation.' },
  vision_journey: { icon: '🏔️', label: 'Vision Journey', desc: 'Journey into a vivid scene — you walk, arrive, live inside your desire fully.' },
  affirmation_flood: { icon: '🌟', label: 'Affirmation Flood', desc: 'Warm and uplifting — loaded with present-tense affirmations and gratitude waves.' },
  calm_reset: { icon: '🍃', label: 'Calm Reset', desc: 'Minimalist and grounding — breath-led, present moment, gentle and clean.' },
  body_scan: { icon: '💆', label: 'Body Scan', desc: 'Top-to-toe body release — tension melts away before the visualisation begins.' },
};
const STYLE_KEYS = Object.keys(STYLE_META);
const MED_DURATIONS = [5, 8, 10, 15, 20];

function medSections(script) {
  if (!script || typeof script !== 'object') return [];
  const secs = [];
  if (script.settle) secs.push({ label: 'Settle In', icon: '🌿', text: script.settle });
  if (script.breathe) secs.push({ label: 'Breathe', icon: '💨', text: Array.isArray(script.breathe) ? script.breathe.join('\n') : String(script.breathe) });
  if (script.visualise) secs.push({ label: 'Visualise', icon: '✨', text: script.visualise });
  if (script.feel) secs.push({ label: 'Feel It', icon: '💜', text: script.feel });
  if (script.affirm) secs.push({ label: 'Affirm', icon: '🌟', text: Array.isArray(script.affirm) ? script.affirm.join('\n') : String(script.affirm) });
  if (script.close) secs.push({ label: 'Return', icon: '🙏', text: script.close });
  return secs;
}

export default function Meditate() {
  const [tool, setTool] = useState('breath');
  const [mode, setMode] = useState('guided');

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <ScreenHeader lead="Guided" accent="Meditations" subtitle="Settle in. Breathe. Let your mind become still. ✨" />

        <View style={styles.toolRow}>
          <TouchableOpacity style={[styles.toolPill, tool === 'breath' && styles.toolPillActive]} onPress={() => setTool('breath')}>
            <Text style={[styles.toolText, tool === 'breath' && styles.toolTextActive]}>🫁 Breath Timer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolPill, tool === 'med' && styles.toolPillActive]} onPress={() => setTool('med')}>
            <Text style={[styles.toolText, tool === 'med' && styles.toolTextActive]}>⏱️ Med Timer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolPill, tool === 'mantra' && styles.toolPillActive]} onPress={() => setTool('mantra')}>
            <Text style={[styles.toolText, tool === 'mantra' && styles.toolTextActive]}>📿 Mantra Counter</Text>
          </TouchableOpacity>
        </View>

        {tool === 'breath' && <BreathTimer />}
        {tool === 'med' && <MedTimer />}
        {tool === 'mantra' && <MantraCounter />}

        <View style={styles.modeRow}>
          <TouchableOpacity style={[styles.modePill, mode === 'guided' && styles.modePillActive]} onPress={() => setMode('guided')}>
            <Text style={[styles.modeText, mode === 'guided' && styles.modeTextActive]}>🎵 Guided</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modePill, mode === 'personalised' && styles.modePillActive]} onPress={() => setMode('personalised')}>
            <Text style={[styles.modeText, mode === 'personalised' && styles.modeTextActive]}>✨ Personalised</Text>
          </TouchableOpacity>
        </View>

        {mode === 'guided' ? <GuidedLibrary /> : <PersonalisedMeditations />}
      </ScrollView>
    </GradientBackground>
  );
}

function GuidedLibrary() {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const soundRef = useRef(null);

  useEffect(() => {
    getMeditationLibrary()
      .then((data) => setLibrary(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => { soundRef.current?.unloadAsync().catch(() => {}); };
  }, []);

  const stop = async () => {
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch (e) {}
      soundRef.current = null;
    }
    setPlayingId(null);
  };

  const handlePress = async (item) => {
    if (playingId === item.id) { await stop(); return; }
    if (!item.audio_url) {
      Alert.alert('Audio generating — check back soon ✨');
      return;
    }
    await stop();
    setLoadingId(item.id);
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: item.audio_url }, { shouldPlay: true });
      soundRef.current = sound;
      setPlayingId(item.id);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) { setPlayingId(null); soundRef.current = null; }
      });
      playMeditationLibraryItem(item.id).catch(() => {});
    } catch (e) {
      Alert.alert('Could not play this meditation right now.');
    } finally {
      setLoadingId(null);
    }
  };

  if (loading) return <ActivityIndicator color="#c9a8c9" style={{ marginTop: 30 }} />;

  if (!library.length) {
    return (
      <View style={styles.comingSoonWrap}>
        <Text style={styles.comingSoonIcon}>🧘</Text>
        <Text style={styles.comingSoonBody}>Meditations coming soon ✨</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {library.map((item, i) => {
        const meta = STYLE_META[item.style] || { icon: '✨' };
        const isPlaying = playingId === item.id;
        const isLoading = loadingId === item.id;
        return (
          <TouchableOpacity
            key={item.id || i}
            style={[styles.gridCard, { backgroundColor: CARD_COLORS[i % CARD_COLORS.length] }, isPlaying && styles.gridCardActive]}
            onPress={() => handlePress(item)}
          >
            {isLoading ? (
              <ActivityIndicator color="#9a5fa8" />
            ) : (
              <Text style={styles.gridIcon}>{isPlaying ? '■' : meta.icon}</Text>
            )}
            <Text style={styles.gridLabel} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.gridMin}>{item.duration ? `${item.duration} min` : ''}{!item.audio_url ? ' · generating' : ''}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function PersonalisedMeditations() {
  const [desire, setDesire] = useState('');
  const [duration, setDuration] = useState(8);
  const [style, setStyle] = useState('classic');
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const [reading, setReading] = useState(null);

  useEffect(() => {
    getMyMeditations()
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!desire.trim()) { Alert.alert('Enter your desire or intention ✨'); return; }
    setGenerating(true);
    try {
      const r = await generateMeditation({ desire: desire.trim(), duration, style });
      setHistory((prev) => [r, ...prev]);
      setDesire('');
      setReading(r);
    } catch (e) {
      Alert.alert(e.message || 'Could not generate your meditation ✨');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = (item, idx) => {
    Alert.alert('Delete this meditation?', null, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setHistory((prev) => prev.filter((_, i) => i !== idx));
        if (item.id) { try { await deleteMeditation(item.id); } catch (e) {} }
      } },
    ]);
  };

  return (
    <View>
      <GlassCard style={{ marginBottom: 16 }}>
        <Text style={styles.formLbl}>Your desire or intention</Text>
        <View style={styles.inputBordered}>
          <TextInput
            style={styles.textInput}
            multiline
            placeholder="e.g. Feel calm and confident about my career..."
            placeholderTextColor="#9a8896"
            value={desire}
            onChangeText={setDesire}
          />
        </View>

        <Text style={styles.formLbl}>Duration</Text>
        <View style={styles.row}>
          {MED_DURATIONS.map((d) => (
            <TouchableOpacity key={d} style={[styles.durationPill, duration === d && styles.durationPillActive]} onPress={() => setDuration(d)}>
              <Text style={[styles.durationText, duration === d && styles.durationTextActive]}>{d} min</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.formLbl}>Style</Text>
        <View style={styles.styleGrid}>
          {STYLE_KEYS.map((key) => (
            <TouchableOpacity key={key} style={[styles.stylePill, style === key && styles.stylePillActive]} onPress={() => setStyle(key)}>
              <Text style={[styles.styleText, style === key && styles.styleTextActive]}>{STYLE_META[key].icon} {STYLE_META[key].label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.styleDesc}>{STYLE_META[style].desc}</Text>

        <Button
          title={generating ? '✨ Creating your meditation...' : '🧘 Generate My Meditation'}
          onPress={handleGenerate}
          disabled={generating}
          fullWidth
          style={{ marginTop: 14 }}
        />
      </GlassCard>

      {history.length > 0 && (
        <>
          <Text style={styles.historyHd}>Your Meditations</Text>
          {history.map((m, i) => (
            <GlassCard key={m.id || i} style={{ marginBottom: 10 }}>
              <TouchableOpacity onPress={() => setReading(m)}>
                <View style={styles.histRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.histTitle} numberOfLines={1}>{m.title || m.desire || 'Meditation'}</Text>
                    <Text style={styles.histMeta}>{STYLE_META[m.style]?.icon || '✨'} {STYLE_META[m.style]?.label || m.style} · {m.duration} min</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(m, i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.histDelete}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </GlassCard>
          ))}
        </>
      )}

      <Modal visible={!!reading} animationType="slide" onRequestClose={() => setReading(null)}>
        <GradientBackground>
          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
            <View style={styles.readModalHeader}>
              <Text style={styles.readModalTitle}>{reading?.title || reading?.desire || 'Your Meditation'}</Text>
              <TouchableOpacity onPress={() => setReading(null)}><Text style={styles.readModalClose}>✕</Text></TouchableOpacity>
            </View>
            {medSections(reading?.script).map((sec, i) => (
              <GlassCard key={i} style={{ marginBottom: 12 }}>
                <Text style={styles.sectionLbl}>{sec.icon} {sec.label}</Text>
                <Text style={styles.sectionText}>{sec.text}</Text>
              </GlassCard>
            ))}
            {medSections(reading?.script).length === 0 && (
              <Text style={styles.sectionText}>{typeof reading?.script === 'string' ? reading.script : 'Audio is generating — check back soon ✨'}</Text>
            )}
          </ScrollView>
        </GradientBackground>
      </Modal>
    </View>
  );
}

function BreathTimer() {
  const [running, setRunning] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState('Tap Start');
  const scale = useRef(new Animated.Value(1)).current;
  const loopRef = useRef(null);

  const start = () => {
    setRunning(true);
    const cycle = () => {
      setPhaseLabel('Breathe In');
      Animated.timing(scale, { toValue: 1.4, duration: 4000, useNativeDriver: true }).start(() => {
        setPhaseLabel('Hold');
        setTimeout(() => {
          setPhaseLabel('Breathe Out');
          Animated.timing(scale, { toValue: 1, duration: 4000, useNativeDriver: true }).start(() => {
            loopRef.current = setTimeout(cycle, 200);
          });
        }, 1500);
      });
    };
    cycle();
  };

  const stop = () => {
    setRunning(false);
    clearTimeout(loopRef.current);
    scale.stopAnimation();
  };

  const reset = () => {
    stop();
    scale.setValue(1);
    setPhaseLabel('Tap Start');
  };

  return (
    <GlassCard style={{ alignItems: 'center', paddingVertical: 40, marginBottom: 16 }}>
      <Animated.View style={[styles.breathCircle, { transform: [{ scale }] }]}>
        <Text style={styles.breathLabel}>{phaseLabel}</Text>
      </Animated.View>
      <View style={[styles.row, { marginTop: 24 }]}>
        <Button title="▶ Start" size="sm" onPress={start} disabled={running} />
        <Button title="◼ Stop" variant="ghost" size="sm" onPress={stop} />
        <Button title="↺ Reset" variant="ghost" size="sm" onPress={reset} />
      </View>
    </GlassCard>
  );
}

function MedTimer() {
  const DURATIONS = [5, 10, 15, 20, 30];
  const [duration, setDuration] = useState(10);
  const [secondsLeft, setSecondsLeft] = useState(10 * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);
  const soundRef = useRef(null);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const playBell = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: 'https://manivers.com/sounds/bell.mp3' });
      soundRef.current = sound;
      await sound.playAsync();
    } catch (_) {}
  };

  const start = () => {
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          playBell();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stop = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
  };

  const reset = () => {
    stop();
    setSecondsLeft(duration * 60);
  };

  const selectDuration = (mins) => {
    setDuration(mins);
    setSecondsLeft(mins * 60);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <GlassCard style={{ alignItems: 'center', paddingVertical: 36, marginBottom: 16 }}>
      <Text style={styles.timerDisplay}>{mm}:{ss}</Text>
      <View style={styles.row}>
        {DURATIONS.map((d) => (
          <TouchableOpacity key={d} style={[styles.durationPill, duration === d && styles.durationPillActive]} onPress={() => selectDuration(d)}>
            <Text style={[styles.durationText, duration === d && styles.durationTextActive]}>{d} min</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.row, { marginTop: 14 }]}>
        <Button title="▶ Start" size="sm" onPress={start} disabled={running} />
        <Button title="↺ Reset" variant="ghost" size="sm" onPress={reset} />
        <Button title="◼ Stop" variant="ghost" size="sm" onPress={stop} />
      </View>
      <Text style={styles.hintText}>Music starts automatically. Bell sounds when complete.</Text>
    </GlassCard>
  );
}

function MantraCounter() {
  const [count, setCount] = useState(0);
  const malas = Math.floor(count / 108);

  return (
    <GlassCard style={{ alignItems: 'center', paddingVertical: 36, marginBottom: 16 }}>
      <Text style={styles.mantraCount}>{count}</Text>
      <Text style={styles.hintText}>taps · 108 = one mala{malas > 0 ? ` · ${malas} mala${malas > 1 ? 's' : ''} complete` : ''}</Text>
      <TouchableOpacity style={styles.mantraTapBar} onPress={() => setCount((c) => c + 1)}>
        <Text style={styles.mantraTapEmoji}>🙏</Text>
      </TouchableOpacity>
      <Button title="↺ Reset" variant="ghost" size="sm" onPress={() => setCount(0)} style={{ marginTop: 14, alignSelf: 'flex-start' }} />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, color: '#2e2530', fontWeight: '600' },
  titleAccent: { fontStyle: 'italic', color: '#9a5fa8', fontWeight: '400' },
  subtitle: { fontSize: 13, color: '#6b5c66', marginTop: 4, marginBottom: 18, fontWeight: '500' },
  toolRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toolPill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 50, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)' },
  toolPillActive: { backgroundColor: '#c9a8c9', borderColor: '#c9a8c9' },
  toolText: { fontSize: 12, color: '#2e2530', fontWeight: '600' },
  toolTextActive: { color: '#fff' },
  breathCircle: { width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderColor: 'rgba(201,168,201,0.5)', backgroundColor: 'rgba(201,168,201,0.08)', justifyContent: 'center', alignItems: 'center' },
  breathLabel: { fontSize: 14, color: '#6b5c66', fontWeight: '500' },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  timerDisplay: { fontSize: 56, color: '#9a5fa8', fontWeight: '300', marginBottom: 20, fontFamily: 'serif' },
  durationPill: { backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 50, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)' },
  durationPillActive: { backgroundColor: '#c9a8c9', borderColor: '#c9a8c9' },
  durationText: { fontSize: 12, color: '#2e2530' },
  durationTextActive: { color: '#fff', fontWeight: '700' },
  hintText: { fontSize: 12, color: '#6b5c66', marginTop: 14, textAlign: 'center', fontStyle: 'italic' },
  mantraCount: { fontSize: 56, color: '#9a5fa8', fontWeight: '300', marginBottom: 6, fontFamily: 'serif' },
  mantraTapBar: { width: '100%', backgroundColor: '#c9a8c9', borderRadius: 20, paddingVertical: 28, alignItems: 'center', marginTop: 18 },
  mantraTapEmoji: { fontSize: 32 },
  modeRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 50, padding: 4, marginBottom: 16 },
  modePill: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 50 },
  modePillActive: { backgroundColor: '#fff' },
  modeText: { fontSize: 13, color: '#6b5c66', fontWeight: '600' },
  modeTextActive: { color: '#2e2530' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: { width: '31%', borderRadius: 16, paddingVertical: 22, paddingHorizontal: 6, alignItems: 'center', marginBottom: 4 },
  gridCardActive: { borderWidth: 2, borderColor: '#9a5fa8' },
  gridIcon: { fontSize: 26, marginBottom: 8 },
  gridLabel: { fontSize: 12, fontWeight: '600', color: '#2e2530', textAlign: 'center' },
  gridMin: { fontSize: 10, color: '#6b5c66', marginTop: 3, textAlign: 'center' },
  comingSoonWrap: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 20 },
  comingSoonIcon: { fontSize: 40, marginBottom: 14 },
  comingSoonTitle: { fontSize: 22, color: '#2e2530', fontWeight: '600', marginBottom: 6, fontFamily: 'serif' },
  comingSoonTag: { fontSize: 14, color: '#9a8896', fontStyle: 'italic', marginBottom: 16 },
  comingSoonBody: { fontSize: 13, color: '#6b5c66', textAlign: 'center', lineHeight: 20, marginBottom: 22 },

  formLbl: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: '#9a5fa8', marginBottom: 8, marginTop: 12 },
  inputBordered: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.35)', borderRadius: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.4)' },
  textInput: { fontSize: 14, color: '#2e2530', minHeight: 60 },
  styleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stylePill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.35)', backgroundColor: 'rgba(255,255,255,0.6)' },
  stylePillActive: { backgroundColor: '#9a5fa8', borderColor: 'transparent' },
  styleText: { fontSize: 11.5, fontWeight: '500', color: '#6b5c66' },
  styleTextActive: { color: '#fff' },
  styleDesc: { fontSize: 12, color: '#6b5c66', fontStyle: 'italic', marginTop: 8, lineHeight: 17 },

  historyHd: { fontSize: 15, color: '#2e2530', fontWeight: '600', marginBottom: 10 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  histTitle: { fontSize: 14, color: '#2e2530', fontWeight: '500' },
  histMeta: { fontSize: 11.5, color: '#6b5c66', marginTop: 2 },
  histDelete: { fontSize: 15 },

  readModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  readModalTitle: { fontSize: 20, color: '#2e2530', fontWeight: '500', flex: 1, fontFamily: 'serif' },
  readModalClose: { fontSize: 20, color: '#6b5c66', paddingLeft: 12 },
  sectionLbl: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: '#9a5fa8', marginBottom: 8 },
  sectionText: { fontSize: 14.5, color: '#2e2530', lineHeight: 22, fontStyle: 'italic' },
});
