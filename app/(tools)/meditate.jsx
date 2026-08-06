import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { startSession, completeSession } from '../../services/api';

const GUIDED_MEDITATIONS = [
  { key: 'deep_sleep', icon: '🌙', label: 'Deep Sleep', color: 'rgba(173,196,230,0.35)' },
  { key: 'morning_rise', icon: '🌅', label: 'Morning Rise', color: 'rgba(245,200,150,0.35)' },
  { key: 'abundance_flow', icon: '💰', label: 'Abundance Flow', color: 'rgba(240,215,140,0.35)' },
  { key: 'calm_storm', icon: '🌊', label: 'Calm the Storm', color: 'rgba(160,210,200,0.35)' },
  { key: 'own_power', icon: '👑', label: 'Own Your Power', color: 'rgba(200,170,225,0.35)' },
  { key: 'coming_home', icon: '💕', label: 'Coming Home', color: 'rgba(245,190,205,0.35)' },
  { key: 'body_healing', icon: '🌿', label: 'Body Healing', color: 'rgba(180,215,180,0.35)' },
  { key: 'gratitude_bath', icon: '🙏', label: 'Gratitude Bath', color: 'rgba(210,195,230,0.35)' },
];

export default function Meditate() {
  const insets = useSafeAreaInsets();
  const [tool, setTool] = useState('breath');
  const [mode, setMode] = useState('guided');

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 46, paddingBottom: 40 }}>
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

        {mode === 'guided' ? (
          <View style={styles.grid}>
            {GUIDED_MEDITATIONS.map((m) => (
              <TouchableOpacity key={m.key} style={[styles.gridCard, { backgroundColor: m.color }]}>
                <Text style={styles.gridIcon}>{m.icon}</Text>
                <Text style={styles.gridLabel}>{m.label}</Text>
                <Text style={styles.gridMin}>10+ min</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.comingSoonWrap}>
            <Text style={styles.comingSoonIcon}>🧘</Text>
            <Text style={styles.comingSoonTitle}>Personalised Meditations</Text>
            <Text style={styles.comingSoonTag}>Coming Soon ✨</Text>
            <Text style={styles.comingSoonBody}>
              Your AI-crafted guided meditations are being built with love. This feature will create a fully personalised guided session around your specific desire or intention.
            </Text>
            <Button title="← Guided Meditations" variant="ghost" size="sm" onPress={() => setMode('guided')} />
          </View>
        )}
      </ScrollView>
    </GradientBackground>
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
  // Meditation never reached the Tracker at all — a finished sit now opens
  // and completes a /sessions row like every other practice.
  const trackedSessionId = useRef(null);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const playBell = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: 'https://manivers.com/sounds/bell.mp3' });
      soundRef.current = sound;
      await sound.playAsync();
    } catch (_) {}
  };

  const start = async () => {
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          playBell();
          // Sat the full duration — count it as a completed session.
          const id = trackedSessionId.current;
          if (id) {
            trackedSessionId.current = null;
            completeSession(id, 1).catch(() => {});
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    // Best-effort — a tracking failure must never block the timer.
    try {
      const sess = await startSession({ affirmationId: null, repeatTarget: 1 });
      trackedSessionId.current = sess?.id ?? null;
    } catch (_) { trackedSessionId.current = null; }
  };

  // Stopping early leaves the session open-but-incomplete, matching the
  // other players.
  const stop = () => {
    setRunning(false);
    trackedSessionId.current = null;
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
  gridCard: { width: '31%', borderRadius: 16, paddingVertical: 22, alignItems: 'center', marginBottom: 4 },
  gridIcon: { fontSize: 26, marginBottom: 8 },
  gridLabel: { fontSize: 12, fontWeight: '600', color: '#2e2530', textAlign: 'center' },
  gridMin: { fontSize: 10, color: '#6b5c66', marginTop: 3 },
  comingSoonWrap: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 20 },
  comingSoonIcon: { fontSize: 40, marginBottom: 14 },
  comingSoonTitle: { fontSize: 22, color: '#2e2530', fontWeight: '600', marginBottom: 6, fontFamily: 'serif' },
  comingSoonTag: { fontSize: 14, color: '#9a8896', fontStyle: 'italic', marginBottom: 16 },
  comingSoonBody: { fontSize: 13, color: '#6b5c66', textAlign: 'center', lineHeight: 20, marginBottom: 22 },
});
