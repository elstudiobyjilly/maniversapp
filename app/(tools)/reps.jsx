import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { colors, fonts, radii } from '../../constants/theme';
import { getSessionStats } from '../../services/api';

// Reps aren't their own thing to log — they're the repeat count behind every
// affirmation and story play, already recorded on /sessions/stats
// (today_repeats / total_affirmations_repeated) whenever a session
// completes in affirmations.jsx or stories.jsx. This panel is a focused
// read-only view onto that same data, not a separate manual counter —
// tapping a number here wouldn't correspond to anything you actually did.
export default function Reps() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setStats(await getSessionStats()); } catch (_) {}
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const todayReps = stats?.today_repeats ?? 0;
  const totalReps = stats?.total_affirmations_repeated ?? 0;
  const malas = Math.floor(totalReps / 108);
  const intoMala = totalReps % 108;

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purpleMid} />}
      >
        <ScreenHeader lead="Your" accent="Reps" subtitle="Every time you repeat an affirmation or play a story, it counts here. 🔁" />

        {loading ? (
          <ActivityIndicator color={colors.purpleMid} style={{ marginTop: 40 }} />
        ) : (
          <>
            <GlassCard style={styles.heroCard}>
              <Text style={styles.heroLabel}>TODAY</Text>
              <Text style={styles.heroNumber}>{todayReps.toLocaleString()}</Text>
              <Text style={styles.heroSub}>reps so far</Text>
            </GlassCard>

            <Text style={styles.sectionLabel}>ALL TIME</Text>
            <GlassCard style={styles.mb16}>
              <View style={styles.statRow}>
                <Text style={styles.statValue}>{totalReps.toLocaleString()}</Text>
                <Text style={styles.statLabel}>total reps</Text>
              </View>
              <View style={styles.malaTrack}>
                <View style={[styles.malaFill, { width: `${Math.round((intoMala / 108) * 100)}%` }]} />
              </View>
              <Text style={styles.malaCaption}>
                {malas > 0
                  ? `${malas} mala${malas > 1 ? 's' : ''} of 108 complete · ${intoMala}/108 into the next`
                  : `${intoMala}/108 towards your first mala`}
              </Text>
            </GlassCard>

            <View style={styles.gridRow}>
              <GlassCard style={styles.gridTile}>
                <Text style={styles.gridIcon}>📖</Text>
                <Text style={styles.gridValue}>{stats?.total_stories ?? 0}</Text>
                <Text style={styles.gridLabel}>Stories played</Text>
              </GlassCard>
              <GlassCard style={styles.gridTile}>
                <Text style={styles.gridIcon}>✨</Text>
                <Text style={styles.gridValue}>{stats?.total_affirmation_sets ?? 0}</Text>
                <Text style={styles.gridLabel}>Affirmation sets</Text>
              </GlassCard>
            </View>
            <View style={styles.gridRow}>
              <GlassCard style={styles.gridTile}>
                <Text style={styles.gridIcon}>🔥</Text>
                <Text style={styles.gridValue}>{stats?.streak_days ?? 0}</Text>
                <Text style={styles.gridLabel}>Day streak</Text>
              </GlassCard>
              <GlassCard style={styles.gridTile}>
                <Text style={styles.gridIcon}>🧘</Text>
                <Text style={styles.gridValue}>{stats?.total_sessions ?? 0}</Text>
                <Text style={styles.gridLabel}>Total sessions</Text>
              </GlassCard>
            </View>

            <Text style={styles.footNote}>
              Reps come from playing affirmations and stories — go generate or replay one and it'll show up here. ✨
            </Text>
            <View style={styles.btnRow}>
              <Button title="✨ Affirmations" variant="ghost" size="sm" onPress={() => router.push('/affirmations')} />
              <Button title="📖 Stories" variant="ghost" size="sm" onPress={() => router.push('/stories')} />
            </View>
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  mb16: { marginBottom: 16 },

  heroCard: { alignItems: 'center', paddingVertical: 26, marginBottom: 18 },
  heroLabel: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 1.2 },
  heroNumber: { fontFamily: fonts.display, fontSize: 62, color: colors.ink, fontWeight: '300', marginVertical: 2 },
  heroSub: { fontFamily: fonts.body, fontSize: 12, color: colors.mist },

  sectionLabel: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },

  statRow: { alignItems: 'center', marginBottom: 12 },
  statValue: { fontFamily: fonts.displayMedium, fontSize: 30, color: colors.ink, fontWeight: '600' },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.mist, marginTop: 2 },

  malaTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(201,168,201,0.2)', overflow: 'hidden' },
  malaFill: { height: '100%', borderRadius: 3, backgroundColor: colors.purpleMid },
  malaCaption: { fontFamily: fonts.body, fontSize: 11.5, color: colors.mist, marginTop: 8, textAlign: 'center' },

  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  gridTile: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  gridIcon: { fontSize: 20, marginBottom: 6 },
  gridValue: { fontFamily: fonts.displayMedium, fontSize: 20, color: colors.ink, fontWeight: '600' },
  gridLabel: { fontFamily: fonts.body, fontSize: 10.5, color: colors.mist, marginTop: 2, textAlign: 'center' },

  footNote: { fontFamily: fonts.displayItalic, fontSize: 12, color: colors.mist, fontStyle: 'italic', textAlign: 'center', lineHeight: 18, marginTop: 8 },
  btnRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 14 },
});
