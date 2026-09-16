import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Host, HStack, Picker, ScrollView, Text, VStack } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  padding,
  pickerStyle,
  tag,
} from '@expo/ui/swift-ui/modifiers';

import { LineChart } from '@/components/LineChart';
import { MetricCard } from '@/components/MetricCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TransactionRow } from '@/components/TransactionRow';
import {
  activityChartPoints,
  activityEarnings,
  activityHeadline,
  activityMetrics,
  activityPayments,
} from '@/data/mocks/activity';
import { cardShadow, colors, radius, spacing, typography } from '@/theme';
import type { ActivitySegment } from '@/types';

export function ActivityScreen() {
  const [segment, setSegment] = useState<ActivitySegment>('payments');
  const listItems =
    segment === 'payments' ? activityPayments : activityEarnings;

  return (
    <ScreenContainer>
      <Host style={styles.host}>
        <ScrollView>
          <VStack
            spacing={spacing.sectionGap}
            alignment="leading"
            modifiers={[
              padding({
                horizontal: spacing.screenHorizontal,
                top: spacing.headerTop,
                bottom: spacing.scrollBottom,
              }),
            ]}
          >
            <ScreenHeader showBack title="Activity" showMenu />

            <VStack spacing={8} alignment="leading">
              <Text
                modifiers={[
                  font({ size: typography.caption }),
                  foregroundStyle(colors.textSecondary),
                ]}
              >
                {activityHeadline.label}
              </Text>
              <Text
                modifiers={[
                  font({ size: typography.balanceHero, weight: 'bold' }),
                  foregroundStyle(colors.textPrimary),
                ]}
              >
                {activityHeadline.value}
              </Text>
            </VStack>

            <View style={[styles.chartCard, cardShadow]}>
              <LineChart points={activityChartPoints} height={160} />
            </View>

            <HStack spacing={10}>
              {activityMetrics.map((metric) => (
                <MetricCard
                  key={metric.id}
                  label={metric.label}
                  value={metric.value}
                />
              ))}
            </HStack>

            <Host matchContents>
              <Picker
                selection={segment}
                onSelectionChange={(value) =>
                  setSegment(value as ActivitySegment)
                }
                modifiers={[pickerStyle('segmented')]}
              >
                <Text modifiers={[tag('payments')]}>Payments</Text>
                <Text modifiers={[tag('earnings')]}>Earnings</Text>
              </Picker>
            </Host>

            <VStack spacing={spacing.sm} alignment="leading">
              {listItems.map((item) => (
                <TransactionRow
                  key={item.id}
                  title={item.title}
                  subtitle={item.subtitle}
                  amount={item.amount}
                />
              ))}
            </VStack>
          </VStack>
        </ScrollView>
      </Host>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
});
