# Trinqa backend (testnet)

```bash
nvm use 22
cd backend
cp .env.example .env
pnpm install
pnpm dev
```

## Toolchain

| Tool | Version |
|------|---------|
| Node | ≥ 22 |
| Rust | 1.98+ (`rustup target add wasm32v1-none`) |
| Stellar CLI | 23.x |
| soroban-sdk | 23.0.2 (`contracts/trinqa-policy`) |

```bash
cd ../contracts/trinqa-policy
cargo test
stellar contract build
../scripts/deploy-policy.sh   # local deployer identity; no secrets in git
```

API: [docs/backend/API.md](../docs/backend/API.md)

```bash
pnpm verify
pnpm test:integration
pnpm e2e:core
pnpm e2e:defindex    # exit 2 if DEFINDEX_* missing
pnpm e2e:soroswap    # exit 2 if SOROSWAP_API_KEY missing
```

Policy metadata: `../deployments/testnet.json`.
