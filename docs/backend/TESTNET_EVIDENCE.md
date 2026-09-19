# Testnet evidence

Cutoff for this document: **2026-09-19 10:00 +03:00**. Hashes below are from a live rerun after that cutoff. Older (18 Sep) hashes are not reused.

Run timestamp: `2026-09-19T09:14:53.459Z` (12:14 +03).

Command: `cd backend && pnpm e2e:core`

Result: **PASS**

Policy contract (already deployed; metadata is not a new deploy):

| Field | Value |
|--------|--------|
| CONTRACT ID | `CAFTEI4RY7OOWIWTBHYGJV5SV7C6UEG5MKNQI77BZSQNB3AZPC5GMESP` |
| WASM HASH | `0ec6ee0b9d1ba56334e5f8a17221774cf2d7d38b470e8cc2fbe2af86aa7fba10` |
| EXPLORER | https://stellar.expert/explorer/testnet/contract/CAFTEI4RY7OOWIWTBHYGJV5SV7C6UEG5MKNQI77BZSQNB3AZPC5GMESP |

## Fresh transactions (19 Sep 2026, after 10:00 +03)

| Flow | Tx hash | Time (UTC) |
|------|---------|------------|
| Anchor deposit (TRY→USDC) | `b62fd23da2e77caa5acb0e812225c63fbe800eb694162bd6f9d5643fc6794cd5` | 2026-09-19T09:14:53Z |
| Policy write/read | `937b2a92498904b361b6a716f7ddf50b597cb9ccad1efca05088278dabbb27b8` | 2026-09-19T09:14:53Z |
| Direct USDC payment | `d3d794811c6915abf2e2dcb9ffe249304d1fb866c74f1a1074a9f9c5642c6089` | 2026-09-19T09:14:53Z |
| Anchor withdrawal (USDC→TRY) | `d76307231d181bb09ebeacaa27f648ab69bb532dd65b1d2fb3988dc81f55194d` | 2026-09-19T09:14:53Z |

Payer (Friendbot ephemeral): `GDO6YXPW6YCHWQCR64IBNZT7AFOPM3OUA6K75PPVL6ZOPFCYY7MOENRK`
Recipient: `GC3LWQVEKIX4VF3IWQDW52JA6BA3W3UT7VVLUIACFSUKO64D7QANLQ7E`

## Partner flows (same session)

| Command | Result |
|---------|--------|
| `pnpm e2e:defindex` | BLOCKED — `DEFINDEX_API_KEY`, `DEFINDEX_VAULT_ADDRESS` (exit 2) |
| `pnpm e2e:soroswap` | BLOCKED — `SOROSWAP_API_KEY` (exit 2) |
| `pnpm e2e:trinqa` | PARTIAL (exit 3) — Anchor+Policy PASS; DeFindex/Soroswap/earn-funded pay BLOCKED |

Additional policy write from `e2e:trinqa` in the same session: `2eacdbea4a2b7b443aff3ca88de6e626ab3f8f747cc84d707b1d48e505bcc5d6`.

Local JSON under `backend/.data/` is gitignored and is not part of the submission tree.
