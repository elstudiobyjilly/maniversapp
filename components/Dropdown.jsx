import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView, Dimensions } from 'react-native';
import { colors, fonts, radii, shadows } from '../constants/theme';

// Floating overlay dropdown — tapping the trigger opens the option list as a
// popover positioned just below it, on top of the page (matches the
// website's floating panel). It never pushes surrounding content down like
// an inline accordion would.
export default function Dropdown({ label, value, options, onSelect, fullWidth, disabled, compact }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const selectedLabel = options.find((o) => o.value === value)?.label || label;

  const openMenu = () => {
    if (disabled) return;
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const screenH = Dimensions.get('window').height;
      const maxMenuHeight = 280;
      const openUpward = y + height + maxMenuHeight > screenH - 40;
      setPos({ x, y, width, height, openUpward });
      setOpen(true);
    });
  };

  return (
    <View style={fullWidth ? { width: '100%' } : undefined}>
      <TouchableOpacity
        ref={triggerRef}
        style={[styles.trigger, fullWidth && styles.triggerFullWidth, compact && styles.triggerCompact, disabled && styles.triggerDisabled]}
        onPress={openMenu}
        disabled={disabled}
      >
        <Text style={[styles.triggerText, compact && styles.triggerTextCompact, disabled && styles.triggerTextDisabled]} numberOfLines={1}>{selectedLabel}</Text>
        {!disabled && <Text style={[styles.chevron, compact && styles.chevronCompact, open && styles.chevronOpen]}>▾</Text>}
      </TouchableOpacity>

      {open && pos && (
        <Modal transparent visible animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)}>
            <View
              style={[
                styles.panel,
                {
                  position: 'absolute',
                  left: pos.x,
                  width: Math.max(pos.width, 180),
                  maxHeight: 280,
                  ...(pos.openUpward
                    ? { bottom: Dimensions.get('window').height - pos.y + 6 }
                    : { top: pos.y + pos.height + 6 }),
                },
              ]}
            >
              <ScrollView bounces={false}>
                {options.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.option, opt.value === value && styles.optionActive]}
                    onPress={() => { onSelect(opt.value); setOpen(false); }}
                  >
                    <Text style={[styles.optionText, opt.value === value && styles.optionTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: radii.pill,
    paddingVertical: 9, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)',
  },
  triggerFullWidth: { width: '100%' },
  triggerCompact: { paddingVertical: 6, paddingHorizontal: 10, gap: 3 },
  triggerDisabled: { opacity: 0.55 },
  triggerText: { fontFamily: fonts.bodyMedium, color: colors.ink, fontSize: 12.5, fontWeight: '500' },
  triggerTextCompact: { fontSize: 10.5 },
  triggerTextDisabled: { color: colors.mist2 },
  chevron: { color: colors.mist2, fontSize: 12 },
  chevronCompact: { fontSize: 10 },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  panel: {
    backgroundColor: '#fff', borderRadius: radii.sm,
    borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', overflow: 'hidden',
    ...shadows.card,
  },
  option: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(46,37,48,0.06)' },
  optionActive: { backgroundColor: 'rgba(201,168,201,0.18)' },
  optionText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  optionTextActive: { fontFamily: fonts.bodyMedium, color: colors.purpleDark, fontWeight: '700' },
});
