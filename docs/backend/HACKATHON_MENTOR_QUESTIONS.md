# Mentor questions (M5.2)

1. **DeFindex vault:** Which hackathon testnet vault accepts Trinqa mock-anchor USDC SAC **`CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`** (issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`)? Public `/vault/discover?network=testnet` lists vault IDs but not asset breakdown.

2. **DeFindex API key:** How do participants obtain production/test API keys? Docs cite rate limits (429 + `retryAfter`) — any hackathon quota?

3. **Soroswap API key:** Issuance process for hackathon teams?

4. **USDC fragmentation:** Soroswap static token list is **mainnet**-labeled; workshop USDC testnet contract differs from anchor SAC. Should XLM swap demo use **Soroswap faucet USDC** as standalone proof while anchor USDC stays on core TRY→USDC→pay→TRY path?

5. **TR mock anchor:** Is `POST …/sep6/transactions/:id/simulate-bank-transfer` the intended fiat-rail demo for judges?

6. **SEP-38 withdraw:** Confirm minimum off-ramp **1.0000000 USDC** (observed in `e2e:core`).

See [M5_2_PROTOCOL_RESEARCH.md](./M5_2_PROTOCOL_RESEARCH.md) for verified SDK shapes.
