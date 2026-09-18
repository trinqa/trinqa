# Backend blockers (post-M5)

Partner full lifecycle E2E (`e2e:defindex`, `e2e:soroswap`, earn-funded leg) remains **credential-blocked** until `DEFINDEX_*` and `SOROSWAP_API_KEY` are supplied — do not fabricate tx hashes in `TESTNET_EVIDENCE.md`.

| Item | Status |
|------|--------|
| DeFindex deposit/withdraw E2E | **BLOCKED** — set `DEFINDEX_API_KEY` + `DEFINDEX_VAULT_ADDRESS` in `backend/.env` |
| Soroswap swap E2E | **BLOCKED** — set `SOROSWAP_API_KEY` |
| Earn-funded payment full lifecycle | **BLOCKED** — depends on DeFindex write proof |
| Anchor JWT in public API | **Resolved** — opaque `sessionId` only |
| Hardcoded TRY FX | **Resolved** — SEP-38 via anchor session |
| Policy contract zero `amount_bps` | **Resolved** — redeployed testnet contract (see `deployments/testnet.json`) |
