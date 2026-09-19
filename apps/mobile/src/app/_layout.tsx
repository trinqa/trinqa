import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="receive" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
        <Stack.Screen name="account-details" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
        <Stack.Screen
          name="add-money"
          options={{
            animation: 'slide_from_right',
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="put-to-work"
          options={{
            animation: 'slide_from_right',
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="send-money"
          options={{
            animation: 'slide_from_right',
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="withdraw"
          options={{
            animation: 'slide_from_right',
            gestureEnabled: true,
          }}
        />
      </Stack>
    </>
  );
}
