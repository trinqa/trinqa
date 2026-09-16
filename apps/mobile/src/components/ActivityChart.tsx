import { Chart, HStack, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  border,
  font,
  foregroundStyle,
  frame,
  offset,
  opacity,
  padding,
  scaleEffect,
  shadow,
  shapes,
} from '@expo/ui/swift-ui/modifiers';

import { colors } from '@/theme';
import type { ChartPoint } from '@/types';

const CHART_BLUE = '#2F6BFF';
const AREA_FILL = '#2F6BFF1F';
const OUTER_WIDTH = 366;
const OUTER_PLOT_HEIGHT = 185;
const LABEL_TOP_PADDING = 8;
const SELECTED_INDEX = 3;

/** Tunable visual transform — iterate from screenshots. */
const SCALE_X = 1.19;
const SCALE_Y = 0.84;
const CHART_Y_OFFSET = 32;

const CHART_STYLE = { width: OUTER_WIDTH, height: OUTER_PLOT_HEIGHT } as const;

const CHART_MODIFIERS = [
  frame({ width: OUTER_WIDTH, height: OUTER_PLOT_HEIGHT }),
  scaleEffect({ x: SCALE_X, y: SCALE_Y }),
  offset({ y: CHART_Y_OFFSET }),
];

/** Overlay coords in outer 366×185 plot frame (screen origin x18, y203). */
const GUIDE_X = 304;
const GUIDE_Y = 49;
const GUIDE_HEIGHT = 113;
const TOOLTIP_X = 202;
const TOOLTIP_Y = 24;

/** Reference 7-point profile — category x ≈ [18,79,140,201,261,322,383] screen. */
const DISPLAY_Y_PROFILE = [0.12, 0.325, 0.325, 0.603, 0.603, 0.789, 0.789] as const;

/** Turning-point marker centers in outer plot frame (screen target − origin 18,203). */
const TURNING_MARKERS = [
  { x: 10, y: 179, size: 6 },
  { x: 60, y: 139, size: 6 },
  { x: 125, y: 139, size: 6 },
  { x: 182, y: 85, size: 6 },
  { x: 242, y: 85, size: 6 },
  { x: 304, y: 49, size: 9 },
] as const;

/** Subtle vertical grid x positions inside outer plot (relative). */
const GRID_XS = [73, 146, 219, 292];

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
  const [sep1, sep5, sep9, sep13, sep16] = points;

  return [
    { x: sep1?.label ?? 'Sep 1', y: DISPLAY_Y_PROFILE[0] },
    { x: 'Sep 3', y: DISPLAY_Y_PROFILE[1] },
    { x: sep5?.label ?? 'Sep 5', y: DISPLAY_Y_PROFILE[2] },
    { x: sep9?.label ?? 'Sep 9', y: DISPLAY_Y_PROFILE[3] },
    { x: 'Sep 11', y: DISPLAY_Y_PROFILE[4] },
    { x: sep13?.label ?? 'Sep 13', y: DISPLAY_Y_PROFILE[5] },
    { x: `${sep16?.label ?? 'Sep 16'}-end`, y: DISPLAY_Y_PROFILE[6] },
  ];
}

function markerOffset(centerX: number, centerY: number, size: number) {
  const inset = size / 2;
  return { x: centerX - inset, y: centerY - inset };
}

/** Native SwiftUI Charts line + area for Activity (iOS). */
export function ActivityChart({ points }: ActivityChartProps) {
  const data = buildChartDisplayData(points);
  const selected = points[SELECTED_INDEX] ?? points[points.length - 1];

  return (
    <VStack alignment="leading" spacing={0} modifiers={[frame({ width: OUTER_WIDTH, maxWidth: Infinity })]}>
      <ZStack alignment="topLeading" modifiers={[frame({ width: OUTER_WIDTH, height: OUTER_PLOT_HEIGHT })]}>
        {GRID_XS.map((gridX) => (
          <Text
            key={gridX}
            modifiers={[
              frame({ width: 1, height: OUTER_PLOT_HEIGHT - 24 }),
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
            border({ content: colors.border, width: 1 }),
            shadow({ radius: 8, y: 2, color: '#00000014' }),
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
            {selected.label}
          </Text>
        </VStack>

        {TURNING_MARKERS.map((marker) => {
          const { x, y } = markerOffset(marker.x, marker.y, marker.size);
          return (
            <VStack
              key={`${marker.x}-${marker.y}`}
              modifiers={[
                frame({ width: marker.size, height: marker.size }),
                background(CHART_BLUE, shapes.circle()),
                offset({ x, y }),
              ]}
            >
              <Text>{' '}</Text>
            </VStack>
          );
        })}
      </ZStack>

      <HStack modifiers={[frame({ width: OUTER_WIDTH }), padding({ top: LABEL_TOP_PADDING })]}>
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
