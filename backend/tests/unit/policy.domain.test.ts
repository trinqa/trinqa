import { describe, expect, it } from 'vitest';
import {
  policyBuildActionSchema,
  policyStrategySymbol,
  policyViewFromNative,
  userPolicyInputSchema,
} from '../../src/domain/policy.js';

describe('policyStrategySymbol', () => {
  const vault = 'CBSHFPAW56ZRV7DBSC6GYOD7IOMTDJJY3MCVW5RONTWL33MHTXOML7LA';

  it('maps a DeFindex strategy id to a stable on-chain Symbol (<= 32 bytes)', () => {
    const symbol = policyStrategySymbol(`defindex:${vault}`);
    expect(symbol).toBe('dfx_CBSHFPAW56ZR');
    expect(symbol.length).toBeLessThanOrEqual(32);
    expect(policyStrategySymbol(`defindex:${vault}`)).toBe(symbol);
  });

  it('passes short symbol-safe names through', () => {
    expect(policyStrategySymbol('soroswap')).toBe('soroswap');
    expect(policyStrategySymbol('dfx_CBSHFPAW56ZR')).toBe('dfx_CBSHFPAW56ZR');
  });

  it('rejects anything that cannot be a Soroban Symbol', () => {
    expect(() => policyStrategySymbol('x'.repeat(33))).toThrow(/Symbol/);
    expect(() => policyStrategySymbol('has space')).toThrow(/Symbol/);
  });
});

describe('policy domain', () => {
  it('validates set_policy build payload', () => {
    const parsed = policyBuildActionSchema.parse({
      action: 'set_policy',
      accountId: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      policy: {
        riskProfile: 1,
        targetTimestamp: '1893456000',
        liquidityTargetBps: 1500,
        automationPaused: false,
        allowedStrategies: ['defindex'],
      },
    });
    expect(parsed.action).toBe('set_policy');
  });

  it('rejects liquidity bps above 10000', () => {
    expect(() =>
      userPolicyInputSchema.parse({
        riskProfile: 0,
        targetTimestamp: 1n,
        liquidityTargetBps: 10_001,
        automationPaused: false,
        allowedStrategies: [],
      }),
    ).toThrow();
  });

  it('maps native contract struct to API view', () => {
    const view = policyViewFromNative('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', {
      value: {
        risk_profile: 2,
        target_timestamp: 1893456000n,
        liquidity_target_bps: 500,
        automation_paused: true,
        allowed_strategies: ['defindex', 'blend'],
      },
    });
    expect(view.configured).toBe(true);
    expect(view.riskProfile).toBe(2);
    expect(view.allowedStrategies).toEqual(['defindex', 'blend']);
  });
});
