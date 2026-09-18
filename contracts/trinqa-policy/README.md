# Trinqa allocation policy (Soroban)

`TrinqaAllocationPolicy` stores per-user allocation intent on Stellar testnet (not a custodian).

## Develop

```bash
rustup target add wasm32v1-none
cargo test
stellar contract build
```

WASM: `target/wasm32v1-none/release/trinqa_allocation_policy.wasm`

## Deploy

From repo root:

```bash
scripts/deploy-policy.sh
```

Writes `deployments/testnet.json`.

## UserPolicy fields

- `risk_profile` (0–2)
- `target_timestamp` (unix seconds, must be future on write)
- `liquidity_target_bps` (0–10_000)
- `automation_paused`
- `allowed_strategies` (Symbol list)

All mutating calls require `user.require_auth()`. Persistent storage TTL is extended on writes.
