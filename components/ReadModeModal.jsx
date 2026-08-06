// ReadModeModal.jsx — distraction-free reading view, matching the website's
// Read Mode: A-/A+ font size, a Focus/All toggle (Focus = one swipeable
// line at a time with pagination dots; All = every line stacked, current
// one highlighted), and a Play Aloud button back to the audio player.
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii } from '../constants/theme';

const MIN_FONT = 15;
const MAX_FONT = 26;
const FONT_STEP = 2;
const SCREEN_WIDTH = Dimensions.get('window').width;

// Rough sentence split for stories (the website tracks "Sentence N/M" the
// same way) -- affirmation sets pass their real per-line array instead via
// the `lines` prop, so this only kicks in when `lines` isn't given.
// Avoids a lookbehind assertion (not reliably supported across every
// Hermes version) by marking each split point with a lookahead-only match
// against a placeholder token that can't occur in real text, then
// splitting on that token -- same result as a lookbehind split, with no
// risk of the regex itself throwing at runtime.
const SPLIT_TOKEN = '';
function splitSentences(text) {
  return (text || '')
    .replace(/([.!?])\s+(?=[A-Z"'])/g, `$1${SPLIT_TOKEN}`)
    .split(SPLIT_TOKEN)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ReadModeModal({ visible, onClose, title, content, lines, onListen, kicker = 'Story' }) {
  const insets = useSafeAreaInsets();
  const [fontSize, setFontSize] = useState(18);
  const [mode, setMode] = useState('focus'); // 'focus' | 'all'
  const [focusIndex, setFocusIndex] = useState(0);

  if (!visible) return null;

  const items = (lines && lines.length ? lines : splitSentences(content));
  const focusItem = items[Math.min(focusIndex, items.length - 1)] || content;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
        <View style={styles.topBar}>
          <Text style={styles.brand}>Manivers ✨</Text>
          <View style={styles.modeToggle}>
            <TouchableOpacity style={[styles.modeTab, mode === 'focus' && styles.modeTabOn]} onPress={() => setMode('focus')}>
              <Text style={[styles.modeTabText, mode === 'focus' && styles.modeTabTextOn]}>Focus</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeTab, mode === 'all' && styles.modeTabOn]} onPress={() => setMode('all')}>
              <Text style={[styles.modeTabText, mode === 'all' && styles.modeTabTextOn]}>All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.fontControls}>
            <TouchableOpacity style={styles.fontBtn} onPress={() => setFontSize((s) => Math.max(MIN_FONT, s - FONT_STEP))}>
              <Text style={styles.fontBtnText}>A-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fontBtn} onPress={() => setFontSize((s) => Math.min(MAX_FONT, s + FONT_STEP))}>
              <Text style={styles.fontBtnText}>A+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕ Exit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {mode === 'focus' ? (
          <View style={styles.focusWrap}>
            <View style={styles.focusCard}>
              <ScrollView>
                <Text style={[styles.focusText, { fontSize, lineHeight: fontSize * 1.5 }]}>"{focusItem}"</Text>
              </ScrollView>
              {items.length > 1 && <Text style={styles.swipeHint}>← swipe to browse →</Text>}
            </View>

            {items.length > 1 && (
              <View style={styles.dotsRow}>
                {items.map((_, i) => (
                  <TouchableOpacity key={i} onPress={() => setFocusIndex(i)}>
                    <View style={[styles.dot, i === focusIndex && styles.dotOn]} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {items.length > 1 && (
              <View style={styles.focusNavRow}>
                <TouchableOpacity
                  style={[styles.focusNavBtn, focusIndex === 0 && styles.focusNavBtnDisabled]}
                  onPress={() => setFocusIndex((i) => Math.max(0, i - 1))}
                  disabled={focusIndex === 0}
                >
                  <Text style={styles.focusNavBtnText}>‹ Prev</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.focusNavBtn, focusIndex === items.length - 1 && styles.focusNavBtnDisabled]}
                  onPress={() => setFocusIndex((i) => Math.min(items.length - 1, i + 1))}
                  disabled={focusIndex === items.length - 1}
                >
                  <Text style={styles.focusNavBtnText}>Next ›</Text>
                </TouchableOpacity>
              </View>
            )}

            {onListen && (
              <TouchableOpacity style={styles.playAloudBtn} onPress={onListen}>
                <Text style={styles.playAloudBtnText}>▶ Play Aloud</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: insets.bottom + 40 }}>
            <Text style={styles.allTitle}>✨ {title}</Text>
            {items.map((line, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => { setFocusIndex(i); setMode('focus'); }}
                style={[styles.allLineCard, i === focusIndex && styles.allLineCardOn]}
              >
                <Text style={[styles.allLineText, { fontSize, lineHeight: fontSize * 1.5 }, i === focusIndex && styles.allLineTextOn]}>
                  "{line}"
                </Text>
              </TouchableOpacity>
            ))}
            {onListen && (
              <TouchableOpacity style={[styles.playAloudBtn, { alignSelf: 'center', marginTop: 10 }]} onPress={onListen}>
                <Text style={styles.playAloudBtnText}>▶ Play Aloud</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fdf2f8' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 },
  brand: { fontFamily: fonts.displayItalic, fontSize: 15, color: colors.purpleDark, fontStyle: 'italic' },

  modeToggle: { flexDirection: 'row', backgroundColor: 'rgba(201,168,201,0.15)', borderRadius: radii.pill, padding: 3 },
  modeTab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: radii.pill },
  modeTabOn: { backgroundColor: '#fff' },
  modeTabText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.mist2, fontWeight: '600' },
  modeTabTextOn: { color: colors.ink },

  fontControls: { flexDirection: 'row', gap: 6 },
  fontBtn: { width: 34, height: 30, borderRadius: radii.pill, backgroundColor: 'rgba(201,168,201,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)' },
  fontBtnText: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.purpleDark, fontWeight: '700' },
  closeBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)' },
  closeBtnText: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.ink2, fontWeight: '600' },

  focusWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  focusCard: {
    width: '100%', maxWidth: SCREEN_WIDTH - 32, maxHeight: '55%',
    backgroundColor: '#fff', borderRadius: radii.lg, padding: 26,
    shadowColor: colors.purpleAccent, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 4,
  },
  focusText: { fontFamily: fonts.displayItalic, color: colors.ink, fontStyle: 'italic', textAlign: 'center' },
  swipeHint: { fontFamily: fonts.body, fontSize: 11, color: colors.mist2, textAlign: 'center', marginTop: 14 },

  dotsRow: { flexDirection: 'row', gap: 6, marginTop: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(201,168,201,0.35)' },
  dotOn: { backgroundColor: colors.pinkAccent, width: 16 },

  focusNavRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  focusNavBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)' },
  focusNavBtnDisabled: { opacity: 0.4 },
  focusNavBtnText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.ink2, fontWeight: '600' },

  playAloudBtn: { marginTop: 22, backgroundColor: colors.pinkAccent, borderRadius: radii.pill, paddingVertical: 12, paddingHorizontal: 26 },
  playAloudBtnText: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: '#fff', fontWeight: '700' },

  allTitle: { fontFamily: fonts.displayItalic, fontSize: 18, color: colors.ink, fontStyle: 'italic', textAlign: 'center', marginBottom: 18 },
  allLineCard: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: radii.md, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(201,168,201,0.2)' },
  allLineCardOn: { backgroundColor: '#fff', borderColor: colors.pinkAccent, borderLeftWidth: 3 },
  allLineText: { fontFamily: fonts.displayItalic, color: colors.mist, fontStyle: 'italic', textAlign: 'center' },
  allLineTextOn: { color: colors.ink },
});
