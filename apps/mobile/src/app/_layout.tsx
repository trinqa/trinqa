import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors, motion } from '@/theme';

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
        <Stack.Screen name="onboarding" options={{ animation: motion.navigation.onboarding }} />
        {/* Pulled down from Home, so it comes back up from the bottom and keeps Home behind it. */}
        <Stack.Screen
          name="portfolio"
          options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true }}
        />
        <Stack.Screen name="receive" options={{ animation: motion.navigation.flowPush, gestureEnabled: true }} />
        <Stack.Screen name="account-details" options={{ animation: motion.navigation.flowPush, gestureEnabled: true }} />
        <Stack.Screen name="settings" options={{ animation: motion.navigation.flowPush, gestureEnabled: true }} />
        <Stack.Screen name="anchors" options={{ animation: motion.navigation.flowPush, gestureEnabled: true }} />
        <Stack.Screen
          name="add-money"
          options={{
            animation: motion.navigation.flowPush,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="put-to-work"
          options={{
            animation: motion.navigation.flowPush,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="send-money"
          options={{
            animation: motion.navigation.flowPush,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="withdraw"
          options={{
            animation: motion.navigation.flowPush,
            gestureEnabled: true,
          }}
        />
      </Stack>
    </>
  );
}
