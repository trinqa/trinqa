import { useState } from 'react';

import {
  BottomSheet,
  Button,
  Divider,
  Group,
  HStack,
  Image,
  ScrollView,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  padding,
  presentationBackground,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';

import {
  FlowCard,
  FlowCardLabel,
  FlowCardNote,
  FlowInfoRow,
  SecondaryActionButton,
} from '@/components/FlowControls';
import { FlowInlineState } from '@/components/FlowStates';
import {
  ANCHOR_STATUS_COPY,
  ROUTE_FACTORS,
  ROUTE_REJECT_REASONS,
  advisorLabel,
  formatScore,
} from '@/data/routeCopy';
import type { RejectedRoute, RouteDecision, ScoredRoute } from '@/services/types';
import { colors, componentTokens, screenTokens, spacing, typography } from '@/theme';
import { hitTargetModifiers } from '@/theme/swiftUi';
import { cardChromeModifiers } from '@/theme/swiftUi';

const flow = screenTokens.withdrawalFlow;

/** Rejected anchors are listed by name; their reasons are one sentence per anchor. */
function rejectedSentence(entry: RejectedRoute) {
  // An unknown reason code still counted as a check, but we cannot phrase it, so it is skipped.
  const clauses = entry.reasons
    .filter((reason) => reason in ROUTE_REJECT_REASONS)
    .map((reason) => ROUTE_REJECT_REASONS[reason]);
  if (clauses.length === 0) return null;
  return `This anchor ${clauses.join(', ')}.`;
}

function ScoredRouteCard({
  route,
  advisorName,
}: {
  route: ScoredRoute;
  advisorName: 'jev' | 'none';
}) {
  const status = ANCHOR_STATUS_COPY[route.status];

  return (
    <FlowCard>
      <VStack alignment="leading" spacing={spacing.control} modifiers={[padding({ all: spacing.section })]}>
        <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <Text modifiers={[font({ size: typography.sectionTitle, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
            {route.anchorName}
          </Text>
          <FlowCardNote text={route.anchorId} />
        </VStack>
        <Divider />
        <FlowInfoRow label="Score" value={`${formatScore(route.score)} out of 100`} emphasized />
        {status ? (
          <VStack alignment="leading" spacing={spacing.xs} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
            <FlowInfoRow label="Status" value={status.label} />
            <FlowCardNote text={status.explanation} />
          </VStack>
        ) : null}
        <Divider />
        <FlowCardLabel text="What went into the score" />
        {ROUTE_FACTORS.map((factor) => {
          const value = route.factors?.[factor.key];
          // Only render a factor the payload actually carries — never a placeholder number.
          if (typeof value !== 'number' || !Number.isFinite(value)) return null;
          const source = route.factorSources?.[factor.key];
          const note =
            source === 'advisor'
              ? `Counts for ${factor.weight}% of the score. Suggested by ${advisorLabel(advisorName)}, not worked out from published numbers.`
              : source === 'deterministic'
                ? `Counts for ${factor.weight}% of the score. ${factor.computedNote}`
                : `Counts for ${factor.weight}% of the score.`;
          return (
            <VStack
              key={factor.key}
              alignment="leading"
              spacing={spacing.xs}
              modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
            >
              <FlowInfoRow label={factor.label} value={`${formatScore(value)} out of 100`} />
              <FlowCardNote text={note} />
            </VStack>
          );
        })}
        {route.advisorRationale ? (
          <VStack alignment="leading" spacing={spacing.xs} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
            <Divider />
            <FlowCardLabel text={`What ${advisorLabel(advisorName)} said`} />
            <FlowCardNote text={route.advisorRationale} />
          </VStack>
        ) : null}
      </VStack>
    </FlowCard>
  );
}

function RejectedRouteCard({ entry }: { entry: RejectedRoute }) {
  const status = ANCHOR_STATUS_COPY[entry.status];
  const sentence = rejectedSentence(entry);

  return (
    <FlowCard>
      <VStack alignment="leading" spacing={spacing.control} modifiers={[padding({ all: spacing.section })]}>
        <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <Text modifiers={[font({ size: typography.sectionTitle, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
            {entry.anchorName}
          </Text>
          <FlowCardNote text={entry.anchorDomain} />
        </VStack>
        <Divider />
        {sentence ? <FlowCardNote text={sentence} /> : null}
        {/* The anchor's standing in the registry, not a verdict on this withdrawal — an anchor
            that can move money in general still lands here when it cannot serve this currency. */}
        {status ? <FlowInfoRow label="Anchor status" value={status.label} /> : null}
        {/* The planner's own wording. Kept verbatim: it names the exact rail or standard that failed. */}
        {entry.detail ? <FlowCardNote text={`Reported: ${entry.detail}`} /> : null}
      </VStack>
    </FlowCard>
  );
}

/**
 * The amount step's compact line. Two claims only, both read off the payload: how many
 * anchors the planner checked, and which one scored highest. The whole row is the sheet's
 * anchor — tapping it opens the detail, it never selects anything.
 */
function PreviewRow({
  considered,
  chosen,
  onPress,
}: {
  considered: number;
  chosen: ScoredRoute | null;
  onPress: () => void;
}) {
  const row = componentTokens.selectionRow;
  const title = `${considered} payout ${considered === 1 ? 'option' : 'options'} checked`;
  const subtitle = chosen ? `${chosen.anchorName} scored highest` : 'None of them can pay out right now';

  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        ...hitTargetModifiers({
          label: `${title}. ${subtitle}`,
          hint: 'Opens the details.',
          shape: 'roundedRectangle',
          cornerRadius: row.radius,
          press: 'opacity',
        }),
        frame({ width: flow.contentWidth, height: row.height }),
        ...cardChromeModifiers(row.radius),
      ]}
    >
      <HStack
        alignment="center"
        spacing={row.contentGap}
        modifiers={[
          padding({ horizontal: row.horizontalPadding }),
          frame({ width: flow.contentWidth, height: row.height }),
        ]}
      >
        <Image systemName="point.3.connected.trianglepath.dotted" size={row.symbolSize} color={colors.textPrimary} />
        <VStack alignment="leading" spacing={3} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <Text modifiers={[font({ size: typography.footnote, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
            {title}
          </Text>
          <Text modifiers={[font({ size: typography.footnote, weight: 'medium' }), foregroundStyle(colors.textSecondary)]}>
            {subtitle}
          </Text>
        </VStack>
        <Spacer />
        <Image systemName="chevron.right" size={12} color={colors.textSecondary} />
      </HStack>
    </Button>
  );
}

/**
 * Shows what the route planner looked at before any quote exists. Renders nothing unless the
 * preview came back with at least one anchor, so a slow or failed request never reaches the
 * amount step — it is background detail, and the quote and the withdrawal do not depend on it.
 */
export function RoutePreviewSheet({ decision }: { decision: RouteDecision | null }) {
  const [isPresented, setIsPresented] = useState(false);

  if (!decision) return null;
  // Defensive reads: a preview that arrives short of a field must still render nothing
  // rather than throw, because this sits inside the amount step.
  const eligible = decision.eligible ?? [];
  const rejected = decision.rejected ?? [];
  const considered = eligible.length + rejected.length;
  if (considered === 0) return null;
  const advisorName = decision.advisor?.name === 'jev' ? 'jev' : 'none';

  const executableCount = eligible.filter((route) => route.status === 'EXECUTABLE').length;
  const executableNote =
    executableCount === 0
      ? 'None of these can move money today.'
      : executableCount === 1
        ? `Only ${eligible.find((route) => route.status === 'EXECUTABLE')?.anchorName} can actually move money today.`
        : `${executableCount} of these can actually move money today.`;

  return (
    <BottomSheet
      isPresented={isPresented}
      onIsPresentedChange={setIsPresented}
      anchor={
        <PreviewRow considered={considered} chosen={decision.chosen ?? null} onPress={() => setIsPresented(true)} />
      }
    >
      <Group
        modifiers={[
          presentationDetents(['large']),
          presentationDragIndicator('visible'),
          presentationBackground(colors.surface),
        ]}
      >
        <VStack
          alignment="leading"
          spacing={spacing.section}
          modifiers={[padding({ top: spacing.screen, horizontal: spacing.screen }), frame({ maxHeight: Infinity })]}
        >
          <VStack alignment="leading" spacing={spacing.xs}>
            <Text modifiers={[font({ size: typography.sectionTitle, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
              Payout options
            </Text>
            <FlowCardNote text="What the route planner checked for this withdrawal." />
          </VStack>

          <ScrollView>
            <VStack
              alignment="leading"
              spacing={spacing.cardGap}
              modifiers={[padding({ bottom: spacing.scrollBottom }), frame({ maxWidth: Infinity, alignment: 'leading' })]}
            >
              {/* FlowInlineState grows with its text; FlowNotice is a fixed 72pt box. */}
              <FlowInlineState
                symbol="info.circle"
                title="Nothing here is selectable"
                subtitle="You can’t pick a payout route. Trinqa chooses, and the money leaves through the anchor it has set up."
              />

              {eligible.length > 0 ? (
                <VStack alignment="leading" spacing={spacing.cardGap} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
                  <FlowCardLabel text={`Scored (${eligible.length})`} />
                  <FlowCardNote text={executableNote} />
                  {eligible.map((route) => (
                    <ScoredRouteCard key={route.routeId} route={route} advisorName={advisorName} />
                  ))}
                </VStack>
              ) : (
                <FlowCardNote text="No anchor could be scored for this withdrawal." />
              )}

              {rejected.length > 0 ? (
                <VStack alignment="leading" spacing={spacing.cardGap} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
                  <FlowCardLabel text={`Ruled out (${rejected.length})`} />
                  {rejected.map((entry) => (
                    <RejectedRouteCard key={entry.anchorId} entry={entry} />
                  ))}
                </VStack>
              ) : null}

              <SecondaryActionButton label="Close" onPress={() => setIsPresented(false)} />
            </VStack>
          </ScrollView>
        </VStack>
      </Group>
    </BottomSheet>
  );
}
