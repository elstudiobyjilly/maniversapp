// auraCard.js — the Aura Card visual engine's data layer.
// Extracted from the Aura Card tool screen so the Home dashboard widget and
// the full tool render from one identical source of truth.

// ─── Deterministic hash — same input always produces the same number ──────
export function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

export const QUICK_ADD = ['Abundant', 'Loved', 'Magnetic', 'Healed', 'Wealthy'];

export const AURA_AFFIRMATIONS = [
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
export const CENTER_GLOW = { cx: 0.5, cy: 0.5, r: 0.18, stops: [[0, '#ffffff', 0.45], [100, '#ffffff', 0]] };

export const STAR_DOTS = [
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
export const AURA_STYLES = {
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

export const STYLE_KEYS = Object.keys(AURA_STYLES);
export const PATTERNS = ['radial', 'linear', 'mesh', 'cosmic', 'aurora', 'aura', 'solid'];
export const PATTERN_LABELS = { radial: '◎ Radial', linear: '↗ Linear', mesh: '○ Mesh', cosmic: '✨ Cosmic', aurora: '🌈 Aurora', aura: '🔮 Aura', solid: '■ Solid' };
export const COLOUR_FAMILIES = [
  { key: 'purple', swatch: '#9878d8' },
  { key: 'pink', swatch: '#f090b0' },
  { key: 'blue', swatch: '#78a8e0' },
  { key: 'gold', swatch: '#e0c060' },
];

// A handful of alternate shades per family — tapping a colour dot opens
// this strip so the exact hue can be picked instead of only on/off.
export const FAMILY_SHADES = {
  purple: ['#9878d8', '#c9a8c9', '#7a5080', '#b888b8', '#6050e0'],
  pink: ['#f090b0', '#e898b8', '#c85878', '#f28c95', '#d8305c'],
  blue: ['#78a8e0', '#3ca8d8', '#40e0c0', '#5078ff', '#a8d8f0'],
  gold: ['#e0c060', '#c8a040', '#f0a850', '#e86828', '#8ac878'],
};

// Keyword auto-match, extended with the crystal/calm mapping the website
// table defines (previously omitted since this app had no crystal style yet).
export function detectStyle(text) {
  const t = text.toLowerCase();
  if (/love|loved|heart|romance/.test(t)) return 'rose';
  if (/wealth|money|abundant|rich|gold/.test(t)) return 'golden';
  if (/heal|health|body|nature|sage|forest/.test(t)) return 'forest';
  if (/dream|magic|moon|star|mystic|night|cosmos|cosmic/.test(t)) return 'midnight';
  if (/peace|calm|free|freedom|crystal|clear/.test(t)) return 'crystal';
  return 'pastel';
}

export function familyOn(orb, colours) {
  return !orb.family || colours[orb.family] !== false;
}
