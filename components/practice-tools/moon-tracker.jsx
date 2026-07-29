import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlassCard from '../GlassCard';
import { getFunToolData, saveFunToolData } from '../../services/api';

const LOG_KEY = 'mv_moon_log_local';

const MOON_PHASES = [
  { id: 'new', name: 'New Moon', glyph: '🌑', energy: 'Plant seeds · Set intentions · Begin', pct: [0, 6.25],
    desc: 'The new moon is a blank page. Your desires written now are charged with the most potent manifestation energy of the cycle.',
    steps: [{ ic: '✍️', text: 'Write your intentions for this lunar cycle — be specific about what you want to call in.' }, { ic: '🕯️', text: 'Light a candle and sit in stillness for 5 minutes. State your intention aloud.' }, { ic: '🌱', text: 'Pick one action you will take this cycle towards your desire. Write it down and commit.' }, { ic: '💫', text: 'Feel the desire as already done for 90 seconds. The new moon amplifies this feeling.' }] },
  { id: 'waxing_crescent', name: 'Waxing Crescent', glyph: '🌒', energy: 'Build momentum · Take action · Trust', pct: [6.25, 25],
    desc: 'The moon is growing — and so is your manifestation. This is the time to take inspired action, stay consistent and build belief.',
    steps: [{ ic: '🎯', text: 'Take one concrete step towards your intention today. Even small counts.' }, { ic: '✍️', text: 'Script for 5 minutes in the present tense as if your desire is already real.' }, { ic: '🔁', text: 'Repeat your affirmations morning and night. The crescent asks for consistency.' }, { ic: '📖', text: 'Journal: "Evidence of my manifestation is..." — write every sign, no matter how tiny.' }] },
  { id: 'first_quarter', name: 'First Quarter', glyph: '🌓', energy: 'Push through · Overcome resistance · Commit', pct: [25, 43.75],
    desc: 'The first quarter brings challenges to test your commitment. Blocks and doubt are normal — this is where you decide you want it anyway.',
    steps: [{ ic: '🧱', text: 'Write down the main block or fear showing up for you. Look it in the face.' }, { ic: '🔁', text: 'Flip every block into a belief using Identity Flip. Rewire the story.' }, { ic: '🌬️', text: "Do 10 box breaths before bed. Release the struggle. You don't have to force it." }, { ic: '💪', text: 'Say: "I choose my desire over my doubt. I recommit. I am not giving up."' }] },
  { id: 'waxing_gibbous', name: 'Waxing Gibbous', glyph: '🌔', energy: 'Refine · Trust · Almost there', pct: [43.75, 50],
    desc: "You're nearly at the peak. Refine your vision, trust the process and let the building energy carry you.",
    steps: [{ ic: '🎨', text: "Revisit your vision board or desire map. Does it still light you up? Update it." }, { ic: '🙏', text: "Gratitude practice: write 10 things you're grateful for related to your desire." }, { ic: '💫', text: 'Visualise the moment of manifestation — the phone call, the moment you find out. Feel it fully.' }, { ic: '🍃', text: 'Practise detachment: say "I want this AND I am not attached to when or how." Both are true.' }] },
  { id: 'full', name: 'Full Moon', glyph: '🌕', energy: 'Receive · Celebrate · Release', pct: [50, 56.25],
    desc: "The full moon is peak manifestation energy. Celebrate how far you've come AND release what is no longer aligned.",
    steps: [{ ic: '🎉', text: "Write a full celebration list — everything you've moved towards or received this cycle, however small." }, { ic: '🍃', text: 'Write what you are releasing: a fear, a person, a belief, an outcome you have been gripping.' }, { ic: '🌕', text: "If possible, stand in moonlight for 5 minutes. Feel the moon's energy charging you." }, { ic: '💌', text: 'Write a letter from your future self back to you now, confirming your desire is done.' }] },
  { id: 'waning_gibbous', name: 'Waning Gibbous', glyph: '🌖', energy: 'Share · Reflect · Give thanks', pct: [56.25, 75],
    desc: 'The moon begins to give back. This is your phase of gratitude, sharing and reflection.',
    steps: [{ ic: '🙏', text: 'Write a thank-you letter to the universe for everything already received and everything coming.' }, { ic: '💗', text: 'Do something kind for someone else today. Generosity in giving opens channels of receiving.' }, { ic: '📖', text: 'Reflect: What did this cycle teach me? What patterns am I noticing? What is shifting?' }, { ic: '✨', text: 'Share your journey with someone you trust. Spoken manifestations carry power.' }] },
  { id: 'last_quarter', name: 'Last Quarter', glyph: '🌗', energy: 'Let go · Forgive · Clear space', pct: [75, 93.75],
    desc: 'The last quarter is your deep release. Forgive yourself, forgive others, clear the internal clutter.',
    steps: [{ ic: '🍃', text: 'Write a full letting-go list: grudges, worries, self-criticism, old stories. Then destroy the paper.' }, { ic: '💗', text: 'Forgiveness work: write "I forgive myself for..." and "I forgive [name] for..." Do not hold anything back.' }, { ic: '🧹', text: 'Physically clear and clean a space in your home. External order signals internal readiness.' }, { ic: '🌬️', text: 'Long exhale breath work — 10 breaths where the exhale is double the inhale. Let go physically.' }] },
  { id: 'waning_crescent', name: 'Waning Crescent', glyph: '🌘', energy: 'Rest · Surrender · Prepare', pct: [93.75, 100],
    desc: 'The final phase before rebirth. Rest, surrender fully, and trust that the universe is preparing the ground.',
    steps: [{ ic: '😴', text: "Prioritise rest and sleep — your subconscious works hardest when you're not forcing things." }, { ic: '🤍', text: 'Say: "I surrender the how and the when. I trust completely. I am ready to receive."' }, { ic: '📖', text: 'Journal: What do I want to intention in the new moon coming? Begin dreaming.' }, { ic: '🌙', text: 'Sit quietly for 5 minutes in complete stillness. No phone. No input. Just be.' }] },
];

function getMoonPhase() {
  const knownNewMoon = new Date('2024-01-11T11:57:00Z').getTime();
  const lunarCycle = 29.53058867 * 24 * 60 * 60 * 1000;
  let elapsed = (Date.now() - knownNewMoon) % lunarCycle;
  if (elapsed < 0) elapsed += lunarCycle;
  const pct = (elapsed / lunarCycle) * 100;
  const phase = MOON_PHASES.find((p) => pct >= p.pct[0] && pct < p.pct[1]) || MOON_PHASES[0];
  return { phase, pct, dayOfCycle: Math.floor(elapsed / (24 * 60 * 60 * 1000)) + 1 };
}

export default function MoonTrackerTool() {
  const info = useMemo(() => getMoonPhase(), []);
  const [activeTab, setActiveTab] = useState(info.phase.id);
  const [logs, setLogs] = useState([]);
  const [intentionText, setIntentionText] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const local = await AsyncStorage.getItem(LOG_KEY);
        if (local) setLogs(JSON.parse(local));
      } catch (e) {}
      try {
        const remote = await getFunToolData('fun_moon');
        if (Array.isArray(remote)) setLogs(remote);
      } catch (e) {}
    })();
  }, []);

  const persist = useCallback(async (next) => {
    try { await AsyncStorage.setItem(LOG_KEY, JSON.stringify(next)); } catch (e) {}
    try { await saveFunToolData('fun_moon', next); } catch (e) {}
  }, []);

  const active = MOON_PHASES.find((p) => p.id === activeTab) || info.phase;
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });

  const handleAddIntention = () => {
    if (!intentionText.trim()) { Alert.alert('Write your intention first 🌙'); return; }
    const entry = { text: intentionText.trim(), glyph: info.phase.glyph, phase: info.phase.name, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
    const next = [...logs, entry];
    setLogs(next);
    persist(next);
    setIntentionText('');
    Alert.alert(`Intention set under the ${info.phase.name} 🌙`);
  };

  const handleClearLog = () => {
    Alert.alert('Clear all moon intentions?', null, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => { setLogs([]); persist([]); } },
    ]);
  };

  return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <Text style={styles.title}>Moon <Text style={styles.titleAccent}>Tracker</Text></Text>
        <Text style={styles.subtitle}>Align your manifestation practice with the lunar cycle.</Text>

        <View style={styles.hero}>
          <Text style={styles.heroGlyph}>{info.phase.glyph}</Text>
          <Text style={styles.heroName}>{info.phase.name}</Text>
          <Text style={styles.heroDate}>{todayStr.toUpperCase()} · DAY {info.dayOfCycle} OF 29</Text>
          <View style={styles.cycleBarWrap}>
            <View style={[styles.cycleBar, { width: `${info.pct.toFixed(1)}%` }]} />
          </View>
          <View style={styles.cycleLblRow}>
            <Text style={styles.cycleLbl}>🌑 New</Text>
            <Text style={styles.cycleLbl}>🌕 Full</Text>
            <Text style={styles.cycleLbl}>🌑 New</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 6, paddingRight: 8 }}>
          {MOON_PHASES.map((p) => (
            <TouchableOpacity key={p.id} style={[styles.tab, activeTab === p.id && styles.tabOn]} onPress={() => setActiveTab(p.id)}>
              <Text style={[styles.tabText, activeTab === p.id && styles.tabTextOn]}>{p.glyph} {p.name.split(' ')[0]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <GlassCard style={{ marginBottom: 18 }}>
          <Text style={styles.ritualTitle}>{active.glyph} {active.name} Ritual</Text>
          <Text style={styles.ritualEnergy}>{active.energy.toUpperCase()}</Text>
          <Text style={styles.ritualDesc}>{active.desc}</Text>
          {active.steps.map((st, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepIc}>{st.ic}</Text>
              <Text style={styles.stepText}>{st.text}</Text>
            </View>
          ))}
        </GlassCard>

        <View style={styles.logHeaderRow}>
          <Text style={styles.logHd}>Moon Intention Log</Text>
          <TouchableOpacity onPress={handleClearLog}><Text style={styles.logClear}>Clear</Text></TouchableOpacity>
        </View>

        <View style={styles.logForm}>
          <View style={[styles.inputBordered, { flex: 1, marginBottom: 0 }]}>
            <TextInput
              style={styles.input}
              placeholder="Set your intention for this moon phase..."
              placeholderTextColor="rgba(46,37,48,0.4)"
              value={intentionText}
              onChangeText={setIntentionText}
            />
          </View>
          <TouchableOpacity style={styles.setBtn} onPress={handleAddIntention}>
            <Text style={styles.setBtnText}>✦ Set</Text>
          </TouchableOpacity>
        </View>

        {logs.length === 0 ? (
          <Text style={styles.emptyText}>Set your first moon intention ✨</Text>
        ) : (
          logs.slice().reverse().slice(0, 10).map((l, i) => (
            <View key={i} style={styles.logEntry}>
              <Text style={styles.logEntryGlyph}>{l.glyph}</Text>
              <Text style={styles.logEntryText}>{l.text}</Text>
              <Text style={styles.logEntryDate}>{l.date}</Text>
            </View>
          ))
        )}
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, color: '#2e2530', fontWeight: '600' },
  titleAccent: { fontStyle: 'italic', color: '#9a5fa8', fontWeight: '400' },
  subtitle: { fontSize: 13, color: '#6b5c66', marginTop: 4, marginBottom: 18, fontWeight: '500' },

  hero: { backgroundColor: '#0d0820', borderRadius: 22, padding: 24, paddingTop: 28, alignItems: 'center', marginBottom: 16 },
  heroGlyph: { fontSize: 56, marginBottom: 8 },
  heroName: { fontFamily: undefined, fontSize: 22, fontWeight: '300', color: '#fff', marginBottom: 4 },
  heroDate: { fontSize: 10.5, letterSpacing: 1.2, color: 'rgba(255,255,255,0.45)', marginBottom: 16 },
  cycleBarWrap: { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  cycleBar: { height: '100%', backgroundColor: '#f0d060', borderRadius: 4 },
  cycleLblRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  cycleLbl: { fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 },

  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.3)', backgroundColor: 'rgba(255,255,255,0.7)' },
  tabOn: { backgroundColor: '#1a0f38', borderColor: 'transparent' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#6b5c66' },
  tabTextOn: { color: '#f0d060' },

  ritualTitle: { fontSize: 18, fontWeight: '500', color: '#2e2530', marginBottom: 4 },
  ritualEnergy: { fontSize: 11, letterSpacing: 1, color: '#9a5fa8', fontWeight: '600', marginBottom: 12 },
  ritualDesc: { fontSize: 13.5, fontStyle: 'italic', color: '#2e2530', lineHeight: 21, marginBottom: 14 },
  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 10, borderRadius: 10, backgroundColor: 'rgba(201,168,201,0.07)', borderLeftWidth: 2, borderLeftColor: '#c9a8c9', marginBottom: 8 },
  stepIc: { fontSize: 14 },
  stepText: { flex: 1, fontSize: 12.5, color: '#6b5c66', lineHeight: 19 },

  logHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  logHd: { fontSize: 15, color: '#2e2530', fontWeight: '600' },
  logClear: { fontSize: 12, color: '#6b5c66' },
  logForm: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  inputBordered: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.35)', borderRadius: 16, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  input: { fontSize: 14, color: '#2e2530', paddingVertical: 12 },
  setBtn: { backgroundColor: '#c9a8c9', borderRadius: 50, paddingVertical: 12, paddingHorizontal: 18, justifyContent: 'center' },
  setBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  emptyText: { textAlign: 'center', padding: 20, fontStyle: 'italic', color: '#6b5c66', fontSize: 13 },
  logEntry: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(154,95,168,0.15)', borderRadius: 12, padding: 12, marginBottom: 6 },
  logEntryGlyph: { fontSize: 15 },
  logEntryText: { flex: 1, fontSize: 13, color: '#2e2530', lineHeight: 19 },
  logEntryDate: { fontSize: 10.5, color: '#6b5c66' },
});