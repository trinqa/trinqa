# Trinqa Backend — Implementation Plan (Testnet)

**Branch:** `backend/integration` · **Network:** Stellar testnet only

## Goals

BFF between Expo mobile and Stellar / TR Mock Anchor / DeFindex / Soroswap. Mobile never holds partner API keys; optional demo signer is testnet-only and env-gated.

## Milestones

| # | Scope | Status |
|---|--------|--------|
| M1 | Fastify bootstrap, config, money helpers, StellarService, TrMockAnchorAdapter, health/capabilities, demo signer guard, unit + anchor tests, `scripts/e2e-anchor.ts` | Done (`9dce8f9`) |
| M2 | `contracts/trinqa-policy` (Soroban), testnet deploy, PolicyService, policy API | Done |
| M3 | DeFindex + Soroswap adapters, PaymentRouter, OperationStore, core `/api/v1` routes, e2e scripts, CI | Done |
| M4 | Rebase on main, SEP-6/SEP-24 audit, recommendations API, route `candidateCount`, activity normalization, docs | **In progress** — code gaps closed except rebase/merge; testnet proof partial (see `TESTNET_EVIDENCE.md`) |

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
| Rust / Soroban CLI (M2 contracts) | Installed (Rust 1.98.1, stellar CLI 23.1.4) |
| DeFindex / Soroswap API keys | **BLOCKED** in CI/local without `.env` (e2e exit 2) |
| Anchor JWT on API | **Fixed** — sessionId + server-side store (2026-09-18 verification) |
| Earn unwind orchestration | **INCOMPLETE** — error only, no multi-step flow |
| Full SEP-6 anchor e2e | **INCOMPLETE** — `e2e-anchor.ts` partial |
| Google Docs hackathon handbook | Auth-gated — use vercel site + SKILL.md |
