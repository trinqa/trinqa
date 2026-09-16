# Trinqa — Phase 1 Documentation Pack

## Locked scope
Phase 1 builds:
1. Home
2. Pay
3. Earn

`Activity` exists in the native bottom tab bar but its deep implementation is deferred.

## Product principle
**The user chooses intent. Trinqa chooses infrastructure.**

The user should not need to understand anchors, chains, swaps, bridges or payout rails for normal actions.

## Native UI rule
Use Expo's native-backed primitives whenever available.

- Routed tabs on Expo SDK 57: `expo-router/unstable-native-tabs`
- Bottom sheets: `@expo/ui/swift-ui/BottomSheet`
- Prefer SwiftUI-backed Button, Picker, Toggle, Slider, Form, List, TextField, Menu and ConfirmationDialog where appropriate.

## Core references
- https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/
- https://docs.expo.dev/router/advanced/native-tabs/
- https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/bottomsheet/
- https://developers.stellar.org/docs/platforms/anchor-platform/sep-guide/sep24
- https://developers.stellar.org/docs/build/apps/example-application-tutorial/anchor-integration/sep24
- https://github.com/stellar/ecosystem-resources
- https://skills.stellar.org/
