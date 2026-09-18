# Testnet evidence log

**Run:** 2026-09-18 (Node v22.21.0, branch `backend/integration`, worktree verification)  
**Local `.env`:** absent — partner keys unset; e2e uses ephemeral Stellar accounts.

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
| `pnpm verify` | **PASS** | 10 files, 22 tests |
| `pnpm test:integration` | **PASS** | 2 files, 4 tests (live testnet) |
| `pnpm e2e:anchor` | **PASS** | Full SEP-1/6/10/38 + 100 TRY deposit sim + USDC→TRY withdraw (Memo.id) |
| `pnpm e2e:policy` | **PASS** | Real `set_policy` + `get_policy` on deployed contract |
| `pnpm e2e:defindex` | **BLOCKED** | exit 2 — no `DEFINDEX_*` |
| `pnpm e2e:soroswap` | **BLOCKED** | exit 2 — no `SOROSWAP_API_KEY` |

## Policy contract (`deployments/testnet.json`)

| Field | Value |
|-------|--------|
| Contract ID | `CBYXLFGRPSSAKIM2IT4XNXQ34DONI7RQL3UR5DKJJC5W3R3IFS5ACI5G` |
| Deploy tx | `c68633a182751ab72d96626110c61b48933e62a736de5236c0be1d3211717fe2` |
| Install tx | `744013e5983b94b233417c67c74135d80a426ae981827facdc3173b9b896a2d8` |
| WASM hash | `49c2d7eb510b2db630305033fed0a0310a8884825443eb6374f78352ab7e9db3` |

### On-chain policy write (`e2e:policy`, this run)

- Account: `GCVSPJZHTERTXZSC6EW7ERKSE4YD5DT66EDTVK66PMYGRSS5U7V2IOP6`
- Tx hash: `f3304192da9bb1d0f6b0c2e38caecfd269ff97496771a5b8c42fb1ae70bccdf0`
- Read-back: configured, `liquidityTargetBps` 3000, strategies `defindex`, `soroswap`

## Anchor e2e (`e2e:anchor`, full lifecycle)

| Step | Id / hash |
|------|-----------|
| Test account | `GCI3FNRSLQ4XZQD6RAV7DLKBJHTCC4D4FPQYIKZDQNRUSHD2SZYBF2LL` |
| Friendbot | `1ab12ab228e4be3df5a03de120c58308e4abc92d3e9389f68b0cbebdb5dc3d7e` |
| USDC trustline | `f46100df65f95c884e5b22c1bd220667f02c2968eb0deb8a1faa02ae3c5b897f` |
| SEP-38 quote | id `qt_ekbx22t2p4qvtblsv7cl`, **100.00 TRY** → **2.0396090 USDC** |
| SEP-6 deposit | id `sep_gy0l912otiaxgfqsamal` |
| Deposit payout (Stellar) | `de15a80dbb206feebdad7ce1f650d5968a227a38dce1b3f44dda082d7d3db1d7` |
| SEP-6 withdraw | id `sep_3egqd0ml2qsx1gozj4gh`, Memo.id `807439262530` |
| Withdraw USDC payment | `075843756be5a41714ea6d182f3871e6e1c546e4a52eb933ec585f7c1920bc3d` |

**Adapter note:** TR mock anchor uses SEP-6 **GET** `/deposit` and `/withdraw` (not POST `/transactions/.../interactive`). Sandbox bank credit: **POST** `/sep6/tx/{id}/simulate-bank-transfer` (`ENABLE_MOCK_BANK_TRANSFER=true` set in script env).

## SEP-10 audit (2026-09-18)

- `/api/v1/anchor/quotes|deposits|withdrawals` use opaque `sessionId` from `/api/v1/anchor/auth/complete` (JWT server-side only).
- Unit: `anchor-session-store.test.ts`, `anchor-routes.test.ts`.

## Terminal output — `pnpm verify`

```
 Test Files  10 passed (10)
      Tests  22 passed (22)
```

## Terminal output — `pnpm test:integration`

```
 ✓ tests/integration/anchor.integration.test.ts (2 tests)
 ✓ tests/integration/policy.integration.test.ts (2 tests)

 Test Files  2 passed (2)
      Tests  4 passed (4)
```

## Terminal output — `pnpm e2e:anchor` (excerpt)

```
[SEP-38 quote amount selected] { sellAmountTry: '100' }
[USDC balance after deposit] { usdcAfterDeposit: 2.039609 }
[deposit stellar tx] { stellarTxHash: 'de15a80dbb206feebdad7ce1f650d5968a227a38dce1b3f44dda082d7d3db1d7' }
[SEP-6 withdraw (USDC -> TRY)] { memo_type: 'id', memo: '807439262530', id: 'sep_3egqd0ml2qsx1gozj4gh' }
[Stellar payment to anchor treasury (Memo.id)] { hash: '075843756be5a41714ea6d182f3871e6e1c546e4a52eb933ec585f7c1920bc3d', successful: true }
[withdraw poll] { id: 'sep_3egqd0ml2qsx1gozj4gh', status: 'completed' }
[done] { result: 'e2e-anchor OK', tryDepositAmount: '100', ... }
```

## Terminal output — `pnpm e2e:policy` (excerpt)

```
[sign + submit] { hash: 'f3304192da9bb1d0f6b0c2e38caecfd269ff97496771a5b8c42fb1ae70bccdf0', successful: true }
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
