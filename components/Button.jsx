import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, shadows, fonts } from '../constants/theme';

// Matches the website's button system exactly:
//   variant="primary" -> .btn-p (pink->purple gradient, white text, glassy inset highlight)
//   variant="ghost"    -> .btn-g (translucent white, pink border, dark text)
//   variant="danger"   -> .btn-danger (soft red, for destructive actions)
// size="sm" -> .btn-sm equivalent (compact, for inline row actions)
export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = null,
  style,
  textStyle,
  fullWidth = false,
}) {
  const isGhost = variant === 'ghost';
  const isDanger = variant === 'danger';
  const sizeStyle = size === 'sm' ? styles.sizeSm : size === 'xs' ? styles.sizeXs : styles.sizeMd;
  const disabledLook = disabled || loading;

  const content = (
    <View style={styles.contentRow}>
      {loading ? (
        <ActivityIndicator color={isGhost ? colors.purpleAccent : '#fff'} size="small" />
      ) : (
        <>
          {icon ? <Text style={styles.icon}>{icon}</Text> : null}
          <Text
            style={[
              styles.text,
              sizeStyle.text,
              isGhost && styles.textGhost,
              isDanger && styles.textDanger,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </View>
  );

  if (isGhost || isDanger) {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        disabled={disabledLook}
        style={[
          styles.base,
          sizeStyle.pad,
          isGhost && styles.ghost,
          isDanger && styles.danger,
          fullWidth && styles.fullWidth,
          disabledLook && styles.disabled,
          style,
        ]}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabledLook}
      style={[styles.shadowWrap, fullWidth && styles.fullWidth, disabledLook && styles.disabled, style]}
    >
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.base, sizeStyle.pad, styles.gradientInner]}
      >
        {content}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadowWrap: { borderRadius: radii.pill, ...shadows.button },
  base: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientInner: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.52)',
  },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.55 },

  ghost: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(248,184,200,0.4)',
  },
  danger: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },

  sizeMd: { pad: { paddingVertical: 14, paddingHorizontal: 24 }, text: { fontSize: 14.5 } },
  sizeSm: { pad: { paddingVertical: 10, paddingHorizontal: 18 }, text: { fontSize: 12.5 } },
  sizeXs: { pad: { paddingVertical: 7, paddingHorizontal: 14 }, text: { fontSize: 11.5 } },

  contentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  icon: { fontSize: 14 },
  text: { fontFamily: fonts.bodyMedium, color: '#fff', fontWeight: '600' },
  textGhost: { color: colors.ink2 },
  textDanger: { color: colors.danger },
});
