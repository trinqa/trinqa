# M5.1 Independent Audit A

## Verdict
FAIL

**Git:** branch `backend/integration`, base `33af6c3`, **ACTUAL HEAD** `c2bf98afc73a6014221aac8d6bfa5668e4dd98fb` (`c2bf98a docs(backend): record m5.1 independent verification`). Diff `33af6c3..HEAD`: 27 files, +855/-184 (implementation); HEAD commit is docs-only on top of prior integration commits.

## P0 Findings (file, function/line, evidence, why P0)

| # | Location | Evidence | Why P0 |
|---|----------|----------|--------|
| 1 | `backend/src/services/payment-execution.service.ts` — `executeStep`, `yield_withdraw` + `fiat_payout` branch (~L150–163) | `sep6Withdraw(jwt, { … dest: 'TR890009903460061605055303', … })` hardcoded; anchor withdraw API elsewhere takes client `dest` (`routes/v1/anchor.ts` L140–151). | TRY cash-out after earn-unwind ignores user-linked bank destination and SEP-6 withdraw parameters. Production TRY payout can go to the wrong account or fail KYC/compliance; breaks M5.1 earn→fiat orchestration correctness. |

## P1 Findings

| # | Location | Evidence | Why P1 |
|---|----------|----------|--------|
| 1 | `backend/src/adapters/defindex-yield.adapter.ts` — `normalizeStrategy` (~L150–175), `normalizeStrategies` (~L186–199) | `risk: riskTierFromProfile(riskProfile)` on returned `YieldStrategy`. `DeterministicRiskEngine.strategyIntrinsicSafety` reads `strategy.risk` (~L25–27 in `deterministic-risk-engine.ts`). | User `riskProfile` mutates displayed/classified strategy risk and feeds the **safety** score, not only `assetRisk` fit. Unit test proves fit/safety split only for hand-built strategies (`risk-engine.test.ts` L43–48), not for `normalizeStrategy` output. Violates acceptance #16. |
| 2 | `scripts/e2e-trinqa.ts` — DeFindex leg (~L60–79) | `report.DeFindex = 'PASS'` when `POST /api/v1/yield/deposits/build` returns 200; no `sendSignedXdr`, no balance delta, no vault deposit proof. | False-positive PASS for DeFindex lifecycle (#8, #20). |
| 3 | `scripts/e2e-trinqa.ts` — Soroswap leg (~L86–94) | When `SOROSWAP_API_KEY` set, PASS = `healthCheck().ok` only; no quote/build/send (contrast `scripts/e2e-soroswap.ts` full swap). | False-positive PASS for Soroswap (#9, #20). |
| 4 | `scripts/e2e-trinqa.ts` — Earn-funded payment (~L96–117) | PASS when `paymentRouter.quote` succeeds and `requiresEarnUnwind === false`; no prior vault deposit, no `build`/`execute-step`, no earn balance. | Earn-funded path not proven; can PASS without earn funding (#10, #20). |
| 5 | `backend/src/routes/v1/payments.ts` + `payment-router.service.ts` | API accepts `balanceSource` (`payments.ts` L25); `PaymentRouter.quote` never reads `req.balanceSource` (`payment.ts` L22). | Recipient/funding intent incomplete; `balanceSource` is dead API surface (#4 partial). |
| 6 | Partner E2E not executed in this audit environment | No `backend/.env`; `e2e-defindex` / `e2e-soroswap` exit **2** BLOCKED; DeFindex/Soroswap REAL USDC scripts unverified here. | M3/M5 partner claims remain **UNVERIFIED** despite code paths (#8, #9). |

## P2 Findings

| # | Location | Evidence |
|---|----------|----------|
| 1 | `backend/src/routes/v1/activity.ts` L6–7 | Comment: "Activity feed **stub** — normalized from OperationStore until ledger indexing lands." |
| 2 | `docs/07_INTEGRATION_AUDIT.md`, `source-material/HACKATHON_LINKS.md` | Still reference `paltalabs/defindex-sdk` as skill URL; canonical docs use `defindex-io/defindex-sdk` (`INTEGRATIONS.md`, `backend/README.md`). |
| 3 | `docs/backend/IMPLEMENTATION_PLAN.md` L10 | M4 marked "DONE (code)" without testnet command proof in `TESTNET_EVIDENCE.md` for activity/SEP-6 audit scope. |
| 4 | `backend` build tooling | `pnpm build` fails in audit shell (`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING` / missing corepack pnpm.cjs); `npm run build` (`tsc`) succeeds. |
| 5 | Contract tests | Auth-negative tests assert `result.is_err()` only (`test.rs` L114–115, L124–125, L134–135), not specific `Error` enum — weak regression signal (#17 minor). |

## Acceptance Matrix (every M5.1 requirement: PASS/FAIL/BLOCKED/N/A + file + evidence)

| # | Requirement | Status | File / evidence |
|---|-------------|--------|-----------------|
| 1 | Soroswap full asset-list discovery (`SupportedAssetLists.SOROSWAP` vs metadata-only) | **PASS** | `soroswap-asset-registry.ts` L47: `discoverAssets(SupportedAssetLists.SOROSWAP)`; adapter `discoverAssets` delegates to `sdk.getAssetList(assetList)` (`soroswap.adapter.ts` L56–58). |
| 2 | Recipient passed as `to` in `sdk.build` | **PASS** | `soroswap.adapter.ts` L101–103 `{ quote, from, to }`; unit test `soroswap.adapter.test.ts` L6–24; router/execution pass `payload.recipient` (`payment-router.service.ts` L352–355, `payment-execution.service.ts` L121–124). |
| 3 | No direct XLM vs USDC payment mismatch | **PASS** | XLM payout uses `stellar_swap_transfer` + Soroswap (`payment-router.service.ts` L99–102, L192–213); USDC uses `stellar_transfer` (`L106–116`, `L297–310`). No XLM `buildPaymentXdr` for XLM dest. |
| 4 | Recipient-first PaymentIntent | **FAIL** | `recipient` required on quote (`payment.ts` L17–18, `payments.ts` L21); **`balanceSource` ignored** in router (P1 #5). |
| 5 | Exact-out for XLM | **PASS** | Quote path: `quoteExactIn` preview then `quoteExactOut` (`payment-router.service.ts` L198–209); build fallback `quoteExactOut` from destination amount (L345–350). |
| 6 | Quote → build invariant (no 501 after quote) | **PASS** | No HTTP 501 in backend; `build` re-fetches Soroswap quote if missing (`payment-router.service.ts` L337–351). Unit tests cover earn approval, not live Soroswap build. |
| 7 | Route-aware Earn unwind (not always `stellar_payment`) | **PASS** | Post-`yield_withwind` branches on `routeType`: `stellar_payment`, `soroswap_swap`, `fiat_payout`/`anchor_withdraw` (`payment-execution.service.ts` L92–198); tail steps in `build` (`payment-router.service.ts` L279–284). |
| 8 | DeFindex E2E funds REAL USDC (not trustline-only) | **BLOCKED** (audit) / **PASS** (script design) | `scripts/e2e-defindex.ts` uses `fundTestnetUsdcAccount` (SEP-38 TRY→USDC on-ramp + balance check, `testnet-usdc-fixture.ts` L108–110) then deposit/withdraw via `sendSignedXdr`. **Not run** — missing keys, exit 2. |
| 9 | Soroswap E2E funds REAL USDC | **BLOCKED** (audit) / **PASS** (script design) | `scripts/e2e-soroswap.ts` L38–40 funds payer via same fixture; asserts recipient XLM increase L63–67. **Not run** — missing `SOROSWAP_API_KEY`, exit 2. |
| 10 | `e2e-trinqa` cannot PASS without real lifecycle steps | **FAIL** | Process exits **3** when `Full lifecycle` not met (verified `trinqa_exit:3`); per-leg **false PASS** possible (P1 #2–4). |
| 11 | DeFindex submit via adapter `sendTransaction` not Horizon | **PASS** | `defindex-yield.adapter.ts` L144–146 `sdk.sendTransaction`; `yield.service.ts` L182; `payment-execution.service.ts` L68 `defindex.sendSignedXdr`. |
| 12 | Safe integer in `normalizePosition` (no `BigInt(Math.trunc)`) | **PASS** | Grep: no `BigInt(Math.trunc)` in repo; `providerNumberToDecimalString` + `bigintToSafeNumber` (`defindex-yield.adapter.ts` L208–209, `safe-integer.ts`). |
| 13 | Activity completeness | **FAIL** | `activity.ts` stub over `OperationStore`; no ledger/history indexing; multi-step payment metadata optional in `metadata` only. |
| 14 | Anchor external transfer IDs persisted + poll updates ops | **PASS** | Deposits/withdrawals record `anchorTransferId` (`anchor.ts` L117–125, L154–162); `GET /transfers/:id` updates by `operationId` or `findByExternalRef` (`L182–205). |
| 15 | `riskProfile` actually used (no `void riskProfile`) | **PASS** | Grep: no `void riskProfile`; used in `yield.service.ts` L26–36, L79; `deterministic-risk-engine.ts` L48–68; policy routes/services. |
| 16 | Intrinsic strategy risk not mutated from user preference | **FAIL** | P1 #1 — `normalizeStrategy` sets `strategy.risk` from profile. |
| 17 | Contract tests: auth without `mock_all_auths` on auth-required tests; invalid cases | **PASS** | `test.rs`: `set_policy_requires_user_auth`, `update_risk_requires_user_auth`, `authorize_allocation_requires_user_auth` without mock; invalid liquidity/risk/timestamp/strategy tests L93–177. Other happy-path tests still use `mock_all_auths`. |
| 18 | Secrets in git | **PASS** | No committed `.env`; `.env.example` placeholders only; grep found no live API key assignments in tracked source. |
| 19 | Stale docs (`paltalabs` canonical, DONE without evidence) | **PARTIAL FAIL** | Canonical backend docs point to `defindex-io` (P2 #2); `TESTNET_EVIDENCE.md` honest PARTIAL/BLOCKED; stale `paltalabs` in non-backend audit material (P2). |
| 20 | False-positive PASS conditions | **FAIL** | P1 #2–4 (`e2e-trinqa.ts`); DeFindex PASS on build-only. |

**Additional checks**

| Check | Status | Evidence |
|-------|--------|----------|
| TRY withdraw `dest` hardcoded after unwind | **FAIL (P0)** | `payment-execution.service.ts` L161 |
| Earn-funded payment implemented vs stub | **PARTIAL** | **Implemented** in `PaymentRouter` + `PaymentExecutionService`; **not proven** in E2E (#10, P1 #4). |
| Yield execute endpoint | **PASS** | `POST /api/v1/yield/execute` (`yield.ts` L74–85) → `yield.service.ts` L173–194. |
| Capabilities honesty | **PASS** | `capability.service.ts`: swap `unavailable` when registry/`SOROSWAP_API_KEY` missing; earn `missing_vault_or_key`; anchor TRY `testnet_only`. |

## False-positive PASS audit

| Script / test | Condition that can PASS | What is *not* proven | Severity |
|---------------|---------------------------|----------------------|----------|
| `e2e-trinqa.ts` DeFindex | HTTP 200 on deposit **build** | On-chain deposit, vault balance, withdraw | P1 |
| `e2e-trinqa.ts` Soroswap | Health check OK | Quote→build→send, recipient `to` on-chain | P1 |
| `e2e-trinqa.ts` Earn-funded payment | Quote with `requiresEarnUnwind === false` | Earn balance, unwind, `execute-step` chain | P1 |
| `e2e-trinqa.ts` overall | Prints `Anchor: PASS`, `Policy: PASS` while partner legs BLOCKED | Full lifecycle (exits 3 — honest summary line) | OK at summary; misleading per-leg labels |
| `TESTNET_EVIDENCE.md` | Documents PARTIAL/BLOCKED for partner legs | Does not prevent CI from treating anchor/policy PASS as milestone complete | OK (doc honest) |

Forbidden greps (audit run): **no** `void riskProfile`, **no** `BigInt(Math.trunc`, **no** `dest === 'USDC' \|\| dest === 'XLM'` stellar_transfer hack, **no** `fake PASS` string, **no** JWT in anchor quote JSON response (`anchor-routes.test.ts` L36).

## Security audit

- **JWT exposure:** SEP-10 JWT stored in `AnchorSessionStore` only; API returns `sessionId` (`anchor-session-store.service.ts` L9–17; `anchor.ts` L71–72). Unit test rejects raw JWT on quotes (`anchor-routes.test.ts` L22–27).
- **Secrets:** No live keys in tracked files; partner keys required via env (BLOCKED E2E without `.env`).
- **P0 security/correctness:** Hardcoded TRY IBAN in payment execution (see P0 #1) — wrong payout destination, not a secret leak.
- **Session binding:** `jwtFromSession` enforces account on deposits/withdrawals when `account` provided (`anchor.ts` L110, L145).

## Test audit

| Command | Result | Notes |
|---------|--------|-------|
| `cd backend && npm run build` | **PASS** | `tsc -p tsconfig.json` |
| `cd backend && pnpm build` | **FAIL** | Corepack/pnpm loader error in audit environment |
| `cd backend && npm test` | **PASS** | 11 files, 29 tests |
| `cd backend && npm run test:integration` | **PASS** | 4 tests (live testnet policy + anchor) |
| `cd contracts/trinqa-policy && cargo test` | **PASS** | 12 tests (package `trinqa-allocation-policy`) |
| `npm run e2e:anchor` | **PASS** | Live SEP-6 deposit/withdraw completed |
| `npm run e2e:policy` | **PASS** | set_policy submit + read |
| `npx tsx scripts/e2e-defindex.ts` | **BLOCKED** | exit 2 — missing DEFINDEX keys/vault |
| `npx tsx scripts/e2e-soroswap.ts` | **BLOCKED** | exit 2 — missing SOROSWAP_API_KEY |
| `npx tsx scripts/e2e-trinqa.ts` | **PARTIAL** | exit **3**; Anchor+Policy PASS; partner legs BLOCKED |

## E2E audit

- **Anchor / policy:** Real testnet flows succeeded in this audit (deposit/withdraw poll to `completed`; policy write tx successful).
- **USDC funding fixture:** `fundTestnetUsdcAccount` requires anchor on-ramp balance increase, not trustline-only (`testnet-usdc-fixture.ts` L108–110) — used by defindex/soroswap/trinqa scripts.
- **Partner scripts:** Correctly exit 2 with BLOCKED message when keys missing (honest).
- **Trinqa lifecycle:** Does not require full lifecycle PASS (exit 3); per-leg PASS labels overstated when keys present (see False-positive table).
- **Earn→TRY after unwind:** Code path exists but **P0** hardcoded `dest` invalidates production readiness.

## Final recommendation
**READY FOR REPAIR PASS**

Fix P0 TRY `dest` after earn-unwind, decouple vault intrinsic risk from `riskProfile` in `normalizeStrategy`, tighten `e2e-trinqa` PASS criteria (mirror `e2e-defindex` / `e2e-soroswap` depth), wire or remove `balanceSource`, then re-run partner E2E with credentials and update `TESTNET_EVIDENCE.md` with tx hashes.
