#!/usr/bin/env npx tsx
/**
 * Remote smoke test: drives a deployed BFF over HTTP exactly like the mobile app does
 * (demo signer, TR mock anchor, policy contract, USDC pay, TRY cash-out) on testnet.
 *
 *   SMOKE_BASE_URL=https://... SMOKE_DEMO_TOKEN=... pnpm smoke:remote
 *
 * Exit 0 on PASS, 1 on FAIL. Only a throwaway recipient is created locally; every
 * payer action goes through the BFF.
 */

import { stageLog } from './lib/stage-log.ts';
import { fundRecipientWithUsdcTrustline } from './lib/recipient-usdc-trustline.ts';
import { env } from '../backend/src/config/env.js';
import { StellarService } from '../backend/src/services/stellar.service.js';

const TOTAL = 9;
const BASE_URL = (process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/+$/, '');
const DEMO_TOKEN = process.env.SMOKE_DEMO_TOKEN;
const TRY_WITHDRAW_DEST = 'TR890009903460061605055303';

type Json = Record<string, any>;

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: Json,
    path: string,
  ) {
    super(`${path} → ${status} ${body.error ?? ''} ${body.message ?? ''}`.trim());
  }
}

async function call(path: string, init: { method?: string; body?: unknown; token?: string | null } = {}) {
  const token = init.token === undefined ? DEMO_TOKEN : init.token;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: {
      Accept: 'application/json',
      ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token && path.startsWith('/api/v1/demo/') ? { 'x-demo-token': token } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  const body = (text ? JSON.parse(text) : {}) as Json;
  if (!res.ok) throw new HttpError(res.status, body, path);
  return body;
}

const sign = async (unsignedXdr: string) =>
  (await call('/api/v1/demo/sign', { body: { unsignedXdr } })).signedXdr as string;

async function pollTransfer(sessionId: string, transferId: string, operationId?: string) {
  const started = Date.now();
  while (Date.now() - started < 120_000) {
    const qs = new URLSearchParams({ sessionId, ...(operationId ? { operationId } : {}) });
    const { transfer } = await call(`/api/v1/anchor/transfers/${encodeURIComponent(transferId)}?${qs}`);
    const status = transfer?.transaction?.status;
    if (status === 'completed') return;
    if (status === 'error' || status === 'refunded') throw new Error(`Transfer ${transferId} ${status}`);
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error(`Transfer ${transferId} timed out`);
}

async function expectStatus(promise: Promise<unknown>, status: number, code?: string | string[]) {
  const codes = code === undefined ? undefined : Array.isArray(code) ? code : [code];
  try {
    await promise;
  } catch (err) {
    if (err instanceof HttpError && err.status === status && (!codes || codes.includes(err.body.error))) return;
    throw err;
  }
  throw new Error(`Expected HTTP ${status}${codes ? ` ${codes.join('|')}` : ''}, got success`);
}

async function main() {
  console.log(`Smoke target: ${BASE_URL}`);
  let stage = 0;
  const pass = (label: string, detail?: string) => stageLog(++stage, TOTAL, label, 'PASS', detail);

  try {
    const health = await call('/api/v1/health');
    if (health.status !== 'ok' || !health.anchor?.healthy || !health.horizon) {
      throw new Error(`Unhealthy: ${JSON.stringify(health).slice(0, 300)}`);
    }
    const caps = await call('/api/v1/capabilities');
    if (caps.network !== 'testnet') throw new Error(`Unexpected network ${caps.network}`);
    pass('Health + capabilities', `policy ${health.policy?.contractId}`);

    if (DEMO_TOKEN) await expectStatus(call('/api/v1/demo/account', { token: null }), 401, 'demo_token_required');
    const { account } = await call('/api/v1/demo/account');
    await fetch(`https://friendbot.stellar.org?addr=${account}`).catch(() => undefined);
    await call('/api/v1/demo/trustline/usdc', { body: { account } });
    pass('Demo signer gated + funded', account);

    const { sessionId } = await call('/api/v1/demo/sep10', { method: 'POST', body: {} });
    await call('/api/v1/anchor/customer', { method: 'PUT', body: { sessionId, fields: {} } });
    const customer = await call(`/api/v1/anchor/customer?sessionId=${sessionId}`);
    if (customer.status !== 'ACCEPTED') throw new Error(`SEP-12 status ${customer.status}`);
    pass('SEP-10 session + SEP-12 KYC');

    const { quote: depositQuote } = await call('/api/v1/anchor/quotes', {
      body: { sessionId, sellAsset: 'iso4217:TRY', sellAmount: '500' },
    });
    const deposit = await call('/api/v1/anchor/deposits', {
      body: { sessionId, account, amount: '500', quoteId: depositQuote.id },
    });
    await call('/api/v1/demo/anchor/simulate-bank-transfer', {
      body: { sessionId, transferId: deposit.session.id },
    });
    await pollTransfer(sessionId, deposit.session.id, deposit.operationId);
    pass('Add money: TRY → USDC (SEP-38 + SEP-6)', `+${depositQuote.buy_amount} USDC`);

    const policy = await call('/api/v1/policy/build', {
      body: {
        action: 'set_policy',
        accountId: account,
        policy: {
          riskProfile: 1,
          targetTimestamp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
          liquidityTargetBps: 3000,
          automationPaused: false,
          allowedStrategies: [],
        },
      },
    });
    const policyTx = await call('/api/v1/policy/submit', { body: { signedXdr: await sign(policy.unsignedXdr) } });
    if (!policyTx.successful) throw new Error('Policy submit not successful');
    pass('Policy contract write', policyTx.hash);

    const stellar = new StellarService(env);
    const recipient = stellar.createRandomKeypair();
    await fundRecipientWithUsdcTrustline({ stellar, env, recipientSecret: recipient.secretKey });
    const { quote: payQuote } = await call('/api/v1/payments/quote', {
      body: {
        fromAccount: account,
        recipient: recipient.publicKey,
        receiveAmount: '1.0000000',
        receiveCurrency: 'USDC',
        balanceSource: 'available',
      },
    });
    const builtPay = await call('/api/v1/payments/build', { body: { quoteId: payQuote.quoteId, fromAccount: account } });
    await expectStatus(
      call('/api/v1/payments/build', { body: { quoteId: payQuote.quoteId, fromAccount: account } }),
      409,
      'QUOTE_ALREADY_USED',
    );
    const paid = await call('/api/v1/payments/execute-step', {
      body: { operationId: builtPay.operationId, step: 'stellar_payment', signedXdr: await sign(builtPay.unsignedXdr) },
    });
    if (!paid.successful) throw new Error('USDC payment not successful');
    pass('Pay 1 USDC (quote single-use enforced)', paid.txHash);

    const { quote: wQuote } = await call('/api/v1/payments/withdraw/quote', {
      body: { fromAccount: account, usdcAmount: '1.0000000', anchorSessionId: sessionId, withdrawDest: TRY_WITHDRAW_DEST },
    });
    if (!(Number(wQuote.fee?.amount) > 0)) throw new Error(`Cash-out fee not surfaced: ${JSON.stringify(wQuote.fee)}`);
    await expectStatus(
      call('/api/v1/payments/withdraw/quote', {
        body: { fromAccount: account, usdcAmount: '5000.0000000', anchorSessionId: sessionId, withdrawDest: TRY_WITHDRAW_DEST },
      }),
      422,
      // The anchor's published SEP-6 max rejects it first when it publishes one; otherwise the balance does.
      ['AMOUNT_OUT_OF_RANGE', 'INSUFFICIENT_BALANCE'],
    );
    pass('Cash-out quote: fee shown, oversized amount rejected', `${wQuote.destination.amount} TRY, fee ${wQuote.fee.amount} USDC`);

    const builtW = await call('/api/v1/payments/build', { body: { quoteId: wQuote.quoteId, fromAccount: account } });
    const funded = await call('/api/v1/payments/execute-step', {
      body: { operationId: builtW.operationId, step: 'anchor_withdraw', signedXdr: await sign(builtW.unsignedXdr) },
    });
    if (!funded.successful) throw new Error('Anchor funding payment not successful');
    await pollTransfer(sessionId, builtW.anchorSession.transferId, builtW.operationId);
    pass('Cash-out: USDC → TRY (SEP-6 withdraw)', funded.txHash);

    const { items } = await call(`/api/v1/activity/${account}`);
    pass('Activity feed', `${items?.length ?? 0} operations`);

    console.log('\nTRINQA REMOTE SMOKE — PASS');
  } catch (err) {
    stageLog(stage + 1, TOTAL, 'Remote smoke', 'FAIL', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

void main();
