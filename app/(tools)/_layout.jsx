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
      <Stack.Screen name="oracle" options={{ title: 'Oracle' }} />
      <Stack.Screen name="gratitude" options={{ title: 'Gratitude' }} />
      <Stack.Screen name="beliefs" options={{ title: 'Limiting Beliefs' }} />
      <Stack.Screen name="letgo" options={{ title: 'Let Go' }} />
      <Stack.Screen name="futureself" options={{ title: 'Future Self' }} />
      <Stack.Screen name="identity" options={{ title: 'Identity' }} />
      <Stack.Screen name="roadmap" options={{ title: 'Roadmap' }} />
      <Stack.Screen name="scripting" options={{ title: 'Scripting' }} />
      <Stack.Screen name="reps" options={{ title: 'Reps' }} />
      <Stack.Screen name="tracker" options={{ title: 'Habit Tracker' }} />
      <Stack.Screen name="manifested" options={{ title: 'Manifested' }} />
      <Stack.Screen name="desire-action" options={{ title: 'Desire Action' }} />
      <Stack.Screen name="synclog" options={{ title: 'Synchronicity Log' }} />
      <Stack.Screen name="journal" options={{ title: 'Journal' }} />
      <Stack.Screen name="abundance-cheque" options={{ title: 'Abundance Cheque' }} />
      <Stack.Screen name="daily-intention" options={{ title: 'Daily Intention' }} />
      <Stack.Screen name="horoscope" options={{ title: 'Horoscope' }} />
      <Stack.Screen name="community" options={{ title: '', headerTransparent: true }} />
      <Stack.Screen name="discover" options={{ title: '', headerTransparent: true }} />
      <Stack.Screen name="reviews" options={{ title: 'Reviews' }} />
      <Stack.Screen name="feelit" options={{ title: 'Feel It' }} />
      <Stack.Screen name="methods" options={{ title: '', headerTransparent: true }} />
      <Stack.Screen name="meditate" options={{ title: '', headerTransparent: true }} />
      <Stack.Screen name="aura-card" options={{ title: 'Aura Card' }} />
      <Stack.Screen name="practice-tools" options={{ title: 'Practice Tools' }} />
    </Stack>
  );
}

  