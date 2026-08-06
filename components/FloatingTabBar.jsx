import { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors } from '../constants/theme';

const ICONS = {
  dashboard: 'home',
  affirmations: 'sparkles',
  stories: 'book',
  'vision-board': 'images',
  more: 'grid',
  profile: 'person',
};

// The floating pill itself (position/shadow/border) is still set via
// tabBarStyle in app/(tabs)/_layout.jsx -- this component only renders
// WHAT'S INSIDE it: a frosted "liquid glass" indicator that slides to sit
// behind whichever tab is active, matching iOS 18's tab bar (tap a tab and
// the glass pill glides over to it, rather than just an icon colour
// flipping instantly).
export default function FloatingTabBar({ state, descriptors, navigation }) {
  const [barWidth, setBarWidth] = useState(0);
  const routes = state.routes.filter((r) => descriptors[r.key].options.href !== null);
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

  return (
    <View style={styles.row} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
      {barWidth > 0 && (
        <Animated.View style={[styles.indicatorWrap, indicatorStyle]} pointerEvents="none">
          <BlurView intensity={55} tint="light" style={styles.indicator}>
            <View style={styles.indicatorTint} />
          </BlurView>
        </Animated.View>
      )}

      {routes.map((route) => {
        const { options } = descriptors[route.key];
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
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  indicatorWrap: { position: 'absolute', top: 6, bottom: 6, left: 0 },
  indicator: { flex: 1, borderRadius: 22, overflow: 'hidden', marginHorizontal: 4 },
  indicatorTint: { flex: 1, backgroundColor: 'rgba(232,152,184,0.22)' },
});
