# Trinqa Backend — Implementation Plan (Testnet)

**Branch:** `backend/integration` · **Network:** Stellar testnet only

## Goals

BFF between Expo mobile and Stellar / TR Mock Anchor / DeFindex / Soroswap. Mobile never holds partner API keys; optional demo signer is testnet-only and env-gated.

## Milestones

| # | Scope | Status |
|---|--------|--------|
| M1 | Fastify bootstrap, config, money helpers, StellarService, TrMockAnchorAdapter, health/capabilities, demo signer guard, unit + anchor tests, `scripts/e2e-anchor.ts` | In progress |
| M2 | `contracts/trinqa-policy` (Soroban), testnet deploy, PolicyService | Planned |
| M3 | DeFindex + Soroswap adapters, PaymentRouter, OperationStore | Planned |
| M4 | Full `/api/v1/*` routes, E2E scripts, CI, integration audit (SEP-6 vs SEP-24) | Planned |

## Stack

- Node ≥ 22 (`backend/.nvmrc`)
- pnpm, TypeScript strict, Fastify, Zod, Vitest
- `@stellar/stellar-sdk`, later `@defindex/sdk` 0.3.x, `@soroswap/sdk` 0.5.x

## Anchor (Phase 1 fiat rail)

- Domain: `tr-mock-anchor.fly.dev` (`TR_ANCHOR_DOMAIN`)
- SEP-1 TOML → SEP-10 JWT → SEP-6 deposit/withdraw (not SEP-24 for TR mock)
- SEP-38 quotes (TRY ↔ USDC)
- USDC issuer: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`

## Env (see `backend/.env.example`)

No secrets in git. `DEMO_SIGNER_SECRET` optional for local/e2e signing on testnet only.

## Blockers log

| Item | Status |
|------|--------|
| Rust / Soroban CLI (M2 contracts) | Not installed on dev machine — install before M2 |
| DeFindex / Soroswap API keys | Placeholders until M3 |
| Google Docs hackathon handbook | Auth-gated — use vercel site + SKILL.md |
