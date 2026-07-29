import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { forgotPassword, resetPassword, setApiToken } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/Button';
import { colors, fonts, radii, shadows } from '../../constants/theme';

// Two-step flow in one screen: request a code, then submit code + new
// password. Matches backend's /auth/forgot-password + /auth/reset-password
// (reset-password returns a fresh session token, same shape as login).
export default function ForgotPassword() {
  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const _saveAuthFromToken = useAuthStore((s) => s._saveAuth);

  const handleRequestCode = async () => {
    if (!email.trim()) { setError('Enter your email.'); return; }
    setError(''); setLoading(true);
    try {
      await forgotPassword(email.trim());
      setInfo('If an account exists, a reset code has been sent.');
      setStep('reset');
    } catch (e) {
      setError(e.message || 'Could not send reset code');
    } finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!code.trim()) { setError('Enter the code sent to your email.'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setError(''); setLoading(true);
    try {
      const data = await resetPassword(email.trim(), code.trim(), newPassword);
      // reset-password returns a fresh session token, just like login --
      // sign the user straight in rather than sending them back to Login.
      await _saveAuthFromToken(data);
      router.replace('/(tabs)/dashboard');
    } catch (e) {
      setError(e.message || 'Could not reset password');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.heading}>Reset your password 🌸</Text>
        <Text style={styles.sub}>
          {step === 'email' ? "We'll email you a reset code" : `Enter the code sent to ${email}`}
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {info && step === 'reset' ? <Text style={styles.infoText}>{info}</Text> : null}

        {step === 'email' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9a8896"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Button title="Send Reset Code ✨" onPress={handleRequestCode} loading={loading} fullWidth />
          </>
        ) : (
          <>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="6-digit code"
              placeholderTextColor="#9a8896"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
            />
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor="#9a8896"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor="#9a8896"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <Button title="Reset Password ✨" onPress={handleReset} loading={loading} fullWidth />
            <TouchableOpacity style={styles.linkWrap} onPress={() => setStep('email')}>
              <Text style={styles.linkText}>Didn't get a code? <Text style={styles.linkBold}>Try again</Text></Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.linkWrap} onPress={() => router.back()}>
          <Text style={styles.linkText}>Back to <Text style={styles.linkBold}>Sign In</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.rose, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: radii.lg, padding: 28, ...shadows.card },
  heading: { fontFamily: fonts.displayMedium, fontSize: 21, color: colors.ink, fontWeight: '500', marginBottom: 8, textAlign: 'center' },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.mist, textAlign: 'center', marginBottom: 20 },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  infoText: { fontFamily: fonts.body, color: colors.success, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  input: { backgroundColor: colors.rose, borderRadius: radii.sm, paddingHorizontal: 16, paddingVertical: 14, fontFamily: fonts.body, fontSize: 15, color: colors.ink, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)' },
  codeInput: { textAlign: 'center', letterSpacing: 4 },
  linkWrap: { marginTop: 18, alignItems: 'center' },
  linkText: { fontFamily: fonts.body, color: colors.mist, fontSize: 13 },
  linkBold: { fontFamily: fonts.bodyMedium, color: colors.purpleDark, fontWeight: '600' },
});
