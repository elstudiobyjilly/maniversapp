import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import GlassCard from '../GlassCard';

const SEGMENTS = [
  { label: '369 Method', ic: '3️⃣', color: '#fdeaf4', mins: 10, prompt: 'Write your desire 3 times in the morning, 6 times in the afternoon, 9 times at night. Feel it each time.', action: 'Grab your journal. Write your desire right now — start with the 3x morning round. Keep it short, present tense, fully felt.' },
  { label: 'Mirror Work', ic: '🪞', color: '#f1e7fb', mins: 3, prompt: 'Stand before a mirror. Look into your own eyes. Speak your affirmation as truth — not hope, but fact.', action: 'Find a mirror. Say your affirmation 5 times, slowly. Notice where you feel resistance — that is your work.' },
  { label: 'Scripting', ic: '✍️', color: '#e9f1fb', mins: 5, prompt: "Write 3 paragraphs from your future self's perspective. You have it. How does your day look? What do you feel?", action: 'Open your journal. Start with "Today I woke up feeling..." and write from the version of you who already has everything.' },
  { label: 'Box Breathing', ic: '🌬️', color: '#e7f6ee', mins: 4, prompt: '4 counts in. Hold 4. Out 4. Hold 4. As you breathe in — receive your desire. As you hold — it is yours. As you breathe out — release resistance.', action: 'Sit comfortably. Close your eyes. Start your box breathing now. Do 8 full rounds with your desire in mind.' },
  { label: 'Feel It Now', ic: '💫', color: '#fdf1e3', mins: 2, prompt: 'Close your eyes. Your desire is real. Right now. Feel the emotion in your body — where does joy live? Where does relief land?', action: "Set a 2 minute timer. Close your eyes. Don't visualise scenes — feel the FEELING. Joy, relief, lightness, love." },
  { label: 'Two Cup', ic: '🥤', color: '#fdedf2', mins: 8, prompt: 'Label one cup with your current reality. Label another with your desired reality. Pour the water, drink slowly. You are shifting.', action: 'Get two glasses and water. Label them with sticky notes. Perform the ritual with full intention and presence.' },
  { label: 'Body Scan', ic: '🫀', color: '#f5e9fa', mins: 6, prompt: 'Scan from crown to feet. Where is there tension? That is stored resistance. Breathe into each point and release.', action: 'Lie down. Start at the top of your head. Spend 10 seconds on each body part, breathing in light and breathing out any tightness.' },
  { label: '5×55 Method', ic: '✦', color: '#ecf2fb', mins: 15, prompt: "Write your affirmation 55 times. Don't rush. Feel each word. This is not repetition — this is reprogramming.", action: 'Write your single most important affirmation 55 times in your journal. Present tense. Felt with your whole body.' },
];

const N = SEGMENTS.length;
const ARC = 360 / N;
const WHEEL_SIZE = Math.min(Dimensions.get('window').width * 0.82, 330);
const RADIUS = WHEEL_SIZE / 2;

export default function RouletteTool() {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const currentDeg = useRef(0);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    const spins = 6 + Math.random() * 4; // full rotations
    const randomOffset = Math.random() * 360;
    const targetDeg = currentDeg.current + spins * 360 + randomOffset;

    Animated.timing(rotation, {
      toValue: targetDeg,
      duration: 4000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      currentDeg.current = targetDeg % 360;
      // Pointer is fixed at top (0deg). Segment i is centered at angle i*ARC (before wheel rotation).
      // After rotating the wheel by currentDeg clockwise, the segment now at top is the one whose
      // original center angle equals -currentDeg (mod 360).
      const normalized = ((-currentDeg.current % 360) + 360) % 360;
      const idx = Math.round(normalized / ARC) % N;
      setResult(SEGMENTS[idx]);
      setSpinning(false);
    });
  };

  const spin_deg = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
    extrapolate: 'extend',
  });
  const counterSpinDeg = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '-360deg'],
    extrapolate: 'extend',
  });

  return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <Text style={styles.title}>Manifestation <Text style={styles.titleAccent}>Roulette</Text></Text>
        <Text style={styles.subtitle}>Spin the wheel — let the universe choose your practice.</Text>

        <View style={styles.wheelOuter}>
          <View style={styles.pointer} />
          <Animated.View style={[styles.wheel, { width: WHEEL_SIZE, height: WHEEL_SIZE, borderRadius: WHEEL_SIZE / 2, transform: [{ rotate: spin_deg }] }]}>
            {SEGMENTS.map((seg, i) => {
              const midAngle = i * ARC - 90; // segment 0 centered at top initially
              const chipRadius = RADIUS * 0.74;
              const x = RADIUS + chipRadius * Math.cos((midAngle * Math.PI) / 180);
              const y = RADIUS + chipRadius * Math.sin((midAngle * Math.PI) / 180);
              return (
                <View key={i} style={[styles.segmentChip, { left: x - 34, top: y - 30, backgroundColor: seg.color }]}>
                  <Animated.View style={{ transform: [{ rotate: counterSpinDeg }], alignItems: 'center' }}>
                    <Text style={styles.segmentIc}>{seg.ic}</Text>
                    <Text style={styles.segmentLabel}>{seg.label}</Text>
                  </Animated.View>
                </View>
              );
            })}
            <View style={styles.wheelCenter}>
              <Text style={styles.wheelCenterText}>✦</Text>
            </View>
          </Animated.View>
        </View>

        <TouchableOpacity style={[styles.spinBtn, spinning && { opacity: 0.5 }]} onPress={spin} disabled={spinning}>
          <Text style={styles.spinBtnText}>{spinning ? 'Spinning...' : '🎲 Spin the Wheel'}</Text>
        </TouchableOpacity>

        {result && (
          <GlassCard style={{ marginTop: 6 }}>
            <Text style={styles.resultIc}>{result.ic}</Text>
            <Text style={styles.resultName}>{result.label}</Text>
            <Text style={styles.resultTime}>⏱ {result.mins} MINUTES</Text>
            <Text style={styles.resultPrompt}>{result.prompt}</Text>
            <View style={styles.resultActionWrap}>
              <Text style={styles.resultAction}>→ {result.action}</Text>
            </View>
          </GlassCard>
        )}
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, color: '#2e2530', fontWeight: '600', textAlign: 'center' },
  titleAccent: { fontStyle: 'italic', color: '#9a5fa8', fontWeight: '400' },
  subtitle: { fontSize: 13, color: '#6b5c66', marginTop: 4, marginBottom: 22, fontWeight: '500', textAlign: 'center' },

  wheelOuter: { alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  pointer: {
    width: 0, height: 0, position: 'absolute', top: -2, zIndex: 3,
    borderLeftWidth: 12, borderRightWidth: 12, borderTopWidth: 22,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#c9a0cc',
  },
  wheel: {
    backgroundColor: '#fdf6ff',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#8c3cc8', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
    elevation: 8, justifyContent: 'center', alignItems: 'center',
  },
  segmentChip: {
    position: 'absolute', width: 68, height: 60, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
  },
  segmentIc: { fontSize: 16, textAlign: 'center' },
  segmentLabel: { fontSize: 9, color: '#5a4470', textAlign: 'center', fontWeight: '600', marginTop: 2 },
  wheelCenter: {
    position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(160,80,230,0.5)',
    shadowColor: '#7828c8', shadowOpacity: 0.3, shadowRadius: 10,
  },
  wheelCenterText: { color: '#c9a0cc', fontSize: 18 },

  spinBtn: {
    backgroundColor: '#c9a8c9', borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginBottom: 16,
    shadowColor: '#c9a0cc', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
  },
  spinBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  resultIc: { fontSize: 40, textAlign: 'center', marginBottom: 6 },
  resultName: { fontSize: 20, fontWeight: '500', color: '#2e2530', textAlign: 'center', marginBottom: 4 },
  resultTime: { fontSize: 11, letterSpacing: 1, color: '#9a5fa8', fontWeight: '600', textAlign: 'center', marginBottom: 14 },
  resultPrompt: { fontSize: 14, fontStyle: 'italic', color: '#2e2530', lineHeight: 22, marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(160,80,230,0.15)' },
  resultActionWrap: { borderLeftWidth: 3, borderLeftColor: '#c9a8c9', paddingLeft: 12 },
  resultAction: { fontSize: 13, color: '#6b5c66', lineHeight: 20 },
});