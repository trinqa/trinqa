import { Button, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  background,
  buttonStyle,
  clipShape,
  font,
  foregroundStyle,
  frame,
  disabled,
  opacity,
  padding,
  shapes,
  strokeBorder,
  type ViewModifier,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { colors, componentTokens, screenTokens, typography } from '@/theme';
import { cardChromeModifiers } from '@/theme/swiftUi';

interface FlowButtonProps {
  label: string;
  onPress: () => void;
  isDisabled?: boolean;
}

export function PrimaryActionButton({ label, onPress, isDisabled = false }: FlowButtonProps) {
  const action = componentTokens.actionButton;

  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        disabled(isDisabled),
        opacity(isDisabled ? 0.45 : 1),
        accessibilityLabel(label),
        frame({ width: screenTokens.addMoney.contentWidth, height: action.height }),
        background(colors.action, shapes.roundedRectangle({ cornerRadius: action.radius })),
        clipShape('roundedRectangle', action.radius),
      ]}
    >
      <Text modifiers={[font({ size: typography.body, weight: 'semibold' }), foregroundStyle(colors.surface)]}>
        {label}
      </Text>
    </Button>
  );
}

export function SecondaryActionButton({ label, onPress, isDisabled = false }: FlowButtonProps) {
  const action = componentTokens.actionButton;

  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        disabled(isDisabled),
        opacity(isDisabled ? 0.45 : 1),
        accessibilityLabel(label),
        frame({ width: screenTokens.addMoney.contentWidth, height: action.height }),
        background(colors.surfaceLayer, shapes.roundedRectangle({ cornerRadius: action.radius })),
        clipShape('roundedRectangle', action.radius),
        strokeBorder({
          content: colors.borderStrong,
          style: { lineWidth: componentTokens.surface.borderWidth },
          shape: 'roundedRectangle',
          cornerRadius: action.radius,
        }),
      ]}
    >
      <Text modifiers={[font({ size: typography.body, weight: 'medium' }), foregroundStyle(colors.textPrimary)]}>
        {label}
      </Text>
    </Button>
  );
}

interface FlowCardProps {
  children: React.ReactNode;
  height?: number;
  modifiers?: ViewModifier[];
  spacing?: number;
}

export function FlowCard({ children, height, modifiers = [], spacing = 0 }: FlowCardProps) {
  return (
    <VStack
      alignment="leading"
      spacing={spacing}
      modifiers={[
        frame({
          width: screenTokens.addMoney.contentWidth,
          ...(height === undefined ? {} : { height }),
        }),
        ...cardChromeModifiers(componentTokens.surface.panelRadius),
        ...modifiers,
      ]}
    >
      {children}
    </VStack>
  );
}

interface FlowInfoRowProps {
  label: string;
  value: string;
  emphasized?: boolean;
}

export function FlowInfoRow({ label, value, emphasized = false }: FlowInfoRowProps) {
  return (
    <HStack alignment="firstTextBaseline" spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
      <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
        {label}
      </Text>
      <Spacer />
      <Text
        modifiers={[
          font({ size: emphasized ? typography.body : typography.caption, weight: emphasized ? 'semibold' : 'medium' }),
          foregroundStyle(colors.textPrimary),
        ]}
      >
        {value}
      </Text>
    </HStack>
  );
}

interface FlowNoticeProps {
  symbol: SFSymbol;
  title: string;
  subtitle: string;
}

export function FlowNotice({ symbol, title, subtitle }: FlowNoticeProps) {
  return (
    <HStack
      alignment="center"
      spacing={12}
      modifiers={[
        padding({ horizontal: 14, vertical: 12 }),
        frame({ width: screenTokens.addMoney.contentWidth, height: screenTokens.addMoney.noticeHeight }),
        background(colors.surfaceSecondary, shapes.roundedRectangle({ cornerRadius: componentTokens.surface.cardRadius })),
        strokeBorder({
          content: colors.borderStrong,
          style: { lineWidth: componentTokens.surface.borderWidth },
          shape: 'roundedRectangle',
          cornerRadius: componentTokens.surface.cardRadius,
        }),
      ]}
    >
      <Image systemName={symbol} size={17} color={colors.textPrimary} />
      <VStack alignment="leading" spacing={3} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
        <Text modifiers={[font({ size: typography.caption, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
          {title}
        </Text>
        <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
          {subtitle}
        </Text>
      </VStack>
    </HStack>
  );
}
