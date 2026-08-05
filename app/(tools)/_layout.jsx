import { Stack } from 'expo-router';

export default function ToolsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
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
  );
}

  