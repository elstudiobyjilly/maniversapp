import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, gradients, radii } from '../constants/theme';

// Selectable pill chip — used for style/voice/category/preset pickers
// across Affirmations, Stories, Vision Board upsells, etc. Active state
// uses the same pink->purple gradient as the primary button for
// consistency with the website's chip-active treatment.
export default function Chip({ label, active, onPress, locked = false, disabled = false }) {
  if (active && !locked) {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.85}>
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chip}>
          <Text style={styles.textActive} numberOfLines={1}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[styles.chip, styles.chipInactive, locked && styles.chipLocked]}
    >
      <Text style={[styles.text, locked && styles.textLocked]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    justifyContent: 'center',
  },
  chipInactive: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.3)',
  },
  chipLocked: { opacity: 0.55 },
  text: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.mist, fontWeight: '500' },
  textActive: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: '#fff', fontWeight: '700' },
  textLocked: { color: colors.mist2 },
});
