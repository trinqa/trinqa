#!/usr/bin/env npx tsx
/**
 * Manual, live probe for the Jev route advisor (workstream C, Phase 2).
 *
 * Run from backend/:
 *   npx tsx ../scripts/jev-probe.ts
 *
 * Reads OPENROUTER_API_KEY from process.env (via dotenv-loaded backend/.env, same as the
 * server). Sends one realistic AdvisorInput — a TR mock EXECUTABLE TRY withdraw route and a
 * testanchor QUOTE_ONLY USD route — and prints the mapped RouteAdvice[] plus the raw
 * usage.cost reported by OpenRouter's Decisions endpoint. This script is not run in CI and is
 * not exercised by the test suite; it requires a real OPENROUTER_API_KEY to do anything useful.
 */

import type { AdvisorInput, RouteCandidate } from '../backend/src/domain/route.js';

function log(step: string, detail?: unknown) {
  console.log(`\n[${step}]`, detail === undefined ? '' : JSON.stringify(detail, null, 2));
}

async function main() {
  const { env } = await import('../backend/src/config/env.js');
  const { queryJevDecisions, JevAdvisor } = await import('../backend/src/adapters/jev-advisor.js');
  const { ADVISOR_FACTORS } = await import('../backend/src/domain/route.js');

  if (!env.OPENROUTER_API_KEY) {
    console.error('BLOCKED: OPENROUTER_API_KEY');
    process.exit(2);
  }

  const trMockRoute: RouteCandidate = {
    routeId: `${env.TR_ANCHOR_DOMAIN}:withdraw:USDC:TRY`,
    anchorId: env.TR_ANCHOR_DOMAIN,
    anchorDomain: env.TR_ANCHOR_DOMAIN,
    anchorName: 'TR Mock Anchor',
    status: 'EXECUTABLE',
    rail: {
      assetCode: 'USDC',
      direction: 'withdraw',
      enabled: true,
      fiat: ['TRY'],
      min: '10',
      max: '5000',
      feeFixed: '1',
      feePercent: '0.5',
      methods: ['bank_account'],
    },
    facts: {
      feePercent: 0.5,
      feeFixed: 1,
      estimatedMinutes: 15,
      reliability: 92,
      indicativePrice: null,
    },
  };

  const testAnchorRoute: RouteCandidate = {
    routeId: 'testanchor.stellar.org:withdraw:USDC:USD',
    anchorId: 'testanchor.stellar.org',
    anchorDomain: 'testanchor.stellar.org',
    anchorName: 'Test Anchor',
    status: 'QUOTE_ONLY',
    rail: {
      assetCode: 'USDC',
      direction: 'withdraw',
      enabled: true,
      fiat: ['USD'],
      min: '1',
      max: '10000',
      methods: ['bank_account'],
    },
    facts: {
      estimatedMinutes: undefined,
      reliability: 55,
      indicativePrice: {
        anchorId: 'testanchor.stellar.org',
        sellAsset: 'stellar:USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        buyAsset: 'iso4217:USD',
        sellAmount: '100',
        buyAmount: '99.4',
        price: '0.994',
        firm: false,
        source: 'sep38_price',
      },
    },
  };

  const input: AdvisorInput = {
    request: {
      direction: 'withdraw',
      fiatCurrency: 'TRY',
      assetCode: 'USDC',
      amount: '100',
      kycStatus: 'ACCEPTED',
      requireExecutable: false,
      user: { riskProfile: 1, daysToTarget: 30 },
    },
    routes: [trMockRoute, testAnchorRoute],
  };

  log('advisor factors', ADVISOR_FACTORS);
  log('request', input);

  const options = {
    apiKey: env.OPENROUTER_API_KEY,
    model: env.JEV_MODEL,
    timeoutMs: env.JEV_TIMEOUT_MS,
  };

  const raw = await queryJevDecisions(options, input);
  if (!raw) {
    console.error('\nqueryJevDecisions returned null (network error, timeout, non-2xx, or invalid shape).');
    process.exit(1);
  }
  log('raw answers', raw.response.answers);
  log('usage', raw.response.usage);
  if (raw.response.usage && 'cost' in raw.response.usage) {
    log('usage.cost', raw.response.usage.cost);
  }

  const advisor = new JevAdvisor(options);
  const advice = await advisor.advise(input);
  log('mapped RouteAdvice[]', advice);
}

main().catch((err) => {
  console.error('jev-probe failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
