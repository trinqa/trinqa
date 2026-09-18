# Backend blockers (M3)

| Blocker | Impact | Exit code (e2e scripts) |
|---------|--------|-------------------------|
| `DEFINDEX_API_KEY` missing | Yield deposit/withdraw build, vault reads | `e2e-defindex` → 2 |
| `DEFINDEX_VAULT_ADDRESS` missing | Strategy list empty, yield e2e blocked | `e2e-defindex` → 2 |
| `SOROSWAP_API_KEY` missing | Swap quote/build, swap leg of payments | `e2e-soroswap` → 2 |
| Partner API down | Health `degraded`; capabilities show adapter error | — |
| BRL payout | Always `NO_SUPPORTED_PAYOUT_RAIL` (by design) | — |
| Earn-funded pay | `EARN_UNWIND_REQUIRED` — no silent unwind | — |

Never mark external partner calls as success without a real response.
