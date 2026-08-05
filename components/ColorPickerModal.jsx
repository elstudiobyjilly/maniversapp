import { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, PanResponder, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radii } from '../constants/theme';

const SHEET_W = Math.min(Dimensions.get('window').width - 32, 420);
const SQUARE_SIZE = SHEET_W - 48;
const HUE_STOPS = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'];

// ── HSV <-> hex helpers ─────────────────────────────────────────────────
function hsvToHex(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsv(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let hue = 0;
  if (d !== 0) {
    if (max === r) hue = 60 * (((g - b) / d) % 6);
    else if (max === g) hue = 60 * ((b - r) / d + 2);
    else hue = 60 * ((r - g) / d + 4);
  }
  if (hue < 0) hue += 360;
  const sat = max === 0 ? 0 : d / max;
  return { h: hue, s: sat, v: max };
}

const GRID_SWATCHES = [
  '#ff6b9d', '#f8b8c8', '#e898b8', '#c85878', '#a03858',
  '#c9a8c9', '#a878b8', '#7a5080', '#e8d8f0', '#b888b8',
  '#7fd8c8', '#5a9e84', '#a8e0c8', '#40b090', '#2a7060',
  '#ffd66b', '#f8d878', '#c8a040', '#fdf5e0', '#7a5000',
  '#7fb8ff', '#a8d0ff', '#4878c0', '#6858a8', '#28104a',
  '#ffffff', '#e8e8e8', '#a0a0a0', '#585858', '#181818',
];

export default function ColorPickerModal({ visible, initialHex, savedColors = [], onSave, onClose }) {
  const [mode, setMode] = useState('spectrum'); // 'grid' | 'spectrum'
  const start = useMemo(() => hexToHsv(initialHex || '#e898b8'), [visible]); // eslint-disable-line
  const [h, setH] = useState(start.h);
  const [s, setS] = useState(start.s || 1);
  const [v, setV] = useState(start.v || 1);
  const hex = useMemo(() => hsvToHex(h, s, v), [h, s, v]);

  const squareRef = useRef(null);
  const hueRef = useRef(null);

  const squarePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => handleSquareTouch(e),
      onPanResponderMove: (e) => handleSquareTouch(e),
    })
  ).current;

  const huePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => handleHueTouch(e),
      onPanResponderMove: (e) => handleHueTouch(e),
    })
  ).current;

  const handleSquareTouch = (e) => {
    const { locationX, locationY } = e.nativeEvent;
    const x = Math.max(0, Math.min(SQUARE_SIZE, locationX));
    const y = Math.max(0, Math.min(SQUARE_SIZE, locationY));
    setS(x / SQUARE_SIZE);
    setV(1 - y / SQUARE_SIZE);
  };
  const handleHueTouch = (e) => {
    const { locationX } = e.nativeEvent;
    const x = Math.max(0, Math.min(SHEET_W - 48, locationX));
    setH((x / (SHEET_W - 48)) * 360);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabHandle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Colors</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.segRow}>
            {['Grid', 'Spectrum'].map((m) => {
              const key = m.toLowerCase();
              const active = mode === key;
              return (
                <TouchableOpacity key={m} style={[styles.segBtn, active && styles.segBtnActive]} onPress={() => setMode(key)}>
                  <Text style={[styles.segText, active && styles.segTextActive]}>{m}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {mode === 'spectrum' ? (
            <>
              <View
                ref={squareRef}
                style={[styles.square, { backgroundColor: hsvToHex(h, 1, 1) }]}
                {...squarePan.panHandlers}
              >
                <LinearGradient
                  colors={['#fff', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={['rgba(0,0,0,0)', '#000']}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View
                  pointerEvents="none"
                  style={[
                    styles.cursor,
                    { left: s * SQUARE_SIZE - 10, top: (1 - v) * SQUARE_SIZE - 10, backgroundColor: hex },
                  ]}
                />
              </View>

              <View ref={hueRef} style={styles.hueBar} {...huePan.panHandlers}>
                <LinearGradient
                  colors={HUE_STOPS}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <View pointerEvents="none" style={[styles.hueCursor, { left: (h / 360) * (SHEET_W - 48) - 3 }]} />
              </View>
            </>
          ) : (
            <View style={styles.gridWrap}>
              {GRID_SWATCHES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.gridSwatch, { backgroundColor: c }, hex.toLowerCase() === c.toLowerCase() && styles.gridSwatchActive]}
                  onPress={() => { const hsv = hexToHsv(c); setH(hsv.h); setS(hsv.s); setV(hsv.v); }}
                />
              ))}
            </View>
          )}

          <View style={styles.previewRow}>
            <View style={[styles.previewSwatch, { backgroundColor: hex }]} />
            <Text style={styles.previewHex}>{hex.toUpperCase()}</Text>
          </View>

          <Text style={styles.savedLabel}>SAVED COLORS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedRow}>
            <TouchableOpacity style={styles.addSwatchBtn} onPress={() => onSave(hex, true)}>
              <Text style={styles.addSwatchIcon}>+</Text>
            </TouchableOpacity>
            {savedColors.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.savedSwatch, { backgroundColor: c }]}
                onPress={() => { const hsv = hexToHsv(c); setH(hsv.h); setS(hsv.s); setV(hsv.v); }}
              />
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={() => onSave(hex, false)}>
            <Text style={styles.doneBtnText}>Use this color</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30, width: '100%', alignSelf: 'center',
  },
  grabHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center', marginBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontFamily: fonts.displayMedium, fontSize: 18, color: colors.ink, fontWeight: '600' },
  closeX: { fontSize: 18, color: colors.mist },

  segRow: { flexDirection: 'row', backgroundColor: 'rgba(201,168,201,0.12)', borderRadius: radii.pill, padding: 4, marginBottom: 16 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: radii.pill, alignItems: 'center' },
  segBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  segText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.mist, fontWeight: '600' },
  segTextActive: { color: colors.ink },

  square: {
    width: SQUARE_SIZE, height: SQUARE_SIZE, borderRadius: 16, alignSelf: 'center',
    overflow: 'hidden', marginBottom: 16,
  },
  cursor: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 3, elevation: 4 },

  hueBar: { height: 24, borderRadius: 12, overflow: 'hidden', marginBottom: 16, justifyContent: 'center' },
  hueCursor: { position: 'absolute', top: -2, width: 8, height: 28, borderRadius: 4, backgroundColor: '#fff', borderWidth: 2, borderColor: 'rgba(0,0,0,0.2)' },

  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16, justifyContent: 'center' },
  gridSwatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  gridSwatchActive: { borderWidth: 3, borderColor: colors.purpleDark },

  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  previewSwatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  previewHex: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink2, fontWeight: '600', letterSpacing: 0.5 },

  savedLabel: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.mist, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  savedRow: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  addSwatchBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(201,168,201,0.5)', alignItems: 'center', justifyContent: 'center' },
  addSwatchIcon: { fontSize: 16, color: colors.purpleDark, fontWeight: '600' },
  savedSwatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },

  doneBtn: { marginTop: 18, backgroundColor: colors.purpleMid, borderRadius: radii.pill, paddingVertical: 14, alignItems: 'center' },
  doneBtnText: { fontFamily: fonts.bodyMedium, fontSize: 14.5, color: '#fff', fontWeight: '700' },
});
