import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Share } from 'react-native';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import Button from '../../components/Button';
import { colors, fonts, radii, gradients } from '../../constants/theme';
import { pullOracleCard, generateHoroscope } from '../../services/api';

const DAILY_MESSAGES = [
  "Let go of the version of the story where it doesn't work out. That version is not real.",
  "You are not behind. You are exactly where your becoming needs you to be.",
  "The universe is not testing you. It is preparing you.",
  "Ease is a sign that you're aligned, not a sign that you're missing something.",
  "What you're calling in is already looking for you.",
  "Trust the timing. Trust the shifting. Trust yourself.",
  "You don't have to force it. You just have to stay open to it.",
];

const SIGNS = [
  { key: 'Aries', icon: '♈' }, { key: 'Taurus', icon: '♉' }, { key: 'Gemini', icon: '♊' },
  { key: 'Cancer', icon: '♋' }, { key: 'Leo', icon: '♌' }, { key: 'Virgo', icon: '♍' },
  { key: 'Libra', icon: '♎' }, { key: 'Scorpio', icon: '♏' }, { key: 'Sagittarius', icon: '♐' },
  { key: 'Capricorn', icon: '♑' }, { key: 'Aquarius', icon: '♒' }, { key: 'Pisces', icon: '♓' },
];

function dayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
}

const TODAYS_MESSAGE = DAILY_MESSAGES[dayOfYear() % DAILY_MESSAGES.length];
const TODAYS_DATE = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

export default function Daily() {
  const [cards, setCards] = useState(Array(7).fill(null));
  const [pullingIdx, setPullingIdx] = useState(null);
  const [reading, setReading] = useState(null);
  const [sign, setSign] = useState(null);
  const [loadingSign, setLoadingSign] = useState(false);
  const [error, setError] = useState('');

  const handlePull = async (idx) => {
    if (cards[idx] || pullingIdx !== null) return;
    setPullingIdx(idx);
    try {
      const card = await pullOracleCard();
      setCards((prev) => { const next = [...prev]; next[idx] = card; return next; });
    } catch (e) {
      setError(e.message || 'Could not pull a card');
    } finally { setPullingIdx(null); }
  };

  const handleShuffle = () => { setCards(Array(7).fill(null)); setError(''); };
  const handleClear = () => { setCards(Array(7).fill(null)); setError(''); };

  const handleSignPick = async (s) => {
    setSign(s); setLoadingSign(true); setError('');
    try {
      const result = await generateHoroscope(s);
      setReading(result);
    } catch (e) {
      setError(e.message || 'Could not get your horoscope');
    } finally { setLoadingSign(false); }
  };

  const shareMessage = () => {
    Share.share({ message: `${TODAYS_MESSAGE}\n\n— Manivers, ${TODAYS_DATE}` });
  };

  const readAloud = () => {
    Speech.stop();
    Speech.speak(TODAYS_MESSAGE, { rate: 0.92 });
  };

  const shareAll = () => {
    const lines = [`✨ Today's Message\n"${TODAYS_MESSAGE}"`, TODAYS_DATE];
    if (reading) lines.push(`\n${reading.sign} Horoscope\n${reading.affirmation}`);
    Share.share({ message: lines.join('\n') });
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>

        <Text style={styles.pageTitle}>Daily <Text style={styles.pageTitleAccent}>Energy</Text></Text>
        <Text style={styles.pageSubtitle}>Your message for today. Your oracle pull. Your energy. ✨</Text>

        {/* Daily Energy */}
        <GlassCard style={styles.messageCard}>
          <Text style={styles.messageLabel}>✨ TODAY'S MESSAGE</Text>
          <Text style={styles.messageText}>"{TODAYS_MESSAGE}"</Text>
          <Text style={styles.messageDate}>{TODAYS_DATE}</Text>
          <View style={styles.messageActions}>
            <Button title="📤 Share This Message" variant="ghost" size="sm" onPress={shareMessage} />
            <Button title="🔊 Read Aloud" variant="ghost" size="sm" onPress={readAloud} />
          </View>
        </GlassCard>

        {/* Oracle Pull */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionEmoji}>🔮</Text>
          <Text style={styles.sectionTitle}>Oracle Pull</Text>
        </View>
        <Text style={styles.sectionSubtitle}>Quiet your mind. Hold your question. Then tap a card.</Text>

        <View style={styles.pillRow}>
          <TouchableOpacity style={styles.pillButtonPrimary} onPress={handleShuffle}>
            <Text style={styles.pillButtonPrimaryText}>🔀 Shuffle Deck</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pillButton} onPress={handleClear}>
            <Text style={styles.pillButtonText}>✕ Clear</Text>
          </TouchableOpacity>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.cardGrid}>
          {cards.map((card, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.oracleCard}
              activeOpacity={0.8}
              onPress={() => handlePull(idx)}
              disabled={pullingIdx !== null}
            >
              {card ? (
                <>
                  <Text style={styles.oracleCardTheme}>{card.theme}</Text>
                  <Text style={styles.oracleCardTitle}>{card.title}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.flowerEmoji}>🌸</Text>
                  <Text style={styles.tapToPull}>{pullingIdx === idx ? 'Pulling…' : 'Tap to pull'}</Text>
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Horoscope */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionEmoji}>📈</Text>
          <Text style={styles.sectionTitle}>Your Horoscope</Text>
        </View>

        <GlassCard style={styles.horoscopeCard}>
          {!reading ? (
            <>
              <Text style={styles.horoscopeTitle}>✨ Your cosmic reading awaits</Text>
              <Text style={styles.horoscopeSubtitle}>Choose your star sign to receive your daily horoscope</Text>
            </>
          ) : (
            <>
              <Text style={styles.horoscopeTitle}>{reading.sign}</Text>
              <Text style={styles.readingLabel}>Energy</Text>
              <Text style={styles.readingText}>{reading.energy}</Text>
              <Text style={styles.readingLabel}>Manifestation</Text>
              <Text style={styles.readingText}>{reading.manifestation}</Text>
              <Text style={styles.readingLabel}>Action</Text>
              <Text style={styles.readingText}>{reading.action}</Text>
              <Text style={styles.readingLabel}>Affirmation</Text>
              <Text style={styles.readingAffirmation}>"{reading.affirmation}"</Text>
              <View style={styles.luckyRow}>
                <Text style={styles.luckyText}>Lucky number: {reading.lucky_number}</Text>
                <Text style={styles.luckyText}>Lucky colour: {reading.lucky_colour}</Text>
              </View>
            </>
          )}

          <View style={styles.signGrid}>
            {SIGNS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.signPill, sign === s.key && styles.signPillActive]}
                onPress={() => handleSignPick(s.key)}
                disabled={loadingSign}
              >
                <View style={styles.signIconWrap}>
                  <Text style={styles.signIcon}>{s.icon}</Text>
                </View>
                <Text style={styles.signLabel}>{s.key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        <TouchableOpacity onPress={shareAll} style={styles.shareAllWrap} activeOpacity={0.88}>
          <LinearGradient colors={gradients.cta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.shareAllGradient}>
            <Text style={styles.shareAllText}>📤 Share All as Image</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </GradientBackground>
  );
}

const CARD_GAP = 10;

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 50 },

  pageTitle: { fontFamily: fonts.display, fontSize: 32, color: colors.ink, marginBottom: 6 },
  pageTitleAccent: { fontFamily: fonts.displayItalic, color: colors.purpleDark, fontStyle: 'italic' },
  pageSubtitle: { fontFamily: fonts.body, fontSize: 15, color: colors.mist, marginBottom: 20, lineHeight: 21 },

  messageCard: { alignItems: 'center', marginBottom: 26, paddingVertical: 26 },
  messageLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.purpleDark, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 },
  messageText: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, textAlign: 'center', lineHeight: 32, marginBottom: 16, fontStyle: 'italic' },
  messageDate: { fontFamily: fonts.body, fontSize: 13, color: colors.mist2, marginBottom: 20 },
  messageActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sectionEmoji: { fontSize: 22 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  sectionSubtitle: { fontFamily: fonts.body, fontSize: 15, color: colors.mist, marginBottom: 16, lineHeight: 20 },

  pillRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pillButtonPrimary: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.purpleMid,
    borderRadius: radii.pill, paddingVertical: 12, paddingHorizontal: 20,
  },
  pillButtonPrimaryText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: '#fff', fontWeight: '600' },
  pillButton: {
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: radii.pill, paddingVertical: 12, paddingHorizontal: 20,
    borderWidth: 1, borderColor: 'rgba(248,184,200,0.4)',
  },
  pillButtonText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ink2 },

  errorText: { color: colors.danger, fontSize: 13, marginBottom: 12, textAlign: 'center' },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, marginBottom: 28 },
  oracleCard: {
    width: `${(100 - 3 * (CARD_GAP / 3.6)) / 4}%`,
    aspectRatio: 0.72,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    ...{ shadowColor: '#c878b4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 2 },
  },
  flowerEmoji: { fontSize: 30, marginBottom: 8 },
  tapToPull: { fontFamily: fonts.body, fontSize: 13, color: colors.mist, textAlign: 'center' },
  oracleCardTheme: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.purpleDark, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, textAlign: 'center' },
  oracleCardTitle: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink, textAlign: 'center', fontWeight: '600' },

  horoscopeCard: { alignItems: 'center', marginBottom: 24, paddingVertical: 28 },
  horoscopeTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, textAlign: 'center', marginBottom: 10 },
  horoscopeSubtitle: { fontFamily: fonts.body, fontSize: 15, color: colors.mist, textAlign: 'center', marginBottom: 22 },

  signGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 4 },
  signPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: radii.pill,
    paddingVertical: 10, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(248,184,200,0.35)',
  },
  signPillActive: { backgroundColor: colors.purpleMid, borderColor: colors.purpleMid },
  signIconWrap: { width: 24, height: 24, borderRadius: 6, backgroundColor: colors.purpleAccent, alignItems: 'center', justifyContent: 'center' },
  signIcon: { fontSize: 13, color: '#fff' },
  signLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ink },

  readingLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.purpleDark, letterSpacing: 1, textTransform: 'uppercase', marginTop: 12, marginBottom: 4, alignSelf: 'flex-start' },
  readingText: { fontFamily: fonts.body, fontSize: 15, color: colors.ink, lineHeight: 21, alignSelf: 'stretch' },
  readingAffirmation: { fontFamily: fonts.body, fontSize: 15, color: colors.ink, fontStyle: 'italic', lineHeight: 21, alignSelf: 'stretch' },
  luckyRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(201,168,201,0.2)', alignSelf: 'stretch' },
  luckyText: { fontFamily: fonts.body, fontSize: 13, color: colors.mist2 },

  shareAllWrap: { borderRadius: radii.pill, ...{ shadowColor: '#a878b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.32, shadowRadius: 12, elevation: 5 } },
  shareAllGradient: {
    borderRadius: radii.pill, paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.52)',
  },
  shareAllText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: '#fff', fontWeight: '600' },
});
