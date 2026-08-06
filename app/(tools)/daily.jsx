import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import { colors, fonts, radii } from '../../constants/theme';
import { DAILY_MESSAGES, ORACLE_CARDS, HOROSCOPE_30_DAYS } from '../../constants/dailyContent';
import { pullOracleCard, getOracleHistory } from '../../services/api';

const STAR_SIGN_KEY = 'mv_star_sign';

// Matches the website's `_DAILY_STAR_SIGNS` order — glyph + name, name is
// the HOROSCOPE_30_DAYS object key.
const STAR_SIGNS = [
  { glyph: '♈', name: 'Aries' }, { glyph: '♉', name: 'Taurus' }, { glyph: '♊', name: 'Gemini' },
  { glyph: '♋', name: 'Cancer' }, { glyph: '♌', name: 'Leo' }, { glyph: '♍', name: 'Virgo' },
  { glyph: '♎', name: 'Libra' }, { glyph: '♏', name: 'Scorpio' }, { glyph: '♐', name: 'Sagittarius' },
  { glyph: '♑', name: 'Capricorn' }, { glyph: '♒', name: 'Aquarius' }, { glyph: '♓', name: 'Pisces' },
];

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

function shuffledIndices(n) {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function Daily() {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const todaysMessage = DAILY_MESSAGES[dayOfYear(now) % DAILY_MESSAGES.length];
  const todaysDate = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const [oracleOrder, setOracleOrder] = useState(() => shuffledIndices(ORACLE_CARDS.length));
  const [pulledSlot, setPulledSlot] = useState(null);
  // Oracle pulls were purely local before, so nothing survived a reload and
  // /oracle/pull + /oracle/history were never called. A pull is now recorded
  // server-side and past pulls are listed underneath.
  const [oracleHistory, setOracleHistory] = useState([]);
  const [showOracleHistory, setShowOracleHistory] = useState(false);

  const [starSign, setStarSignState] = useState(null);
  const [loadedSign, setLoadedSign] = useState(false);

  const contentRef = useRef(null);
  const [sharingAll, setSharingAll] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STAR_SIGN_KEY).then((s) => { if (s) setStarSignState(s); setLoadedSign(true); });
  }, []);

  const loadOracleHistory = async () => {
    try {
      const h = await getOracleHistory();
      setOracleHistory(Array.isArray(h) ? h : (h?.pulls || []));
    } catch (_) {}
  };

  useEffect(() => { loadOracleHistory(); }, []);

  const handleShuffleOracle = () => { setOracleOrder(shuffledIndices(ORACLE_CARDS.length)); setPulledSlot(null); };
  const handleClearOracle = () => setPulledSlot(null);

  // Record the pull server-side, best-effort — the card still flips locally
  // even if the network call fails, so the reading is never blocked.
  const handlePullSlot = (slot) => {
    setPulledSlot(slot);
    pullOracleCard().then(loadOracleHistory).catch(() => {});
  };

  const deck = oracleOrder.slice(0, 7);
  const pulledCard = pulledSlot != null ? ORACLE_CARDS[deck[pulledSlot]] : null;

  const handleSetStarSign = (name) => {
    setStarSignState(name);
    AsyncStorage.setItem(STAR_SIGN_KEY, name).catch(() => {});
  };
  const handleChangeSign = () => {
    setStarSignState(null);
    AsyncStorage.removeItem(STAR_SIGN_KEY).catch(() => {});
  };

  const horoscopeIdx = ((dayOfYear(now) - 1 + 30) % 30);
  const horoscope = starSign ? (HOROSCOPE_30_DAYS[starSign]?.[horoscopeIdx] || HOROSCOPE_30_DAYS[starSign]?.[0] || null) : null;

  const readAloud = (text) => {
    Speech.stop();
    Speech.speak(text, { rate: 0.9 });
  };

  const shareText = async (text) => {
    try { await Share.share({ message: text }); } catch (_) {}
  };

  const handleShareAllImage = async () => {
    setSharingAll(true);
    try {
      const uri = await captureRef(contentRef, { format: 'png', quality: 1 });
      const available = await Sharing.isAvailableAsync();
      if (available) await Sharing.shareAsync(uri);
    } catch (_) {} finally { setSharingAll(false); }
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 46, paddingBottom: 40 }}>
        <View ref={contentRef} collapsable={false}>
          <ScreenHeader lead="Daily" accent="Energy" subtitle="Your message for today. Your oracle pull. Your energy. ✨" />

          <GlassCard style={styles.cardMargin} contentStyle={styles.messageCardContent}>
            <Text style={styles.label}>✨ TODAY'S MESSAGE</Text>
            <Text style={styles.messageText}>"{todaysMessage}"</Text>
            <Text style={styles.dateText}>{todaysDate}</Text>
            <View style={styles.btnRow}>
              <Button title="📤 Share This Message" size="sm" variant="ghost" onPress={() => shareText(todaysMessage)} />
              <Button title="🔊 Read Aloud" size="sm" variant="ghost" onPress={() => readAloud(todaysMessage)} />
            </View>
          </GlassCard>

          <Text style={styles.sectionHeading}>🔮 Oracle Pull</Text>
          <Text style={styles.sectionSub}>Quiet your mind. Hold your question. Then tap a card.</Text>
          <View style={[styles.btnRow, styles.oracleControlsRow]}>
            <Button title="🔀 Shuffle Deck" size="sm" variant="ghost" onPress={handleShuffleOracle} />
            <Button title="✕ Clear" size="sm" variant="ghost" onPress={handleClearOracle} />
          </View>

          <View style={styles.oracleGrid}>
            {deck.map((cardIdx, slot) => {
              const isPulled = pulledSlot === slot;
              const card = ORACLE_CARDS[cardIdx];
              return (
                <TouchableOpacity key={slot} style={[styles.oracleTile, isPulled && styles.oracleTileFlipped]} onPress={() => handlePullSlot(slot)}>
                  {isPulled ? (
                    <>
                      <Text style={styles.oracleTileIcon}>{card.ic}</Text>
                      <Text style={styles.oracleTileName} numberOfLines={2}>{card.name}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.oracleTileIcon}>🌸</Text>
                      <Text style={styles.oracleTileHint}>Tap to pull</Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {pulledCard && (
            <GlassCard style={styles.cardMargin}>
              <Text style={styles.oracleRevealIcon}>{pulledCard.ic}</Text>
              <Text style={styles.oracleRevealName}>{pulledCard.name}</Text>
              <Text style={styles.oracleRevealKeyword}>{pulledCard.keyword}</Text>
              <Text style={styles.oracleRevealMsg}>{pulledCard.msg}</Text>
              <Text style={styles.oracleRevealAction}>✨ Today's Practice: {pulledCard.action}</Text>
              <View style={styles.btnRow}>
                <Button title="📤 Share" size="sm" variant="ghost" onPress={() => shareText(`${pulledCard.name}. ${pulledCard.msg} ${pulledCard.action}`)} />
                <Button title="🔊 Read Aloud" size="sm" variant="ghost" onPress={() => readAloud(`${pulledCard.name}. ${pulledCard.msg} ${pulledCard.action}`)} />
              </View>
            </GlassCard>
          )}

          {oracleHistory.length > 0 && (
            <>
              <TouchableOpacity style={styles.historyHead} onPress={() => setShowOracleHistory((v) => !v)}>
                <Text style={styles.historyHeadText}>🗂 Past Pulls ({oracleHistory.length})</Text>
                <Text style={styles.historyChevron}>{showOracleHistory ? '▾' : '▸'}</Text>
              </TouchableOpacity>
              {showOracleHistory && oracleHistory.map((h, i) => {
                const name = h.card_name || h.card || h.name || 'Oracle Card';
                const when = h.created_at || h.pulled_at || h.date;
                return (
                  <View key={h.id ?? i} style={styles.historyRow}>
                    <Text style={styles.historyRowName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.historyRowDate}>
                      {when ? new Date(when).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </Text>
                  </View>
                );
              })}
            </>
          )}

          <Text style={styles.sectionHeading}>📈 Your Horoscope</Text>

          {!loadedSign ? null : !starSign ? (
            <GlassCard style={styles.cardMargin}>
              <Text style={styles.horoscopeAwaits}>✨ Your cosmic reading awaits</Text>
              <Text style={styles.sectionSub}>Choose your star sign to receive your daily horoscope</Text>
              <View style={styles.signGrid}>
                {STAR_SIGNS.map((s) => (
                  <TouchableOpacity key={s.name} style={styles.signChip} onPress={() => handleSetStarSign(s.name)}>
                    <Text style={styles.signChipText}>{s.glyph} {s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </GlassCard>
          ) : horoscope ? (
            <GlassCard style={styles.horoscopeCard} tint="light">
              <View style={styles.horoscopeHead}>
                <Text style={styles.horoscopeGlyph}>{STAR_SIGNS.find((s) => s.name === starSign)?.glyph}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.horoscopeSign}>{starSign}</Text>
                  <Text style={styles.horoscopeDate}>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</Text>
                </View>
                <TouchableOpacity onPress={handleChangeSign} style={styles.changeBtn}><Text style={styles.changeBtnText}>Change</Text></TouchableOpacity>
              </View>

              <Text style={styles.horoscopeLabel}>⚡ ENERGY READING</Text>
              <Text style={styles.horoscopeEnergy}>{horoscope.energy_reading}</Text>

              <Text style={styles.horoscopeLabel}>🌟 MANIFESTATION GUIDANCE</Text>
              <Text style={styles.horoscopeBody}>{horoscope.manifestation_guidance}</Text>

              <Text style={styles.horoscopeLabel}>✅ TODAY'S ACTION</Text>
              <Text style={styles.horoscopeBody}>{horoscope.todays_action}</Text>

              <View style={styles.horoscopeQuoteBox}>
                <Text style={styles.horoscopeQuote}>"{horoscope.affirmation}"</Text>
              </View>

              <View style={styles.horoscopeMetaRow}>
                <Text style={styles.horoscopeMeta}>🔢 Lucky: <Text style={styles.horoscopeMetaBold}>{horoscope.lucky_number}</Text></Text>
                <Text style={styles.horoscopeMeta}>🎨 Colour: <Text style={styles.horoscopeMetaBold}>{horoscope.lucky_colour}</Text></Text>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.horoscopeActionBtn} onPress={() => setStarSignState((s) => s)}>
                  <Text style={styles.horoscopeActionBtnText}>🔄 Refresh</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.horoscopeActionBtn} onPress={() => shareText(`${starSign} — ${horoscope.affirmation}`)}>
                  <Text style={styles.horoscopeActionBtnText}>📤 Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.horoscopeActionBtn} onPress={() => readAloud(`${horoscope.energy_reading} ${horoscope.manifestation_guidance} ${horoscope.todays_action}`)}>
                  <Text style={styles.horoscopeActionBtnText}>🔊 Read Aloud</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          ) : null}
        </View>

        <Button title="📤 Share All as Image" onPress={handleShareAllImage} loading={sharingAll} fullWidth style={{ marginTop: 20 }} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  cardMargin: { marginBottom: 20 },
  messageCardContent: { paddingVertical: 28, paddingHorizontal: 24 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, marginBottom: 10, textTransform: 'uppercase', textAlign: 'center' },
  messageText: { fontFamily: fonts.displayItalic, fontSize: 22, color: colors.ink, fontStyle: 'italic', textAlign: 'center', lineHeight: 32, marginBottom: 12 },
  dateText: { fontFamily: fonts.body, fontSize: 11.5, color: colors.mist, textAlign: 'center', marginBottom: 14 },
  btnRow: { flexDirection: 'row', gap: 8 },
  oracleControlsRow: { marginBottom: 16 },

  sectionHeading: { fontFamily: fonts.displayMedium, fontSize: 18, color: colors.ink, fontWeight: '600', marginBottom: 4 },

  historyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 8 },
  historyHeadText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.purpleDark, fontWeight: '700' },
  historyChevron: { fontSize: 12, color: colors.mist },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.25)',
    borderRadius: radii.sm, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 6,
  },
  historyRowName: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  historyRowDate: { fontFamily: fonts.body, fontSize: 11, color: colors.mist2 },
  sectionSub: { fontFamily: fonts.body, fontSize: 12.5, color: colors.mist, marginBottom: 14 },

  oracleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  oracleTile: { width: '22%', aspectRatio: 0.85, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', padding: 4 },
  oracleTileFlipped: { backgroundColor: 'rgba(201,168,201,0.15)', borderColor: colors.purpleMid },
  oracleTileIcon: { fontSize: 22, marginBottom: 4 },
  oracleTileHint: { fontFamily: fonts.body, fontSize: 9.5, color: colors.mist },
  oracleTileName: { fontFamily: fonts.bodyMedium, fontSize: 9.5, color: colors.purpleDark, textAlign: 'center', fontWeight: '600' },

  oracleRevealIcon: { fontSize: 34, textAlign: 'center', marginBottom: 6 },
  oracleRevealName: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, textAlign: 'center', marginBottom: 2 },
  oracleRevealKeyword: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.purpleDark, textAlign: 'center', marginBottom: 12, fontWeight: '600' },
  oracleRevealMsg: { fontFamily: fonts.body, fontSize: 14, color: colors.ink2, lineHeight: 21, marginBottom: 12, textAlign: 'center' },
  oracleRevealAction: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.purpleDark, lineHeight: 19, marginBottom: 14, fontWeight: '600', textAlign: 'center' },

  horoscopeAwaits: { fontFamily: fonts.displayMedium, fontSize: 17, color: colors.ink, textAlign: 'center', marginBottom: 6 },
  signGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  signChip: { backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.35)', borderRadius: radii.pill, paddingVertical: 9, paddingHorizontal: 14 },
  signChipText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.ink2, fontWeight: '500' },

  horoscopeCard: { marginBottom: 20, backgroundColor: 'rgba(255,209,232,0.16)', borderColor: 'rgba(248,184,200,0.35)' },
  horoscopeHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  horoscopeGlyph: { fontSize: 30, color: colors.purpleDark },
  horoscopeSign: { fontFamily: fonts.display, fontSize: 19, color: colors.ink, fontWeight: '400' },
  horoscopeDate: { fontFamily: fonts.body, fontSize: 10, color: colors.mist, letterSpacing: 1, marginTop: 2 },
  changeBtn: { borderWidth: 1, borderColor: 'rgba(154,95,168,0.25)', borderRadius: radii.pill, paddingVertical: 5, paddingHorizontal: 12 },
  changeBtnText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.purpleDark },

  horoscopeLabel: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5, marginTop: 12 },
  horoscopeEnergy: { fontFamily: fonts.displayItalic, fontSize: 15.5, color: colors.ink, fontStyle: 'italic', lineHeight: 23 },
  horoscopeBody: { fontFamily: fonts.body, fontSize: 13.5, color: colors.ink2, lineHeight: 20 },
  horoscopeQuoteBox: { backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: radii.sm, padding: 14, marginTop: 14, marginBottom: 14 },
  horoscopeQuote: { fontFamily: fonts.displayItalic, fontSize: 16, color: colors.ink, fontStyle: 'italic', textAlign: 'center', lineHeight: 23 },
  horoscopeMetaRow: { flexDirection: 'row', gap: 18, marginBottom: 16 },
  horoscopeMeta: { fontFamily: fonts.body, fontSize: 12.5, color: colors.ink2 },
  horoscopeMetaBold: { fontFamily: fonts.bodyMedium, fontWeight: '700', color: colors.ink },
  horoscopeActionBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.35)', borderRadius: radii.pill, paddingVertical: 8, alignItems: 'center' },
  horoscopeActionBtnText: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: colors.purpleDark, fontWeight: '600' },
});
