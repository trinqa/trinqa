# Trinqa Backend (testnet)

```bash
nvm use 22
cd backend
cp .env.example .env
pnpm install
pnpm dev
```

## Toolchain (M2 policy contract)

| Tool | Version |
|------|---------|
| Node | ≥ 22 |
| Rust | 1.98.1+ (`rustup target add wasm32v1-none`) |
| Stellar CLI | 23.1.4 (`stellar --version`) |
| soroban-sdk | 23.0.2 (see `contracts/trinqa-policy/Cargo.toml`) |

Build contract:

```bash
cd ../contracts/trinqa-policy
cargo test
stellar contract build
```

Deploy to testnet (local `deployer` identity, no secrets in repo):

```bash
../scripts/deploy-policy.sh
```

## API

- Health: `GET /api/v1/health`
- Capabilities: `GET /api/v1/capabilities`
- Policy: `GET /api/v1/policy/:accountId`, `POST /api/v1/policy/build`, `POST /api/v1/policy/submit`
- Demo signer (env-gated): `POST /api/v1/demo/sep10`, `POST /api/v1/demo/trustline/usdc`

```bash
pnpm test
pnpm test:integration
pnpm e2e:anchor
pnpm e2e:policy
```

Deployed policy metadata: `../deployments/testnet.json`.
