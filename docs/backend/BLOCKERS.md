# Backend blockers

| Blocker | Impact | Status / exit |
|---------|--------|----------------|
| `DEFINDEX_API_KEY` / `DEFINDEX_VAULT_ADDRESS` missing | Yield deposit/withdraw, vault reads, `e2e-defindex` | **BLOCKED** — exit 2 (verified 2026-09-18, no local `.env`) |
| `SOROSWAP_API_KEY` missing | Swap quote/build | **BLOCKED** — exit 2 (verified 2026-09-18) |
| Partner API down | Health `degraded` | — |
| BRL payout | `NO_SUPPORTED_PAYOUT_RAIL` (by design) | — |
| **Earn-funded pay** | `PaymentRouter` throws `EARN_UNWIND_REQUIRED` only — **no** orchestration of policy authorize → DeFindex withdraw → payment | **INCOMPLETE** — do not claim pay-from-earn complete |
| M4 rebase on `main` | Branch may diverge from mobile monorepo `main` | Verify before merge (not merged in this run) |

Never mark external partner calls as success without a real response.
