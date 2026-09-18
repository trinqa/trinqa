# Trinqa Frontend Completeness Audit

Date: 2026-09-18

This pass closes the pre-backend functional UI scope defined by `UX_FLOW_V1.md`, `08_PRODUCT_PRD.md`, and the approved app implementation. It intentionally does not add backend, wallet-provider, blockchain, FX, payout, or persistence integrations.

## Completed surfaces

- Provider-agnostic onboarding with `new`, `creating`, `ready`, and `error` bootstrap states.
- Receive flow with optional amount, capability-driven currency selection, mock QR payload, native share, clipboard copy, and collapsed advanced receiving details.
- Home More menu routes to Withdraw, Receive, Account Details, and Settings.
- Account Details presents consumer account information first and keeps mock network data in a collapsed advanced section.
- Settings provides account identity, capability-driven display currency, native device-security toggle, risk/legal information, and support placeholder messaging.
- Pay supports an international TRY → BRL intent, a mock quote, Available/Earn contribution breakdown, explicit native Earn-liquidity approval, insufficient-total handling, processing, and success.
- Put it to work uses the final horizons: Anytime, 7+ days, 30+ days, and Pick a date. Pick a date uses the native Expo UI SwiftUI `DatePicker`.
- Strategy/Risk Details and Transaction Details use native bottom sheets and collapsed native disclosure groups.
- Another-wallet Add Money explicitly asks for a supported mock source network before continuing.
- Shared flow components cover idle, inline loading/processing, pending-capable outcomes, success, restrained errors, and empty states.

## Shared frontend boundaries

- `AccountBootstrapState`, `AccountIdentity`, `BalanceState`
- `CurrencyCapability`, `NetworkCapability`
- `PaymentIntent`, `PaymentQuote`, `WithdrawalIntent`, `WithdrawalQuote`
- `StrategyPreference`, `StrategyRecommendation`
- `ReceiveIntent`, `ReceivePresentation`
- One normalized `Transaction` source used by Home Recent, Wallet, Earn, Activity, and Transaction Details.

Capabilities and networks are centralized typed frontend fixtures. Their `mock` status describes UI capability only and must not be treated as real provider availability.

## Mock state consistency

One in-memory frontend state source now drives account identity, display currency, Available, Earning, strategy preference, and transaction history.

- Add Money credits Available and inserts a Deposit event.
- Put it to work debits Available, credits Earning, updates the strategy, and inserts an allocation event.
- Pay debits the correct Available/Earn contribution and inserts a Payment event.
- Withdraw debits balances and inserts a Withdrawal event.
- Home, Wallet, Earn, and Activity consume the same balances and normalized transactions.

No private keys, seed phrases, provider-specific account models, secrets, APIs, or persistence were added.

## Capability and QA fixtures

Typed fixtures cover:

- TRY → TRY, TRY → EUR, TRY → BRL, and USD → EUR intents.
- Fully Available, Earn unwind, and insufficient-total cases.
- Completed and pending payment outcomes plus failed quote preparation.
- Bank withdrawal, received payment, yield allocation, and yield earning event types.

The visible international QA path uses Ana Souza in Brazil receiving R$500 while the sender debit, fee, and contribution breakdown are represented in TRY. This is a frontend-only mock, not a Brazil payout integration.

## Manual iOS QA

Device: iPhone 16 Pro (26)

Runtime: iOS 26.0

Simulator UDID: `CDEBE312-698E-4A63-B6AF-2301342E1514`

Verified manually:

1. Fresh onboarding → Get started → Home.
2. Receive €250 → QR → Copy and native Share sheet.
3. TRY → BRL R$500 payment → Review → Processing → Success.
4. Payment requiring Earn contribution → explicit approval → Review.
5. Payment exceeding total funds → blocked continuation and Add Money action.
6. Earn → Manage Strategy → Pick a date → native calendar → Balanced apply → Success.
7. Activity → Transaction Details → Advanced details expand/collapse.
8. More → Account Details and Settings → display-currency change.
9. Add Money → Crypto / wallet → source-network selection → amount → Processing → Success.
10. Home, Wallet, Earn, and Activity remained coherent after payment, allocation, and deposit mutations.

Screenshots are stored in `qa/frontend-final/`.

## Copy and infrastructure audit

Normal UX uses Trinqa terms including Total Balance, Available, Earning, Add Money, Pay, Receive, Withdraw, Current APY, Strategy, Risk, Fee, and Arrival. Stale reference-app labels were removed.

Normal surfaces do not expose SEP flows, Soroban, XDR, anchors, vaults, pools, bridges, contracts, or provider-specific infrastructure. Mock network and route evidence is confined to explicit advanced/detail areas or the user-requested another-wallet source step.

Return language is explicitly estimated. The UI does not claim guaranteed, safe, or risk-free returns.

## Backend handoff

The remaining product work is intentionally limited to:

- Real account/wallet provider integration.
- Real balance, quote, FX, settlement, payout, earning, and transaction APIs.
- Secure server-side orchestration and persistence.
- Provider/network capability responses replacing the typed mock fixtures.
- Final dedicated micro-UI and accessibility audit.

The approved native tab architecture remains Home / Wallet / Earn / Activity.
