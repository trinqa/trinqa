# M5.1 Final Independent Audit B

**Branch:** `backend/integration`  
**ACTUAL HEAD:** `4cf6c818649da6aa3c2895adac0c606c15aff824` (`4cf6c81 fix(e2e): tighten trinqa PASS to real partner lifecycles.`)  
**Auditor:** Independent re-verification (code + command output first; prior audits/docs not trusted as evidence).

## Final Verdict

**READY_FOR_EXTERNAL_AUDIT**

## P0

*(none — prior P0 hardcoded TRY IBAN in earn-unwind execution is **fixed** in current code.)*

## P1

*(none in application logic verified at HEAD.)*

## P2

| # | Issue | Evidence |
|---|--------|----------|
| 1 | Activity feed is an explicit **OperationStore stub** (no ledger/history indexer) | `backend/src/routes/v1/activity.ts` L6–17, `source: 'operation_store'` |
| 2 | Audit host **Node v20.19.5** vs `package.json` `engines.node >= 22` | `node --version`; `backend/package.json` L6–8 |
| 3 | Stale **`paltalabs/defindex-sdk`** as canonical in non-backend docs | `docs/07_INTEGRATION_AUDIT.md`, `source-material/HACKATHON_LINKS.md` (backend README/INTEGRATIONS use `defindex-io`) |
| 4 | `TESTNET_EVIDENCE.md` anchor/policy tx hashes **stale** vs this audit run (status labels still honest) | Doc L13–24 vs `e2e:anchor` / `e2e:policy` output 2026-09-18 |
| 5 | Contract auth-negative tests assert `is_err()` only, not specific `Error` enum | `contracts/trinqa-policy/.../test.rs` L114–115, L124–125, L134–135 |
| 6 | `pnpm build` broken in audit shell (corepack); **`npm run build`** works | pnpm missing `pnpm.cjs`; `tsc` exit 0 |

## Acceptance Matrix (A–P)

| ID | Requirement | Status | File / evidence |
|----|-------------|--------|-----------------|
| **A** | E2E scripts obtain **real USDC** (shared fixture, not trustline-only) | **PASS** | `scripts/lib/testnet-usdc-fixture.ts` L108–110 balance must increase after SEP-6 on-ramp; used by `e2e-defindex.ts` L33–38, `e2e-soroswap.ts` L40, `e2e-trinqa.ts` L50 |
| **B** | Soroswap uses full asset list `SupportedAssetLists.SOROSWAP` | **PASS** | `backend/src/services/soroswap-asset-registry.ts` L47 |
| **C** | `sdk.build` receives `to` recipient | **PASS** | `backend/src/adapters/soroswap.adapter.ts` L101–103; router L374–377; `backend/tests/unit/soroswap.adapter.test.ts` |
| **D** | XLM cannot execute as USDC direct payment | **PASS** | XLM payout only via `stellar_swap_transfer` + Soroswap (`payment-router.service.ts` L104–107, L204–213, L355–377); `stellar_transfer` only when `dest === 'USDC'` (L111–121, L309–311) |
| **E** | Pay recipient-first; no TRY P2P pay; TRY is withdraw | **PASS** | `recipient` required (`payments.ts` L21); TRY rejects `recipient !== fromAccount` (L184–188); `withdrawDest` required (L181–182); capabilities describe fiat withdraw |
| **F** | Earn unwind follows `routeType`; withdraw dest from quote/metadata not hardcoded IBAN | **PASS** | Tail steps from `quote.routeType` (`payment-router.service.ts` L291–296); continuation `stellar_payment` / `soroswap_swap` / `fiat_payout` (`payment-execution.service.ts` L92–212); `withdrawDest` from payload/meta (L160–171). **No** `TR89…` in `backend/src/` |
| **G** | Yield execute uses DeFindex `sendTransaction` not Horizon | **PASS** | `defindex-yield.adapter.ts` L144–146; `yield.service.ts` L179 |
| **H** | Position conversion rejects unsafe/fractional numbers (no `Math.trunc`) | **PASS** | Grep: no `BigInt(Math.trunc)`; `normalizePosition` uses `providerNumberToDecimalString` / `bigintToSafeNumber` (`defindex-yield.adapter.ts` L203–211) |
| **I** | Anchor transfer IDs persisted; poll updates ops | **PASS** | `anchor.ts` L117–125, L154–162, L182–205 |
| **J** | Activity covers core kinds | **PARTIAL PASS** | Kinds recorded: `payment`, `anchor_*`, `yield_*` (grep `recordOperation`); feed reads store (`activity.ts`). **Gap:** stub, no chain-indexed history (P2 #1) |
| **K** | `riskProfile` affects score | **PASS** | `deterministic-risk-engine.ts` L48–68, L68; `yield.service.ts` uses profile in recommendations |
| **L** | Strategy intrinsic risk independent of user preference | **PASS** | `normalizeStrategy` uses `intrinsicRiskTierForVault` only (`defindex-yield.adapter.ts` L171–175); no `riskProfile` in adapter |
| **M** | Contract tests: auth without `mock_all_auths` on auth tests; invalid cases | **PASS** | `test.rs` L108–136 no mock on auth tests; invalid liquidity/risk/timestamp/strategy L93–177 |
| **N** | `e2e-trinqa` cannot **Full lifecycle: PASS** without all real steps | **PASS** | `isFullLifecyclePass` requires all five legs PASS (`scripts/lib/e2e-trinqa-report.ts` L6–13); partner legs start BLOCKED without keys (L17–38); DeFindex/Soroswap PASS only via full child scripts (`e2e-trinqa.ts` L62–67); unit tests `e2e-trinqa-report.test.ts` |
| **O** | No secret leak in tracked files | **PASS** | No live API keys in grep; `.env` not committed; fixture comment L3–4 |
| **P** | Docs do not claim more than evidence | **PASS** (minor drift) | `TESTNET_EVIDENCE.md` marks DeFindex/Soroswap BLOCKED and trinqa PARTIAL; stale tx rows (P2 #4); `IMPLEMENTATION_PLAN.md` notes activity stub |

### Forbidden greps (this audit)

| Pattern | Result |
|---------|--------|
| Hardcoded `TR890009903460061605055303` in **production** (`backend/src`) | **None** (only E2E scripts: `scripts/e2e-trinqa.ts` L120 default, `scripts/e2e-anchor.ts` L178) |
| `void riskProfile` | **None** |
| `BigInt(Math.trunc` | **None** |
| `dest === 'USDC' \|\| dest === 'XLM'` stellar_transfer hack | **None** (separate branches; XLM uses swap route) |
| JWT in anchor quote API responses | **None** — `anchor-routes.test.ts` L35–36 |
| `paltalabs` as **current** canonical SDK in backend | **None** in backend; stale in `docs/07_INTEGRATION_AUDIT.md` |
| PASS on `getVaultInfo`/API key alone | **None** — `e2e-defindex.ts` PASS only after `sendSignedXdr` deposit+withdraw (L50–73) |

## Test Results (exact counts)

| Command | Result |
|---------|--------|
| `cd backend && node --version` | **v20.19.5** (below declared **22+**) |
| `pnpm build` | **FAIL** (corepack: missing `pnpm.cjs`) |
| `npm run build` | **PASS** (`tsc -p tsconfig.json`) |
| `npm test` | **PASS** — **14** files, **36** tests |
| `npm run test:integration` | **PASS** — **2** files, **4** tests |
| `cargo test` (in `contracts/trinqa-policy`, via `~/.cargo/env`) | **PASS** — **12** tests |
| `npm run e2e:anchor` | **PASS** (live SEP-6 deposit+withdraw) |
| `npm run e2e:policy` | **PASS** (set_policy tx `cdbb194c…`) |
| `npm run e2e:defindex` | **BLOCKED** exit **2** — `DEFINDEX_API_KEY`, `DEFINDEX_VAULT_ADDRESS` |
| `npm run e2e:soroswap` | **BLOCKED** exit **2** — `SOROSWAP_API_KEY` |
| `npm run e2e:trinqa` | **PARTIAL** exit **3** — Anchor+Policy PASS; partner legs BLOCKED; `Full lifecycle: PARTIAL` |

## E2E Truthfulness

- **Honest BLOCKED:** Partner scripts exit **2** with explicit missing env vars (verified).
- **No false full lifecycle:** `e2e-trinqa` exit **3** when partner legs not PASS; summary prints BLOCKED suffix with blockers.
- **No build-only / health-only PASS:** DeFindex/Soroswap legs delegate to `e2e-defindex.ts` / `e2e-soroswap.ts` (on-chain send + balance checks).
- **Earn-funded leg:** Only runs when DeFindex leg PASS; requires real vault deposit, `requiresEarnUnwind`, approval gate, `yield_withdraw` + `stellar_payment` (`e2e-trinqa.ts` L70–110).
- **Unverified in this environment:** DeFindex/Soroswap/Earn-funded **write paths** (missing keys) — **BLOCKER for full lifecycle proof**, not a code P0.

## Security

- SEP-10 JWT in memory store only; API uses opaque `sessionId` (`anchor-session-store.service.ts`, `anchor-routes.test.ts`).
- No tracked live secrets found.
- TRY withdraw after earn-unwind uses client-provided `withdrawDest` from quote metadata (no hardcoded production IBAN).

## Documentation Consistency

- Backend canonical DeFindex repo: `defindex-io/defindex-sdk` (README/INTEGRATIONS).
- `TESTNET_EVIDENCE.md` correctly states PARTIAL/BLOCKED for partner legs; update tx hash rows after external audit runs.
- Prior `M5_1_INDEPENDENT_AUDIT.md` P0 IBAN finding **obsolete** at HEAD `4cf6c81`.

## Exact Remaining Blockers

1. **Partner credentials** — `DEFINDEX_API_KEY`, `DEFINDEX_VAULT_ADDRESS`, `SOROSWAP_API_KEY` required to run `e2e:defindex`, `e2e:soroswap`, and full `e2e:trinqa` lifecycle.
2. **Toolchain** — Run CI/audit on **Node 22+** to match `engines`; audit host was Node 20.
3. **Evidence refresh** — Record partner tx hashes in `TESTNET_EVIDENCE.md` after keyed E2E runs.

## Merge Recommendation

**Approve merge to external audit track** at `4cf6c81` on `backend/integration`. Code-level M5.1 acceptance A–P holds at HEAD; complete partner-keyed E2E and Node 22 CI before claiming full testnet lifecycle or production readiness.
