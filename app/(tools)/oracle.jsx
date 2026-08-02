import { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as Speech from 'expo-speech';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, fonts, radii, shadows } from '../../constants/theme';
import { ORACLE_CARDS, getTodaysMessage, shuffleOracleDeck } from '../../constants/dailyContent';

const DECK_SIZE = 7;

function todaysDateLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// A pill button matching the site's .btn-g (translucent white / pink border)
// or .daily-card-share-btn look, reused for every Share/Read Aloud action here.
function ActionPill({ icon, label, onPress, primary }) {
  return (
    <TouchableOpacity activeOpacity={0.75} style={[styles.actionPill, primary && styles.actionPillPrimary]} onPress={onPress}>
      <Ionicons name={icon} size={13} color={primary ? '#fff' : colors.ink2} />
      <Text style={[styles.actionPillText, primary && styles.actionPillTextPrimary]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function Oracle() {
  const todaysMessage = useMemo(() => getTodaysMessage(), []);
  const [deck, setDeck] = useState(() => shuffleOracleDeck().slice(0, DECK_SIZE));
  const [pulledSlot, setPulledSlot] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [shareError, setShareError] = useState('');

  const pulledCard = pulledSlot != null ? ORACLE_CARDS[deck[pulledSlot]] : null;

  const messageRef = useRef(null);
  const revealRef = useRef(null);
  const allRef = useRef(null);

  const handleShuffle = () => {
    setDeck(shuffleOracleDeck().slice(0, DECK_SIZE));
    setPulledSlot(null);
  };

  const handleClear = () => setPulledSlot(null);

  const handlePull = (slot) => setPulledSlot(slot);

  const readAloud = (text) => {
    Speech.stop();
    setSpeaking(true);
    Speech.speak(text, { rate: 0.95, onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false), onError: () => setSpeaking(false) });
  };

  const shareRef = async (ref, filename) => {
    setShareError('');
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 1 });
      const available = await Sharing.isAvailableAsync();
      if (!available) { setShareError("Sharing isn't available on this device."); return; }
      await Sharing.shareAsync(uri);
    } catch (e) {
      setShareError('Could not share right now.');
    }
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader lead="Daily" accent="Energy" subtitle="Your message for today. Your oracle pull. Your energy. ✨" />

        <View ref={allRef} collapsable={false}>
          {/* Today's Message */}
          <View ref={messageRef} collapsable={false} style={styles.section}>
            <GlassCard style={styles.messageCard}>
              <Text style={styles.eyebrow}>✨ TODAY'S MESSAGE</Text>
              <Text style={styles.messageText}>"{todaysMessage}"</Text>
              <Text style={styles.dateText}>{todaysDateLabel()}</Text>
              <View style={styles.actionRow}>
                <ActionPill icon="share-social-outline" label="Share This Message" primary onPress={() => shareRef(messageRef, 'manivers-daily.png')} />
                <ActionPill icon="volume-high-outline" label="Read Aloud" onPress={() => readAloud(todaysMessage)} />
              </View>
            </GlassCard>
          </View>

          {/* Oracle Pull */}
          <Text style={styles.sectionHeading}>🔮 Oracle Pull</Text>
          <Text style={styles.sectionSubtitle}>Quiet your mind. Hold your question. Then tap a card.</Text>

          <View style={styles.actionRow}>
            <ActionPill icon="shuffle-outline" label="Shuffle Deck" primary onPress={handleShuffle} />
            <ActionPill icon="close-outline" label="Clear" onPress={handleClear} />
          </View>

          <View style={styles.deckGrid}>
            {deck.map((cardIdx, slot) => {
              const flipped = pulledSlot === slot;
              const card = ORACLE_CARDS[cardIdx];
              return (
                <TouchableOpacity key={slot} activeOpacity={0.8} style={[styles.deckCard, flipped && styles.deckCardFlipped]} onPress={() => handlePull(slot)}>
                  {flipped ? (
                    <>
                      <Text style={styles.deckCardIcon}>{card.ic}</Text>
                      <Text style={styles.deckCardName}>{card.name}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.deckCardFlower}>🌸</Text>
                      <Text style={styles.deckCardHint}>Tap to pull</Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {pulledCard && (
            <View ref={revealRef} collapsable={false} style={styles.section}>
              <View style={styles.cardGlow}>
                <GlassCard style={styles.oracleCard} intensity={45}>
                  <Text style={styles.oracleIcon}>{pulledCard.ic}</Text>
                  <Text style={styles.oracleTitle}>{pulledCard.name}</Text>
                  <Text style={styles.oracleTheme}>{pulledCard.keyword}</Text>
                  <Text style={styles.oracleMessage}>{pulledCard.msg}</Text>
                  <Text style={styles.oracleAction}>✨ Today's Practice: {pulledCard.action}</Text>
                  <View style={styles.actionRow}>
                    <ActionPill icon="share-social-outline" label="Share" primary onPress={() => shareRef(revealRef, 'manivers-oracle.png')} />
                    <ActionPill
                      icon="volume-high-outline"
                      label="Read Aloud"
                      onPress={() => readAloud(`${pulledCard.name}. ${pulledCard.msg} ${pulledCard.action}`)}
                    />
                  </View>
                </GlassCard>
              </View>
            </View>
          )}
        </View>

        {!!shareError && <Text style={styles.errorText}>{shareError}</Text>}

        <TouchableOpacity activeOpacity={0.85} style={styles.shareAllBtn} onPress={() => shareRef(allRef, 'manivers-daily-energy.png')}>
          <Ionicons name="share-social-outline" size={15} color="#fff" />
          <Text style={styles.shareAllText}>Share All as Image</Text>
        </TouchableOpacity>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  section: { marginBottom: 20 },

  eyebrow: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' },
  messageCard: { alignItems: 'center', paddingVertical: 26 },
  messageText: { fontFamily: fonts.displayItalic, fontSize: 19, fontStyle: 'italic', color: colors.ink, textAlign: 'center', lineHeight: 28, marginBottom: 10 },
  dateText: { fontFamily: fonts.body, fontSize: 12, color: colors.mist, marginBottom: 14 },

  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  actionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: radii.pill,
    paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(248,184,200,0.35)',
    ...shadows.cardSm,
  },
  actionPillPrimary: { backgroundColor: colors.pinkAccent, borderColor: colors.pinkAccent },
  actionPillText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.ink2, fontWeight: '500' },
  actionPillTextPrimary: { color: '#fff' },

  sectionHeading: { fontFamily: fonts.display, fontSize: 20, fontWeight: '400', color: colors.ink, marginBottom: 4 },
  sectionSubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.mist, marginBottom: 14 },

  deckGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 8 },
  deckCard: {
    width: 92, height: 112, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1, borderColor: 'rgba(248,184,200,0.35)', alignItems: 'center', justifyContent: 'center',
    ...shadows.cardSm,
  },
  deckCardFlipped: { backgroundColor: 'rgba(232,216,240,0.55)', borderColor: colors.purpleMid },
  deckCardFlower: { fontSize: 22, marginBottom: 6 },
  deckCardHint: { fontFamily: fonts.body, fontSize: 11, color: colors.mist },
  deckCardIcon: { fontSize: 26, marginBottom: 6 },
  deckCardName: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, textAlign: 'center', paddingHorizontal: 4 },

  cardGlow: {
    borderRadius: 28, shadowColor: '#9a5fa8', shadowOpacity: 0.18, shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  oracleCard: { borderRadius: 28, paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center' },
  oracleIcon: { fontSize: 40, marginBottom: 8 },
  oracleTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, fontWeight: '400', marginBottom: 6, textAlign: 'center' },
  oracleTheme: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.purpleDark, fontWeight: '600', marginBottom: 14 },
  oracleMessage: { fontFamily: fonts.displayItalic, fontSize: 15, fontStyle: 'italic', color: colors.ink, textAlign: 'center', lineHeight: 24, marginBottom: 12 },
  oracleAction: { fontFamily: fonts.body, fontSize: 12.5, color: colors.mist, textAlign: 'center', fontStyle: 'italic', marginBottom: 16 },

  errorText: { color: colors.danger, fontSize: 12, marginBottom: 10, textAlign: 'center' },

  shareAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.purpleDark, borderRadius: radii.pill, paddingVertical: 13, marginTop: 4,
    ...shadows.button,
  },
  shareAllText: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: '#fff', fontWeight: '600' },
});
