# Trinqa

Consumer money app on Stellar testnet: add TRY via the TR mock anchor, hold USDC, pay USDC, withdraw TRY, and write an on-chain allocation policy.

Yield (DeFindex) and swaps (Soroswap) are wired but stay unavailable until partner credentials exist. The app never fakes those successes.

## Layout

| Path | What |
|------|------|
| `apps/mobile` | Expo 57 iOS app |
| `backend` | Fastify BFF (`/api/v1`) |
| `contracts/trinqa-policy` | Soroban allocation policy |
| `docs/backend` | API, architecture, wiring, testnet evidence |
| `deployments/testnet.json` | Current policy contract id + wasm hash |

## Run

```bash
nvm use 22
cd backend && cp .env.example .env && pnpm install && pnpm dev
```

```bash
cd apps/mobile
cp .env.example .env
npm install
npx expo run:ios
```

Mobile talks to `EXPO_PUBLIC_API_BASE_URL` (dev fallback `http://127.0.0.1:8787`). Secrets stay on the backend: demo signer, SEP-10 JWT, DeFindex, Soroswap.

## Verify

```bash
cd backend && pnpm verify && pnpm e2e:core
cd contracts/trinqa-policy && cargo test
cd apps/mobile && npx tsc --noEmit
```

`pnpm e2e:defindex` and `pnpm e2e:soroswap` exit 2 until `DEFINDEX_*` / `SOROSWAP_API_KEY` are set.

## Docs for judges

- [API](docs/backend/API.md)
- [Architecture](docs/backend/ARCHITECTURE.md)
- [Integrations](docs/backend/INTEGRATIONS.md)
- [Mobile wiring](docs/backend/MOBILE_WIRING.md)
- [Testing](docs/backend/TESTING.md)
- [Testnet evidence](docs/backend/TESTNET_EVIDENCE.md)
- [Partner keys](docs/backend/PARTNER_KEY_FALLBACK.md)
