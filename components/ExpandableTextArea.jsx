import { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, SafeAreaView } from 'react-native';
import { colors, fonts, radii } from '../constants/theme';

// A multiline TextInput with a small expand button (⛶, top-right corner)
// that opens the same text in a full-screen modal for comfortable long-form
// writing — matches the website's textarea expand affordance.
export default function ExpandableTextArea({
  value,
  onChangeText,
  placeholder,
  minHeight = 140,
  modalTitle = 'Write',
  style,
  onBlur,
}) {
  const [expanded, setExpanded] = useState(false);
  const [focused, setFocused] = useState(false);
  const modalInputRef = useRef(null);

  // The wrapper View's minHeight only creates real tappable space if the
  // TextInput itself is tall enough to fill it -- a wrapper-only minHeight
  // (matching the bug fixed elsewhere on desire-hub/desire detail) leaves a
  // dead strip below a content-sized single-line input that never receives
  // touches, so the box looks tappable but the keyboard never opens there.
  // Subtract the box's vertical padding so the input's own minHeight lines
  // up with the wrapper's.
  const innerMinHeight = Math.max(0, minHeight - styles.box.paddingVertical * 2);

  return (
    <View style={[styles.box, { minHeight }, focused && styles.boxFocused, style]}>
      <TextInput
        style={[styles.input, { minHeight: innerMinHeight }]}
        placeholder={placeholder}
        placeholderTextColor="rgba(46,37,48,0.4)"
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur?.(); }}
        multiline
        textAlignVertical="top"
      />
      <TouchableOpacity style={styles.expandBtn} onPress={() => setExpanded(true)} hitSlop={8}>
        <Text style={styles.expandIcon}>⛶</Text>
      </TouchableOpacity>

      {/* Modal only mounts once actually opened -- RN keeps a Modal's subtree
          mounted even while visible={false}, so an always-present autoFocus
          TextInput inside it was silently contesting focus with the inline
          box's own TextInput the instant this component rendered, causing
          the keyboard to pop up and immediately retract on tap. Mounting the
          Modal conditionally, and focusing on its onShow instead of
          autoFocus, keeps that hidden input from ever existing until needed. */}
      {expanded && (
        <Modal visible animationType="slide" onRequestClose={() => setExpanded(false)} onShow={() => modalInputRef.current?.focus()}>
          <SafeAreaView style={styles.modalRoot}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <TouchableOpacity onPress={() => setExpanded(false)} hitSlop={10}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              ref={modalInputRef}
              style={styles.modalInput}
              placeholder={placeholder}
              placeholderTextColor="rgba(46,37,48,0.4)"
              value={value}
              onChangeText={onChangeText}
              multiline
              textAlignVertical="top"
            />
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Thinner, lighter border than a typical card outline (matches the
  // website's barely-there .inp border) — a heavy border read as boxy/
  // square rather than a clean rectangle.
  box: {
    borderWidth: 1, borderColor: 'rgba(201,168,201,0.22)', borderRadius: radii.sm,
    paddingVertical: 14, paddingHorizontal: 16, paddingRight: 36, backgroundColor: 'rgba(255,255,255,0.9)',
  },
  // Neon glow ring on focus -- matches the website's .inp:focus (mauve
  // border + soft pink halo). RN shadow doesn't render a crisp uniform
  // ring like CSS box-shadow, so this leans on a thicker vivid border
  // plus a wide, saturated shadow to read as a glow on both platforms.
  boxFocused: {
    borderWidth: 1.5,
    borderColor: colors.pinkAccent,
    shadowColor: colors.pinkAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  input: { fontFamily: fonts.body, fontSize: 16, color: colors.ink, flex: 1, lineHeight: 24 },
  expandBtn: { position: 'absolute', top: 8, right: 8, padding: 4 },
  expandIcon: { fontSize: 13, color: colors.mist2 },

  modalRoot: { flex: 1, backgroundColor: colors.white },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(201,168,201,0.2)' },
  modalTitle: { fontFamily: fonts.displayMedium, fontSize: 18, color: colors.ink },
  modalDone: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.purpleDark, fontWeight: '700' },
  modalInput: { flex: 1, padding: 20, fontFamily: fonts.body, fontSize: 15, color: colors.ink, lineHeight: 22 },
});
