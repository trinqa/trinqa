import { HomeScreen } from '@/features/home/HomeScreen';
import { Redirect } from 'expo-router';
import { useMockAppState } from '@/state/mockAppState';

export default function HomeRoute() {
  const { accountBootstrap } = useMockAppState();
  if (accountBootstrap !== 'ready') return <Redirect href="/onboarding" />;
  return <HomeScreen />;
}
