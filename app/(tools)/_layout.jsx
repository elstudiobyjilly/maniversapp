import { Stack, useRouter } from 'expo-router';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import QuickNavFab from '../../components/QuickNavFab';

// Small frosted-glass back button -- floats over the content via
// headerTransparent (doesn't reserve header height / push content down,
// so screens' own in-content titles don't need to move), for when the
// OS edge-swipe-back gesture isn't available or is awkward to use:
// iPad/Android split-screen, external displays, the Mac Catalyst build,
// etc. Deliberately subtle (low-opacity glass, no solid background,
// small) rather than a prominent button -- "there but not shouting".
function BackButton() {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.back()} hitSlop={10} activeOpacity={0.7}>
      <BlurView intensity={35} tint="light" style={styles.backBtn}>
        <Ionicons name="chevron-back" size={17} color="rgba(46,37,48,0.6)" />
      </BlurView>
    </TouchableOpacity>
  );
}

export default function ToolsLayout() {
  return (
    <View style={{ flex: 1 }}>
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerTitle: '',
        headerShadowVisible: false,
        headerLeft: () => <BackButton />,
        // Edge-swipe-back still works on phones (this used to also set
        // fullScreenGestureEnabled: true, which installed a pan gesture
        // recognizer across the ENTIRE screen and ended up contesting taps
        // on write boxes right as the keyboard tried to open -- removed
        // for that reason, see prior commit). The BackButton above covers
        // the cases swipe-back can't reach: iPad/Android split-screen,
        // external displays, Mac Catalyst, etc.
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="gratitude" options={{ title: 'Gratitude' }} />
      <Stack.Screen name="beliefs" options={{ title: 'Limiting Beliefs' }} />
      <Stack.Screen name="letgo" options={{ title: 'Let Go' }} />
      <Stack.Screen name="futureself" options={{ title: 'Future Self' }} />
      <Stack.Screen name="scripting" options={{ title: 'Scripting' }} />
      <Stack.Screen name="manifested" options={{ title: 'Manifested' }} />
      <Stack.Screen name="desire-action" options={{ title: 'Desire Action' }} />
      <Stack.Screen name="community" options={{ title: '' }} />
      <Stack.Screen name="discover" options={{ title: '' }} />
      <Stack.Screen name="feelit" options={{ title: 'Feel It' }} />
      <Stack.Screen name="meditate" options={{ title: '' }} />
      <Stack.Screen name="aura-card" options={{ title: 'Aura Card' }} />
      <Stack.Screen name="practice" options={{ title: '' }} />
      <Stack.Screen name="desire-hub" options={{ title: 'My Desire Hub' }} />
      <Stack.Screen name="desire/[id]" options={{ title: '' }} />
      <Stack.Screen name="daily" options={{ title: 'Daily' }} />
      <Stack.Screen name="tracker" options={{ title: 'Tracker' }} />
      <Stack.Screen name="reps" options={{ title: 'Reps' }} />
      <Stack.Screen name="techniques" options={{ title: 'Techniques' }} />
    </Stack>
    {/* Trial: collapsed circular quick-nav, scoped to tool screens only
        (per explicit request) -- these are the only screens with zero way
        back to the main tabs besides the back button. Not on the 5 main
        tabs, which already have the full FloatingTabBar. */}
    <QuickNavFab />
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 14,
    marginTop: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
});
