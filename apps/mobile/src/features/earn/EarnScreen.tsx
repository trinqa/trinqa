import { StyleSheet, View } from 'react-native';
import { Button, Host, HStack, ScrollView, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';

import { BalanceSummary } from '@/components/BalanceSummary';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { TransactionRow } from '@/components/TransactionRow';
import { earnActivity, earnSummary } from '@/data/mocks/earn';
import { cardShadow, colors, radius, spacing, typography } from '@/theme';

export function EarnScreen() {
  const todayItems = earnActivity.filter((item) => item.group === 'today');
  const yesterdayItems = earnActivity.filter(
    (item) => item.group === 'yesterday',
  );

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
            <ScreenHeader />

            <BalanceSummary
              totalLabel="Total Balance"
              totalValue={earnSummary.totalBalance}
              leftLabel="Available"
              leftValue={earnSummary.available}
              rightLabel="Earning"
              rightValue={earnSummary.earning}
            />

            <View style={[styles.strategyCard, cardShadow]}>
              <Host matchContents>
                <VStack
                  spacing={16}
                  alignment="leading"
                  modifiers={[
                    background(colors.surface),
                    cornerRadius(radius.xl),
                    padding({ all: spacing.cardPadding }),
                  ]}
                >
                  <Text
                    modifiers={[
                      font({ size: typography.sectionTitle, weight: 'semibold' }),
                      foregroundStyle(colors.textPrimary),
                    ]}
                  >
                    Earning Balance
                  </Text>

                  <HStack alignment="center">
                    <Text
                      modifiers={[
                        font({ size: typography.caption }),
                        foregroundStyle(colors.textSecondary),
                        frame({ maxWidth: Infinity }),
                      ]}
                    >
                      Current strategy
                    </Text>
                    <Text
                      modifiers={[
                        font({ size: typography.body, weight: 'semibold' }),
                        foregroundStyle(colors.textPrimary),
                      ]}
                    >
                      {earnSummary.strategy}
                    </Text>
                  </HStack>

                  <HStack alignment="center">
                    <Text
                      modifiers={[
                        font({ size: typography.caption }),
                        foregroundStyle(colors.textSecondary),
                        frame({ maxWidth: Infinity }),
                      ]}
                    >
                      Estimated APY
                    </Text>
                    <Text
                      modifiers={[
                        font({ size: typography.body, weight: 'semibold' }),
                        foregroundStyle(colors.textPrimary),
                      ]}
                    >
                      {earnSummary.estimatedApy}
                    </Text>
                  </HStack>

                  <HStack alignment="center">
                    <Text
                      modifiers={[
                        font({ size: typography.caption }),
                        foregroundStyle(colors.textSecondary),
                        frame({ maxWidth: Infinity }),
                      ]}
                    >
                      Risk
                    </Text>
                    <Text
                      modifiers={[
                        font({ size: typography.body, weight: 'semibold' }),
                        foregroundStyle(colors.textPrimary),
                      ]}
                    >
                      {earnSummary.risk}
                    </Text>
                  </HStack>

                  <View style={styles.progressTrack}>
                    <View style={styles.progressFill} />
                    <View style={styles.progressRemainder} />
                  </View>

                  <Button
                    label="Manage allocation"
                    // TODO: Open native BottomSheet when strategy reference is approved.
                    onPress={() => undefined}
                  />
                </VStack>
              </Host>
            </View>

            <VStack spacing={spacing.md} alignment="leading">
              <SectionHeader title="Transaction" />
              <Text
                modifiers={[
                  font({ size: typography.caption, weight: 'semibold' }),
                  foregroundStyle(colors.textSecondary),
                ]}
              >
                Today
              </Text>
              {todayItems.map((item) => (
                <TransactionRow
                  key={item.id}
                  title={item.title}
                  subtitle={item.time}
                  amount={item.amount}
                />
              ))}

              <Text
                modifiers={[
                  font({ size: typography.caption, weight: 'semibold' }),
                  foregroundStyle(colors.textSecondary),
                  padding({ top: 8 }),
                ]}
              >
                Yesterday
              </Text>
              {yesterdayItems.map((item) => (
                <TransactionRow
                  key={item.id}
                  title={item.title}
                  subtitle={item.time}
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
  strategyCard: {
    borderRadius: radius.xl,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: colors.accentMuted,
  },
  progressFill: {
    width: '62%',
    height: '100%',
    backgroundColor: colors.accent,
  },
  progressRemainder: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.accentMuted,
  },
});
