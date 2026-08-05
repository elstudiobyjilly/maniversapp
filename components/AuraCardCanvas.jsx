import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Circle, Rect } from 'react-native-svg';
import {
  AURA_STYLES, CENTER_GLOW, STAR_DOTS, familyOn,
} from '../constants/auraCard';
import { fonts } from '../constants/theme';

// A picked custom shade replaces every stop's colour (keeping each stop's
// original opacity/falloff) so the orb keeps its shape but reads as the
// chosen hue instead of the style's baked-in one.
function recolorOrb(orb, shadeOverrides) {
  const hex = shadeOverrides?.[orb.family];
  if (!hex) return orb;
  return { ...orb, stops: orb.stops.map((st) => [st[0], hex, st[2]]) };
}

// ─── SVG composition — shape depends on `pattern`, colours depend on which
// of the 4 colour families are toggled on (and optionally recoloured via
// shadeOverrides: { purple/pink/blue/gold: hex }).
export default function AuraCardSvg({ styleKey, size, pattern, colours, shadeOverrides }) {
  const s = AURA_STYLES[styleKey];
  const baseOrbs = [s.mainOrb, s.orb1, s.orb2].filter((o) => familyOn(o, colours)).map((o) => recolorOrb(o, shadeOverrides));
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
    pattern === 'aura' ? [s.mainOrb].filter((o) => familyOn(o, colours)).map((o) => recolorOrb(o, shadeOverrides))
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
export function AuraCardFace({ styleKey, size, pattern, colours, shadeOverrides, quote, innerRef }) {
  const s = AURA_STYLES[styleKey];
  return (
    <View ref={innerRef} collapsable={false} style={[faceStyles.capture, { width: size, height: size }]}>
      <AuraCardSvg styleKey={styleKey} size={size} pattern={pattern} colours={colours} shadeOverrides={shadeOverrides} />
      <View style={faceStyles.overlay}>
        <Text style={[faceStyles.brand, { color: s.text.name, fontSize: size * 0.045 }]}>MANIVERS</Text>
        <Text style={[faceStyles.date, { color: s.text.subtitle, fontSize: size * 0.026 }]}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <View style={{ flex: 1.6 }} />
        <Text adjustsFontSizeToFit numberOfLines={1} style={[faceStyles.name, { color: s.text.name, fontSize: size * 0.085 }]}>
          Your <Text style={faceStyles.nameAccent}>Aura Card</Text>
        </Text>
        <Text style={[faceStyles.subtitle, { color: s.text.subtitle, fontSize: size * 0.032 }]}>{s.label}</Text>
        <View style={{ flex: 1.4 }} />
        <Text numberOfLines={3} style={[faceStyles.affirmation, { color: s.text.affirmation, fontSize: size * 0.038 }]}>
          "{quote}"
        </Text>
        <View style={{ flex: 0.8 }} />
        <Text style={[faceStyles.watermark, { fontSize: size * 0.03, color: s.text.subtitle }]}>manivers.com</Text>
        <Text style={[faceStyles.tagline, { fontSize: size * 0.024, color: s.text.affirmation }]}>Believe · Receive · Become</Text>
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
