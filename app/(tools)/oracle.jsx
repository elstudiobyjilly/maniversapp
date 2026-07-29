import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { colors, fonts, radii } from '../../constants/theme';
import { pullOracleCard, getOracleHistory } from '../../services/api';

export default function Oracle() {
  const [card, setCard] = useState(null);
  const [history, setHistory] = useState([]);
  const [pulling, setPulling] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = async () => {
    try { setHistory(await getOracleHistory()); } catch (_) {}
  };

  useEffect(() => { loadHistory().finally(() => setLoadingHistory(false)); }, []);

  const handlePull = async () => {
    setPulling(true); setError('');
    try {
      const result = await pullOracleCard();
      setCard(result);
      loadHistory();
    } catch (e) {
      setError(e.message || 'Could not pull a card');
    } finally { setPulling(false); }
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>

        <ScreenHeader lead="Ora" accent="cle" subtitle={`Pull a card, receive your message ✨`} />

        {/* Drawn card moment */}
        <View style={styles.cardGlow}>
          {card ? (
            <GlassCard style={styles.oracleCard} intensity={45}>
              <Text style={styles.oracleTheme}>{card.theme}</Text>
              <Text style={styles.oracleTitle}>{card.title}</Text>
              <Text style={styles.oracleMessage}>{card.message}</Text>
            </GlassCard>
          ) : (
            <GlassCard style={styles.oracleCardEmpty}>
              <Text style={styles.emptyText}>🔮</Text>
              <Text style={styles.muted}>Pull a card to receive your message</Text>
            </GlassCard>
          )}
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Button title="Pull a Card ✨" onPress={handlePull} loading={pulling} fullWidth />

        {/* History */}
        {loadingHistory ? (
          <ActivityIndicator color="#c9a8c9" style={{ marginTop: 20 }} />
        ) : history.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🌙</Text>
            <Text style={styles.emptyTitle}>No pulls yet this month</Text>
            <Text style={styles.emptySubtitle}>Your card history will appear here</Text>
          </GlassCard>
        ) : (
          <>
            <Text style={styles.sectionHeading}>This month's pulls</Text>
            {history.map((h, i) => (
              <GlassCard key={i} style={styles.historyRow}>
                <Text style={styles.historyTheme}>{h.theme}</Text>
                <Text style={styles.historyTitle}>{h.title}</Text>
              </GlassCard>
            ))}
          </>
        )}

      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },

  // Soft glow halo around the drawn-card moment — sits outside the
  // GlassCard (which clips overflow), so the shadow reads as an outer glow.
  cardGlow: {
    marginBottom: 20,
    borderRadius: 28,
    shadowColor: '#9a5fa8',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  oracleCard: { borderRadius: 28, paddingVertical: 36, paddingHorizontal: 24, alignItems: 'center' },
  oracleCardEmpty: { borderRadius: 28, paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 40, marginBottom: 10 },
  oracleTheme: { fontSize: 11, color: '#9a5fa8', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase', fontWeight: '700' },
  oracleTitle: { fontSize: 22, color: '#2e2530', fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  oracleMessage: { fontSize: 15, color: '#2e2530', textAlign: 'center', lineHeight: 23 },
  muted: { color: '#6b5c66', fontSize: 13, textAlign: 'center' },

  errorText: { color: '#c04040', fontSize: 13, marginBottom: 12, textAlign: 'center' },

  sectionHeading: {
    fontSize: 11,
    color: '#9a5fa8',
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  historyRow: { marginBottom: 10 },
  historyTheme: { color: '#9a5fa8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  historyTitle: { color: '#2e2530', fontSize: 14, fontWeight: '500' },

  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#2e2530', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#6b5c66' },
});
