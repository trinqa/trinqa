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
| POST | `/api/v1/yield/withdrawals/build` | Unsigned withdraw / shares XDR |

## Swaps (Soroswap)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/swaps/assets` | Testnet asset discovery |
| POST | `/api/v1/swaps/quote` | Exact in/out quote |
| POST | `/api/v1/swaps/build` | Unsigned swap XDR |

## Payments

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/payments/quote` | Route quote (`stellar_transfer`, `fiat_payout`, …); includes `candidateCount`, `routeScore` |
| POST | `/api/v1/payments/withdraw/quote` | TRY off-ramp quote shortcut (USDC → TRY via anchor) |
| POST | `/api/v1/payments/build` | Build payment / anchor session |
| POST | `/api/v1/payments/submit` | Submit signed classic tx |

## Anchor (TR mock, SEP-6)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/anchor/session` | Domain + SEP-10 hint |
| POST | `/api/v1/anchor/quotes` | SEP-38 quote (JWT body) |
| POST | `/api/v1/anchor/deposits` | SEP-6 interactive deposit |
| POST | `/api/v1/anchor/withdrawals` | SEP-6 interactive withdraw |

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

`NO_SUPPORTED_PAYOUT_RAIL` (BRL), `EARN_UNWIND_REQUIRED`, `QUOTE_EXPIRED`, `ROUTE_UNAVAILABLE`, `ADAPTER_UNAVAILABLE`, `INSUFFICIENT_BALANCE`
