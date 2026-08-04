import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { getIdentity, saveIdentity } from '../../services/api';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { colors, fonts, radii } from '../../constants/theme';

const CATEGORIES = ['money', 'love', 'health', 'career', 'general'];

export default function Identity() {
  const [areas, setAreas] = useState({ money: [], love: [], health: [], career: [], general: [] });
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await getIdentity();
      setAreas({ money: [], love: [], health: [], career: [], general: [], ...data.areas });
    } catch (e) {
      setError(e.message || 'Could not load');
    }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const addStatement = (category) => {
    const text = (drafts[category] || '').trim();
    if (!text) return;
    setAreas((prev) => ({ ...prev, [category]: [...(prev[category] || []), text] }));
    setDrafts((prev) => ({ ...prev, [category]: '' }));
  };

  const removeStatement = (category, index) => {
    setAreas((prev) => ({ ...prev, [category]: prev[category].filter((_, i) => i !== index) }));
  };

  const handleSaveAll = async () => {
    setError(''); setSaving(true);
    try {
      await saveIdentity({ areas });
    } catch (e) {
      setError(e.message || 'Could not save');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.purpleMid} />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: 40 }}>
        <ScreenHeader lead="My" accent="Identity" subtitle={'"I am..." statements for each area of your life ✨'} />

        {CATEGORIES.map((cat) => (
          <GlassCard key={cat} style={styles.cardMargin}>
            <Text style={styles.catTitle}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
            {(areas[cat] || []).map((stmt, i) => (
              <View key={i} style={styles.stmtRow}>
                <Text style={styles.stmtText}>I am {stmt}</Text>
                <TouchableOpacity onPress={() => removeStatement(cat, i)}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="I am..."
                placeholderTextColor="rgba(46,37,48,0.4)"
                value={drafts[cat] || ''}
                onChangeText={(t) => setDrafts((prev) => ({ ...prev, [cat]: t }))}
                onSubmitEditing={() => addStatement(cat)}
              />
              <TouchableOpacity onPress={() => addStatement(cat)}>
                <Text style={styles.addText}>Add</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        ))}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button title="Save All ✨" onPress={handleSaveAll} loading={saving} fullWidth style={{ marginBottom: 40 }} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardMargin: { marginBottom: 14 },
  catTitle: { fontFamily: fonts.displayMedium, fontSize: 16, fontWeight: '600', color: colors.ink, marginBottom: 10 },
  stmtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(201,168,201,0.15)' },
  stmtText: { fontFamily: fonts.displayItalic, color: colors.ink2, fontSize: 14, flex: 1, fontStyle: 'italic' },
  removeText: { color: colors.danger, fontSize: 14, paddingHorizontal: 6 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  addInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.body, fontSize: 13.5, color: colors.ink, borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)' },
  addText: { fontFamily: fonts.bodyMedium, color: colors.purpleDark, fontWeight: '600', fontSize: 13 },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginBottom: 10, textAlign: 'center' },
});
