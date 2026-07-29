import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/Button';
import { colors, fonts, radii, shadows } from '../../constants/theme';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  const handleLogin = async () => {
    if (!username.trim() || !password) { setError('Please fill in all fields.'); return; }
    setError(''); setLoading(true);
    try {
      await login(username.trim(), password);
      router.replace('/(tabs)/dashboard');
    } catch (e) {
      setError(e.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.brandWrap}>
        <Text style={styles.brandTitle}>Mani<Text style={styles.brandItalic}>verse</Text></Text>
        <Text style={styles.brandSub}>MANIFEST · BELIEVE · RECEIVE</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.heading}>Welcome back</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TextInput style={styles.input} placeholder="Username or email" placeholderTextColor="rgba(46,37,48,0.4)" autoCapitalize="none" value={username} onChangeText={setUsername} />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor="rgba(46,37,48,0.4)" secureTextEntry value={password} onChangeText={setPassword} />
        <Button title="Sign In ✨" onPress={handleLogin} loading={loading} fullWidth style={{ marginTop: 8 }} />
        <Link href="/(auth)/forgot-password" asChild>
          <TouchableOpacity style={styles.linkWrap}>
            <Text style={styles.linkText}>Forgot your password?</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.linkWrap}>
            <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkBold}>Sign up</Text></Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.rose, justifyContent: 'center', padding: 24 },
  brandWrap: { alignItems: 'center', marginBottom: 32 },
  brandTitle: { fontFamily: fonts.display, fontSize: 34, color: colors.ink, fontWeight: '400' },
  brandItalic: { fontFamily: fonts.displayItalic, color: colors.purpleDark, fontStyle: 'italic' },
  brandSub: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.mist, letterSpacing: 2, marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: radii.lg, padding: 28, ...shadows.card },
  heading: { fontFamily: fonts.displayMedium, fontSize: 21, color: colors.ink, fontWeight: '500', marginBottom: 20, textAlign: 'center' },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  input: { backgroundColor: colors.rose, borderRadius: radii.sm, paddingHorizontal: 16, paddingVertical: 14, fontFamily: fonts.body, fontSize: 15, color: colors.ink, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)' },
  linkWrap: { marginTop: 18, alignItems: 'center' },
  linkText: { fontFamily: fonts.body, color: colors.mist, fontSize: 13 },
  linkBold: { fontFamily: fonts.bodyMedium, color: colors.purpleDark, fontWeight: '600' },
});
