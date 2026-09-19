#!/usr/bin/env npx tsx
/**
 * End-to-end TR Mock Anchor smoke (testnet): SEP-1/6/10/38 + TRY on-ramp + USDC off-ramp.
 * Run: pnpm --dir backend e2e:anchor
 */

process.env.ENABLE_MOCK_BANK_TRANSFER = process.env.ENABLE_MOCK_BANK_TRANSFER ?? 'true';

function log(step: string, detail?: unknown) {
  console.log(`\n[${step}]`, detail ?? '');
}

function fail(message: string): never {
  console.error(`\n[e2e-anchor FAIL] ${message}`);
  process.exit(1);
}

function usdcBalance(balances: Awaited<ReturnType<import('../backend/src/services/stellar.service.js').StellarService['getBalances']>>): number {
  const line = balances.find((b) => b.assetCode === 'USDC');
  return Number(line?.balance ?? '0');
}

type Sep6TxBody = {
  transaction?: {
    status?: string;
    stellar_transaction_id?: string | null;
  };
};

async function pollSep6Completed(
  anchor: import('../backend/src/adapters/tr-mock-anchor.adapter.js').TrMockAnchorAdapter,
  token: string,
  id: string,
  label: string,
  timeoutMs = 120_000,
): Promise<{ stellarTxHash?: string }> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const body = (await anchor.sep6Transaction(token, id)) as Sep6TxBody;
    const status = body.transaction?.status;
    log(`${label} poll`, { id, status });
    if (status === 'completed') {
      return { stellarTxHash: body.transaction?.stellar_transaction_id ?? undefined };
    }
    if (status === 'error' || status === 'refunded') {
      fail(`${label} ended with status ${status}`);
    }
    await new Promise((r) => setTimeout(r, 2_500));
  }
  fail(`${label} timed out after ${timeoutMs}ms`);
}

async function resolveTrySellAmount(
  anchor: import('../backend/src/adapters/tr-mock-anchor.adapter.js').TrMockAnchorAdapter,
  token: string,
  usdcIssuer: string,
): Promise<string> {
  const info = (await anchor.sep6Info()) as {
    deposit?: { USDC?: { min_amount?: number; max_amount?: number } };
  };
  const min = info.deposit?.USDC?.min_amount;
  const max = info.deposit?.USDC?.max_amount;
  log('SEP-6 deposit limits (USDC rail, TRY amounts)', { min, max });

  const candidates = ['100', '1000'];
  for (const sellAmount of candidates) {
    try {
      await anchor.sep38Quote(token, {
        sellAsset: 'iso4217:TRY',
        buyAsset: `stellar:USDC:${usdcIssuer}`,
        sellAmount,
      });
      log('SEP-38 quote amount selected', { sellAmountTry: sellAmount });
      return sellAmount;
    } catch (err) {
      log('SEP-38 quote rejected', {
        sellAmountTry: sellAmount,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  fail('Could not obtain SEP-38 quote for 100 or 1000 TRY');
}

async function main() {
  const { env, isDemoSignerAvailable } = await import('../backend/src/config/env.js');
  const { StellarService } = await import('../backend/src/services/stellar.service.js');
  const { TrMockAnchorAdapter } = await import('../backend/src/adapters/tr-mock-anchor.adapter.js');

  log('config', {
    network: env.STELLAR_NETWORK,
    anchor: env.TR_ANCHOR_DOMAIN,
    usdcIssuer: env.USDC_ISSUER,
    mockBankTransfer: process.env.ENABLE_MOCK_BANK_TRANSFER,
    demoSigner: isDemoSignerAvailable(),
  });

  const stellar = new StellarService(env);
  const anchor = new TrMockAnchorAdapter(env, stellar.networkPassphrase);

  log('SEP-1 discover');
  console.log(await anchor.discover());

  log('anchor health');
  console.log(await anchor.health());

  log('SEP-6 info');
  console.log(await anchor.sep6Info());

  log('SEP-38 info');
  console.log(await anchor.sep38Info());

  let publicKey: string;
  let secretKey: string;
  if (isDemoSignerAvailable() && env.DEMO_SIGNER_SECRET) {
    secretKey = env.DEMO_SIGNER_SECRET;
    publicKey = stellar.publicKeyFromSecret(secretKey);
    log('account (demo signer)', { publicKey });
    if (!(await stellar.accountExists(publicKey))) {
      log('friendbot (demo account)');
      console.log(await stellar.friendbotFund(publicKey));
    }
  } else {
    log('create test account');
    ({ publicKey, secretKey } = stellar.createRandomKeypair());
    console.log({ publicKey });
    log('friendbot');
    console.log(await stellar.friendbotFund(publicKey));
  }

  const balancesBeforeTrust = await stellar.getBalances(publicKey);
  if (!stellar.hasUsdcTrustline(balancesBeforeTrust)) {
    log('USDC trustline');
    const unsigned = await stellar.buildUsdcTrustlineXdr(publicKey);
    const signed = stellar.signXdr(unsigned, secretKey);
    console.log(await stellar.submitSignedXdr(signed));
  }

  log('SEP-10');
  const { token } = await anchor.sep10Authenticate(secretKey);
  console.log({ tokenPreview: `${token.slice(0, 20)}...` });

  const tryAmount = await resolveTrySellAmount(anchor, token, env.USDC_ISSUER);

  log(`SEP-38 quote (${tryAmount} TRY -> USDC)`);
  const quote = await anchor.sep38Quote(token, {
    sellAsset: 'iso4217:TRY',
    buyAsset: `stellar:USDC:${env.USDC_ISSUER}`,
    sellAmount: tryAmount,
  });
  console.log(quote);

  const usdcBefore = usdcBalance(await stellar.getBalances(publicKey));
  log('USDC balance before deposit', { usdcBefore });

  log('SEP-6 deposit (TRY bank transfer -> USDC)');
  const depositSession = (await anchor.sep6Deposit(token, {
    asset_code: 'USDC',
    account: publicKey,
    amount: tryAmount,
    quote_id: quote.id,
  })) as { id: string };
  console.log(depositSession);

  log('simulate-bank-transfer');
  console.log(await anchor.sep6SimulateBankTransfer(token, depositSession.id));

  const depositDone = await pollSep6Completed(anchor, token, depositSession.id, 'deposit');
  log('deposit stellar tx', depositDone);

  const usdcAfterDeposit = usdcBalance(await stellar.getBalances(publicKey));
  log('USDC balance after deposit', { usdcAfterDeposit });
  if (usdcAfterDeposit <= usdcBefore) {
    fail(`USDC balance did not increase (${usdcBefore} -> ${usdcAfterDeposit})`);
  }

  const withdrawUsdc = '1.0000000';
  const withdrawDest = 'TR890009903460061605055303';

  log('SEP-6 withdraw (USDC -> TRY)');
  const withdrawSession = (await anchor.sep6Withdraw(token, {
    asset_code: 'USDC',
    account: publicKey,
    amount: withdrawUsdc,
    dest: withdrawDest,
  })) as {
    id: string;
    account_id: string;
    memo_type: string;
    memo: string;
  };
  console.log(withdrawSession);

  if (withdrawSession.memo_type !== 'id') {
    fail(`Expected memo_type id, got ${withdrawSession.memo_type}`);
  }

  log('Stellar payment to anchor treasury (Memo.id)');
  const paymentUnsigned = await stellar.buildUsdcPaymentWithMemoIdXdr(
    publicKey,
    withdrawSession.account_id,
    withdrawUsdc,
    withdrawSession.memo,
  );
  const paymentSubmit = await stellar.submitSignedXdr(stellar.signXdr(paymentUnsigned, secretKey));
  console.log(paymentSubmit);
  if (!paymentSubmit.successful) {
    fail('Withdrawal funding payment failed');
  }

  const withdrawDone = await pollSep6Completed(anchor, token, withdrawSession.id, 'withdraw');
  log('withdraw stellar tx', withdrawDone);

  log('done', {
    result: 'e2e-anchor OK',
    tryDepositAmount: tryAmount,
    depositId: depositSession.id,
    depositStellarTx: depositDone.stellarTxHash,
    withdrawId: withdrawSession.id,
    withdrawPaymentTx: paymentSubmit.hash,
    withdrawStellarTx: withdrawDone.stellarTxHash,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
