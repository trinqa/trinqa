/**
 * Fund a throwaway testnet account with native XLM, USDC trustline, and TRY→USDC on-ramp.
 * Never log or persist secret keys or JWTs.
 */

import type { AppConfig } from '../../backend/src/config/env.js';
import type { StellarService } from '../../backend/src/services/stellar.service.js';
import type { TrMockAnchorAdapter } from '../../backend/src/adapters/tr-mock-anchor.adapter.js';

export type TestnetKeypair = { publicKey: string; secretKey: string };

export type FundedUsdcFixture = {
  publicKey: string;
  usdcBalanceAfter: string;
};

function usdcBalance(
  balances: Awaited<ReturnType<StellarService['getBalances']>>,
  usdcIssuer: string,
): number {
  const line = balances.find((b) => b.assetCode === 'USDC' && b.assetIssuer === usdcIssuer);
  return Number(line?.balance ?? '0');
}

async function pollSep6Completed(
  anchor: TrMockAnchorAdapter,
  token: string,
  id: string,
  timeoutMs = 120_000,
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const body = (await anchor.sep6Transaction(token, id)) as {
      transaction?: { status?: string };
    };
    const status = body.transaction?.status;
    if (status === 'completed') return;
    if (status === 'error' || status === 'refunded') {
      throw new Error(`Anchor transfer ${id} failed: ${status}`);
    }
    await new Promise((r) => setTimeout(r, 2_500));
  }
  throw new Error(`Anchor transfer ${id} timed out`);
}

async function resolveTrySellAmount(
  anchor: TrMockAnchorAdapter,
  token: string,
  usdcIssuer: string,
  preferredTry = '500',
): Promise<string> {
  const candidates = [preferredTry, '100', '1000'];
  for (const sellAmount of candidates) {
    try {
      await anchor.sep38Quote(token, {
        sellAsset: 'iso4217:TRY',
        buyAsset: `stellar:USDC:${usdcIssuer}`,
        sellAmount,
      });
      return sellAmount;
    } catch {
      // try next
    }
  }
  throw new Error('Could not obtain SEP-38 TRY→USDC quote');
}

export async function fundTestnetUsdcAccount(params: {
  stellar: StellarService;
  anchor: TrMockAnchorAdapter;
  env: AppConfig;
  keypair: TestnetKeypair;
  tryAmount?: string;
  skipAnchorOnRamp?: boolean;
}): Promise<FundedUsdcFixture> {
  const { stellar, anchor, env, keypair } = params;
  const publicKey = keypair.publicKey;

  await stellar.friendbotFund(publicKey);
  const trustUnsigned = await stellar.buildUsdcTrustlineXdr(publicKey);
  await stellar.submitSignedXdr(stellar.signXdr(trustUnsigned, keypair.secretKey));

  const before = usdcBalance(await stellar.getBalances(publicKey), env.USDC_ISSUER);
  if (params.skipAnchorOnRamp) {
    return { publicKey, usdcBalanceAfter: String(before) };
  }

  const { token } = await anchor.sep10Authenticate(keypair.secretKey);
  const tryAmount = await resolveTrySellAmount(anchor, token, env.USDC_ISSUER, params.tryAmount ?? '500');
  const quote = await anchor.sep38Quote(token, {
    sellAsset: 'iso4217:TRY',
    buyAsset: `stellar:USDC:${env.USDC_ISSUER}`,
    sellAmount: tryAmount,
  });

  const deposit = (await anchor.sep6Deposit(token, {
    asset_code: 'USDC',
    account: publicKey,
    amount: tryAmount,
    quote_id: quote.id,
  })) as { id: string };

  if (process.env.ENABLE_MOCK_BANK_TRANSFER !== 'false') {
    await anchor.sep6SimulateBankTransfer(token, deposit.id);
  }
  await pollSep6Completed(anchor, token, deposit.id);

  const after = usdcBalance(await stellar.getBalances(publicKey), env.USDC_ISSUER);
  if (after <= before) {
    throw new Error(`USDC balance did not increase after anchor on-ramp (${before} -> ${after})`);
  }

  return {
    publicKey,
    usdcBalanceAfter: String(after),
  };
}
