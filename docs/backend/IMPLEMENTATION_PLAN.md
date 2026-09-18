# Trinqa Backend — Implementation Plan (Testnet)

**P2 note:** Activity feed remains an OperationStore stub until ledger indexing (`activity.ts`); M4 “DONE (code)” does not imply indexed history proof in `TESTNET_EVIDENCE.md`. Stale `paltalabs/defindex-sdk` links in non-backend audit docs deferred — canonical is `defindex-io/defindex-sdk`.

**Branch:** `backend/integration`

| # | Scope | Status |
|---|--------|--------|
| M1 | Bootstrap, anchor, health | VERIFIED TESTNET |
| M2 | Policy contract + API | VERIFIED TESTNET (M5 WASM redeploy) |
| M3 | DeFindex, Soroswap, PaymentRouter | IMPLEMENTED / UNVERIFIED (partner keys) |
| M4 | SEP-6 audit, recommendations, activity | DONE (code) |
| M5 | Correctness, earn orchestration, E2E honesty | **IN PROGRESS** — code complete; partner E2E BLOCKED without keys |

See `TESTNET_EVIDENCE.md` for command-level proof.
