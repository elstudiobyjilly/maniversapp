// theme.js — the app's single source of design truth.
// Ported directly from the website's tokens.css ("Blush Reverie" theme:
// pink 30% / purple 20% / white 50%). Every screen should pull colors,
// radii, and shadows from here instead of hardcoding hex values, so the
// app always matches the website's brand instead of drifting screen by
// screen.

export const colors = {
  // Brand surfaces
  rose: '#fff0f4',
  lilac: '#f4eeff',
  blush: '#ffe0ee',
  white: '#fdfbfe',

  // Pink scale
  pinkLight: '#ffd1e8',
  pinkMid: '#f8b8c8',
  pinkAccent: '#e898b8',
  pinkDark: '#c85878',
  pinkDeep: '#a03858',

  // Purple scale
  purpleLight: '#e8d8f0',
  purpleMid: '#c9a8c9',
  purpleAccent: '#a878b8',
  purpleDeep: '#b888b8',
  purpleDark: '#7a5080',

  // Text
  ink: '#1e1220',
  ink2: '#3a2040',
  mist: '#7a5870',
  mist2: '#a888a0',

  // Semantic
  success: '#5a9e84',
  successBg: '#7dbfa4',
  danger: '#c06868',
  dangerBg: 'rgba(220,80,80,0.1)',
  dangerBorder: 'rgba(220,80,80,0.25)',
  gold: '#c8a040',
  goldDeep: '#7a5000',
  goldTint: '#fdf5e0',
};

// Gradients — RN doesn't do CSS gradients on plain Views, so these are
// meant for <LinearGradient colors={gradients.primary}> from
// expo-linear-gradient (already a transitive Expo dependency).
export const gradients = {
  // Primary buttons, active tabs, nav highlights
  primary: ['#f7a8c4', '#c9a8c9'],
  primaryHover: ['#f8b8c8', '#a878b8'],
  // Most prominent CTA (matches website's --btn-cta-bg)
  cta: ['#f8b8c8', '#a878b8'],
  // Page background bloom (top-left pink -> bottom-right purple, approximation
  // of the radial-gradient soup in --grad-bg since RN can't do radials on
  // a plain background easily — GradientBackground.jsx recreates this).
  background: ['#fff0f4', '#fdfbfe', '#f4eeff'],
  avatar: ['#fbd0df', '#a878b8'],
  progress: ['#fbd0df', '#a878b8'],
  gold: ['#e8c060', '#c8a040'],
};

export const radii = {
  sm: 14,
  md: 20,
  lg: 28,
  xl: 36,
  pill: 999,
};

// Shadows — RN shadow props differ per-platform; these objects spread
// directly onto a View's style. Android needs `elevation`; iOS reads
// shadowColor/Offset/Opacity/Radius.
export const shadows = {
  card: {
    shadowColor: '#c878b4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 4,
  },
  cardSm: {
    shadowColor: '#c878b4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 2,
  },
  button: {
    shadowColor: '#a878b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonHover: {
    shadowColor: '#fe9fc8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 6,
  },
};

// Typography — Cormorant Garamond (serif display, italic accents) + DM
// Sans (body/UI), exactly matching the website. Load via
// @expo-google-fonts/cormorant-garamond and @expo-google-fonts/dm-sans
// (see App root _layout.jsx useFonts call).
export const fonts = {
  display: 'CormorantGaramond_400Regular',
  displayItalic: 'CormorantGaramond_400Regular_Italic',
  displayMedium: 'CormorantGaramond_500Medium',
  displaySemiBold: 'CormorantGaramond_600SemiBold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
};

export const type = {
  h1: { fontFamily: fonts.display, fontSize: 30, color: colors.ink, fontWeight: '400' },
  h2: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, fontWeight: '400' },
  h3: { fontFamily: fonts.displayMedium, fontSize: 18, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  bodyMuted: { fontFamily: fonts.body, fontSize: 13, color: colors.mist },
  label: { fontFamily: fonts.bodyMedium, fontSize: 10.5, color: colors.purpleDark, letterSpacing: 0.8, textTransform: 'uppercase' },
  button: { fontFamily: fonts.bodyMedium, fontSize: 14, color: '#fff' },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
