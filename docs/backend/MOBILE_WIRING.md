# Mobile wiring (BFF v1, testnet)

Base: `http://localhost:8787` · Mobile signs classic/Soroban XDR locally; backend stores anchor JWT as opaque `sessionId`.

## Flow order

1. `GET /api/v1/health` · `GET /api/v1/capabilities`
2. `GET /api/v1/accounts/:id/balances`
3. `GET /api/v1/anchor/session` → SEP-10 challenge/complete → `{ sessionId }`
4. `POST /api/v1/anchor/quotes` (SEP-38 TRY→USDC on-ramp)
5. `POST /api/v1/anchor/deposits` → poll `GET /api/v1/anchor/transfers/:id?sessionId=`
6. `GET /api/v1/yield/strategies` · `POST /api/v1/yield/deposits/build` · `POST /api/v1/yield/execute`
7. **Pay (recipient-first)**

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

Response `quote`: `receiveAmount`, `receiveCurrency`, `debitAmount`, `debitAsset` (`USDC`), `source.amount` (= USDC debit), `destination` (= recipient receives), `funding`, `routeType`, `quoteId`.

```json
POST /api/v1/payments/build
{ "quoteId": "…", "fromAccount": "G…", "approveEarnUnwind": true }
```

Returns `unsignedXdr`, `currentStep`, `operationId` when classic signing needed.

```json
POST /api/v1/payments/execute-step
{ "operationId": "…", "step": "yield_withdraw|stellar_payment|soroswap_swap|anchor_withdraw", "signedXdr": "…" }
```

8. TRY off-ramp: `POST /api/v1/payments/withdraw/quote` or pay quote with `receiveCurrency: "TRY"`, `anchorSessionId`, `withdrawDest` · SEP-6 withdraw + Memo.id USDC payment
9. `GET /api/v1/activity/:accountId`
10. Policy: `GET /api/v1/policy/:id` · `POST /api/v1/policy/build` · `POST /api/v1/policy/submit`

## Errors mobile should surface

`INSUFFICIENT_BALANCE`, `EARN_UNWIND_APPROVAL_REQUIRED`, `ROUTE_UNAVAILABLE`, `QUOTE_EXPIRED`, `NO_SUPPORTED_PAYOUT_RAIL`, `ALREADY_COMPLETED`, `DEFINDEX_VAULT_ASSET_MISMATCH`

## Testnet demo signer (backend-only)

Mobile never holds `DEMO_SIGNER_SECRET`, anchor JWTs, DeFindex keys, or Soroswap keys.

When `GET /api/v1/capabilities` → `features.demoSigner` is true:

- `GET /api/v1/demo/account` → `{ account }` (G-address only)
- `POST /api/v1/demo/sep10` → `{ sessionId, expiresAt }`
- `POST /api/v1/demo/sign` `{ unsignedXdr }` → `{ signedXdr }`
- `POST /api/v1/demo/anchor/simulate-bank-transfer` `{ sessionId, transferId }`

If the demo signer is off those routes return `403`. Production wallets sign locally instead.

TRY off-ramp `POST /api/v1/payments/build` returns `unsignedXdr` + `currentStep: "anchor_withdraw"` so mobile can `execute-step` the USDC funding payment.

## CLI fallback

`npm run e2e:core` — full demo without partner keys.
