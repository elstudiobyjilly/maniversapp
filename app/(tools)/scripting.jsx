import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import * as Speech from 'expo-speech';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import TabPill from '../../components/TabPill';
import Button from '../../components/Button';
import ExpandableTextArea from '../../components/ExpandableTextArea';
import { colors, fonts, radii } from '../../constants/theme';
import { getScripts, addScript, updateScript, deleteScript, getScriptMyDay, saveScriptMyDay } from '../../services/api';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function labelForDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function startOfWeekMonday(d) {
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const mon = new Date(d);
  mon.setDate(d.getDate() - diff);
  return mon;
}
function weekLabel(wk) {
  const start = new Date(wk);
  const end = new Date(wk); end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

// Dream Life Script content is stored as "title\n\nbody" when a title is
// set, matching the website's encoding (so it round-trips through the
// same generic /scripting/ endpoint the site uses).
function parseDream(item) {
  const body = item.content || '';
  const lines = body.split('\n\n');
  if (lines.length > 1) return { title: lines[0].trim(), body: lines.slice(1).join('\n\n').trim() };
  return { title: '', body };
}

export default function Scripting() {
  const [tab, setTab] = useState('daily'); // 'daily' | 'dream'

  // ── Daily Script ──────────────────────────────────────────────────────
  const [dailyText, setDailyText] = useState('');
  const [dailyEntries, setDailyEntries] = useState({}); // { 'YYYY-MM-DD': content }
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [savingDaily, setSavingDaily] = useState(false);
  const [expandedDailyKey, setExpandedDailyKey] = useState(null);
  const [expandedWeeks, setExpandedWeeks] = useState(new Set());
  const autosaveTimer = useRef(null);

  const loadDaily = async () => {
    try {
      const data = await getScriptMyDay();
      const map = {};
      (Array.isArray(data) ? data : []).forEach((r) => { map[r.script_date] = r.content; });
      setDailyEntries(map);
      if (map[todayKey()]) setDailyText(map[todayKey()]);
    } catch (_) {} finally { setLoadingDaily(false); }
  };

  useEffect(() => { loadDaily(); }, []);

  const handleDailyChange = (val) => {
    setDailyText(val);
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      if (!val.trim()) return;
      const key = todayKey();
      setDailyEntries((prev) => ({ ...prev, [key]: val }));
      saveScriptMyDay(val, key).catch(() => {});
    }, 1500);
  };

  const handleSaveDaily = async () => {
    if (!dailyText.trim()) { Alert.alert('Write your script first ✨'); return; }
    setSavingDaily(true);
    const key = todayKey();
    try {
      await saveScriptMyDay(dailyText.trim(), key);
      setDailyEntries((prev) => ({ ...prev, [key]: dailyText.trim() }));
    } catch (_) {} finally { setSavingDaily(false); }
  };
  const handleClearDaily = () => setDailyText('');
  const handleEditDaily = (key) => { setDailyText(dailyEntries[key] || ''); if (key !== todayKey()) { /* editing loads content but still saves to today, matching the site's single-writer-box model */ } };
  const handleDeleteDaily = (key) => {
    // No backend delete endpoint exists for this resource (matches the
    // website, which only clears its local cache) — removes from this
    // session's view only.
    setDailyEntries((prev) => { const next = { ...prev }; delete next[key]; return next; });
  };
  const readAloud = (text) => { Speech.stop(); Speech.speak(text, { rate: 0.88 }); };

  const dailyGroups = useMemo(() => {
    const today = todayKey();
    const pastKeys = Object.keys(dailyEntries).filter((k) => k !== today).sort().reverse();
    const weeks = {};
    pastKeys.forEach((k) => {
      const wk = startOfWeekMonday(new Date(k)).toISOString().slice(0, 10);
      if (!weeks[wk]) weeks[wk] = [];
      weeks[wk].push(k);
    });
    return Object.keys(weeks).sort().reverse().map((wk) => ({ key: wk, label: weekLabel(wk), days: weeks[wk].sort().reverse() }));
  }, [dailyEntries]);

  const toggleWeek = (key) => setExpandedWeeks((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  // ── Dream Life Script ─────────────────────────────────────────────────
  const [dreamTitle, setDreamTitle] = useState('');
  const [dreamBody, setDreamBody] = useState('');
  const [dreamList, setDreamList] = useState([]);
  const [loadingDream, setLoadingDream] = useState(true);
  const [savingDream, setSavingDream] = useState(false);
  const [editingDreamId, setEditingDreamId] = useState(null);
  const [expandedDreamId, setExpandedDreamId] = useState(null);

  const loadDream = async () => {
    try { setDreamList(await getScripts()); } catch (_) {} finally { setLoadingDream(false); }
  };
  useEffect(() => { loadDream(); }, []);

  const handleSaveDream = async () => {
    if (!dreamBody.trim()) { Alert.alert('Write your script first ✨'); return; }
    setSavingDream(true);
    const content = dreamTitle.trim() ? `${dreamTitle.trim()}\n\n${dreamBody.trim()}` : dreamBody.trim();
    try {
      if (editingDreamId) {
        const updated = await updateScript(editingDreamId, content);
        setDreamList((prev) => prev.map((s) => (s.id === editingDreamId ? { ...s, ...updated } : s)));
      } else {
        const row = await addScript(content);
        setDreamList((prev) => [row, ...prev]);
      }
      setDreamTitle(''); setDreamBody(''); setEditingDreamId(null);
    } catch (_) {} finally { setSavingDream(false); }
  };
  const handleClearDream = () => { setDreamTitle(''); setDreamBody(''); setEditingDreamId(null); };
  const handleEditDream = (item) => {
    const { title, body } = parseDream(item);
    setDreamTitle(title); setDreamBody(body); setEditingDreamId(item.id);
  };
  const handleDeleteDream = async (id) => {
    try { await deleteScript(id); } catch (_) {}
    setDreamList((prev) => prev.filter((s) => s.id !== id));
    if (editingDreamId === id) handleClearDream();
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ScreenHeader lead="Your" accent="Scripting" subtitle="Write your desires as if they have already happened. ✨" />

        <TabPill
          style={{ marginBottom: 16 }}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'daily', label: '☀️ Daily Script' },
            { value: 'dream', label: '🌙 Dream Life Script' },
          ]}
        />

        {tab === 'daily' ? (
          <>
            <GlassCard style={styles.mb16}>
              <Text style={styles.label}>☀️ WRITE TODAY'S SCRIPT</Text>
              <ExpandableTextArea
                value={dailyText}
                onChangeText={handleDailyChange}
                placeholder="Today I woke up feeling deeply grateful. My life is beautiful..."
                modalTitle="Today's Script"
                minHeight={150}
              />
              <View style={styles.btnRow}>
                <Button title="💾 Save" size="sm" onPress={handleSaveDaily} loading={savingDaily} />
                <Button title="Clear" size="sm" variant="ghost" onPress={handleClearDaily} />
              </View>
            </GlassCard>

            {loadingDaily ? (
              <ActivityIndicator color={colors.purpleMid} style={{ marginTop: 20 }} />
            ) : (
              <>
                {dailyEntries[todayKey()] && (
                  <>
                    <Text style={styles.subHeading}>Today</Text>
                    <View style={styles.dayRow}>
                      <Text style={styles.dayRowLabel}>{labelForDateKey(todayKey())} ✨</Text>
                      <View style={styles.dayRowActions}>
                        <TouchableOpacity style={styles.readBtn} onPress={() => setExpandedDailyKey(expandedDailyKey === todayKey() ? null : todayKey())}><Text style={styles.readBtnText}>📖 Read</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => readAloud(dailyEntries[todayKey()])}><Text style={styles.iconText}>🔊</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => handleEditDaily(todayKey())}><Text style={styles.iconText}>✏️</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteDaily(todayKey())}><Text style={styles.iconText}>✕</Text></TouchableOpacity>
                      </View>
                    </View>
                    {expandedDailyKey === todayKey() && <Text style={styles.expandedText}>{dailyEntries[todayKey()]}</Text>}
                  </>
                )}

                {dailyGroups.length > 0 && <Text style={[styles.subHeading, { marginTop: 14 }]}>Past Entries</Text>}
                {dailyGroups.map((week) => {
                  const open = expandedWeeks.has(week.key);
                  return (
                    <View key={week.key} style={styles.weekWrap}>
                      <TouchableOpacity style={styles.weekHeader} onPress={() => toggleWeek(week.key)}>
                        <Text style={styles.weekLabel}>{week.label} ({week.days.length})</Text>
                        <Text style={styles.weekChevron}>{open ? '▾' : '▸'}</Text>
                      </TouchableOpacity>
                      {open && week.days.map((k) => (
                        <View key={k}>
                          <View style={styles.dayRow}>
                            <Text style={styles.dayRowLabel}>{labelForDateKey(k)}</Text>
                            <View style={styles.dayRowActions}>
                              <TouchableOpacity style={styles.readBtn} onPress={() => setExpandedDailyKey(expandedDailyKey === k ? null : k)}><Text style={styles.readBtnText}>📖 Read</Text></TouchableOpacity>
                              <TouchableOpacity onPress={() => readAloud(dailyEntries[k])}><Text style={styles.iconText}>🔊</Text></TouchableOpacity>
                              <TouchableOpacity onPress={() => handleDeleteDaily(k)}><Text style={styles.iconText}>✕</Text></TouchableOpacity>
                            </View>
                          </View>
                          {expandedDailyKey === k && <Text style={styles.expandedText}>{dailyEntries[k]}</Text>}
                        </View>
                      ))}
                    </View>
                  );
                })}
              </>
            )}
          </>
        ) : (
          <>
            <GlassCard style={styles.mb16}>
              <Text style={styles.dreamIntro}>🌙 Dream Life Script</Text>
              <Text style={styles.dreamDesc}>Your permanent vision — the full picture of the life you are calling in. Rewrite and refine anytime.</Text>
              <View style={styles.inputBoxSm}>
                <TextInput
                  style={styles.input}
                  placeholder="Script title (e.g. My Dream Life — 2026)"
                  placeholderTextColor="rgba(46,37,48,0.4)"
                  value={dreamTitle}
                  onChangeText={setDreamTitle}
                />
              </View>
              <ExpandableTextArea
                value={dreamBody}
                onChangeText={setDreamBody}
                placeholder="I am so grateful and happy now that I wake up every morning in my beautiful home by the ocean..."
                modalTitle="Dream Life Script"
                minHeight={170}
                style={{ marginTop: 8 }}
              />
              <View style={styles.btnRow}>
                <Button title={editingDreamId ? '💾 Update' : '💾 Save'} size="sm" onPress={handleSaveDream} loading={savingDream} />
                <Button title="Clear" size="sm" variant="ghost" onPress={handleClearDream} />
              </View>
            </GlassCard>

            {loadingDream ? (
              <ActivityIndicator color={colors.purpleMid} style={{ marginTop: 20 }} />
            ) : dreamList.length === 0 ? (
              <Text style={styles.muted}>No dream life scripts yet. Write your first one above ✨</Text>
            ) : (
              <>
                <Text style={styles.subHeading}>Saved Dream Life Scripts</Text>
                {dreamList.map((item) => {
                  const { title, body } = parseDream(item);
                  const open = expandedDreamId === item.id;
                  return (
                    <GlassCard key={item.id} style={{ marginBottom: 10 }}>
                      <View style={styles.dreamRowHead}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dreamRowTitle} numberOfLines={1}>{title || 'Dream Life Script'}</Text>
                          <Text style={styles.dreamRowDate}>{item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</Text>
                        </View>
                        <View style={styles.dayRowActions}>
                          <TouchableOpacity style={styles.readBtn} onPress={() => setExpandedDreamId(open ? null : item.id)}><Text style={styles.readBtnText}>📖 Read</Text></TouchableOpacity>
                          <TouchableOpacity onPress={() => readAloud(body)}><Text style={styles.iconText}>🔊</Text></TouchableOpacity>
                          <TouchableOpacity onPress={() => handleEditDream(item)}><Text style={styles.iconText}>✏️</Text></TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteDream(item.id)}><Text style={styles.iconText}>✕</Text></TouchableOpacity>
                        </View>
                      </View>
                      {open && <Text style={styles.expandedText}>{body}</Text>}
                    </GlassCard>
                  );
                })}
              </>
            )}
          </>
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
  inputBoxSm: { borderWidth: 1, borderColor: 'rgba(154,95,168,0.22)', borderRadius: radii.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.5)' },
  input: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  muted: { fontFamily: fonts.displayItalic, fontSize: 13.5, color: colors.mist, fontStyle: 'italic', textAlign: 'center', marginTop: 16 },

  subHeading: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.mist, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },

  dayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.2)', borderRadius: radii.sm, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8 },
  dayRowLabel: { fontFamily: fonts.body, fontSize: 15, color: colors.ink2 },
  dayRowActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  readBtn: { backgroundColor: colors.purpleMid, borderRadius: radii.pill, paddingVertical: 6, paddingHorizontal: 14 },
  readBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  iconText: { fontSize: 16, color: colors.mist },
  expandedText: { fontFamily: fonts.displayItalic, fontSize: 15, color: colors.ink2, fontStyle: 'italic', lineHeight: 22, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: radii.sm, padding: 14, marginBottom: 10 },

  weekWrap: { marginBottom: 10 },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(245,240,252,0.6)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.sm, paddingVertical: 15, paddingHorizontal: 16, marginBottom: 8 },
  weekLabel: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.purpleDark },
  weekChevron: { fontSize: 14, color: colors.mist },

  dreamIntro: { fontFamily: fonts.displayMedium, fontSize: 17, color: colors.ink, marginBottom: 4 },
  dreamDesc: { fontFamily: fonts.body, fontSize: 12, color: colors.mist, lineHeight: 18, marginBottom: 12 },
  dreamRowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dreamRowTitle: { fontFamily: fonts.displayMedium, fontSize: 17, color: colors.ink },
  dreamRowDate: { fontFamily: fonts.body, fontSize: 12, color: colors.mist, marginTop: 3 },
});
