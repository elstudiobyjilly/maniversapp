import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Share } from 'react-native';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import Dropdown from '../../components/Dropdown';
import Button from '../../components/Button';
import ExpandableTextArea from '../../components/ExpandableTextArea';
import { colors, fonts, radii } from '../../constants/theme';
import { addGratitude, getGratitudeList, deleteGratitude } from '../../services/api';

// Ported exactly from the website's explore.js.
const MOOD_OPTIONS = [
  { value: '✨', label: '✨ Grateful' },
  { value: '🌸', label: '🌸 Peaceful' },
  { value: '💫', label: '💫 Abundant' },
  { value: '🌟', label: '🌟 Joyful' },
  { value: '🙏', label: '🙏 Blessed' },
];
// Wider set used only for parsing — older entries may carry moods that
// aren't in the compose dropdown above (matches the site's own asymmetry).
const MOOD_EMOJIS = ['🙏', '💕', '✨', '🌿', '💰', '🌸', '😊', '🌟', '💫', '🎉'];

function parseEntry(item) {
  const content = item.content || '';
  for (const m of MOOD_EMOJIS) {
    if (content.startsWith(m + ' ')) return { mood: m, text: content.slice(m.length + 1) };
  }
  return { mood: '🙏', text: content };
}

function startOfWeekMonday(d) {
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const mon = new Date(d);
  mon.setDate(d.getDate() - diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}
function fmtShort(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }

export default function Gratitude() {
  const [entry, setEntry] = useState('');
  const [mood, setMood] = useState('✨');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'today' | 'week'
  const [expandedWeeks, setExpandedWeeks] = useState(new Set());
  const [expandedDays, setExpandedDays] = useState(new Set());

  const load = async () => {
    try { setList(await getGratitudeList()); } catch (e) { setError(e.message || 'Could not load entries'); }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleAdd = async () => {
    if (!entry.trim()) { setError('Write what you are grateful for.'); return; }
    setError(''); setSaving(true);
    try {
      const row = await addGratitude(`${mood} ${entry.trim()}`);
      setList((prev) => [row, ...prev]);
      setEntry('');
    } catch (e) {
      setError(e.message || 'Could not save entry');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await deleteGratitude(id); } catch (_) {}
    setList((prev) => prev.filter((e) => e.id !== id));
  };

  const now = new Date();

  const enriched = useMemo(() => list.map((item) => {
    const { mood: m, text } = parseEntry(item);
    return { ...item, mood: m, text, date: item.created_at || new Date().toISOString() };
  }), [list]);

  const total = enriched.length;
  const today = enriched.filter((e) => new Date(e.date).toDateString() === now.toDateString()).length;
  const streak = useMemo(() => {
    let s = 0;
    let d = new Date(now);
    while (enriched.some((e) => new Date(e.date).toDateString() === d.toDateString())) {
      s++;
      d = new Date(d); d.setDate(d.getDate() - 1);
    }
    return s;
  }, [enriched]);

  const filteredEntries = useMemo(() => {
    if (filter === 'today') return enriched.filter((e) => new Date(e.date).toDateString() === now.toDateString());
    if (filter === 'week') return enriched.filter((e) => new Date(e.date) >= new Date(now - 7 * 86400000));
    return enriched;
  }, [enriched, filter]);

  const weeks = useMemo(() => {
    const dayGroups = {};
    filteredEntries.forEach((e) => {
      const dk = new Date(e.date).toDateString();
      if (!dayGroups[dk]) dayGroups[dk] = [];
      dayGroups[dk].push(e);
    });
    const weekGroups = {};
    Object.keys(dayGroups).sort((a, b) => new Date(b) - new Date(a)).forEach((dk) => {
      const wk = startOfWeekMonday(new Date(dk)).toISOString().slice(0, 10);
      if (!weekGroups[wk]) weekGroups[wk] = [];
      weekGroups[wk].push(dk);
    });
    const thisWeekKey = startOfWeekMonday(now).toISOString().slice(0, 10);
    return Object.keys(weekGroups).sort((a, b) => new Date(b) - new Date(a)).map((wk) => {
      const days = weekGroups[wk].sort((a, b) => new Date(b) - new Date(a));
      const mon = new Date(wk);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      const weekTotal = days.reduce((s, dk) => s + dayGroups[dk].length, 0);
      return {
        key: wk,
        label: wk === thisWeekKey ? 'This Week ✨' : `${fmtShort(mon)} – ${fmtShort(sun)}`,
        total: weekTotal,
        days: days.map((dk) => {
          const dateObj = new Date(dk);
          const isToday = dk === now.toDateString();
          return {
            key: dk,
            label: isToday ? 'Today ✨' : dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
            entries: dayGroups[dk],
          };
        }),
      };
    });
  }, [filteredEntries]);

  const toggleWeek = (key) => setExpandedWeeks((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const toggleDay = (key) => setExpandedDays((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const shareText = async (text) => { try { await Share.share({ message: text }); } catch (_) {} };
  const handleShareToday = () => {
    const todays = enriched.filter((e) => new Date(e.date).toDateString() === now.toDateString());
    if (!todays.length) { shareText("I'm grateful today ✨"); return; }
    shareText(todays.map((e) => `${e.mood} ${e.text}`).join('\n'));
  };
  const handleShareAll = () => {
    if (!enriched.length) { shareText('My gratitude practice ✨'); return; }
    shareText(enriched.map((e) => `${e.mood} ${e.text}`).join('\n'));
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ScreenHeader lead="Gratitude" accent="Log" subtitle="What you appreciate, appreciates. Write daily. 🙏" />

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: 'rgba(201,168,201,0.12)' }]}>
            <Text style={styles.statNum}>{streak}</Text>
            <Text style={styles.statLabel}>Streak 🔥</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: 'rgba(110,207,160,0.12)' }]}>
            <Text style={styles.statNum}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{today}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
        </View>

        <GlassCard style={styles.mb16}>
          <Text style={styles.label}>I AM GRATEFUL FOR...</Text>
          <ExpandableTextArea
            value={entry}
            onChangeText={setEntry}
            placeholder="e.g. I am grateful for the warmth of sunlight, my health, the love in my life..."
            modalTitle="Gratitude"
            minHeight={160}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.btnRow}>
            <Dropdown value={mood} options={MOOD_OPTIONS} onSelect={setMood} />
            <Button title="+ Add 🙏" size="sm" onPress={handleAdd} loading={saving} />
            <Button title="🔗 Share Today" size="sm" variant="ghost" onPress={handleShareToday} />
            <Button title="🔗 Share All" size="sm" variant="ghost" onPress={handleShareAll} />
          </View>
        </GlassCard>

        <View style={styles.entriesHeadRow}>
          <Text style={styles.sectionHeading}>Your Entries</Text>
          <View style={styles.filterRow}>
            {[{ v: 'all', l: 'All' }, { v: 'today', l: 'Today' }, { v: 'week', l: 'Week' }].map((f) => (
              <TouchableOpacity key={f.v} style={[styles.filterPill, filter === f.v && styles.filterPillActive]} onPress={() => setFilter(f.v)}>
                <Text style={[styles.filterPillText, filter === f.v && styles.filterPillTextActive]}>{f.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.purpleMid} style={{ marginTop: 20 }} />
        ) : weeks.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🙏</Text>
            <Text style={styles.emptyTitle}>Start your gratitude practice above ✨</Text>
          </GlassCard>
        ) : (
          weeks.map((week) => {
            const weekOpen = expandedWeeks.has(week.key);
            return (
              <View key={week.key} style={styles.weekWrap}>
                <TouchableOpacity style={styles.weekHeader} onPress={() => toggleWeek(week.key)}>
                  <Text style={styles.weekLabel}>{weekOpen ? '▾' : '▸'} {week.label}</Text>
                  <Text style={styles.weekCount}>{week.total} entr{week.total === 1 ? 'y' : 'ies'}</Text>
                </TouchableOpacity>
                {weekOpen && week.days.map((day) => {
                  const dayOpen = expandedDays.has(day.key);
                  return (
                    <View key={day.key} style={styles.dayWrap}>
                      <TouchableOpacity style={styles.dayHeader} onPress={() => toggleDay(day.key)}>
                        <Text style={styles.dayLabel}>{dayOpen ? '▾' : '▸'} {day.label}</Text>
                        <Text style={styles.dayCount}>{day.entries.length} entr{day.entries.length === 1 ? 'y' : 'ies'}</Text>
                      </TouchableOpacity>
                      {dayOpen && day.entries.map((e) => (
                        <View key={e.id} style={styles.entryRow}>
                          <Text style={styles.entryMood}>{e.mood}</Text>
                          <Text style={styles.entryText}>{e.text}</Text>
                          <TouchableOpacity style={styles.entryIconBtn} onPress={() => shareText(`${e.mood} ${e.text}`)}><Text style={styles.entryIcon}>🔗</Text></TouchableOpacity>
                          <TouchableOpacity style={[styles.entryIconBtn, styles.entryIconBtnDanger]} onPress={() => handleDelete(e.id)}><Text style={styles.entryIcon}>🗑️</Text></TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  mb16: { marginBottom: 16 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  inputBox: { borderWidth: 1, borderColor: 'rgba(154,95,168,0.22)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  input: { fontFamily: fonts.body, fontSize: 14.5, color: colors.ink },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginTop: 8, textAlign: 'center' },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, alignItems: 'center' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: radii.md, paddingVertical: 14, alignItems: 'center' },
  statNum: { fontFamily: fonts.display, fontSize: 24, color: colors.purpleDark, fontWeight: '300' },
  statLabel: { fontFamily: fonts.body, fontSize: 10.5, color: colors.mist, marginTop: 2, fontWeight: '500' },

  entriesHeadRow: { marginBottom: 10 },
  sectionHeading: { fontFamily: fonts.displayMedium, fontSize: 17, color: colors.ink, fontWeight: '400', marginBottom: 8 },
  filterRow: { flexDirection: 'row', gap: 6 },
  filterPill: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: radii.pill, paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)' },
  filterPillActive: { backgroundColor: '#c9a8c9', borderColor: '#c9a8c9' },
  filterPillText: { color: '#2e2530', fontSize: 12, fontWeight: '500' },
  filterPillTextActive: { color: '#fff', fontWeight: '700' },

  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '500', color: '#2e2530' },

  weekWrap: { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.md, marginBottom: 10, overflow: 'hidden' },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, backgroundColor: 'rgba(245,240,252,0.6)' },
  weekLabel: { fontFamily: fonts.displayMedium, fontSize: 14, color: colors.ink },
  weekCount: { fontFamily: fonts.body, fontSize: 10.5, color: colors.purpleDark, backgroundColor: 'rgba(201,168,201,0.15)', borderRadius: radii.pill, paddingVertical: 3, paddingHorizontal: 9 },

  dayWrap: { marginHorizontal: 8, marginTop: 6, marginBottom: 4, borderWidth: 1, borderColor: 'rgba(201,168,201,0.18)', borderRadius: radii.sm, overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12 },
  dayLabel: { fontFamily: fonts.displayItalic, fontSize: 13, color: colors.ink, fontStyle: 'italic' },
  dayCount: { fontFamily: fonts.body, fontSize: 10, color: colors.purpleDark, backgroundColor: 'rgba(201,168,201,0.15)', borderRadius: radii.pill, paddingVertical: 2, paddingHorizontal: 8 },

  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: 'rgba(201,168,201,0.12)' },
  entryMood: { fontSize: 14 },
  entryText: { flex: 1, fontFamily: fonts.displayItalic, fontSize: 13.5, color: colors.ink, fontStyle: 'italic', lineHeight: 20 },
  entryIconBtn: {
    width: 27, height: 27, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  entryIconBtnDanger: { backgroundColor: 'rgba(230,140,150,0.15)', borderColor: 'rgba(230,140,150,0.3)' },
  entryIcon: { fontSize: 12 },
});
