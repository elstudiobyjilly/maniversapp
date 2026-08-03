import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, SafeAreaView } from 'react-native';
import { colors, fonts, radii } from '../constants/theme';

// A multiline TextInput with a small expand button (⛶, top-right corner)
// that opens the same text in a full-screen modal for comfortable long-form
// writing — matches the website's textarea expand affordance.
export default function ExpandableTextArea({
  value,
  onChangeText,
  placeholder,
  minHeight = 90,
  modalTitle = 'Write',
  style,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.box, { minHeight }, style]}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="rgba(46,37,48,0.4)"
        value={value}
        onChangeText={onChangeText}
        multiline
        textAlignVertical="top"
      />
      <TouchableOpacity style={styles.expandBtn} onPress={() => setExpanded(true)} hitSlop={8}>
        <Text style={styles.expandIcon}>⛶</Text>
      </TouchableOpacity>

      <Modal visible={expanded} animationType="slide" onRequestClose={() => setExpanded(false)}>
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <TouchableOpacity onPress={() => setExpanded(false)} hitSlop={10}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.modalInput}
            placeholder={placeholder}
            placeholderTextColor="rgba(46,37,48,0.4)"
            value={value}
            onChangeText={onChangeText}
            multiline
            textAlignVertical="top"
            autoFocus
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5, borderColor: 'rgba(154,95,168,0.3)', borderRadius: radii.sm,
    padding: 12, paddingRight: 34, backgroundColor: 'rgba(255,255,255,0.5)',
  },
  input: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, flex: 1 },
  expandBtn: { position: 'absolute', top: 8, right: 8, padding: 4 },
  expandIcon: { fontSize: 13, color: colors.mist2 },

  modalRoot: { flex: 1, backgroundColor: colors.white },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(201,168,201,0.2)' },
  modalTitle: { fontFamily: fonts.displayMedium, fontSize: 18, color: colors.ink },
  modalDone: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.purpleDark, fontWeight: '700' },
  modalInput: { flex: 1, padding: 20, fontFamily: fonts.body, fontSize: 15, color: colors.ink, lineHeight: 22 },
});
