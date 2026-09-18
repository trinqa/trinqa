# Testnet evidence log

**Run:** 2026-09-18 (Node v22.21.0, branch `backend/integration`, worktree verification)  
**Local `.env`:** absent — partner keys unset; policy/anchor e2e use defaults + ephemeral accounts.

## Commands

```bash
cd backend
source ~/.nvm/nvm.sh && nvm use 22
pnpm verify
pnpm test:integration
pnpm e2e:anchor
pnpm e2e:policy
pnpm e2e:defindex
pnpm e2e:soroswap
```

## Summary

| Command | Result | Notes |
|---------|--------|-------|
| `pnpm verify` | **PASS** | 10 files, 22 tests (after SEP-10 session fix) |
| `pnpm test:integration` | **PASS** | 2 files, 4 tests (live testnet) |
| `pnpm e2e:anchor` | **PARTIAL** | SEP-1/6 info, SEP-10, SEP-38 (1000 TRY) — **no SEP-6 deposit/withdraw lifecycle in script** |
| `pnpm e2e:policy` | **PASS** | Real `set_policy` + `get_policy` on deployed contract |
| `pnpm e2e:defindex` | **BLOCKED** | exit 2 — no `DEFINDEX_*` |
| `pnpm e2e:soroswap` | **BLOCKED** | exit 2 — no `SOROSWAP_API_KEY` |

## Policy contract (`deployments/testnet.json`)

| Field | Value |
|-------|--------|
| Contract ID | `CBYXLFGRPSSAKIM2IT4XNXQ34DONI7RQL3UR5DKJJC5W3R3IFS5ACI5G` |
| Deploy tx | `c68633a182751ab72d96626110c61b48933e62a736de5236c0be1d3211717fe2` (Horizon: successful, ledger 4746920) |
| Install tx | `744013e5983b94b233417c67c74135d80a426ae981827facdc3173b9b896a2d8` |
| WASM hash | `49c2d7eb510b2db630305033fed0a0310a8884825443eb6374f78352ab7e9db3` |

### On-chain policy write (e2e:policy)

- Account: `GBPVMZBTEN5E3MFM4MIBO5T3IN5CQKKBY36KXVTOPYTL24RTNOOGF6KC`
- Tx hash: `0cda0dabf516fbdd809f29492893a3f5da372a5a385422d8f04ab51e4b155aab`
- Read-back: configured, `liquidityTargetBps` 3000, strategies `defindex`, `soroswap`

## Anchor e2e tx hashes (partial script)

| Step | Hash / id |
|------|-----------|
| Friendbot fund | `66956c81204f7038e74c85d1f9d60bb7c68c56d50693e9ba63a1ca4c05000377` |
| USDC trustline | `9ef18e58f9049a59da57872a0b1fb06bcec74e1b17e7e3d5df46fd73c045cf63` |
| SEP-38 quote | id `qt_07xw3b5wdm2swoah5u1s`, **1000.00 TRY** sell (script label; not 100 TRY SEP-6 deposit) |

**Gap vs anchor proof checklist:** `scripts/e2e-anchor.ts` does not run SEP-6 100 TRY deposit, simulate-bank-transfer, USDC balance check, or USDC→TRY withdraw — document as **INCOMPLETE** until script extended or manual run recorded.

## SEP-10 audit (2026-09-18)

- **Fixed:** `/api/v1/anchor/quotes|deposits|withdrawals` no longer accept client `jwt`; use `sessionId` from `/api/v1/anchor/auth/complete`.
- JWT remains in `AnchorSessionStore` (server memory) only.
- Unit: `anchor-session-store.test.ts`, `anchor-routes.test.ts`.

## Terminal output — `pnpm verify`

```
$ pnpm build && vitest run
$ tsc -p tsconfig.json

 RUN  v3.2.7 /Users/apple/dev/trinqa-backend-worktree/backend

 ✓ tests/unit/risk-engine.test.ts (3 tests)
 ✓ tests/unit/yield-recommendation.test.ts (2 tests)
 ✓ tests/unit/policy.domain.test.ts (3 tests)
 ✓ tests/unit/quote-store.test.ts (1 test)
 ✓ tests/unit/money.test.ts (2 tests)
 ✓ tests/unit/anchor-session-store.test.ts (2 tests)
 ✓ tests/unit/anchor-routes.test.ts (1 test)
 ✓ tests/unit/capability.service.test.ts (2 tests)
 ✓ tests/unit/payment-router.test.ts (4 tests)
 ✓ tests/unit/tr-mock-anchor.test.ts (2 tests)

 Test Files  10 passed (10)
      Tests  22 passed (22)
```

## Terminal output — `pnpm test:integration`

```
$ vitest run --config vitest.integration.config.ts

 ✓ tests/integration/anchor.integration.test.ts (2 tests)
 ✓ tests/integration/policy.integration.test.ts (2 tests)

 Test Files  2 passed (2)
      Tests  4 passed (4)
```

## Terminal output — `pnpm e2e:policy` (excerpt)

```
[sign + submit] { hash: '0cda0dabf516fbdd809f29492893a3f5da372a5a385422d8f04ab51e4b155aab', successful: true }
[get policy] { configured: true, liquidityTargetBps: 3000, ... }
[done] e2e-policy OK
```

## Terminal output — partner e2e

```
$ pnpm e2e:defindex
BLOCKED: DEFINDEX_API_KEY, DEFINDEX_VAULT_ADDRESS
exit 2

$ pnpm e2e:soroswap
BLOCKED: SOROSWAP_API_KEY
exit 2
```

(Full `e2e:anchor` log: 153 lines — see verification run artifact `/tmp/trinqa-e2e-anchor.log` locally.)
