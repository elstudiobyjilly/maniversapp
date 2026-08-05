import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ToolsLayout() {
  const router = useRouter();

  const BackButton = () => (
    <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
      <Ionicons name="chevron-back" size={26} color="#2e2530" />
    </TouchableOpacity>
  );

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fdf2f8' },
        headerTintColor: '#2e2530',
        headerTitleStyle: { fontWeight: '500' },
        headerShadowVisible: false,
        headerLeft: () => <BackButton />,
      }}
    >
      <Stack.Screen name="gratitude" options={{ title: 'Gratitude' }} />
      <Stack.Screen name="beliefs" options={{ title: 'Limiting Beliefs' }} />
      <Stack.Screen name="letgo" options={{ title: 'Let Go' }} />
      <Stack.Screen name="futureself" options={{ title: 'Future Self' }} />
      <Stack.Screen name="scripting" options={{ title: 'Scripting' }} />
      <Stack.Screen name="manifested" options={{ title: 'Manifested' }} />
      <Stack.Screen name="desire-action" options={{ title: 'Desire Action' }} />
      <Stack.Screen name="community" options={{ title: '', headerTransparent: true }} />
      <Stack.Screen name="discover" options={{ title: '', headerTransparent: true }} />
      <Stack.Screen name="feelit" options={{ title: 'Feel It' }} />
      <Stack.Screen name="meditate" options={{ title: '', headerTransparent: true }} />
      <Stack.Screen name="aura-card" options={{ title: 'Aura Card' }} />
      <Stack.Screen name="practice" options={{ title: '', headerTransparent: true }} />
      <Stack.Screen name="desire-hub" options={{ title: 'My Desire Hub' }} />
      <Stack.Screen name="desire/[id]" options={{ title: '' }} />
      <Stack.Screen name="daily" options={{ title: 'Daily' }} />
      <Stack.Screen name="tracker" options={{ title: 'Tracker' }} />
      <Stack.Screen name="reps" options={{ title: 'Reps' }} />
      <Stack.Screen name="techniques" options={{ title: 'Techniques' }} />
    </Stack>
  );
}

  