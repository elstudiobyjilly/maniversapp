import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { colors, fonts, radii } from '../../constants/theme';
import { generateHoroscope } from '../../services/api';

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

export default function Horoscope() {
  const [sign, setSign] = useState('Aries');
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setError(''); setLoading(true);
    try {
      const result = await generateHoroscope(sign);
      setReading(result);
    } catch (e) {
      setError(e.message || 'Could not get your horoscope');
    } finally { setLoading(false); }
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>

        <ScreenHeader lead="Horo" accent="scope" subtitle={`What's written in the stars today ✨`} />

        <GlassCard style={styles.mb16}>
          <Text style={styles.cardTitle}>Choose your sign</Text>
          <View style={styles.chipRow}>
            {SIGNS.map((s) => (
              <TouchableOpacity key={s} style={[styles.chip, sign === s && styles.chipActive]} onPress={() => setSign(s)}>
                <Text style={[styles.chipText, sign === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <Button title="Get Reading ✨" onPress={handleGenerate} loading={loading} fullWidth style={{ marginTop: 4 }} />
        </GlassCard>

        {reading && (
          <GlassCard>
            <Text style={styles.signTitle}>{reading.sign}</Text>
            <Text style={styles.sectionLabel}>Energy</Text>
            <Text style={styles.bodyText}>{reading.energy}</Text>
            <Text style={styles.sectionLabel}>Manifestation</Text>
            <Text style={styles.bodyText}>{reading.manifestation}</Text>
            <Text style={styles.sectionLabel}>Action</Text>
            <Text style={styles.bodyText}>{reading.action}</Text>
            <Text style={styles.sectionLabel}>Affirmation</Text>
            <Text style={styles.affirmationText}>"{reading.affirmation}"</Text>
            <View style={styles.luckyRow}>
              <Text style={styles.luckyText}>Lucky number: {reading.lucky_number}</Text>
              <Text style={styles.luckyText}>Lucky colour: {reading.lucky_colour}</Text>
            </View>
          </GlassCard>
        )}

      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },

  mb16: { marginBottom: 16 },

  cardTitle: { fontSize: 15, fontWeight: '600', color: '#2e2530', marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 50,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(154,95,168,0.25)',
  },
  chipActive: { backgroundColor: '#c9a8c9', borderColor: '#c9a8c9' },
  chipText: { color: '#2e2530', fontSize: 12 },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  errorText: { color: '#c04040', fontSize: 13, marginBottom: 10, textAlign: 'center' },

  signTitle: { fontSize: 20, color: '#2e2530', fontWeight: '600', marginBottom: 14, textAlign: 'center' },
  sectionLabel: { fontSize: 11, color: '#9a5fa8', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 12, marginBottom: 4 },
  bodyText: { color: '#2e2530', fontSize: 14, lineHeight: 20 },
  affirmationText: { color: '#2e2530', fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  luckyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(201,168,201,0.2)',
  },
  luckyText: { color: '#9a8896', fontSize: 12 },
});
