# Hackathon keys

| Name | Why | Where used | Server/client | Core demo? | Full demo? | Verify after insert |
|------|-----|------------|---------------|------------|------------|---------------------|
| `DEFINDEX_API_KEY` | DeFindex HTTP API | `DefindexYieldAdapter` | **Server only** | No | Yes | `npm run hackathon:doctor` → DeFindex API PASS |
| `DEFINDEX_VAULT_ADDRESS` | Vault must hold Trinqa USDC SAC `CBIELTK6…` | yield + earn-funded pay | Server | No | Yes | `npm run hackathon:compat` → DeFindex MATCH |
| `SOROSWAP_API_KEY` | Soroswap quote/build | `SoroswapAdapter`, XLM pay | Server | No | Optional XLM | `npm run e2e:soroswap` |
| `DEMO_SIGNER_SECRET` | Reuse fixed test account | optional e2e | Server | No | No | only if `DEMO_SIGNER_ENABLED=true` |

No JWT or mobile anchor secrets — SEP-10 JWT stays server-side; mobile gets `sessionId` only.

If keys are not from organizers: see [PARTNER_KEY_FALLBACK.md](./PARTNER_KEY_FALLBACK.md) and [HACKATHON_MENTOR_QUESTIONS.md](./HACKATHON_MENTOR_QUESTIONS.md).
