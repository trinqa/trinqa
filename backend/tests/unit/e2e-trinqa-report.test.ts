import { describe, expect, it } from 'vitest';
import {
  initialPartnerLegStatus,
  isFullLifecyclePass,
} from '../../../scripts/lib/e2e-trinqa-report.ts';

describe('e2e-trinqa report', () => {
  it('starts partner legs BLOCKED without keys', () => {
    const { report, blockers } = initialPartnerLegStatus({});
    expect(report.DeFindex).toBe('BLOCKED');
    expect(report.Soroswap).toBe('BLOCKED');
    expect(report['Earn-funded payment']).toBe('BLOCKED');
    expect(blockers.length).toBeGreaterThan(0);
  });

  it('does not treat BLOCKED partner legs as full lifecycle PASS', () => {
    const report = {
      Anchor: 'PASS' as const,
      Policy: 'PASS' as const,
      DeFindex: 'BLOCKED' as const,
      Soroswap: 'BLOCKED' as const,
      'Earn-funded payment': 'BLOCKED' as const,
    };
    expect(isFullLifecyclePass(report)).toBe(false);
  });

  it('requires all legs PASS for full lifecycle', () => {
    const report = {
      Anchor: 'PASS' as const,
      Policy: 'PASS' as const,
      DeFindex: 'PASS' as const,
      Soroswap: 'PASS' as const,
      'Earn-funded payment': 'PASS' as const,
    };
    expect(isFullLifecyclePass(report)).toBe(true);
  });
});
