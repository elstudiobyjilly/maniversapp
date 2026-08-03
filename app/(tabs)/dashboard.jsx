import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';
import { getDesires } from '../../services/api';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import Button from '../../components/Button';
import { usePlanStore } from '../../store/planStore';
import { colors, fonts, gradients, radii } from '../../constants/theme';
import { categoryLabel } from '../../constants/desires';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PREVIEW_COLS = SCREEN_WIDTH >= 700 ? 3 : 2;
const PREVIEW_ROWS = 2;
const PREVIEW_CARD_WIDTH = 150;

// A row of equal-width shortcut tiles that jump straight into a tool —
// matches the Home page sketch's grouped 2/3-column shortcut rows.
function ShortcutRow({ items, router }) {
  return (
    <View style={styles.shortcutRow}>
      {items.map((item) => (
        <TouchableOpacity key={item.route} style={styles.shortcutTile} onPress={() => router.push(item.route)}>
          <Text style={styles.shortcutIcon}>{item.icon}</Text>
          <Text style={styles.shortcutLabel}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

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
      setDesires(Array.isArray(d) ? d : []);
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

  const previewDesires = desires.slice(0, PREVIEW_COLS * PREVIEW_ROWS * 2); // a couple of horizontal "pages"

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

        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionHeading}>My Desire Hub</Text>
          <TouchableOpacity onPress={() => router.push('/desire-hub')}>
            <Text style={styles.seeAllLink}>See All ›</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text style={styles.muted}>Loading...</Text>
        ) : previewDesires.length === 0 ? (
          <GlassCard style={styles.cardMargin}>
            <Text style={styles.muted}>No active desires yet — start manifesting ✨</Text>
            <Button title="+ New Desire" onPress={() => router.push('/desire-hub')} style={{ marginTop: 12, alignSelf: 'flex-start' }} size="sm" />
          </GlassCard>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
            <View style={[styles.previewGrid, { width: Math.ceil(previewDesires.length / PREVIEW_ROWS) * (PREVIEW_CARD_WIDTH + 10) }]}>
              {previewDesires.map((d) => (
                <TouchableOpacity key={d.id} style={styles.previewCard} onPress={() => router.push(`/desire/${d.id}`)}>
                  {d.images?.[0] ? (
                    <Image source={{ uri: d.images[0] }} style={styles.previewImage} />
                  ) : (
                    <LinearGradient colors={gradients.avatar} style={styles.previewImage} />
                  )}
                  <View style={styles.previewBody}>
                    <Text style={styles.previewTitle} numberOfLines={1}>{d.title}</Text>
                    <Text style={styles.previewCategory}>{categoryLabel(d.category)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        <View style={styles.shortcutsWrap}>
          <ShortcutRow router={router} items={[
            { icon: '🙏', label: 'Gratitude Entry', route: '/gratitude' },
            { icon: '🗺️', label: 'Desire Action', route: '/desire-action' },
          ]} />
          <ShortcutRow router={router} items={[
            { icon: '🎬', label: 'Mind Movies', route: '/mindmovie' },
            { icon: '🎧', label: 'Subliminal', route: '/subliminal' },
          ]} />
          <ShortcutRow router={router} items={[
            { icon: '💫', label: 'Feel It', route: '/feelit' },
            { icon: '🧘', label: 'Meditate', route: '/meditate' },
            { icon: '🧰', label: 'Tools', route: '/practice-tools' },
          ]} />
          <ShortcutRow router={router} items={[
            { icon: '☀️', label: 'Daily', route: '/daily-intention' },
            { icon: '🏆', label: 'Manifested', route: '/manifested' },
          ]} />
          <ShortcutRow router={router} items={[
            { icon: '🌸', label: 'Community', route: '/community' },
            { icon: '📖', label: 'Read', route: '/discover' },
            { icon: '✅', label: 'Track', route: '/tracker' },
          ]} />
          <ShortcutRow router={router} items={[
            { icon: '🎴', label: 'Aura Card', route: '/aura-card' },
          ]} />
        </View>

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

  sectionHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionHeading: { fontFamily: fonts.displayMedium, fontSize: 17, color: colors.ink, fontWeight: '600' },
  seeAllLink: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.purpleDark, fontWeight: '600' },

  cardMargin: { marginHorizontal: 20, marginBottom: 16 },
  cardTitle: { fontFamily: fonts.displayMedium, fontSize: 16, fontWeight: '600', color: colors.ink, marginBottom: 12 },
  muted: { fontFamily: fonts.body, color: colors.mist, fontSize: 13, lineHeight: 19, marginHorizontal: 20 },

  previewGrid: { flexDirection: 'column', flexWrap: 'wrap', height: (PREVIEW_CARD_WIDTH * 0.75 + 56) * PREVIEW_ROWS + 10 * (PREVIEW_ROWS - 1) },
  previewCard: { width: PREVIEW_CARD_WIDTH, marginRight: 10, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.sm, overflow: 'hidden' },
  previewImage: { width: '100%', height: PREVIEW_CARD_WIDTH * 0.75 },
  previewBody: { padding: 9 },
  previewTitle: { fontFamily: fonts.displayMedium, fontSize: 13, color: colors.ink, fontWeight: '600', marginBottom: 2 },
  previewCategory: { fontFamily: fonts.body, fontSize: 10.5, color: colors.mist },

  shortcutsWrap: { paddingHorizontal: 20, marginBottom: 8 },
  shortcutRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  shortcutTile: { flex: 1, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', borderRadius: radii.sm, paddingVertical: 16, alignItems: 'center' },
  shortcutIcon: { fontSize: 22, marginBottom: 6 },
  shortcutLabel: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.ink, fontWeight: '600', textAlign: 'center' },
});
