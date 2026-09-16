import { StyleSheet } from 'react-native';
import { Host, ScrollView, VStack } from '@expo/ui/swift-ui';
import { padding } from '@expo/ui/swift-ui/modifiers';

import { AccountCardStack } from '@/components/AccountCardStack';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { ShortcutRow } from '@/components/ShortcutRow';
import { TransactionRow } from '@/components/TransactionRow';
import { homeAccountSummary, homeRecentActivity } from '@/data/mocks/home';
import { spacing } from '@/theme';

export function HomeScreen() {
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

            <AccountCardStack account={homeAccountSummary} />

            <ShortcutRow />

            <VStack spacing={spacing.md} alignment="leading">
              <SectionHeader title="Recent" />
              {homeRecentActivity.map((item) => (
                <TransactionRow
                  key={item.id}
                  title={item.title}
                  subtitle={item.subtitle}
                  amount={item.amount}
                  meta={item.date}
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
});
