# Partner keys

These stay on the backend only. They are not required for the core demo (`pnpm e2e:core`).

| Name | Used by | Core demo | Full demo |
|------|---------|-----------|-----------|
| `DEFINDEX_API_KEY` | `DefindexYieldAdapter` | No | Yes |
| `DEFINDEX_VAULT_ADDRESS` | Yield deposit/withdraw; vault must be Trinqa USDC SAC `CBIELTK6…` | No | Yes |
| `SOROSWAP_API_KEY` | `SoroswapAdapter` | No | XLM / swap routes |
| `DEMO_SIGNER_SECRET` | Optional fixed test account (`DEMO_SIGNER_ENABLED=true`) | No | Mobile demo |

Verify after insert: `pnpm hackathon:doctor`, `pnpm hackathon:compat`, `pnpm e2e:defindex`, `pnpm e2e:soroswap`.

## Without DeFindex keys

Yield routes return `ADAPTER_UNAVAILABLE`. There is no keyless vault deposit path in the current SDK flow. Do not fake yield success in the app.

## Without Soroswap keys

Swap quote/build need Bearer auth. Direct USDC pay and TRY rails do not need Soroswap.

## Direct contract calls

Feasible for the deployed Trinqa policy. Risky for DeFindex/Soroswap without verified testnet ids and live tests.
