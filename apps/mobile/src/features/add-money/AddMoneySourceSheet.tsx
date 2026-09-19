import { useState } from 'react';

import { BottomSheet, Button, Group, HStack, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  background,
  buttonStyle,
  clipShape,
  font,
  foregroundStyle,
  frame,
  padding,
  presentationBackground,
  presentationDetents,
  presentationDragIndicator,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';

import { SecondaryActionButton } from '@/components/FlowControls';
import { addMoneySources } from '@/data/mocks/addMoney';
import { colors, componentTokens, screenTokens, typography } from '@/theme';
import type { AddMoneySourceId, AddMoneySourceOption } from '@/types';

interface AddMoneySourceSheetProps {
  anchor: React.ReactElement;
}

function SourceSelectionRow({
  option,
  onPress,
}: {
  option: AddMoneySourceOption;
  onPress: () => void;
}) {
  const row = componentTokens.selectionRow;

  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        accessibilityLabel(`${option.title}. ${option.subtitle}`),
        frame({ width: screenTokens.addMoney.contentWidth, height: row.height }),
        background(colors.surface, shapes.roundedRectangle({ cornerRadius: row.radius })),
        clipShape('roundedRectangle', row.radius),
        strokeBorder({
          content: colors.borderStrong,
          style: { lineWidth: componentTokens.surface.borderWidth },
          shape: 'roundedRectangle',
          cornerRadius: row.radius,
        }),
      ]}
    >
      <HStack
        alignment="center"
        spacing={row.contentGap}
        modifiers={[
          padding({ horizontal: row.horizontalPadding }),
          frame({ width: screenTokens.addMoney.contentWidth, height: row.height }),
        ]}
      >
        <ZStack
          modifiers={[
            frame({ width: row.iconSize, height: row.iconSize }),
            background(colors.surfaceLayer, shapes.circle()),
          ]}
        >
          <Image systemName={option.symbol} size={row.symbolSize} color={colors.textPrimary} />
        </ZStack>

        <VStack alignment="leading" spacing={3} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <Text modifiers={[font({ size: typography.body, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
            {option.title}
          </Text>
          <Text modifiers={[font({ size: typography.footnote }), foregroundStyle(colors.textSecondary)]}>
            {option.subtitle}
          </Text>
        </VStack>

        <Spacer />
        <Image systemName="chevron.right" size={12} color={colors.textPrimary} />
      </HStack>
    </Button>
  );
}

export function AddMoneySourceSheet({ anchor }: AddMoneySourceSheetProps) {
  const router = useRouter();
  const [isPresented, setIsPresented] = useState(false);
  const [pendingSource, setPendingSource] = useState<AddMoneySourceId | null>(null);

  const selectSource = (source: AddMoneySourceId) => {
    setPendingSource(source);
    setIsPresented(false);
  };

  const handleDismiss = () => {
    if (!pendingSource) return;

    if (pendingSource === 'receive') router.push('/receive');
    else router.push({ pathname: '/add-money', params: { source: pendingSource } });
    setPendingSource(null);
  };

  return (
    <BottomSheet
      isPresented={isPresented}
      onIsPresentedChange={setIsPresented}
      onDismiss={handleDismiss}
      anchor={
        <Button
          onPress={() => setIsPresented(true)}
          modifiers={[buttonStyle('plain'), accessibilityLabel('Add Money')]}
        >
          {anchor}
        </Button>
      }
    >
      <Group
        modifiers={[
          presentationDetents([{ height: screenTokens.addMoney.sheetHeight }]),
          presentationDragIndicator('visible'),
          presentationBackground(colors.surface),
        ]}
      >
        <VStack
          alignment="leading"
          spacing={12}
          modifiers={[padding({ top: 18, bottom: 14, horizontal: 18 })]}
        >
          <VStack alignment="leading" spacing={4}>
            <Text modifiers={[font({ size: typography.sectionTitle, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
              Add Money
            </Text>
            <Text modifiers={[font({ size: typography.footnote }), foregroundStyle(colors.textSecondary)]}>
              Choose where your money is coming from.
            </Text>
          </VStack>

          <VStack alignment="leading" spacing={8}>
            {addMoneySources.map((option) => (
              <SourceSelectionRow
                key={option.id}
                option={option}
                onPress={() => selectSource(option.id)}
              />
            ))}
          </VStack>

          <SecondaryActionButton label="Cancel" onPress={() => setIsPresented(false)} />
        </VStack>
      </Group>
    </BottomSheet>
  );
}
