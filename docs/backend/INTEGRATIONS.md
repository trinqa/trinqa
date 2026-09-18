# Backend Integrations

## Stellar testnet

| Surface | URL / ID |
|---------|-----------|
| Horizon | `https://horizon-testnet.stellar.org` |
| Soroban RPC | `https://soroban-testnet.stellar.org` |
| USDC issuer | `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` |
| USDC SAC (testnet) | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |

### Pinned SDK versions (M5.2 freeze)

| Package | Version |
|---------|---------|
| `@stellar/stellar-sdk` | 14.1.0 |
| `@defindex/sdk` | 0.3.0 |
| `@soroswap/sdk` | 0.5.0 |

## TR Mock Anchor (M1)

- Domain: `tr-mock-anchor.fly.dev`
- SEP-6 deposit/withdraw, SEP-10 auth, SEP-38 quotes

## Trinqa allocation policy (M2)

- Soroban contract `TrinqaAllocationPolicy`
- Contract ID + WASM hash: see `deployments/testnet.json`
- CLI deploy: `scripts/deploy-policy.sh` (uses `stellar` + local `deployer` identity)

### Contract API (on-chain)

| Function | Auth | Notes |
|----------|------|-------|
| `set_policy` | user | Creates/replaces `UserPolicy` |
| `get_policy` | — | Read persistent storage |
| `update_risk` | user | |
| `update_target_date` | user | Future timestamp required |
| `set_strategy_allowed` | user | Allowlist maintenance |
| `authorize_allocation` | user | Blocked when automation paused |
| `authorize_rebalance` | user | Both strategies must be allowed |
| `pause_automation` | user | |

### BFF API

- `GET /api/v1/policy/:accountId`
- `POST /api/v1/policy/build` — body uses camelCase; adapter maps to contract snake_case
- `POST /api/v1/policy/submit` — signed Soroban transaction XDR

## DeFindex (M3)

- Canonical SDK: [defindex-io/defindex-sdk](https://github.com/defindex-io/defindex-sdk)
- Package: `@defindex/sdk` 0.3.x
- Adapter: `DefindexYieldAdapter` — health, vault info/APY/balance, deposit/withdraw XDR
- Env: `DEFINDEX_API_KEY`, `DEFINDEX_VAULT_ADDRESS`, optional `DEFINDEX_API_URL`
- BFF: `/api/v1/yield/*`
- E2E: `npm run e2e:defindex` (exit 2 if env missing)
- Vault must match Trinqa USDC SAC (`npm run hackathon:compat`)

## Soroswap (M3)

- Package: `@soroswap/sdk` 0.5.x (Node ≥ 22)
- Adapter: `SoroswapAdapter` — asset list, quote, build, send
- Env: `SOROSWAP_API_KEY`, optional `SOROSWAP_API_URL`
- BFF: `/api/v1/swaps/*`
- E2E: `pnpm e2e:soroswap` (exit 2 if key missing)

## Payment router (M3)

- Routes: `stellar_transfer`, `stellar_swap_transfer`, `fiat_payout`
- TRY/USDC via TR mock anchor; **BRL → `NO_SUPPORTED_PAYOUT_RAIL`**
- Earn balance pay → `EARN_UNWIND_REQUIRED` (policy/yield unwind explicit)
- Off-chain scoring: `DeterministicRiskEngine` + route scoring weights

## Operations (M3)

- `JsonFileOperationStore` (`.data/operations.json`) + `MemoryOperationStore` for tests
- `GET /api/v1/operations/:id`, `GET /api/v1/activity/:accountId`

## Policy contract ID

Default from `deployments/testnet.json` or `TRINQA_POLICY_CONTRACT_ID` / `POLICY_CONTRACT_ID`.
