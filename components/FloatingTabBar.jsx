import { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors } from '../constants/theme';
import { useUiStore } from '../store/uiStore';

const ICONS = {
  dashboard: 'home',
  affirmations: 'sparkles',
  stories: 'book',
  'vision-board': 'images',
  more: 'grid',
  profile: 'person',
};

// A fully custom tab bar (passed via <Tabs tabBar={...}>) is entirely
// responsible for its own container styling -- React Navigation only
// applies `tabBarStyle` from screenOptions to its OWN built-in bar
// renderer, never to a custom one, so the floating-pill position/size/
// background/shadow all have to live here now (they used to sit in
// app/(tabs)/_layout.jsx's tabBarStyle, which silently stopped doing
// anything the moment a custom tabBar was introduced -- that's what
// collapsed the pill into a full-height sliver instead of a small
// floating bar).
//
// What renders inside the pill: a frosted "liquid glass" indicator that
// slides (spring animation) to sit behind whichever tab is active,
// matching iOS 18's tab bar behaviour (tap a tab and the glass pill
// glides over to it, rather than just an icon colour flipping instantly).
export default function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const tabBarHidden = useUiStore((s) => s.tabBarHidden);
  const [barWidth, setBarWidth] = useState(0);
  // Filtering on descriptors[r.key].options.href doesn't actually work
  // here -- expo-router's `href: null` (used on the mindmovie/subliminal
  // Tabs.Screen entries in _layout.jsx to hide them from the bar while
  // keeping them reachable as screens) isn't exposed on `options.href` to
  // a fully custom `tabBar` render prop the way it is to expo-router's own
  // default bar, so that filter silently matched everything and both
  // screens showed up as tab buttons anyway. ICONS only lists the 6 real
  // tabs, so filtering on that instead is the reliable signal.
  const routes = state.routes.filter((r) => Boolean(ICONS[r.name]));
  const slot = routes.length ? barWidth / routes.length : 0;

  const indicatorX = useSharedValue(0);
  const activeIndexAmongVisible = routes.findIndex((r) => r.key === state.routes[state.index]?.key);

  useEffect(() => {
    if (slot > 0 && activeIndexAmongVisible >= 0) {
      indicatorX.value = withSpring(activeIndexAmongVisible * slot, { damping: 18, stiffness: 220, mass: 0.6 });
    }
  }, [activeIndexAmongVisible, slot]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: slot,
  }));

  if (tabBarHidden) return null;

  return (
    <View style={[styles.pill, { bottom: 22 + Math.max(0, insets.bottom - 12) }]}>
      {/* borderRadius set directly on the BlurView, not just relying on
          the parent's overflow:hidden -- on iOS, BlurView clipped only by
          an ancestor's overflow can render past the intended rounded
          corners depending on RN/Expo version, which reads as "not
          actually glassy" even when the blur itself is working. */}
      <BlurView intensity={80} tint="extraLight" style={[StyleSheet.absoluteFill, { borderRadius: 31 }]} />
      <View style={styles.pillTint} pointerEvents="none" />
      <View style={styles.row} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
        {barWidth > 0 && (
          <Animated.View style={[styles.indicatorWrap, indicatorStyle]} pointerEvents="none">
            <BlurView intensity={55} tint="light" style={styles.indicator}>
              <View style={styles.indicatorTint} />
            </BlurView>
          </Animated.View>
        )}

        {routes.map((route) => {
          const isFocused = state.routes[state.index]?.key === route.key;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity key={route.key} onPress={onPress} activeOpacity={0.7} style={styles.item}>
              <Ionicons
                name={ICONS[route.name] || 'ellipse'}
                size={isFocused ? 25 : 23}
                color={isFocused ? colors.pinkDark : 'rgba(200,88,120,0.45)'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: 'rgba(248,184,200,0.35)',
    shadowColor: '#7a5080',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 10,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  // A light translucent wash over the BlurView -- true frosted glass
  // (blurred content showing through) rather than a flat near-opaque
  // background colour, matching GlassCard's own glass treatment.
  pillTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.16)' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  indicatorWrap: { position: 'absolute', top: 6, bottom: 6, left: 0 },
  indicator: { flex: 1, borderRadius: 22, overflow: 'hidden', marginHorizontal: 4 },
  indicatorTint: { flex: 1, backgroundColor: 'rgba(232,152,184,0.22)' },
});
