import { describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { StellarService } from '../../src/services/stellar.service.js';
import { PolicyService } from '../../src/services/policy.service.js';
import { strategyIdForVault } from '../../src/domain/yield.js';

describe('Trinqa policy contract authorize_allocation (live testnet, read-only)', () => {
  const stellar = new StellarService(env);
  const policy = new PolicyService(env, stellar);
  // Any C-address shape works: the contract stores strategies as an opaque Symbol alias
  // (see policyStrategySymbol) and never touches the DeFindex vault itself.
  const strategyId = strategyIdForVault('C'.repeat(56));

  it('reports no_policy for a random unfunded/unconfigured account, without signing or submitting anything', async () => {
    const { publicKey } = stellar.createRandomKeypair();

    const result = await policy.adapter.simulateAuthorizeAllocation(publicKey, strategyId, 10_000);

    expect(result).toEqual({ ok: false, reason: 'PolicyNotFound' });
  }, 30_000);

  it('authorizes an allowed strategy, denies a disallowed one, and denies while paused', async () => {
    const { publicKey, secretKey } = stellar.createRandomKeypair();
    await stellar.friendbotFund(publicKey);

    const setPolicy = await policy.buildTransaction({
      action: 'set_policy',
      accountId: publicKey,
      policy: {
        riskProfile: 1,
        targetTimestamp: BigInt(Math.floor(Date.now() / 1000) + 86_400),
        liquidityTargetBps: 2_000,
        automationPaused: false,
        allowedStrategies: [strategyId],
      },
    });
    await policy.submitSignedPolicyTx(stellar.signXdr(setPolicy.unsignedXdr, secretKey));

    const allowed = await policy.adapter.simulateAuthorizeAllocation(publicKey, strategyId, 5_000);
    expect(allowed).toEqual({ ok: true });

    const otherStrategy = strategyIdForVault(`C${'D'.repeat(55)}`);
    const disallowed = await policy.adapter.simulateAuthorizeAllocation(publicKey, otherStrategy, 5_000);
    expect(disallowed).toEqual({ ok: false, reason: 'StrategyNotAllowed' });

    const pause = await policy.buildTransaction({ action: 'pause_automation', accountId: publicKey, paused: true });
    await policy.submitSignedPolicyTx(stellar.signXdr(pause.unsignedXdr, secretKey));

    const paused = await policy.adapter.simulateAuthorizeAllocation(publicKey, strategyId, 5_000);
    expect(paused).toEqual({ ok: false, reason: 'AutomationPaused' });
  }, 120_000);
});
