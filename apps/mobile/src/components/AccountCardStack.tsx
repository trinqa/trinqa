import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { homeTokens } from '@/theme';
import type { AccountSummary } from '@/types';

const STITCH = 'rgba(255,255,255,0.18)';
const BASE_WIDTH = homeTokens.layout.walletBaseWidth;
const BASE_HEIGHT = homeTokens.layout.walletBaseHeight;

interface AccountCardStackProps {
  account: AccountSummary;
  width?: number;
}

/** Decorative wallet visual, proportionally fitted to the Home content width. */
export function AccountCardStack({ account, width = 380 }: AccountCardStackProps) {
  const scale = width / BASE_WIDTH;
  const height = BASE_HEIGHT * scale;

  const outerR = homeTokens.wallet.outerRadius * scale;
  const backX = 19 * scale;
  const backY = 26 * scale;
  const backW = 342 * scale;
  const backH = 100 * scale;
  const backR = 14 * scale;
  const pocketTop = 84 * scale;
  const pocketDip = 114 * scale;
  const frontInset = homeTokens.wallet.frontInset * scale;
  const frontBottom = height - homeTokens.wallet.frontBottomInset * scale;
  const pocketBottomR = homeTokens.wallet.frontRadius * scale;
  const centerX = width / 2;
  const frontWidth = width - frontInset * 2;

  const pocketPath = [
    `M ${frontInset} ${pocketTop}`,
    `C ${frontInset + frontWidth * 0.25} ${pocketTop} ${frontInset + frontWidth * 0.25} ${pocketDip} ${centerX} ${pocketDip}`,
    `C ${frontInset + frontWidth * 0.75} ${pocketDip} ${frontInset + frontWidth * 0.75} ${pocketTop} ${width - frontInset} ${pocketTop}`,
    `L ${width - frontInset} ${frontBottom - pocketBottomR}`,
    `Q ${width - frontInset} ${frontBottom} ${width - frontInset - pocketBottomR} ${frontBottom}`,
    `L ${frontInset + pocketBottomR} ${frontBottom}`,
    `Q ${frontInset} ${frontBottom} ${frontInset} ${frontBottom - pocketBottomR}`,
    'Z',
  ].join(' ');

  const stitchInset = (homeTokens.wallet.frontInset + homeTokens.wallet.stitchInset) * scale;
  const stitchCurveY = pocketTop + homeTokens.wallet.stitchInset * scale;
  const stitchDipY = pocketDip + homeTokens.wallet.stitchCurveInset * scale;
  const stitchRadius = homeTokens.wallet.stitchRadius * scale;
  const stitchBottom = frontBottom - homeTokens.wallet.stitchInset * scale;
  const stitchWidth = width - stitchInset * 2;
  const stitchPath = [
    `M ${stitchInset} ${stitchCurveY}`,
    `C ${stitchInset + stitchWidth * 0.25} ${stitchCurveY} ${stitchInset + stitchWidth * 0.25} ${stitchDipY} ${centerX} ${stitchDipY}`,
    `C ${stitchInset + stitchWidth * 0.75} ${stitchDipY} ${stitchInset + stitchWidth * 0.75} ${stitchCurveY} ${width - stitchInset} ${stitchCurveY}`,
    `L ${width - stitchInset} ${stitchBottom - stitchRadius}`,
    `Q ${width - stitchInset} ${stitchBottom} ${width - stitchInset - stitchRadius} ${stitchBottom}`,
    `L ${stitchInset + stitchRadius} ${stitchBottom}`,
    `Q ${stitchInset} ${stitchBottom} ${stitchInset} ${stitchBottom - stitchRadius}`,
    `L ${stitchInset} ${stitchCurveY}`,
  ].join(' ');

  const pocketEdgePath = [
    `M ${frontInset} ${pocketTop}`,
    `C ${frontInset + frontWidth * 0.25} ${pocketTop} ${frontInset + frontWidth * 0.25} ${pocketDip} ${centerX} ${pocketDip}`,
    `C ${frontInset + frontWidth * 0.75} ${pocketDip} ${frontInset + frontWidth * 0.75} ${pocketTop} ${width - frontInset} ${pocketTop}`,
  ].join(' ');

  const rivetY = 118 * scale;
  const rivetLeft = 31 * scale;
  const rivetRight = 347 * scale;
  const rivetR = 6.5 * scale;

  return (
    <View style={[styles.root, { width, height, borderRadius: outerR }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="walletBody" x1="0%" y1="0%" x2="15%" y2="100%">
            <Stop offset="0%" stopColor="#2B2D33" />
            <Stop offset="100%" stopColor="#1F2125" />
          </LinearGradient>
          <LinearGradient id="silverCard" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#BBC0C1" />
            <Stop offset="55%" stopColor="#ABB1B2" />
            <Stop offset="100%" stopColor="#969C9E" />
          </LinearGradient>
          <LinearGradient id="pocketSurface" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#373C40" />
            <Stop offset="100%" stopColor="#34393D" />
          </LinearGradient>
        </Defs>

        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={outerR}
          ry={outerR}
          fill="url(#walletBody)"
          stroke="#2A2D31"
          strokeWidth={1 * scale}
        />

        <Rect
          x={backX}
          y={backY}
          width={backW}
          height={backH}
          rx={backR}
          ry={backR}
          fill="url(#silverCard)"
        />

        <Path
          d={pocketEdgePath}
          fill="none"
          stroke="#111316"
          strokeLinecap="butt"
          strokeWidth={5.5 * scale}
        />
        <Path d={pocketPath} fill="url(#pocketSurface)" />
        <Path
          d={pocketEdgePath}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeLinecap="round"
          strokeWidth={1.25 * scale}
        />

        <Path
          d={stitchPath}
          fill="none"
          stroke={STITCH}
          strokeWidth={homeTokens.wallet.stitchWidth * scale}
          strokeDasharray={`${homeTokens.wallet.stitchDash * scale} ${homeTokens.wallet.stitchGap * scale}`}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <Circle cx={rivetLeft} cy={rivetY} r={rivetR} fill="#4A4F53" />
        <Circle cx={rivetLeft} cy={rivetY} r={rivetR * 0.45} fill="#2A2D30" />
        <Circle cx={rivetRight} cy={rivetY} r={rivetR} fill="#4A4F53" />
        <Circle cx={rivetRight} cy={rivetY} r={rivetR * 0.45} fill="#2A2D30" />
      </Svg>

      <View
        style={[
          styles.backContent,
          {
            left: backX + 22 * scale,
            top: backY + 18 * scale,
            width: backW - 38 * scale,
          },
        ]}
      >
        <Text style={[styles.backLabel, { fontSize: 15 * scale }]}>{account.accountName}</Text>
        <Text style={[styles.backId, { fontSize: 13 * scale }]}>•••• 2847</Text>
      </View>

      <View
        style={[
          styles.pocketContent,
          {
            top: 186.5 * scale,
            left: 28 * scale,
            right: 25 * scale,
          },
        ]}
      >
        <Text style={[styles.cardLabel, { fontSize: 12 * scale }]}>{account.cardLabel}</Text>
        <View style={styles.balanceRow}>
          <Text style={[styles.currency, { fontSize: 17 * scale }]}>{account.displayCurrency}</Text>
          <Text style={[styles.balance, { fontSize: 25.5 * scale }]}>{account.balance}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
  },
  backContent: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backLabel: {
    fontWeight: '500',
    color: '#F6F6F6',
  },
  backId: {
    fontWeight: '500',
    color: '#F2F3F3',
    letterSpacing: 0.3,
  },
  pocketContent: {
    position: 'absolute',
  },
  cardLabel: {
    color: '#D4D6D7',
    marginBottom: 5,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    color: '#FFFFFF',
    fontWeight: '500',
    marginRight: 4,
  },
  balance: {
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
});
