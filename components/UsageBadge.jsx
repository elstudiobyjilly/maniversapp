import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, radii } from '../constants/theme';

// Ported from the website's _renderUsageBadge() in core.js so the app shows
// the same always-on mini usage tracker next to each generator:
//   "3/30 today · 52/100 this month"
//
// Rules copied exactly from the site:
//   - a leg whose limit is null/undefined is unlimited → that leg is omitted
//   - a leg whose limit is 0 → "unavailable on your plan" (NOT "3/0", which
//     reads as a broken fraction; leftover usage can survive a downgrade)
//   - both limits 0 → "✨ Upgrade to unlock <feature>"
//   - once any leg is at/over its cap the badge turns red and gains ⚠️
export default function UsageBadge({ usedToday, dailyLimit, usedMonth, monthLimit, featureLabel, style }) {
  if (dailyLimit === 0 && monthLimit === 0) {
    return (
      <View style={[styles.badge, styles.badgeCapped, style]}>
        <Text style={[styles.text, styles.textCapped]}>✨ Upgrade to unlock {featureLabel}</Text>
      </View>
    );
  }

  const parts = [];
  let anyCapped = false;

  if (dailyLimit !== undefined && dailyLimit !== null) {
    const used = usedToday || 0;
    if (dailyLimit === 0) {
      parts.push('unavailable on your plan');
      anyCapped = true;
    } else {
      if (used >= dailyLimit) anyCapped = true;
      parts.push(`${used}/${dailyLimit} today`);
    }
  }

  if (monthLimit !== undefined && monthLimit !== null) {
    const used = usedMonth || 0;
    if (monthLimit === 0) {
      if (!parts.some((p) => p.includes('unavailable'))) parts.push('unavailable on your plan');
      anyCapped = true;
    } else {
      if (used >= monthLimit) anyCapped = true;
      parts.push(`${used}/${monthLimit} this month`);
    }
  }

  // Both legs unlimited on this plan — nothing to track.
  if (!parts.length) return null;

  return (
    <View style={[styles.badge, anyCapped && styles.badgeCapped, style]}>
      <Text style={[styles.text, anyCapped && styles.textCapped]}>
        {anyCapped ? '⚠️ ' : ''}{parts.join(' · ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201,168,201,0.18)',
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: 11,
  },
  badgeCapped: { backgroundColor: 'rgba(220,100,100,0.15)' },
  text: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.purpleAccent, fontWeight: '600' },
  textCapped: { color: '#c04040' },
});
