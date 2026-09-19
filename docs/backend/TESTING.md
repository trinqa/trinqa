# Testing

## Backend unit

```bash
cd backend && pnpm test
```

Money helpers, TR mock client parsing, policy Zod/domain, demo routes.

## Backend integration (live testnet)

```bash
cd backend && pnpm test:integration
```

Needs network. Policy tests create ephemeral Friendbot accounts.

## E2E

```bash
cd backend
pnpm e2e:core       # TRY deposit, policy write, USDC pay, TRY withdraw
pnpm e2e:anchor
pnpm e2e:policy
pnpm e2e:defindex   # exit 2 without DEFINDEX_*
pnpm e2e:soroswap   # exit 2 without SOROSWAP_API_KEY
pnpm e2e:trinqa     # PARTIAL (exit 3) if partner keys missing
```

## Contract

```bash
cd contracts/trinqa-policy && cargo test
```

## Mobile

```bash
cd apps/mobile && npx tsc --noEmit
```

## Toolchain

| Tool | Version |
|------|---------|
| Node | ≥ 22 |
| Rust | 1.98+ (`wasm32v1-none`) |
| Stellar CLI | 23.x |
| soroban-sdk | 23.0.2 (workspace) |
