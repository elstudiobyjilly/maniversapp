// QuickNavFab.jsx — a collapsed circular "quick nav" button for screens
// that otherwise have zero way back to the main tabs except the back
// button (currently: every tool screen under app/(tools)). Tap to pop
// open a short stack of destination bubbles; tap again (or the backdrop)
// to collapse. Trial scoped to tool screens only, per explicit request —
// not wired into the 5 main tabs, which already have the full
// FloatingTabBar.
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { colors } from '../constants/theme';

// Exactly the 5 destinations named in the request (Home/Dashboard
// deliberately left out — every tool screen already has a back button
// that leads there).
const ITEMS = [
  { route: '/affirmations', icon: 'sparkles', label: 'Affirm' },
  { route: '/stories', icon: 'book', label: 'Stories' },
  { route: '/vision-board', icon: 'images', label: 'Vision' },
  { route: '/more', icon: 'grid', label: 'More' },
  { route: '/profile', icon: 'person', label: 'Profile' },
];

function FabItem({ item, index, progress, open, onPress }) {
  const style = useAnimatedStyle(() => {
    const spacing = 58;
    return {
      opacity: progress.value,
      transform: [
        { translateY: -progress.value * spacing * (index + 1) },
        { scale: 0.6 + progress.value * 0.4 },
      ],
    };
  });
  // pointerEvents is a plain prop, not an animated style -- it has to key
  // off the React `open` state (re-renders when it flips) rather than the
  // reanimated shared value (which only lives on the UI thread and would
  // never actually re-trigger this prop update).
  return (
    <Animated.View style={[styles.itemWrap, style]} pointerEvents={open ? 'auto' : 'none'}>
      <TouchableOpacity style={styles.itemBtn} activeOpacity={0.8} onPress={() => onPress(item.route)}>
        <BlurView intensity={45} tint="light" style={styles.itemBlur}>
          <Ionicons name={item.icon} size={18} color={colors.purpleDark} />
        </BlurView>
      </TouchableOpacity>
      <View style={styles.itemLabelWrap}>
        <Text style={styles.itemLabelText}>{item.label}</Text>
      </View>
    </Animated.View>
  );
}

export default function QuickNavFab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const progress = useSharedValue(0);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    progress.value = next ? withSpring(1, { damping: 16, stiffness: 220 }) : withTiming(0, { duration: 160 });
  };

  const navigate = (route) => {
    toggle();
    if (pathname !== route) router.push(route);
  };

  const mainIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 45}deg` }],
  }));

  return (
    <View style={[styles.root, { bottom: insets.bottom + 18 }]} pointerEvents="box-none">
      {open && <Pressable style={StyleSheet.absoluteFill} onPress={toggle} />}

      {ITEMS.map((item, i) => (
        <FabItem key={item.route} item={item} index={i} progress={progress} open={open} onPress={navigate} />
      ))}

      <TouchableOpacity activeOpacity={0.85} onPress={toggle}>
        <BlurView intensity={55} tint="light" style={styles.fabBlur}>
          <Animated.View style={mainIconStyle}>
            <Ionicons name="add" size={24} color={colors.purpleDark} />
          </Animated.View>
        </BlurView>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', right: 20, alignItems: 'center', zIndex: 20 },
  fabBlur: {
    width: 52, height: 52, borderRadius: 26, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 6,
  },
  itemWrap: { position: 'absolute', bottom: 6, alignItems: 'center' },
  itemBtn: {},
  itemBlur: {
    width: 42, height: 42, borderRadius: 21, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  itemLabelWrap: { marginTop: 3, backgroundColor: 'rgba(46,37,48,0.7)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  itemLabelText: { fontSize: 9.5, color: '#fff', fontWeight: '600' },
});
