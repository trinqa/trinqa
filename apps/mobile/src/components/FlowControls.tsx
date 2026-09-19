import {
  Button,
  Group,
  HStack,
  Image,
  ProgressView,
  Spacer,
  Text,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  background,
  buttonStyle,
  clipShape,
  controlSize,
  font,
  foregroundStyle,
  frame,
  labelStyle,
  disabled,
  opacity,
  padding,
  progressViewStyle,
  scaleEffect,
  shapes,
  strokeBorder,
  tint,
  type ViewModifier,
} from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, componentTokens, screenTokens, typography } from '@/theme';
import { cardChromeModifiers } from '@/theme/swiftUi';

interface FlowButtonProps {
  label: string;
  onPress: () => void;
  isDisabled?: boolean;
}

export function PrimaryActionButton({ label, onPress, isDisabled = false }: FlowButtonProps) {
  const action = componentTokens.actionButton;
  const linearGradient = {
    type: 'linearGradient' as const,
    colors: [
      colors.actionPrimary,
      colors.actionPrimaryDark,
      colors.actionPrimaryDarker,
    ],
    startPoint: { x: 0.5, y: 0 },
    endPoint: { x: 0.5, y: 1 },
  };
  const highlightGradient = {
    type: 'radialGradient' as const,
    colors: [colors.actionPrimaryHighlight, colors.actionPrimaryDark],
    center: { x: 0.5, y: 0.15 },
    startRadius: 0,
    endRadius: screenTokens.addMoney.contentWidth * 0.62,
  };

  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        disabled(isDisabled),
        opacity(isDisabled ? 0.45 : 1),
        accessibilityLabel(label),
      ]}
    >
      <ZStack
        modifiers={[
          frame({ width: screenTokens.addMoney.contentWidth, height: action.height }),
          background(linearGradient, shapes.roundedRectangle({ cornerRadius: action.radius })),
          clipShape('roundedRectangle', action.radius),
        ]}
      >
        <VStack
          modifiers={[
            frame({ width: screenTokens.addMoney.contentWidth, height: action.height }),
            background(highlightGradient),
            opacity(action.highlightOpacity),
          ]}
        >
          <Spacer />
        </VStack>
        <Text
          modifiers={[
            font({ size: typography.body, weight: 'semibold' }),
            foregroundStyle(colors.surface),
          ]}
        >
          {label}
        </Text>
      </ZStack>
    </Button>
  );
}

export function FlowSelectionBadge({ title, symbol }: { title: string; symbol: SFSymbol }) {
  return (
    <HStack
      alignment="center"
      spacing={8}
      modifiers={[
        padding({ horizontal: 12 }),
        frame({ height: screenTokens.addMoney.methodHeight }),
        background(
          colors.surface,
          shapes.roundedRectangle({ cornerRadius: componentTokens.surface.controlRadius }),
        ),
        strokeBorder({
          content: colors.borderStrong,
          style: { lineWidth: componentTokens.surface.borderWidth },
          shape: 'roundedRectangle',
          cornerRadius: componentTokens.surface.controlRadius,
        }),
      ]}
    >
      <Image systemName={symbol} size={14} color={colors.textPrimary} />
      <Text
        modifiers={[
          font({ size: typography.caption, weight: 'semibold' }),
          foregroundStyle(colors.textPrimary),
        ]}
      >
        {title}
      </Text>
    </HStack>
  );
}

export function FlowQuickAmountButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const flow = screenTokens.addMoney;
  const buttonWidth = (flow.contentWidth - flow.quickAmountGap * 2) / 3;

  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        accessibilityLabel(`Set amount to ${label}`),
        frame({ width: buttonWidth, height: flow.quickAmountHeight }),
        background(
          selected ? colors.accentMuted : colors.surface,
          shapes.roundedRectangle({ cornerRadius: componentTokens.surface.controlRadius }),
        ),
        clipShape('roundedRectangle', componentTokens.surface.controlRadius),
        strokeBorder({
          content: selected ? colors.action : colors.borderStrong,
          style: { lineWidth: componentTokens.surface.borderWidth },
          shape: 'roundedRectangle',
          cornerRadius: componentTokens.surface.controlRadius,
        }),
      ]}
    >
      <Text
        modifiers={[
          font({ size: typography.caption, weight: selected ? 'semibold' : 'medium' }),
          foregroundStyle(selected ? colors.action : colors.textPrimary),
        ]}
      >
        {label}
      </Text>
    </Button>
  );
}

interface FlowStepLayoutProps {
  children: React.ReactNode;
  onBack: () => void;
  onPrimaryPress: () => void;
  primaryLabel: string;
  title: string;
  isPrimaryDisabled?: boolean;
}

export function FlowStepLayout({
  children,
  isPrimaryDisabled = false,
  onBack,
  onPrimaryPress,
  primaryLabel,
  title,
}: FlowStepLayoutProps) {
  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[frame({ width: screenTokens.addMoney.contentWidth, maxHeight: Infinity })]}
    >
      <Group modifiers={[padding({ horizontal: 8 })]}>
        <ScreenHeader showBack title={title} onBackPress={onBack} />
      </Group>
      {children}
      <Spacer />
      <PrimaryActionButton
        label={primaryLabel}
        onPress={onPrimaryPress}
        isDisabled={isPrimaryDisabled}
      />
    </VStack>
  );
}

export type FlowProcessingRowState = 'complete' | 'current' | 'pending';

export interface FlowProcessingTimelineItem {
  id: string;
  title: string;
  subtitle: string;
  state: FlowProcessingRowState;
}

function FlowProcessingTimelineRow({
  item,
}: {
  item: FlowProcessingTimelineItem;
}) {
  const symbol = item.state === 'complete' ? 'checkmark.circle.fill' : 'circle';
  const color = item.state === 'pending' ? colors.borderStrong : colors.action;

  return (
    <HStack alignment="center" spacing={12} modifiers={[frame({ maxWidth: Infinity, minHeight: 52 })]}>
      <Image systemName={symbol} size={18} color={color} />
      <VStack alignment="leading" spacing={3}>
        <Text
          modifiers={[
            font({ size: typography.caption, weight: 'medium' }),
            foregroundStyle(item.state === 'pending' ? colors.textSecondary : colors.textPrimary),
          ]}
        >
          {item.title}
        </Text>
        <Text modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}>
          {item.subtitle}
        </Text>
      </VStack>
    </HStack>
  );
}

interface FlowProcessingStateProps {
  headerTitle: string;
  stateTitle: string;
  supportingLines: readonly string[];
  symbol: SFSymbol;
  steps: readonly FlowProcessingTimelineItem[];
  noticeTitle: string;
  noticeSubtitle: string;
  onBack: () => void;
}

export function FlowProcessingState({
  headerTitle,
  noticeSubtitle,
  noticeTitle,
  onBack,
  stateTitle,
  steps,
  supportingLines,
  symbol,
}: FlowProcessingStateProps) {
  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[frame({ width: screenTokens.addMoney.contentWidth, maxHeight: Infinity })]}
    >
      <Group modifiers={[padding({ horizontal: 8 })]}>
        <ScreenHeader showBack title={headerTitle} onBackPress={onBack} />
      </Group>

      <VStack alignment="center" spacing={0} modifiers={[padding({ top: 34 }), frame({ maxWidth: Infinity })]}>
        <ZStack
          modifiers={[
            frame({
              width: screenTokens.addMoney.processingIconSize,
              height: screenTokens.addMoney.processingIconSize,
            }),
            background(colors.surface, shapes.circle()),
            strokeBorder({
              content: colors.borderStrong,
              style: { lineWidth: componentTokens.surface.borderWidth },
              shape: 'circle',
            }),
          ]}
        >
          <ProgressView
            value={0.68}
            modifiers={[
              progressViewStyle('circular'),
              controlSize('extraLarge'),
              tint(colors.action),
              scaleEffect(1.65),
            ]}
          />
          <Image systemName={symbol} size={19} color={colors.textPrimary} />
        </ZStack>

        <Text
          modifiers={[
            padding({ top: 28 }),
            font({ size: typography.sectionTitle, weight: 'semibold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          {stateTitle}
        </Text>
        <VStack alignment="center" spacing={2} modifiers={[padding({ top: 8 })]}>
          {supportingLines.map((line) => (
            <Text
              key={line}
              modifiers={[font({ size: typography.caption }), foregroundStyle(colors.textSecondary)]}
            >
              {line}
            </Text>
          ))}
        </VStack>

        <VStack alignment="leading" spacing={2} modifiers={[padding({ top: 24 }), frame({ width: 300 })]}>
          {steps.map((item) => (
            <FlowProcessingTimelineRow key={item.id} item={item} />
          ))}
        </VStack>
      </VStack>

      <Spacer />
      <FlowNotice
        symbol="info.circle"
        title={noticeTitle}
        subtitle={noticeSubtitle}
      />
    </VStack>
  );
}

interface FlowSuccessStateProps {
  amount: string;
  noticeSubtitle: string;
  noticeSymbol: SFSymbol;
  noticeTitle: string;
  onClose: () => void;
  onDone: () => void;
  onSecondaryPress?: () => void;
  secondaryLabel?: string;
  supportingText: string;
  title: string;
  outcomeStatus?: 'completed' | 'pending' | 'failed';
}

export function FlowSuccessState({
  amount,
  noticeSubtitle,
  noticeSymbol,
  noticeTitle,
  onClose,
  onDone,
  onSecondaryPress,
  secondaryLabel,
  supportingText,
  title,
  outcomeStatus = 'completed',
}: FlowSuccessStateProps) {
  const outcomeSymbol =
    outcomeStatus === 'pending' ? 'clock' : outcomeStatus === 'failed' ? 'xmark' : 'checkmark';
  const outcomeColor = outcomeStatus === 'failed' ? colors.notificationBadge : colors.action;
  return (
    <VStack
      alignment="center"
      spacing={0}
      modifiers={[frame({ width: screenTokens.addMoney.contentWidth, maxHeight: Infinity })]}
    >
      <HStack modifiers={[frame({ maxWidth: Infinity, minHeight: componentTokens.headerControl.size })]}>
        <Spacer />
        <Button
          label="Close"
          systemImage="xmark"
          onPress={onClose}
          modifiers={[
            buttonStyle('plain'),
            labelStyle('iconOnly'),
            frame({ width: componentTokens.headerControl.size, height: componentTokens.headerControl.size }),
            background(colors.surface, shapes.circle()),
            strokeBorder({
              content: colors.borderStrong,
              style: { lineWidth: componentTokens.surface.borderWidth },
              shape: 'circle',
            }),
          ]}
        />
      </HStack>

      <VStack alignment="center" spacing={0} modifiers={[padding({ top: 36 }), frame({ maxWidth: Infinity })]}>
        <ZStack
          modifiers={[
            frame({ width: screenTokens.addMoney.successIconSize, height: screenTokens.addMoney.successIconSize }),
            background(colors.surfaceSecondary, shapes.circle()),
            strokeBorder({ content: outcomeColor, style: { lineWidth: 1 }, shape: 'circle' }),
          ]}
        >
          <Image systemName={outcomeSymbol} size={34} color={outcomeColor} />
        </ZStack>

        <Text
          modifiers={[
            padding({ top: 24 }),
            font({ size: 22, weight: 'bold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          {title}
        </Text>
        <Text
          modifiers={[
            padding({ top: 14 }),
            font({ size: typography.balanceMedium, weight: 'bold' }),
            foregroundStyle(colors.textPrimary),
          ]}
        >
          {amount}
        </Text>
        <Text
          modifiers={[
            padding({ top: 4 }),
            font({ size: typography.body, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {supportingText}
        </Text>

        <Group modifiers={[padding({ top: 28 })]}>
          <FlowNotice symbol={noticeSymbol} title={noticeTitle} subtitle={noticeSubtitle} />
        </Group>
      </VStack>

      <Spacer />
      <VStack spacing={10}>
        <PrimaryActionButton label="Done" onPress={onDone} />
        {secondaryLabel && onSecondaryPress ? (
          <SecondaryActionButton label={secondaryLabel} onPress={onSecondaryPress} />
        ) : null}
      </VStack>
    </VStack>
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
