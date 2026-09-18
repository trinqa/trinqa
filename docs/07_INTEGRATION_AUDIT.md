# Trinqa — Track B: Stellar Template / Integration Audit

**Date:** 2026-09-16 (updated 2026-09-18 — M4 backend alignment)  
**Scope:** Phase 1 (Home, Pay, Earn) · Expo React Native mobile · testnet only · no secrets · no real funds  
**Sources:** `source-material/HACKATHON_LINKS.md`, `docs/03_MOBILE_ARCHITECTURE.md`, `docs/06_SOURCES_AND_REFERENCES.md`, plus live fetches of official docs/skills where reachable.

---

## M4 backend anchor protocol status (2026-09-18)

| Protocol | Status | Notes |
|----------|--------|--------|
| **SEP-6** | **Current (testnet)** | TR mock anchor (`tr-mock-anchor.fly.dev`) — deposit/withdraw interactive, SEP-38 quotes. Backend: `TrMockAnchorAdapter`, `/api/v1/anchor/*`, payment `fiat_payout` → SEP-6 withdraw session. |
| **SEP-24** | **Future** | Original audit assumed SEP-24 WebView for Add Money (BlindPay/Bridge/testanchor). Mobile product may still use SEP-24 for global anchors; **TR TRY rail stays SEP-6** until a SEP-24 anchor is selected. Do not remove SEP-24 references below — they remain the target for non-TR fiat partners. |

---

## Executive summary

Trinqa should **not** fork any Stellar web template wholesale. The winning pattern from DeFindex/Decaf (abstract infrastructure, expose intent) maps cleanly to Trinqa’s existing service boundaries. For mobile:

- **Reuse patterns and backend-proxied APIs**, not browser wallet templates.
- **Anchor path:** SEP-1 → SEP-10 → SEP-24 via in-app WebView (SCF partners: BlindPay or Bridge).
- **Yield path:** DeFindex API/SDK on a **backend BFF**; mobile never holds API keys or signing secrets.
- **Routing path:** Soroswap API on the same BFF for quotes/build; mobile only signs returned XDR.
- **Defer** Smart Account Kit / Passkey Kit until after core flows work; RN WebAuthn is non-trivial.

---

## 1. Templates & resources inspected

| Resource | URL | Fetch status | Relevance to Trinqa |
|---|---|---|---|
| **Stellar ecosystem resources** | https://github.com/stellar/ecosystem-resources | OK (index repo) | Hackathon link hub; no mobile code |
| **Scaffold Stellar frontend** | https://github.com/AhaLabs/scaffold-stellar-frontend | OK (README) | Vite + React + Soroban contracts; reference for contract clients, not mobile shell |
| **Scaffold Stellar CLI** | https://github.com/stellar-scaffold/cli | Referenced by template | Contract dev toolchain; optional for Phase 1 |
| **SvelteKit Passkey template** | https://github.com/ElliotFriend/soroban-template-sveltekit-passkeys | OK (metadata) | Browser passkey dapp; pattern reference only |
| **Smart Account Kit** (canonical) | https://github.com/stellar/smart-account-kit | OK (README) | WebAuthn smart wallets; browser storage; relayer |
| **Smart Account Kit** (legacy redirect) | https://github.com/kalepail/smart-account-kit | Moved → stellar/smart-account-kit | — |
| **Smart wallet demos** | kalepail/carstenjacobsen/elliotfriend repos | Listed in HACKATHON_LINKS | Web-only demos |
| **Smart wallets docs** | https://developers.stellar.org/docs/build/apps/smart-wallets | **404** | Use smart-account-kit README + OpenZeppelin docs instead |
| **Stellar RPC docs** | https://developers.stellar.org/docs/data/apis/rpc | OK | Primary chain gateway; ~7-day history window |
| **Stellar SDK library docs** | https://developers.stellar.org/docs/tools/sdks/library | **404** | Use npm `@stellar/stellar-sdk` + RPC docs |
| **SEP-24 anchor guide** | https://developers.stellar.org/docs/platforms/anchor-platform/sep-guide/sep24 | OK | Server-side anchor builder docs |
| **BasicPay SEP-24 tutorial** | https://developers.stellar.org/docs/build/apps/example-application-tutorial/anchor-integration/sep24 | OK | **Best client-side SEP-24 reference** (TOML → auth → interactive URL → postMessage) |
| **Stellar Anchor skill** | CheesecakeLabs/stellar-anchor-skill | OK (raw SKILL.md) | Implementation gotchas for SEP flows |
| **DeFindex docs index** | https://docs.defindex.io/llms.txt | OK | Vault deposit/withdraw/APY via API |
| **DeFindex SDK skill** | paltalabs/defindex-sdk | OK (raw skill) | `@defindex/sdk` → unsigned XDR → sign → send |
| **DeFindex quickstart** (legacy path) | docs.defindex.io/.../quickstart | **404** | Use `integration-guide/` paths instead |
| **Soroswap docs index** | https://docs.soroswap.finance/llms.txt | OK | AMM + aggregator + API |
| **Soroswap API quickstart** | docs.soroswap.finance/api/quickstart.md | OK | Quote → build → sign → send |
| **Soroswap SDK skill** | soroswap/sdk | OK (raw skill) | `@soroswap/sdk`; backend proxy required |
| **Stellar Wallets Kit** | https://stellarwalletskit.dev/ | OK (install page) | Browser extension wallets (Freighter, etc.) |
| **SCF Integration List** | stellar.gitbook.io/.../integration-list | OK | Partner selection + estimated integration times |
| **BlindPay overview** | blindpay.com/docs | OK | Fiat on/off + Stellar signing (Advanced flavor) |
| **Bridge overview** | apidocs.bridge.xyz | OK | Virtual accounts, orchestration, custodial wallets |
| **Stellar Skills hub** | https://skills.stellar.org/ | Listed | Cite in submission: anchor, defindex, soroswap skills |

### Skills to cite in hackathon submission

1. `CheesecakeLabs/stellar-anchor-skill` — anchor client integration  
2. `paltalabs/defindex-sdk` — yield vault operations  
3. `soroswap/sdk` — swap/routing API  
4. `stellar/stellar-dev-skill` (standards) — SEP reference when needed  

---

## 2. Reusable pieces for Trinqa

### Architecture-aligned (maps to `docs/03_MOBILE_ARCHITECTURE.md`)

| Piece | Use in Trinqa | How |
|---|---|---|
| **Stellar RPC** | `services/stellar` | Balances, tx status, Soroban simulation/submission |
| **`@stellar/stellar-sdk`** | `packages/stellar` | XDR parse/build, SEP-10 challenge signing, payment tx for SEP-24 withdraw |
| **Anchor skill SEP flow** | `services/anchors` | SEP-1 discovery, SEP-10 JWT, SEP-24 interactive + polling |
| **BasicPay SEP-24 tutorial** | `features/pay`, Add Money | WebView + postMessage callback pattern |
| **DeFindex API** | `services/yield` | Read: APY, vault info, balance. Write: deposit/withdraw XDR via BFF |
| **Soroswap API** | `services/routing` | Quote + build for Pay route selection; fee/time metadata for UI |
| **SCF Integration List partners** | Add Money / withdraw | **BlindPay** (1–2 wks) or **Bridge** (1–5 days) for fiat rail evidence |
| **testanchor.stellar.org** | Dev/QA | SEP compliance testing before partner sandbox |
| **Stellar Lab fund** | Dev only | https://lab.stellar.org/account/fund |
| **Decimal-safe amount handling** | All money paths | Anchor skill: amounts as strings, 7-decimal precision |

### Patterns worth copying (not copying code)

- **Unsigned XDR → sign → submit** (DeFindex, Soroswap): mobile signs; BFF builds and optionally submits.
- **SEP-24 hosted KYC**: Trinqa opens anchor UI; user never sees SEP jargon on Home/Pay/Earn.
- **Strategy metadata from DeFindex** (`getVaultInfo`, `getVaultAPY`): maps to Conservative / Balanced / Growth without exposing vault addresses in UI.
- **Winning-product abstraction** (`docs/01_PRODUCT_SPEC.md`): route selection stays in `routing`; screens only show fee + arrival estimate.

### Backend BFF (recommended; not yet in repo)

Mobile should call **Trinqa-owned API routes**, not third-party APIs directly:

```
Mobile → Trinqa BFF → { Stellar RPC | DeFindex API | Soroswap API | Anchor HTTPS }
Mobile ← unsigned XDR or read models ← BFF
Mobile signs XDR locally (or via embedded wallet provider)
Mobile → BFF submit OR direct RPC submit
```

This matches Soroswap/DeFindex skill guidance: **never expose `sk_` / DeFindex API keys in the client.**

---

## 3. Pieces unsuitable for Expo React Native mobile

| Resource | Why unsuitable | Alternative |
|---|---|---|
| **Scaffold Stellar frontend** | Vite/React web, Soroban contract workspace | Keep mobile app separate; optional `contracts/` later |
| **Passkey / Smart Account Kit templates** | WebAuthn (`navigator.credentials`), IndexedDB/localStorage, browser relayer | Phase 2: Privy/DFNS (SCF list, mobile-friendly) or native passkeys via dedicated module |
| **Stellar Wallets Kit** | Targets browser extension wallets (Freighter) | Mobile signing adapter; or embedded wallet SDK |
| **Freighter Connect** | Browser extension only | N/A on iOS/Android |
| **SEP-24 iframe embedding** | Anchors set `X-Frame-Options: DENY` | `react-native-webview` or `expo-web-browser` + postMessage |
| **Direct `@defindex/sdk` / `@soroswap/sdk` in app** | API keys + Node assumptions | BFF proxy in `packages/` or separate service |
| **Smart Account Kit storage adapters** | IndexedDB/localStorage | Secure storage (Keychain) if adopted later |
| **design-system.stellar.org** | Web component library | Trinqa design system (`docs/02_DESIGN_SYSTEM.md`) |
| **Soroban Rust contract dev in mobile repo** | Wrong layer for Phase 1 | Defer unless custom contracts needed |
| **Horizon as primary indexer** | RPC preferred for new builds; Horizon for legacy indexing | RPC + optional lightweight Trinqa activity store |
| **Agentic payments / x402 / ZK** | Explicit Phase 1 non-goals | Out of scope |

### React Native-specific risks

1. **`@stellar/stellar-sdk` in RN** — may need polyfills (Buffer, crypto); validate in Expo before production signing.
2. **SEP-10 challenge signing** — must happen on-device or via secure enclave; never send secret keys to BFF.
3. **WebView postMessage origin checks** — required for SEP-24 callback security.
4. **JWT expiry during long KYC** — anchor skill: re-run SEP-10 on 401, don’t restart user flow.

---

## 4. Recommended integration order

| Step | Layer | Outcome | Hackathon load-bearing? |
|---|---|---|---|
| **0** | Monorepo scaffolding | `packages/core`, `packages/stellar`, typed interfaces + testnet config | Foundation |
| **1** | Stellar read path | RPC connection, account exists, balances (available/earning split mocked then real) | Partial |
| **2** | Anchor discovery + SEP-10 | TOML fetch, auth, JWT storage | Yes (auth path) |
| **3** | SEP-24 Add Money (deposit) | WebView flow + transaction polling → Activity events | **Yes (fiat rail)** |
| **4** | Pay: Soroswap quote via BFF | Route quote, fee, ETA for confirm sheet | Yes (Stellar movement) |
| **5** | Pay: sign + submit | End-to-end testnet payment | Yes |
| **6** | Earn: DeFindex read | APY, vault balance, strategy metadata | Yes |
| **7** | Earn: deposit/withdraw XDR | Move available ↔ earning on testnet | **Yes (yield)** |
| **8** | SEP-24 withdraw | Off-ramp evidence | Yes |
| **9** | Activity binding | Real tx + anchor status | Demo polish |
| **10** | Smart wallet upgrade | Privy/DFNS or native passkeys | Optional for Phase 1 |

**Partner pick for Step 3/8:** Start with **Bridge** if speed matters (1–5 days per SCF list); **BlindPay** if LatAm/global stablecoin narrative fits product story (1–2 weeks). Use **testanchor.stellar.org** first for SEP plumbing without partner contracts.

---

## 5. Exact next backend / integration task

> **Task:** Create `packages/stellar` + `packages/anchors` with **testnet-only** implementations of the interfaces below—no UI, no real keys, no partner API keys committed.

### Deliverables

1. **`NetworkConfig`** — testnet RPC URL, passphrase, Horizon fallback URL (read-only).
2. **`StellarAccountAdapter`** — `getBalances(publicKey)`, `getAccountExists(publicKey)`, `submitTransaction(signedXdr)` (stub submit OK initially).
3. **`AnchorDiscoveryAdapter`** — `fetchToml(domain)`, `getSep24Info(transferServer)`, parse `TRANSFER_SERVER_SEP0024`.
4. **`Sep10AuthAdapter`** — `beginAuth`, `signChallengeLocally`, `completeAuth` → JWT (use testanchor + funded test key in local env only).
5. **Integration test script** (Node, not mobile) — SEP-1 + SEP-10 against `testanchor.stellar.org`; log JWT expiry and `/info` capabilities.

**Do not** wire BlindPay/Bridge/DeFindex/Soroswap API keys until BFF env template exists (`.env.example` with placeholder names only).

---

## 6. Suggested typed interfaces & adapter boundaries

Place in `packages/core/src/types/` (or equivalent). Mobile imports types + interface tokens only; implementations live in `packages/*`.

### Network & money primitives

```typescript
// packages/core/src/types/network.ts
export type StellarNetwork = 'testnet' | 'mainnet';

export interface NetworkConfig {
  network: StellarNetwork;
  rpcUrl: string;
  horizonUrl: string;
  passphrase: string;
}

export type AssetId =
  | { kind: 'native' }
  | { kind: 'classic'; code: string; issuer: string }
  | { kind: 'contract'; contractId: string };

/** Always string decimal, never number — 7 dp Stellar convention */
export type DecimalString = string;

export interface MoneyAmount {
  asset: AssetId;
  amount: DecimalString;
}
```

### Stellar account service

```typescript
// packages/core/src/types/stellar.ts
export interface AccountBalances {
  total: MoneyAmount;
  available: MoneyAmount;
  earning: MoneyAmount;
  displayCurrency: string;
}

export interface TransactionReceipt {
  hash: string;
  ledger: number;
  success: boolean;
}

export interface IStellarAccountService {
  getBalances(accountId: string): Promise<AccountBalances>;
  accountExists(accountId: string): Promise<boolean>;
  submitSignedXdr(signedXdr: string): Promise<TransactionReceipt>;
  getTransaction(hash: string): Promise<TransactionReceipt | null>;
}
```

### Transaction signing (platform boundary)

```typescript
// packages/core/src/types/signing.ts
export interface UnsignedTransaction {
  xdr: string;
  networkPassphrase: string;
  description: string; // user-facing, e.g. "Send 50 USDC"
}

export interface ITransactionSigner {
  getPublicKey(): Promise<string>;
  sign(unsigned: UnsignedTransaction): Promise<string>; // signed XDR
}
```

Mobile provides `ExpoSecureSigner` or `EmbeddedWalletSigner` later; BFF never implements this.

### Anchor service (SEP-1, SEP-10, SEP-24)

```typescript
// packages/core/src/types/anchors.ts
export interface AnchorToml {
  domain: string;
  transferServerSep24?: string;
  webAuthEndpoint?: string;
  signingKey: string;
}

export interface Sep24Info {
  deposit: Record<string, { enabled: boolean; min?: DecimalString; max?: DecimalString }>;
  withdraw: Record<string, { enabled: boolean }>;
  features: {
    accountCreation?: boolean;
    claimableBalances?: boolean;
  };
}

export interface Sep24InteractiveSession {
  url: string;
  expiresAt?: string;
}

export interface AnchorTransferStatus {
  id: string;
  kind: 'deposit' | 'withdrawal';
  status: string; // map to user actions per anchor skill state machine
  amountIn?: DecimalString;
  amountOut?: DecimalString;
  startedAt: string;
}

export interface IAnchorService {
  discover(domain: string): Promise<AnchorToml>;
  authenticateSep10(params: {
    tomDomain: string;
    accountId: string;
    signChallenge: (xdr: string) => Promise<string>;
  }): Promise<{ token: string; expiresAt?: string }>;
  getSep24Info(domain: string): Promise<Sep24Info>;
  startSep24Interactive(params: {
    domain: string;
    token: string;
    kind: 'deposit' | 'withdraw';
    assetCode: string;
    assetIssuer: string;
    account: string;
    amount?: DecimalString;
  }): Promise<Sep24InteractiveSession>;
  getTransferStatus(params: {
    domain: string;
    token: string;
    transferId: string;
  }): Promise<AnchorTransferStatus>;
}
```

### Payment routing (Soroswap-backed)

```typescript
// packages/core/src/types/routing.ts
export interface RouteQuote {
  quoteId: string;
  source: MoneyAmount;
  destination: MoneyAmount;
  fee: MoneyAmount;
  estimatedArrivalMinutes: number;
  priceImpactPct?: string;
  expiresAt: string;
  /** Opaque payload for build step — never parsed in UI */
  providerPayload: unknown;
}

export interface BuiltRouteTransaction {
  unsignedXdr: string;
  networkPassphrase: string;
}

export interface IPaymentRoutingService {
  quote(params: {
    fromAccount: string;
    source: MoneyAmount;
    destinationAsset: AssetId;
    destinationAmount?: DecimalString;
  }): Promise<RouteQuote>;
  build(params: {
    quoteId: string;
    fromAccount: string;
    providerPayload: unknown;
  }): Promise<BuiltRouteTransaction>;
}
```

### Yield (DeFindex-backed)

```typescript
// packages/core/src/types/yield.ts
export type RiskTier = 'conservative' | 'balanced' | 'growth';

export interface YieldStrategy {
  id: string;
  name: string;
  risk: RiskTier;
  estimatedApy: number; // display only; source = DeFindex
  withdrawalAvailability: 'flexible' | '30d' | '90d';
  vaultAddress: string; // internal; not shown in UI
}

export interface YieldPosition {
  strategyId: string;
  positionValue: MoneyAmount;
  earnedToday: MoneyAmount;
  shares: DecimalString;
}

export interface IYieldService {
  listStrategies(): Promise<YieldStrategy[]>;
  getPosition(accountId: string, strategyId: string): Promise<YieldPosition>;
  buildDeposit(params: {
    accountId: string;
    strategyId: string;
    amount: MoneyAmount;
    invest?: boolean;
  }): Promise<UnsignedTransaction>;
  buildWithdraw(params: {
    accountId: string;
    strategyId: string;
    amount?: MoneyAmount;
    shares?: DecimalString;
  }): Promise<UnsignedTransaction>;
}
```

### BFF facade (optional single entry for mobile)

```typescript
// packages/core/src/types/trinqa-api.ts
export interface ITrinqaBackend {
  stellar: IStellarAccountService;
  anchors: IAnchorService;
  routing: IPaymentRoutingService;
  yield: IYieldService;
}
```

Implementations:

| Interface | Phase 1 impl | Production impl |
|---|---|---|
| `IStellarAccountService` | `MockStellarAccountService` → `RpcStellarAccountService` | RPC + cached balances |
| `IAnchorService` | `MockAnchorService` → `HttpAnchorService` | testanchor → BlindPay/Bridge |
| `IPaymentRoutingService` | `MockRoutingService` → `SoroswapRoutingService` | BFF + `@soroswap/sdk` |
| `IYieldService` | `MockYieldService` → `DefindexYieldService` | BFF + `@defindex/sdk` |

---

## Appendix: fetch blockers & doc drift

| Issue | Action |
|---|---|
| `developers.stellar.org/.../smart-wallets` 404 | Use `github.com/stellar/smart-account-kit` |
| `developers.stellar.org/.../sdks/library` 404 | Use npm + RPC docs |
| DeFindex legacy quickstart URL 404 | Use `docs.defindex.io/integration-guide/` |
| Google Docs (funding, presentation) | Auth-gated; not inferred |
| Smart Account Kit unaudited warning | Do not use for real funds in hackathon demo |

---

## Appendix: skills citation block (for submission README)

```text
Stellar Skills used:
- https://github.com/CheesecakeLabs/stellar-anchor-skill/blob/main/SKILL.md
- https://github.com/paltalabs/defindex-sdk/blob/main/defindex-sdk-skill.md
- https://github.com/soroswap/sdk/blob/main/skills/soroswap-sdk/SKILL.md
- https://github.com/stellar/stellar-dev-skill/blob/main/skills/standards/SKILL.md (SEPs reference)
```
