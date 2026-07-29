import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import { getRepsToday, addReps } from '../../services/api';

export default function Reps() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try { setData(await getRepsToday()); } catch (e) { setError(e.message || 'Could not load'); }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleAdd = async (count) => {
    setAdding(true); setError('');
    try {
      const result = await addReps(count);
      // /reps/add returns total_today + limit_reached (not done/can_rep) — map them through
      setData((prev) => ({
        ...prev,
        done: result.total_today ?? (prev.done + count),
        can_rep: result.limit_reached !== undefined ? !result.limit_reached : prev.can_rep,
      }));
    } catch (e) {
      setError(e.message || 'Could not add reps');
    } finally { setAdding(false); }
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c9a8c9" />
        </View>
      </GradientBackground>
    );
  }

  const pct = data?.unlimited ? 0 : Math.min(100, ((data?.done || 0) / (data?.limit || 1)) * 100);

  return (
    <GradientBackground>
      <View style={styles.container}>

        <Text style={styles.screenTitle}>
          Re<Text style={styles.titleAccent}>ps</Text>
        </Text>
        <Text style={styles.screenSubtitle}>Repetition rewires the mind ✨</Text>

        <GlassCard style={styles.circleWrap} noPadding>
          <View style={styles.circleInner}>
            <Text style={styles.count}>{data?.done || 0}</Text>
            <Text style={styles.label}>{data?.unlimited ? 'reps today' : `of ${data?.limit} today`}</Text>
          </View>
        </GlassCard>

        {!data?.unlimited && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        )}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.repButton} onPress={() => handleAdd(1)} disabled={adding || !data?.can_rep}>
            <Text style={styles.repButtonText}>+1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.repButton} onPress={() => handleAdd(10)} disabled={adding || !data?.can_rep}>
            <Text style={styles.repButtonText}>+10</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.repButton} onPress={() => handleAdd(54)} disabled={adding || !data?.can_rep}>
            <Text style={styles.repButtonText}>+54</Text>
          </TouchableOpacity>
        </View>

        {!data?.can_rep && (
          <Text style={styles.limitText}>Daily limit reached — upgrade for unlimited reps ✨</Text>
        )}

      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  screenTitle: { fontSize: 26, fontWeight: '600', color: '#2e2530', marginBottom: 4, textAlign: 'center' },
  titleAccent: { color: '#9a5fa8', fontStyle: 'italic' },
  screenSubtitle: { fontSize: 13, color: '#6b5c66', fontWeight: '500', marginBottom: 28, textAlign: 'center' },

  circleWrap: { width: 190, height: 190, borderRadius: 95, marginBottom: 24 },
  circleInner: { width: 190, height: 190, justifyContent: 'center', alignItems: 'center' },
  count: { fontSize: 44, fontWeight: '700', color: '#9a5fa8' },
  label: { fontSize: 12, color: '#9a8896', marginTop: 4 },

  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(201,168,201,0.25)',
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#c9a8c9' },

  errorText: { color: '#c04040', fontSize: 13, marginBottom: 12, textAlign: 'center' },

  buttonRow: { flexDirection: 'row', gap: 12 },
  repButton: { backgroundColor: '#c9a8c9', borderRadius: 50, paddingVertical: 14, paddingHorizontal: 24 },
  repButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  limitText: { color: '#6b5c66', fontSize: 12, marginTop: 20, textAlign: 'center' },
});
