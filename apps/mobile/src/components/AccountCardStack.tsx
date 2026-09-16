import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { AccountSummary } from '@/types';

const SLEEVE = '#1B1C20';
const POCKET = '#33383C';
const STITCH = 'rgba(255,255,255,0.18)';

interface AccountCardStackProps {
  account: AccountSummary;
  width?: number;
}

/** Wallet visual target: 380×262 on 402pt width. */
export function AccountCardStack({ account, width = 380 }: AccountCardStackProps) {
  const height = 262;
  const scale = width / 380;

  const outerR = 22 * scale;
  const backX = 19 * scale;
  const backY = 26 * scale;
  const backW = 342 * scale;
  const backH = 100 * scale;
  const backR = 14 * scale;
  const pocketTop = 84 * scale;
  const pocketDip = 107 * scale;
  const pocketBottomR = 20 * scale;
  const centerX = width / 2;

  const pocketPath = [
    `M 0 ${pocketTop}`,
    `C ${width * 0.25} ${pocketTop} ${width * 0.25} ${pocketDip} ${centerX} ${pocketDip}`,
    `C ${width * 0.75} ${pocketDip} ${width * 0.75} ${pocketTop} ${width} ${pocketTop}`,
    `L ${width} ${height - pocketBottomR}`,
    `Q ${width} ${height} ${width - pocketBottomR} ${height}`,
    `L ${pocketBottomR} ${height}`,
    `Q 0 ${height} 0 ${height - pocketBottomR}`,
    'Z',
  ].join(' ');

  const stitchInset = 8 * scale;
  const stitchPath = [
    `M ${stitchInset} ${pocketTop + stitchInset}`,
    `C ${width * 0.25} ${pocketTop + stitchInset} ${width * 0.25} ${pocketDip - 2 * scale} ${centerX} ${pocketDip - 2 * scale}`,
    `C ${width * 0.75} ${pocketDip - 2 * scale} ${width * 0.75} ${pocketTop + stitchInset} ${width - stitchInset} ${pocketTop + stitchInset}`,
    `L ${width - stitchInset} ${height - pocketBottomR - stitchInset}`,
    `L ${stitchInset} ${height - pocketBottomR - stitchInset}`,
    'Z',
  ].join(' ');

  const rivetY = 118 * scale;
  const rivetLeft = 31 * scale;
  const rivetRight = 347 * scale;
  const rivetR = 3.5 * scale;

  return (
    <View style={[styles.root, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="silverCard" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#E2E2E2" />
            <Stop offset="100%" stopColor="#C4C4C4" />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={width} height={height} rx={outerR} ry={outerR} fill={SLEEVE} />

        <Rect
          x={backX}
          y={backY}
          width={backW}
          height={backH}
          rx={backR}
          ry={backR}
          fill="url(#silverCard)"
        />

        <Path d={pocketPath} fill={POCKET} />

        <Path
          d={stitchPath}
          fill="none"
          stroke={STITCH}
          strokeWidth={1}
          strokeDasharray="3 4"
        />

        <Circle cx={rivetLeft} cy={rivetY} r={rivetR} fill="#4A4F53" />
        <Circle cx={rivetLeft} cy={rivetY} r={rivetR * 0.45} fill="#2A2D30" />
        <Circle cx={rivetRight} cy={rivetY} r={rivetR} fill="#4A4F53" />
        <Circle cx={rivetRight} cy={rivetY} r={rivetR * 0.45} fill="#2A2D30" />
      </Svg>

      <View style={[styles.backContent, { left: backX + 16 * scale, top: backY + 14 * scale, width: backW - 32 * scale }]}>
        <Text style={styles.backLabel}>{account.accountName}</Text>
        <Text style={styles.backId}>•••• 2847</Text>
      </View>

      <View style={[styles.pocketContent, { top: 185 * scale, left: 24 * scale, right: 24 * scale }]}>
        <Text style={styles.cardLabel}>{account.cardLabel}</Text>
        <Text style={styles.balance}>
          {account.displayCurrency}
          {account.balance}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
  },
  backContent: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
  },
  backId: {
    fontSize: 11,
    fontWeight: '500',
    color: '#888888',
    letterSpacing: 0.3,
  },
  pocketContent: {
    position: 'absolute',
  },
  cardLabel: {
    fontSize: 12,
    color: '#B0B0B0',
    marginBottom: 7,
  },
  balance: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
});
