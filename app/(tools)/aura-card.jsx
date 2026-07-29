import { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Circle, Rect } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import { colors, fonts, radii } from '../../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_SIZE = Math.min(SCREEN_WIDTH - 40, 400);

// ─── Deterministic hash — same input always produces the same number ──────
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

const AURA_AFFIRMATIONS = [
  'I am magnetic to everything I desire.',
  'My aura attracts only the highest good.',
  'I radiate love, abundance and peace.',
  'I am exactly where I am meant to be.',
  'Everything I touch turns to gold.',
  'I am a powerful creator of my reality.',
  'My energy speaks before I do.',
  'The universe conspires in my favour.',
  'I attract miracles effortlessly.',
  'My vibration is my superpower.',
  'I am worthy of all that I desire.',
  'Love and abundance flow to me freely.',
  'I am in perfect alignment with my dreams.',
  'My presence is a gift to the world.',
  'I shine with undeniable light.',
];

// Shared center glow, layered on top of every style identically
const CENTER_GLOW = { cx: 0.5, cy: 0.5, r: 0.18, stops: [[0, '#ffffff', 0.45], [100, '#ffffff', 0]] };

// Hand-placed starfield dots for the midnight style only
const STAR_DOTS = [
  { x: 0.12, y: 0.12, r: 1.4, o: 0.5 }, { x: 0.85, y: 0.1, r: 1.1, o: 0.4 },
  { x: 0.22, y: 0.28, r: 0.9, o: 0.35 }, { x: 0.92, y: 0.3, r: 1.3, o: 0.5 },
  { x: 0.07, y: 0.55, r: 1, o: 0.4 }, { x: 0.9, y: 0.62, r: 0.9, o: 0.3 },
  { x: 0.15, y: 0.85, r: 1.2, o: 0.45 }, { x: 0.88, y: 0.88, r: 1, o: 0.35 },
  { x: 0.5, y: 0.08, r: 0.8, o: 0.3 }, { x: 0.35, y: 0.93, r: 1, o: 0.4 },
];

// ─── The 5 v1 styles — colours ported directly from the website source ────
const AURA_STYLES = {
  pastel: {
    label: '🌸 Aura Blush',
    dark: false,
    bg: { type: 'solid', colors: ['#fef6f0'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, stops: [[0, '#f28c95', 0.88], [40, '#f2bfb4', 0.62], [70, '#f1cca6', 0.32], [100, '#f1cca6', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, stops: [[0, '#c8b4f0', 0.42], [100, '#c8b4f0', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, stops: [[0, '#ffdcb4', 0.48], [100, '#ffdcb4', 0]] },
    text: { name: 'rgba(60,38,50,.9)', subtitle: 'rgba(190,110,140,.85)', affirmation: 'rgba(78,55,65,.65)' },
    lineColor: 'rgba(168,123,168,0.2)',
  },
  golden: {
    label: '🌅 Blushing Sands',
    dark: false,
    bg: { type: 'linear', colors: ['#fef5e8', '#fdf0e5', '#fdeae0'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, stops: [[0, '#f1cca6', 0.95], [40, '#f2bfb4', 0.72], [70, '#f28c95', 0.38], [100, '#f28c95', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, stops: [[0, '#f2e6b8', 0.55], [100, '#f2e6b8', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, stops: [[0, '#f28c95', 0.45], [100, '#f28c95', 0]] },
    text: { name: 'rgba(58,35,30,.9)', subtitle: 'rgba(192,100,100,.82)', affirmation: 'rgba(78,52,48,.65)' },
    lineColor: 'rgba(168,123,168,0.2)',
  },
  midnight: {
    label: '🌙 Midnight Aura',
    dark: true,
    bg: { type: 'linear', colors: ['#0d0818', '#130c22', '#0e0618'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, stops: [[0, '#b464ff', 0.65], [55, '#783cc8', 0.35], [100, '#783cc8', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, stops: [[0, '#5078ff', 0.4], [100, '#5078ff', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, stops: [[0, '#dc50b4', 0.35], [100, '#dc50b4', 0]] },
    text: { name: 'rgba(250,235,255,.95)', subtitle: 'rgba(200,155,255,.88)', affirmation: 'rgba(185,160,240,.72)' },
    lineColor: 'rgba(255,255,255,0.14)',
    stars: true,
  },
  sage: {
    label: '🌿 Sage Aura',
    dark: false,
    bg: { type: 'linear', colors: ['#f2f8f4', '#eef5f0'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, stops: [[0, '#8cc8a5', 0.82], [40, '#a0d7b4', 0.5], [70, '#b4e6c8', 0.22], [100, '#b4e6c8', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, stops: [[0, '#c8f0c8', 0.4], [100, '#c8f0c8', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, stops: [[0, '#a0c8aa', 0.45], [100, '#a0c8aa', 0]] },
    text: { name: 'rgba(30,55,40,.88)', subtitle: 'rgba(70,130,90,.82)', affirmation: 'rgba(45,70,50,.65)' },
    lineColor: 'rgba(168,123,168,0.2)',
  },
  // Approximated — not pulled from an exact website value, sits between
  // pastel and golden in warmth as a reasonable stand-in for v1.
  rose: {
    label: '🌹 Rose Aura',
    dark: false,
    bg: { type: 'linear', colors: ['#fdf0f2', '#fce8ec'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, stops: [[0, '#e86e8c', 0.85], [40, '#f0a0af', 0.55], [70, '#f5c3c8', 0.3], [100, '#f5c3c8', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, stops: [[0, '#dca0d2', 0.4], [100, '#dca0d2', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, stops: [[0, '#f5aaa0', 0.45], [100, '#f5aaa0', 0]] },
    text: { name: 'rgba(70,30,45,.9)', subtitle: 'rgba(200,80,120,.85)', affirmation: 'rgba(85,45,58,.65)' },
    lineColor: 'rgba(168,123,168,0.2)',
  },
};

const STYLE_KEYS = Object.keys(AURA_STYLES);

// Keyword auto-match, ported from the website. NOTE: the website's table also
// maps peace/calm/free/freedom/crystal/clear -> a 6th "crystal" style that
// isn't part of this v1's 5 built styles, so that group is omitted here and
// simply falls through to the pastel default like any other unmatched text.
function detectStyle(text) {
  const t = text.toLowerCase();
  if (/love|loved|heart|romance/.test(t)) return 'rose';
  if (/wealth|money|abundant|rich|gold/.test(t)) return 'golden';
  if (/heal|health|body|nature|sage/.test(t)) return 'sage';
  if (/dream|magic|moon|star|mystic|night|cosmos/.test(t)) return 'midnight';
  return 'pastel';
}

// ─── SVG gradient-orb composition, shared across all 5 styles ─────────────
function AuraCardSvg({ styleKey, size }) {
  const s = AURA_STYLES[styleKey];
  const orbs = [s.mainOrb, s.orb1, s.orb2, CENTER_GLOW];

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        {s.bg.type === 'linear' && (
          <LinearGradient id={`bg-${styleKey}`} x1="10%" y1="0%" x2="90%" y2="100%">
            {s.bg.colors.map((c, i) => (
              <Stop key={i} offset={`${(i / (s.bg.colors.length - 1)) * 100}%`} stopColor={c} />
            ))}
          </LinearGradient>
        )}
        {orbs.map((orb, i) => (
          <RadialGradient key={i} id={`orb-${styleKey}-${i}`}>
            {orb.stops.map((stop, j) => (
              <Stop key={j} offset={`${stop[0]}%`} stopColor={stop[1]} stopOpacity={stop[2]} />
            ))}
          </RadialGradient>
        ))}
      </Defs>

      <Rect x="0" y="0" width={size} height={size} fill={s.bg.type === 'solid' ? s.bg.colors[0] : `url(#bg-${styleKey})`} />

      {orbs.map((orb, i) => (
        <Circle key={i} cx={orb.cx * size} cy={orb.cy * size} r={orb.r * size} fill={`url(#orb-${styleKey}-${i})`} />
      ))}

      {s.stars && STAR_DOTS.map((d, i) => (
        <Circle key={`star-${i}`} cx={d.x * size} cy={d.y * size} r={d.r} fill="#ffffff" opacity={d.o} />
      ))}
    </Svg>
  );
}

export default function AuraCard() {
  const [nameInput, setNameInput] = useState('');
  const [manualStyle, setManualStyle] = useState(null);
  const [card, setCard] = useState(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [info, setInfo] = useState('');

  const cardRef = useRef(null);
  const activeStyleKey = card ? card.styleKey : manualStyle;

  const handleNameChange = (text) => {
    setNameInput(text);
    setManualStyle(null); // a fresh name gets a fresh auto-suggestion
  };

  const handleGenerate = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) { setError('Type a name or word first ✨'); return; }
    setError(''); setInfo('');
    const styleKey = manualStyle || detectStyle(trimmed);
    const hash = hashStr(trimmed.toLowerCase());
    const affirmation = AURA_AFFIRMATIONS[hash % AURA_AFFIRMATIONS.length];
    setCard({ name: trimmed, styleKey, affirmation });
  };

  const handlePickStyle = (key) => {
    setManualStyle(key);
    if (card) setCard((c) => ({ ...c, styleKey: key }));
  };

  const handleShuffle = () => {
    const current = activeStyleKey;
    let next;
    do { next = STYLE_KEYS[Math.floor(Math.random() * STYLE_KEYS.length)]; } while (next === current && STYLE_KEYS.length > 1);
    setManualStyle(next);
    if (card) setCard((c) => ({ ...c, styleKey: next }));
  };

  const handleDownload = async () => {
    setError(''); setInfo(''); setDownloading(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
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
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      const available = await Sharing.isAvailableAsync();
      if (!available) { setInfo('Sharing isn\'t available on this device.'); return; }
      await Sharing.shareAsync(uri);
    } catch (e) {
      setError(e.message || 'Could not share your aura card');
    } finally { setSharing(false); }
  };

  const activeStyle = activeStyleKey ? AURA_STYLES[activeStyleKey] : null;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <ScreenHeader lead="Aura" accent="Card" subtitle={`Turn your name into a shareable energy reading ✨`} />

        <GlassCard style={styles.mb20}>
          <Text style={styles.intro}>Type your name, a word, or an intention</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Luna, Abundance, Wildflower..."
            placeholderTextColor="#9a8896"
            value={nameInput}
            onChangeText={handleNameChange}
          />

          <View style={styles.chipRow}>
            {STYLE_KEYS.map((key) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, activeStyleKey === key && styles.chipActive]}
                onPress={() => handlePickStyle(key)}
              >
                <Text style={[styles.chipText, activeStyleKey === key && styles.chipTextActive]}>{AURA_STYLES[key].label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.chip} onPress={handleShuffle}>
              <Text style={styles.chipText}>🎲 Shuffle</Text>
            </TouchableOpacity>
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <Button title="Generate ✨" onPress={handleGenerate} fullWidth />
        </GlassCard>

        {card && activeStyle && (
          <>
            <View style={styles.cardOuter}>
              <View ref={cardRef} collapsable={false} style={[styles.cardCapture, { width: CARD_SIZE, height: CARD_SIZE }]}>
                <AuraCardSvg styleKey={activeStyleKey} size={CARD_SIZE} />
                <View style={styles.overlay}>
                  <View style={{ flex: 2.2 }} />
                  <View style={[styles.decorLine, { backgroundColor: activeStyle.lineColor, width: CARD_SIZE * 0.16 }]} />
                  <View style={{ flex: 1 }} />
                  <Text
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    style={[styles.nameText, { color: activeStyle.text.name, fontSize: CARD_SIZE * 0.1 }]}
                  >
                    {card.name.toUpperCase()}
                  </Text>
                  <Text style={[styles.subtitleText, { color: activeStyle.text.subtitle, fontSize: CARD_SIZE * 0.032 }]}>
                    ✨ Your Energy · Your Aura ✨
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text
                    numberOfLines={3}
                    style={[styles.affirmationText, { color: activeStyle.text.affirmation, fontSize: CARD_SIZE * 0.038 }]}
                  >
                    {card.affirmation}
                  </Text>
                  <View style={{ flex: 1.4 }} />
                  <View style={[styles.decorLine, { backgroundColor: activeStyle.lineColor, width: CARD_SIZE * 0.16 }]} />
                  <View style={{ flex: 0.6 }} />
                  <Text style={[styles.watermark, { fontSize: CARD_SIZE * 0.03 }]}>manivers.com</Text>
                  <View style={{ flex: 0.5 }} />
                </View>
              </View>
            </View>

            <Text style={styles.styleLabel}>{activeStyle.label}</Text>
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

  intro: { color: '#6b5c66', fontSize: 13, fontWeight: '500', marginBottom: 14, textAlign: 'center' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#2e2530',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.25)',
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
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
  infoText: { color: '#9a5fa8', fontSize: 12, textAlign: 'center', marginBottom: 12 },

  cardOuter: { alignItems: 'center', marginBottom: 12 },
  cardCapture: { borderRadius: 24, overflow: 'hidden' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', paddingHorizontal: '8%' },

  decorLine: { height: 1 },
  nameText: { fontWeight: '300', letterSpacing: 3, textAlign: 'center' },
  subtitleText: { fontStyle: 'italic', marginTop: 6, textAlign: 'center' },
  affirmationText: { textAlign: 'center', lineHeight: 20 },
  watermark: { color: 'rgba(155,109,255,0.55)', letterSpacing: 1 },

  styleLabel: { textAlign: 'center', fontSize: 12, color: '#6b5c66', fontWeight: '500', marginBottom: 16 },

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