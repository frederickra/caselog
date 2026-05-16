import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="edit/[id]"
        options={{ title: 'Edit Case', presentation: 'modal', headerStyle: { backgroundColor: '#ffffff' } }}
      />
    </Stack>
  );
}
