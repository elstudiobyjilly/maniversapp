import { Tabs } from 'expo-router';
import FloatingTabBar from '../../components/FloatingTabBar';

// Custom tab bar (components/FloatingTabBar.jsx) replaces the built-in
// bottom tab bar entirely -- it renders the sliding "liquid glass"
// indicator behind the active icon (iOS 18 tab bar style: tap a tab and a
// frosted pill glides over to it) and the pink icon colours, matching the
// app's actual pink accent instead of the previous purple. ALL of the
// pill's own styling (position/size/blur/shadow/border) now lives inside
// FloatingTabBar itself -- `tabBarStyle` here would do nothing, since
// React Navigation only applies it to its own built-in bar renderer, never
// to a custom `tabBar`. (That's exactly what broke this the first time:
// tabBarStyle silently stopped applying the moment a custom tabBar was
// introduced, collapsing the pill into an unstyled full-height sliver.)
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Home' }} />
      <Tabs.Screen name="affirmations" options={{ title: 'Affirm' }} />
      <Tabs.Screen name="stories" options={{ title: 'Stories' }} />
      {/* Mind Movie & Subliminal moved off the bottom tab bar to cut phone-nav
          clutter — still fully reachable as screens via the More tab's tile/
          list, href:null just removes their tab bar button. */}
      <Tabs.Screen name="mindmovie" options={{ href: null }} />
      <Tabs.Screen name="subliminal" options={{ href: null }} />
      <Tabs.Screen name="vision-board" options={{ title: 'Vision' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
