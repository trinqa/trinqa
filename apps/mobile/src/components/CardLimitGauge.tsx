import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';

import { colors, componentTokens } from '@/theme';

interface CardLimitGaugeProps {
  width: number;
  height: number;
  progress: number;
}

/** Reference-matched limit gauge with an SVG stripe pattern and native layout sizing. */
export function CardLimitGauge({ width, height, progress }: CardLimitGaugeProps) {
  const inset = 6;
  const trackHeight = 12;
  const trackY = (height - trackHeight) / 2;
  const trackWidth = width - inset * 2;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const progressWidth = trackWidth * clampedProgress;
  const thumbX = inset + progressWidth;

  return (
    <View style={[styles.root, { width, height, borderRadius: height / 2 }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="limitProgress" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#62C0DF" />
            <Stop offset="1" stopColor="#00A8E8" />
          </LinearGradient>
          <Pattern id="limitStripes" width="8" height="8" patternUnits="userSpaceOnUse">
            <Path
              d="M-2 8 L2 0 M6 8 L10 0"
              stroke={colors.action}
              strokeWidth="2"
              opacity="0.55"
            />
          </Pattern>
        </Defs>

        <Rect
          x={0.5}
          y={0.5}
          width={width - 1}
          height={height - 1}
          rx={height / 2}
          fill={colors.surfaceLayer}
          stroke={colors.borderStrong}
          strokeWidth={componentTokens.surface.borderWidth}
        />
        <Rect
          x={inset}
          y={trackY}
          width={trackWidth}
          height={trackHeight}
          rx={trackHeight / 2}
          fill={`url(#limitStripes)`}
        />
        <Rect
          x={inset}
          y={trackY}
          width={progressWidth}
          height={trackHeight}
          rx={trackHeight / 2}
          fill="url(#limitProgress)"
        />
        <Circle cx={thumbX} cy={height / 2} r={8} fill={colors.surface} opacity={0.92} />
        <Circle cx={thumbX} cy={height / 2} r={6} fill={colors.action} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
});
