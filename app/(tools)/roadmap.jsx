import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import { getRoadmaps, createRoadmap, checkRoadmapAction, deleteRoadmap, createCheckout } from '../../services/api';
import UpgradeModal from '../../components/UpgradeModal';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { usePlanStore } from '../../store/planStore';
import { colors, fonts, radii } from '../../constants/theme';
import * as Linking from 'expo-linking';

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressLabelRow}>
        <Text style={styles.progressLabel}>Progress</Text>
        <Text style={styles.progressCount}>{done} of {total} actions</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

// ─── Single roadmap card ──────────────────────────────────────────────────────
function RoadmapCard({ rm, onToggle, onDelete, onLockedTap }) {
  const actions = rm.weeks?.[0]?.actions ?? [];
  const done = actions.filter((a) => a.checked).length;

  return (
    <GlassCard style={styles.mb16}>
      {/* Header */}
      <View style={styles.rmHeader}>
        <View style={styles.rmHeaderText}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.rmDesire}>{rm.desire}</Text>
            {rm.locked ? <Text style={{ fontSize: 11 }}>🔒</Text> : null}
          </View>
          <Text style={styles.rmDays}>{rm.days} days</Text>
        </View>
        <TouchableOpacity
          onPress={() => onDelete(rm.id)}
          style={styles.deleteBtn}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      {actions.length > 0 && (
        <ProgressBar done={done} total={actions.length} />
      )}

      {/* Divider */}
      {actions.length > 0 && <View style={styles.divider} />}

      {/* Action checklist */}
      {actions.map((a, i) => (
        <TouchableOpacity
          key={i}
          style={styles.actionRow}
          onPress={() => onToggle(rm, i)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, a.checked && styles.checkboxChecked]}>
            {a.checked && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.actionText, a.checked && styles.actionTextChecked]}>
            {a.action}
          </Text>
        </TouchableOpacity>
      ))}
    </GlassCard>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Roadmap() {
  const { limits, refresh } = usePlanStore();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');

  const [desire, setDesire] = useState('');
  const [days, setDays] = useState('21');
  const [actionsText, setActionsText] = useState('');
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try { setRoadmaps(await getRoadmaps()); } catch (e) { setError(e.message || 'Could not load roadmaps'); }
  };

  useEffect(() => { refresh(); load().finally(() => setLoading(false)); }, []);

  const handleCreate = async () => {
    if (!desire.trim()) { setError('Describe your desire.'); return; }
    const lines = actionsText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) { setError('Add at least one action.'); return; }

    // Free: 1 roadmap TOTAL EVER, no refund on delete.
    const cap = limits?.roadmaps_total;
    if (cap != null && roadmaps.length >= cap) {
      setUpgradeMsg(`You've used your ${cap} free roadmap -- upgrade for unlimited roadmaps.`);
      setShowUpgrade(true);
      return;
    }

    setError(''); setSaving(true);
    try {
      const dayCount = parseInt(days, 10) || 21;
      const week = {
        week: 1,
        startDay: 1,
        endDay: dayCount,
        actions: lines.map((a) => ({ action: a, checked: false })),
        note: '',
      };
      const rm = await createRoadmap({ desire: desire.trim(), days: dayCount, weeks: [week] });
      setRoadmaps((prev) => [rm, ...prev]);
      setDesire(''); setActionsText(''); setDays('21');
    } catch (e) {
      if (e.status === 403) { setUpgradeMsg(e.message || 'Upgrade for unlimited roadmaps.'); setShowUpgrade(true); }
      else setError(e.message || 'Could not create roadmap');
    } finally { setSaving(false); }
  };

  const handleToggle = async (rm, actionIdx) => {
    const action = rm.weeks[0].actions[actionIdx];
    const newChecked = !action.checked;
    setRoadmaps((prev) => prev.map((r) => {
      if (r.id !== rm.id) return r;
      const weeks = r.weeks.map((w, wi) =>
        wi === 0
          ? { ...w, actions: w.actions.map((a, ai) => ai === actionIdx ? { ...a, checked: newChecked } : a) }
          : w
      );
      return { ...r, weeks };
    }));
    try { await checkRoadmapAction(rm.id, 1, actionIdx, newChecked); } catch (e) { setError(e.message || 'Could not save'); }
  };

  const handleDelete = async (rmId) => {
    try {
      await deleteRoadmap(rmId);
      setRoadmaps((prev) => prev.filter((r) => r.id !== rmId));
    } catch (e) { setError(e.message || 'Could not delete'); }
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <ScreenHeader lead="Road" accent="map" subtitle="Map the path to your desire ✨" />

        {/* Creation card */}
        <GlassCard style={styles.mb20}>
          <Text style={styles.cardTitle}>Create a Roadmap</Text>
          <TextInput
            style={styles.input}
            placeholder="Your desire"
            placeholderTextColor="#9a8896"
            value={desire}
            onChangeText={setDesire}
          />
          <TextInput
            style={styles.input}
            placeholder="Days (e.g. 21)"
            placeholderTextColor="#9a8896"
            keyboardType="number-pad"
            value={days}
            onChangeText={setDays}
          />
          <TextInput
            style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
            placeholder={'One action per line:\nMeditate 10 minutes\nWrite affirmations\nVisualize the outcome'}
            placeholderTextColor="#9a8896"
            value={actionsText}
            onChangeText={setActionsText}
            multiline
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <Button title="Create Roadmap ✨" onPress={handleCreate} loading={saving} fullWidth style={{ marginTop: 4 }} />
        </GlassCard>

        {/* Roadmap list */}
        {loading ? (
          <ActivityIndicator color="#c9a8c9" style={{ marginTop: 20 }} />
        ) : roadmaps.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyTitle}>No roadmaps yet</Text>
            <Text style={styles.emptySubtitle}>Create your first path above</Text>
          </GlassCard>
        ) : (
          <>
            <Text style={styles.sectionHeading}>Your roadmaps</Text>
            {roadmaps.map((rm) => (
              <RoadmapCard
                key={rm.id}
                rm={rm}
                onToggle={rm.locked ? () => { setUpgradeMsg('This roadmap is locked -- upgrade to edit it again.'); setShowUpgrade(true); } : handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </>
        )}

      </ScrollView>

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
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },


  mb16: { marginBottom: 16 },
  mb20: { marginBottom: 20 },

  cardTitle: { fontSize: 15, fontWeight: '600', color: '#2e2530', marginBottom: 14 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#2e2530',
    marginBottom: 10,
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

  // Roadmap card internals
  rmHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  rmHeaderText: { flex: 1 },
  rmDesire: { fontSize: 16, fontWeight: '600', color: '#2e2530', marginBottom: 2 },
  rmDays: { fontSize: 12, color: '#6b5c66' },

  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(192,64,64,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteBtnText: { fontSize: 11, color: '#9a8896', fontWeight: '600' },

  // Progress bar
  progressWrap: { marginBottom: 14 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 11, color: '#9a5fa8', fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  progressCount: { fontSize: 11, color: '#6b5c66', fontWeight: '500' },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(201,168,201,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#c9a8c9',
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(154,95,168,0.1)',
    marginBottom: 10,
  },

  // Action rows
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(154,95,168,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#c9a8c9', borderColor: '#c9a8c9' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  actionText: { color: '#2e2530', fontSize: 14, flex: 1, lineHeight: 20 },
  actionTextChecked: { color: '#9a8896', textDecorationLine: 'line-through' },

  // Empty state
  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#2e2530', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#6b5c66' },
});