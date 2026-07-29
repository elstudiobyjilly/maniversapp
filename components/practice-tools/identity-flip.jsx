import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlassCard from '../GlassCard';
import { getFunToolData, saveFunToolData } from '../../services/api';

const SAVED_KEY = 'mv_flip_saved_local';

const FLIP_LIBRARY = [
  { patterns: [/\bnot.*enough\b/i, /\bnever.*enough\b/i], identity: 'I am more than enough. I have always been enough.', affirmations: ['My enoughness is not something I earn — it is what I am', 'Every part of me is worthy and sufficient', 'I show up as enough in every moment, without trying'], anchor: { ic: '🤲', text: 'Place both hands on your chest. Say "I am enough" and press gently. Do this every morning before you pick up your phone.' } },
  { patterns: [/\bnot.*worthy\b/i, /\bunworthy\b/i, /\bdon'?t.*deserve\b/i], identity: 'I am deeply worthy of everything I desire.', affirmations: ['Worthiness is my birthright, not something I have to earn', 'I deserve beautiful things, loving people, and abundant resources', 'The universe does not withhold from the worthy — and I am worthy'], anchor: { ic: '💗', text: 'Each morning, write "I deserve this:" and name one thing you\'re manifesting. Let yourself believe it for 30 seconds.' } },
  { patterns: [/\bnot.*lucky\b/i, /\bnever.*lucky\b/i, /\bunlucky\b/i], identity: 'I am naturally lucky. Good fortune follows me everywhere.', affirmations: ['Lucky things happen to me all the time', 'I notice and attract fortunate coincidences daily', 'My life is full of evidence that I am blessed'], anchor: { ic: '🍀', text: 'Keep a "luck log" — write one lucky thing that happened each day. After 7 days, the pattern becomes undeniable.' } },
  { patterns: [/\bmoney.*hard\b/i, /\bstruggle.*money\b/i, /\bmoney.*scarce\b/i], identity: 'Money comes to me easily and from multiple directions.', affirmations: ['There are infinite ways for money to find me', 'Ease and abundance are my new financial normal', 'I stop struggling for money and start receiving it'], anchor: { ic: '🌊', text: "Imagine money as water — it flows, it's everywhere, it finds the lowest point naturally. Hands palms-up. Feel yourself receiving." } },
  { patterns: [/\bnot.*smart\b/i, /\bnot.*intelligent\b/i, /\bstupid\b/i, /\bdumb\b/i], identity: 'I am intelligent, resourceful, and capable of learning anything.', affirmations: ['My intelligence grows every time I try something new', 'I find creative solutions with ease', 'I trust my mind to figure things out'], anchor: { ic: '🧠', text: 'When you solve any problem — no matter how small — pause and say "I\'m good at this." Celebrate micro-wins. Your brain takes notes.' } },
  { patterns: [/\bnot.*attractive\b/i, /\bnot.*beautiful\b/i, /\bunattractive\b/i], identity: 'I am magnetic, attractive and beautiful in my own unique way.', affirmations: ['My energy is what draws people to me', 'I carry myself with beauty and confidence', 'I am deeply attractive because I am deeply myself'], anchor: { ic: '✨', text: 'Choose one thing you genuinely like about your appearance. Every morning, acknowledge it specifically. One thing, consistently, rewires everything.' } },
  { patterns: [/\bnot.*lovable\b/i, /\bnobody.*love\b/i, /\bunlovable\b/i], identity: 'I am deeply lovable and worthy of profound love.', affirmations: ['Love is drawn to me because of who I am, not what I do', 'I am safe to love and be loved', 'My heart is open and love flows both ways freely'], anchor: { ic: '🫀', text: 'Each night before sleep, recall one person who has loved you. Sit with that feeling for 60 seconds. Your nervous system learns love is safe.' } },
  { patterns: [/\bnot.*confident\b/i, /\bno.*confidence\b/i, /\bafraid\b/i, /\bcoward\b/i], identity: "I am courageous. I act before I feel ready and I grow bolder daily.", affirmations: ['Confidence is built in action, not waiting', "I do brave things even when I'm afraid", 'Every time I choose courage I prove who I am'], anchor: { ic: '🦁', text: 'Before any moment that requires courage, take 2 power breaths and say "I\'ve got this" once. Do it every time without exception.' } },
  { patterns: [/\btoo.*late\b/i, /\btoo.*old\b/i, /\btoo.*young\b/i], identity: 'I am exactly the right age at exactly the right time.', affirmations: ['My timing is divinely perfect', 'Every experience I have had prepared me for now', 'It is never too late for me'], anchor: { ic: '⏳', text: 'Write: "People who achieved [your desire] at my age:" and research 3 examples. Evidence dismantles timing beliefs faster than anything.' } },
  { patterns: [/\bfailure\b/i, /\bnever.*succeed\b/i, /\balways.*fail\b/i], identity: "I am successful and I learn and grow from every experience.", affirmations: ['Every "failure" taught me exactly what I needed to know', "My success is inevitable because I don't quit", 'I am building something extraordinary, one step at a time'], anchor: { ic: '🏆', text: 'Keep a "wins list" on your phone — add one win every single day. After 30 days, the evidence of your success is undeniable.' } },
];

const FLIP_DEFAULT = { identity: 'I release this belief and choose a new story. I am free to think differently.', affirmations: ['I am not my thoughts — I choose which ones I keep', 'My beliefs are changeable and I am changing them now', 'I give myself full permission to believe something better'], anchor: { ic: '✍️', text: 'Write your new identity statement every morning for 7 days. Repetition is how beliefs are installed — not willpower.' } };

function matchFlip(belief) {
  if (!belief) return FLIP_DEFAULT;
  const b = belief.toLowerCase();
  const match = FLIP_LIBRARY.find((f) => f.patterns.some((p) => p.test(b)));
  if (match) return match;

  if (/money|wealth|rich|afford|financial|income|earn/i.test(b)) {
    return { identity: 'I am financially abundant and money flows to me with ease.', affirmations: ['I am a powerful money magnet', 'Abundance is my natural state', 'Money loves to be with me'], anchor: { ic: '💰', text: 'Handle money with gratitude daily. Say "thank you" when spending AND receiving.' } };
  }
  if (/love|relationship|partner|alone|lonely|single/i.test(b)) {
    return { identity: 'I am worthy of deep, fulfilling love and I attract it naturally.', affirmations: ['Love is always available to me', 'I deserve and receive loving relationships', 'I am magnetic to the love I want'], anchor: { ic: '💗', text: 'Do one loving thing for yourself each morning. Self-love opens the channel for all love.' } };
  }
  if (/health|body|weight|fit|sick|pain|tired/i.test(b)) {
    return { identity: 'My body is capable, resilient and healing every single day.', affirmations: ['My body is on my side and working for me', 'I grow healthier with every choice I make', 'I love and respect my body'], anchor: { ic: '🌿', text: 'Put your hands on the part of your body you judge most. Breathe warmth into it. Say "I\'m sorry and I love you."' } };
  }
  if (/career|job|success|work|business/i.test(b)) {
    return { identity: 'I am talented, valued, and fully capable of achieving my career desires.', affirmations: ['My work has real value and people recognise it', 'I am building the career of my dreams', 'Opportunities are constantly finding me'], anchor: { ic: '🚀', text: 'Write your professional identity each morning: "I am a _____ who _____." Make it true AND aspirational.' } };
  }
  return { identity: 'I choose to release this story and step into a new, empowering identity.', affirmations: ['I am not defined by my past beliefs', 'I have the power to choose what I believe', 'My identity is expansive and always growing'], anchor: { ic: '🔁', text: "Write this new identity on a sticky note. Place it where you'll see it first thing every morning." } };
}

export default function IdentityFlipTool() {
  const [belief, setBelief] = useState('');
  const [result, setResult] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const local = await AsyncStorage.getItem(SAVED_KEY);
        if (local) setSaved(JSON.parse(local));
      } catch (e) {}
      try {
        const remote = await getFunToolData('fun_identity_flip');
        if (Array.isArray(remote)) setSaved(remote);
      } catch (e) {}
    })();
  }, []);

  const persist = useCallback(async (next) => {
    try { await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch (e) {}
    try { await saveFunToolData('fun_identity_flip', next); } catch (e) {}
  }, []);

  const handleFlip = () => {
    if (!belief.trim()) { Alert.alert('Write your belief first ✨'); return; }
    const r = matchFlip(belief.trim());
    setResult({ ...r, _original: belief.trim() });
    setInstalled(false);
  };

  const handleInstall = () => {
    if (!result) return;
    const next = [...saved, { old: result._original || '', new: result.identity }];
    setSaved(next);
    persist(next);
    setInstalled(true);
    Alert.alert('Identity installed. Rewiring begins now. 🌱');
  };

  const handleClearSaved = () => {
    Alert.alert('Clear all installed identities?', null, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => { setSaved([]); persist([]); } },
    ]);
  };

  return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <Text style={styles.title}>Identity <Text style={styles.titleAccent}>Flip</Text></Text>
        <Text style={styles.subtitle}>Write a limiting belief — receive a new identity to install.</Text>

        <View style={styles.inputBordered}>
          <TextInput
            style={styles.input}
            multiline
            placeholder="e.g. I'm not good enough, I'm unlucky with money, I'm not lovable, I always fail..."
            placeholderTextColor="rgba(46,37,48,0.4)"
            value={belief}
            onChangeText={setBelief}
          />
        </View>

        <TouchableOpacity style={styles.flipBtn} onPress={handleFlip}>
          <Text style={styles.flipBtnText}>🔁 Flip This Belief</Text>
        </TouchableOpacity>

        {result && (
          <>
            <Text style={styles.flipArrow}>🔁</Text>
            <GlassCard style={{ marginBottom: 16, borderColor: 'rgba(90,171,124,0.3)' }}>
              <Text style={styles.resultLbl}>✦ Your New Identity</Text>
              <Text style={styles.identityText}>{result.identity}</Text>

              <Text style={styles.affHd}>Anchoring Affirmations</Text>
              {result.affirmations.map((a, i) => (
                <Text key={i} style={styles.affLine}>{a}</Text>
              ))}

              <Text style={styles.anchorHd}>🪬 Physical Installation Anchor</Text>
              <View style={styles.anchorRow}>
                <Text style={styles.anchorIc}>{result.anchor.ic}</Text>
                <Text style={styles.anchorText}>{result.anchor.text}</Text>
              </View>

              {!installed ? (
                <TouchableOpacity style={styles.installBtn} onPress={handleInstall}>
                  <Text style={styles.installBtnText}>✦ I'm installing this identity</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.installedText}>Identity saved. You're rewriting your story. 🌱</Text>
              )}
            </GlassCard>
          </>
        )}

        {saved.length > 0 && (
          <>
            <View style={styles.savedHeaderRow}>
              <Text style={styles.savedHd}>Installed Identities</Text>
              <TouchableOpacity onPress={handleClearSaved}><Text style={styles.savedClear}>Clear</Text></TouchableOpacity>
            </View>
            {saved.slice().reverse().slice(0, 6).map((s, i) => (
              <View key={i} style={styles.savedItem}>
                <Text style={styles.savedOld}>{s.old}</Text>
                <Text style={styles.savedNew}>{s.new}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, color: '#2e2530', fontWeight: '600' },
  titleAccent: { fontStyle: 'italic', color: '#9a5fa8', fontWeight: '400' },
  subtitle: { fontSize: 13, color: '#6b5c66', marginTop: 4, marginBottom: 18, fontWeight: '500' },

  inputBordered: { borderWidth: 1.5, borderColor: 'rgba(220,100,100,0.3)', borderRadius: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)', marginBottom: 14 },
  input: { fontSize: 14, color: '#2e2530', minHeight: 70 },

  flipBtn: { backgroundColor: '#6a0dad', borderRadius: 50, paddingVertical: 15, alignItems: 'center', marginBottom: 16, shadowColor: '#6a0dad', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
  flipBtnText: { color: '#fff', fontSize: 14.5, fontWeight: '700', letterSpacing: 0.3 },

  flipArrow: { fontSize: 24, textAlign: 'center', marginBottom: 8 },
  resultLbl: { fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase', color: '#3d8a5c', fontWeight: '700', marginBottom: 10 },
  identityText: { fontSize: 19, fontWeight: '500', color: '#2e2530', lineHeight: 27, marginBottom: 16, padding: 12, backgroundColor: 'rgba(90,171,124,0.08)', borderRadius: 10, borderLeftWidth: 3, borderLeftColor: '#5aab7c' },

  affHd: { fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', color: '#9a5fa8', fontWeight: '700', marginBottom: 8 },
  affLine: { fontSize: 13.5, fontStyle: 'italic', color: '#6b5c66', padding: 9, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#c9a8c9', backgroundColor: 'rgba(201,168,201,0.07)', borderRadius: 6, marginBottom: 6, lineHeight: 19 },

  anchorHd: { fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', color: '#7840a8', fontWeight: '700', marginBottom: 8, marginTop: 4 },
  anchorRow: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(120,64,168,0.07)', borderWidth: 1, borderColor: 'rgba(120,64,168,0.12)', borderRadius: 10, padding: 12, marginBottom: 14 },
  anchorIc: { fontSize: 17 },
  anchorText: { flex: 1, fontSize: 13, color: '#6b5c66', lineHeight: 19 },

  installBtn: { backgroundColor: '#c9a8c9', borderRadius: 50, paddingVertical: 12, alignItems: 'center' },
  installBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  installedText: { textAlign: 'center', fontSize: 14, fontStyle: 'italic', color: '#3d8a5c', padding: 8 },

  savedHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  savedHd: { fontSize: 15, color: '#2e2530', fontWeight: '600' },
  savedClear: { fontSize: 12, color: '#6b5c66' },
  savedItem: { backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(154,95,168,0.15)', borderRadius: 10, padding: 11, marginBottom: 6 },
  savedOld: { fontSize: 11.5, color: 'rgba(200,80,80,0.65)', textDecorationLine: 'line-through', marginBottom: 3 },
  savedNew: { fontSize: 14, color: '#2e2530' },
});
