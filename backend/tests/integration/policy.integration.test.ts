import { describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { StellarService } from '../../src/services/stellar.service.js';
import { PolicyService } from '../../src/services/policy.service.js';

describe('Trinqa policy contract (live testnet)', () => {
  const stellar = new StellarService(env);
  const policy = new PolicyService(env, stellar);

  it('reads unconfigured policy as empty view', async () => {
    const { publicKey } = stellar.createRandomKeypair();
    const view = await policy.getPolicy(publicKey);
    expect(view.configured).toBe(false);
    expect(view.accountId).toBe(publicKey);
  });

  it('builds set_policy XDR for funded account', async () => {
    const { publicKey, secretKey } = stellar.createRandomKeypair();
    await stellar.friendbotFund(publicKey);

    const targetTimestamp = BigInt(Math.floor(Date.now() / 1000) + 86_400);
    const built = await policy.buildTransaction({
      action: 'set_policy',
      accountId: publicKey,
      policy: {
        riskProfile: 1,
        targetTimestamp,
        liquidityTargetBps: 2_000,
        automationPaused: false,
        allowedStrategies: ['defindex'],
      },
    });

    expect(built.unsignedXdr.length).toBeGreaterThan(100);
    expect(built.contractId).toMatch(/^C/);

    const signed = stellar.signXdr(built.unsignedXdr, secretKey);
    const submitted = await policy.submitSignedPolicyTx(signed);
    expect(submitted.successful).toBe(true);

    const view = await policy.getPolicy(publicKey);
    expect(view.configured).toBe(true);
    expect(view.riskProfile).toBe(1);
    expect(view.liquidityTargetBps).toBe(2_000);
    expect(view.allowedStrategies).toContain('defindex');
  }, 120_000);
});
