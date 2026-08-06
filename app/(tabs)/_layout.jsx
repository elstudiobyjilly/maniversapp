import { Tabs } from 'expo-router';
import FloatingTabBar from '../../components/FloatingTabBar';

// Custom tab bar (components/FloatingTabBar.jsx) replaces the built-in
// bottom tab bar entirely -- it renders the sliding "liquid glass"
// indicator behind the active icon (iOS 18 tab bar style: tap a tab and a
// frosted pill glides over to it) and the pink icon colours, matching the
// app's actual pink accent instead of the previous purple. The pill's own
// position/shadow/border still lives in tabBarStyle below; FloatingTabBar
// only renders what's inside it.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: 22,
          height: 62,
          borderRadius: 31,
          backgroundColor: 'rgba(255,251,253,0.97)',
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: 'rgba(248,184,200,0.3)',
          shadowColor: '#7a5080',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.16,
          shadowRadius: 16,
          elevation: 10,
          paddingHorizontal: 6,
        },
      }}
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
