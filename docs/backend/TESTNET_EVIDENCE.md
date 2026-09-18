# Testnet evidence (backend/integration)

## Policy contract (M5 redeploy — zero allocation fix)

| Field | Value |
|--------|--------|
| COMMAND | `pnpm e2e:policy` |
| RESULT | PASS |
| CONTRACT ID | `CAFTEI4RY7OOWIWTBHYGJV5SV7C6UEG5MKNQI77BZSQNB3AZPC5GMESP` |
| WASM HASH | `0ec6ee0b9d1ba56334e5f8a17221774cf2d7d38b470e8cc2fbe2af86aa7fba10` |
| DEPLOY | https://stellar.expert/explorer/testnet/contract/CAFTEI4RY7OOWIWTBHYGJV5SV7C6UEG5MKNQI77BZSQNB3AZPC5GMESP |
| DEPLOY TX HASH | `DEPLOY_TX_HASH_NOT_RECOVERED` (see `deployments/testnet.json`) |
| POLICY WRITE TX | `2b58822755f70c12a23cdc12544677d51681aa80b85d500df9188836d61353d3` |
| ACCOUNT | `GDFI7L547VREOVUXEULYDRKDB2TZCVCZFHCJESHH3A2B763HWYWQ7PRF` |

## TR Mock Anchor (SEP-6 lifecycle)

| Field | Value |
|--------|--------|
| COMMAND | `pnpm e2e:anchor` |
| RESULT | PASS |
| PROVIDER | `tr-mock-anchor.fly.dev` |
| DEPOSIT STELLAR TX | `94f09d212502614aecc79e1560aea9e1ed4d2446a03f4c208987f412d9d90405` |
| WITHDRAW PAYMENT TX | `3536a80fbc7da57a5aa5a0dc8acbca1af6ce6fd2a90de3725724ac877fd07488` |

## DeFindex

| Field | Value |
|--------|--------|
| COMMAND | `pnpm e2e:defindex` |
| RESULT | BLOCKED — `DEFINDEX_API_KEY`, `DEFINDEX_VAULT_ADDRESS` |

## Soroswap

| Field | Value |
|--------|--------|
| COMMAND | `pnpm e2e:soroswap` |
| RESULT | BLOCKED — `SOROSWAP_API_KEY` |

## Full Trinqa lifecycle

| Field | Value |
|--------|--------|
| COMMAND | `pnpm e2e:trinqa` |
| RESULT | PARTIAL (Anchor+Policy PASS after real TRY→USDC on-ramp; DeFindex/Soroswap BLOCKED without keys) |

## Earn-funded payment

| Field | Value |
|--------|--------|
| RESULT | BLOCKED — requires DeFindex write lifecycle + credentials |
