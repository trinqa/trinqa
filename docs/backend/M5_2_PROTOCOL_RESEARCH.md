# M5.2 Protocol Research (2026-09-18)

Read-only verification against live services and pinned reference repos. **No secrets.** Unknowns marked `UNKNOWN`.

## Sources verified

| Source | Method | Notes |
|--------|--------|--------|
| [stellar-hackathon-turkiye](https://github.com/yigitcangokmen/stellar-hackathon-turkiye) | Local clone `~/trinqa-references/stellar-hackathon-turkiye` | `SKILL.md`, `content/docs/partnerler/*.mdx`, mock-anchor docs |
| TR Mock Anchor | Live `https://tr-mock-anchor.fly.dev` | `/health`, `/llms-full.txt`, `/sep6/info`, `/.well-known/stellar.toml` (not `/stellar.toml`) |
| [defindex-io/defindex-sdk](https://github.com/defindex-io/defindex-sdk) @ **0.3.0** | Local clone + npm registry | `src/`, `README.md`, `CLAUDE.md`, `LLMS-MIGRATION.md`, `defindex-sdk-skill.md` |
| [defindex-io/defindex-skill](https://github.com/defindex-io/defindex-skill) | Live raw `SKILL.md`, `endpoints.md` | Rate limits, `/vault/discover` |
| [soroswap/sdk](https://github.com/soroswap/sdk) @ **0.5.0** | Local clone + npm registry | `README.md`, `llms.txt`, `skills/soroswap-sdk/SKILL.md`, `src/types/*` |
| [soroswap/faucet](https://github.com/soroswap/faucet) | Live `README.md` | Testnet mint UX |
| [soroswap/token-list](https://github.com/soroswap/token-list) | Live `tokenList.json` | `network: "mainnet"` |
| [paltalabs/stellar-workshop](https://github.com/paltalabs/stellar-workshop) | Live `README.md`, `src/soroswap.ts`, `src/defindex.ts` | **Patterns only** (quote→build→sign→send; vault create/deposit) |
| Stellar SAC derivation | `@stellar/stellar-sdk` **14.1.0** (backend lockfile) + [stellar-dev-skill assets SKILL](https://github.com/yigitcangokmen/stellar-hackathon-turkiye) pattern via `~/trinqa-references/stellar-dev-skill/skills/assets/SKILL.md` |
| Trinqa backend lockfile | `backend/package.json`, `backend/pnpm-lock.yaml` | Installed: `@defindex/sdk@0.3.0`, `@soroswap/sdk@0.5.0`, `@stellar/stellar-sdk@^14.1.0` |

---

## 1. DeFindex SDK version & API shape

**Installed / latest npm:** `@defindex/sdk@0.3.0` (`backend/pnpm-lock.yaml`; `npm view @defindex/sdk` → `0.3.0`).

**Class:** `DefindexSDK` (`defindex-sdk/src/defindex-sdk.ts`).

| Operation | SDK method | HTTP | Request body (high level) | Response XDR fields |
|-----------|------------|------|---------------------------|---------------------|
| Deposit | `depositToVault(vault, depositData, network?)` | `POST /vault/{vault}/deposit?network=` | `{ caller, amounts: number[], invest: boolean, slippageBps? }` | `VaultTransactionResponse` |
| Withdraw (amounts) | `withdrawFromVault(vault, withdrawData, network?)` | `POST /vault/{vault}/withdraw?network=` | `{ caller, amounts: number[], slippageBps? }` | same |
| Withdraw (shares) | `withdrawShares(vault, shareData, network?)` | `POST /vault/{vault}/withdraw-shares?network=` | `{ caller, shares: number, slippageBps? }` | same |
| Submit signed tx | `sendTransaction(xdr, network?)` | `POST /send?network=` | `{ xdr: string }` | `SendTransactionResponse` (`txHash`, `success`, `result`, …) — `src/types/stellar.types.ts` |

**`xdr` vs `operationXDR`:** All vault/factory tx builders extend `TransactionResponse` (`src/types/base.types.ts`):

```typescript
{ xdr: string | null; simulationResponse: unknown; operationXDR?: string; isSmartWallet?: boolean; }
```

When `isSmartWallet === true`, `xdr` is `null` and clients must wrap `operationXDR` (`LLMS-MIGRATION.md`). Trinqa adapter rejects smart-wallet flows and requires classic `xdr` (`backend/src/adapters/defindex-yield.adapter.ts` → `requireClassicXdr`).

**Amount types:** Deposit/withdraw `amounts` are **`number[]` (stroops)**, not `bigint` (`src/types/vault.types.ts`). `sendTransaction` accepts **full signed transaction XDR** string only.

---

## 2. Soroswap SDK version & API shape

**Installed / latest npm:** `@soroswap/sdk@0.5.0` (`backend/pnpm-lock.yaml`; `npm view @soroswap/sdk` → `0.5.0`).

**Class:** `SoroswapSDK` (`soroswap-sdk/src/soroswap-sdk.ts`).

| Operation | SDK method | HTTP |
|-----------|------------|------|
| Quote | `quote(QuoteRequest, network?)` | `POST /quote?network=` |
| Build | `build(BuildQuoteRequest, network?)` | `POST /quote/build?network=` |
| Asset lists | `getAssetList(name?: SupportedAssetLists)` | `GET /asset-list` (+ `?name=soroswap` when filtered) |
| Submit | `send(xdr, network?)` | `POST /send?network=` |

**Quote request** (`src/types/quote.ts`): `assetIn`, `assetOut`, `amount: bigint`, `tradeType: EXACT_IN | EXACT_OUT`, `protocols[]`, optional `slippageBps`, `assetList`, etc.

**Build request:** `{ quote: QuoteResponse; from?: string; to?: string; referralId?; sponsor?; signedUserXdr? }` → `{ xdr, action, description }`.

**Trinqa wrapper:** `SoroswapAdapter.quoteExactIn/Out`, `buildFromQuote(quote, from, to?)` (`backend/src/adapters/soroswap.adapter.ts`).

**Default network in SDK ctor:** `MAINNET` if unset (`soroswap-sdk.ts:32`); Trinqa forces `TESTNET` in adapter.

---

## 3. Testnet asset discovery behavior

| Mechanism | Auth | Observed / documented behavior |
|-----------|------|--------------------------------|
| Soroswap `getAssetList(SupportedAssetLists.SOROSWAP)` | **Required** (`SoroswapSDKConfig.apiKey` required in types; HTTP `Authorization: Bearer`) | Live probe with invalid key: **403 Forbidden** (`https://api.soroswap.finance/asset-list?name=soroswap&network=testnet`). **Exact testnet list payload without valid key: UNKNOWN.** |
| Static list URL in enum | N/A | `SupportedAssetLists.SOROSWAP` → `https://raw.githubusercontent.com/soroswap/token-list/main/tokenList.json` — file declares **`"network": "mainnet"`** only; 47 assets; USDC maps `issuer` GA5Z… → `contract` CCW67… (`soroswap-sdk/src/types/common.ts`, live token list). |
| Trinqa `SoroswapAssetRegistry` | Uses Soroswap API via adapter | Resolves classic `code` + optional `issuer` → `contract`/`contractId` from API list; 10‑min cache (`backend/src/services/soroswap-asset-registry.ts`). |
| DeFindex `GET /vault/discover?network=testnet` | **No auth** (public per defindex-skill) | Live 2026-09-18: **14 vault addresses**, APY only (`totalManagedFunds: null` for all). Does not enumerate underlying asset contracts. |
| Soroswap faucet | Web UI | Mints testnet tokens via Soroswap API ([soroswap/faucet README](https://github.com/soroswap/faucet/blob/main/README.md)). |

**Workshop pattern (testnet, hardcoded — not a registry):** `Asset.native().contractId(Networks.TESTNET)` for XLM; USDC constant `CDWEFYYHMGEZEFC5TBUDXM3IJJ7K7W5BDGE765UIYQEV4JFWDOLSTOEK` in `paltalabs/stellar-workshop` `src/soroswap.ts` (live raw, 2026).

---

## 4. Exact-out / build / `to` recipient

1. **Quote:** `tradeType: TradeType.EXACT_OUT` with `amount` = desired **output** in stroops (`src/types/quote.ts`, `QuoteResponse.tradeType`, `rawTrade` exact-out shapes).
2. **Build:** `build({ quote, from, to })` — `to` is **optional**; docs state it **defaults to `from`** ([soroswap/sdk README](https://github.com/soroswap/sdk/blob/main/README.md) “Build Transaction”; `skills/soroswap-sdk/SKILL.md` L124).
3. **Trinqa payment flow:** After earn unwind, `buildFromQuote(swapQuote, payload.fromAccount, payload.recipient)` sends swap output to **payment recipient** (`backend/src/services/payment-execution.service.ts` L125–128). Quote step uses exact-out for XLM payout amount (`payment-router.service.ts` L217–221).

---

## 5. API key requirements

| Provider | Required? | Format / header | Trinqa env |
|----------|-----------|-----------------|------------|
| **Soroswap** | **Yes** for SDK (`SoroswapSDKConfig.apiKey: string`) | `Authorization: Bearer sk_…` (`http-client.ts`, README, `llms.txt`) | `SOROSWAP_API_KEY` — e2e exits 2 if missing (`backend/README.md`) |
| **DeFindex** | **Optional in SDK type** (`apiKey?: string`); **required for vault ops in practice** | Bearer when set (`defindex-sdk/src/clients/http-client.ts`) | `DEFINDEX_API_KEY` + `DEFINDEX_VAULT_ADDRESS` for earn (`backend/.env.example`) |
| **DeFindex public** | No key | `/health`, `/vault/discover`, `/strategies`, `/factory/address` documented public ([defindex-skill/endpoints.md](https://raw.githubusercontent.com/defindex-io/defindex-skill/main/endpoints.md)) | Live: `/vault/discover?network=testnet` OK; `/factory/address?network=testnet` → **403** without auth (2026-09-18) |
| **TR Mock Anchor** | SEP-10 JWT per user session | Not a static API key; `Authorization: Bearer` on SEP-6/12/38 (`tr-mock-anchor.fly.dev/llms-full.txt`) | `TR_ANCHOR_DOMAIN`, `USDC_ISSUER` |

---

## 6. Rate limits / 429 / `retryAfter`

| Provider | Documented in verified sources |
|----------|-------------------------------|
| **DeFindex** | Token-bucket tiers; on **429** JSON body includes **`retryAfter` (seconds)** — [defindex-skill/SKILL.md](https://github.com/defindex-io/defindex-skill/blob/main/SKILL.md). Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. **Not implemented in `@defindex/sdk` HTTP client** (passthrough errors only). |
| **Soroswap** | `skills/soroswap-sdk/SKILL.md`: handle `statusCode === 429` with backoff; **no `retryAfter` field documented**. Integration README: “wait if rate limits”. **`retryAfter`: UNKNOWN** for Soroswap API. |
| **TR Mock Anchor** | **UNKNOWN** (not in `llms-full.txt`). |

---

## 7. Testnet USDC identity risks (multiple USDC)

| Identity | Issuer / derivation | Contract id (testnet SAC or constant) | Used by |
|----------|---------------------|----------------------------------------|---------|
| **TR Mock Anchor USDC** | Classic `USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` | SAC via SDK: **`CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`** (computed `@stellar/stellar-sdk` 14.x, `Asset.contractId(Networks.TESTNET)`) | `/health`, `/.well-known/stellar.toml`, hackathon `SKILL.md` |
| **Circle mainnet issuer on testnet SAC** | `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` | SAC testnet: **`CA2E53VHFZ6YSWQIEIPBXJQGT6VW3VKWWZO555XKRQXYJ63GEBJJGHY7`** (computed) | Soroswap **mainnet** token list entry |
| **Soroswap mainnet list USDC contract** | (mainnet file) | **`CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`** | SDK examples, integration tests (**mainnet**), defindex-skill mainnet vault example assets |
| **Stellar workshop testnet USDC** | Hardcoded | **`CDWEFYYHMGEZEFC5TBUDXM3IJJ7K7W5BDGE765UIYQEV4JFWDOLSTOEK`** | `paltalabs/stellar-workshop` `src/soroswap.ts` |

**Risk:** Swaps, vault deposits, and anchor balances keyed on **different contract/issuer pairs** will not compose without explicit conversion/trustline/SAC alignment.

---

## 8. Public recommended hackathon vault addresses

| Claim | Verdict | Citation |
|-------|---------|----------|
| Hackathon docs prescribe a single vault | **No** | [defindex.mdx](https://github.com/yigitcangokmen/stellar-hackathon-turkiye/blob/main/content/docs/partnerler/defindex.mdx) — generic SDK blurb only |
| Official discover list (testnet) | **Yes — 14 addresses, no “recommended” flag** | Live `GET https://api.defindex.io/vault/discover?network=testnet` (2026-09-18), documented in [defindex-skill/endpoints.md](https://github.com/defindex-io/defindex-skill/blob/main/endpoints.md) |
| SDK skill example vault `CCJWW63…` | **Example only**; **not** in current discover list | `defindex-sdk/defindex-sdk-skill.md` L82; not in live discover JSON |
| SDK example `CD3UGEL…` | **Test fixture**; **not** in discover list | `defindex-sdk/examples/basic-example.ts` `DEPLOYED_VAULT` |

**Trinqa:** Must set `DEFINDEX_VAULT_ADDRESS` explicitly (e.g. pick from discover + validate assets via authenticated `getVaultInfo`).

---

## 9. Non-secret testnet config useful to Trinqa

From verified public / `.env.example` sources:

```bash
# Stellar
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_PASSPHRASE="Test SDF Network ; September 2015"

# TR Mock Anchor (SEP-6)
TR_ANCHOR_DOMAIN=tr-mock-anchor.fly.dev
USDC_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
# Treasury (health / stellar.toml): GCLCZEQZ2THTEDAOFI66LACNPLY4OBKN7VKLEZFMBIHYKYQOW2W7T3Z6
# Signing key: GDXYO6FJCNXZEWGXD54GT76FGFYLOLSOGSOJLNQ6WGHCGEQPO7NTE73M

# Provider base URLs (keys empty in dev)
DEFINDEX_API_URL=https://api.defindex.io
SOROSWAP_API_URL=https://api.soroswap.finance
```

**Live anchor limits (2026-09-18 `/health`):** on-ramp 50–3000 TRY; min off-ramp 1 USDC; USDC/TRY mid ~48.78 (Reflector + 50 bps). **SEP-6 `/sep6/info`:** deposit/withdraw USDC min 0.5 max 300 (asset units), fee_percent 0.5.

---

## 10. Compatibility blockers (TR Anchor ↔ DeFindex ↔ Soroswap)

1. **Classic vs Soroban USDC:** Anchor credits **classic** `USDC:GBBD…` (Horizon trustline asset). Soroswap quotes use **C-addresses** (SAC or protocol-specific). Trinqa resolves GBBD → SAC via Soroswap asset list (`SoroswapAssetRegistry`); if API list has **no GBBD issuer row on testnet**, swap routes fail (`ASSET_ROUTE_UNAVAILABLE`).
2. **Three different testnet USDC contract constants** in ecosystem docs (§7): GBBD-derived SAC **CBIEL…**, workshop **CDWEF…**, mainnet-list **CCW67…** (wrong network if copied to testnet).
3. **DeFindex vault assets:** Vault `assets[].address` are **C-addresses** (see defindex-skill mainnet example). Deposit `amounts[]` must match vault asset order; wrong SAC → failed deposit/simulation. **Which SAC testnet vaults accept: UNKNOWN without per-vault `GET /vault/:addr?network=testnet` (403 without API key).**
4. **DeFindex testnet indexer:** Live `/health` shows `indexer.testnet.database.configured: false`, `healthy: false` (2026-09-18) — may affect discover/TVL accuracy; vault ops with key **UNKNOWN** here.
5. **Smart wallet XDR path:** DeFindex may return `operationXDR` + `isSmartWallet`; Trinqa **blocks** non-classic `xdr` (`DefindexYieldAdapter.requireClassicXdr`).
6. **Earn + swap pipeline:** Requires Soroswap configured + resolved contracts + valid quote; exact-out quote stored in payment metadata then built with **`to = recipient`**.

### SAC derivation (conceptual)

Per Stellar / SDK pattern (`Asset.contractId(networkPassphrase)`):

```typescript
import { Asset, Networks } from '@stellar/stellar-sdk';

const classic = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
const sacTestnet = classic.contractId(Networks.TESTNET);
// → CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA (verified in backend worktree Node 22 + @stellar/stellar-sdk 14.x)
```

Deterministic **Stellar Asset Contract** id for that `(code, issuer, network passphrase)` tuple; distinct issuers yield distinct SAC addresses (GBBD vs GA5Z on testnet computed above).

---

## Executive summary (10 points)

1. **DeFindex `@defindex/sdk@0.3.0`:** `depositToVault` / `withdrawFromVault` / `withdrawShares` → unsigned tx; `sendTransaction(xdr)` → `{ txHash, success, result }`; responses add optional `operationXDR` + `isSmartWallet` when `xdr` null (`LLMS-MIGRATION.md`, `base.types.ts`).
2. **Soroswap `@soroswap/sdk@0.5.0`:** `quote` (EXACT_IN/OUT, `amount: bigint`) → `build({ quote, from, to? })` → `send(xdr)`; `getAssetList(SupportedAssetLists.SOROSWAP)`.
3. **Testnet discovery:** Soroswap list via **authenticated** `/asset-list`; static GitHub token list is **mainnet-only**; DeFindex **`/vault/discover?network=testnet`** public (14 vaults); workshop hardcodes USDC **CDWEF…**.
4. **Exact-out + recipient:** `TradeType.EXACT_OUT` on quote; build `to` defaults to `from` (Soroswap README); Trinqa passes **`payload.recipient`** on swap build.
5. **API keys:** Soroswap **required** (`sk_` Bearer); DeFindex **recommended/required for vault IO**; anchor uses **SEP-10 JWT** per user.
6. **429:** DeFindex documents **`retryAfter` seconds** (defindex-skill); Soroswap documents **429 only** — **`retryAfter`: UNKNOWN**; neither SDK auto-retries.
7. **USDC risk:** At least **GBBD classic**, **GBBD SAC CBIEL…**, **workshop CDWEF…**, and **mainnet-list CCW67…** — do not interchange on testnet.
8. **Hackathon vaults:** **No single recommended address** in hackathon repo; use **`/vault/discover?network=testnet`** or configure `DEFINDEX_VAULT_ADDRESS` — skill/example addresses are **not** authoritative.
9. **Non-secret Trinqa config:** testnet horizon/RPC/passphrase, `tr-mock-anchor.fly.dev`, GBBD issuer, provider base URLs (`backend/.env.example`, live anchor `/health`).
10. **Blockers:** Classic anchor USDC ≠ Soroswap/DeFindex C-addresses unless explicitly mapped; Trinqa depends on Soroswap asset list matching **GBBD**; DeFindex testnet indexer unhealthy in live health; smart-wallet XDR rejected by Trinqa adapter.

---

*Researcher R — M5.2 — generated 2026-09-18. Do not commit secrets.*
