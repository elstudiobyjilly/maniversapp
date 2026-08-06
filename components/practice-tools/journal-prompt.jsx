import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, radii } from '../../constants/theme';
import { JOURNAL_CATEGORIES } from '../../constants/practiceContent';

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

const CAT_KEYS = Object.keys(JOURNAL_CATEGORIES);

export default function JournalPrompt() {
  const [catKey, setCatKey] = useState('general');
  const [seed, setSeed] = useState(0);

  const cat = JOURNAL_CATEGORIES[catKey];
  const idx = (dayOfYear(new Date()) + seed) % cat.prompts.length;
  const prompt = cat.prompts[idx];

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
        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.newPromptBtn} onPress={() => setSeed((s) => s + 1)}>
            <Text style={styles.newPromptBtnText}>🎲 New Prompt</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>📖 Reflect in your own journal or planner</Text>
        </View>
      </View>
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
  footerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  newPromptBtn: { backgroundColor: 'rgba(201,168,201,0.2)', borderWidth: 1, borderColor: 'rgba(154,95,168,0.25)', borderRadius: radii.pill, paddingVertical: 6, paddingHorizontal: 13 },
  newPromptBtnText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.purpleDark, fontWeight: '600' },
  hint: { fontFamily: fonts.body, fontSize: 11.5, color: colors.mist, fontStyle: 'italic' },
});
