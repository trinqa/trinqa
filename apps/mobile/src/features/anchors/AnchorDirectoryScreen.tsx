import { useCallback, useEffect, useState } from 'react';

import { Divider, Group, ScrollView, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';

import {
  FlowCard,
  FlowCardLabel,
  FlowCardNote,
  FlowInfoRow,
  FlowNotice,
  SecondaryActionButton,
} from '@/components/FlowControls';
import { FlowScreenShell } from '@/components/FlowScreenShell';
import { FlowInlineState } from '@/components/FlowStates';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ANCHOR_STATUS_COPY } from '@/data/routeCopy';
import { api } from '@/services/api';
import { errorMessage } from '@/services/apiErrors';
import { colors, screenTokens, spacing, typography } from '@/theme';
import type { AnchorAssetRail, AnchorSnapshot } from '@/services/types';

/** The registry reports Stellar's native asset as `native`; everywhere else it is XLM. */
function assetLabel(rail: AnchorAssetRail) {
  return rail.assetCode === 'native' ? 'XLM' : rail.assetCode;
}

function sepLabel(sep: string) {
  const number = /^sep(\d+)$/i.exec(sep);
  return number ? `SEP-${number[1]}` : sep;
}

function methodLabel(method: string) {
  return method.replace(/_/g, ' ');
}

function limitLabel(rail: AnchorAssetRail) {
  const asset = assetLabel(rail);
  if (rail.min !== undefined && rail.max !== undefined) return `${rail.min} – ${rail.max} ${asset}`;
  if (rail.min !== undefined) return `From ${rail.min} ${asset}`;
  if (rail.max !== undefined) return `Up to ${rail.max} ${asset}`;
  return null;
}

function feeLabel(rail: AnchorAssetRail) {
  const parts: string[] = [];
  if (rail.feePercent !== undefined) parts.push(`${rail.feePercent}%`);
  if (rail.feeFixed !== undefined) parts.push(`${rail.feeFixed} ${assetLabel(rail)}`);
  return parts.length > 0 ? parts.join(' + ') : null;
}

function checkedLabel(fetchedAt: string) {
  const at = new Date(fetchedAt);
  // A snapshot that failed can still carry whatever string the registry stored.
  if (Number.isNaN(at.getTime())) return fetchedAt;
  return at.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function railKey(rail: AnchorAssetRail, index: number) {
  return `${rail.direction}-${rail.assetCode}-${rail.assetIssuer ?? 'none'}-${index}`;
}

function AnchorRail({ rail }: { rail: AnchorAssetRail }) {
  const limits = limitLabel(rail);
  const fee = feeLabel(rail);
  const direction = rail.direction === 'deposit' ? 'Deposit' : 'Withdraw';

  return (
    <VStack alignment="leading" spacing={spacing.row} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
      <FlowCardLabel text={`${direction} · ${assetLabel(rail)}`} />
      {rail.enabled ? null : <FlowCardNote text="Turned off by the anchor." />}
      {rail.fiat.length > 0 ? <FlowInfoRow label="Currencies" value={rail.fiat.join(', ')} /> : null}
      {limits ? <FlowInfoRow label="Limits" value={limits} /> : null}
      {fee ? <FlowInfoRow label="Fee" value={fee} /> : null}
      {rail.methods.length > 0 ? (
        <FlowInfoRow label="Methods" value={rail.methods.map(methodLabel).join(', ')} />
      ) : null}
    </VStack>
  );
}

function AnchorCard({ anchor }: { anchor: AnchorSnapshot }) {
  const status = ANCHOR_STATUS_COPY[anchor.status];

  return (
    <FlowCard>
      <VStack alignment="leading" spacing={spacing.control} modifiers={[padding({ all: spacing.section })]}>
        <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <Text modifiers={[font({ size: typography.sectionTitle, weight: 'semibold' }), foregroundStyle(colors.textPrimary)]}>
            {anchor.name}
          </Text>
          <FlowCardNote text={anchor.domain} />
        </VStack>
        <Divider />
        <FlowInfoRow label="Status" value={status.label} />
        <FlowCardNote text={status.explanation} />
        {anchor.statusReason ? <FlowCardNote text={`Reported reason: ${anchor.statusReason}`} /> : null}
        <FlowInfoRow label="Responded" value={anchor.healthy ? 'Yes' : 'No'} />
        <FlowInfoRow label="Network" value={anchor.network} />
        <FlowInfoRow label="Checked" value={checkedLabel(anchor.fetchedAt)} />
        <VStack alignment="leading" spacing={spacing.xs} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          <FlowCardLabel text="Standards" />
          <FlowCardNote text={anchor.seps.length > 0 ? anchor.seps.map(sepLabel).join(', ') : 'None published.'} />
        </VStack>
        <Divider />
        {anchor.rails.length > 0 ? (
          <VStack alignment="leading" spacing={spacing.control} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
            {anchor.rails.map((rail, index) => (
              <AnchorRail key={railKey(rail, index)} rail={rail} />
            ))}
          </VStack>
        ) : (
          <FlowCardNote text="No deposit or withdrawal rails published." />
        )}
      </VStack>
    </FlowCard>
  );
}

// A scrolling list like Activity, so it takes that screen's content width.
const directory = screenTokens.activity;

export function AnchorDirectoryScreen() {
  const router = useRouter();
  const [anchors, setAnchors] = useState<AnchorSnapshot[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.anchors().then(
      (result) => {
        if (cancelled) return;
        setAnchors(result.anchors);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setAnchors(null);
        setError(errorMessage(err, 'The directory could not be loaded.'));
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const executableCount = anchors?.filter((anchor) => anchor.status === 'EXECUTABLE').length ?? 0;

  return (
    <FlowScreenShell>
      <VStack alignment="leading" spacing={0} modifiers={[frame({ width: directory.contentWidth, maxHeight: Infinity })]}>
        <Group modifiers={[padding({ horizontal: spacing.headerTop })]}>
          <ScreenHeader showBack title="Anchor directory" onBackPress={() => router.back()} />
        </Group>
        <ScrollView modifiers={[padding({ top: spacing.control })]}>
          <VStack
            alignment="leading"
            spacing={spacing.cardGap}
            modifiers={[
              padding({ bottom: spacing.scrollBottom }),
              frame({ width: directory.contentWidth, alignment: 'leading' }),
            ]}
          >
            <FlowNotice
              symbol="info.circle"
              title="Reference only"
              subtitle="Trinqa picks the anchor for each transfer. Nothing here is selectable."
            />
            {loading ? (
              <FlowInlineState
                symbol="clock"
                title="Loading the directory"
                subtitle="Reading the anchors Trinqa has discovered."
              />
            ) : error ? (
              <VStack alignment="leading" spacing={spacing.control}>
                <FlowInlineState
                  symbol="exclamationmark.triangle"
                  title="The directory could not be loaded"
                  subtitle={error}
                />
                <SecondaryActionButton label="Try again" onPress={retry} />
              </VStack>
            ) : anchors && anchors.length > 0 ? (
              <VStack alignment="leading" spacing={spacing.cardGap}>
                <FlowCardNote
                  text={`${anchors.length} ${anchors.length === 1 ? 'anchor' : 'anchors'} discovered · ${executableCount} can move money today.`}
                />
                {anchors.map((anchor) => (
                  <AnchorCard key={anchor.id} anchor={anchor} />
                ))}
              </VStack>
            ) : (
              <FlowInlineState
                symbol="magnifyingglass"
                title="No anchors listed"
                subtitle="Trinqa has not discovered any anchors on this network yet."
              />
            )}
          </VStack>
        </ScrollView>
      </VStack>
    </FlowScreenShell>
  );
}
