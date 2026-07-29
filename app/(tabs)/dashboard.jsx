import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';
import { getDesires } from '../../services/api';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import Button from '../../components/Button';
import { usePlanStore } from '../../store/planStore';
import { colors, fonts, radii } from '../../constants/theme';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const { limits, loaded: planLoaded, plan, refresh: refreshPlan } = usePlanStore();
  const [desires, setDesires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDesires = async () => {
    try {
      const d = await getDesires();
      setDesires(Array.isArray(d) ? d.filter(x => x.status === 'active') : []);
    } catch (_) {}
  };

  useEffect(() => {
    refreshPlan();
    loadDesires().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDesires();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const aiUsage = user?.ai_usage || {};
  const aiMonthlyCap = limits?.ai_affirmations;
  const affUsed = aiUsage.affirmations || 0;
  const affLeft = typeof aiMonthlyCap === 'number' ? Math.max(0, aiMonthlyCap - affUsed) : null;

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purpleMid} />}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome, <Text style={styles.greetingAccent}>{user?.full_name?.split(' ')[0] || user?.username}</Text> 🌸</Text>
          <Text style={styles.planBadge}>{user?.plan?.toUpperCase()} · {user?.plan_status}</Text>
        </View>

        <GlassCard style={styles.cardMargin}>
          <Text style={styles.cardTitle}>Active Desires</Text>
          {loading ? (
            <Text style={styles.muted}>Loading...</Text>
          ) : desires.length === 0 ? (
            <Text style={styles.muted}>No active desires yet — start manifesting ✨</Text>
          ) : (
            desires.map((d) => (
              <View key={d.id} style={styles.desireRow}>
                <Text style={styles.desireTitle}>{d.title}</Text>
                <Text style={styles.desireMeta}>
                  {Object.values(d.link_counts || {}).reduce((a, b) => a + b, 0)} linked items
                </Text>
              </View>
            ))
          )}
        </GlassCard>

        {planLoaded && plan === 'free' && (
          <GlassCard style={styles.cardMargin}>
            <Text style={styles.cardTitle}>AI Affirmations</Text>
            <Text style={styles.muted}>AI-generated affirmations are a Basic Manifestor feature -- try Write Your Own for free, or upgrade for AI generation.</Text>
          </GlassCard>
        )}
        {planLoaded && plan !== 'free' && aiMonthlyCap != null && (
          <GlassCard style={styles.cardMargin}>
            <Text style={styles.cardTitle}>AI Usage This Month</Text>
            <Text style={styles.muted}>{affLeft} / {aiMonthlyCap} affirmation generations left</Text>
          </GlassCard>
        )}

        <Button title="Log out" variant="danger" onPress={handleLogout} style={{ alignSelf: 'center', marginTop: 8, marginBottom: 40 }} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: { padding: 24, paddingTop: 50, alignItems: 'center' },
  greeting: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, marginBottom: 6, textAlign: 'center', fontWeight: '400' },
  greetingAccent: { fontFamily: fonts.displayItalic, color: colors.purpleDark, fontWeight: '500', fontStyle: 'italic' },
  planBadge: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.mist, letterSpacing: 1 },
  cardMargin: { marginHorizontal: 20, marginBottom: 16 },
  cardTitle: { fontFamily: fonts.displayMedium, fontSize: 16, fontWeight: '600', color: colors.ink, marginBottom: 12 },
  muted: { fontFamily: fonts.body, color: colors.mist, fontSize: 13, lineHeight: 19 },
  desireRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(154,95,168,0.15)' },
  desireTitle: { fontFamily: fonts.bodyMedium, color: colors.ink, fontSize: 14, fontWeight: '500' },
  desireMeta: { fontFamily: fonts.body, color: colors.mist, fontSize: 12, marginTop: 2 },
});
