import { Chart, HStack, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  clipped,
  font,
  foregroundStyle,
  frame,
  offset,
  opacity,
  padding,
  scaleEffect,
  shadow,
  shapes,
  strokeBorder,
} from '@expo/ui/swift-ui/modifiers';

import { colors, componentTokens } from '@/theme';
import type { ChartPoint } from '@/types';

const CHART_BLUE = colors.action;
const AREA_FILL = '#08AFD31F';
const OUTER_WIDTH = 350;
const OUTER_PLOT_HEIGHT = 181;
const LABEL_TOP_PADDING = 8;
const SELECTED_INDEX = 5;

/** Tunable visual transform — iterate from screenshots. */
const SCALE_X = 1.13;
const SCALE_Y = 0.8;
const CHART_X_OFFSET = 10.5;
const CHART_Y_OFFSET = 30;

const CHART_STYLE = { width: OUTER_WIDTH, height: OUTER_PLOT_HEIGHT } as const;

const CHART_MODIFIERS = [
  frame({ width: OUTER_WIDTH, height: OUTER_PLOT_HEIGHT }),
  scaleEffect({ x: SCALE_X, y: SCALE_Y }),
  offset({ x: CHART_X_OFFSET, y: CHART_Y_OFFSET }),
];

/** Overlay coords in outer 366×185 plot frame (screen origin x18, y203). */
const GUIDE_X = 295;
const GUIDE_Y = 49;
const GUIDE_HEIGHT = 132;
const TOOLTIP_X = 199;
const TOOLTIP_Y = 24;

/** Reference 7-point profile — category x ≈ [18,79,140,201,261,322,383] screen. */
const DISPLAY_Y_PROFILE = [0.12, 0.325, 0.325, 0.603, 0.603, 0.789, 0.789] as const;

/** Turning-point marker centers in outer plot frame (screen target − origin 18,203). */
const TURNING_MARKERS = [
  { x: 67, y: 135, size: 6 },
  { x: 124, y: 135, size: 6 },
  { x: 181, y: 83, size: 6 },
  { x: 238, y: 83, size: 6 },
  { x: 295, y: 49, size: 9 },
] as const;

/** Subtle vertical grid x positions inside outer plot (relative). */
const GRID_XS = [0, 58, 116, 175, 233, 292, 349];

interface ActivityChartProps {
  points: ChartPoint[];
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildChartDisplayData(points: ChartPoint[]) {
  return DISPLAY_Y_PROFILE.map((y, index) => ({
    x: points[index]?.label ?? `point-${index}`,
    y,
  }));
}

function markerOffset(centerX: number, centerY: number, size: number) {
  const inset = size / 2;
  return { x: centerX - inset, y: centerY - inset };
}

/** Native SwiftUI Charts line + area for Activity (iOS). */
export function ActivityChart({ points }: ActivityChartProps) {
  const data = buildChartDisplayData(points);
  const selected = points[Math.min(SELECTED_INDEX, points.length - 1)];

  return (
    <VStack alignment="leading" spacing={0} modifiers={[frame({ width: OUTER_WIDTH, maxWidth: Infinity })]}>
      <ZStack
        alignment="topLeading"
        modifiers={[frame({ width: OUTER_WIDTH, height: OUTER_PLOT_HEIGHT }), clipped()]}
      >
        {GRID_XS.map((gridX) => (
          <Text
            key={gridX}
            modifiers={[
              frame({ width: 1, height: OUTER_PLOT_HEIGHT }),
              background('#00000010'),
              offset({ x: gridX, y: 0 }),
            ]}
          >
            {' '}
          </Text>
        ))}

        <Chart
          type="area"
          data={data}
          showGrid={false}
          animate={false}
          areaStyle={{ color: AREA_FILL }}
          style={CHART_STYLE}
          modifiers={CHART_MODIFIERS}
        />
        <Chart
          type="line"
          data={data}
          showGrid={false}
          animate={false}
          lineStyle={{
            color: CHART_BLUE,
            width: 2,
          }}
          style={CHART_STYLE}
          modifiers={CHART_MODIFIERS}
        />

        <Text
          modifiers={[
            frame({ width: 1, height: GUIDE_HEIGHT }),
            background(CHART_BLUE),
            opacity(0.35),
            offset({ x: GUIDE_X, y: GUIDE_Y }),
          ]}
        >
          {' '}
        </Text>

        <VStack
          alignment="leading"
          spacing={2}
          modifiers={[
            padding({ horizontal: 10, vertical: 7 }),
            frame({ width: 94, height: 38 }),
            background(colors.surface, shapes.roundedRectangle({ cornerRadius: 8 })),
            strokeBorder({
              content: colors.borderStrong,
              style: { lineWidth: componentTokens.surface.borderWidth },
              shape: 'roundedRectangle',
              cornerRadius: 8,
            }),
            shadow({
              radius: componentTokens.surface.shadowRadius,
              y: componentTokens.surface.shadowY,
              color: '#00000014',
            }),
            offset({ x: TOOLTIP_X, y: TOOLTIP_Y }),
          ]}
        >
          <Text
            modifiers={[
              font({ size: 13, weight: 'semibold' }),
              foregroundStyle(colors.textPrimary),
            ]}
          >
            {formatCurrency(selected.value)}
          </Text>
          <Text
            modifiers={[
              font({ size: 10, weight: 'regular' }),
              foregroundStyle(colors.textSecondary),
            ]}
          >
            {selected?.label}
          </Text>
        </VStack>

        {TURNING_MARKERS.map((marker) => {
          const { x, y } = markerOffset(marker.x, marker.y, marker.size);
          return (
            <ZStack
              key={`${marker.x}-${marker.y}`}
              modifiers={[
                frame({ width: marker.size, height: marker.size }),
                background(CHART_BLUE, shapes.circle()),
                offset({ x, y }),
              ]}
            >
              <Text
                modifiers={[
                  frame({ width: marker.size >= 9 ? 4 : 3, height: marker.size >= 9 ? 4 : 3 }),
                  background(colors.surface, shapes.circle()),
                ]}
              >
                {' '}
              </Text>
            </ZStack>
          );
        })}
      </ZStack>

      <HStack
        modifiers={[
          frame({ width: OUTER_WIDTH - 24 }),
          offset({ x: 12 }),
          padding({ top: LABEL_TOP_PADDING }),
        ]}
      >
        <Text
          modifiers={[
            font({ size: 10, weight: 'regular' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {points[0]?.label}
        </Text>
        <Spacer />
        <Text
          modifiers={[
            font({ size: 10, weight: 'regular' }),
            foregroundStyle(colors.textSecondary),
          ]}
        >
          {points[points.length - 1]?.label}
        </Text>
      </HStack>
    </VStack>
  );
}
