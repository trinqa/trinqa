# Trinqa — Mobile Architecture v0.1

## Target
- iOS
- Expo
- React Native
- TypeScript
- Expo Router
- Expo UI / SwiftUI-backed controls

## Tabs
- `/` → Home
- `/pay` → Pay
- `/earn` → Earn
- `/activity` → Activity

Use `expo-router/unstable-native-tabs` for SDK 57.

## Suggested structure
```text
apps/mobile/src/
  app/
  components/
  features/home/
  features/pay/
  features/earn/
  features/activity/
  services/stellar/
  services/anchors/
  services/routing/
  services/yield/
  state/
  hooks/
  theme/
  types/
packages/
  core/
  stellar/
  anchors/
  routing/
  yield/
docs/
```

## State domains
Account:
- totalBalance
- availableBalance
- earningBalance
- displayCurrency

Payment:
- recipient
- amount
- currency
- quote
- fee
- arrivalEstimate
- status

Earn:
- strategy
- risk
- duration
- positionValue
- estimatedAPY
- earnedToday
- withdrawalAvailability

## Service boundaries
`stellar`
- account access
- transactions
- network status

`anchors`
- anchor discovery
- auth
- deposit / withdrawal
- quote normalization
- SEP flows

`routing`
- select supported payment route
- source asset selection
- fee / time comparison

`yield`
- strategies
- protocol metadata
- deposit
- withdraw
- position valuation
- risk metadata

UI must not contain provider-specific business logic.

## Anchor path
Where supported:
- SEP-1
- SEP-10
- SEP-24

SEP-24 allows anchor-hosted KYC / transaction UX, reducing wallet-side implementation work.

## Security
Never:
- hardcode private keys
- expose server secrets
- log secrets
- trust client-computed financial results as authoritative

## Mocking
Mock data may be used first, but only behind typed interfaces so real integrations can replace it without rewriting screens.
