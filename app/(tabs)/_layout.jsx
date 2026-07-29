import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../constants/theme';

// Matches the website's nav bar tokens (--nav-bg / --nav-border / active =
// purple-mid) instead of generic default-blue tab bar colors.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.purpleDark,
      tabBarInactiveTintColor: colors.mist2,
      tabBarStyle: {
        backgroundColor: 'rgba(255,248,251,0.96)',
        borderTopColor: 'rgba(248,184,200,0.28)',
        borderTopWidth: 1,
        height: 64,
        paddingBottom: 8,
        paddingTop: 6,
      },
      tabBarLabelStyle: { fontSize: 9.5, fontFamily: fonts.bodyMedium, marginTop: 1 },
    }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }} />
      <Tabs.Screen name="affirmations" options={{ title: 'Affirm', tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" color={color} size={size} /> }} />
      <Tabs.Screen name="stories" options={{ title: 'Stories', tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color} size={size} /> }} />
      <Tabs.Screen name="mindmovie" options={{ title: 'Movie', tabBarIcon: ({ color, size }) => <Ionicons name="film" color={color} size={size} /> }} />
      <Tabs.Screen name="subliminal" options={{ title: 'Sub', tabBarIcon: ({ color, size }) => <Ionicons name="moon" color={color} size={size} /> }} />
      <Tabs.Screen name="vision-board" options={{ title: 'Vision', tabBarIcon: ({ color, size }) => <Ionicons name="images" color={color} size={size} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }} />
    </Tabs>
  );
}
