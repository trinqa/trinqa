import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { homeTokens, typeWeightRn, typography, walletColors, walletShadow } from '@/theme';
import type { AccountSummary } from '@/types';

const STITCH = walletColors.stitch;
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
  const bodyStrokeWidth = 1 * scale;
  const bodyStrokeInset = bodyStrokeWidth / 2;
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
    `A ${pocketBottomR} ${pocketBottomR} 0 0 1 ${width - frontInset - pocketBottomR} ${frontBottom}`,
    `L ${frontInset + pocketBottomR} ${frontBottom}`,
    `A ${pocketBottomR} ${pocketBottomR} 0 0 1 ${frontInset} ${frontBottom - pocketBottomR}`,
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
    `A ${stitchRadius} ${stitchRadius} 0 0 1 ${width - stitchInset - stitchRadius} ${stitchBottom}`,
    `L ${stitchInset + stitchRadius} ${stitchBottom}`,
    `A ${stitchRadius} ${stitchRadius} 0 0 1 ${stitchInset} ${stitchBottom - stitchRadius}`,
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
            <Stop offset="0%" stopColor={walletColors.bodyStart} />
            <Stop offset="100%" stopColor={walletColors.bodyEnd} />
          </LinearGradient>
          <LinearGradient id="silverCard" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={walletColors.silver0} />
            <Stop offset="55%" stopColor={walletColors.silver55} />
            <Stop offset="100%" stopColor={walletColors.silver100} />
          </LinearGradient>
          <LinearGradient id="pocketSurface" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={walletColors.pocket0} />
            <Stop offset="100%" stopColor={walletColors.pocket100} />
          </LinearGradient>
        </Defs>

        <Rect
          x={bodyStrokeInset}
          y={bodyStrokeInset}
          width={width - bodyStrokeWidth}
          height={height - bodyStrokeWidth}
          rx={outerR - bodyStrokeInset}
          ry={outerR - bodyStrokeInset}
          fill="url(#walletBody)"
          stroke={walletColors.bodyStroke}
          strokeWidth={bodyStrokeWidth}
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
          stroke={walletColors.pocketEdge}
          strokeLinecap="butt"
          strokeWidth={5.5 * scale}
        />
        <Path d={pocketPath} fill="url(#pocketSurface)" />
        <Path
          d={pocketEdgePath}
          fill="none"
          stroke={walletColors.pocketHighlight}
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

        <Circle cx={rivetLeft} cy={rivetY} r={rivetR} fill={walletColors.rivet} />
        <Circle cx={rivetLeft} cy={rivetY} r={rivetR * 0.45} fill={walletColors.rivetCore} />
        <Circle cx={rivetRight} cy={rivetY} r={rivetR} fill={walletColors.rivet} />
        <Circle cx={rivetRight} cy={rivetY} r={rivetR * 0.45} fill={walletColors.rivetCore} />
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
        <Text style={[styles.backLabel, { fontSize: typography.label * scale }]}>{account.accountName}</Text>
        <Text style={[styles.backId, { fontSize: typography.caption * scale }]}>•••• 2847</Text>
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
        <Text style={[styles.cardLabel, { fontSize: typography.footnote * scale }]}>{account.cardLabel}</Text>
        <View style={styles.balanceRow}>
          <Text style={[styles.currency, { fontSize: typography.label * scale }]}>{account.displayCurrency}</Text>
          <Text style={[styles.balance, { fontSize: homeTokens.wallet.balanceTypeSize * scale }]}>{account.balance}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    shadowColor: walletShadow.color,
    shadowOffset: { width: walletShadow.offsetX, height: walletShadow.offsetY },
    shadowOpacity: walletShadow.opacity,
    shadowRadius: walletShadow.radius,
  },
  backContent: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backLabel: {
    fontWeight: typeWeightRn.medium,
    color: walletColors.textPrimary,
  },
  backId: {
    fontWeight: typeWeightRn.medium,
    color: walletColors.textSecondary,
    letterSpacing: homeTokens.wallet.idTracking,
  },
  pocketContent: {
    position: 'absolute',
  },
  cardLabel: {
    color: walletColors.textTertiary,
    marginBottom: homeTokens.wallet.labelToBalance,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    color: walletColors.textInverse,
    fontWeight: typeWeightRn.medium,
    marginRight: homeTokens.wallet.currencyGap,
  },
  balance: {
    fontWeight: typeWeightRn.bold,
    color: walletColors.textInverse,
    letterSpacing: homeTokens.wallet.balanceTracking,
  },
});
