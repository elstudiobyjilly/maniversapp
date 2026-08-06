import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

// Matches the website's nav bar tokens (--nav-bg / --nav-border / active =
// purple-mid) instead of generic default-blue tab bar colors.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.purpleDark,
      tabBarInactiveTintColor: colors.mist2,
      // Floating pill nav bar, matching Instagram/WhatsApp's detached
      // rounded bar instead of a flat edge-to-edge strip: pulled off all
      // three edges, fully rounded, icon-only (no label -- that's what
      // keeps a pill this size uncluttered with 6 tabs), soft shadow so
      // it reads as sitting above the content rather than part of it.
      tabBarShowLabel: false,
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
      tabBarItemStyle: { height: 62, justifyContent: 'center' },
    }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }} />
      <Tabs.Screen name="affirmations" options={{ title: 'Affirm', tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" color={color} size={size} /> }} />
      <Tabs.Screen name="stories" options={{ title: 'Stories', tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color} size={size} /> }} />
      {/* Mind Movie & Subliminal moved off the bottom tab bar to cut phone-nav
          clutter — still fully reachable as screens via the More tab's tile/
          list, href:null just removes their tab bar button. */}
      <Tabs.Screen name="mindmovie" options={{ href: null }} />
      <Tabs.Screen name="subliminal" options={{ href: null }} />
      <Tabs.Screen name="vision-board" options={{ title: 'Vision', tabBarIcon: ({ color, size }) => <Ionicons name="images" color={color} size={size} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }} />
    </Tabs>
  );
}
