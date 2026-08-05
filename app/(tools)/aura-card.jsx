import { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import ExpandableTextArea from '../../components/ExpandableTextArea';
import { AuraCardFace } from '../../components/AuraCardCanvas';
import { colors, fonts, radii } from '../../constants/theme';
import {
  hashStr, QUICK_ADD, AURA_AFFIRMATIONS, AURA_STYLES, STYLE_KEYS,
  PATTERNS, PATTERN_LABELS, COLOUR_FAMILIES, detectStyle,
} from '../../constants/auraCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_SIZE = Math.min(SCREEN_WIDTH - 40, 400);


export default function AuraCard() {
  const [wordsText, setWordsText] = useState('');
  const [manualStyle, setManualStyle] = useState(null); // null = Auto
  const [pattern, setPattern] = useState('radial');
  const [colours, setColours] = useState({ purple: true, pink: true, blue: true, gold: true });
  // The preview is always live — it reacts to Style/Colours/Pattern as you
  // pick them, it doesn't wait for a "Generate" tap. Generate Card just
  // (re)rolls the footer quote; Clear Card hides the preview until you
  // touch a control again.
  const [quote, setQuote] = useState(AURA_AFFIRMATIONS[0]);
  const [cardHidden, setCardHidden] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [info, setInfo] = useState('');

  const cardRef = useRef(null);
  const activeStyleKey = manualStyle || detectStyle(wordsText || 'aura');

  // Style picker: fixed 2 rows, N scrollable columns (pairs of chips) instead
  // of wrapping every chip across many rows.
  const styleOptions = [
    { key: null, label: '✨ Auto' },
    ...STYLE_KEYS.map((key) => ({ key, label: AURA_STYLES[key].label })),
  ];
  const styleColumns = [];
  for (let i = 0; i < styleOptions.length; i += 2) styleColumns.push(styleOptions.slice(i, i + 2));

  const handleQuickAdd = (word) => {
    setWordsText((prev) => {
      const lines = prev.split('\n').filter(Boolean);
      if (lines.some((l) => l.trim().toLowerCase() === word.toLowerCase())) return prev;
      return [...lines, word].join('\n');
    });
  };

  const handleGenerate = () => {
    const lines = wordsText.split('\n').map((l) => l.trim()).filter(Boolean);
    const joined = lines.join(' ') || 'aura';
    const hash = hashStr(joined.toLowerCase() + Date.now());
    // Prefer the user's own last line as the footer quote; fall back to the
    // curated affirmation bank (re-rolled each tap) so there's always
    // something fresh to show.
    const nextQuote = lines.length ? lines[lines.length - 1] : AURA_AFFIRMATIONS[hash % AURA_AFFIRMATIONS.length];
    setQuote(nextQuote);
    setCardHidden(false);
    setError('');
  };

  const handlePickStyle = (key) => {
    setManualStyle(key); // null when 'Auto' is tapped
    setCardHidden(false);
  };

  const handleShuffle = () => {
    const nextStyle = STYLE_KEYS[Math.floor(Math.random() * STYLE_KEYS.length)];
    const nextPattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
    setManualStyle(nextStyle);
    setPattern(nextPattern);
    setCardHidden(false);
  };

  const handleClearCard = () => setCardHidden(true);

  const toggleColour = (key) => { setColours((prev) => ({ ...prev, [key]: !prev[key] })); setCardHidden(false); };
  const handleResetColours = () => { setColours({ purple: true, pink: true, blue: true, gold: true }); setCardHidden(false); };

  const handleDownload = async () => {
    setError(''); setInfo(''); setDownloading(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, width: 1080, height: 1080 });
      const { granted } = await MediaLibrary.requestPermissionsAsync();
      if (!granted) { setError('Photo library permission is needed to save your card.'); return; }
      await MediaLibrary.saveToLibraryAsync(uri);
      setInfo('Saved to your photos ✨');
      setTimeout(() => setInfo(''), 3000);
    } catch (e) {
      setError(e.message || 'Could not save your aura card');
    } finally { setDownloading(false); }
  };

  const handleShare = async () => {
    setError(''); setInfo(''); setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, width: 1080, height: 1080 });
      const available = await Sharing.isAvailableAsync();
      if (!available) { setInfo('Sharing isn\'t available on this device.'); return; }
      await Sharing.shareAsync(uri);
    } catch (e) {
      setError(e.message || 'Could not share your aura card');
    } finally { setSharing(false); }
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ScreenHeader lead="Your" accent="Aura Card" subtitle="A word, a list, an affirmation set — make it yours. Share it. Start the trend. ✨" />

        <GlassCard style={styles.mb20}>
          <Text style={styles.label}>✨ YOUR WORDS, AFFIRMATIONS & GRATITUDE</Text>
          <ExpandableTextArea
            value={wordsText}
            onChangeText={setWordsText}
            placeholder={'Abundant\nI am magnetic and loved\nI am grateful for everything flowing to me\nMoney comes easily and effortlessly\nI attract all that I desire...'}
            modalTitle="Your Words"
            minHeight={140}
            style={{ marginBottom: 12 }}
          />

          <Text style={styles.quickAddLabel}>Quick add:</Text>
          <View style={styles.chipRow}>
            {QUICK_ADD.map((w) => (
              <TouchableOpacity key={w} style={styles.quickChip} onPress={() => handleQuickAdd(w)}>
                <Text style={styles.quickChipText}>{w}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <Button title="✨ Generate Card" onPress={handleGenerate} fullWidth style={{ marginTop: 10 }} />

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.label}>STYLE</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.smallBtn} onPress={handleClearCard}>
                <Text style={styles.smallBtnText}>Clear Card</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallBtn} onPress={handleShuffle}>
                <Text style={styles.smallBtnText}>🔀 Shuffle</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Two fixed rows, scrolling horizontally in columns, instead of
              wrapping the 18 style chips across many rows. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.styleGridScroll}>
            {styleColumns.map((col, ci) => (
              <View key={ci} style={styles.styleGridCol}>
                {col.map((opt) => (
                  <TouchableOpacity
                    key={opt.key ?? 'auto'}
                    style={[styles.chip, manualStyle === opt.key && styles.chipActive]}
                    onPress={() => handlePickStyle(opt.key)}
                  >
                    <Text style={[styles.chipText, manualStyle === opt.key && styles.chipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.label}>COLOURS</Text>
            <TouchableOpacity style={styles.smallBtn} onPress={handleResetColours}>
              <Text style={styles.smallBtnText}>↺ Reset</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.coloursRow}>
            {COLOUR_FAMILIES.map((f) => (
              <TouchableOpacity key={f.key} style={styles.colourItem} onPress={() => toggleColour(f.key)}>
                <View style={[styles.colourDot, { backgroundColor: f.swatch }, !colours[f.key] && styles.colourDotOff]} />
                <View style={[styles.colourOnPill, !colours[f.key] && styles.colourOnPillOff]}>
                  <Text style={styles.colourOnText}>{colours[f.key] ? 'on' : 'off'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>PATTERN</Text>
          <View style={styles.chipRow}>
            {PATTERNS.map((p) => (
              <TouchableOpacity key={p} style={[styles.chip, pattern === p && styles.chipActive]} onPress={() => { setPattern(p); setCardHidden(false); }}>
                <Text style={[styles.chipText, pattern === p && styles.chipTextActive]}>{PATTERN_LABELS[p]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        {!cardHidden && (
          <>
            <View style={styles.cardOuter}>
              <AuraCardFace
                innerRef={cardRef}
                styleKey={activeStyleKey}
                size={CARD_SIZE}
                pattern={pattern}
                colours={colours}
                quote={quote}
              />
            </View>

            {info ? <Text style={styles.infoText}>{info}</Text> : null}

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleDownload} disabled={downloading}>
                {downloading ? <ActivityIndicator size="small" color="#2e2530" /> : <Text style={styles.actionBtnText}>⬇️ Download</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={handleShare} disabled={sharing}>
                {sharing ? <ActivityIndicator size="small" color="#2e2530" /> : <Text style={styles.actionBtnText}>🔗 Share</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}

      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },

  mb20: { marginBottom: 20 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 4 },
  smallBtn: { backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', borderRadius: radii.pill, paddingVertical: 6, paddingHorizontal: 12 },
  smallBtnText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.ink2, fontWeight: '600' },

  input: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#2e2530',
    marginBottom: 12,
    minHeight: 110,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.25)',
  },

  quickAddLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.mist, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  quickChip: { backgroundColor: 'rgba(201,168,201,0.15)', borderWidth: 1, borderColor: 'rgba(201,168,201,0.3)', borderRadius: radii.pill, paddingVertical: 7, paddingHorizontal: 13 },
  quickChipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.ink2, fontWeight: '500' },

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

  styleGridScroll: { gap: 8, paddingBottom: 4, paddingRight: 4 },
  styleGridCol: { gap: 8 },

  coloursRow: { flexDirection: 'row', gap: 18, marginBottom: 4 },
  colourItem: { alignItems: 'center', gap: 6 },
  colourDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  colourDotOff: { opacity: 0.25 },
  colourOnPill: { backgroundColor: 'rgba(201,168,201,0.2)', borderRadius: radii.pill, paddingVertical: 2, paddingHorizontal: 8 },
  colourOnPillOff: { backgroundColor: 'rgba(0,0,0,0.05)' },
  colourOnText: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.ink2, fontWeight: '600' },

  errorText: { color: '#c04040', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  infoText: { color: '#9a5fa8', fontSize: 12, textAlign: 'center', marginBottom: 12 },

  cardOuter: { alignItems: 'center', marginBottom: 12 },


  actionRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  actionBtn: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 50,
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.3)',
    minWidth: 110,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 13, color: '#2e2530', fontWeight: '500' },
});
