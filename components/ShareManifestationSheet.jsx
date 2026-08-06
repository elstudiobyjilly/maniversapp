import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ActivityIndicator, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts, radii, shadows } from '../constants/theme';

// Matches the website's "Share your manifestation" bottom sheet exactly:
// style pills row -> card preview -> a single plain "Add background photo"
// pill -> Save / Share / close row. Opened per-entry from a manifestation's
// Share button (not a standing section on the screen).
const CARD_STYLES = {
  pastel: { label: '🌸 Pastel', colors: ['#fdf0f4', '#f6eefc', '#eef6f8'], ink: '#2e2530', sub: 'rgba(46,37,48,0.55)' },
  midnight: { label: '🌙 Midnight', colors: ['#150c28', '#1c1236', '#120a22'], ink: '#f4ecff', sub: 'rgba(244,236,255,0.65)' },
  golden: { label: '🌟 Golden', colors: ['#fdf6e3', '#fbedd0', '#fde8de'], ink: '#3a2c14', sub: 'rgba(58,44,20,0.6)' },
  rose: { label: '💎 Rose', colors: ['#fdf0f2', '#fbe4ea', '#f7ecf6'], ink: '#3a2030', sub: 'rgba(58,32,48,0.6)' },
  aurora: { label: '🌈 Aurora', colors: ['#e9fdf6', '#eaf3ff', '#f6ecff'], ink: '#1f2b30', sub: 'rgba(31,43,48,0.6)' },
  cosmos: { label: '🌌 Cosmos', colors: ['#0b0a1c', '#141130', '#1a0f2e'], ink: '#f0ecff', sub: 'rgba(240,236,255,0.65)' },
};
const STYLE_KEYS = Object.keys(CARD_STYLES);

export default function ShareManifestationSheet({ visible, entry, onClose }) {
  const [styleKey, setStyleKey] = useState('pastel');
  const [bgUri, setBgUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [info, setInfo] = useState('');
  const cardRef = useRef(null);

  const s = CARD_STYLES[styleKey];
  const title = entry?.title || '';
  const note = entry?.note || '';

  const reset = () => { setStyleKey('pastel'); setBgUri(null); setInfo(''); };
  const handleClose = () => { reset(); onClose(); };

  const handlePickBg = async () => {
    if (bgUri) { setBgUri(null); return; }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [9, 16] });
    if (!result.canceled && result.assets?.[0]?.uri) setBgUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    setInfo(''); setSaving(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      const { granted } = await MediaLibrary.requestPermissionsAsync();
      if (!granted) { setInfo('Photo library permission is needed to save.'); return; }
      await MediaLibrary.saveToLibraryAsync(uri);
      setInfo('Saved to your photos ✨');
    } catch (_) {
      setInfo('Could not save your card');
    } finally { setSaving(false); }
  };

  const handleShare = async () => {
    setInfo(''); setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      const available = await Sharing.isAvailableAsync();
      if (available) await Sharing.shareAsync(uri);
    } catch (_) {
      setInfo('Could not share your card');
    } finally { setSharing(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <Text style={styles.heading}>🎉 Share your manifestation</Text>

        <View style={styles.pillRow}>
          {STYLE_KEYS.map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.pill, styleKey === key && styles.pillActive]}
              onPress={() => setStyleKey(key)}
            >
              <Text style={[styles.pillText, styleKey === key && styles.pillTextActive]}>{CARD_STYLES[key].label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View ref={cardRef} collapsable={false} style={styles.cardWrap}>
          {bgUri ? (
            <ImageBackground source={{ uri: bgUri }} style={StyleSheet.absoluteFill} imageStyle={styles.cardBgImage}>
              <View style={styles.cardBgOverlay} />
            </ImageBackground>
          ) : (
            <LinearGradient colors={s.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          )}
          <View style={styles.cardInner}>
            <Text style={styles.cardIcon}>💕</Text>
            <Text style={[styles.cardTitle, { color: bgUri ? '#fff' : s.ink }]}>{title || 'My manifestation'}</Text>
            {note ? <Text style={[styles.cardNote, { color: bgUri ? 'rgba(255,255,255,0.85)' : s.sub }]} numberOfLines={4}>{note}</Text> : null}
            <View style={styles.cardDivider} />
            <Text style={[styles.cardWatermark, { color: bgUri ? 'rgba(255,255,255,0.75)' : s.sub }]}>manivers.com</Text>
            <Text style={[styles.cardTagline, { color: bgUri ? 'rgba(255,255,255,0.7)' : s.sub }]}>I manifest miracles every day ✨</Text>
          </View>
        </View>

        {info ? <Text style={styles.infoText}>{info}</Text> : null}

        <TouchableOpacity style={styles.photoPill} onPress={handlePickBg}>
          <Text style={styles.photoPillText}>{bgUri ? '🖼️ Background photo added — tap to remove' : '🖼️ Add background photo (optional)'}</Text>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>⬇️ Save</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={sharing}>
            {sharing ? <ActivityIndicator size="small" color={colors.purpleDark} /> : <Text style={styles.shareBtnText}>📤 Share</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,10,25,0.4)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff', borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30,
    ...shadows.card,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(201,168,201,0.4)', alignSelf: 'center', marginBottom: 14 },
  heading: { fontFamily: fonts.display, fontSize: 19, color: colors.ink, textAlign: 'center', marginBottom: 14 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  pill: { backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', borderRadius: radii.pill, paddingVertical: 8, paddingHorizontal: 14 },
  pillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.ink2, fontWeight: '500' },
  pillTextActive: { color: '#fff', fontWeight: '700' },

  cardWrap: { width: '100%', aspectRatio: 0.72, borderRadius: radii.lg, overflow: 'hidden', marginBottom: 14 },
  cardBgImage: { resizeMode: 'cover' },
  cardBgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,10,25,0.4)' },
  cardInner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  cardIcon: { fontSize: 34, marginBottom: 14 },
  cardTitle: { fontFamily: fonts.displayMedium, fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  cardNote: { fontFamily: fonts.displayItalic, fontSize: 14, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
  cardDivider: { width: '60%', height: 1, backgroundColor: 'rgba(120,90,130,0.2)', marginTop: 28, marginBottom: 10 },
  cardWatermark: { fontFamily: fonts.bodyMedium, fontSize: 12, fontWeight: '600' },
  cardTagline: { fontFamily: fonts.displayItalic, fontSize: 11.5, fontStyle: 'italic', marginTop: 2 },

  infoText: { fontFamily: fonts.body, fontSize: 12, color: colors.purpleDark, textAlign: 'center', marginBottom: 8 },

  photoPill: {
    backgroundColor: 'rgba(201,168,201,0.15)', borderRadius: radii.pill,
    paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', marginBottom: 14,
  },
  photoPillText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.purpleDark, fontWeight: '500' },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveBtn: { flex: 1, backgroundColor: colors.purpleAccent, borderRadius: radii.pill, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  saveBtnText: { fontFamily: fonts.bodyMedium, color: '#fff', fontWeight: '700', fontSize: 14 },
  shareBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', borderRadius: radii.pill, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  shareBtnText: { fontFamily: fonts.bodyMedium, color: colors.ink2, fontWeight: '600', fontSize: 14 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 16, color: colors.ink2 },
});
