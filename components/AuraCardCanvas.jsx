import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Circle, Rect } from 'react-native-svg';
import {
  AURA_STYLES, CENTER_GLOW, STAR_DOTS, familyOn, COLOUR_FAMILIES,
} from '../constants/auraCard';

// The card's background is the FIRST toggled-on colour family (in
// COLOUR_FAMILIES order: purple, pink, blue, gold) whenever the card is in
// manual mode (`manual` = true, see the screen: picking a Style always
// wipes manual mode, customising a colour always turns it on -- the two
// are mutually exclusive) -- that first colour is the mandatory base/
// background colour. Outside manual mode, the background always stays
// the named Style's own designed wash.
function firstOnColor(colours, shadeOverrides, manual) {
  if (!manual) return null;
  const first = COLOUR_FAMILIES.find((f) => colours[f.key] !== false && colours[f.key] !== undefined);
  if (!first) return null;
  return shadeOverrides?.[first.key] || first.swatch;
}

// Simple luminance check so manual-mode text still reads clearly against
// whatever the user's first picked colour turns out to be, the same way
// each named Style is hand-tuned to sit light-text-on-dark or
// dark-text-on-light.
function isDarkHex(hex) {
  if (!hex) return false;
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const r = parseInt(full.slice(0, 2), 16), g = parseInt(full.slice(2, 4), 16), b = parseInt(full.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 140;
}

import { fonts } from '../constants/theme';

// A picked custom shade replaces every stop's colour (keeping each stop's
// original opacity/falloff) so the orb keeps its shape but reads as the
// chosen hue instead of the style's baked-in one.
function recolorOrb(orb, shadeOverrides) {
  const hex = shadeOverrides?.[orb.family];
  if (!hex) return orb;
  return { ...orb, stops: orb.stops.map((st) => [st[0], hex, st[2]]) };
}

// Fallback positions (main + 3 corners) used for any colour family the
// user explicitly picked a custom shade for that the active named style
// doesn't already carry an orb for -- every named style only bakes in 3
// fixed family/orb pairs, so without this a deliberately-picked 4th
// colour (or a family the style simply doesn't use) would silently never
// render, no matter what the user chose.
const FAMILY_FALLBACK_POSITIONS = [
  { cx: 0.5, cy: 0.47, r: 0.5 },
  { cx: 0.15, cy: 0.18, r: 0.38 },
  { cx: 0.85, cy: 0.82, r: 0.38 },
  { cx: 0.82, cy: 0.2, r: 0.34 },
];

// Manual mode ignores the named style entirely -- the card is built
// purely from the 4 COLOURS toggles/shades, laid out on the same fallback
// positions used for any "extra" colour a style didn't define. This is
// the "designing it yourself" path: no style's baked-in orbs at all.
function buildManualOrbs(colours, shadeOverrides) {
  const orbs = [];
  let posIdx = 0;
  COLOUR_FAMILIES.forEach((f) => {
    if (colours[f.key] === false) return;
    const color = shadeOverrides?.[f.key] || f.swatch;
    const pos = FAMILY_FALLBACK_POSITIONS[posIdx % FAMILY_FALLBACK_POSITIONS.length];
    posIdx += 1;
    orbs.push({ cx: pos.cx, cy: pos.cy, r: pos.r, family: f.key, stops: [[0, color, 0.55], [100, color, 0]] });
  });
  return orbs;
}

// Builds the full orb list for a style: the style's own baked-in orbs for
// whichever families are toggled on, PLUS a generated orb for any family
// the user explicitly picked a custom shade for that the style doesn't
// already define. A named Style is a complete, designed look on its own --
// picking one (which resets COLOURS to its all-on/no-overrides default and
// exits manual mode, see handlePickStyle) should render exactly as
// designed, not sprout extra orbs just because all 4 families default to
// "on". Only a family the user has actually customised via the colour
// picker (a real shadeOverride) earns a synthesized orb of its own;
// merely being toggled on with no override never adds anything the style
// didn't already draw.
function buildActiveOrbs(s, colours, shadeOverrides, manual) {
  if (manual) return buildManualOrbs(colours, shadeOverrides);
  const slotOrbs = [s.mainOrb, s.orb1, s.orb2];
  const presentFamilies = new Set(slotOrbs.map((o) => o.family));
  const orbs = slotOrbs.filter((o) => familyOn(o, colours)).map((o) => recolorOrb(o, shadeOverrides));

  let posIdx = orbs.length;
  COLOUR_FAMILIES.forEach(({ key }) => {
    if (shadeOverrides?.[key] && colours[key] !== false && !presentFamilies.has(key)) {
      const pos = FAMILY_FALLBACK_POSITIONS[posIdx % FAMILY_FALLBACK_POSITIONS.length];
      posIdx += 1;
      orbs.push({ cx: pos.cx, cy: pos.cy, r: pos.r, family: key, stops: [[0, shadeOverrides[key], 0.55], [100, shadeOverrides[key], 0]] });
    }
  });
  return orbs;
}

// ─── SVG composition — shape depends on `pattern`, colours depend on which
// of the 4 colour families are toggled on (and optionally recoloured via
// shadeOverrides: { purple/pink/blue/gold: hex }).
export default function AuraCardSvg({ styleKey, size, pattern, colours, shadeOverrides, manual }) {
  const s = AURA_STYLES[styleKey];
  const baseOrbs = buildActiveOrbs(s, colours, shadeOverrides, manual);
  const showStars = !manual && (pattern === 'cosmic' || (s.stars && pattern === 'radial'));

  const firstColor = firstOnColor(colours, shadeOverrides, manual);
  const bgFill = firstColor || (s.bg.type === 'solid' ? s.bg.colors[0] : `url(#bg-${styleKey})`);

  if (pattern === 'solid') {
    const solidColor = firstColor || baseOrbs[0]?.stops?.[0]?.[1] || s.bg.colors[0];
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
        <Rect x="0" y="0" width={size} height={size} fill={bgFill} />
        {stopColors.map((c, i) => (
          <Rect key={i} x="0" y="0" width={size} height={size} fill={`url(#aur-${styleKey}-${i})`} />
        ))}
      </Svg>
    );
  }

  // radial / aura / mesh / cosmic all share the gradient-defs setup below
  // 'aura' is deliberately a single soft glow for a named Style (just its
  // mainOrb) -- but in manual mode there's no "main" colour, only however
  // many of the 4 COLOURS the user has toggled on, and all of them should
  // still show up under any pattern, this one included.
  const orbsForLayout =
    pattern === 'aura' ? (manual ? baseOrbs : [s.mainOrb].filter((o) => familyOn(o, colours)).map((o) => recolorOrb(o, shadeOverrides)))
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

// ─── The complete, capture-ready card face: gradient canvas + the branded
// text overlay. Shared by the Aura Card tool screen and the Home dashboard
// widget so both always produce an identical downloadable card.
export function AuraCardFace({ styleKey, size, pattern, colours, shadeOverrides, quote, innerRef, manual }) {
  const s = AURA_STYLES[styleKey];
  // In manual mode there's no named style to borrow text contrast/label
  // from -- derive readable text colour from the first picked colour
  // instead (the same "mandatory base colour" driving the background),
  // and show a generic "Custom" label rather than a style name that no
  // longer applies.
  const manualFirst = manual ? firstOnColor(colours, shadeOverrides, true) : null;
  const dark = manual ? isDarkHex(manualFirst) : s.dark;
  const text = manual
    ? (dark
        ? { name: 'rgba(255,255,255,.92)', subtitle: 'rgba(255,255,255,.75)', affirmation: 'rgba(255,255,255,.7)' }
        : { name: 'rgba(46,37,48,.9)', subtitle: 'rgba(90,70,85,.75)', affirmation: 'rgba(60,48,58,.68)' })
    : s.text;
  const label = manual ? 'Custom' : s.label;
  return (
    <View ref={innerRef} collapsable={false} style={[faceStyles.capture, { width: size, height: size }]}>
      <AuraCardSvg styleKey={styleKey} size={size} pattern={pattern} colours={colours} shadeOverrides={shadeOverrides} manual={manual} />
      <View style={faceStyles.overlay}>
        <Text style={[faceStyles.brand, { color: text.name, fontSize: size * 0.045 }]}>MANIVERS</Text>
        <Text style={[faceStyles.date, { color: text.subtitle, fontSize: size * 0.026 }]}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <View style={{ flex: 1.6 }} />
        <Text adjustsFontSizeToFit numberOfLines={1} style={[faceStyles.name, { color: text.name, fontSize: size * 0.085 }]}>
          Your <Text style={faceStyles.nameAccent}>Aura Card</Text>
        </Text>
        <Text style={[faceStyles.subtitle, { color: text.subtitle, fontSize: size * 0.032 }]}>{label}</Text>
        <View style={{ flex: 1.4 }} />
        <Text numberOfLines={3} style={[faceStyles.affirmation, { color: text.affirmation, fontSize: size * 0.038 }]}>
          "{quote}"
        </Text>
        <View style={{ flex: 0.8 }} />
        <Text style={[faceStyles.watermark, { fontSize: size * 0.03, color: text.subtitle }]}>manivers.com</Text>
        <Text style={[faceStyles.tagline, { fontSize: size * 0.024, color: text.affirmation }]}>Believe · Receive · Become</Text>
        <View style={{ flex: 0.5 }} />
      </View>
    </View>
  );
}

const faceStyles = StyleSheet.create({
  capture: { borderRadius: 24, overflow: 'hidden' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', paddingHorizontal: '8%', paddingTop: '6%' },
  brand: { fontFamily: fonts.displayMedium, letterSpacing: 2, textAlign: 'center' },
  date: { fontFamily: fonts.displayItalic, marginTop: 4, textAlign: 'center' },
  name: { fontFamily: fonts.display, fontWeight: '400', letterSpacing: 0.5, textAlign: 'center' },
  nameAccent: { fontFamily: fonts.displayItalic },
  subtitle: { fontFamily: fonts.displayItalic, marginTop: 6, textAlign: 'center' },
  affirmation: { fontFamily: fonts.displayItalic, textAlign: 'center', lineHeight: 20 },
  watermark: { fontFamily: fonts.body, letterSpacing: 1 },
  tagline: { fontFamily: fonts.displayItalic, marginTop: 2, textAlign: 'center', opacity: 0.7 },
});
