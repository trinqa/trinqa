# Integrations (Stellar testnet)

## Network

| Surface | Value |
|---------|--------|
| Horizon | `https://horizon-testnet.stellar.org` |
| Soroban RPC | `https://soroban-testnet.stellar.org` |
| USDC issuer | `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` |
| USDC SAC | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |

SDK pins: `@stellar/stellar-sdk` 14.1.0, `@defindex/sdk` 0.3.0, `@soroswap/sdk` 0.5.0.

## TR mock anchor

- Domain: `tr-mock-anchor.fly.dev`
- SEP-6 deposit/withdraw, SEP-10 auth, SEP-38 quotes
- Used for TRY on-ramp and TRY off-ramp

## Allocation policy (Soroban)

`TrinqaAllocationPolicy` — `set_policy` / `get_policy` / risk / target date / strategy allowlist / allocate / rebalance / pause.

BFF: `GET|POST /api/v1/policy/*`. Contract id from `deployments/testnet.json` or `TRINQA_POLICY_CONTRACT_ID`.

## DeFindex

- Adapter: `DefindexYieldAdapter`
- Env: `DEFINDEX_API_KEY`, `DEFINDEX_VAULT_ADDRESS`, optional `DEFINDEX_API_URL`
- BFF: `/api/v1/yield/*`
- E2E: `pnpm e2e:defindex` (exit 2 if env missing)
- Vault must match Trinqa USDC SAC (`pnpm hackathon:compat`)

## Soroswap

- Adapter: `SoroswapAdapter`
- Env: `SOROSWAP_API_KEY`, optional `SOROSWAP_API_URL`
- BFF: `/api/v1/swaps/*`
- E2E: `pnpm e2e:soroswap` (exit 2 if key missing)

## Payment router

Routes: `stellar_transfer`, `stellar_swap_transfer`, `fiat_payout`.

TRY/USDC via TR mock; BRL is unsupported. Paying from earn balance requires explicit unwind.

## Operations

JSON file store under gitignored `.data/` (in-memory in tests). Activity feed: `GET /api/v1/activity/:accountId`.
