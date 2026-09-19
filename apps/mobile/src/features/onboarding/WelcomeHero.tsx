import { useEffect, useState } from 'react';

import { Image, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { welcomePalette as palette } from '@/features/onboarding/welcomePalette';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** One slow drifting light. Durations are long on purpose — this must never feel busy. */
function Orb({
  color,
  size,
  start,
  travel,
  durationMs,
  scaleTo,
}: {
  color: string;
  size: number;
  start: { left?: number; right?: number; top?: number; bottom?: number };
  travel: { x: number; y: number };
  durationMs: number;
  scaleTo: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [durationMs, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * travel.x },
      { translateY: progress.value * travel.y },
      { scale: 1 + progress.value * (scaleTo - 1) },
    ],
  }));

  const gradientId = `orb-${color.replace(/[^a-z0-9]/gi, '')}-${size}`;

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, ...start }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          {/* A long, shallow falloff stands in for a blur — SVG filters are too costly here. */}
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.8} />
            <Stop offset="28%" stopColor={color} stopOpacity={0.42} />
            <Stop offset="55%" stopColor={color} stopOpacity={0.16} />
            <Stop offset="78%" stopColor={color} stopOpacity={0.04} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
}

const CURVE = 'M2,40 C34,38 52,30 78,27 C104,24 120,26 146,19 C172,12 196,10 234,4';
/** Measured arc length of CURVE. A wrong value desyncs the line from its leading dot. */
const CURVE_LENGTH = 235.1;
const CURVE_VIEWBOX = { width: 240, height: 46 };
const DRAW_MS = 16000;
const HOLD_MS = 7000;

/** The yield curve draws itself, rests, then starts over. */
function YieldCurve({ width }: { width: number }) {
  const draw = useSharedValue(0);

  useEffect(() => {
    draw.value = withRepeat(
      withSequence(
        withTiming(1, { duration: DRAW_MS, easing: Easing.inOut(Easing.cubic) }),
        withDelay(HOLD_MS, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );
  }, [draw]);

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: CURVE_LENGTH * (1 - draw.value),
  }));

  // The dot is a zero-length round dash riding the same path, so it can never drift off the line.
  const headProps = useAnimatedProps(() => ({
    strokeDashoffset: -CURVE_LENGTH * draw.value,
    opacity: draw.value === 0 ? 0 : 1,
  }));

  const height = width > 0 ? (width * CURVE_VIEWBOX.height) / CURVE_VIEWBOX.width : 0;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${CURVE_VIEWBOX.width} ${CURVE_VIEWBOX.height}`}
      style={styles.curve}
    >
      <AnimatedPath
        d={CURVE}
        fill="none"
        stroke={palette.green}
        strokeOpacity={0.3}
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={CURVE_LENGTH}
        animatedProps={lineProps}
      />
      <AnimatedPath
        d={CURVE}
        fill="none"
        stroke={palette.green}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={CURVE_LENGTH}
        animatedProps={lineProps}
      />
      <AnimatedPath
        d={CURVE}
        fill="none"
        stroke={palette.green}
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={[0.01, CURVE_LENGTH]}
        animatedProps={headProps}
      />
    </Svg>
  );
}

const START_BALANCE = 1240;
const TICK_MS = 900;

/** A balance that accrues while you look at it. Illustrative — no account exists yet. */
function TickingBalance() {
  const [value, setValue] = useState(START_BALANCE);

  useEffect(() => {
    const timer = setInterval(() => {
      setValue((current) => current + 0.01 + Math.random() * 0.02);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <Text style={styles.amount}>
      {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
    </Text>
  );
}

interface WelcomeHeroProps {
  logo: number;
  isCreating: boolean;
}

export function WelcomeHero({ logo, isCreating }: WelcomeHeroProps) {
  const [contentWidth, setContentWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setContentWidth(event.nativeEvent.layout.width);

  return (
    <View style={styles.hero}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Orb
          color={palette.action}
          size={230}
          start={{ left: -60, top: -30 }}
          travel={{ x: 170, y: 150 }}
          durationMs={36000}
          scaleTo={1.35}
        />
        <Orb
          color={palette.blue}
          size={200}
          start={{ right: -50, top: 70 }}
          travel={{ x: -160, y: 120 }}
          durationMs={42000}
          scaleTo={0.75}
        />
        <Orb
          color={palette.green}
          size={180}
          start={{ left: 40, bottom: -60 }}
          travel={{ x: 130, y: -165 }}
          durationMs={39000}
          scaleTo={1.4}
        />
      </View>

      {/* Without a scrim the white type sits on moving light and stops being readable. */}
      <View style={styles.scrim} pointerEvents="none" />
      <Svg style={styles.fade} pointerEvents="none">
        <Defs>
          <LinearGradient id="heroFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={palette.background} stopOpacity={0} />
            <Stop offset="92%" stopColor={palette.background} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroFade)" />
      </Svg>

      <View style={styles.content}>
        <Image source={logo} style={styles.mark} resizeMode="contain" />
        <View style={styles.spacer} />
        {/* onLayout sits on the inner block so the chart is measured inside the padding. */}
        <View onLayout={onLayout}>
          {isCreating ? null : (
            <>
              <Text style={styles.label}>YOUR BALANCE</Text>
              <TickingBalance />
              <View style={styles.pill}>
                <Text style={styles.pillText}>▲ 5.0% APY · earning now</Text>
              </View>
              <YieldCurve width={contentWidth} />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    overflow: 'hidden',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,10,10,0.5)',
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
  },
  content: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 24,
  },
  spacer: {
    flex: 1,
  },
  mark: {
    width: 44,
    height: 44,
  },
  label: {
    color: palette.kicker,
    fontSize: 11.5,
    letterSpacing: 0.7,
    marginBottom: 3,
  },
  amount: {
    color: palette.title,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  pill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,214,145,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(0,214,145,0.25)',
  },
  pillText: {
    color: palette.green,
    fontSize: 12.5,
    fontWeight: '500',
  },
  curve: {
    marginTop: 12,
  },
});
