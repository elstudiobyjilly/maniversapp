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
import ExpandableTextArea from '../../components/ExpandableTextArea';
import { colors, fonts, radii } from '../../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_SIZE = Math.min(SCREEN_WIDTH - 40, 400);

// ─── Deterministic hash — same input always produces the same number ──────
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

const QUICK_ADD = ['Abundant', 'Loved', 'Magnetic', 'Healed', 'Wealthy'];

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
  'Every day I grow closer to the life I truly desire.',
];

// Shared center glow, layered on top of every style identically. Neutral —
// not tied to any of the 4 colour-family toggles.
const CENTER_GLOW = { cx: 0.5, cy: 0.5, r: 0.18, stops: [[0, '#ffffff', 0.45], [100, '#ffffff', 0]] };

const STAR_DOTS = [
  { x: 0.12, y: 0.12, r: 1.4, o: 0.5 }, { x: 0.85, y: 0.1, r: 1.1, o: 0.4 },
  { x: 0.22, y: 0.28, r: 0.9, o: 0.35 }, { x: 0.92, y: 0.3, r: 1.3, o: 0.5 },
  { x: 0.07, y: 0.55, r: 1, o: 0.4 }, { x: 0.9, y: 0.62, r: 0.9, o: 0.3 },
  { x: 0.15, y: 0.85, r: 1.2, o: 0.45 }, { x: 0.88, y: 0.88, r: 1, o: 0.35 },
  { x: 0.5, y: 0.08, r: 0.8, o: 0.3 }, { x: 0.35, y: 0.93, r: 1, o: 0.4 },
];

// ─── The full style library, ported/extended from the website's swatch row.
// Each orb carries a `family` tag (purple/pink/blue/gold) so the COLOURS
// toggles can filter which orbs render, independent of which named Style
// is active.
const AURA_STYLES = {
  pastel: {
    label: 'Aura Blush',
    dark: false,
    bg: { type: 'solid', colors: ['#fef6f0'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, family: 'pink', stops: [[0, '#f28c95', 0.88], [40, '#f2bfb4', 0.62], [70, '#f1cca6', 0.32], [100, '#f1cca6', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, family: 'purple', stops: [[0, '#c8b4f0', 0.42], [100, '#c8b4f0', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, family: 'gold', stops: [[0, '#ffdcb4', 0.48], [100, '#ffdcb4', 0]] },
    text: { name: 'rgba(60,38,50,.9)', subtitle: 'rgba(190,110,140,.85)', affirmation: 'rgba(78,55,65,.65)' },
    lineColor: 'rgba(168,123,168,0.2)',
  },
  golden: {
    label: 'Blushing Sands',
    dark: false,
    bg: { type: 'linear', colors: ['#fef5e8', '#fdf0e5', '#fdeae0'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, family: 'gold', stops: [[0, '#f1cca6', 0.95], [40, '#f2bfb4', 0.72], [70, '#f28c95', 0.38], [100, '#f28c95', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, family: 'gold', stops: [[0, '#f2e6b8', 0.55], [100, '#f2e6b8', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, family: 'pink', stops: [[0, '#f28c95', 0.45], [100, '#f28c95', 0]] },
    text: { name: 'rgba(58,35,30,.9)', subtitle: 'rgba(192,100,100,.82)', affirmation: 'rgba(78,52,48,.65)' },
    lineColor: 'rgba(168,123,168,0.2)',
  },
  midnight: {
    label: 'Midnight Aura',
    dark: true,
    bg: { type: 'linear', colors: ['#0d0818', '#130c22', '#0e0618'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, family: 'purple', stops: [[0, '#b464ff', 0.65], [55, '#783cc8', 0.35], [100, '#783cc8', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, family: 'blue', stops: [[0, '#5078ff', 0.4], [100, '#5078ff', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, family: 'pink', stops: [[0, '#dc50b4', 0.35], [100, '#dc50b4', 0]] },
    text: { name: 'rgba(250,235,255,.95)', subtitle: 'rgba(200,155,255,.88)', affirmation: 'rgba(185,160,240,.72)' },
    lineColor: 'rgba(255,255,255,0.14)',
    stars: true,
  },
  rose: {
    label: 'Rose Aura',
    dark: false,
    bg: { type: 'linear', colors: ['#fdf0f2', '#fce8ec'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, family: 'pink', stops: [[0, '#e86e8c', 0.85], [40, '#f0a0af', 0.55], [70, '#f5c3c8', 0.3], [100, '#f5c3c8', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, family: 'purple', stops: [[0, '#dca0d2', 0.4], [100, '#dca0d2', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, family: 'gold', stops: [[0, '#f5aaa0', 0.45], [100, '#f5aaa0', 0]] },
    text: { name: 'rgba(70,30,45,.9)', subtitle: 'rgba(200,80,120,.85)', affirmation: 'rgba(85,45,58,.65)' },
    lineColor: 'rgba(168,123,168,0.2)',
  },
  crystal: {
    label: 'Crystal Clarity',
    dark: false,
    bg: { type: 'linear', colors: ['#eef6fb', '#e5f1f9'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, family: 'blue', stops: [[0, '#8ec8e8', 0.75], [100, '#cfe8f5', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, family: 'blue', stops: [[0, '#cfe8f5', 0.4], [100, '#cfe8f5', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, family: 'purple', stops: [[0, '#d8cdf0', 0.4], [100, '#d8cdf0', 0]] },
    text: { name: 'rgba(30,50,60,.9)', subtitle: 'rgba(80,130,160,.85)', affirmation: 'rgba(45,65,75,.65)' },
    lineColor: 'rgba(123,168,168,0.2)',
  },
  aurora: {
    label: 'Aurora Veil',
    dark: true,
    bg: { type: 'linear', colors: ['#0a1a1f', '#0f2430', '#0a1520'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, family: 'blue', stops: [[0, '#40e0c0', 0.55], [100, '#40e0c0', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, family: 'purple', stops: [[0, '#a060e0', 0.4], [100, '#a060e0', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, family: 'blue', stops: [[0, '#4090e0', 0.4], [100, '#4090e0', 0]] },
    text: { name: 'rgba(230,250,245,.95)', subtitle: 'rgba(140,220,200,.85)', affirmation: 'rgba(160,220,210,.7)' },
    lineColor: 'rgba(255,255,255,0.14)',
    stars: true,
  },
  amethyst: {
    label: 'Amethyst Dream',
    dark: true,
    bg: { type: 'linear', colors: ['#2a1a40', '#1f1030'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, family: 'purple', stops: [[0, '#9860d8', 0.7], [100, '#9860d8', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, family: 'pink', stops: [[0, '#d060b0', 0.4], [100, '#d060b0', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, family: 'blue', stops: [[0, '#6050c0', 0.4], [100, '#6050c0', 0]] },
    text: { name: 'rgba(245,235,255,.95)', subtitle: 'rgba(210,170,240,.85)', affirmation: 'rgba(195,175,230,.72)' },
    lineColor: 'rgba(255,255,255,0.14)',
  },
  ocean: {
    label: 'Ocean Drift',
    dark: false,
    bg: { type: 'linear', colors: ['#eaf6fb', '#dff0f7'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, family: 'blue', stops: [[0, '#3ca8d8', 0.8], [100, '#3ca8d8', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, family: 'blue', stops: [[0, '#7ce0c8', 0.4], [100, '#7ce0c8', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, family: 'blue', stops: [[0, '#2870a8', 0.4], [100, '#2870a8', 0]] },
    text: { name: 'rgba(20,45,55,.9)', subtitle: 'rgba(50,120,150,.85)', affirmation: 'rgba(35,60,68,.65)' },
    lineColor: 'rgba(123,168,168,0.2)',
  },
  cherry: {
    label: 'Cherry Bloom',
    dark: false,
    bg: { type: 'linear', colors: ['#fdeef0', '#fbe0e6'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, family: 'pink', stops: [[0, '#d8305c', 0.8], [100, '#d8305c', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, family: 'pink', stops: [[0, '#f090a8', 0.45], [100, '#f090a8', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, family: 'gold', stops: [[0, '#a02040', 0.4], [100, '#a02040', 0]] },
    text: { name: 'rgba(60,20,28,.9)', subtitle: 'rgba(180,50,80,.85)', affirmation: 'rgba(75,35,42,.65)' },
    lineColor: 'rgba(168,123,123,0.2)',
  },
  cosmos: {
    label: 'Cosmos Whisper',
    dark: true,
    bg: { type: 'linear', colors: ['#080814', '#0d0d22'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, family: 'purple', stops: [[0, '#6050e0', 0.6], [100, '#6050e0', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, family: 'pink', stops: [[0, '#c050c0', 0.4], [100, '#c050c0', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, family: 'blue', stops: [[0, '#3050c0', 0.4], [100, '#3050c0', 0]] },
    text: { name: 'rgba(235,235,255,.95)', subtitle: 'rgba(170,160,240,.85)', affirmation: 'rgba(180,175,220,.7)' },
    lineColor: 'rgba(255,255,255,0.14)',
    stars: true,
  },
  ethereal: {
    label: 'Ethereal Light',
    dark: false,
    bg: { type: 'solid', colors: ['#faf7fc'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, family: 'purple', stops: [[0, '#e0d0f0', 0.6], [100, '#e0d0f0', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, family: 'pink', stops: [[0, '#f0d0e0', 0.4], [100, '#f0d0e0', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, family: 'blue', stops: [[0, '#d0e0f0', 0.4], [100, '#d0e0f0', 0]] },
    text: { name: 'rgba(60,50,65,.85)', subtitle: 'rgba(150,120,170,.8)', affirmation: 'rgba(75,65,80,.6)' },
    lineColor: 'rgba(168,123,168,0.18)',
  },
  forest: {
    label: 'Forest Grove',
    dark: false,
    bg: { type: 'linear', colors: ['#eef5ee', '#e4f0e4'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, family: 'gold', stops: [[0, '#4a9860', 0.75], [100, '#4a9860', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, family: 'gold', stops: [[0, '#8ac878', 0.4], [100, '#8ac878', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, family: 'gold', stops: [[0, '#c8a860', 0.4], [100, '#c8a860', 0]] },
    text: { name: 'rgba(25,45,30,.9)', subtitle: 'rgba(60,110,70,.85)', affirmation: 'rgba(40,60,42,.65)' },
    lineColor: 'rgba(123,168,123,0.2)',
  },
  desert: {
    label: 'Desert Bloom',
    dark: false,
    bg: { type: 'linear', colors: ['#fdf3e6', '#fbe8d2'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, family: 'gold', stops: [[0, '#d88850', 0.8], [100, '#d88850', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, family: 'gold', stops: [[0, '#f0c880', 0.45], [100, '#f0c880', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, family: 'gold', stops: [[0, '#b85838', 0.4], [100, '#b85838', 0]] },
    text: { name: 'rgba(55,35,25,.9)', subtitle: 'rgba(170,100,60,.85)', affirmation: 'rgba(70,48,38,.65)' },
    lineColor: 'rgba(168,140,123,0.2)',
  },
  lavender: {
    label: 'Lavender Field',
    dark: false,
    bg: { type: 'linear', colors: ['#f5f0fb', '#efe6f7'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, family: 'purple', stops: [[0, '#a888d8', 0.75], [100, '#a888d8', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, family: 'purple', stops: [[0, '#d8c8f0', 0.4], [100, '#d8c8f0', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, family: 'pink', stops: [[0, '#f0c8d8', 0.4], [100, '#f0c8d8', 0]] },
    text: { name: 'rgba(50,35,60,.9)', subtitle: 'rgba(130,90,170,.85)', affirmation: 'rgba(62,48,72,.65)' },
    lineColor: 'rgba(168,123,168,0.2)',
  },
  ember: {
    label: 'Ember Glow',
    dark: true,
    bg: { type: 'linear', colors: ['#1a0d08', '#241008'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, family: 'gold', stops: [[0, '#e86828', 0.75], [100, '#e86828', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, family: 'gold', stops: [[0, '#f0a850', 0.4], [100, '#f0a850', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, family: 'pink', stops: [[0, '#c83030', 0.4], [100, '#c83030', 0]] },
    text: { name: 'rgba(255,238,220,.95)', subtitle: 'rgba(240,160,90,.88)', affirmation: 'rgba(230,180,140,.72)' },
    lineColor: 'rgba(255,220,180,0.16)',
  },
  arctic: {
    label: 'Arctic Frost',
    dark: false,
    bg: { type: 'linear', colors: ['#eef8fb', '#e2f2f7'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, family: 'blue', stops: [[0, '#a8d8f0', 0.75], [100, '#a8d8f0', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, family: 'blue', stops: [[0, '#d0ecf5', 0.45], [100, '#d0ecf5', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, family: 'purple', stops: [[0, '#d0d8f0', 0.4], [100, '#d0d8f0', 0]] },
    text: { name: 'rgba(25,50,60,.88)', subtitle: 'rgba(70,140,170,.85)', affirmation: 'rgba(40,65,72,.65)' },
    lineColor: 'rgba(123,168,190,0.2)',
  },
  velvet: {
    label: 'Velvet Night',
    dark: true,
    bg: { type: 'linear', colors: ['#1a0810', '#240b16'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.55, family: 'pink', stops: [[0, '#a01850', 0.75], [100, '#a01850', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.4, family: 'purple', stops: [[0, '#601040', 0.45], [100, '#601040', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.4, family: 'gold', stops: [[0, '#c89050', 0.35], [100, '#c89050', 0]] },
    text: { name: 'rgba(250,235,240,.95)', subtitle: 'rgba(220,140,170,.85)', affirmation: 'rgba(215,175,190,.72)' },
    lineColor: 'rgba(255,220,230,0.14)',
  },
};

const STYLE_KEYS = Object.keys(AURA_STYLES);
const PATTERNS = ['radial', 'linear', 'mesh', 'cosmic', 'aurora', 'aura', 'solid'];
const PATTERN_LABELS = { radial: '◎ Radial', linear: '↗ Linear', mesh: '○ Mesh', cosmic: '✨ Cosmic', aurora: '🌈 Aurora', aura: '🔮 Aura', solid: '■ Solid' };
const COLOUR_FAMILIES = [
  { key: 'purple', swatch: '#9878d8' },
  { key: 'pink', swatch: '#f090b0' },
  { key: 'blue', swatch: '#78a8e0' },
  { key: 'gold', swatch: '#e0c060' },
];

// Keyword auto-match, extended with the crystal/calm mapping the website
// table defines (previously omitted since this app had no crystal style yet).
function detectStyle(text) {
  const t = text.toLowerCase();
  if (/love|loved|heart|romance/.test(t)) return 'rose';
  if (/wealth|money|abundant|rich|gold/.test(t)) return 'golden';
  if (/heal|health|body|nature|sage|forest/.test(t)) return 'forest';
  if (/dream|magic|moon|star|mystic|night|cosmos|cosmic/.test(t)) return 'midnight';
  if (/peace|calm|free|freedom|crystal|clear/.test(t)) return 'crystal';
  return 'pastel';
}

function familyOn(orb, colours) {
  return !orb.family || colours[orb.family] !== false;
}

// ─── SVG composition — shape depends on `pattern`, colours depend on which
// of the 4 colour families are toggled on.
function AuraCardSvg({ styleKey, size, pattern, colours }) {
  const s = AURA_STYLES[styleKey];
  const baseOrbs = [s.mainOrb, s.orb1, s.orb2].filter((o) => familyOn(o, colours));
  const showStars = pattern === 'cosmic' || (s.stars && pattern === 'radial');

  const bgFill = s.bg.type === 'solid' ? s.bg.colors[0] : `url(#bg-${styleKey})`;

  if (pattern === 'solid') {
    const solidColor = baseOrbs[0]?.stops?.[0]?.[1] || (s.bg.type === 'solid' ? s.bg.colors[0] : s.bg.colors[0]);
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Rect x="0" y="0" width={size} height={size} fill={solidColor} />
      </Svg>
    );
  }

  if (pattern === 'linear') {
    const stopColors = baseOrbs.length ? baseOrbs.map((o) => o.stops[0][1]) : s.bg.colors;
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id={`lin-${styleKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
            {stopColors.map((c, i) => (
              <Stop key={i} offset={`${(i / Math.max(1, stopColors.length - 1)) * 100}%`} stopColor={c} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} fill={`url(#lin-${styleKey})`} />
      </Svg>
    );
  }

  if (pattern === 'aurora') {
    const stopColors = baseOrbs.length ? baseOrbs.map((o) => o.stops[0][1]) : [s.bg.colors[0], s.bg.colors[s.bg.colors.length - 1]];
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
          {/* Each ribbon spans the full canvas as a soft diagonal streak
              (fades to transparent at both ends) instead of a hard-edged
              horizontal band, so overlapping ribbons blend instead of
              showing visible rectangle seams. */}
          {stopColors.map((c, i) => (
            <LinearGradient key={i} id={`aur-${styleKey}-${i}`} x1="0%" y1={`${i * 22}%`} x2="100%" y2={`${45 + i * 20}%`}>
              <Stop offset="0%" stopColor={c} stopOpacity={0} />
              <Stop offset="45%" stopColor={c} stopOpacity={0.5} />
              <Stop offset="55%" stopColor={c} stopOpacity={0.5} />
              <Stop offset="100%" stopColor={c} stopOpacity={0} />
            </LinearGradient>
          ))}
        </Defs>
        <Rect x="0" y="0" width={size} height={size} fill={s.bg.type === 'solid' ? s.bg.colors[0] : `url(#bg-${styleKey})`} />
        {stopColors.map((c, i) => (
          <Rect key={i} x="0" y="0" width={size} height={size} fill={`url(#aur-${styleKey}-${i})`} />
        ))}
      </Svg>
    );
  }

  // radial / aura / mesh / cosmic all share the gradient-defs setup below
  const orbsForLayout =
    pattern === 'aura' ? [s.mainOrb].filter((o) => familyOn(o, colours))
    : pattern === 'mesh' ? [...baseOrbs, ...baseOrbs].slice(0, 6).map((o, i) => ({ ...o, cx: (0.2 + (i * 0.28)) % 1, cy: (0.25 + i * 0.19 * (i % 2 === 0 ? 1 : -1) + 1) % 1, r: o.r * 0.6 }))
    : baseOrbs;
  const orbs = [...orbsForLayout, CENTER_GLOW];

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
          <RadialGradient key={i} id={`orb-${styleKey}-${pattern}-${i}`}>
            {orb.stops.map((stop, j) => (
              <Stop key={j} offset={`${stop[0]}%`} stopColor={stop[1]} stopOpacity={stop[2]} />
            ))}
          </RadialGradient>
        ))}
      </Defs>

      <Rect x="0" y="0" width={size} height={size} fill={bgFill} />

      {orbs.map((orb, i) => (
        <Circle key={i} cx={orb.cx * size} cy={orb.cy * size} r={orb.r * size} fill={`url(#orb-${styleKey}-${pattern}-${i})`} />
      ))}

      {showStars && STAR_DOTS.map((d, i) => (
        <Circle key={`star-${i}`} cx={d.x * size} cy={d.y * size} r={d.r} fill="#ffffff" opacity={d.o} />
      ))}
    </Svg>
  );
}

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
  const activeStyle = AURA_STYLES[activeStyleKey];

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
            minHeight={110}
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
              <View ref={cardRef} collapsable={false} style={[styles.cardCapture, { width: CARD_SIZE, height: CARD_SIZE }]}>
                <AuraCardSvg styleKey={activeStyleKey} size={CARD_SIZE} pattern={pattern} colours={colours} />
                <View style={styles.overlay}>
                  <Text style={[styles.brandText, { color: activeStyle.text.name, fontSize: CARD_SIZE * 0.045 }]}>MANIVERS</Text>
                  <Text style={[styles.dateText, { color: activeStyle.text.subtitle, fontSize: CARD_SIZE * 0.026 }]}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Text>
                  <View style={{ flex: 1.6 }} />
                  <Text
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    style={[styles.nameText, { color: activeStyle.text.name, fontSize: CARD_SIZE * 0.085 }]}
                  >
                    Your <Text style={styles.nameTextAccent}>Aura Card</Text>
                  </Text>
                  <Text style={[styles.subtitleText, { color: activeStyle.text.subtitle, fontSize: CARD_SIZE * 0.032 }]}>
                    {activeStyle.label}
                  </Text>
                  <View style={{ flex: 1.4 }} />
                  <Text
                    numberOfLines={3}
                    style={[styles.affirmationText, { color: activeStyle.text.affirmation, fontSize: CARD_SIZE * 0.038 }]}
                  >
                    "{quote}"
                  </Text>
                  <View style={{ flex: 0.8 }} />
                  <Text style={[styles.watermark, { fontSize: CARD_SIZE * 0.03, color: activeStyle.text.subtitle }]}>manivers.com</Text>
                  <Text style={[styles.tagline, { fontSize: CARD_SIZE * 0.024, color: activeStyle.text.affirmation }]}>Believe · Receive · Become</Text>
                  <View style={{ flex: 0.5 }} />
                </View>
              </View>
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
  cardCapture: { borderRadius: 24, overflow: 'hidden' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', paddingHorizontal: '8%', paddingTop: '6%' },

  brandText: { fontFamily: fonts.displayMedium, letterSpacing: 2, textAlign: 'center' },
  dateText: { fontFamily: fonts.displayItalic, marginTop: 4, textAlign: 'center' },
  nameText: { fontFamily: fonts.display, fontWeight: '400', letterSpacing: 0.5, textAlign: 'center' },
  nameTextAccent: { fontFamily: fonts.displayItalic },
  subtitleText: { fontFamily: fonts.displayItalic, marginTop: 6, textAlign: 'center' },
  affirmationText: { fontFamily: fonts.displayItalic, textAlign: 'center', lineHeight: 20 },
  watermark: { fontFamily: fonts.body, letterSpacing: 1 },
  tagline: { fontFamily: fonts.displayItalic, marginTop: 2, textAlign: 'center', opacity: 0.7 },

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
