import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/Button';
import { colors, fonts, radii, shadows } from '../../constants/theme';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const router = useRouter();

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password) { setError('Please fill all required fields.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError(''); setLoading(true);
    try {
      await register({ full_name: fullName.trim(), username: username.trim(), email: email.trim(), password });
      router.replace({ pathname: '/(auth)/verify-otp', params: { email: email.trim() } });
    } catch (e) {
      setError(e.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View style={styles.brandWrap}>
          <Text style={styles.brandTitle}>Mani<Text style={styles.brandItalic}>verse</Text></Text>
          <Text style={styles.brandSub}>MANIFEST · BELIEVE · RECEIVE</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>Start Manifesting 🌸</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="rgba(46,37,48,0.4)" value={fullName} onChangeText={setFullName} />
          <TextInput style={styles.input} placeholder="Username" placeholderTextColor="rgba(46,37,48,0.4)" autoCapitalize="none" value={username} onChangeText={setUsername} />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="rgba(46,37,48,0.4)" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor="rgba(46,37,48,0.4)" secureTextEntry value={password} onChangeText={setPassword} />
          <Button title="Start Manifesting 🌸" onPress={handleRegister} loading={loading} fullWidth style={{ marginTop: 8 }} />
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.linkWrap}>
              <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Sign in</Text></Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.rose },
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
