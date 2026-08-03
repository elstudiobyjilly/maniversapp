import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlassCard from '../GlassCard';
import { getFunToolData, saveFunToolData } from '../../services/api';

const SAVED_KEY = 'mv_spell_saved_local';

const SPELL_TRANSFORMS = [
  { test: /\b(want|wish|hope|need|trying|working|would like)\b/i, fn: (d) => d.replace(/\b(want|wish|hope|need|trying|working|would like)\b/gi, 'have') },
  { test: /\bgoing to\b/i, fn: (d) => d.replace(/\bgoing to\b/gi, '') },
  { test: /\bone day\b/i, fn: (d) => d.replace(/\bone day\b/gi, 'now') },
  { test: /\bsomeday\b/i, fn: (d) => d.replace(/\bsomeday\b/gi, 'today') },
  { test: /\bwill\b/i, fn: (d) => d.replace(/\bwill\b/gi, '') },
];

const SPELL_OPENERS = [
  'By the power of this present moment, ',
  'In the name of my highest self, ',
  'I declare with certainty and love: ',
  'It is written in the stars that ',
  'The universe conspires in my favour: ',
  'I speak this into being: ',
];
const SPELL_CLOSERS = [
  ' And so it is. ✦',
  ' This is my truth. So it is. ✦',
  ' It is done. The universe has heard. ✦',
  ' I receive this fully. So it is. ✦',
  ' As above, so below. As within, so without. ✦',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function castSpell(raw) {
  if (!raw || !raw.trim()) return null;
  let d = raw.trim();

  d = d.replace(/^(I\s+)?(want\s+to|wish\s+to|hope\s+to|want\s+|wish\s+|need\s+to|need\s+|am\s+trying\s+to|would\s+like\s+to|would\s+love\s+to)\s*/i, '');

  const startsWithBeingVerb = /^(being|becoming|getting|having|living|experiencing|feeling)/i.test(d);
  const startsWithHaveVerb = /^(earning|making|attracting|manifesting|receiving|owning|building|running|creating)/i.test(d);

  let core = d.charAt(0).toUpperCase() + d.slice(1);
  core = core.replace(/\.$/, '');

  let spell;
  if (startsWithBeingVerb || /^(beautiful|healthy|rich|wealthy|successful|loved|free|happy|confident)/i.test(d)) {
    spell = 'I am ' + core.charAt(0).toLowerCase() + core.slice(1);
  } else if (startsWithHaveVerb || /^(a |an |my |the )/i.test(d)) {
    spell = 'I have ' + core.charAt(0).toLowerCase() + core.slice(1);
  } else {
    spell = core;
  }

  SPELL_TRANSFORMS.forEach((t) => { if (t.test.test(spell)) spell = t.fn(spell); });
  spell = spell.replace(/\s+/g, ' ').trim();

  const opener = pick(SPELL_OPENERS);
  const closer = pick(SPELL_CLOSERS);
  return { opener, core: spell, closer };
}

export default function SpellItTool() {
  const [desire, setDesire] = useState('');
  const [spell, setSpell] = useState(null);
  const [reads, setReads] = useState(0);
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const local = await AsyncStorage.getItem(SAVED_KEY);
        if (local) setSaved(JSON.parse(local));
      } catch (e) {}
      try {
        const remote = await getFunToolData('fun_spell');
        if (Array.isArray(remote)) setSaved(remote);
      } catch (e) {}
    })();
  }, []);

  const persist = useCallback(async (next) => {
    try { await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch (e) {}
    try { await saveFunToolData('fun_spell', next); } catch (e) {}
  }, []);

  const handleCast = () => {
    if (!desire.trim()) { Alert.alert('Write your desire first ✨'); return; }
    const s = castSpell(desire);
    setSpell(s);
    setReads(0);
  };

  const handleRead = () => {
    setReads((r) => {
      const next = Math.min(r + 1, 3);
      if (next >= 3 && r < 3 && spell) {
        const nextSaved = [...saved, { desire: desire.trim(), ...spell }].slice(-20);
        setSaved(nextSaved);
        persist(nextSaved);
      }
      return next;
    });
  };

  const handleClearSaved = () => {
    Alert.alert('Clear your spell book?', null, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => { setSaved([]); persist([]); } },
    ]);
  };

  return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <Text style={styles.title}>Spell <Text style={styles.titleAccent}>It</Text></Text>
        <Text style={styles.subtitle}>Write your desire as it is in your mind — let it transform into a charged spell.</Text>

        <View style={styles.inputBordered}>
          <TextInput
            style={styles.input}
            multiline
            placeholder="e.g. I want a beautiful home, I hope to find love, I wish I had more money..."
            placeholderTextColor="rgba(46,37,48,0.4)"
            value={desire}
            onChangeText={setDesire}
          />
        </View>

        <TouchableOpacity style={styles.castBtn} onPress={handleCast}>
          <Text style={styles.castBtnText}>🪄 Cast the Spell</Text>
        </TouchableOpacity>

        {spell && (
          <>
            <View style={styles.resultWrap}>
              <Text style={styles.resultLabel}>✦ Your Manifestation Spell ✦</Text>
              <Text style={styles.resultText}>
                {spell.opener}
                <Text style={styles.resultEm}>{spell.core}</Text>
                {spell.closer}
              </Text>
              <Text style={styles.readInstruction}>Read aloud 3 times — feel each word</Text>
              <View style={styles.dotsRow}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[styles.readDot, i < reads && styles.readDotDone]} />
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.readBtn, reads >= 3 && styles.readBtnDone]}
              onPress={handleRead}
              disabled={reads >= 3}
            >
              <Text style={[styles.readBtnText, reads >= 3 && styles.readBtnTextDone]}>
                {reads >= 3 ? '✦ Spell cast. It is done. ✦' : `✓ I read it aloud (${reads + 1}/3)`}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {saved.length > 0 && (
          <>
            <View style={styles.savedHeaderRow}>
              <Text style={styles.savedHd}>Your Spell Book</Text>
              <TouchableOpacity onPress={handleClearSaved}><Text style={styles.savedClear}>Clear</Text></TouchableOpacity>
            </View>
            {saved.slice().reverse().slice(0, 6).map((s, i) => (
              <View key={i} style={styles.savedItem}>
                <Text style={styles.savedText}>{s.opener}{s.core}{s.closer}</Text>
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

  inputBordered: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.35)', borderRadius: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.4)', marginBottom: 14 },
  input: { fontSize: 14, color: '#2e2530', minHeight: 80 },

  castBtn: {
    borderRadius: 50, paddingVertical: 15, alignItems: 'center', marginBottom: 16,
    backgroundColor: '#6a0dad',
    shadowColor: '#6a0dad', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
  },
  castBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  resultWrap: { borderRadius: 20, padding: 20, marginBottom: 12, backgroundColor: '#1a0a2e' },
  resultLabel: { fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 12 },
  resultText: { fontSize: 18, fontWeight: '300', fontStyle: 'italic', lineHeight: 30, color: '#fff' },
  resultEm: { color: '#f0d090', fontStyle: 'normal', fontWeight: '500' },
  readInstruction: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 16, textAlign: 'center', letterSpacing: 0.5 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
  readDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  readDotDone: { backgroundColor: '#f0d090', borderColor: '#f0d090' },

  readBtn: { borderRadius: 50, paddingVertical: 13, alignItems: 'center', backgroundColor: 'rgba(240,208,96,0.15)', borderWidth: 1.5, borderColor: 'rgba(240,208,96,0.4)' },
  readBtnText: { fontSize: 13, fontWeight: '600', color: '#c9a020' },
  readBtnDone: { backgroundColor: 'rgba(90,171,124,0.15)', borderColor: 'rgba(90,171,124,0.4)' },
  readBtnTextDone: { color: '#3d8a5c' },

  savedHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 20 },
  savedHd: { fontSize: 15, color: '#2e2530', fontWeight: '600' },
  savedClear: { fontSize: 12, color: '#6b5c66' },
  savedItem: { backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(154,95,168,0.15)', borderRadius: 10, padding: 11, marginBottom: 6 },
  savedText: { fontSize: 13, fontStyle: 'italic', color: '#2e2530', lineHeight: 19 },
});