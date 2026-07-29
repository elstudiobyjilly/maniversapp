import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { colors, fonts, radii } from '../../constants/theme';
import { getAbundanceCheque, saveAbundanceCheque } from '../../services/api';

export default function AbundanceCheque() {
  const [payTo, setPayTo] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = async () => {
    try {
      const data = await getAbundanceCheque();
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setPayTo(row.pay_to || '');
        setAmount(row.amount || '');
        setMemo(row.memo || '');
      }
    } catch (_) {}
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleSave = async () => {
    if (!payTo.trim() || !amount.trim()) { setError('Fill in who it\'s to and the amount.'); return; }
    setError(''); setSaving(true); setSaved(false);
    try {
      await saveAbundanceCheque({ pay_to: payTo.trim(), amount: amount.trim(), memo: memo.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message || 'Could not save');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c9a8c9" />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <ScreenHeader lead="Abundance" accent="Cheque" subtitle={`Your abundance, already written ✨`} />

        {/* The cheque itself — deliberately not glass, it should read as paper */}
        <View style={styles.cheque}>
          <Text style={styles.chequeBank}>BANK OF THE UNIVERSE</Text>
          <View style={styles.chequeRow}>
            <Text style={styles.chequeLabel}>Pay to the order of</Text>
            <Text style={styles.chequeValue}>{payTo || '___________'}</Text>
          </View>
          <View style={styles.chequeRow}>
            <Text style={styles.chequeLabel}>$</Text>
            <Text style={styles.chequeAmount}>{amount || '0.00'}</Text>
          </View>
          <Text style={styles.chequeMemo}>{memo || 'Memo: for being in alignment'}</Text>
        </View>

        {/* Edit form */}
        <GlassCard>
          <TextInput
            style={styles.input}
            placeholder="Pay to (e.g. Jilly)"
            placeholderTextColor="#9a8896"
            value={payTo}
            onChangeText={setPayTo}
          />
          <TextInput
            style={styles.input}
            placeholder="Amount (e.g. 100,000)"
            placeholderTextColor="#9a8896"
            value={amount}
            onChangeText={setAmount}
          />
          <TextInput
            style={styles.input}
            placeholder="Memo"
            placeholderTextColor="#9a8896"
            value={memo}
            onChangeText={setMemo}
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          {saved && <Text style={styles.confirmedText}>Saved ✨</Text>}
          <Button title="Save Cheque ✨" onPress={handleSave} loading={saving} fullWidth style={{ marginTop: 4 }} />
        </GlassCard>

      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  cheque: {
    backgroundColor: '#fffdf9',
    borderRadius: 18,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(154,95,168,0.4)',
    borderStyle: 'dashed',
    shadowColor: '#9a5fa8',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  chequeBank: { fontSize: 11, color: '#9a5fa8', letterSpacing: 2, marginBottom: 18, fontWeight: '700' },
  chequeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201,168,201,0.25)',
    paddingBottom: 8,
  },
  chequeLabel: { fontSize: 12, color: '#6b5c66' },
  chequeValue: { fontSize: 16, color: '#2e2530', fontWeight: '600' },
  chequeAmount: { fontSize: 24, color: '#9a5fa8', fontWeight: '700' },
  chequeMemo: { fontSize: 12, color: '#6b5c66', fontStyle: 'italic' },

  input: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#2e2530',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.25)',
  },
  errorText: { color: '#c04040', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  confirmedText: { color: '#7da888', fontSize: 13, marginBottom: 10, textAlign: 'center', fontWeight: '600' },
});
