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

See [`../docs/backend/API.md`](../docs/backend/API.md). Highlights:

- Health / capabilities / accounts / anchor / yield / swaps / payments / operations / activity
- Policy Soroban: `GET|POST /api/v1/policy/*`
- Demo signer (env-gated): `POST /api/v1/demo/*`

```bash
pnpm verify          # build + unit tests (no secrets)
pnpm test:integration
pnpm e2e:anchor
pnpm e2e:policy
pnpm e2e:defindex    # exit 2 if DEFINDEX_* missing
pnpm e2e:soroswap    # exit 2 if SOROSWAP_API_KEY missing
pnpm e2e:trinqa      # exit 3 PARTIAL if partner keys missing
```

Deployed policy metadata: `../deployments/testnet.json`.

## Stellar Skills Used (M4 — consulted for this backend)

| Skill | Use in backend |
|-------|----------------|
| [CheesecakeLabs/stellar-anchor-skill](https://github.com/CheesecakeLabs/stellar-anchor-skill/blob/main/SKILL.md) | SEP-1/10/6 flow, JWT handling, TR mock anchor adapter |
| [paltalabs/defindex-sdk](https://github.com/paltalabs/defindex-sdk/blob/main/defindex-sdk-skill.md) | Vault deposit/withdraw XDR via `DefindexYieldAdapter` |
| [soroswap/sdk](https://github.com/soroswap/sdk/blob/main/skills/soroswap-sdk/SKILL.md) | Quote/build proxy via `SoroswapAdapter` |
| [stellar/stellar-dev-skill (standards)](https://github.com/stellar/stellar-dev-skill/blob/main/skills/standards/SKILL.md) | SEP numbering, testnet conventions |
| [lumenloop/stellar-integration-finder](https://github.com/lumenloop/lumenloop-skills/blob/main/skills/stellar-integration-finder/SKILL.md) | Partner/integration audit cross-check (M4) |
