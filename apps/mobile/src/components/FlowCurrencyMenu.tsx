import { Button, HStack, Image, Menu, Text } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  background,
  buttonStyle,
  clipShape,
  font,
  foregroundStyle,
  frame,
  padding,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';

import { colors, componentTokens, screenTokens, typography } from '@/theme';

interface FlowCurrencyMenuProps<Option extends string> {
  accessibilityName: string;
  onChange: (option: Option) => void;
  options: readonly Option[];
  value: Option;
}

/** Native currency intent selector shared by money-movement amount steps. */
export function FlowCurrencyMenu<Option extends string>({
  accessibilityName,
  onChange,
  options,
  value,
}: FlowCurrencyMenuProps<Option>) {
  return (
    <Menu
      label={
        <HStack
          alignment="center"
          spacing={6}
          modifiers={[
            padding({ horizontal: 12 }),
            frame({ height: screenTokens.paymentFlow.currencyHeight }),
            background(
              colors.surface,
              shapes.roundedRectangle({ cornerRadius: componentTokens.surface.controlRadius }),
            ),
            clipShape('roundedRectangle', componentTokens.surface.controlRadius),
            strokeBorder({
              content: colors.borderStrong,
              style: { lineWidth: componentTokens.surface.borderWidth },
              shape: 'roundedRectangle',
              cornerRadius: componentTokens.surface.controlRadius,
            }),
          ]}
        >
          <Text
            modifiers={[
              font({ size: typography.caption, weight: 'semibold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {value}
          </Text>
          <Image systemName="chevron.down" size={10} color={colors.textSecondary} />
        </HStack>
      }
      modifiers={[
        buttonStyle('plain'),
        accessibilityLabel(`${accessibilityName}, ${value}`),
      ]}
    >
      {options.map((option) => (
        <Button
          key={option}
          label={option}
          systemImage={option === value ? 'checkmark' : undefined}
          onPress={() => onChange(option)}
        />
      ))}
    </Menu>
  );
}
