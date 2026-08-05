import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import TabPill from '../../components/TabPill';
import Dropdown from '../../components/Dropdown';
import Button from '../../components/Button';
import ExpandableTextArea from '../../components/ExpandableTextArea';
import { colors, fonts, radii } from '../../constants/theme';
import { getBeliefs, addBelief, updateBelief, deleteBelief } from '../../services/api';

// Ported exactly from the website's cards.js.
const BELIEF_PRESETS = {
  'Self-worth': ['I am not enough', "I don't deserve good things", "I'm not smart enough", "I'm not attractive enough", 'I always mess things up', "I'm too much for people"],
  Money: ['Money is hard to earn', 'Rich people are greedy', "I'll never be wealthy", "I don't deserve financial freedom", 'Money causes problems', 'I have to work hard just to survive'],
  Love: ["I'm not loveable", 'People always leave me', "I don't deserve real love", 'Relationships always end badly', 'Love means pain', 'I push people away'],
  Success: ['Success is for other people', 'I always fail', "I'm not talented enough", "I don't have what it takes", 'Success means losing yourself', "I'll be judged if I succeed"],
  Body: ["My body is broken", "I can't lose weight", "I'm always tired", 'My health will always be a struggle'],
  Relationships: ["I'm too old / too young", "Good things don't last", 'I have to do everything alone', 'Nobody understands me'],
};
const REFRAME_STARTERS = [
  'I am more than enough and I always have been',
  'Money flows to me easily and I deserve abundance',
  'I am deeply loveable exactly as I am',
  'I have everything I need to succeed',
  'I attract relationships that are loving and lasting',
  'My body is strong and healing every day',
  'Success is safe and natural for me',
  'I am worthy of everything I desire',
  'Every day I grow stronger and more capable',
  'I release what no longer serves me with ease',
];
const CATEGORY_NAMES = Object.keys(BELIEF_PRESETS);

export default function Beliefs() {
  const [tab, setTab] = useState('identify'); // 'identify' | 'reframe'
  const [belief, setBelief] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');

  const [reframeId, setReframeId] = useState(null);
  const [reframeText, setReframeText] = useState('');
  const [savingReframe, setSavingReframe] = useState(false);

  const load = async () => {
    try {
      const data = await getBeliefs();
      setList(data);
      if (data.length && reframeId == null) {
        setReframeId(data[0].id);
        setReframeText(data[0].reframe || '');
      }
    } catch (e) { setError(e.message || 'Could not load beliefs'); }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleAdd = async () => {
    if (!belief.trim()) { setError('Enter a belief ✨'); return; }
    setError(''); setSaving(true);
    try {
      const row = await addBelief(belief.trim());
      setList((prev) => [row, ...prev]);
      setBelief('');
    } catch (e) {
      setError(e.message || 'Could not save belief');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await deleteBelief(id); } catch (_) {}
    setList((prev) => prev.filter((b) => b.id !== id));
    if (reframeId === id) { setReframeId(null); setReframeText(''); }
  };

  const startEdit = (item) => { setEditingId(item.id); setEditDraft(item.belief); };
  const handleSaveEdit = async (id) => {
    const txt = editDraft.trim();
    if (!txt) return;
    try {
      const updated = await updateBelief(id, { belief: txt });
      setList((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
    } catch (_) {}
    setEditingId(null);
  };

  const handleSelectReframeBelief = (id) => {
    setReframeId(id);
    const b = list.find((x) => x.id === id);
    setReframeText(b?.reframe || '');
  };

  const handleSaveReframe = async () => {
    if (!reframeText.trim() || reframeId == null) { setError('Write your reframe first ✨'); return; }
    setError(''); setSavingReframe(true);
    try {
      const updated = await updateBelief(reframeId, { reframe: reframeText.trim() });
      setList((prev) => prev.map((b) => (b.id === reframeId ? { ...b, ...updated } : b)));
    } catch (e) {
      setError(e.message || 'Could not save reframe');
    } finally { setSavingReframe(false); }
  };

  const reframeBelief = list.find((b) => b.id === reframeId);
  const reframeOptions = list.map((b) => ({ value: b.id, label: b.belief }));

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ScreenHeader lead="Limiting" accent="Beliefs" subtitle="Identify them. Reframe them. Watch them dissolve. 🔓" />

        <TabPill
          style={{ marginBottom: 16 }}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'identify', label: '🔍 Identify' },
            { value: 'reframe', label: '✨ Reframe' },
          ]}
        />

        {tab === 'identify' ? (
          <>
            <GlassCard style={styles.mb16}>
              <Text style={styles.label}>ADD A LIMITING BELIEF</Text>
              <ExpandableTextArea
                value={belief}
                onChangeText={setBelief}
                placeholder="e.g. I am not enough"
                modalTitle="Limiting Belief"
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Button title="+ Add Belief" size="sm" onPress={handleAdd} loading={saving} style={{ marginTop: 10, alignSelf: 'flex-start' }} />

              <View style={[styles.chipRow, { marginTop: 14 }]}>
                {CATEGORY_NAMES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catChip, activeCategory === c && styles.catChipActive]}
                    onPress={() => setActiveCategory(activeCategory === c ? null : c)}
                  >
                    <Text style={[styles.catChipText, activeCategory === c && styles.catChipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {activeCategory && (
                <View style={[styles.chipRow, { marginTop: 8 }]}>
                  {BELIEF_PRESETS[activeCategory].map((p) => (
                    <TouchableOpacity key={p} style={styles.presetChip} onPress={() => setBelief(p)}>
                      <Text style={styles.presetChipText}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </GlassCard>

            {loading ? (
              <ActivityIndicator color={colors.purpleMid} style={{ marginTop: 20 }} />
            ) : list.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🔓</Text>
                <Text style={styles.emptyTitle}>Add your first limiting belief to begin releasing it ✨</Text>
              </GlassCard>
            ) : (
              list.map((item) => (
                <View key={item.id} style={styles.beliefRow}>
                  {editingId === item.id ? (
                    <View style={{ flex: 1 }}>
                      <TextInput style={styles.editInput} value={editDraft} onChangeText={setEditDraft} autoFocus />
                    </View>
                  ) : (
                    <Text style={styles.beliefText}>{item.belief}</Text>
                  )}
                  {item.created_at ? <Text style={styles.beliefDate}>{new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</Text> : null}
                  {editingId === item.id ? (
                    <TouchableOpacity style={styles.iconBtnSave} onPress={() => handleSaveEdit(item.id)}><Text style={styles.iconBtnText}>💾</Text></TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.iconBtn} onPress={() => startEdit(item)}><Text style={styles.iconBtnText}>✏️</Text></TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.iconBtnDanger} onPress={() => handleDelete(item.id)}><Text style={styles.iconBtnText}>🗑️</Text></TouchableOpacity>
                </View>
              ))
            )}
          </>
        ) : (
          <GlassCard>
            {list.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <Text style={styles.emptyIcon}>🔓</Text>
                <Text style={styles.emptyTitle}>Add a limiting belief first, then reframe it here ✨</Text>
              </View>
            ) : (
              <>
                <Text style={styles.label}>CHOOSE A BELIEF TO REFRAME</Text>
                <Dropdown value={reframeId} options={reframeOptions} onSelect={handleSelectReframeBelief} fullWidth />
                <Text style={styles.reframeQuote}>"{reframeBelief?.belief}"</Text>

                <Text style={[styles.label, { marginTop: 14 }]}>BUT NOW I KNOW...</Text>
                <ExpandableTextArea
                  value={reframeText}
                  onChangeText={setReframeText}
                  placeholder="Write your new truth..."
                  modalTitle="Reframe"
                />

                <View style={[styles.chipRow, { marginTop: 10 }]}>
                  {REFRAME_STARTERS.map((s) => (
                    <TouchableOpacity key={s} style={styles.presetChip} onPress={() => setReframeText(s)}>
                      <Text style={styles.presetChipText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <Button title="💾 Save Reframe" size="sm" onPress={handleSaveReframe} loading={savingReframe} style={{ marginTop: 14, alignSelf: 'flex-start' }} />
              </>
            )}
          </GlassCard>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  mb16: { marginBottom: 16 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  inputBox: { borderWidth: 1, borderColor: 'rgba(154,95,168,0.22)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)', minHeight: 80 },
  input: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginTop: 8, textAlign: 'center' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: { backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.35)', borderRadius: radii.pill, paddingVertical: 7, paddingHorizontal: 12 },
  catChipActive: { backgroundColor: '#c9a8c9', borderColor: '#c9a8c9' },
  catChipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.ink2, fontWeight: '500' },
  catChipTextActive: { color: '#fff', fontWeight: '700' },
  presetChip: { backgroundColor: 'rgba(201,168,201,0.15)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', borderRadius: radii.pill, paddingVertical: 6, paddingHorizontal: 12 },
  presetChipText: { fontFamily: fonts.body, fontSize: 11.5, color: colors.purpleDark },

  beliefRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.sm, padding: 11, marginBottom: 8 },
  beliefText: { flex: 1, fontFamily: fonts.body, fontSize: 13.5, color: colors.ink },
  editInput: { fontFamily: fonts.body, fontSize: 13.5, color: colors.ink, borderBottomWidth: 1, borderBottomColor: 'rgba(154,95,168,0.3)', paddingVertical: 2 },
  beliefDate: { fontFamily: fonts.body, fontSize: 10, color: colors.mist2 },
  iconBtn: { padding: 4 },
  iconBtnSave: { padding: 4 },
  iconBtnDanger: { padding: 4 },
  iconBtnText: { fontSize: 14 },

  reframeQuote: { fontFamily: fonts.displayItalic, fontSize: 15, color: colors.mist, fontStyle: 'italic', marginTop: 10, marginBottom: 4 },

  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '500', color: '#2e2530', marginBottom: 4, textAlign: 'center' },
});
