#!/usr/bin/env npx tsx
/**
 * Keyless Trinqa core demo: anchor on-ramp, policy write, USDC P2P pay, TRY off-ramp.
 * Exit 0 on PASS. No partner API keys required.
 */

process.env.ENABLE_MOCK_BANK_TRANSFER = process.env.ENABLE_MOCK_BANK_TRANSFER ?? 'true';

import { stageLog } from './lib/stage-log.ts';
import { saveEvidence, type PublicEvidence } from './lib/evidence.ts';
import { fundRecipientWithUsdcTrustline } from './lib/recipient-usdc-trustline.ts';

const TOTAL = 8;

function usdcBalance(
  balances: Awaited<ReturnType<import('../backend/src/services/stellar.service.js').StellarService['getBalances']>>,
  issuer: string,
): number {
  const line = balances.find((b) => b.assetCode === 'USDC' && b.assetIssuer === issuer);
  return Number(line?.balance ?? '0');
}

async function pollSep6Completed(
  anchor: import('../backend/src/adapters/tr-mock-anchor.adapter.js').TrMockAnchorAdapter,
  token: string,
  id: string,
  timeoutMs = 120_000,
): Promise<{ stellarTxHash?: string }> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const body = (await anchor.sep6Transaction(token, id)) as {
      transaction?: { status?: string; stellar_transaction_id?: string | null };
    };
    const status = body.transaction?.status;
    if (status === 'completed') {
      return { stellarTxHash: body.transaction?.stellar_transaction_id ?? undefined };
    }
    if (status === 'error' || status === 'refunded') {
      throw new Error(`Transfer ${id} failed: ${status}`);
    }
    await new Promise((r) => setTimeout(r, 2_500));
  }
  throw new Error(`Transfer ${id} timed out`);
}

async function main() {
  const { env } = await import('../backend/src/config/env.js');
  const { loadTestnetDeployment } = await import('../backend/src/config/deployments.js');
  const { buildApp } = await import('../backend/src/app.js');
  const { PolicyService } = await import('../backend/src/services/policy.service.js');

  const deployment = loadTestnetDeployment();
  const evidence: PublicEvidence = {
    run: 'e2e-core',
    network: env.STELLAR_NETWORK,
    timestamp: new Date().toISOString(),
    status: 'FAIL',
    accounts: {},
    contractIds: { policy: deployment.contractId },
    quoteIds: {},
    transferIds: {},
    txHashes: {},
  };

  const { app, stellar, anchor, paymentRouter, anchorSessions } = await buildApp();
  const policy = new PolicyService(env, stellar);

  try {
    stageLog(1, TOTAL, 'Fund payer + USDC trustline', 'PASS');
    const kp = stellar.createRandomKeypair();
    await stellar.friendbotFund(kp.publicKey);
    const trustUnsigned = await stellar.buildUsdcTrustlineXdr(kp.publicKey);
    await stellar.submitSignedXdr(stellar.signXdr(trustUnsigned, kp.secretKey));
    evidence.accounts!.payer = kp.publicKey;

    stageLog(2, TOTAL, 'SEP-10 auth', 'PASS');
    const { token } = await anchor.sep10Authenticate(kp.secretKey);
    const session = anchorSessions.create(token, kp.publicKey);

    stageLog(3, TOTAL, 'SEP-38 + SEP-6 TRY→USDC deposit', 'PASS');
    const tryAmount = '500';
    const depositQuote = await anchor.sep38Quote(token, {
      sellAsset: 'iso4217:TRY',
      buyAsset: `stellar:USDC:${env.USDC_ISSUER}`,
      sellAmount: tryAmount,
    });
    evidence.quoteIds!.deposit = depositQuote.id;
    const beforeUsdc = usdcBalance(await stellar.getBalances(kp.publicKey), env.USDC_ISSUER);
    const deposit = (await anchor.sep6Deposit(token, {
      asset_code: 'USDC',
      account: kp.publicKey,
      amount: tryAmount,
      quote_id: depositQuote.id,
    })) as { id: string };
    evidence.transferIds!.deposit = deposit.id;
    await anchor.sep6SimulateBankTransfer(token, deposit.id);
    const depositDone = await pollSep6Completed(anchor, token, deposit.id);
    evidence.txHashes!.deposit = depositDone.stellarTxHash ?? 'unknown';
    const afterUsdc = usdcBalance(await stellar.getBalances(kp.publicKey), env.USDC_ISSUER);
    if (afterUsdc <= beforeUsdc) {
      throw new Error('USDC balance did not increase after deposit');
    }

    stageLog(4, TOTAL, 'Policy set + read', 'PASS');
    const targetTimestamp = BigInt(Math.floor(Date.now() / 1000) + 172_800);
    const builtPolicy = await policy.buildTransaction({
      action: 'set_policy',
      accountId: kp.publicKey,
      policy: {
        riskProfile: 1,
        targetTimestamp,
        liquidityTargetBps: 3_000,
        automationPaused: false,
        allowedStrategies: ['defindex', 'soroswap'],
      },
    });
    const policySigned = stellar.signXdr(builtPolicy.unsignedXdr, kp.secretKey);
    const policySubmit = await policy.submitSignedPolicyTx(policySigned);
    evidence.txHashes!.policy = (policySubmit as { hash?: string }).hash ?? 'unknown';
    const policyView = await policy.getPolicy(kp.publicKey);
    if (policyView.riskProfile !== 1) {
      throw new Error('Policy riskProfile not persisted');
    }

    stageLog(5, TOTAL, 'Recipient trustline', 'PASS');
    const recipientKp = stellar.createRandomKeypair();
    await fundRecipientWithUsdcTrustline({
      stellar,
      env,
      recipientSecret: recipientKp.secretKey,
    });
    evidence.accounts!.recipient = recipientKp.publicKey;

    stageLog(6, TOTAL, 'Direct USDC payment', 'PASS');
    const payAmount = '0.1500000';
    const quote = await paymentRouter.quote({
      fromAccount: kp.publicKey,
      recipient: recipientKp.publicKey,
      receiveAmount: payAmount,
      receiveCurrency: 'USDC',
      balanceSource: 'available',
    });
    evidence.quoteIds!.payment = quote.quoteId;
    const builtPay = await paymentRouter.build(quote.quoteId, kp.publicKey, true);
    const paySubmit = await stellar.submitSignedXdr(
      stellar.signXdr(builtPay.unsignedXdr!, kp.secretKey),
    );
    if (!paySubmit.successful) throw new Error('Payment submit failed');
    evidence.txHashes!.payment = paySubmit.hash;
    const recipientUsdc = usdcBalance(await stellar.getBalances(recipientKp.publicKey), env.USDC_ISSUER);
    if (recipientUsdc < Number(payAmount)) {
      throw new Error(`Recipient did not receive ${payAmount} USDC (has ${recipientUsdc})`);
    }

    stageLog(7, TOTAL, 'SEP-38 USDC→TRY + SEP-6 withdraw', 'PASS');
    const withdrawUsdc = '1.0000000';
    const withdrawQuote = await anchor.sep38Quote(token, {
      sellAsset: `stellar:USDC:${env.USDC_ISSUER}`,
      buyAsset: 'iso4217:TRY',
      sellAmount: withdrawUsdc,
    });
    evidence.quoteIds!.withdraw = withdrawQuote.id;
    const withdrawSession = (await anchor.sep6Withdraw(token, {
      asset_code: 'USDC',
      account: kp.publicKey,
      amount: withdrawUsdc,
      dest: process.env.E2E_TRY_WITHDRAW_DEST ?? 'TR890009903460061605055303',
      quote_id: withdrawQuote.id,
    })) as { id: string; account_id: string; memo_type: string; memo: string };
    evidence.transferIds!.withdraw = withdrawSession.id;
    if (withdrawSession.memo_type !== 'id') {
      throw new Error(`Expected memo_type id, got ${withdrawSession.memo_type}`);
    }
    const withdrawPayUnsigned = await stellar.buildUsdcPaymentWithMemoIdXdr(
      kp.publicKey,
      withdrawSession.account_id,
      withdrawUsdc,
      withdrawSession.memo,
    );
    const withdrawPay = await stellar.submitSignedXdr(
      stellar.signXdr(withdrawPayUnsigned, kp.secretKey),
    );
    if (!withdrawPay.successful) throw new Error('Withdraw funding payment failed');
    evidence.txHashes!.withdrawFunding = withdrawPay.hash;
    const withdrawDone = await pollSep6Completed(anchor, token, withdrawSession.id);
    evidence.txHashes!.withdraw = withdrawDone.stellarTxHash ?? withdrawPay.hash;

    stageLog(8, TOTAL, 'Evidence summary', 'PASS');
    evidence.status = 'PASS';
    const file = saveEvidence('core', evidence);

    console.log('\nTRINQA CORE TESTNET DEMO — PASS');
    console.log(`Payer: ${kp.publicKey}`);
    console.log(`Policy Contract: ${deployment.contractId}`);
    console.log(`Anchor Deposit: ${deposit.id}`);
    console.log(`Deposit Quote: ${depositQuote.id}`);
    console.log(`Deposit TX: ${evidence.txHashes!.deposit}`);
    console.log(`Policy TX: ${evidence.txHashes!.policy}`);
    console.log(`Recipient: ${recipientKp.publicKey}`);
    console.log(`Payment TX: ${paySubmit.hash}`);
    console.log(`Anchor Withdrawal: ${withdrawSession.id}`);
    console.log(`Withdrawal Quote: ${withdrawQuote.id}`);
    console.log(`Withdrawal TX: ${evidence.txHashes!.withdraw}`);
    console.log(`Evidence: ${file}`);
  } catch (err) {
    evidence.status = 'FAIL';
    evidence.notes = [err instanceof Error ? err.message : String(err)];
    saveEvidence('core-fail', evidence);
    stageLog(8, TOTAL, 'Core demo', 'FAIL', evidence.notes[0]);
    throw err;
  } finally {
    await app.close();
  }
}

main().catch(() => process.exit(1));
