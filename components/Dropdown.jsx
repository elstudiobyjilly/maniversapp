import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, radii } from '../constants/theme';

// Inline accordion dropdown — tapping the trigger expands the options directly
// below it in normal layout flow (pushes content down), matching the website's
// inline-panel behavior. No modal, no absolute positioning, no clipping inside
// blurred/glass containers.
export default function Dropdown({ label, value, options, onSelect, fullWidth, disabled }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label || label;

  return (
    <View style={fullWidth ? { width: '100%' } : undefined}>
      <TouchableOpacity
        style={[styles.trigger, fullWidth && styles.triggerFullWidth, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setOpen(!open)}
        disabled={disabled}
      >
        <Text style={[styles.triggerText, disabled && styles.triggerTextDisabled]}>{selectedLabel}</Text>
        {!disabled && <Text style={[styles.chevron, open && styles.chevronOpen]}>▾</Text>}
      </TouchableOpacity>

      {open && !disabled && (
        <View style={styles.panel}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.option, opt.value === value && styles.optionActive]}
              onPress={() => { onSelect(opt.value); setOpen(false); }}
            >
              <Text style={[styles.optionText, opt.value === value && styles.optionTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: radii.sm,
    paddingVertical: 12, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)',
  },
  triggerFullWidth: { width: '100%' },
  triggerDisabled: { opacity: 0.55 },
  triggerText: { fontFamily: fonts.bodyMedium, color: colors.ink, fontSize: 13, fontWeight: '500' },
  triggerTextDisabled: { color: colors.mist2 },
  chevron: { color: colors.mist2, fontSize: 12 },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  panel: {
    backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: radii.sm, marginTop: 6,
    borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', overflow: 'hidden',
  },
  option: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(46,37,48,0.06)' },
  optionActive: { backgroundColor: 'rgba(201,168,201,0.18)' },
  optionText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  optionTextActive: { fontFamily: fonts.bodyMedium, color: colors.purpleDark, fontWeight: '700' },
});
