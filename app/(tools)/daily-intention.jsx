import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { colors, fonts, radii } from '../../constants/theme';
import { getDailyIntention, saveDailyIntention } from '../../services/api';

export default function DailyIntention() {
  const [intention, setIntention] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = async () => {
    try {
      const data = await getDailyIntention();
      if (data) setIntention(data.intention || '');
    } catch (_) {}
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleSave = async () => {
    if (!intention.trim()) { setError('Set today\'s intention.'); return; }
    setError(''); setSaving(true); setSaved(false);
    try {
      await saveDailyIntention(intention.trim());
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
      <View style={styles.container}>

        <ScreenHeader lead="Daily" accent="Intention" subtitle={`Set the tone for your day ☀️`} />

        <GlassCard>
          <TextInput
            style={styles.input}
            placeholder="Today, I intend to..."
            placeholderTextColor="#9a8896"
            value={intention}
            onChangeText={setIntention}
            multiline
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          {saved && <Text style={styles.confirmedText}>Set ✨</Text>}
          <Button title="Set Intention ✨" onPress={handleSave} loading={saving} fullWidth style={{ marginTop: 4 }} />
        </GlassCard>

      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  input: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: '#2e2530',
    minHeight: 90,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.25)',
    textAlignVertical: 'top',
  },
  errorText: { color: '#c04040', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  confirmedText: { color: '#7da888', fontSize: 13, marginBottom: 10, textAlign: 'center', fontWeight: '600' },
});
