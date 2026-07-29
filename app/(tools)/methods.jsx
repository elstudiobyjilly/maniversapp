import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { getPracticeChecks, savePracticeChecks, logPracticeSession } from '../../services/api';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';

const METHODS = [
  {
    name: '369 Method',
    icon: '3️⃣',
    steps: [
      'Find a quiet space with a pen and paper.',
      'Write your core affirmation 3 times — morning. Really feel it as you write.',
      'Write the same affirmation 6 times — afternoon.',
      'Write the same affirmation 9 times — evening before bed.',
      'Feel the emotion of it being real with each line. Not just writing — feeling.',
      'Complete all 18 repetitions. Mark today as done.',
    ],
  },
  {
    name: '5×55 Method',
    icon: '5️⃣',
    steps: [
      'Choose ONE single affirmation. Write it here or in your mind.',
      'Write it 55 times in one sitting. Do not stop.',
      "Feel the emotion of each line — don't let it become mechanical.",
      'Complete all 55 repetitions without breaks.',
      'Mark this as Day 1. This must be done 5 consecutive days.',
      'After day 5, completely let go and trust.',
    ],
  },
  {
    name: 'Scripting',
    icon: '📝',
    steps: [
      'Open your Scripts tab or a notebook dedicated only to scripting.',
      'Write today\'s date — but as a date in the future when your desire has arrived.',
      'Begin: "I am so happy and grateful now that..."',
      'Describe your life in vivid sensory detail — what you see, feel, hear, smell.',
      'Write for at least 10 minutes without stopping to think.',
      'End with genuine gratitude. Re-read before bed tonight.',
    ],
  },
  {
    name: "Ho'oponopono",
    icon: '⭕',
    steps: [
      'Sit quietly. Bring your desire — or a current block — to mind.',
      'Notice any resistance, fear or anxiety that arises.',
      'Say slowly, with genuine feeling: "I\'m sorry."',
      'Then say: "Please forgive me."',
      'Then say: "Thank you."',
      'Then say: "I love you."',
      'Repeat the four phrases for 5-10 minutes. Let the emotion come if it comes.',
    ],
  },
  {
    name: 'Pillow Method',
    icon: '🌙',
    steps: [
      'Write your desire or affirmation clearly on a piece of paper.',
      'Hold the paper before bed. Read it aloud once with full belief.',
      'Feel the joy of it being real right now.',
      'Place the paper under your pillow.',
      'As you fall asleep, replay your desired reality like a movie.',
      'Do this every night until it manifests.',
    ],
  },
  {
    name: 'Mirror Work',
    icon: '🪞',
    steps: [
      'Stand in front of a mirror. Look directly into your own eyes.',
      'Begin with: "I love you, [your name]." Say it until you believe it.',
      'Speak your main affirmation aloud with full eye contact.',
      'Notice any resistance or discomfort — breathe through it gently.',
      'End with: "I love you and I believe in you."',
      'Do this every morning for 30 days.',
    ],
  },
  {
    name: 'Two Cup Method',
    icon: '🥤',
    steps: [
      'Fill two cups with water.',
      'Label one cup with your current situation.',
      'Label the other with your desired reality.',
      'Hold the first cup, feel your current reality fully.',
      'Slowly pour the water into the second cup while visualising the shift.',
      'Drink the water from the desire cup with full belief.',
      'Discard the labels. Let go completely.',
    ],
  },
  {
    name: 'Water Manifestation',
    icon: '🌊',
    steps: [
      'Fill a glass with clean water.',
      'Hold the glass with both hands.',
      'Close your eyes and speak your intention into the water three times.',
      'Feel the emotion of your desire as already real.',
      'Drink the water slowly and mindfully.',
      'Trust that the intention has been received.',
    ],
  },
];

export default function PracticeMethods() {
  const [checks, setChecks] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(null);

  useEffect(() => {
    getPracticeChecks().then(setChecks).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggleStep = async (methodName, stepIdx) => {
    const current = checks[methodName]?.[stepIdx] || false;
    const updated = {
      ...checks,
      [methodName]: { ...(checks[methodName] || {}), [stepIdx]: !current },
    };
    setChecks(updated);
    try { await savePracticeChecks(updated); } catch (_) {}
  };

  const handleLogSession = async (methodName) => {
    setLogging(methodName);
    try { await logPracticeSession(methodName); } catch (_) {}
    setLogging(null);
  };

  const doneCount = (methodName, totalSteps) => {
    const m = checks[methodName] || {};
    let c = 0;
    for (let i = 0; i < totalSteps; i++) if (m[i]) c++;
    return c;
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.center}><ActivityIndicator size="large" color="#c9a8c9" /></View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <ScreenHeader lead="Manifestation" accent="Methods" subtitle="Proven writing & repetition practices — pick one and follow through." />
        {METHODS.map((method) => {
          const done = doneCount(method.name, method.steps.length);
          const isOpen = expanded === method.name;
          const complete = done === method.steps.length;
          return (
            <GlassCard key={method.name} style={{ marginBottom: 14 }}>
              <TouchableOpacity style={styles.header} onPress={() => setExpanded(isOpen ? null : method.name)}>
                <Text style={styles.icon}>{method.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{method.name}</Text>
                  <Text style={styles.progressText}>
                    {done}/{method.steps.length} steps · {complete ? '✓ Complete' : 'In progress'}
                  </Text>
                </View>
                <Text style={styles.chevron}>{isOpen ? '▼' : '▶'}</Text>
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.body}>
                  <Text style={styles.bodyHint}>Tick each step as you complete it:</Text>
                  {method.steps.map((step, i) => {
                    const checked = checks[method.name]?.[i] || false;
                    return (
                      <TouchableOpacity key={i} style={styles.stepRow} onPress={() => toggleStep(method.name, i)}>
                        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                          {checked && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={[styles.stepText, checked && styles.stepTextDone]}>{step}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {complete && (
                    <TouchableOpacity style={styles.sessionButton} onPress={() => handleLogSession(method.name)} disabled={logging === method.name}>
                      {logging === method.name
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.sessionButtonText}>✨ Start New Session</Text>}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </GlassCard>
          );
        })}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 24 },
  name: { fontSize: 15, fontWeight: '600', color: '#2e2530' },
  progressText: { fontSize: 11, color: '#9a8896', marginTop: 2 },
  chevron: { fontSize: 12, color: '#9a8896' },
  body: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(46,37,48,0.08)' },
  bodyHint: { fontSize: 12, color: '#9a8896', marginBottom: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#c9a8c9', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: '#c9a8c9' },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText: { flex: 1, color: '#2e2530', fontSize: 13, lineHeight: 19 },
  stepTextDone: { color: '#9a8896', textDecorationLine: 'line-through' },
  sessionButton: { backgroundColor: '#c9a8c9', borderRadius: 50, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  sessionButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
