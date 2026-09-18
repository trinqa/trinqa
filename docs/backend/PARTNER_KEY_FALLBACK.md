# Partner key fallback (contingency only)

## DeFindex without API key

| Verdict | **RISKY** |
|---------|-----------|
| Why | Vault deposit/withdraw needs unsigned XDR from DeFindex API or exact contract invocation; SDK documents HTTP-only flows. |
| Workshop pattern | `paltalabs/stellar-workshop` uses SDK + API key — not a keyless path. |
| Recommendation | Obtain `DEFINDEX_API_KEY` + compatible vault; use `hackathon:compat` before deposit. |

## Soroswap without API key

| Verdict | **NOT RECOMMENDED** for hackathon day |
|---------|----------------------------------------|
| Why | Quote/build endpoints require Bearer auth; direct router invocation needs verified testnet router addresses + auth semantics. |
| Standalone | Faucet + API key remains the supported test path. |
| Core product | Unaffected — direct USDC pay + anchor rails do not need Soroswap. |

## Direct Soroban contract calls

| Verdict | **FEASIBLE** only for **Trinqa policy** (already deployed); **RISKY** for DeFindex/Soroswap routers without verified IDs/interfaces. |

Do not add new direct-contract adapters without verified addresses and live tests.
