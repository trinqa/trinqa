# Hackathon Morning (~15 min)

1. `cd /Users/apple/dev/trinqa-backend-worktree && git status && git branch --show-current` → expect `backend/integration`
2. `node --version` → **22+**
3. `cp backend/.env.example backend/.env` — add partner keys only if you have them
4. `cd backend && npm install` (or `pnpm install --frozen-lockfile` if corepack works)
5. `npm run hackathon:status`
6. `npm run hackathon:doctor` → exit **0** infra OK; **2** = missing partner keys only
7. `npm run hackathon:compat`
8. `npm run hackathon:preflight` → **0** READY; **2** EXPECTED_EXTERNAL_BLOCKER
9. `npm run e2e:core` → must **PASS** (no partner keys)
10. `npm run e2e:defindex` / `e2e:soroswap` → **BLOCKED (exit 2)** without keys
11. `npm run e2e:trinqa` → **PARTIAL (exit 3)** without keys
12. `npm run hackathon:evidence`
13. `npm run dev` — wire mobile using [MOBILE_WIRING.md](./MOBILE_WIRING.md)

**Exit codes:** `0` pass · `1` failure · `2` external blocker · `3` partial
