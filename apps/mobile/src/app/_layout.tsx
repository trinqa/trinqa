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
        {/*
          A whole page, not a sheet: Home is replaced rather than covered, and the tab
          bar goes with it, which is what makes Portfolio read as a different mode.
          The transition is a fade because the pull is downward and react-native-screens
          has no slide_from_top — sliding up from the bottom would fight the gesture.
        */}
        <Stack.Screen
          name="portfolio"
          options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }}
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
