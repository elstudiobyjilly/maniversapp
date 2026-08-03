import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { radii, shadows } from '../constants/theme';

// A frosted glass card matching the website's .card class: 65% white,
// blur+saturate, soft mauve-tinted shadow, r-lg (28px) radius, subtle
// bright top inset border to read as "glass" rather than flat white.
// tint: 'light' | 'dark' | 'default'
export default function GlassCard({ children, style, tint = 'light', intensity = 40, noPadding = false }) {
  return (
    <View style={[styles.wrapper, style]}>
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
      <View style={styles.tintOverlay} pointerEvents="none" />
      <View style={[styles.content, noPadding && { padding: 0 }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(248,184,200,0.22)',
    ...shadows.card,
  },
  tintOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  content: {
    padding: 20,
  },
});
