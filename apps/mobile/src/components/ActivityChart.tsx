import React, { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text as RNText,
  useWindowDimensions,
  View,
} from 'react-native';
import { HStack, RNHostView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, offset, padding } from '@expo/ui/swift-ui/modifiers';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import {
  chartTokens,
  colors,
  componentTokens,
  screenTokens,
  spacing,
  typography,
  typeWeightRn,
} from '@/theme';
import type { ChartPoint } from '@/types';

// ─── Chart layout constants (all from tokens) ─────────────────────────────────
const PLOT_HEIGHT = chartTokens.plotHeight; // 181
const PAD_X = 20; // horizontal point margin (keeps first/last markers off edge)
const PAD_TOP = 20; // top padding so line never touches top edge
const PAD_BOTTOM = 16; // bottom padding so line never touches bottom edge
const GRID_COUNT = 7; // vertical grid columns (matches current design)

// Marker sizes
const ACTIVE_RADIUS = 5; // selected point
const INACTIVE_RADIUS = 3; // resting points

// Tooltip layout
const TOOLTIP_W = 96;
const TOOLTIP_MIN_H = 40;
const TOOLTIP_H = 48; // estimated rendered height used for y-positioning

// Vertical guide opacity
const GUIDE_OPACITY = 0.35;

// Default selected index — last point in earnChartPoints (index 12, Sep 23, 2026)
const DEFAULT_SELECTED_INDEX = 12;

// Bottom of SVG where area fill terminates
const AREA_BOTTOM = PLOT_HEIGHT;

// Axis label row insets ─ matches current OUTER_WIDTH - 24 / offset(x: 12)
const LABEL_ROW_INSET = spacing.xxxl; // 24
const LABEL_ROW_OFFSET_X = spacing.md; // 12
const LABEL_TOP_PAD = 8;

// ─── Formatting (same function as original ActivityChart) ─────────────────────
function formatCurrency(value: number): string {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} $`;
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────
/** Map data-point index → SVG x coordinate, with horizontal padding. */
function getX(index: number, total: number, width: number): number {
  if (total <= 1) return width / 2;
  return PAD_X + (index / (total - 1)) * (width - PAD_X * 2);
}

/** Map value in [min, max] → SVG y coordinate (top = high value). */
function getY(value: number, min: number, max: number): number {
  const range = max - min || 1; // guard identical-value edge case
  const normalised = (value - min) / range;
  return PLOT_HEIGHT - PAD_BOTTOM - normalised * (PLOT_HEIGHT - PAD_TOP - PAD_BOTTOM);
}

function buildCoords(
  points: ChartPoint[],
  width: number,
): Array<{ x: number; y: number }> {
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return points.map((p, i) => ({
    x: getX(i, points.length, width),
    y: getY(p.value, min, max),
  }));
}

/**
 * Build an SVG line path from coordinate array.
 * Equal-value neighbours produce flat horizontal segments naturally (step/plateau).
 */
function buildLinePath(coords: Array<{ x: number; y: number }>): string {
  return coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(' ');
}

/**
 * Build a closed SVG area path: line → bottom-right → bottom-left → close.
 * Fills the region under the chart line down to AREA_BOTTOM.
 */
function buildAreaPath(coords: Array<{ x: number; y: number }>): string {
  const linePath = buildLinePath(coords);
  const last = coords[coords.length - 1]!;
  const first = coords[0]!;
  return (
    `${linePath}` +
    ` L ${last.x.toFixed(2)} ${AREA_BOTTOM}` +
    ` L ${first.x.toFixed(2)} ${AREA_BOTTOM} Z`
  );
}

/** Snap x position to nearest data point index. */
function nearestIndex(x: number, coords: Array<{ x: number }>): number {
  let best = 0;
  let bestDist = Math.abs(coords[0].x - x);
  for (let i = 1; i < coords.length; i++) {
    const dist = Math.abs(coords[i].x - x);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/**
 * Compute tooltip left offset: centred on selected point x, clamped to chart bounds.
 * Near left/right edges the tooltip shifts inward automatically.
 */
function calcTooltipLeft(pointX: number, chartWidth: number): number {
  return Math.max(0, Math.min(chartWidth - TOOLTIP_W, pointX - TOOLTIP_W / 2));
}

// ─── Component ────────────────────────────────────────────────────────────────
interface ActivityChartProps {
  points: ChartPoint[];
}

/**
 * EarnGrowthChart — functional interactive SVG chart for the Earn screen.
 *
 * • Tap or drag horizontally → snaps to nearest data point.
 * • Vertical page scroll is unaffected (onPanResponderTerminationRequest: true).
 * • Embedded in SwiftUI layout via RNHostView.
 * • All visual constants come from design tokens; no raw hex values.
 */
export function ActivityChart({ points }: ActivityChartProps) {
  const { width: windowWidth } = useWindowDimensions();

  // Responsive chart width: device content area, capped at the Earn token width.
  const chartWidth = Math.min(
    windowWidth - spacing.screenHorizontal * 2,
    screenTokens.earn.contentWidth,
  );

  // Default selection: last point (Sep 23, 2026).
  const [selectedIndex, setSelectedIndex] = useState(() =>
    Math.min(DEFAULT_SELECTED_INDEX, points.length - 1),
  );

  // Tooltip visibility: true on first render (approved default look).
  // Tapping the active point again dismisses; dragging to a new point re-shows.
  const [tooltipVisible, setTooltipVisible] = useState(true);

  // Recompute coordinates when points or width change.
  const coords = useMemo(() => buildCoords(points, chartWidth), [points, chartWidth]);

  // Live refs so PanResponder closures always read current values without recreation.
  const coordsRef = useRef(coords);
  coordsRef.current = coords;

  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  const tooltipVisibleRef = useRef(tooltipVisible);
  tooltipVisibleRef.current = tooltipVisible;

  // Whether the current gesture started on the already-active point (dismiss intent).
  // Cleared on any move to a different point, committed on release.
  const grantedAtSameIndex = useRef(false);

  // PanResponder: claim taps and horizontal drags.
  // Dismiss logic:
  //   • Tap active point (no drag away) → hide tooltip on release.
  //   • Drag away from active point mid-gesture → cancel dismiss, show on new point.
  //   • Tap a different point → move + show.
  // onPanResponderTerminationRequest: true lets SwiftUI ScrollView reclaim vertical gestures.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const newIndex = nearestIndex(evt.nativeEvent.locationX, coordsRef.current);
        if (newIndex === selectedIndexRef.current && tooltipVisibleRef.current) {
          // Potential dismiss — confirm on release unless user drags away first.
          grantedAtSameIndex.current = true;
        } else {
          grantedAtSameIndex.current = false;
          setSelectedIndex(newIndex);
          setTooltipVisible(true);
        }
      },
      onPanResponderMove: (evt) => {
        const newIndex = nearestIndex(evt.nativeEvent.locationX, coordsRef.current);
        if (newIndex !== selectedIndexRef.current) {
          // Dragged to a new point — cancel any pending dismiss, show tooltip.
          grantedAtSameIndex.current = false;
          setSelectedIndex(newIndex);
          setTooltipVisible(true);
        }
      },
      onPanResponderRelease: () => {
        if (grantedAtSameIndex.current) {
          // Pure tap on active point with no drag away → dismiss.
          setTooltipVisible(false);
        }
        grantedAtSameIndex.current = false;
      },
      onPanResponderTerminate: () => {
        grantedAtSameIndex.current = false;
      },
      onPanResponderTerminationRequest: () => true,
      onShouldBlockNativeResponder: () => false,
    }),
  ).current;

  // Guard: need at least two points to draw a line.
  if (points.length < 2) return null;

  const selected = points[selectedIndex];
  if (!selected) return null;

  const selCoord = coords[selectedIndex] ?? { x: chartWidth / 2, y: PLOT_HEIGHT / 2 };
  const linePath = buildLinePath(coords);
  const areaPath = buildAreaPath(coords);
  const tooltipLeft = calcTooltipLeft(selCoord.x, chartWidth);
  // Tooltip bottom aligns with the top of the active marker circle; clamp so it never clips above chart.
  const tooltipTop = Math.max(0, selCoord.y - ACTIVE_RADIUS - TOOLTIP_H);

  // Seven evenly-spaced vertical grid x-positions.
  const gridXs = Array.from(
    { length: GRID_COUNT },
    (_, i) => (i / (GRID_COUNT - 1)) * chartWidth,
  );

  return (
    <VStack
      alignment="leading"
      spacing={0}
      modifiers={[frame({ width: chartWidth, maxWidth: Infinity })]}
    >
      {/* ── Chart plot area ─────────────────────────────────────────────── */}
      <RNHostView matchContents>
        <View
          style={[styles.chartArea, { width: chartWidth, height: PLOT_HEIGHT }]}
          {...panResponder.panHandlers}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`Earnings growth chart. Selected: ${selected.displayValue ?? formatCurrency(selected.value)} on ${selected.label}. Drag left or right to navigate.`}
          accessibilityHint="Drag horizontally to explore data points"
        >
          <Svg width={chartWidth} height={PLOT_HEIGHT}>
            {/* 1. Vertical grid lines — rendered behind everything */}
            {gridXs.map((gx, i) => (
              <Line
                key={i}
                x1={gx.toFixed(2)}
                y1={0}
                x2={gx.toFixed(2)}
                y2={PLOT_HEIGHT}
                stroke={chartTokens.gridLine}
                strokeWidth={1}
              />
            ))}

            {/* 2. Area fill — subtle pale-cyan under the line */}
            <Path d={areaPath} fill={chartTokens.areaFill} />

            {/* 3. Line — thin cyan, step/plateau shape from data */}
            <Path
              d={linePath}
              stroke={chartTokens.line}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 4. Selected vertical guide — rendered above area/line, behind markers */}
            <Line
              x1={selCoord.x.toFixed(2)}
              y1={0}
              x2={selCoord.x.toFixed(2)}
              y2={PLOT_HEIGHT}
              stroke={chartTokens.line}
              strokeWidth={1}
              strokeOpacity={GUIDE_OPACITY}
            />

            {/* 5. Inactive markers — small, outlined, white centre */}
            {coords.map((c, i) => {
              if (i === selectedIndex) return null;
              return (
                <Circle
                  key={i}
                  cx={c.x.toFixed(2)}
                  cy={c.y.toFixed(2)}
                  r={INACTIVE_RADIUS}
                  fill={colors.surface}
                  stroke={chartTokens.line}
                  strokeWidth={2}
                />
              );
            })}

            {/* 6. Active marker — larger, on top of inactive markers */}
            <Circle
              cx={selCoord.x.toFixed(2)}
              cy={selCoord.y.toFixed(2)}
              r={ACTIVE_RADIUS}
              fill={colors.surface}
              stroke={chartTokens.line}
              strokeWidth={2}
            />
          </Svg>

          {/* 7. Floating tooltip — React Native View, absolutely positioned over SVG.
               Rendered only when tooltipVisible; bottom edge aligns with active marker tip. */}
          {tooltipVisible && (
            <View
              style={[styles.tooltip, { left: tooltipLeft, top: tooltipTop }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <RNText style={styles.tooltipAmount} numberOfLines={1}>
                {selected.displayValue ?? formatCurrency(selected.value)}
              </RNText>
              <RNText style={styles.tooltipDate} numberOfLines={1}>
                {selected.label}
              </RNText>
            </View>
          )}
        </View>
      </RNHostView>

      {/* ── X-axis date labels ───────────────────────────────────────────── */}
      <HStack
        modifiers={[
          frame({ width: chartWidth - LABEL_ROW_INSET }),
          offset({ x: LABEL_ROW_OFFSET_X }),
          padding({ top: LABEL_TOP_PAD }),
        ]}
      >
        <Text
          modifiers={[
            font({ size: typography.micro, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {points[0]?.label ?? ''}
        </Text>
        <Spacer />
        <Text
          modifiers={[
            font({ size: typography.micro, weight: 'medium' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {points[points.length - 1]?.label ?? ''}
        </Text>
      </HStack>
    </VStack>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  chartArea: {
    // Explicit dimensions required by RNHostView matchContents.
    // overflow: 'visible' lets the tooltip shadow render outside the SVG bounds.
    overflow: 'visible',
  },
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_W,
    minHeight: TOOLTIP_MIN_H,
    paddingHorizontal: spacing.sm + 2, // 10 — matches current padding({ horizontal: 10 })
    paddingVertical: spacing.sm - 1, // 7 — matches current padding({ vertical: 7 })
    backgroundColor: colors.surface,
    borderRadius: chartTokens.tooltipRadius,
    borderWidth: componentTokens.surface.borderWidth,
    borderColor: colors.borderStrong,
    // Shadow — values from chartTooltip primitive shadow token.
    shadowColor: chartTokens.tooltipShadow,
    shadowOffset: { width: 0, height: componentTokens.surface.shadowY },
    shadowRadius: componentTokens.surface.shadowRadius,
    shadowOpacity: 1,
    elevation: 3,
  },
  tooltipAmount: {
    fontSize: typography.caption, // 13
    fontWeight: typeWeightRn.semibold, // '600'
    color: colors.textPrimary,
    lineHeight: 16,
  },
  tooltipDate: {
    fontSize: typography.micro, // 10
    fontWeight: typeWeightRn.medium, // '500'
    color: colors.textSecondary,
    lineHeight: 13,
  },
});
