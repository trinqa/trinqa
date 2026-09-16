# Trinqa — Phase 1 Implementation Plan

## Stage 0 — Audit
Inspect:
- Expo SDK
- Expo Router
- React Native
- `@expo/ui`
- routing
- assets
- TypeScript config

Do not upgrade blindly.

## Stage 1 — Copy the reference shell
Implement the supplied UI's:
- background
- safe areas
- spacing
- cards
- hierarchy
- transaction rows
- typography

Acceptance:
- feels as spacious as reference
- no crowded dashboard
- no neon
- no custom bottom tab bar

## Stage 2 — Native tabs
Home / Pay / Earn / Activity

SDK 57:
`expo-router/unstable-native-tabs`

## Stage 3 — Home
Map to:
- Trinqa account
- balance
- Add Money
- Pay
- More
- Recent

Use typed mocks first.

## Stage 4 — Pay
Implement:
- recipient
- amount
- receive currency
- quote
- confirm
- success

Route service may be mocked first, but the interface must be ready for real Stellar / anchor routing.

## Stage 5 — Earn
Implement:
- total / available / earning
- strategy
- risk
- estimated APY
- manage allocation
- earn activity

Use SwiftUI BottomSheet for strategy selection.

## Stage 6 — Add Money
Source selector:
- Bank
- Another wallet / chain
- Stellar / QR

Then wire the selected hackathon anchor.

## Stage 7 — Real Stellar
Connect:
- testnet
- transaction submission
- real anchor path
- real deposit / withdrawal evidence

## Stage 8 — Real yield
Connect DeFindex strategy / vault.

Acceptance:
- deposit
- position value
- withdraw
- yield metadata
- transaction evidence

## Stage 9 — Activity
Bind real events.

## Stage 10 — Polish
- loading
- empty states
- errors
- haptics
- accessibility
- Dynamic Type
- overflow
- small-screen testing
- screenshots
- demo script

## Hard constraints
1. Do not redesign the supplied reference.
2. Do not create a custom tab bar.
3. Use native Expo/SwiftUI primitives where available.
4. Do not expose blockchain mechanics unnecessarily.
5. No secrets in client.
6. Integrations live behind service interfaces.
7. Phase 1 = Home + Pay + Earn.
8. Activity is present but minimal.
