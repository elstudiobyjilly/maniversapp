import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { colors, fonts, radii } from '../../constants/theme';
import { usePlanStore } from '../../store/planStore';
import { getSessionStats, getMindMovies, getSubSessions, getSubscriptionStatus } from '../../services/api';

// Same "used / N" vs "used" formatting the website's Tracker uses: paid
// plans with no daily/monthly ceiling just show a plain count, everyone
// else sees the ceiling too so they know when they'll hit the wall.
function fmtUsage(used, limit) {
  const u = used || 0;
  if (limit === null || limit === undefined) return `${u}`;
  return `${u} / ${limit}`;
}
function pct(used, limit) {
  if (limit === null || limit === undefined || limit === 0) return limit === 0 ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round(((used || 0) / limit) * 100)));
}
function minutesUntilMidnightUTC() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  const ms = next - now;
  return { h: Math.floor(ms / 3600000), m: Math.floor((ms % 3600000) / 60000) };
}

function StatTile({ icon, value, label }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function UsageBar({ label, used, limit, locked }) {
  return (
    <View style={styles.usageRow}>
      <View style={styles.usageHeadRow}>
        <Text style={styles.usageLabel}>{label}</Text>
        <Text style={[styles.usageValue, locked && styles.usageValueLocked]}>
          {locked ? '🔒 locked' : fmtUsage(used, limit)}
        </Text>
      </View>
      <View style={styles.usageBarTrack}>
        <View style={[styles.usageBarFill, { width: `${locked ? 100 : pct(used, limit)}%` }, locked && styles.usageBarFillLocked]} />
      </View>
    </View>
  );
}

export default function Tracker() {
  const router = useRouter();
  const { plan, limits, loaded, refresh } = usePlanStore();
  const isFree = plan === 'free';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [mmCount, setMmCount] = useState(null);
  const [subCount, setSubCount] = useState(null);
  const [status, setStatus] = useState(null);

  const load = useCallback(async () => {
    refresh();
    setLoading(true);
    try {
      const [s, status] = await Promise.all([
        getSessionStats(),
        getSubscriptionStatus().catch(() => null),
      ]);
      setStats(s);
      setStatus(status);
    } catch (_) {}
    try {
      const mm = await getMindMovies();
      setMmCount(Array.isArray(mm) ? mm.filter((m) => m.is_draft === false || m.is_draft === undefined).length : 0);
    } catch (_) { setMmCount(null); }
    try {
      const subs = await getSubSessions();
      setSubCount(Array.isArray(subs) ? subs.length : 0);
    } catch (_) { setSubCount(null); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const reset = minutesUntilMidnightUTC();
  const du = status?.daily_usage || {};
  const dl = status?.daily_limits || {};
  const au = status?.ai_usage || {};

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: 40 }}>
        <ScreenHeader lead="Your" accent="Tracker" subtitle="Your practice, at a glance ✨" />

        {loading && !stats ? (
          <ActivityIndicator color="#c9a8c9" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Streak hero */}
            <GlassCard style={styles.heroCard}>
              <Text style={styles.heroFlame}>🔥</Text>
              <Text style={styles.heroNumber}>{stats?.streak_days ?? 0}</Text>
              <Text style={styles.heroLabel}>day streak</Text>
              <Text style={styles.heroSub}>{stats?.days_practiced ?? 0} days practiced total</Text>
            </GlassCard>

            {/* Overview grid */}
            <Text style={styles.sectionLabel}>OVERVIEW</Text>
            <View style={styles.statGrid}>
              <StatTile icon="🧘" value={stats?.total_sessions ?? 0} label="Total Sessions" />
              <StatTile icon="🔁" value={(stats?.total_affirmations_repeated ?? 0).toLocaleString()} label="Total Reps" />
              <StatTile icon="✨" value={stats?.total_affirmation_sets ?? 0} label="Affirmation Sets" />
              <StatTile icon="📖" value={stats?.total_stories ?? 0} label="Stories" />
              <StatTile icon="🎬" value={mmCount ?? '—'} label="Mind Movies" />
              <StatTile icon="🎧" value={subCount ?? '—'} label="Subliminal Sessions" />
            </View>

            {/* Today */}
            <Text style={styles.sectionLabel}>TODAY</Text>
            <GlassCard style={styles.mb16}>
              <View style={styles.todayRow}>
                <View style={styles.todayItem}>
                  <Text style={styles.todayValue}>{stats?.today_sessions ?? 0}</Text>
                  <Text style={styles.todayLabel}>Sessions</Text>
                </View>
                <View style={styles.todayDivider} />
                <View style={styles.todayItem}>
                  <Text style={styles.todayValue}>{(stats?.today_repeats ?? 0).toLocaleString()}</Text>
                  <Text style={styles.todayLabel}>Reps</Text>
                </View>
              </View>

              <View style={styles.hr} />

              <UsageBar label="Affirmations written" used={du.own_affirmations} limit={dl.own_affirmations} />
              <UsageBar label="Stories written" used={du.own_stories} limit={dl.own_stories} />
              <UsageBar label="Voice plays (TTS)" used={du.hf_tts} limit={dl.hf_tts} />

              <Text style={styles.resetLabel}>Resets in {reset.h}h {reset.m}m</Text>
            </GlassCard>

            {/* This month (AI usage) */}
            <Text style={styles.sectionLabel}>THIS MONTH</Text>
            <GlassCard style={styles.mb16}>
              <UsageBar
                label="AI Affirmations"
                used={au.affirmations}
                limit={limits?.ai_affirmations}
                locked={limits?.ai_affirmations === 0}
              />
              <UsageBar
                label="AI Stories"
                used={au.stories}
                limit={limits?.ai_stories}
                locked={limits?.ai_stories === 0}
              />
              <UsageBar
                label="Mind Movies (active)"
                used={mmCount}
                limit={limits?.mind_movies_active}
                locked={limits?.mind_movies_active === 0}
              />
            </GlassCard>

            {/* Free plan limits callout */}
            {isFree && loaded && (
              <GlassCard style={styles.freeCard}>
                <Text style={styles.freeTitle}>✨ Your Free Plan Limits</Text>
                <View style={styles.freeGrid}>
                  <Text style={styles.freeRow}>• {limits?.own_affirmations_total ?? 20} affirmations total, no refund</Text>
                  <Text style={styles.freeRow}>• {limits?.own_stories_total ?? 2} stories total, no refund</Text>
                  <Text style={styles.freeRow}>• {limits?.desires_total ?? 2} desires total</Text>
                  <Text style={styles.freeRow}>• {limits?.feelit_cards_total ?? 6} Feel It cards total</Text>
                  <Text style={styles.freeRow}>• {limits?.roadmaps_total ?? 2} desire action trackers total</Text>
                  <Text style={styles.freeRow}>• Mind Movies, Vision Board & custom Subliminal are locked</Text>
                </View>
                <Button title="✨ See Plans" size="sm" onPress={() => router.push('/profile')} style={{ marginTop: 14 }} />
              </GlassCard>
            )}
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  mb16: { marginBottom: 16 },

  heroCard: { alignItems: 'center', paddingVertical: 26, marginBottom: 20 },
  heroFlame: { fontSize: 34, marginBottom: 2 },
  heroNumber: { fontFamily: fonts.display, fontSize: 44, color: colors.ink, fontWeight: '400' },
  heroLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.purpleDark, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: -4 },
  heroSub: { fontFamily: fonts.body, fontSize: 12.5, color: colors.mist, marginTop: 8 },

  sectionLabel: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20, justifyContent: 'center' },
  statTile: {
    width: '31.5%',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.25)',
    paddingVertical: 16,
    alignItems: 'center',
  },
  statIcon: { fontSize: 20, marginBottom: 6 },
  statValue: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, fontWeight: '400' },
  statLabel: { fontFamily: fonts.body, fontSize: 10.5, color: colors.mist, textAlign: 'center', marginTop: 4 },

  todayRow: { flexDirection: 'row', alignItems: 'center' },
  todayItem: { flex: 1, alignItems: 'center' },
  todayDivider: { width: 1, height: 34, backgroundColor: 'rgba(154,95,168,0.15)' },
  todayValue: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  todayLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.mist, marginTop: 2 },
  hr: { height: 1, backgroundColor: 'rgba(154,95,168,0.12)', marginVertical: 16 },

  usageRow: { marginBottom: 14 },
  usageHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  usageLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink2, fontWeight: '500' },
  usageValue: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.purpleDark, fontWeight: '600' },
  usageValueLocked: { color: colors.mist2 },
  usageBarTrack: { height: 7, backgroundColor: 'rgba(154,95,168,0.12)', borderRadius: radii.pill, overflow: 'hidden' },
  usageBarFill: { height: '100%', backgroundColor: '#c9a8c9', borderRadius: radii.pill },
  usageBarFillLocked: { backgroundColor: 'rgba(154,95,168,0.2)' },
  resetLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.mist2, textAlign: 'center', marginTop: 4 },

  freeCard: { backgroundColor: 'rgba(248,184,200,0.14)', borderColor: 'rgba(248,184,200,0.35)' },
  freeTitle: { fontFamily: fonts.displayMedium, fontSize: 16, color: colors.ink, marginBottom: 10 },
  freeGrid: { gap: 6 },
  freeRow: { fontFamily: fonts.body, fontSize: 12.5, color: colors.ink2, lineHeight: 19 },
});
