import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Circle, Rect } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '../../components/GlassCard';
import GradientBackground from '../../components/GradientBackground';
import ScreenHeader from '../../components/ScreenHeader';
import { colors, fonts, radii, shadows } from '../../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_SIZE = Math.min(SCREEN_WIDTH - 40, 400);
const LOGICAL_W = 1080;
const CARD_MAX_WORDS = 50;

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex([r, g, b]) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function scaleColor(hex, factor) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([r * factor, g * factor, b * factor]);
}
function avgColor(hexA, hexB) {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  return rgbToHex([(r1 + r2) / 2, (g1 + g2) / 2, (b1 + b2) / 2]);
}
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
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

const LIGHT_LINE = 'rgba(168,123,168,0.2)';
const DARK_LINE = 'rgba(255,255,255,0.14)';

const AURA_STYLES = {
  pastel: {
    label: '🌸 Aura Blush',
    dark: false,
    bg: { type: 'solid', colors: ['#fef6f0'] },
    mainOrb: { cx: 0.5, cy: 0.46, r: 0.58, stops: [[0, '#f28c95', 0.88], [38, '#f2bfb4', 0.62], [72, '#f1cca6', 0.32], [100, '#ffffff', 0]] },
    orb1: { cx: 0.12, cy: 0.18, r: 0.45, stops: [[0, '#c8b4f0', 0.42], [100, '#ffffff', 0]] },
    orb2: { cx: 0.9, cy: 0.82, r: 0.38, stops: [[0, '#ffdcb4', 0.48], [100, '#ffffff', 0]] },
    text: { name: 'rgba(60,38,50,.9)', subtitle: 'rgba(190,110,140,.85)', affirmation: 'rgba(78,55,65,.65)' },
    lineColor: LIGHT_LINE,
  },
  golden: {
    label: '🌅 Blushing Sands',
    dark: false,
    bg: { type: 'linear', colors: ['#fef5e8', '#fdf0e5', '#fdeae0'] },
    mainOrb: { cx: 0.5, cy: 0.48, r: 0.56, stops: [[0, '#f1cca6', 0.95], [30, '#f2bfb4', 0.72], [65, '#f28c95', 0.38], [100, '#ffffff', 0]] },
    orb1: { cx: 0.18, cy: 0.25, r: 0.4, stops: [[0, '#f2e6b8', 0.55], [100, '#ffffff', 0]] },
    orb2: { cx: 0.85, cy: 0.75, r: 0.4, stops: [[0, '#f28c95', 0.45], [100, '#ffffff', 0]] },
    text: { name: 'rgba(58,35,30,.9)', subtitle: 'rgba(192,100,100,.82)', affirmation: 'rgba(78,52,48,.65)' },
    lineColor: LIGHT_LINE,
  },
  midnight: {
    label: '🌙 Midnight Aura',
    dark: true,
    bg: { type: 'linear', colors: ['#0d0818', '#130c22', '#0e0618'] },
    mainOrb: { cx: 0.5, cy: 0.45, r: 0.5, stops: [[0, '#b464ff', 0.65], [40, '#783cc8', 0.35], [100, '#ffffff', 0]] },
    orb1: { cx: 0.15, cy: 0.2, r: 0.4, stops: [[0, '#5078ff', 0.4], [100, '#ffffff', 0]] },
    orb2: { cx: 0.85, cy: 0.78, r: 0.38, stops: [[0, '#dc50b4', 0.35], [100, '#ffffff', 0]] },
    text: { name: 'rgba(250,235,255,.95)', subtitle: 'rgba(200,155,255,.88)', affirmation: 'rgba(185,160,240,.72)' },
    lineColor: DARK_LINE,
    stars: { count: 120, color: '#ffffff' },
  },
  sage: {
    label: '🌿 Sage Aura',
    dark: false,
    bg: { type: 'linear', colors: ['#f2f8f4', '#eef5f0'] },
    mainOrb: { cx: 0.5, cy: 0.47, r: 0.54, stops: [[0, '#8cc8a5', 0.82], [40, '#a0d7b4', 0.5], [75, '#b4e6c8', 0.22], [100, '#ffffff', 0]] },
    orb1: { cx: 0.2, cy: 0.22, r: 0.38, stops: [[0, '#c8f0c8', 0.4], [100, '#ffffff', 0]] },
    orb2: { cx: 0.82, cy: 0.78, r: 0.35, stops: [[0, '#a0c8aa', 0.45], [100, '#ffffff', 0]] },
    text: { name: 'rgba(30,55,40,.88)', subtitle: 'rgba(70,130,90,.82)', affirmation: 'rgba(45,70,50,.65)' },
    lineColor: LIGHT_LINE,
  },
  rose: {
    label: '🌹 Aura Rose',
    dark: false,
    bg: { type: 'linear', colors: ['#fdf2f5', '#fceef4'] },
    mainOrb: { cx: 0.5, cy: 0.45, r: 0.52, stops: [[0, '#f0648c', 0.82], [35, '#f096af', 0.6], [70, '#f5b4c8', 0.28], [100, '#ffffff', 0]] },
    orb1: { cx: 0.82, cy: 0.18, r: 0.42, stops: [[0, '#ffaac8', 0.45], [100, '#ffffff', 0]] },
    orb2: { cx: 0.15, cy: 0.82, r: 0.38, stops: [[0, '#c878b4', 0.42], [100, '#ffffff', 0]] },
    text: { name: 'rgba(55,25,40,.9)', subtitle: 'rgba(190,80,120,.82)', affirmation: 'rgba(72,40,58,.65)' },
    lineColor: LIGHT_LINE,
  },
  crystal: {
    label: '💎 Crystal Aura',
    dark: false,
    bg: { type: 'linear', colors: ['#f4f2fd', '#f2f0fc', '#ece9fb'] },
    mainOrb: { cx: 0.5, cy: 0.46, r: 0.55, stops: [[0, '#b4a5f0', 0.8], [38, '#c8b9fa', 0.52], [72, '#dcd2ff', 0.22], [100, '#ffffff', 0]] },
    orb1: { cx: 0.14, cy: 0.2, r: 0.4, stops: [[0, '#a0d2f0', 0.42], [100, '#ffffff', 0]] },
    orb2: { cx: 0.88, cy: 0.8, r: 0.38, stops: [[0, '#c8a0f0', 0.4], [100, '#ffffff', 0]] },
    text: { name: 'rgba(38,30,65,.9)', subtitle: 'rgba(120,100,200,.82)', affirmation: 'rgba(55,45,90,.65)' },
    lineColor: LIGHT_LINE,
  },
  aurora: {
    label: '🌌 Aurora',
    dark: true,
    bg: { type: 'linear', colors: ['#0a1520', '#0d1c18', '#0a1215'] },
    mainOrb: { cx: 0.4, cy: 0.4, r: 0.55, stops: [[0, '#32dcb4', 0.5], [50, '#28b48c', 0.25], [100, '#ffffff', 0]] },
    orb1: { cx: 0.65, cy: 0.35, r: 0.48, stops: [[0, '#5064f0', 0.45], [50, '#6450c8', 0.22], [100, '#ffffff', 0]] },
    orb2: { cx: 0.5, cy: 0.7, r: 0.4, stops: [[0, '#b450dc', 0.38], [100, '#ffffff', 0]] },
    text: { name: 'rgba(240,255,250,.95)', subtitle: 'rgba(80,230,185,.88)', affirmation: 'rgba(160,240,210,.72)' },
    lineColor: DARK_LINE,
    stars: { count: 100, color: '#ffffff' },
  },
  amethyst: {
    label: '🔮 Amethyst',
    dark: true,
    bg: { type: 'linear', colors: ['#16082a', '#1a0c32', '#130828'] },
    mainOrb: { cx: 0.5, cy: 0.46, r: 0.52, stops: [[0, '#c864ff', 0.7], [40, '#a046dc', 0.4], [75, '#7832b4', 0.18], [100, '#ffffff', 0]] },
    orb1: { cx: 0.15, cy: 0.18, r: 0.42, stops: [[0, '#f078c8', 0.4], [100, '#ffffff', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.38, stops: [[0, '#6450f0', 0.42], [100, '#ffffff', 0]] },
    text: { name: 'rgba(255,240,255,.95)', subtitle: 'rgba(210,150,255,.88)', affirmation: 'rgba(190,170,240,.72)' },
    lineColor: DARK_LINE,
    stars: { count: 90, color: '#ffc8ff' },
  },
  ocean: {
    label: '🌊 Ocean Aura',
    dark: false,
    bg: { type: 'linear', colors: ['#f0f6fe', '#eaf2fd'] },
    mainOrb: { cx: 0.5, cy: 0.46, r: 0.55, stops: [[0, '#50a0f0', 0.78], [38, '#64b4f0', 0.48], [72, '#8cc8fa', 0.22], [100, '#ffffff', 0]] },
    orb1: { cx: 0.2, cy: 0.2, r: 0.4, stops: [[0, '#64c8dc', 0.42], [100, '#ffffff', 0]] },
    orb2: { cx: 0.85, cy: 0.8, r: 0.38, stops: [[0, '#3c82c8', 0.4], [100, '#ffffff', 0]] },
    text: { name: 'rgba(20,40,70,.9)', subtitle: 'rgba(50,120,200,.82)', affirmation: 'rgba(35,60,100,.65)' },
    lineColor: LIGHT_LINE,
  },
  sunset: {
    label: '🌄 Sunset Aura',
    dark: true,
    bg: { type: 'linear', colors: ['#1a0a08', '#2d0e12', '#120818'] },
    mainOrb: { cx: 0.5, cy: 0.6, r: 0.55, stops: [[0, '#ff8c3c', 0.75], [35, '#f05064', 0.5], [70, '#b43c8c', 0.25], [100, '#ffffff', 0]] },
    orb1: { cx: 0.25, cy: 0.3, r: 0.4, stops: [[0, '#ffb450', 0.38], [100, '#ffffff', 0]] },
    text: { name: 'rgba(255,245,235,.95)', subtitle: 'rgba(255,185,100,.88)', affirmation: 'rgba(245,210,180,.72)' },
    lineColor: DARK_LINE,
    stars: { count: 80, color: '#ffdca0' },
  },
  cherry: {
    label: '🍒 Cherry Aura',
    dark: false,
    bg: { type: 'linear', colors: ['#fdf0f5', '#fce8f0'] },
    mainOrb: { cx: 0.5, cy: 0.45, r: 0.52, stops: [[0, '#e63c78', 0.85], [38, '#f0649b', 0.58], [72, '#faa0be', 0.25], [100, '#ffffff', 0]] },
    orb1: { cx: 0.8, cy: 0.15, r: 0.4, stops: [[0, '#ff78b4', 0.42], [100, '#ffffff', 0]] },
    text: { name: 'rgba(50,18,35,.9)', subtitle: 'rgba(200,50,110,.82)', affirmation: 'rgba(68,30,50,.65)' },
    lineColor: LIGHT_LINE,
  },
  cosmos: {
    label: '✨ Cosmos',
    dark: true,
    bg: { type: 'linear', colors: ['#08081a', '#0c0820', '#080818'] },
    mainOrb: { cx: 0.5, cy: 0.45, r: 0.5, stops: [[0, '#643cdc', 0.6], [40, '#5028b4', 0.3], [100, '#ffffff', 0]] },
    orb1: { cx: 0.2, cy: 0.25, r: 0.38, stops: [[0, '#b43cc8', 0.38], [100, '#ffffff', 0]] },
    orb2: { cx: 0.8, cy: 0.72, r: 0.35, stops: [[0, '#3c78f0', 0.35], [100, '#ffffff', 0]] },
    text: { name: 'rgba(240,235,255,.95)', subtitle: 'rgba(180,150,255,.88)', affirmation: 'rgba(200,190,240,.72)' },
    lineColor: DARK_LINE,
    stars: { count: 140, color: '#ffffff' },
  },
  ethereal: {
    label: '🤍 Ethereal Aura',
    dark: false,
    bg: { type: 'linear', colors: ['#faf8ff', '#f8f4ff', '#f5f0ff'] },
    mainOrb: { cx: 0.5, cy: 0.46, r: 0.5, stops: [[0, '#d2beff', 0.75], [40, '#e1d2ff', 0.45], [75, '#f0ebff', 0.18], [100, '#ffffff', 0]] },
    orb1: { cx: 0.15, cy: 0.2, r: 0.4, stops: [[0, '#ffc8e6', 0.38], [100, '#ffffff', 0]] },
    orb2: { cx: 0.88, cy: 0.78, r: 0.38, stops: [[0, '#b4c8ff', 0.35], [100, '#ffffff', 0]] },
    text: { name: 'rgba(42,32,62,.88)', subtitle: 'rgba(140,115,195,.82)', affirmation: 'rgba(65,50,92,.65)' },
    lineColor: LIGHT_LINE,
  },
  forest: {
    label: '🌲 Forest Aura',
    dark: true,
    bg: { type: 'linear', colors: ['#080f0a', '#0a1410', '#060e08'] },
    mainOrb: { cx: 0.5, cy: 0.45, r: 0.52, stops: [[0, '#3cc878', 0.65], [40, '#28a05a', 0.35], [100, '#ffffff', 0]] },
    orb1: { cx: 0.2, cy: 0.25, r: 0.4, stops: [[0, '#50c8a0', 0.38], [100, '#ffffff', 0]] },
    text: { name: 'rgba(220,255,235,.95)', subtitle: 'rgba(80,220,140,.88)', affirmation: 'rgba(160,240,195,.72)' },
    lineColor: DARK_LINE,
    stars: { count: 80, color: '#b4ffd2' },
  },
  desert: {
    label: '🏜️ Desert Aura',
    dark: true,
    bg: { type: 'linear', colors: ['#150a04', '#1e1008', '#1a0c06'] },
    mainOrb: { cx: 0.5, cy: 0.5, r: 0.52, stops: [[0, '#f0b450', 0.72], [40, '#c8823c', 0.42], [100, '#ffffff', 0]] },
    orb1: { cx: 0.8, cy: 0.2, r: 0.38, stops: [[0, '#ffc864', 0.38], [100, '#ffffff', 0]] },
    text: { name: 'rgba(255,248,235,.95)', subtitle: 'rgba(240,190,100,.88)', affirmation: 'rgba(230,200,160,.72)' },
    lineColor: DARK_LINE,
  },
  lavender: {
    label: '💜 Lavender Aura',
    dark: false,
    bg: { type: 'linear', colors: ['#f5f0fc', '#f3edfb', '#f0eafa'] },
    mainOrb: { cx: 0.5, cy: 0.46, r: 0.54, stops: [[0, '#a064f0', 0.82], [38, '#b98cfa', 0.52], [72, '#d2b9ff', 0.22], [100, '#ffffff', 0]] },
    orb1: { cx: 0.2, cy: 0.2, r: 0.42, stops: [[0, '#dca0ff', 0.4], [100, '#ffffff', 0]] },
    orb2: { cx: 0.82, cy: 0.8, r: 0.38, stops: [[0, '#8c78dc', 0.4], [100, '#ffffff', 0]] },
    text: { name: 'rgba(40,28,62,.9)', subtitle: 'rgba(130,90,210,.82)', affirmation: 'rgba(60,42,88,.65)' },
    lineColor: LIGHT_LINE,
  },
  ember: {
    label: '🔥 Ember Aura',
    dark: true,
    bg: { type: 'linear', colors: ['#180806', '#200c08', '#160608'] },
    mainOrb: { cx: 0.5, cy: 0.48, r: 0.52, stops: [[0, '#ff6432', 0.75], [38, '#dc3c28', 0.48], [72, '#b4281e', 0.22], [100, '#ffffff', 0]] },
    orb1: { cx: 0.78, cy: 0.22, r: 0.38, stops: [[0, '#ffa032', 0.38], [100, '#ffffff', 0]] },
    text: { name: 'rgba(255,245,238,.95)', subtitle: 'rgba(255,160,100,.88)', affirmation: 'rgba(240,200,170,.72)' },
    lineColor: DARK_LINE,
    stars: { count: 80, color: '#ffc864' },
  },
  arctic: {
    label: '❄️ Arctic Aura',
    dark: false,
    bg: { type: 'linear', colors: ['#f0f8ff', '#edf5fe', '#e8f2fd'] },
    mainOrb: { cx: 0.5, cy: 0.46, r: 0.52, stops: [[0, '#8cc8ff', 0.78], [38, '#a0d7ff', 0.5], [72, '#bee6ff', 0.22], [100, '#ffffff', 0]] },
    orb1: { cx: 0.18, cy: 0.18, r: 0.4, stops: [[0, '#c8e6ff', 0.4], [100, '#ffffff', 0]] },
    orb2: { cx: 0.85, cy: 0.82, r: 0.36, stops: [[0, '#a0bef0', 0.38], [100, '#ffffff', 0]] },
    text: { name: 'rgba(20,40,70,.88)', subtitle: 'rgba(60,130,210,.82)', affirmation: 'rgba(35,60,100,.65)' },
    lineColor: LIGHT_LINE,
  },
  velvet: {
    label: '🫐 Velvet Aura',
    dark: true,
    bg: { type: 'linear', colors: ['#120820', '#180c2a', '#100818'] },
    mainOrb: { cx: 0.5, cy: 0.46, r: 0.52, stops: [[0, '#b450dc', 0.65], [40, '#8c3cb4', 0.38], [100, '#ffffff', 0]] },
    orb1: { cx: 0.8, cy: 0.2, r: 0.4, stops: [[0, '#f050a0', 0.35], [100, '#ffffff', 0]] },
    orb2: { cx: 0.15, cy: 0.8, r: 0.38, stops: [[0, '#503cc8', 0.38], [100, '#ffffff', 0]] },
    text: { name: 'rgba(252,240,255,.95)', subtitle: 'rgba(210,130,255,.88)', affirmation: 'rgba(200,175,240,.72)' },
    lineColor: DARK_LINE,
    stars: { count: 90, color: '#dca0ff' },
  },
  pearl: {
    label: '🤍 Pearl Aura',
    dark: false,
    bg: { type: 'linear', colors: ['#fefcf8', '#fdfaf5', '#fcf8f2'] },
    mainOrb: { cx: 0.5, cy: 0.46, r: 0.52, stops: [[0, '#ffdcc8', 0.72], [38, '#ffd2d7', 0.45], [72, '#ffe1e6', 0.2], [100, '#ffffff', 0]] },
    orb1: { cx: 0.2, cy: 0.2, r: 0.4, stops: [[0, '#dcdcff', 0.35], [100, '#ffffff', 0]] },
    text: { name: 'rgba(55,40,45,.88)', subtitle: 'rgba(180,140,155,.82)', affirmation: 'rgba(72,58,62,.65)' },
    lineColor: LIGHT_LINE,
  },
};
// Visible order in the website's Style row (Auto + 19 chips). 'sage' exists in
// AURA_STYLES (ported above) but has no chip on the site either — Shuffle can
// still land on it there, so we keep it selectable via Shuffle but not shown.
const STYLE_KEYS = [
  'pastel', 'golden', 'midnight', 'rose', 'crystal', 'aurora', 'amethyst', 'ocean', 'sunset',
  'cherry', 'cosmos', 'ethereal', 'forest', 'desert', 'lavender', 'ember', 'arctic', 'velvet', 'pearl',
];
const SHUFFLE_KEYS = Object.keys(AURA_STYLES); // includes 'sage', matches website's shuffleCardStyle()

// Chip swatch colours — ported from the site's inline per-button styles
// (index.html #cardPanel), which are hand-tuned previews distinct from the
// actual card-render gradients above.
const CHIP_SWATCHES = {
  auto: { border: colors.pinkMid, bg: 'transparent', text: colors.pinkMid },
  pastel: { border: 'rgba(201,168,201,0.35)', bg: '#fdf5ff', text: colors.pinkMid },
  golden: { border: '#e8c080', bg: '#fdf0d5', text: '#8a6000' },
  midnight: { border: '#3a2a5a', bg: '#1a0f2e', text: '#dda0ff' },
  rose: { border: '#e0b0c0', bg: '#fdf0f4', text: '#8b4a5c' },
  crystal: { border: 'rgba(201,168,201,0.35)', bg: '#f0f4ff', text: '#604090' },
  aurora: { border: '#006040', bg: '#0a1628', text: '#00ffb4' },
  amethyst: { border: '#6030b0', bg: '#1a0f2e', text: '#e0b0ff' },
  ocean: { border: '#1a6a9a', bg: '#e8f4fd', text: '#0a3a5a' },
  sunset: { border: '#e05030', bg: '#8b1a4a', text: '#ffe0b0' },
  cherry: { border: '#c05080', bg: '#fdf0f5', text: '#5a1a3a' },
  cosmos: { border: '#3a0080', bg: '#020810', text: '#c8b4ff' },
  ethereal: { border: 'rgba(201,168,201,0.35)', bg: '#f8f4ff', text: '#6040a0' },
  forest: { border: '#206030', bg: '#0a1a0a', text: '#90e090' },
  desert: { border: '#c09040', bg: '#fdf0d0', text: '#4a2800' },
  lavender: { border: '#9060e0', bg: '#f0eaff', text: '#3a2060' },
  ember: { border: '#8a2000', bg: '#1a0500', text: '#ffb060' },
  arctic: { border: '#2a6a9a', bg: '#e8f4ff', text: '#0a2a4a' },
  velvet: { border: '#4a0830', bg: '#1a0010', text: '#ffb0c0' },
  pearl: { border: '#c0b0a0', bg: '#fdfcfb', text: '#6a5a4a' },
};

const CARD_PATTERNS = [
  { key: 'radial', label: 'Radial', icon: '⭕' },
  { key: 'linear', label: 'Linear', icon: '↗' },
  { key: 'mesh', label: 'Mesh', icon: '⬡' },
  { key: 'cosmic', label: 'Cosmic', icon: '✨' },
  { key: 'aurora', label: 'Aurora', icon: '🌈' },
  { key: 'aura', label: 'Aura', icon: '🔮' },
  { key: 'solid', label: 'Solid', icon: '■' },
];

const DEFAULT_COLORS = ['#c490d4', '#f0a0c8', '#a0c8f0', '#f8e8a0'];

const QUICK_ADD = [
  { label: 'Abundant', text: 'Abundant' },
  { label: 'Loved', text: 'I am loved' },
  { label: 'Magnetic', text: 'Magnetic' },
  { label: 'Healed', text: 'Healed' },
  { label: 'Wealthy', text: 'Wealthy' },
];

// 5 light / 3 dark, used only for the "no keyword matched" auto-style coin flip.
const CARD_PALETTE_DARK = [false, false, false, false, false, true, true, true];

// Auto-style keyword detection, ported 1:1 from the website's cards.js.
function detectStyle(text) {
  const n = text.toLowerCase();
  if (/love|loved|heart|romance/.test(n)) return 'rose';
  if (/wealth|money|abundant|rich|gold/.test(n)) return 'golden';
  if (/heal|health|body|nature|sage/.test(n)) return 'crystal';
  if (/peace|calm|free|crystal|clear/.test(n)) return 'crystal';
  if (/dream|magic|moon|star|mystic|night|cosmos/.test(n)) return 'midnight';
  const seed = text ? text.split('').reduce((a, c) => a + c.charCodeAt(0), 0) : new Date().getDate();
  return CARD_PALETTE_DARK[seed % CARD_PALETTE_DARK.length] ? 'midnight' : 'pastel';
}

const GENERIC_TEXT = {
  dark: { name: 'rgba(255,240,255,.95)', subtitle: 'rgba(220,160,255,.85)', affirmation: 'rgba(200,185,240,.75)' },
  light: { name: 'rgba(46,37,48,.9)', subtitle: 'rgba(168,123,168,.85)', affirmation: 'rgba(74,63,77,.65)' },
};

// Pad an active-colour list back to exactly 4 by cycling — mirrors the
// website's _drawCustomCardBg padding so patterns never break with <4 colours.
function padTo4(cols) {
  const padded = cols.slice();
  while (padded.length < 4) padded.push(padded[padded.length % cols.length]);
  return padded;
}

// Shared center glow layered on top of every style, matches the site's fixed
// composition (CENTER_GLOW) used across all 20 AURA_STYLES presets.
const CENTER_GLOW = { cx: 0.5, cy: 0.5, r: 0.18, stops: [[0, '#ffffff', 0.45], [100, '#ffffff', 0]] };

// Small hand-placed dot field standing in for the website canvas's randomised
// per-frame star scatter (twinkling pixels aren't practical as static SVG).
const STAR_DOTS = [
  { x: 0.12, y: 0.12, r: 1.4, o: 0.5 }, { x: 0.85, y: 0.1, r: 1.1, o: 0.4 },
  { x: 0.22, y: 0.28, r: 0.9, o: 0.35 }, { x: 0.92, y: 0.3, r: 1.3, o: 0.5 },
  { x: 0.07, y: 0.55, r: 1, o: 0.4 }, { x: 0.9, y: 0.62, r: 0.9, o: 0.3 },
  { x: 0.15, y: 0.85, r: 1.2, o: 0.45 }, { x: 0.88, y: 0.88, r: 1, o: 0.35 },
  { x: 0.5, y: 0.08, r: 0.8, o: 0.3 }, { x: 0.35, y: 0.93, r: 1, o: 0.4 },
  { x: 0.6, y: 0.4, r: 0.7, o: 0.3 }, { x: 0.4, y: 0.65, r: 0.9, o: 0.35 },
];

function StyleSvg({ styleKey, size }) {
  const s = AURA_STYLES[styleKey] || AURA_STYLES.pastel;
  const orbs = [s.mainOrb, s.orb1, s.orb2, CENTER_GLOW].filter(Boolean);

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
        <Circle key={`star-${i}`} cx={d.x * size} cy={d.y * size} r={d.r} fill={s.stars.color} opacity={d.o} />
      ))}
    </Svg>
  );
}

// Custom pattern + 4-colour renderer — an SVG approximation of the website's
// canvas-based _drawCustomCardBg for each of the 7 selectable patterns.
function PatternSvg({ pattern, colors: cols, size }) {
  const c = padTo4(cols.length ? cols : DEFAULT_COLORS);
  const [c1, c2, c3, c4] = c;
  const uid = pattern + c.join('').replace(/#/g, '');

  if (pattern === 'solid') {
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id={`p-${uid}-0`}>
            <Stop offset="0%" stopColor={c2} stopOpacity={0.45} />
            <Stop offset="100%" stopColor={c1} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} fill={c1} />
        <Circle cx={size * 0.5} cy={size * 0.5} r={size * 0.7} fill={`url(#p-${uid}-0)`} />
      </Svg>
    );
  }

  if (pattern === 'linear') {
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id={`p-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={c1} />
            <Stop offset="33%" stopColor={c2} />
            <Stop offset="66%" stopColor={c3} />
            <Stop offset="100%" stopColor={c4} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} fill={`url(#p-${uid})`} />
      </Svg>
    );
  }

  if (pattern === 'radial') {
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id={`p-${uid}-c`}>
            <Stop offset="0%" stopColor={c2} stopOpacity={0.88} />
            <Stop offset="45%" stopColor={c2} stopOpacity={0.45} />
            <Stop offset="100%" stopColor={c2} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`p-${uid}-tl`}>
            <Stop offset="0%" stopColor={c3} stopOpacity={0.55} />
            <Stop offset="100%" stopColor={c3} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`p-${uid}-br`}>
            <Stop offset="0%" stopColor={c4} stopOpacity={0.5} />
            <Stop offset="100%" stopColor={c4} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} fill={c1} />
        <Circle cx={size * 0.5} cy={size * 0.46} r={size * 0.6} fill={`url(#p-${uid}-c)`} />
        <Circle cx={size * 0.1} cy={size * 0.12} r={size * 0.45} fill={`url(#p-${uid}-tl)`} />
        <Circle cx={size * 0.88} cy={size * 0.85} r={size * 0.42} fill={`url(#p-${uid}-br)`} />
      </Svg>
    );
  }

  if (pattern === 'mesh') {
    const blobs = [
      [0.15, 0.15, c2], [0.85, 0.15, c3], [0.15, 0.85, c4], [0.85, 0.85, c2], [0.5, 0.5, c3],
    ];
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {blobs.map((b, i) => (
            <RadialGradient key={i} id={`p-${uid}-${i}`}>
              <Stop offset="0%" stopColor={b[2]} stopOpacity={0.75} />
              <Stop offset="100%" stopColor={b[2]} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        <Rect x="0" y="0" width={size} height={size} fill={c1} />
        {blobs.map((b, i) => (
          <Circle key={i} cx={size * b[0]} cy={size * b[1]} r={size * 0.5} fill={`url(#p-${uid}-${i})`} />
        ))}
      </Svg>
    );
  }

  if (pattern === 'cosmic') {
    const dark = scaleColor(c1, 0.25);
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id={`p-${uid}-c`}>
            <Stop offset="0%" stopColor={c2} stopOpacity={0.65} />
            <Stop offset="50%" stopColor={c3} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={c3} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`p-${uid}-a`}>
            <Stop offset="0%" stopColor={c4} stopOpacity={0.4} />
            <Stop offset="100%" stopColor={c4} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} fill={dark} />
        <Circle cx={size * 0.5} cy={size * 0.45} r={size * 0.55} fill={`url(#p-${uid}-c)`} />
        <Circle cx={size * 0.2} cy={size * 0.25} r={size * 0.38} fill={`url(#p-${uid}-a)`} />
        {STAR_DOTS.map((d, i) => (
          <Circle key={`star-${i}`} cx={d.x * size} cy={d.y * size} r={d.r} fill="#ffffff" opacity={d.o * 0.7} />
        ))}
      </Svg>
    );
  }

  if (pattern === 'aurora') {
    const dark = scaleColor(c1, 0.2);
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id={`p-${uid}-a`} x1="0%" y1="20%" x2="100%" y2="50%">
            <Stop offset="0%" stopColor={c2} stopOpacity={0.55} />
            <Stop offset="50%" stopColor={c3} stopOpacity={0.35} />
            <Stop offset="100%" stopColor={c3} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={`p-${uid}-b`} x1="100%" y1="55%" x2="0%" y2="80%">
            <Stop offset="0%" stopColor={c4} stopOpacity={0.45} />
            <Stop offset="100%" stopColor={c4} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} fill={dark} />
        <Rect x="0" y="0" width={size} height={size} fill={`url(#p-${uid}-a)`} />
        <Rect x="0" y="0" width={size} height={size} fill={`url(#p-${uid}-b)`} />
        {STAR_DOTS.slice(0, 8).map((d, i) => (
          <Circle key={`star-${i}`} cx={d.x * size} cy={d.y * size} r={d.r * 0.8} fill="#ffffff" opacity={d.o * 0.6} />
        ))}
      </Svg>
    );
  }

  // 'aura'
  const base = avgColor(c1, c2);
  const corners = [[0.08, 0.1, c3], [0.92, 0.08, c4], [0.08, 0.9, c4], [0.92, 0.9, c2]];
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id={`p-${uid}-c`}>
          <Stop offset="0%" stopColor={c1} stopOpacity={0.9} />
          <Stop offset="30%" stopColor={c2} stopOpacity={0.65} />
          <Stop offset="60%" stopColor={c3} stopOpacity={0.35} />
          <Stop offset="100%" stopColor={c4} stopOpacity={0.12} />
        </RadialGradient>
        {corners.map((b, i) => (
          <RadialGradient key={i} id={`p-${uid}-${i}`}>
            <Stop offset="0%" stopColor={b[2]} stopOpacity={0.45} />
            <Stop offset="100%" stopColor={b[2]} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      <Rect x="0" y="0" width={size} height={size} fill={base} />
      <Circle cx={size * 0.5} cy={size * 0.5} r={size * 0.7} fill={`url(#p-${uid}-c)`} />
      {corners.map((b, i) => (
        <Circle key={i} cx={size * b[0]} cy={size * b[1]} r={size * 0.5} fill={`url(#p-${uid}-${i})`} />
      ))}
    </Svg>
  );
}

// ─── Text overlay — logical positions ported 1:1 from _doGenerateCard's
// canvas layout math (square 1080×1080 branch), scaled to the display size.
// NOTE: the website's textarea-driven UI always calls the array/list render
// path (even for a single line) — the alternate "giant single word" /
// "wrapped long quote" canvas branches are only reachable through a legacy
// hidden input with no UI trigger left, so they're intentionally not ported.
function CardOverlay({ size, dark, text, lines, styleLabel }) {
  const scale = size / LOGICAL_W;
  const L = (v) => v * scale;
  const now = new Date();
  const ornY = 118;
  const joined = lines.join(' ');

  const seed = joined ? joined.split('').reduce((a, c) => a + c.charCodeAt(0), 0) : now.getDate() + now.getMonth() * 31;
  const affIdx = (now.getDate() + now.getMonth() + seed) % AURA_AFFIRMATIONS.length;
  const affText = AURA_AFFIRMATIONS[affIdx];

  const hasLines = lines && lines.length > 0;
  const isEmpty = !hasLines;

  const listFs = hasLines ? (() => {
    let fs = 46;
    const maxW = LOGICAL_W - 160;
    const longest = Math.max(...lines.slice(0, 8).map((l) => l.length), 1);
    while (fs > 22 && longest * fs * 0.5 > maxW) fs -= 2;
    return fs;
  })() : 46;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Corner marks */}
      {[[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([sx, sy], i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: L(32), height: L(32),
            left: sx > 0 ? L(52) : undefined, right: sx < 0 ? L(52) : undefined,
            top: sy > 0 ? L(52) : undefined, bottom: sy < 0 ? L(52) : undefined,
            borderColor: dark ? DARK_LINE : LIGHT_LINE,
            borderTopWidth: sy > 0 ? 1.5 : 0, borderBottomWidth: sy < 0 ? 1.5 : 0,
            borderLeftWidth: sx > 0 ? 1.5 : 0, borderRightWidth: sx < 0 ? 1.5 : 0,
          }}
        />
      ))}

      {/* Top ornament + brand + date */}
      <View style={{ position: 'absolute', top: L(ornY - 60), left: L(80), right: L(80), alignItems: 'center' }}>
        <View style={{ width: '100%', height: 1, backgroundColor: dark ? DARK_LINE : LIGHT_LINE, marginBottom: L(20) }} />
        <Text style={{ fontFamily: fonts.display, fontWeight: '300', fontSize: L(38), color: text.subtitle, letterSpacing: L(3) }}>MANIVERS</Text>
        <Text style={{ fontFamily: fonts.display, fontWeight: '300', fontSize: L(24), color: text.subtitle, opacity: 0.65, marginTop: L(8) }}>
          {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      {/* Main content */}
      {isEmpty && (
        <View style={{ position: 'absolute', top: L(400), left: L(60), right: L(60), alignItems: 'center' }}>
          <Text style={{ fontFamily: fonts.displayItalic, fontStyle: 'italic', fontWeight: '300', fontSize: L(72), color: text.name, textAlign: 'center' }}>
            Your Aura Card
          </Text>
          <Text style={{ fontFamily: fonts.displayItalic, fontStyle: 'italic', fontWeight: '300', fontSize: L(32), color: text.subtitle, textAlign: 'center', marginTop: L(14) }}>
            {styleLabel}
          </Text>
          <View style={{ width: L(220), height: 1, backgroundColor: dark ? DARK_LINE : LIGHT_LINE, marginTop: L(30) }} />
        </View>
      )}

      {hasLines && (
        <View style={{ position: 'absolute', top: L(ornY + 100), left: L(60), right: L(60), bottom: L(280), justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.display, fontSize: L(listFs * 2.2), color: text.subtitle, opacity: 0.14, position: 'absolute', top: L(-30), left: 0 }}>“</Text>
          {lines.slice(0, 8).map((ln, i) => (
            <View key={i}>
              {i > 0 && <View style={{ alignSelf: 'center', width: L(300), height: 1, backgroundColor: dark ? DARK_LINE : LIGHT_LINE, marginVertical: L(listFs * 0.4) }} />}
              <Text style={{ fontFamily: fonts.displayItalic, fontStyle: 'italic', fontWeight: '300', fontSize: L(listFs), color: text.name, textAlign: 'center', lineHeight: L(listFs * 1.3) }}>
                {ln}
              </Text>
            </View>
          ))}
          {lines.length > 8 && (
            <Text style={{ fontFamily: fonts.display, fontSize: L(22), color: text.subtitle, opacity: 0.55, textAlign: 'center', marginTop: L(16) }}>
              + {lines.length - 8} more affirmations
            </Text>
          )}
        </View>
      )}

      {/* Daily affirmation footer */}
      <View style={{ position: 'absolute', top: L(884), left: L(80), right: L(80), alignItems: 'center' }}>
        <View style={{ width: '100%', height: 1, backgroundColor: dark ? DARK_LINE : LIGHT_LINE, marginBottom: L(18) }} />
        <Text style={{ fontFamily: fonts.displayItalic, fontStyle: 'italic', fontWeight: '300', fontSize: L(27), color: text.affirmation, textAlign: 'center', lineHeight: L(27 * 1.5) }}>
          "{affText}"
        </Text>
      </View>

      {/* Footer */}
      <View style={{ position: 'absolute', top: L(996), left: L(80), right: L(80), alignItems: 'center' }}>
        <View style={{ width: '100%', height: 1, backgroundColor: dark ? DARK_LINE : LIGHT_LINE, marginBottom: L(16) }} />
        <Text style={{ fontFamily: fonts.body, fontWeight: '300', fontSize: L(19), color: dark ? 'rgba(200,180,240,.38)' : 'rgba(154,136,150,.42)' }}>
          manivers.com
        </Text>
        <Text style={{ fontFamily: fonts.displayItalic, fontStyle: 'italic', fontWeight: '300', fontSize: L(21), color: dark ? 'rgba(220,160,255,.32)' : 'rgba(168,123,168,.48)', marginTop: L(6) }}>
          Believe · Receive · Become
        </Text>
      </View>
    </View>
  );
}

// A small curated palette to cycle through per colour slot — RN has no
// built-in OS colour-picker like the website's <input type="color">, so
// tapping a swatch cycles it to the next colour in this list instead.
const COLOR_CYCLE = [
  '#c490d4', '#f0a0c8', '#a0c8f0', '#f8e8a0', '#f28c95', '#8cc8a5',
  '#dc50b4', '#50a0f0', '#ffb450', '#b464ff', '#3cc878', '#e63c78',
  '#64c8dc', '#dca0ff',
];

function capLines(lines) {
  let wc = 0;
  const capped = [];
  let wasCapped = false;
  for (const l of lines) {
    const words = l.split(/\s+/).filter(Boolean);
    if (wc + words.length > CARD_MAX_WORDS) {
      const rem = CARD_MAX_WORDS - wc;
      if (rem > 0) capped.push(words.slice(0, rem).join(' '));
      wasCapped = true;
      break;
    }
    capped.push(l);
    wc += words.length;
  }
  return { capped, wasCapped };
}

export default function AuraCard() {
  const [listText, setListText] = useState('');
  const [debouncedText, setDebouncedText] = useState('');
  const [mode, setMode] = useState('style'); // 'style' | 'pattern'
  const [styleKey, setStyleKey] = useState('auto');
  const [pattern, setPattern] = useState('radial');
  const [colorActive, setColorActive] = useState([true, true, true, true]);
  const [colorValues, setColorValues] = useState(DEFAULT_COLORS);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const cardRef = useRef(null);
  const debounceRef = useRef(null);
  const capToastShownRef = useRef(false);

  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedText(listText), 350);
    return () => clearTimeout(debounceRef.current);
  }, [listText]);

  const rawLines = useMemo(
    () => debouncedText.split('\n').map((l) => l.trim()).filter(Boolean),
    [debouncedText]
  );
  const { capped: lines, wasCapped } = useMemo(() => capLines(rawLines), [rawLines]);

  useEffect(() => {
    if (wasCapped && !capToastShownRef.current) {
      capToastShownRef.current = true;
      setInfo('Aura cards are capped at 50 words ✨');
      setTimeout(() => setInfo(''), 3000);
    }
  }, [wasCapped]);

  const resolvedStyleKey = useMemo(() => {
    if (mode !== 'style') return null;
    if (styleKey === 'auto') return detectStyle(lines.join(' '));
    return styleKey;
  }, [mode, styleKey, lines]);

  const effectiveColors = useMemo(() => {
    const active = colorValues.filter((_, i) => colorActive[i]);
    return active.length ? padTo4(active) : DEFAULT_COLORS;
  }, [colorValues, colorActive]);

  const dark = useMemo(() => {
    if (mode === 'style') return !!AURA_STYLES[resolvedStyleKey]?.dark;
    const lum = luminance(effectiveColors[0]);
    return lum < 0.35 || pattern === 'cosmic' || pattern === 'aurora';
  }, [mode, resolvedStyleKey, effectiveColors, pattern]);

  const textColors = mode === 'style'
    ? (AURA_STYLES[resolvedStyleKey]?.text || GENERIC_TEXT.light)
    : (dark ? GENERIC_TEXT.dark : GENERIC_TEXT.light);

  const fullStyleLabel = mode === 'style'
    ? (AURA_STYLES[resolvedStyleKey]?.label || '')
    : `${CARD_PATTERNS.find((p) => p.key === pattern)?.icon || ''} ${CARD_PATTERNS.find((p) => p.key === pattern)?.label || ''} Pattern`;
  const placeholderStyleLabel = fullStyleLabel.replace(/^\S+\s/, '');

  const handleQuickAdd = (word) => {
    setListText((prev) => (prev.trim() ? prev.replace(/\n+$/, '') + '\n' + word : word));
    setRevealed(true);
  };

  const handleGenerate = () => {
    clearTimeout(debounceRef.current);
    setDebouncedText(listText);
    setRevealed(true);
  };

  const handlePickStyle = (key) => {
    setMode('style');
    setStyleKey(key);
    setRevealed(true);
  };

  const handlePickPattern = (key) => {
    setMode('pattern');
    setPattern(key);
    setRevealed(true);
  };

  const handleCycleColor = (idx) => {
    setColorValues((prev) => {
      const next = prev.slice();
      const curIdx = COLOR_CYCLE.indexOf(next[idx]);
      next[idx] = COLOR_CYCLE[(curIdx + 1) % COLOR_CYCLE.length];
      return next;
    });
    setMode('pattern');
    setRevealed(true);
  };

  const handleToggleColor = (idx) => {
    const activeCount = colorActive.filter(Boolean).length;
    if (colorActive[idx] && activeCount <= 2) {
      setError('Keep at least 2 colors ✨');
      setTimeout(() => setError(''), 2000);
      return;
    }
    setColorActive((prev) => {
      const next = prev.slice();
      next[idx] = !next[idx];
      return next;
    });
    setMode('pattern');
    setRevealed(true);
  };

  const handleResetColors = () => {
    setColorValues(DEFAULT_COLORS);
    setColorActive([true, true, true, true]);
    setMode('style');
  };

  const handleShuffleStyle = () => {
    const current = mode === 'style' ? resolvedStyleKey : null;
    const others = SHUFFLE_KEYS.filter((k) => k !== current);
    const next = others[Math.floor(Math.random() * others.length)];
    setMode('style');
    setStyleKey(next);
    setRevealed(true);
    setInfo(`${AURA_STYLES[next].label} ✨`);
    setTimeout(() => setInfo(''), 2000);
  };

  const handleClearCard = () => {
    setListText('');
    setDebouncedText('');
    setRevealed(false);
    setError('');
    setInfo('');
  };

  const handleDownload = async () => {
    setError(''); setDownloading(true);
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
    setError(''); setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      const available = await Sharing.isAvailableAsync();
      if (!available) { setInfo("Sharing isn't available on this device."); return; }
      await Sharing.shareAsync(uri);
    } catch (e) {
      setError(e.message || 'Could not share your aura card');
    } finally { setSharing(false); }
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ScreenHeader lead="Your" accent="Aura Card" subtitle="A word, a list, an affirmation set — make it yours. Share it. Start the trend. ✨" />

        <GlassCard style={styles.mb16}>
          <Text style={styles.sectionLabel}>✨ Your words, affirmations &amp; gratitude</Text>
          <TextInput
            style={styles.textarea}
            placeholder={'Abundant\nI am magnetic and loved\nI am grateful for everything flowing to me\nMoney comes easily and effortlessly\nI attract all that I desire...'}
            placeholderTextColor={colors.mist2}
            value={listText}
            onChangeText={setListText}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.quickAddRow}>
            <Text style={styles.quickAddLabel}>Quick add:</Text>
            {QUICK_ADD.map((q) => (
              <TouchableOpacity key={q.label} activeOpacity={0.75} style={styles.quickAddChip} onPress={() => handleQuickAdd(q.text)}>
                <Text style={styles.quickAddChipText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity activeOpacity={0.85} style={styles.generateBtn} onPress={handleGenerate}>
            <Ionicons name="sparkles" size={14} color="#fff" />
            <Text style={styles.generateBtnText}>Generate Card</Text>
          </TouchableOpacity>
        </GlassCard>

        <GlassCard style={styles.mb16}>
          <View style={styles.rowBetween}>
            <Text style={styles.groupLabel}>Style</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity activeOpacity={0.75} style={styles.smallGhostBtn} onPress={handleClearCard}>
                <Text style={styles.smallGhostBtnText}>🗑 Clear Card</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={styles.shuffleBtn} onPress={handleShuffleStyle}>
                <Text style={styles.shuffleBtnText}>🔀 Shuffle</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.styleRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.styleChip, { borderColor: CHIP_SWATCHES.auto.border, backgroundColor: CHIP_SWATCHES.auto.bg === 'transparent' ? 'rgba(255,255,255,0.4)' : CHIP_SWATCHES.auto.bg }, mode === 'style' && styleKey === 'auto' && styles.styleChipActive]}
              onPress={() => handlePickStyle('auto')}
            >
              <Text style={[styles.styleChipText, { color: CHIP_SWATCHES.auto.text }]}>✨ Auto</Text>
            </TouchableOpacity>
            {STYLE_KEYS.map((key) => {
              const sw = CHIP_SWATCHES[key];
              const active = mode === 'style' && styleKey === key;
              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.8}
                  style={[styles.styleChip, { borderColor: sw.border, backgroundColor: sw.bg }, active && styles.styleChipActive]}
                  onPress={() => handlePickStyle(key)}
                >
                  <Text style={[styles.styleChipText, { color: sw.text }]}>{AURA_STYLES[key].label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </GlassCard>

        <GlassCard style={styles.mb16}>
          <View style={styles.rowBetween}>
            <Text style={styles.groupLabel}>Colours</Text>
            <TouchableOpacity activeOpacity={0.75} style={styles.smallGhostBtn} onPress={handleResetColors}>
              <Text style={styles.smallGhostBtnText}>↺ Reset</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.colorRow}>
            {colorValues.map((c, i) => (
              <View key={i} style={styles.colorSwatchWrap}>
                <TouchableOpacity activeOpacity={0.8} style={[styles.colorSwatch, { backgroundColor: c, opacity: colorActive[i] ? 1 : 0.35 }]} onPress={() => handleCycleColor(i)} />
                <TouchableOpacity activeOpacity={0.75} style={[styles.colorToggle, !colorActive[i] && styles.colorToggleOff]} onPress={() => handleToggleColor(i)}>
                  <Text style={[styles.colorToggleText, !colorActive[i] && styles.colorToggleTextOff]}>{colorActive[i] ? 'on' : 'off'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <Text style={[styles.groupLabel, { marginTop: 16, marginBottom: 10 }]}>Pattern</Text>
          <View style={styles.patternRow}>
            {CARD_PATTERNS.map((p) => {
              const active = mode === 'pattern' && pattern === p.key;
              return (
                <TouchableOpacity key={p.key} activeOpacity={0.8} style={[styles.patternChip, active && styles.patternChipActive]} onPress={() => handlePickPattern(p.key)}>
                  <Text style={[styles.patternChipText, active && styles.patternChipTextActive]}>{p.icon} {p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>

        {revealed && (
          <>
            <View style={styles.cardOuter}>
              <View ref={cardRef} collapsable={false} style={[styles.cardCapture, { width: CARD_SIZE, height: CARD_SIZE }]}>
                {mode === 'style'
                  ? <StyleSvg styleKey={resolvedStyleKey} size={CARD_SIZE} />
                  : <PatternSvg pattern={pattern} colors={effectiveColors} size={CARD_SIZE} />}
                <CardOverlay size={CARD_SIZE} dark={dark} text={textColors} lines={lines} styleLabel={placeholderStyleLabel} />
              </View>
            </View>

            <Text style={styles.styleCaption}>{fullStyleLabel}</Text>
            {info ? <Text style={styles.infoText}>{info}</Text> : null}

            <View style={styles.actionRow}>
              <TouchableOpacity activeOpacity={0.8} style={styles.actionBtn} onPress={handleDownload} disabled={downloading}>
                {downloading ? <ActivityIndicator size="small" color={colors.ink} /> : (
                  <>
                    <Ionicons name="download-outline" size={14} color={colors.ink2} />
                    <Text style={styles.actionBtnText}>Download</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} style={styles.actionBtn} onPress={handleShare} disabled={sharing}>
                {sharing ? <ActivityIndicator size="small" color={colors.ink} /> : (
                  <>
                    <Ionicons name="share-social-outline" size={14} color={colors.ink2} />
                    <Text style={styles.actionBtnText}>Share</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} style={styles.actionBtn} onPress={handleShuffleStyle}>
                <Ionicons name="shuffle-outline" size={14} color={colors.ink2} />
                <Text style={styles.actionBtnText}>New Style</Text>
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
  mb16: { marginBottom: 16 },

  sectionLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.purpleDark, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 },
  textarea: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14,
    padding: 14,
    minHeight: 160,
    fontSize: 15,
    fontFamily: fonts.displayItalic,
    fontStyle: 'italic',
    lineHeight: 26,
    color: colors.ink,
    borderWidth: 1,
    borderColor: 'rgba(201,168,201,0.25)',
  },
  quickAddRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 10 },
  quickAddLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.mist },
  quickAddChip: { backgroundColor: colors.lilac, borderRadius: radii.pill, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(201,168,201,0.35)' },
  quickAddChipText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.purpleDark },

  errorText: { color: colors.danger, fontSize: 12, marginTop: 10, textAlign: 'center' },
  infoText: { color: colors.purpleDark, fontSize: 12, textAlign: 'center', marginBottom: 10 },

  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.pinkAccent, borderRadius: radii.pill, paddingVertical: 12, marginTop: 12,
    ...shadows.button,
  },
  generateBtnText: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: '#fff', fontWeight: '600' },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  groupLabel: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.mist, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
  smallGhostBtn: { borderWidth: 1, borderColor: 'rgba(201,168,201,0.35)', borderRadius: radii.pill, paddingVertical: 5, paddingHorizontal: 11 },
  smallGhostBtnText: { fontFamily: fonts.body, fontSize: 11, color: colors.mist, fontWeight: '500' },
  shuffleBtn: { backgroundColor: colors.pinkAccent, borderRadius: radii.pill, paddingVertical: 5, paddingHorizontal: 11 },
  shuffleBtnText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: '#fff', fontWeight: '600' },

  styleRow: { flexDirection: 'row', gap: 6, paddingVertical: 2, paddingRight: 6 },
  styleChip: { borderWidth: 1, borderRadius: radii.pill, paddingVertical: 6, paddingHorizontal: 12 },
  styleChipActive: { borderWidth: 2.5, ...shadows.cardSm },
  styleChipText: { fontFamily: fonts.bodyMedium, fontSize: 11.5, fontWeight: '500' },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorSwatchWrap: { alignItems: 'center', gap: 6 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#fff', ...shadows.cardSm },
  colorToggle: { borderWidth: 1, borderColor: 'rgba(201,168,201,0.35)', borderRadius: radii.pill, paddingVertical: 2, paddingHorizontal: 8, backgroundColor: '#fff' },
  colorToggleOff: { backgroundColor: colors.purpleMid, borderColor: colors.purpleMid },
  colorToggleText: { fontFamily: fonts.body, fontSize: 10, color: colors.mist },
  colorToggleTextOff: { color: '#fff' },

  patternRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  patternChip: { borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.35)', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: radii.pill, paddingVertical: 5, paddingHorizontal: 12 },
  patternChipActive: { borderColor: colors.pinkMid, backgroundColor: colors.lilac },
  patternChipText: { fontFamily: fonts.body, fontSize: 11.5, color: colors.ink2 },
  patternChipTextActive: { fontFamily: fonts.bodyMedium, color: colors.pinkMid, fontWeight: '600' },

  cardOuter: { alignItems: 'center', marginBottom: 12 },
  cardCapture: { borderRadius: 24, overflow: 'hidden', ...shadows.card },

  styleCaption: { textAlign: 'center', fontFamily: fonts.body, fontSize: 12, color: colors.mist, fontWeight: '500', marginBottom: 10 },

  actionRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: radii.pill, paddingVertical: 10, paddingHorizontal: 18,
    borderWidth: 1, borderColor: 'rgba(248,184,200,0.35)', minWidth: 110, justifyContent: 'center',
    ...shadows.cardSm,
  },
  actionBtnText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.ink2, fontWeight: '500' },
});
