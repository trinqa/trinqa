import { StyleSheet, View } from 'react-native';
import { Button, Host, ScrollView, Text, VStack } from '@expo/ui/swift-ui';
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
import { colors, radius, spacing, typography } from '@/theme';

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
            modifiers={[padding({ horizontal: spacing.screenHorizontal })]}
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

            <VStack
              spacing={14}
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

              <VStack spacing={10} alignment="leading">
                <InfoRow label="Current strategy" value={earnSummary.strategy} />
                <InfoRow
                  label="Estimated APY"
                  value={earnSummary.estimatedApy}
                />
                <InfoRow label="Risk" value={earnSummary.risk} />
              </VStack>

              <View style={styles.progressTrack}>
                <View style={styles.progressFill} />
              </View>

              <Button
                label="Manage allocation"
                // TODO: Open native BottomSheet when strategy reference is approved.
                onPress={() => undefined}
              />
            </VStack>

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Host matchContents>
      <VStack spacing={2} alignment="leading">
        <Text
          modifiers={[
            font({ size: typography.caption }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {label}
        </Text>
        <Text
          modifiers={[
            font({ size: typography.body, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          {value}
        </Text>
      </VStack>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentMuted,
    overflow: 'hidden',
  },
  progressFill: {
    width: '62%',
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
});
