# Trinqa Backend (testnet)

```bash
nvm use 22
cd backend
cp .env.example .env
pnpm install
pnpm dev
```

- Health: `GET /api/v1/health`
- Capabilities stub: `GET /api/v1/capabilities`
- Demo signer routes (env-gated): `POST /api/v1/demo/sep10`, `POST /api/v1/demo/trustline/usdc`

```bash
pnpm test
pnpm test:integration
pnpm e2e:anchor
```
