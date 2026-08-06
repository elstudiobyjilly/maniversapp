import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GradientBackground from '../../components/GradientBackground';
import GlassCard from '../../components/GlassCard';
import ScreenHeader from '../../components/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import ExpandableTextArea from '../../components/ExpandableTextArea';
import { colors, fonts, radii } from '../../constants/theme';
import {
  createCheckout,
  getRoadmaps, createRoadmap, deleteRoadmap,
  getRoadmapDayLogs, createRoadmapDayLog, deleteRoadmapDayLog,
} from '../../services/api';
import UpgradeModal from '../../components/UpgradeModal';
import { usePlanStore } from '../../store/planStore';
import * as Linking from 'expo-linking';
// Shared with the Home dashboard's Desire Action widget so both read/write
// the same /roadmap + /roadmap/log records with identical day bridging.
import {
  CURRENT_KEY, START_KEY_PREFIX, PRACTICES_KEY_PREFIX, DURATIONS, PRACTICE_OPTIONS, DEFAULT_PRACTICES,
  DAY_LETTERS, toDateKey, startOfDay, addDays, fmtShort, buildLogsMap, dayNumberFor,
} from '../../constants/desireAction';


export default function DesireActionTool() {
  const insets = useSafeAreaInsets();
  const { refresh } = usePlanStore();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');

  const [desires, setDesires] = useState([]);
  const [rawLogs, setRawLogs] = useState([]); // full /roadmap/log/ list, all desires
  const [currentId, setCurrentId] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addStart, setAddStart] = useState(toDateKey(new Date()));
  const [addDur, setAddDur] = useState(21);
  const [addPracs, setAddPracs] = useState(DEFAULT_PRACTICES);
  const [addCustom, setAddCustom] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editDur, setEditDur] = useState(21);
  const [editPracs, setEditPracs] = useState([]);

  // ── Load ──────────────────────────────────────────────────────────────
  const loadAll = useCallback(async (preferId) => {
    refresh();
    try {
      const [roadmaps, logsList] = await Promise.all([getRoadmaps(), getRoadmapDayLogs()]);
      const withStart = await Promise.all(roadmaps.map(async (r) => {
        let startDate = null;
        try { startDate = await AsyncStorage.getItem(START_KEY_PREFIX + r.id); } catch (e) {}
        if (!startDate) startDate = (r.created_at || '').slice(0, 10) || toDateKey(new Date());
        const endDate = toDateKey(addDays(new Date(startDate), (r.days || 21) - 1));
        let practices = r.practices || [];
        if (!practices.length) {
          try {
            const stored = await AsyncStorage.getItem(PRACTICES_KEY_PREFIX + r.id);
            if (stored) practices = JSON.parse(stored);
          } catch (e) {}
        }
        return { id: r.id, title: r.desire, days: r.days, practices, startDate, endDate };
      }));
      setDesires(withStart);
      setRawLogs(logsList);
      const localCur = await AsyncStorage.getItem(CURRENT_KEY).catch(() => null);
      const cur = preferId ?? (withStart.find((d) => d.id === localCur * 1) ? localCur * 1 : withStart[0]?.id) ?? null;
      setCurrentId(cur);
    } catch (e) {}
  }, [refresh]);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (currentId != null) { AsyncStorage.setItem(CURRENT_KEY, String(currentId)).catch(() => {}); }
    setWeekOffset(0);
    setSelectedDay(null);
  }, [currentId]);

  const currentDesire = desires.find((d) => d.id === currentId) || null;
  const baseLogs = useMemo(
    () => (currentDesire ? buildLogsMap(rawLogs, currentDesire.title) : {}),
    [rawLogs, currentDesire]
  );
  // Checkbox taps show their new state immediately instead of waiting on
  // the delete+create round trip -- otherwise a slow network makes the
  // checkbox look unresponsive/missing rather than just toggled.
  const [optimisticLogs, setOptimisticLogs] = useState({});
  const logs = useMemo(() => ({ ...baseLogs, ...optimisticLogs }), [baseLogs, optimisticLogs]);

  // ── Derived: progress ────────────────────────────────────────────────
  const progress = useMemo(() => {
    if (!currentDesire) return null;
    const start = startOfDay(new Date(currentDesire.startDate));
    const end = startOfDay(new Date(currentDesire.endDate));
    const today = startOfDay(new Date());
    const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
    const daysPassed = Math.max(0, Math.min(totalDays, Math.round((today - start) / 86400000) + 1));
    const pracs = currentDesire.practices || [];
    let completeDays = 0;
    Object.keys(logs).forEach((k) => {
      const log = logs[k];
      const checked = pracs.filter((p) => log.practices && log.practices[p]).length;
      if (pracs.length > 0 && checked === pracs.length) completeDays++;
    });
    const pct = totalDays > 0 ? Math.round((completeDays / totalDays) * 100) : 0;
    return { totalDays, daysPassed, completeDays, pct, start, end };
  }, [currentDesire, logs]);

  // ── Derived: week grid ───────────────────────────────────────────────
  const weekData = useMemo(() => {
    if (!currentDesire) return null;
    const start = startOfDay(new Date(currentDesire.startDate));
    const end = startOfDay(new Date(currentDesire.endDate));
    const today = startOfDay(new Date());
    const weekStart = addDays(start, weekOffset * 7);
    const weekEnd = addDays(weekStart, 6);
    const pracs = currentDesire.practices || [];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      if (day < start || day > end) { days.push(null); continue; }
      const dateKey = toDateKey(day);
      const log = logs[dateKey] || {};
      const checkedCount = pracs.filter((p) => log.practices && log.practices[p]).length;
      const allDone = pracs.length > 0 && checkedCount === pracs.length;
      const isToday = day.getTime() === today.getTime();
      const isPast = day < today;
      const hasNote = !!(log.note || '').trim();
      days.push({ date: day, dateKey, checkedCount, allDone, isToday, isPast, hasNote });
    }
    const totalDays = Math.round((end - start) / 86400000) + 1;
    const maxWeek = Math.ceil(totalDays / 7) - 1;
    return { weekStart, weekEnd, days, maxWeek };
  }, [currentDesire, logs, weekOffset]);

  // auto-open today on first load of a desire
  useEffect(() => {
    if (!weekData || selectedDay) return;
    const todayKey = toDateKey(startOfDay(new Date()));
    const match = weekData.days.find((d) => d && d.dateKey === todayKey);
    if (match) {
      setSelectedDay(todayKey);
      setNoteText((logs[todayKey] || {}).note || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekData]);

  // ── Handlers: week nav / day open ───────────────────────────────────
  const handlePrevWeek = () => {
    setWeekOffset((w) => Math.max(0, w - 1));
    setSelectedDay(null);
  };
  const handleNextWeek = () => {
    setWeekOffset((w) => (weekData ? Math.min(weekData.maxWeek, w + 1) : w));
    setSelectedDay(null);
  };
  const handleOpenDay = (dateKey) => {
    setSelectedDay(dateKey);
    setNoteText((logs[dateKey] || {}).note || '');
  };

  // A day's log has no PATCH on the backend -- editing means delete the
  // existing row (if any) and create a fresh one with the merged fields.
  const saveDayLog = useCallback(async (dateKey, { practices, note }) => {
    if (!currentDesire) return;
    const existing = baseLogs[dateKey];
    const day = dayNumberFor(dateKey, currentDesire.startDate);
    const completedNames = Object.keys(practices).filter((p) => practices[p]);
    try {
      if (existing?.id) { try { await deleteRoadmapDayLog(existing.id); } catch (e) {} }
      const created = await createRoadmapDayLog({
        day, desire: currentDesire.title, practices: completedNames, action: note || '', date: dateKey,
      });
      setRawLogs((cur) => [
        ...cur.filter((l) => !(existing?.id && l.id === existing.id)),
        created,
      ]);
    } catch (e) {
      Alert.alert('Could not save', e.message || 'Please try again.');
    } finally {
      setOptimisticLogs((cur) => { const next = { ...cur }; delete next[dateKey]; return next; });
    }
  }, [currentDesire, baseLogs]);

  const handleTogglePractice = (practice) => {
    if (!selectedDay || !currentDesire) return;
    const cur = logs[selectedDay]?.practices || {};
    const nextPractices = { ...cur, [practice]: !cur[practice] };
    // Reflect the tap immediately (see optimisticLogs above), then persist.
    setOptimisticLogs((prev) => ({
      ...prev,
      [selectedDay]: { ...(logs[selectedDay] || {}), practices: nextPractices },
    }));
    saveDayLog(selectedDay, { practices: nextPractices, note: logs[selectedDay]?.note || noteText });
  };

  const handleSaveNote = () => {
    if (!selectedDay || !currentDesire) return;
    saveDayLog(selectedDay, { practices: logs[selectedDay]?.practices || {}, note: noteText });
  };

  // ── Handlers: add desire ────────────────────────────────────────────
  const addEndDate = useMemo(() => toDateKey(addDays(new Date(addStart), addDur - 1)), [addStart, addDur]);

  const openAdd = () => {
    setAddTitle('');
    setAddStart(toDateKey(new Date()));
    setAddDur(21);
    setAddPracs(DEFAULT_PRACTICES);
    setAddCustom('');
    setAddOpen(true);
  };
  const toggleAddPrac = (p) => {
    setAddPracs((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  };
  const handleSaveNewDesire = async () => {
    if (!addTitle.trim()) { Alert.alert('Enter your desire ✨'); return; }

    const customList = addCustom.split('\n').map((s) => s.trim()).filter(Boolean);
    const title = addTitle.trim();
    const practices = [...addPracs, ...customList];

    try {
      const created = await createRoadmap({ desire: title, days: addDur, weeks: [], practices });
      try { await AsyncStorage.setItem(START_KEY_PREFIX + created.id, addStart); } catch (e) {}
      try { await AsyncStorage.setItem(PRACTICES_KEY_PREFIX + created.id, JSON.stringify(practices)); } catch (e) {}
      await loadAll(created.id);
      setAddOpen(false);
      Alert.alert('Desire tracker started ✨');
    } catch (e) {
      if (e.status === 403) {
        setUpgradeMsg(e.message || 'Upgrade to track more desires.');
        setShowUpgrade(true);
      } else {
        Alert.alert('Could not start tracker', e.message || 'Please try again.');
      }
    }
  };

  // ── Handlers: edit desire ───────────────────────────────────────────
  const openEdit = () => {
    if (!currentDesire) return;
    setEditTitle(currentDesire.title || '');
    setEditStart(currentDesire.startDate || toDateKey(new Date()));
    const total = Math.round((new Date(currentDesire.endDate) - new Date(currentDesire.startDate)) / 86400000) + 1;
    setEditDur(DURATIONS.includes(total) ? total : 21);
    setEditPracs(currentDesire.practices || []);
    setEditOpen(true);
  };
  const toggleEditPrac = (p) => {
    setEditPracs((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  };
  const editEndDate = useMemo(() => toDateKey(addDays(new Date(editStart || new Date()), editDur - 1)), [editStart, editDur]);

  // The backend has no update endpoint for a roadmap's desire/days/practices
  // (only /check and /note, which belong to the unrelated week-checklist
  // flow) -- so "editing" recreates the roadmap and migrates its day logs.
  const handleSaveEditDesire = async () => {
    if (!currentDesire) return;
    if (!editTitle.trim()) { Alert.alert('Enter your desire ✨'); return; }
    const title = editTitle.trim();
    const oldId = currentDesire.id;
    const oldTitle = currentDesire.title;
    const oldLogs = rawLogs.filter((l) => l.desire === oldTitle);

    try {
      const created = await createRoadmap({ desire: title, days: editDur, weeks: [], practices: editPracs });
      try { await AsyncStorage.setItem(START_KEY_PREFIX + created.id, editStart); } catch (e) {}
      try { await AsyncStorage.setItem(PRACTICES_KEY_PREFIX + created.id, JSON.stringify(editPracs)); } catch (e) {}

      for (const l of oldLogs) {
        try {
          await deleteRoadmapDayLog(l.id);
          await createRoadmapDayLog({
            day: dayNumberFor((l.log_date || '').slice(0, 10), editStart),
            desire: title, practices: l.practices || [], action: l.action || '', date: (l.log_date || '').slice(0, 10),
          });
        } catch (e) {}
      }

      try { await deleteRoadmap(oldId); } catch (e) {}
      try { await AsyncStorage.removeItem(START_KEY_PREFIX + oldId); } catch (e) {}
      try { await AsyncStorage.removeItem(PRACTICES_KEY_PREFIX + oldId); } catch (e) {}

      await loadAll(created.id);
      setEditOpen(false);
      Alert.alert('Desire updated ✨');
    } catch (e) {
      Alert.alert('Could not update', e.message || 'Please try again.');
    }
  };

  const handleDeleteDesire = () => {
    if (!currentDesire) return;
    const id = currentDesire.id;
    const title = currentDesire.title;
    Alert.alert('Delete this desire and all its logs?', null, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const toRemove = rawLogs.filter((l) => l.desire === title);
        for (const l of toRemove) { try { await deleteRoadmapDayLog(l.id); } catch (e) {} }
        try { await deleteRoadmap(id); } catch (e) {}
        try { await AsyncStorage.removeItem(START_KEY_PREFIX + id); } catch (e) {}
        try { await AsyncStorage.removeItem(PRACTICES_KEY_PREFIX + id); } catch (e) {}
        const remaining = desires.filter((d) => d.id !== id);
        await loadAll(remaining.length ? remaining[0].id : null);
        Alert.alert('Desire removed');
      } },
    ]);
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 46, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <ScreenHeader lead="🗺️ Desire" accent="Action" subtitle="Track your daily practices. Watch your desires unfold. ✨" />

        <GlassCard style={{ marginBottom: 16 }}>
          <View style={styles.selectorRow}>
            {desires.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 6 }}>
                {desires.map((d) => (
                  <TouchableOpacity key={d.id} style={[styles.desirePill, currentId === d.id && styles.desirePillOn]} onPress={() => setCurrentId(d.id)}>
                    <Text style={[styles.desirePillText, currentId === d.id && styles.desirePillTextOn]} numberOfLines={1}>{d.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.noDesireText}>No desires yet...</Text>
            )}
            <TouchableOpacity style={styles.newBtn} onPress={openAdd}>
              <Text style={styles.newBtnText}>+ New</Text>
            </TouchableOpacity>
          </View>

          {currentDesire && progress && (
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>📅 Day {progress.daysPassed} of {progress.totalDays}</Text>
              <Text style={styles.infoText}>🗓️ {fmtShort(progress.start)} – {fmtShort(progress.end)}</Text>
              <Text style={styles.infoText}>✨ {(currentDesire.practices || []).length} practices</Text>
            </View>
          )}
        </GlassCard>

        {!currentDesire && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIc}>🗺️</Text>
            <Text style={styles.emptyTitle}>Start tracking a desire</Text>
            <Text style={styles.emptyDesc}>Set a desire, choose your daily practices, and watch your progress unfold day by day.</Text>
          </View>
        )}

        {currentDesire && weekData && (
          <>
            <View style={styles.weekNavRow}>
              <TouchableOpacity style={styles.weekNavBtn} onPress={handlePrevWeek} disabled={weekOffset === 0}>
                <Text style={[styles.weekNavBtnText, weekOffset === 0 && { opacity: 0.4 }]}>‹ Prev</Text>
              </TouchableOpacity>
              <Text style={styles.weekLabel}>{fmtShort(weekData.weekStart)} – {fmtShort(weekData.weekEnd)}</Text>
              <TouchableOpacity style={styles.weekNavBtn} onPress={handleNextWeek} disabled={weekOffset === weekData.maxWeek}>
                <Text style={[styles.weekNavBtnText, weekOffset === weekData.maxWeek && { opacity: 0.4 }]}>Next ›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dayGrid}>
              {weekData.days.map((day, i) => {
                if (!day) return <View key={i} style={styles.dayPillEmpty} />;
                const isSel = selectedDay === day.dateKey;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.dayPill,
                      day.allDone && styles.dayPillDone,
                      isSel && !day.allDone && styles.dayPillSel,
                      day.isToday && !day.allDone && !isSel && styles.dayPillToday,
                    ]}
                    onPress={() => handleOpenDay(day.dateKey)}
                  >
                    <Text style={[styles.dayPillLetter, day.allDone && styles.dayPillTextOn, (isSel || day.isToday) && !day.allDone && styles.dayPillTextAccent]}>{DAY_LETTERS[day.date.getDay()]}</Text>
                    <Text style={[styles.dayPillNum, day.allDone && styles.dayPillTextOn, (isSel || day.isToday) && !day.allDone && styles.dayPillTextAccent]}>{day.date.getDate()}</Text>
                    <Text style={styles.dayPillIcon}>{day.allDone ? '✅' : day.checkedCount > 0 ? '🔸' : day.isPast ? '○' : '·'}</Text>
                    {day.hasNote && <View style={styles.dayPillNoteDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedDay && (
              <GlassCard style={{ marginTop: 16, marginBottom: 16 }}>
                <Text style={styles.dayDetailTitle}>
                  {new Date(selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
                {(currentDesire.practices || []).length === 0 ? (
                  <Text style={styles.noPracsText}>No practices set for this desire.</Text>
                ) : (
                  (currentDesire.practices || []).map((p, i) => {
                    const checked = !!(logs[selectedDay]?.practices && logs[selectedDay].practices[p]);
                    return (
                      <TouchableOpacity key={p} style={[styles.pracRow, i < currentDesire.practices.length - 1 && styles.pracRowDivider]} onPress={() => handleTogglePractice(p)}>
                        <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                          {checked && <Text style={styles.checkboxTick}>✓</Text>}
                        </View>
                        <Text style={[styles.pracLabel, checked && styles.pracLabelDone]}>{p}</Text>
                        {checked && <Text style={styles.pracCheckIc}>✅</Text>}
                      </TouchableOpacity>
                    );
                  })
                )}

                <Text style={styles.noteLbl}>ACTION / NOTE</Text>
                <ExpandableTextArea
                  value={noteText}
                  onChangeText={setNoteText}
                  onBlur={handleSaveNote}
                  placeholder="What action did you take? How did you feel?..."
                  modalTitle="Action / Note"
                  minHeight={110}
                />
              </GlassCard>
            )}

            <GlassCard style={{ marginBottom: 16 }}>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Day {progress.daysPassed} of {progress.totalDays} · {progress.completeDays} full days · {progress.pct}%</Text>
              </View>
              <View style={styles.progressBarWrap}>
                <View style={[styles.progressBar, { width: `${progress.pct}%` }]} />
              </View>
            </GlassCard>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
                <Text style={styles.editBtnText}>✏️ Edit Desire</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteDesire}>
                <Text style={styles.deleteBtnText}>🗑️ Delete This Desire</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── ADD DESIRE MODAL ──────────────────────────────────────── */}
      <Modal visible={addOpen} animationType="slide" transparent onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>✨ New Desire</Text>

              <Text style={styles.fieldLbl}>Your Desire</Text>
              <View style={styles.inputBordered}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Attract financial abundance and feel truly free..."
                  placeholderTextColor="rgba(46,37,48,0.4)"
                  value={addTitle}
                  onChangeText={setAddTitle}
                />
              </View>

              <Text style={styles.fieldLbl}>Start Date (YYYY-MM-DD)</Text>
              <View style={styles.inputBordered}>
                <TextInput style={styles.modalInput} value={addStart} onChangeText={setAddStart} placeholder="2026-06-18" placeholderTextColor="rgba(46,37,48,0.4)" />
              </View>
              <Text style={styles.endDatePreview}>Ends {addEndDate}</Text>

              <Text style={styles.fieldLbl}>Duration</Text>
              <View style={styles.durRow}>
                {DURATIONS.map((dur) => (
                  <TouchableOpacity key={dur} style={[styles.durPill, addDur === dur && styles.durPillOn]} onPress={() => setAddDur(dur)}>
                    <Text style={[styles.durPillText, addDur === dur && styles.durPillTextOn]}>{dur} Days</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLbl}>Daily Practices</Text>
              <View style={styles.pracChipsRow}>
                {PRACTICE_OPTIONS.map((p) => (
                  <TouchableOpacity key={p} style={[styles.pracChip, addPracs.includes(p) && styles.pracChipOn]} onPress={() => toggleAddPrac(p)}>
                    <Text style={[styles.pracChipText, addPracs.includes(p) && styles.pracChipTextOn]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLbl}>Custom Practices <Text style={styles.fieldLblHint}>(one per line)</Text></Text>
              <ExpandableTextArea
                value={addCustom}
                onChangeText={setAddCustom}
                placeholder={'e.g. Gratitude walk\nCold shower intention'}
                modalTitle="Custom Practices"
                minHeight={90}
              />

              <View style={styles.modalBtnRow}>
                <Button title="✨ Start Tracking" onPress={handleSaveNewDesire} fullWidth />
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddOpen(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── EDIT DESIRE MODAL ─────────────────────────────────────── */}
      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>✏️ Edit Desire</Text>

              <Text style={styles.fieldLbl}>Your Desire</Text>
              <View style={styles.inputBordered}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Attract financial abundance..."
                  placeholderTextColor="rgba(46,37,48,0.4)"
                  value={editTitle}
                  onChangeText={setEditTitle}
                />
              </View>

              <Text style={styles.fieldLbl}>Start Date (YYYY-MM-DD)</Text>
              <View style={styles.inputBordered}>
                <TextInput style={styles.modalInput} value={editStart} onChangeText={setEditStart} placeholder="2026-06-18" placeholderTextColor="rgba(46,37,48,0.4)" />
              </View>
              <Text style={styles.endDatePreview}>Ends {editEndDate}</Text>

              <Text style={styles.fieldLbl}>Duration</Text>
              <View style={styles.durRow}>
                {DURATIONS.map((dur) => (
                  <TouchableOpacity key={dur} style={[styles.durPill, editDur === dur && styles.durPillOn]} onPress={() => setEditDur(dur)}>
                    <Text style={[styles.durPillText, editDur === dur && styles.durPillTextOn]}>{dur} Days</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLbl}>Daily Practices</Text>
              <View style={styles.pracChipsRow}>
                {PRACTICE_OPTIONS.map((p) => (
                  <TouchableOpacity key={p} style={[styles.pracChip, editPracs.includes(p) && styles.pracChipOn]} onPress={() => toggleEditPrac(p)}>
                    <Text style={[styles.pracChipText, editPracs.includes(p) && styles.pracChipTextOn]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalBtnRow}>
                <Button title="Save Changes" onPress={handleSaveEditDesire} fullWidth />
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditOpen(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <UpgradeModal
        visible={showUpgrade}
        message={upgradeMsg}
        onClose={() => setShowUpgrade(false)}
        onSelectPlan={async (priceKey) => {
          try { const res = await createCheckout(priceKey); if (res?.url) await Linking.openURL(res.url); }
          catch (_) {}
        }}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({

  selectorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  desirePill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.4)', backgroundColor: 'rgba(255,255,255,0.7)', maxWidth: 220 },
  desirePillOn: { backgroundColor: '#c9a8c9', borderColor: 'transparent' },
  desirePillText: { fontSize: 13, fontStyle: 'italic', color: '#6b5c66', fontWeight: '500' },
  desirePillTextOn: { color: '#fff' },
  noDesireText: { flex: 1, fontSize: 13, color: '#6b5c66', fontStyle: 'italic' },
  newBtn: { backgroundColor: '#c9a8c9', borderRadius: 50, paddingVertical: 8, paddingHorizontal: 14 },
  newBtnText: { color: '#fff', fontSize: 12.5, fontWeight: '600' },

  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  infoText: { fontSize: 11.5, color: '#6b5c66' },

  emptyWrap: { alignItems: 'center', padding: 28, borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.4)', borderStyle: 'dashed', borderRadius: 16, backgroundColor: 'rgba(201,168,201,0.05)' },
  emptyIc: { fontSize: 30, marginBottom: 10 },
  emptyTitle: { fontSize: 16, color: '#2e2530', marginBottom: 6, fontWeight: '500' },
  emptyDesc: { fontSize: 12.5, color: '#6b5c66', textAlign: 'center', lineHeight: 18 },

  weekNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  weekNavBtn: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(154,95,168,0.2)' },
  weekNavBtnText: { fontSize: 12.5, color: '#6b5c66', fontWeight: '600' },
  weekLabel: { fontSize: 14, fontWeight: '400', color: '#2e2530', fontStyle: 'italic' },

  dayGrid: { flexDirection: 'row', gap: 5 },
  dayPillEmpty: { flex: 1, minWidth: 38 },
  dayPill: { flex: 1, minWidth: 38, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(154,95,168,0.18)', paddingVertical: 8, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.8)' },
  dayPillDone: { backgroundColor: '#9a5fa8', borderColor: 'transparent' },
  dayPillSel: { borderWidth: 2, borderColor: '#9a5fa8', backgroundColor: 'rgba(201,160,210,0.18)' },
  dayPillToday: { borderWidth: 1.5, borderColor: '#9a5fa8', backgroundColor: 'rgba(201,168,204,0.13)' },
  dayPillLetter: { fontSize: 10, fontWeight: '600', color: '#6b5c66' },
  dayPillNum: { fontSize: 13, fontWeight: '700', color: '#2e2530', marginTop: 1 },
  dayPillIcon: { fontSize: 11, marginTop: 2 },
  dayPillTextOn: { color: '#fff' },
  dayPillTextAccent: { color: '#9a5fa8' },
  dayPillNoteDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#9a5fa8', marginTop: 2 },

  dayDetailTitle: { fontSize: 16, fontStyle: 'italic', fontWeight: '400', color: '#2e2530', marginBottom: 12 },
  noPracsText: { fontSize: 13, color: '#6b5c66', marginBottom: 10 },
  pracRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  pracRowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(154,95,168,0.12)' },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.3)', justifyContent: 'center', alignItems: 'center' },
  checkboxOn: { backgroundColor: '#9a5fa8', borderColor: '#9a5fa8' },
  checkboxTick: { color: '#fff', fontSize: 11, fontWeight: '700' },
  pracLabel: { flex: 1, fontSize: 13.5, color: '#2e2530' },
  pracLabelDone: { textDecorationLine: 'line-through', color: '#6b5c66' },
  pracCheckIc: { fontSize: 13 },

  noteLbl: { fontSize: 10.5, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#9a5fa8', marginTop: 12, marginBottom: 8 },
  inputBordered: { borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.35)', borderRadius: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.4)' },
  noteInput: { fontSize: 13.5, color: '#2e2530', minHeight: 70 },

  progressRow: { marginBottom: 8 },
  progressLabel: { fontSize: 12.5, color: '#2e2530', fontWeight: '500' },
  progressBarWrap: { height: 8, backgroundColor: 'rgba(154,95,168,0.15)', borderRadius: 50, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#c9a8c9', borderRadius: 50 },

  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' },
  editBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(154,95,168,0.25)' },
  editBtnText: { fontSize: 12.5, color: '#6b5c66', fontWeight: '600' },
  deleteBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 50, backgroundColor: 'rgba(192,64,64,0.08)', borderWidth: 1, borderColor: 'rgba(192,64,64,0.25)' },
  deleteBtnText: { fontSize: 12.5, color: '#c04040', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(46,37,48,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fffaf3', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%' },
  modalTitle: { fontSize: 19, fontWeight: '400', color: '#2e2530', marginBottom: 16 },
  fieldLbl: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: '#9a5fa8', marginBottom: 8, marginTop: 14 },
  fieldLblHint: { textTransform: 'none', fontWeight: '500', color: '#6b5c66', letterSpacing: 0 },
  modalInput: { fontSize: 14, color: '#2e2530' },
  endDatePreview: { fontSize: 11.5, color: '#6b5c66', marginTop: 6 },

  durRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  durPill: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.4)', backgroundColor: 'rgba(255,255,255,0.7)' },
  durPillOn: { backgroundColor: '#c9a8c9', borderColor: 'transparent' },
  durPillText: { fontSize: 12.5, fontWeight: '600', color: '#6b5c66' },
  durPillTextOn: { color: '#fff' },

  pracChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pracChip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.35)', backgroundColor: 'rgba(255,255,255,0.6)' },
  pracChipOn: { backgroundColor: '#9a5fa8', borderColor: 'transparent' },
  pracChipText: { fontSize: 11.5, fontWeight: '500', color: '#6b5c66' },
  pracChipTextOn: { color: '#fff' },

  modalBtnRow: { marginTop: 22, gap: 8 },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#6b5c66', fontSize: 13.5, fontWeight: '500' },
});
