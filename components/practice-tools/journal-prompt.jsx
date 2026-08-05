import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, fonts, radii } from '../../constants/theme';
import { JOURNAL_CATEGORIES } from '../../constants/practiceContent';
import ExpandableTextArea from '../ExpandableTextArea';
import Button from '../Button';
import { getJournal, addJournalEntry, deleteJournalEntry } from '../../services/api';

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

const CAT_KEYS = Object.keys(JOURNAL_CATEGORIES);

export default function JournalPrompt() {
  const [catKey, setCatKey] = useState('general');
  const [seed, setSeed] = useState(0);

  // The prompt used to be the whole tool — it told you to go write somewhere
  // else, even though /practice/journal has existed all along. Entries are
  // now written and stored here.
  const [text, setText] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const cat = JOURNAL_CATEGORIES[catKey];
  const idx = (dayOfYear(new Date()) + seed) % cat.prompts.length;
  const prompt = cat.prompts[idx];

  const load = async () => {
    try {
      const list = await getJournal();
      setEntries(Array.isArray(list) ? list : []);
    } catch (_) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!text.trim()) { setError('Write something first ✨'); return; }
    setError(''); setSaving(true);
    try {
      const row = await addJournalEntry(prompt, text.trim());
      setEntries((prev) => [row, ...prev]);
      setText('');
      setShowHistory(true);
    } catch (e) {
      setError(e.message || 'Could not save your entry');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await deleteJournalEntry(id); } catch (_) {}
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <View>
      <View style={styles.chipRow}>
        {CAT_KEYS.map((k) => {
          const c = JOURNAL_CATEGORIES[k];
          const active = k === catKey;
          return (
            <TouchableOpacity key={k} style={[styles.chip, active && styles.chipActive]} onPress={() => { setCatKey(k); setSeed(0); }}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.ic} {c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.promptCard}>
        <Text style={styles.promptLabel}>Today's Journal Prompt — {cat.label}</Text>
        <Text style={styles.promptText}>"{prompt}"</Text>
        <TouchableOpacity style={styles.newPromptBtn} onPress={() => setSeed((s) => s + 1)}>
          <Text style={styles.newPromptBtnText}>🎲 New Prompt</Text>
        </TouchableOpacity>
      </View>

      <ExpandableTextArea
        value={text}
        onChangeText={setText}
        placeholder="Write your reflection here..."
        modalTitle="Journal Entry"
        minHeight={120}
        style={{ marginTop: 12 }}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Button title="💾 Save Entry" size="sm" onPress={handleSave} loading={saving} style={{ marginTop: 10, alignSelf: 'flex-start' }} />

      <TouchableOpacity style={styles.historyHead} onPress={() => setShowHistory((v) => !v)}>
        <Text style={styles.historyHeadText}>
          📖 Past Entries{entries.length ? ` (${entries.length})` : ''}
        </Text>
        <Text style={styles.historyChevron}>{showHistory ? '▾' : '▸'}</Text>
      </TouchableOpacity>

      {showHistory && (
        loading ? (
          <ActivityIndicator color={colors.purpleMid} style={{ marginTop: 10 }} />
        ) : entries.length === 0 ? (
          <Text style={styles.emptyText}>No entries yet — your first reflection will appear here 🌸</Text>
        ) : (
          entries.map((e) => (
            <View key={e.id} style={styles.entryCard}>
              <View style={styles.entryHead}>
                <Text style={styles.entryDate}>
                  {e.created_at
                    ? new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : ''}
                </Text>
                <TouchableOpacity onPress={() => handleDelete(e.id)} hitSlop={8}>
                  <Text style={styles.entryDelete}>✕</Text>
                </TouchableOpacity>
              </View>
              {e.prompt ? <Text style={styles.entryPrompt}>"{e.prompt}"</Text> : null}
              <Text style={styles.entryContent}>{e.content}</Text>
            </View>
          ))
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', borderRadius: radii.pill, paddingVertical: 6, paddingHorizontal: 11 },
  chipActive: { backgroundColor: colors.purpleMid, borderColor: colors.purpleMid },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.purpleDark },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  promptCard: { backgroundColor: 'rgba(201,168,201,0.1)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', borderRadius: radii.md, padding: 18 },
  promptLabel: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  promptText: { fontFamily: fonts.displayItalic, fontSize: 17, color: colors.ink, fontStyle: 'italic', lineHeight: 26, marginBottom: 14 },
  newPromptBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(201,168,201,0.2)', borderWidth: 1, borderColor: 'rgba(154,95,168,0.25)', borderRadius: radii.pill, paddingVertical: 6, paddingHorizontal: 13 },
  newPromptBtnText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.purpleDark, fontWeight: '600' },

  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 12.5, marginTop: 8 },

  historyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 4 },
  historyHeadText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.purpleDark, fontWeight: '700' },
  historyChevron: { fontSize: 12, color: colors.mist },
  emptyText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.mist, marginTop: 8, lineHeight: 18 },

  entryCard: { backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.sm, padding: 12, marginTop: 8 },
  entryHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  entryDate: { fontFamily: fonts.body, fontSize: 11, color: colors.mist2 },
  entryDelete: { fontSize: 12, color: colors.mist2 },
  entryPrompt: { fontFamily: fonts.displayItalic, fontSize: 12, color: colors.purpleDark, fontStyle: 'italic', marginBottom: 6 },
  entryContent: { fontFamily: fonts.body, fontSize: 13.5, color: colors.ink, lineHeight: 20 },
});
