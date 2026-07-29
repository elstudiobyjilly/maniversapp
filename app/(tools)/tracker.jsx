import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { colors, fonts, radii } from '../../constants/theme';
import { getHabits, addHabit, toggleHabitCheck, deleteHabit } from '../../services/api';

function todayStr() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

// ─── Single habit row with checkbox + delete animation ────────────────────
function HabitRow({ habit, checkedToday, today, onToggle, onDeleted }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    if (deleting) return;
    setDeleting(true);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.88, duration: 450, useNativeDriver: true }),
    ]).start(async () => {
      try { await deleteHabit(habit.id); } catch (_) {}
      onDeleted(habit.id);
    });
  };

  return (
    <Animated.View style={{ opacity, transform: [{ scale }], marginBottom: 10 }}>
      <GlassCard>
        <View style={styles.habitRow}>
          <TouchableOpacity
            style={[styles.checkbox, checkedToday && styles.checkboxChecked]}
            onPress={() => onToggle(habit)}
          >
            {checkedToday && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <View style={styles.habitBody}>
            <Text style={styles.habitText}>{habit.habit}</Text>
            <Text style={styles.dayCount}>{(habit.checked_dates || []).length} days completed</Text>
          </View>
          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting}
            style={styles.removeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.removeBtnIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Tracker() {
  const [habit, setHabit] = useState('');
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const today = todayStr();

  const load = async () => {
    try { setHabits(await getHabits()); } catch (e) { setError(e.message || 'Could not load habits'); }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleAdd = async () => {
    if (!habit.trim()) { setError('Name your habit.'); return; }
    setError(''); setSaving(true);
    try {
      const row = await addHabit(habit.trim());
      setHabits((prev) => [...prev, row]);
      setHabit('');
    } catch (e) {
      setError(e.message || 'Could not save habit');
    } finally { setSaving(false); }
  };

  const handleToggleToday = async (h) => {
    try {
      const updated = await toggleHabitCheck(h.id, today);
      setHabits((prev) => prev.map((x) => (x.id === h.id ? updated : x)));
    } catch (e) {
      setError(e.message || 'Could not update');
    }
  };

  const handleDeleted = (id) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <ScreenHeader lead="Track" accent="er" subtitle={`Show up for yourself, one day at a time ✨`} />

        {/* Input card */}
        <GlassCard style={styles.mb20}>
          <TextInput
            style={styles.input}
            placeholder="New habit (e.g. Morning affirmations)"
            placeholderTextColor="#9a8896"
            value={habit}
            onChangeText={setHabit}
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <Button title="Add Habit ✨" onPress={handleAdd} loading={saving} fullWidth style={{ marginTop: 4 }} />
        </GlassCard>

        {/* Habit list */}
        {loading ? (
          <ActivityIndicator color="#c9a8c9" style={{ marginTop: 20 }} />
        ) : habits.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyTitle}>No habits yet</Text>
            <Text style={styles.emptySubtitle}>Add your first habit above</Text>
          </GlassCard>
        ) : (
          <>
            <Text style={styles.sectionHeading}>Your habits</Text>
            {habits.map((h) => (
              <HabitRow
                key={h.id}
                habit={h}
                checkedToday={(h.checked_dates || []).includes(today)}
                today={today}
                onToggle={handleToggleToday}
                onDeleted={handleDeleted}
              />
            ))}
          </>
        )}

      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },

  mb20: { marginBottom: 20 },

  input: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#2e2530',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.25)',
  },
  errorText: { color: '#c04040', fontSize: 13, marginBottom: 10, textAlign: 'center' },

  sectionHeading: {
    fontSize: 11,
    color: '#9a5fa8',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(154,95,168,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#c9a8c9', borderColor: '#c9a8c9' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },

  habitBody: { flex: 1 },
  habitText: { color: '#2e2530', fontSize: 14, fontWeight: '500', marginBottom: 2 },
  dayCount: { color: '#9a8896', fontSize: 12 },

  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(154,95,168,0.2)',
  },
  removeBtnIcon: { fontSize: 11, color: '#9a8896', fontWeight: '600' },

  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#2e2530', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#6b5c66' },
});
