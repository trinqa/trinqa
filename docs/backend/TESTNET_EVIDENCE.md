# Testnet evidence log

Record real command output here after running e2e scripts with secrets in local `.env` (not committed).

## Commands

```bash
cd backend
pnpm verify
pnpm e2e:anchor
pnpm e2e:policy
pnpm e2e:defindex   # requires DEFINDEX_* 
pnpm e2e:soroswap   # requires SOROSWAP_API_KEY
pnpm e2e:trinqa     # PARTIAL (exit 3) if partner keys missing
```

## Policy contract (default)

From `deployments/testnet.json`:

- Contract ID: `CBYXLFGRPSSAKIM2IT4XNXQ34DONI7RQL3UR5DKJJC5W3R3IFS5ACI5G`
- Override: `TRINQA_POLICY_CONTRACT_ID` or `POLICY_CONTRACT_ID`

## Evidence slots

| Run | Date | Result | Notes |
|-----|------|--------|-------|
| `e2e-anchor` | | | |
| `e2e-policy` | | | |
| `e2e-defindex` | | BLOCKED / OK | |
| `e2e-soroswap` | | BLOCKED / OK | |
| `e2e-trinqa` | | PARTIAL / OK | |

### M4 run (2026-09-18)

Local `backend/.env` had no `DEFINDEX_*` or `SOROSWAP_*` — partner e2e **not executed** (exit 2/3 expected per `BLOCKERS.md`). Policy + anchor unit/integration paths still runnable via `pnpm verify` / `pnpm test:integration`.

| Script | Result | Tx hashes |
|--------|--------|-----------|
| `e2e-defindex` | BLOCKED (no keys) | — |
| `e2e-soroswap` | BLOCKED (no keys) | — |
| `e2e-trinqa` | PARTIAL (no keys) | — |
