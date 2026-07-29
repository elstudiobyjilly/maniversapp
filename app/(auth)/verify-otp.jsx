import { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/Button';
import { colors, fonts, radii, shadows } from '../../constants/theme';

export default function VerifyOtp() {
  const { email } = useLocalSearchParams();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const confirmOtp = useAuthStore((s) => s.confirmOtp);
  const router = useRouter();

  const handleVerify = async () => {
    if (!code.trim()) { setError('Enter the code sent to your email.'); return; }
    setError(''); setLoading(true);
    try {
      await confirmOtp(email, code.trim());
      router.replace('/(tabs)/dashboard');
    } catch (e) {
      setError(e.message || 'Verification failed');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.heading}>Verify your email 🌸</Text>
        <Text style={styles.sub}>We sent a code to {email}</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TextInput style={styles.input} placeholder="6-digit code" placeholderTextColor="rgba(46,37,48,0.4)" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} />
        <Button title="Verify ✨" onPress={handleVerify} loading={loading} fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.rose, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: radii.lg, padding: 28, ...shadows.card },
  heading: { fontFamily: fonts.displayMedium, fontSize: 21, color: colors.ink, fontWeight: '500', marginBottom: 8, textAlign: 'center' },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.mist, textAlign: 'center', marginBottom: 20 },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  input: { backgroundColor: colors.rose, borderRadius: radii.sm, paddingHorizontal: 16, paddingVertical: 14, fontFamily: fonts.body, fontSize: 15, color: colors.ink, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)', textAlign: 'center', letterSpacing: 4 },
});
