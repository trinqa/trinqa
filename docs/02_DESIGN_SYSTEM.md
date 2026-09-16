# Trinqa — Design System v0.1

## Source of truth
The supplied clean white finance-app reference is the layout source of truth.

Composer must first reproduce its structure faithfully, then swap in Trinqa content.

## Preserve
- whitespace
- information density
- card sizing
- corner radii
- typography hierarchy
- compact transaction rows
- restrained section count
- calm visual rhythm

## Do not add
- explanatory paragraphs
- route chips everywhere
- blockchain jargon
- excessive badges
- neon glow
- unnecessary gradients
- extra sections merely to fill space

## Color direction
The neon-lime direction is rejected.

Start neutral:
- background: `#F4F4F2`
- surface: `#FFFFFF`
- surfaceSecondary: `#F7F7F5`
- textPrimary: `#111111`
- textSecondary: `#787878`
- border: `#E8E8E5`
- accent: `#2F6BFF`

Accent usage must be sparse.

## Brand illustration
Use the supplied white glove / black outline hand with the final accent-colored sleeve.

Use mainly for:
- brand moments
- success
- empty states
- splash / website

Do not replace system icons with it.

## Typography
Prefer the native iOS system font and semantic hierarchy.

## Approximate spacing
Reference image wins over these values:
- horizontal inset: 16–20 pt
- card gap: 10–14 pt
- section gap: 18–24 pt
- internal card padding: 14–18 pt

## Bottom navigation — hard rule
Tabs:
- Home
- Pay
- Earn
- Activity

Expo SDK 57:
`expo-router/unstable-native-tabs`

Do not build a custom floating pill tab bar.

## Native UI — hard rule
If Expo exposes the appropriate native-backed primitive, use it.

Reference:
https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/
