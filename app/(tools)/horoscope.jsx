import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, fonts, radii, shadows } from '../../constants/theme';
import { ZODIAC_SIGNS, getStaticHoroscope } from '../../constants/dailyContent';

const STORAGE_KEY = 'mv_star_sign';

export default function Horoscope() {
  const [sign, setSign] = useState(null);
  const [loadingSign, setLoadingSign] = useState(true);
  const [shareError, setShareError] = useState('');
  const cardRef = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => setSign(saved || null)).finally(() => setLoadingSign(false));
  }, []);

  const chooseSign = (key) => {
    setSign(key);
    AsyncStorage.setItem(STORAGE_KEY, key).catch(() => {});
  };

  const changeSign = () => {
    setSign(null);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  const reading = sign ? getStaticHoroscope(sign) : null;
  const signInfo = ZODIAC_SIGNS.find((s) => s.key === sign);

  const handleShare = async () => {
    setShareError('');
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      const available = await Sharing.isAvailableAsync();
      if (!available) { setShareError("Sharing isn't available on this device."); return; }
      await Sharing.shareAsync(uri);
    } catch (e) {
      setShareError('Could not share right now.');
    }
  };

  if (loadingSign) {
    return <GradientBackground><View style={styles.center}><ActivityIndicator size="large" color="#c9a8c9" /></View></GradientBackground>;
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader lead="Horo" accent="scope" subtitle="What's written in the stars today ✨" />

        {!sign ? (
          <View style={styles.pickerWrap}>
            <Text style={styles.pickerTitle}>✨ Your cosmic reading awaits</Text>
            <Text style={styles.pickerSubtitle}>Choose your star sign to receive your daily horoscope</Text>
            <View style={styles.chipRow}>
              {ZODIAC_SIGNS.map((s) => (
                <TouchableOpacity key={s.key} activeOpacity={0.75} style={styles.chip} onPress={() => chooseSign(s.key)}>
                  <Text style={styles.chipText}>{s.symbol} {s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : !reading ? (
          <Text style={styles.muted}>Reading unavailable.</Text>
        ) : (
          <>
            <View ref={cardRef} collapsable={false}>
              <View style={styles.darkCard}>
                <View style={styles.darkCardHeader}>
                  <Text style={styles.darkCardSymbol}>{signInfo?.symbol}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.darkCardSign}>{signInfo?.symbol} {signInfo?.label}</Text>
                    <Text style={styles.darkCardDate}>
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>
                  </View>
                  <TouchableOpacity activeOpacity={0.7} style={styles.changeBtn} onPress={changeSign}>
                    <Text style={styles.changeBtnText}>Change</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.darkLabel}>⚡ Energy Reading</Text>
                <Text style={styles.darkBodyItalic}>{reading.energy_reading}</Text>

                <Text style={styles.darkLabel}>🌟 Manifestation Guidance</Text>
                <Text style={styles.darkBody}>{reading.manifestation_guidance}</Text>

                <Text style={styles.darkLabel}>✅ Today's Action</Text>
                <Text style={styles.darkBody}>{reading.todays_action}</Text>

                <View style={styles.affirmationBox}>
                  <Text style={styles.affirmationText}>"{reading.affirmation}"</Text>
                </View>

                <View style={styles.luckyRow}>
                  <Text style={styles.luckyText}>🔢 Lucky: <Text style={styles.luckyStrong}>{reading.lucky_number}</Text></Text>
                  <Text style={styles.luckyText}>🎨 Colour: <Text style={styles.luckyStrong}>{reading.lucky_colour}</Text></Text>
                </View>
              </View>
            </View>

            {!!shareError && <Text style={styles.errorText}>{shareError}</Text>}

            <TouchableOpacity activeOpacity={0.75} style={styles.shareBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={14} color={colors.ink2} />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  pickerWrap: { alignItems: 'center', paddingVertical: 16 },
  pickerTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, marginBottom: 6, textAlign: 'center' },
  pickerSubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.mist, marginBottom: 20, textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: radii.pill, paddingVertical: 9, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(248,184,200,0.35)', ...shadows.cardSm,
  },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink2, fontWeight: '500' },

  muted: { color: colors.mist, fontSize: 13, textAlign: 'center', marginTop: 20 },

  darkCard: {
    backgroundColor: '#1a0f2e', borderRadius: radii.lg, padding: 22, ...shadows.card,
  },
  darkCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  darkCardSymbol: { fontSize: 30, color: '#fff' },
  darkCardSign: { fontFamily: fonts.display, fontSize: 19, color: '#fff', fontWeight: '400' },
  darkCardDate: { fontFamily: fonts.body, fontSize: 10.5, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
  changeBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: radii.pill, paddingVertical: 5, paddingHorizontal: 12 },
  changeBtnText: { fontFamily: fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.6)' },

  darkLabel: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: 'rgba(220,160,255,0.75)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  darkBodyItalic: { fontFamily: fonts.displayItalic, fontSize: 16, fontStyle: 'italic', color: '#fff', lineHeight: 24, marginBottom: 14 },
  darkBody: { fontFamily: fonts.body, fontSize: 13.5, color: 'rgba(255,255,255,0.85)', lineHeight: 21, marginBottom: 14 },

  affirmationBox: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, marginBottom: 14 },
  affirmationText: { fontFamily: fonts.displayItalic, fontSize: 16, fontStyle: 'italic', color: '#fff', textAlign: 'center' },

  luckyRow: { flexDirection: 'row', gap: 20 },
  luckyText: { fontFamily: fonts.body, fontSize: 12.5, color: 'rgba(255,255,255,0.8)' },
  luckyStrong: { fontFamily: fonts.bodyMedium, fontWeight: '700', color: '#fff' },

  errorText: { color: colors.danger, fontSize: 12, marginTop: 12, textAlign: 'center' },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: radii.pill, paddingVertical: 8, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(248,184,200,0.35)', marginTop: 14, ...shadows.cardSm,
  },
  shareBtnText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.ink2, fontWeight: '500' },
});
