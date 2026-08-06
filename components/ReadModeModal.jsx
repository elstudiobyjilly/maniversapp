// ReadModeModal.jsx — distraction-free full-text reading view, matching the
// website's "Read mode" (A-/A+ font size, ~N min estimate, Listen pill,
// Close) that opens from a story/affirmation's expand affordance.
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii } from '../constants/theme';

const MIN_FONT = 15;
const MAX_FONT = 26;
const FONT_STEP = 2;

// ~200 words/minute, same rough estimate the website uses.
function estimateMinutes(text) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export default function ReadModeModal({ visible, onClose, title, content, onListen, kicker = 'Story' }) {
  const insets = useSafeAreaInsets();
  const [fontSize, setFontSize] = useState(18);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
        <View style={styles.topBar}>
          <View style={styles.fontControls}>
            <TouchableOpacity style={styles.fontBtn} onPress={() => setFontSize((s) => Math.max(MIN_FONT, s - FONT_STEP))}>
              <Text style={styles.fontBtnText}>A-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fontBtn} onPress={() => setFontSize((s) => Math.min(MAX_FONT, s + FONT_STEP))}>
              <Text style={styles.fontBtnText}>A+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕ Close</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>✨ {title}</Text>
          <View style={styles.titleRight}>
            <Text style={styles.readTime}>~{estimateMinutes(content)} min</Text>
            {onListen && (
              <TouchableOpacity style={styles.listenBtn} onPress={onListen}>
                <Text style={styles.listenBtnText}>🎧 Listen</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: insets.bottom + 40 }}>
          <Text style={styles.hint}>✨ Feel every word. You are already living this. ✨</Text>
          <Text style={[styles.body, { fontSize, lineHeight: fontSize * 1.55 }]}>{content}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdfbfe' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  fontControls: { flexDirection: 'row', gap: 8 },
  fontBtn: { width: 38, height: 34, borderRadius: radii.pill, backgroundColor: 'rgba(201,168,201,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)' },
  fontBtnText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.purpleDark, fontWeight: '700' },
  closeBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: 'rgba(201,168,201,0.15)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)' },
  closeBtnText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.ink2, fontWeight: '600' },

  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 6, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(201,168,201,0.15)' },
  title: { flex: 1, fontFamily: fonts.displayItalic, fontSize: 20, color: colors.ink, fontStyle: 'italic', marginRight: 12 },
  titleRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  readTime: { fontFamily: fonts.body, fontSize: 12, color: colors.mist },
  listenBtn: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: radii.pill, backgroundColor: colors.purpleMid },
  listenBtnText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: '#fff', fontWeight: '700' },

  hint: { fontFamily: fonts.displayItalic, fontSize: 13, color: colors.purpleDark, fontStyle: 'italic', textAlign: 'center', marginBottom: 24 },
  body: { fontFamily: fonts.display, color: colors.ink2 },
});
