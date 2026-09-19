# Mobile wiring (BFF v1, testnet)

Base: `EXPO_PUBLIC_API_BASE_URL` (dev fallback `http://127.0.0.1:8787`).

Mobile never holds `DEMO_SIGNER_SECRET`, SEP-10 JWTs, DeFindex keys, or Soroswap keys.

## Bootstrap

1. `GET /api/v1/health` and `GET /api/v1/capabilities`
2. If `features.demoSigner`, `GET /api/v1/demo/account` for the session G-address (or `EXPO_PUBLIC_ACCOUNT_ID`)
3. `GET /api/v1/accounts/:id/balances` and `GET /api/v1/activity/:id`

Empty balances and an empty activity list are honest until ledger operations exist.

## Add money (TRY → USDC)

1. `POST /api/v1/demo/sep10` (or SEP-10 challenge/complete)
2. `POST /api/v1/anchor/quotes` then `POST /api/v1/anchor/deposits`
3. `POST /api/v1/demo/anchor/simulate-bank-transfer` in demo
4. Poll `GET /api/v1/anchor/transfers/:id?sessionId=`

## Pay (USDC)

```json
POST /api/v1/payments/quote
{
  "fromAccount": "G…",
  "recipient": "G…",
  "receiveAmount": "5.0000000",
  "receiveCurrency": "USDC",
  "balanceSource": "available"
}
```

Then `POST /api/v1/payments/build` → `POST /api/v1/demo/sign` → `POST /api/v1/payments/submit` (or `execute-step` for multi-step).

BRL quotes fail with `NO_SUPPORTED_PAYOUT_RAIL`.

## Withdraw (USDC → TRY)

Quote with `receiveCurrency: "TRY"`, `anchorSessionId`, `withdrawDest`. Build returns `unsignedXdr` + `currentStep: "anchor_withdraw"`. Sign and `execute-step`.

## Put money to work

Policy `build` + `submit` always. Yield deposit only if capabilities say DeFindex is ready; otherwise the UI shows unavailable — no fake deposit.

## Demo signer

When `GET /api/v1/capabilities` → `features.demoSigner`:

- `GET /api/v1/demo/account` → `{ account }`
- `POST /api/v1/demo/sep10` → `{ sessionId, expiresAt }`
- `POST /api/v1/demo/sign` `{ unsignedXdr }` → `{ signedXdr }`
- `POST /api/v1/demo/anchor/simulate-bank-transfer`

Production wallets sign locally instead.

## Errors to surface

`INSUFFICIENT_BALANCE`, `EARN_UNWIND_APPROVAL_REQUIRED`, `ROUTE_UNAVAILABLE`, `QUOTE_EXPIRED`, `NO_SUPPORTED_PAYOUT_RAIL`, `ADAPTER_UNAVAILABLE`, `ALREADY_COMPLETED`, `DEFINDEX_VAULT_ASSET_MISMATCH`
