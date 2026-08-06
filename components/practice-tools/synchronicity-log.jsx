import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, fonts, radii } from '../../constants/theme';
import { getSyncLog, addSyncLog, deleteSyncLog } from '../../services/api';
import { SYNC_TAGS } from '../../constants/practiceContent';

function startOfWeekMonday(d) {
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const mon = new Date(d);
  mon.setDate(d.getDate() - diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}
function fmtShort(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

export default function SynchronicityLog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tag, setTag] = useState(SYNC_TAGS[0]);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState(new Set());

  const load = async () => {
    try { setEntries(await getSyncLog()); } catch (_) {}
  };
  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const row = await addSyncLog(tag, text.trim());
      setEntries((prev) => [row, ...prev]);
      setText('');
    } catch (_) {} finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await deleteSyncLog(id); } catch (_) {}
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const now = new Date();
  const weeks = useMemo(() => {
    const dayGroups = {};
    entries.forEach((e) => {
      const d = new Date(e.created_at || Date.now());
      const wk = startOfWeekMonday(d).toISOString().slice(0, 10);
      if (!dayGroups[wk]) dayGroups[wk] = [];
      dayGroups[wk].push(e);
    });
    const thisWeekKey = startOfWeekMonday(now).toISOString().slice(0, 10);
    return Object.keys(dayGroups).sort((a, b) => new Date(b) - new Date(a)).map((wk) => {
      const mon = new Date(wk);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return {
        key: wk,
        label: wk === thisWeekKey ? 'This Week' : `${fmtShort(mon)} – ${fmtShort(sun)}`,
        items: dayGroups[wk].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      };
    });
  }, [entries]);

  const toggleWeek = (key) => setExpandedWeeks((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  if (loading) return <ActivityIndicator color={colors.purpleMid} style={{ marginTop: 20 }} />;

  return (
    <View>
      <Text style={styles.desc}>Log signs, numbers and synchronicities from the universe.</Text>
      <View style={styles.chipRow}>
        {SYNC_TAGS.map((t) => (
          <TouchableOpacity key={t} style={[styles.chip, tag === t && styles.chipActive]} onPress={() => setTag(t)}>
            <Text style={[styles.chipText, tag === t && styles.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Describe the sign..."
        placeholderTextColor="rgba(46,37,48,0.4)"
        value={text}
        onChangeText={setText}
      />
      <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>+ Log Sign</Text>}
      </TouchableOpacity>

      {weeks.length === 0 ? (
        <Text style={styles.emptyText}>No signs logged yet ✨</Text>
      ) : (
        weeks.map((week) => {
          const open = expandedWeeks.has(week.key);
          return (
            <View key={week.key} style={styles.weekWrap}>
              <TouchableOpacity style={styles.weekHeader} onPress={() => toggleWeek(week.key)}>
                <Text style={styles.weekLabel}>{week.label}</Text>
                <Text style={styles.weekCount}>{week.items.length} sign{week.items.length === 1 ? '' : 's'} {open ? '▾' : '▸'}</Text>
              </TouchableOpacity>
              {open && week.items.map((e) => (
                <View key={e.id} style={styles.entryRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryTag}>{e.tag}</Text>
                    <Text style={styles.entryText}>{e.content}</Text>
                    <Text style={styles.entryDate}>{new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(e.id)}><Text style={styles.deleteIcon}>✕</Text></TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  desc: { fontFamily: fonts.body, fontSize: 12.5, color: colors.mist, marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', borderRadius: radii.pill, paddingVertical: 7, paddingHorizontal: 12 },
  chipActive: { backgroundColor: colors.purpleMid, borderColor: colors.purpleMid },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.ink2 },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'rgba(248,184,200,0.35)', borderRadius: radii.md, paddingVertical: 10, paddingHorizontal: 14, fontSize: 13.5, color: colors.ink, marginBottom: 10 },
  addBtn: { backgroundColor: colors.purpleMid, borderRadius: radii.pill, paddingVertical: 10, alignItems: 'center', marginBottom: 14 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.mist, textAlign: 'center', marginTop: 10 },

  weekWrap: { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(201,168,201,0.2)', borderRadius: radii.sm, marginBottom: 8, overflow: 'hidden' },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 },
  weekLabel: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.ink, fontWeight: '600' },
  weekCount: { fontFamily: fonts.body, fontSize: 10.5, color: colors.purpleDark },
  entryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: 'rgba(201,168,201,0.12)' },
  entryTag: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, marginBottom: 2 },
  entryText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  entryDate: { fontFamily: fonts.body, fontSize: 10, color: colors.mist2, marginTop: 2 },
  deleteIcon: { fontSize: 13, color: colors.mist2, padding: 4 },
});
