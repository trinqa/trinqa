# Trinqa Backend API (v1, testnet)

Base URL: `http://localhost:8787` (default)

## Health & capabilities

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Horizon, anchor, DeFindex, Soroswap, policy contract |
| GET | `/api/v1/capabilities` | Truthful rails (TRY anchor, BRL blocked) |

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

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/yield/recommendations/:accountId` | Ranked strategies + target-date horizon (`?targetDate=` or `?daysToTarget=`) |
| GET | `/api/v1/yield/strategies` | Normalized strategies |
| GET | `/api/v1/yield/positions/:accountId` | Vault positions |
| POST | `/api/v1/yield/deposits/build` | Unsigned deposit XDR |
| POST | `/api/v1/yield/withdrawals/build` | Unsigned withdraw / shares XDR (+ `operationId`) |
| POST | `/api/v1/yield/execute` | Submit signed DeFindex XDR for a yield `operationId` |

## Swaps (Soroswap)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/swaps/assets` | Testnet asset discovery |
| POST | `/api/v1/swaps/quote` | Exact in/out quote |
| POST | `/api/v1/swaps/build` | Unsigned swap XDR (`from`, optional `to` recipient) |

## Payments

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/payments/quote` | Route quote; `sourceAssetCode` USDC only; optional `anchorSessionId` for TRY; returns `funding` breakdown |
| POST | `/api/v1/payments/withdraw/quote` | USDC→TRY via live SEP-38 (`anchorSessionId` required) |
| POST | `/api/v1/payments/build` | Build payment; `approveEarnUnwind: true` when quote requires earn unwind |
| POST | `/api/v1/payments/execute-step` | Continue multi-step pay (`yield_withdraw` → `stellar_payment` / `soroswap_swap`) |
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

## Operations & activity

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/operations/:id` | Normalized operation |
| GET | `/api/v1/activity/:accountId` | Activity stub from operation store |

## Transactions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/transactions/submit` | Submit signed Horizon XDR |

## Error codes

`NO_SUPPORTED_PAYOUT_RAIL` (BRL), `EARN_UNWIND_APPROVAL_REQUIRED`, `QUOTE_EXPIRED`, `ROUTE_UNAVAILABLE`, `ADAPTER_UNAVAILABLE`, `INSUFFICIENT_BALANCE`, `SMART_WALLET_FLOW_REQUIRED`, `ASSET_ROUTE_UNAVAILABLE`
