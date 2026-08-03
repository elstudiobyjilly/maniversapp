import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getDesires, linkDesire } from '../services/api';
import { colors, fonts, radii } from '../constants/theme';

// Reusable "link this to a desire" action — drop onto any saved content
// item (story, affirmation set, vision board image, gratitude entry, ...)
// to wire it into the backend's cross-feature desire-linking model, which
// is what powers the "N linked items" count shown on the Dashboard.
//
// contentType must be one of: affirmation, story, mind_movie, script,
// feel_it_card, let_go, practice, read, self_work, gratitude, meditation,
// vision_board, belief, roadmap, subliminal (see services/api.js linkDesire).
export default function LinkDesireButton({ contentType, contentId, contentTitle, style }) {
  const [open, setOpen] = useState(false);
  const [desires, setDesires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [linkingId, setLinkingId] = useState(null);
  const [linkedId, setLinkedId] = useState(null);

  const openPicker = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const d = await getDesires();
      setDesires(Array.isArray(d) ? d.filter((x) => x.status === 'active') : []);
    } catch (_) {
      setDesires([]);
    } finally { setLoading(false); }
  };

  const handleLink = async (desire) => {
    if (contentId == null) return;
    setLinkingId(desire.id);
    try {
      await linkDesire(desire.id, { content_type: contentType, content_id: String(contentId), content_title: contentTitle || null });
      setLinkedId(desire.id);
      setTimeout(() => setOpen(false), 600);
    } catch (e) {
      Alert.alert('Could not link', e.message || 'Please try again.');
    } finally { setLinkingId(null); }
  };

  return (
    <>
      <TouchableOpacity style={[styles.btn, style]} onPress={openPicker}>
        <Text style={styles.btnText}>{linkedId ? '🔗 Linked ✓' : '🔗 Link to a Desire'}</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Link to a Desire</Text>
            {loading ? (
              <ActivityIndicator color="#9a5fa8" style={{ marginVertical: 20 }} />
            ) : desires.length === 0 ? (
              <Text style={styles.emptyText}>No active desires yet — create one first ✨</Text>
            ) : (
              desires.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.desireRow, linkedId === d.id && styles.desireRowLinked]}
                  onPress={() => handleLink(d)}
                  disabled={linkingId === d.id}
                >
                  <Text style={styles.desireTitle} numberOfLines={1}>{d.title}</Text>
                  {linkingId === d.id ? (
                    <ActivityIndicator size="small" color="#9a5fa8" />
                  ) : (
                    <Text style={styles.desireAction}>{linkedId === d.id ? '✓ Linked' : 'Link'}</Text>
                  )}
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity onPress={() => setOpen(false)} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radii.pill, borderWidth: 1, borderColor: 'rgba(201,168,201,0.35)', backgroundColor: 'rgba(255,255,255,0.5)', alignSelf: 'flex-start' },
  btnText: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.purpleDark, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(46,37,48,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fffaf3', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '70%' },
  title: { fontFamily: fonts.displayMedium, fontSize: 18, fontWeight: '400', color: colors.ink, marginBottom: 14 },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.mist, textAlign: 'center', paddingVertical: 16 },
  desireRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(154,95,168,0.12)' },
  desireRowLinked: { opacity: 0.7 },
  desireTitle: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink, flex: 1, marginRight: 10 },
  desireAction: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.purpleDark, fontWeight: '600' },
  cancelText: { fontFamily: fonts.body, color: colors.mist, fontSize: 13.5, fontWeight: '500' },
});
