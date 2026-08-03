import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { colors, fonts, radii } from '../../constants/theme';
import { getAbundanceCheque, saveAbundanceCheque } from '../../services/api';
import { CHEQUE_STYLES } from '../../constants/practiceContent';

const STYLE_KEYS = Object.keys(CHEQUE_STYLES);

export default function AbundanceCheque() {
  const [styleKey, setStyleKey] = useState('blush');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const chequeRef = useRef(null);

  useEffect(() => {
    getAbundanceCheque()
      .then((d) => { if (d) { setName(d.pay_to || ''); setAmount(d.amount || ''); setMemo(d.memo || ''); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const st = CHEQUE_STYLES[styleKey];
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const serial = `${st.serial}-${Date.now().toString(36).toUpperCase().slice(-8)}`;

  const handleSave = async () => {
    setSaving(true); setInfo('');
    try {
      await saveAbundanceCheque({ pay_to: name.trim(), amount: amount.trim(), memo: memo.trim() });
      setInfo('Saved ✨');
      setTimeout(() => setInfo(''), 2000);
    } catch (_) {} finally { setSaving(false); }
  };

  const handleDownload = async () => {
    setBusy(true); setInfo('');
    try {
      const uri = await captureRef(chequeRef, { format: 'png', quality: 1 });
      const { granted } = await MediaLibrary.requestPermissionsAsync();
      if (!granted) { setInfo('Photo library permission is needed to save.'); return; }
      await MediaLibrary.saveToLibraryAsync(uri);
      setInfo('Saved to your photos ✨');
      setTimeout(() => setInfo(''), 2500);
    } catch (_) { setInfo('Could not save your cheque'); } finally { setBusy(false); }
  };

  const handleShare = async () => {
    setBusy(true); setInfo('');
    try {
      const uri = await captureRef(chequeRef, { format: 'png', quality: 1 });
      const available = await Sharing.isAvailableAsync();
      if (available) await Sharing.shareAsync(uri);
    } catch (_) {} finally { setBusy(false); }
  };

  if (loading) return <ActivityIndicator color={colors.purpleMid} style={{ marginTop: 20 }} />;

  return (
    <View>
      <Text style={styles.desc}>Write yourself a cheque from the universe — print and receive.</Text>

      <View style={styles.styleRow}>
        {STYLE_KEYS.map((k) => (
          <TouchableOpacity key={k} style={[styles.styleChip, styleKey === k && styles.styleChipActive]} onPress={() => setStyleKey(k)}>
            <Text style={[styles.styleChipText, styleKey === k && styles.styleChipTextActive]}>{CHEQUE_STYLES[k].label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View ref={chequeRef} collapsable={false} style={[styles.chequeWrap, { borderColor: st.ink + '30' }]}>
        <LinearGradient colors={st.headerColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chequeHeader}>
          <View>
            <Text style={styles.bankName}>{st.bankName}</Text>
            <Text style={styles.bankSub}>{st.bankSub}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.serialLabel}>No.</Text>
            <Text style={styles.serialText}>{serial}</Text>
          </View>
        </LinearGradient>

        <LinearGradient colors={st.bg} style={styles.chequeBody}>
          <Text style={[styles.dateText, { color: st.ink }]}>Date  {today}</Text>

          <Text style={[styles.fieldLabel, { color: st.ink }]}>PAY TO THE ORDER OF</Text>
          <TextInput
            style={[styles.chequeInput, styles.nameInput, { color: st.ink, borderBottomColor: st.ink + '40' }]}
            placeholder="Your beautiful name..."
            placeholderTextColor={st.ink + '60'}
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.fieldLabel, { color: st.ink, marginTop: 14 }]}>THE SUM OF / I AM RECEIVING</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput
              style={[styles.chequeInput, { flex: 1, color: st.ink, borderBottomColor: st.ink + '40' }]}
              placeholder="Abundance beyond measure · $10,000 monthly..."
              placeholderTextColor={st.ink + '60'}
              value={amount}
              onChangeText={setAmount}
            />
            <View style={[styles.infinityBox, { borderColor: st.ink + '40' }]}>
              <Text style={[styles.infinitySymbol, { color: st.ink }]}>∞</Text>
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: st.ink, marginTop: 14 }]}>INTENTION / MEMO</Text>
          <TextInput
            style={[styles.chequeInput, { color: st.ink, borderBottomColor: st.ink + '25' }]}
            placeholder="With deep gratitude and total belief ✨"
            placeholderTextColor={st.ink + '60'}
            value={memo}
            onChangeText={setMemo}
          />

          <View style={styles.signRow}>
            <Text style={[styles.signedBy, { color: st.ink }]}>{st.sign}</Text>
            <View style={styles.paidStamp}>
              <Text style={styles.paidStampText}>{st.paid}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {info ? <Text style={styles.infoText}>{info}</Text> : null}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={colors.purpleDark} /> : <Text style={styles.actionBtnText}>💾 Save</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare} disabled={busy}>
          <Text style={styles.actionBtnText}>🔗 Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleDownload} disabled={busy}>
          <Text style={styles.actionBtnText}>⬇️ Download</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desc: { fontFamily: fonts.body, fontSize: 12.5, color: colors.mist, marginBottom: 12 },
  styleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  styleChip: { backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.3)', borderRadius: radii.pill, paddingVertical: 6, paddingHorizontal: 12 },
  styleChipActive: { borderColor: colors.purpleMid, backgroundColor: 'rgba(201,168,201,0.15)' },
  styleChipText: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.mist },
  styleChipTextActive: { color: colors.purpleDark, fontWeight: '700' },

  chequeWrap: { borderRadius: radii.lg, borderWidth: 1.5, overflow: 'hidden', marginBottom: 14 },
  chequeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18 },
  bankName: { fontFamily: fonts.displayMedium, fontSize: 11, letterSpacing: 1.5, color: '#fff', textTransform: 'uppercase' },
  bankSub: { fontFamily: fonts.body, fontSize: 9, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.6, marginTop: 2 },
  serialLabel: { fontFamily: fonts.body, fontSize: 8, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.6 },
  serialText: { fontFamily: fonts.body, fontSize: 10, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 },

  chequeBody: { padding: 20 },
  dateText: { fontFamily: fonts.displayItalic, fontSize: 12, textAlign: 'right', marginBottom: 14, opacity: 0.6 },
  fieldLabel: { fontFamily: fonts.body, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.5, marginBottom: 5 },
  chequeInput: { fontFamily: fonts.displayItalic, fontSize: 15, fontStyle: 'italic', borderBottomWidth: 1.5, paddingVertical: 4 },
  nameInput: { fontSize: 20, fontWeight: '300' },
  infinityBox: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 14 },
  infinitySymbol: { fontSize: 18, fontFamily: fonts.displayItalic },
  signRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  signedBy: { fontFamily: fonts.displayItalic, fontSize: 13, fontStyle: 'italic', opacity: 0.7 },
  paidStamp: { borderWidth: 1.5, borderColor: 'rgba(120,180,120,0.5)', borderRadius: radii.pill, paddingVertical: 5, paddingHorizontal: 12 },
  paidStampText: { fontFamily: fonts.bodyMedium, fontSize: 10, color: '#4a8a5a', fontWeight: '700' },

  infoText: { fontFamily: fonts.body, fontSize: 12, color: colors.purpleDark, textAlign: 'center', marginBottom: 10 },
  actionsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  actionBtn: { backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', borderRadius: radii.pill, paddingVertical: 10, paddingHorizontal: 16 },
  actionBtnText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.ink2, fontWeight: '600' },
});
