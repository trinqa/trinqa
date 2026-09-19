import { describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { StellarService } from '../../src/services/stellar.service.js';
import { TrMockAnchorAdapter } from '../../src/adapters/tr-mock-anchor.adapter.js';
import { DefindexYieldAdapter } from '../../src/adapters/defindex-yield.adapter.js';
import { SoroswapAdapter } from '../../src/adapters/soroswap.adapter.js';
import { PolicyService } from '../../src/services/policy.service.js';
import { CapabilityService } from '../../src/services/capability.service.js';

describe('CapabilityService', () => {
  const stellar = new StellarService(env);
  const svc = new CapabilityService(
    env,
    new TrMockAnchorAdapter(env, stellar.networkPassphrase),
    new DefindexYieldAdapter(env),
    new SoroswapAdapter(env, stellar.networkPassphrase),
    new PolicyService(env, stellar),
  );

  it('marks BRL unsupported', () => {
    expect(svc.payoutRailFor('BRL')).toEqual({
      available: false,
      reason: 'NO_SUPPORTED_PAYOUT_RAIL',
    });
  });

  it('allows TRY anchor rail', () => {
    expect(svc.payoutRailFor('TRY').available).toBe(true);
  });
});
