# Backend Testing

## Unit

```bash
cd backend && pnpm test
```

Includes money helpers, TR mock anchor client parsing, policy Zod/domain tests.

## Integration (live testnet)

```bash
cd backend && pnpm test:integration
```

Requires network access. Policy integration creates ephemeral accounts via Friendbot.

## E2E scripts

```bash
cd backend && pnpm e2e:anchor
cd backend && pnpm e2e:policy
```

## Soroban contract tests

```bash
cd contracts/trinqa-policy && cargo test
```

If `soroban-env-host` fails on `ed25519-dalek`, pin:

```bash
cargo update ed25519-dalek@3.0.0 --precise 2.2.0
```

## Toolchain versions (M2)

| Tool | Version (dev) |
|------|----------------|
| Rust | 1.98.1 |
| stellar CLI | 23.1.4 |
| soroban-sdk | 23.0.2 (workspace) |

Document updates in `backend/README.md` when upgrading.
