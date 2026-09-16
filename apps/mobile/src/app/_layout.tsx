import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { StatusBar } from 'expo-status-bar';

export default function TabLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'house', selected: 'house.fill' }}
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="pay">
          <NativeTabs.Trigger.Label>Pay</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'arrow.up.circle', selected: 'arrow.up.circle.fill' }}
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="earn">
          <NativeTabs.Trigger.Label>Earn</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{
              default: 'chart.line.uptrend.xyaxis',
              selected: 'chart.line.uptrend.xyaxis',
            }}
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="activity">
          <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  );
}
