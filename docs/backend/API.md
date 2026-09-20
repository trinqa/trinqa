# Trinqa Backend API (v1, testnet)

Base URL: `http://127.0.0.1:8787` (default)

## Health & capabilities

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Horizon, anchor, DeFindex, Soroswap, policy contract, demo signer |
| GET | `/api/v1/capabilities` | Truthful rails (TRY via TR mock; BRL blocked; earn/swap flags) |

## Accounts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/accounts/:accountId/balances` | Horizon balances |
| GET | `/api/v1/accounts/:accountId/receive` | Receive payload + QR string |

## Policy (Soroban)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/policy/:accountId` | On-chain policy view |
| POST | `/api/v1/policy/build` | Unsigned policy XDR |
| POST | `/api/v1/policy/submit` | Submit signed Soroban XDR |

## Yield (DeFindex)

Returns `ADAPTER_UNAVAILABLE` when `DEFINDEX_API_KEY` or `DEFINDEX_VAULT_ADDRESS` is missing.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/yield/recommendations/:accountId` | Ranked strategies + target-date horizon (`?targetDate=` or `?daysToTarget=`) |
| GET | `/api/v1/yield/strategies` | Normalized strategies |
| GET | `/api/v1/yield/positions/:accountId` | Vault positions |
| POST | `/api/v1/yield/deposits/build` | Unsigned deposit XDR |
| POST | `/api/v1/yield/withdrawals/build` | Unsigned withdraw / shares XDR (+ `operationId`) |
| POST | `/api/v1/yield/execute` | Submit signed DeFindex XDR for a yield `operationId` |

## Swaps (Soroswap)

Returns `ADAPTER_UNAVAILABLE` when `SOROSWAP_API_KEY` is missing.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/swaps/assets` | Testnet asset discovery |
| POST | `/api/v1/swaps/quote` | Exact in/out quote |
| POST | `/api/v1/swaps/build` | Unsigned swap XDR (`from`, optional `to` recipient) |

## Payments

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/payments/quote` | Recipient-first quote (`receiveAmount`, `receiveCurrency`); USDC debit derived; optional `anchorSessionId` for TRY |
| POST | `/api/v1/payments/withdraw/quote` | USDC→TRY via live SEP-38 (`anchorSessionId` required) |
| POST | `/api/v1/payments/build` | Build payment; `approveEarnUnwind: true` when quote requires earn unwind |
| POST | `/api/v1/payments/execute-step` | Continue multi-step pay (`yield_withdraw` → `stellar_payment` / `soroswap_swap` / `anchor_withdraw`) |
| POST | `/api/v1/payments/submit` | Submit signed classic tx |

## Anchor (TR mock, SEP-6)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/anchor/session` | Domain + SEP-10 hint |
| GET | `/api/v1/anchor/auth/challenge?account=G…` | SEP-10 challenge XDR (client signs) |
| POST | `/api/v1/anchor/auth/complete` | `{ transaction }` → opaque `{ sessionId, expiresAt }` (JWT server-side only) |
| POST | `/api/v1/anchor/quotes` | SEP-38 quote (`sessionId` body) |
| POST | `/api/v1/anchor/deposits` | SEP-6 interactive deposit (`sessionId`) |
| POST | `/api/v1/anchor/withdrawals` | SEP-6 withdraw (`sessionId`, optional `quoteId`) |
| GET | `/api/v1/anchor/transfers/:id?sessionId=` | SEP-6 transaction status |

## Anchor directory & routing (Phase 2)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/anchors` | Every discovered anchor with its SEPs, rails and status (`EXECUTABLE`/`QUOTE_ONLY`/`DISCOVERY_ONLY`/`UNAVAILABLE`) |
| GET | `/api/v1/routes/preview` | Scored route candidates: `direction`, `currency`, `amount`, optional `riskProfile`+`daysToTarget`, `requireExecutable`, `kycStatus` |

`routes/preview` returns eligible routes with a 0-100 score per factor and, per factor,
whether the value was computed or came from the Jev advisor (`factorSources`). `netCost`
and `speed` are always computed. Rejected anchors come back with their reasons.
TRY payment quotes carry the same decision, compacted, under `providerPayload.routeDecision`.

## Operations & activity

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/operations/:id` | Normalized operation |
| GET | `/api/v1/activity/:accountId` | Activity from the operation store |

## Demo signer (testnet only)

Never returns secrets. Disabled routes return `403`.

Requests may carry `x-wallet-key`: the device's custodial wallet. The signer then
acts as that wallet instead of the env demo account. Wallet keys are not stored —
each account's seed is `HMAC(master, walletKey)`, so accounts survive redeploys.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/demo/wallets` | Create or restore a device wallet: funds it and adds the USDC trustline (idempotent) |
| GET | `/api/v1/demo/account` | G-address of the calling wallet, or the env demo account |
| POST | `/api/v1/demo/sign` | Sign classic/Soroban XDR as the calling wallet |
| POST | `/api/v1/demo/sep10` | SEP-10 + opaque `sessionId` |
| POST | `/api/v1/demo/anchor/simulate-bank-transfer` | Mock bank credit for SEP-6 deposit |
| POST | `/api/v1/demo/trustline/usdc` | Add USDC trustline for the demo account |
| POST | `/api/v1/demo/contacts` | Accounts for the seeded demo contacts (`{ ids }` → funded account per id, idempotent) |

## Transactions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/transactions/submit` | Submit signed Horizon XDR |

## Error codes

`NO_SUPPORTED_PAYOUT_RAIL` (BRL), `EARN_UNWIND_APPROVAL_REQUIRED`, `QUOTE_EXPIRED`, `ROUTE_UNAVAILABLE`, `ADAPTER_UNAVAILABLE`, `INSUFFICIENT_BALANCE`, `SMART_WALLET_FLOW_REQUIRED`, `ASSET_ROUTE_UNAVAILABLE`
