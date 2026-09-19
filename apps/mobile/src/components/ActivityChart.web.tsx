import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from '@/theme';
import type { ChartPoint } from '@/types';

interface ActivityChartProps {
  points: ChartPoint[];
}

/** Web fallback chart until SwiftUI Host is available. */
export function ActivityChart({ points }: ActivityChartProps) {
  const height = 170;

  if (points.length < 2) {
    return <View style={[styles.container, { height }]} />;
  }

  const width = 365;
  const paddingX = 8;
  const paddingY = 16;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coordinates = points.map((point, index) => {
    const x = paddingX + (index / (points.length - 1)) * chartWidth;
    const y =
      paddingY + chartHeight - ((point.value - min) / range) * chartHeight;
    return { x, y };
  });

  const linePath = coordinates
    .map((coord, index) =>
      index === 0 ? `M ${coord.x} ${coord.y}` : `L ${coord.x} ${coord.y}`,
    )
    .join(' ');

  const areaPath = `${linePath} L ${coordinates[coordinates.length - 1].x} ${
    height - paddingY
  } L ${coordinates[0].x} ${height - paddingY} Z`;

  const selected = coordinates[3] ?? coordinates[coordinates.length - 1];

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { height }]}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <LinearGradient id="activityChartFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.22} />
              <Stop offset="100%" stopColor={colors.accent} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          <Path d={areaPath} fill="url(#activityChartFill)" />
          <Path
            d={linePath}
            stroke={colors.accent}
            strokeWidth={2}
            fill="none"
          />
          <Circle
            cx={selected.x}
            cy={selected.y}
            r={5}
            fill={colors.surface}
            stroke={colors.accent}
            strokeWidth={2}
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
});
