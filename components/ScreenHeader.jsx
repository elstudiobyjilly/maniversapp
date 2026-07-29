import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../constants/theme';

// Matches the website's page-title pattern: serif display font, plain
// weight lead-in word + italic accent word (e.g. "Your Affirmations",
// "Mind Movie"), with a muted DM Sans subtitle underneath.
// Usage: <ScreenHeader lead="Your" accent="Affirmations" subtitle="..." />
export default function ScreenHeader({ lead, accent, subtitle, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.title}>
        {lead ? `${lead} ` : ''}
        <Text style={styles.accent}>{accent}</Text>
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.ink, fontWeight: '400' },
  accent: { fontFamily: fonts.displayItalic, color: colors.purpleDark, fontStyle: 'italic' },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.mist, marginTop: 6, lineHeight: 19 },
});
