import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, fonts, radii } from '../../constants/theme';

const SECTIONS = [
  {
    title: 'Daily Practice',
    tools: [
      { key: 'methods', label: 'Practice Methods', icon: 'flower-outline', desc: '369, scripting, mirror work & more' },
      { key: 'meditate', label: 'Meditate', icon: 'leaf-outline', desc: 'Breath timer, med timer, guided sessions' },
      { key: 'daily-intention', label: 'Daily Intention', icon: 'sunny-outline', desc: 'Set your focus for today' },
      { key: 'scripting', label: 'Scripting', icon: 'create-outline', desc: 'Script your day as it happens' },
      { key: 'reps', label: 'Reps', icon: 'repeat-outline', desc: 'Daily affirmation rep counter' },
      { key: 'tracker', label: 'Habit Tracker', icon: 'checkmark-circle-outline', desc: 'Build your manifestation habits' },
      { key: 'gratitude', label: 'Gratitude', icon: 'heart-outline', desc: 'Daily gratitude journal' },
      { key: 'journal', label: 'Journal', icon: 'book-outline', desc: 'Free-write reflections' },
    ],
  },
  {
    title: 'Mindset & Healing',
    tools: [
      { key: 'feelit', label: 'Feel It', icon: 'pulse-outline', desc: 'Move through any feeling' },
      { key: 'beliefs', label: 'Limiting Beliefs', icon: 'bulb-outline', desc: 'Reframe what holds you back' },
      { key: 'letgo', label: 'Let Go', icon: 'leaf-outline', desc: 'Release what no longer serves you' },
      { key: 'identity', label: 'Identity', icon: 'star-outline', desc: '"I am..." statements' },
      { key: 'futureself', label: 'Future Self', icon: 'person-outline', desc: 'Letters from who you\'re becoming' },
    ],
  },
  {
    title: 'Insights',
    tools: [
      { key: 'oracle', label: 'Oracle Cards', icon: 'sparkles-outline', desc: 'Pull your monthly message' },
      { key: 'horoscope', label: 'Horoscope', icon: 'planet-outline', desc: 'Daily manifestation reading' },
      { key: 'synclog', label: 'Synchronicity Log', icon: 'flash-outline', desc: 'Track signs from the universe' },
    ],
  },
  {
    title: 'Planning & Wins',
    tools: [
      { key: 'desire-action', label: 'Desire Action', icon: 'footsteps-outline', desc: 'Daily practice tracker per desire' },
      { key: 'manifested', label: 'Manifested', icon: 'trophy-outline', desc: 'Celebrate your wins' },
      { key: 'abundance-cheque', label: 'Abundance Cheque', icon: 'cash-outline', desc: 'Visualize receiving' },
    ],
  },
  {
    title: 'Community',
    tools: [
      { key: 'community', label: 'Community Feed', icon: 'people-outline', desc: 'Share intentions with others' },
      { key: 'discover', label: 'Discover', icon: 'compass-outline', desc: 'Posts, guides & all 17 techniques' },
      { key: 'reviews', label: 'Reviews', icon: 'chatbubble-ellipses-outline', desc: 'See what others are saying' },
    ],
  },
  {
    title: 'Create & Share',
    tools: [
      { key: 'aura-card', label: 'Aura Card', icon: 'color-palette-outline', desc: 'Generate a shareable aura card' },
    ],
  },
  {
    title: 'Fun Tools',
    tools: [
      { key: 'practice-tools', label: 'Practice Tools', icon: 'sparkles-outline', desc: 'All 10 manifestation tools, one page' },
    ],
  },
];

export default function More() {
  const router = useRouter();

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <ScreenHeader lead="More T" accent="ools" subtitle="Every practice, all in one place ✨" />

        {SECTIONS.map((section) => (
          <View key={section.title} style={{ marginBottom: 18 }}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <GlassCard noPadding style={styles.sectionCard}>
              {section.tools.map((tool, i) => (
                <TouchableOpacity
                  key={tool.key}
                  style={[styles.row, i < section.tools.length - 1 && styles.rowDivider]}
                  onPress={() => router.push(`/${tool.key}`)}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons name={tool.icon} size={20} color={colors.purpleDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{tool.label}</Text>
                    <Text style={styles.rowDesc}>{tool.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.mist2} />
                </TouchableOpacity>
              ))}
            </GlassCard>
          </View>
        ))}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.purpleDark, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginLeft: 4 },
  sectionCard: {},
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(154,95,168,0.12)' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.55)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowTitle: { fontFamily: fonts.bodyMedium, fontSize: 14, fontWeight: '600', color: colors.ink, marginBottom: 2 },
  rowDesc: { fontFamily: fonts.body, fontSize: 11, color: colors.mist },
});





