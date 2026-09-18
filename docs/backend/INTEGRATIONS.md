# Backend Integrations

## Stellar testnet

| Surface | URL / ID |
|---------|-----------|
| Horizon | `https://horizon-testnet.stellar.org` |
| Soroban RPC | `https://soroban-testnet.stellar.org` |
| USDC issuer | `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` |

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

## Planned (M3+)

- DeFindex SDK, Soroswap SDK, payment router
