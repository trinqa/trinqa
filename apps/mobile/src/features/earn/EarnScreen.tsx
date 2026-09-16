import {
  Button,
  Divider,
  HStack,
  Image,
  ProgressView,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  background,
  border,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  offset,
  padding,
  progressViewStyle,
  shadow,
  shapes,
  tint,
  type ViewModifier,
} from '@expo/ui/swift-ui/modifiers';

import { BalanceSummary } from '@/components/BalanceSummary';
import { EarnTransactionRow } from '@/components/EarnTransactionRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SwiftUIScreenShell } from '@/components/SwiftUIScreenShell';
import { earnActivity, earnSummary } from '@/data/mocks/earn';
import { colors, typography } from '@/theme';
import { captionTextModifiers, sectionTitleModifiers } from '@/theme/swiftUi';

const REPORT_WIDTH = 366;
const CARD_WIDTH = 396;
const CARD_RADIUS = 15;
const INNER_CARD_RADIUS = 13;

export function EarnScreen() {
  const todayItems = earnActivity.filter((item) => item.group === 'today');
  const yesterdayItems = earnActivity.filter((item) => item.group === 'yesterday');
  const progressValue =
    parseFloat(earnSummary.earning.replace(/,/g, '')) /
    parseFloat(earnSummary.totalBalance.replace(/,/g, ''));

  return (
    <SwiftUIScreenShell sectionGap={0} bottomPadding={180}>
      <ScreenHeader />

      <VStack modifiers={[padding({ top: 18 }), frame({ width: REPORT_WIDTH })]}>
        <BalanceSummary
          totalLabel="Total Balance"
          totalValue={earnSummary.totalBalance}
          leftLabel="Available"
          leftValue={earnSummary.available}
          rightLabel="Earning"
          rightValue={earnSummary.earning}
        />
      </VStack>

      <VStack modifiers={[padding({ top: 15 }), frame({ width: REPORT_WIDTH })]}>
        <EarnAllocationCard progressValue={progressValue} />
      </VStack>

      <VStack alignment="leading" spacing={0} modifiers={[padding({ top: 26 }), frame({ width: REPORT_WIDTH })]}>
        <Text modifiers={sectionTitleModifiers()}>Transaction</Text>

        <EarnDateGroup label="Today" modifiers={[padding({ top: 18 })]} />

        <VStack alignment="leading" spacing={0} modifiers={[padding({ top: 14 })]}>
          {todayItems.map((item, index) => (
            <VStack key={item.id} modifiers={index > 0 ? [padding({ top: 8 })] : []}>
              <EarnTransactionRow
                title={item.title}
                subtitle={item.time}
                amount={item.amount}
              />
            </VStack>
          ))}
        </VStack>

        <EarnDateGroup label="Yesterday" modifiers={[padding({ top: 17 })]} />

        <VStack alignment="leading" spacing={0} modifiers={[padding({ top: 15 })]}>
          {yesterdayItems.map((item) => (
            <EarnTransactionRow
              key={item.id}
              title={item.title}
              subtitle={item.time}
              amount={item.amount}
            />
          ))}
        </VStack>
      </VStack>
    </SwiftUIScreenShell>
  );
}

function EarnAllocationCard({ progressValue }: { progressValue: number }) {
  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[
        padding({ top: 16, bottom: 12, horizontal: 16 }),
        frame({ width: CARD_WIDTH, height: 191 }),
        background(colors.surface, shapes.roundedRectangle({ cornerRadius: CARD_RADIUS })),
        border({ content: colors.border, width: 1 }),
        shadow({ radius: 8, y: 2, color: '#0000000A' }),
        frame({ width: REPORT_WIDTH }),
      ]}
    >
      <Text modifiers={sectionTitleModifiers()}>Earning Balance</Text>

      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[
          padding({ top: 22 }),
          padding({ horizontal: 14 }),
          frame({ width: 362, height: 129 }),
          background(colors.surface, shapes.roundedRectangle({ cornerRadius: INNER_CARD_RADIUS })),
          border({ content: colors.border, width: 1 }),
        ]}
      >
        <VStack alignment="leading" spacing={0} modifiers={[padding({ top: 24 })]}>
          <ProgressView
            value={progressValue}
            modifiers={[
              progressViewStyle('linear'),
              tint(colors.accent),
              frame({ maxWidth: Infinity, height: 8 }),
            ]}
          />
        </VStack>

        <HStack
          alignment="center"
          spacing={8}
          modifiers={[padding({ top: 30 }), frame({ maxWidth: Infinity })]}
        >
          <Text modifiers={[font({ size: 11 }), foregroundStyle(colors.textSecondary)]}>
            {earnSummary.strategy} · {earnSummary.risk}
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 11 }), foregroundStyle(colors.textSecondary)]}>
            ${earnSummary.earningBalance} · {earnSummary.estimatedApy} APY
          </Text>
        </HStack>

        <Button
          onPress={() => undefined}
          modifiers={[
            buttonStyle('plain'),
            padding({ top: 15, horizontal: 12, bottom: 8 }),
            frame({ maxWidth: Infinity, height: 37 }),
            background(colors.surface, shapes.roundedRectangle({ cornerRadius: 10 })),
            offset({ y: 2 }),
          ]}
        >
          <HStack alignment="center" spacing={8} modifiers={[frame({ maxWidth: Infinity })]}>
            <Text modifiers={[font({ size: typography.body, weight: 'medium' }), foregroundStyle(colors.textPrimary)]}>
              Manage allocation
            </Text>
            <Spacer />
            <Image systemName="chevron.right" size={13} color={colors.textSecondary} />
          </HStack>
        </Button>
      </VStack>
    </VStack>
  );
}

function EarnDateGroup({
  label,
  modifiers = [],
}: {
  label: string;
  modifiers?: ViewModifier[];
}) {
  return (
    <HStack
      alignment="center"
      spacing={8}
      modifiers={[frame({ width: REPORT_WIDTH }), ...modifiers]}
    >
      <Text modifiers={captionTextModifiers('semibold')}>{label}</Text>
      <Divider modifiers={[frame({ maxWidth: Infinity })]} />
    </HStack>
  );
}
