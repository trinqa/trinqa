export const outliers = [
  {
    id: 'splash-canvas',
    values: ['#F4F4F2', '#F3F3F3'],
    note: 'Splash / Android adaptive icon uses #F4F4F2; in-app canvas is #F3F3F3.',
  },
  {
    id: 'near-blacks',
    values: ['#111111', '#111316', '#141414', '#050505', '#2A2D31'],
    note: 'Multiple near-blacks. Not merged.',
  },
  {
    id: 'borders',
    values: ['#E8E8E5', '#E5E5E5'],
    note: 'border vs borderStrong differ by 3 RGB units.',
  },
  {
    id: 'type-off-scale',
    values: ['25.5'],
    note: 'Wallet balance uses 25.5 on the illustration; nearest role is amountDisplay 25.',
  },
  {
    id: 'shadows',
    values: ['card 0/4/0.06/14', 'surface 2/8/#0000000A', 'wallet 0/4/0.1/7', 'seam 1.5/2/#00000009'],
    note: 'Four distinct elevation recipes.',
  },
  {
    id: 'sheet-status',
    values: ['#20AD2B', '#FF3B30', '#787878'],
    note: 'Status mapped to colors.success / colors.danger / colors.pending.',
  },
  {
    id: 'unused-accent',
    values: ['#2F6BFF'],
    note: 'colors.accent exists; primary CTA uses cyan #08AFD3.',
  },
  {
    id: 'signed-amounts',
    values: ['positive #111111', 'negative #111111'],
    note: 'Debit and credit amounts share the same color.',
  },
  {
    id: 'quick-amount-height',
    values: ['40'],
    note: 'Quick amount chips are 40pt; header controls are 44pt.',
  },
  {
    id: 'earn-chart-scale',
    values: ['scaleEffect 1.13 × 0.8'],
    note: 'Static visual transform, not a motion token.',
  },
] as const;

export const usage = {
  'colors.background': ['Root stack contentStyle', 'FlowScreenShell', 'Home/Wallet/Earn/Activity canvases'],
  'colors.surface': ['Cards', 'NativeTabs background', 'shortcut tiles', 'sheets'],
  'colors.textPrimary': ['Titles', 'amounts', 'primary labels'],
  'colors.textSecondary': ['Captions', 'meta', 'secondary icons'],
  'colors.action': ['PrimaryActionButton', 'ProgressView tint', 'selected chips', 'success accents'],
  'colors.earning': ['Earn metrics', 'put-to-work strategy icon'],
  'colors.notificationBadge': ['Home profile badge'],
  'colors.accent': ['Declared; not used as CTA'],
  'typography.screenTitle': ['Home-adjacent titles', 'onboarding 28 inline'],
  'typography.body': ['PrimaryActionButton label (14) and many body.semibold rows'],
  'spacing.screenHorizontal': ['18 — also spacing.xl'],
  'radius.card': ['14 — action button, selection rows'],
  'motion.duration.onboardingReady': ['OnboardingScreen setTimeout'],
  'motion.duration.flowProcessing': ['Add money / Pay / Withdraw processing delay'],
  'walletColors.bodyStart': ['AccountCardStack gradient'],
} as const;

export const icons = [
  { name: 'house / house.fill', size: 'tab', role: 'Home tab' },
  { name: 'wallet.bifold / fill', size: 'tab', role: 'Wallet tab' },
  { name: 'chart.line.uptrend.xyaxis', size: 'tab', role: 'Earn tab' },
  { name: 'chart.bar / fill', size: 'tab', role: 'Activity tab' },
  { name: 'person.fill', size: 17, role: 'Profile avatar' },
  { name: 'hand.thumbsup.fill', size: 38, role: 'Onboarding' },
  { name: 'chevron.right', size: 12, role: 'Disclosure' },
  { name: 'chevron.down', size: 10, role: 'Currency menu' },
] as const;

export const componentInventory = [
  { name: 'PrimaryActionButton', reusable: true, file: 'FlowControls.tsx' },
  { name: 'SecondaryActionButton', reusable: true, file: 'FlowControls.tsx' },
  { name: 'AccountCardStack', reusable: true, file: 'AccountCardStack.tsx' },
  { name: 'ShortcutRow', reusable: true, file: 'ShortcutRow.tsx' },
  { name: 'LayeredTransactionRow', reusable: true, file: 'LayeredTransactionRow.tsx' },
  { name: 'WalletTransactionRow', reusable: true, file: 'WalletTransactionRow.tsx' },
  { name: 'TransactionRow', reusable: true, file: 'TransactionRow.tsx' },
  { name: 'EarnTransactionRow', reusable: true, file: 'EarnTransactionRow.tsx' },
  { name: 'TransactionDetailsSheet', reusable: true, file: 'TransactionDetailsSheet.tsx' },
  { name: 'NativeSegmentedControl', reusable: true, file: 'NativeSegmentedControl.tsx' },
  { name: 'FlowAmountEntry', reusable: true, file: 'FlowAmountEntry.tsx' },
  { name: 'FlowReviewRow', reusable: true, file: 'FlowControls.tsx' },
  { name: 'MetricCard', reusable: true, file: 'MetricCard.tsx' },
  { name: 'ScreenHeader', reusable: true, file: 'ScreenHeader.tsx' },
  { name: 'DateSectionDivider', reusable: true, file: 'DateSectionDivider.tsx' },
  { name: 'FlowStates processing/success', reusable: true, file: 'FlowControls.tsx / FlowStates.tsx' },
  { name: 'recipient / destination rows', reusable: false, file: 'Pay/Withdraw duplicated pattern' },
] as const;

export const motionPatterns = [
  {
    id: 'onboarding-ready',
    name: 'Onboarding ready delay',
    trigger: 'accountBootstrap === creating',
    property: 'timeout then replace',
    duration: 850,
    easing: 'none',
  },
  {
    id: 'flow-processing',
    name: 'Flow processing delay',
    trigger: 'confirm deposit / pay / withdraw',
    property: 'timeout + ProgressView',
    duration: 1400,
    easing: 'none',
  },
  {
    id: 'nav-fade',
    name: 'Onboarding fade',
    trigger: 'stack onboarding',
    property: 'screen opacity',
    duration: 'system',
    easing: 'expo-router fade',
  },
  {
    id: 'nav-slide',
    name: 'Flow push',
    trigger: 'receive, settings, add-money, pay, withdraw, put-to-work',
    property: 'translateX',
    duration: 'system',
    easing: 'expo-router slide_from_right',
  },
  {
    id: 'sheet-present',
    name: 'Transaction details sheet',
    trigger: 'row press',
    property: 'native BottomSheet fitToContents',
    duration: 'system',
    easing: 'UIKit sheet',
  },
  {
    id: 'disabled-opacity',
    name: 'Primary button disabled',
    trigger: 'invalid amount / state',
    property: 'opacity 0.45',
    duration: 'instant',
    easing: 'none',
  },
  {
    id: 'progress-scale',
    name: 'Processing spinner scale',
    trigger: 'processing state',
    property: 'scaleEffect 1.65 on ProgressView',
    duration: 'static modifier',
    easing: 'none',
  },
  {
    id: 'native-picker',
    name: 'Segmented control',
    trigger: 'Activity / Earn segment',
    property: 'SwiftUI Picker segmented',
    duration: 'system',
    easing: 'system',
  },
  {
    id: 'native-tabs',
    name: 'Tab selection',
    trigger: 'NativeTabs',
    property: 'SF Symbol fill swap',
    duration: 'system',
    easing: 'system',
  },
] as const;

export const interactions = [
  { id: 'button-press', states: ['default', 'disabled', 'loading'] },
  { id: 'chip-select', states: ['default', 'selected'] },
  { id: 'row-press', states: ['default', 'opens sheet'] },
  { id: 'segment', states: ['default', 'selected'] },
  { id: 'tab', states: ['default', 'selected'] },
  { id: 'sheet', states: ['closed', 'open'] },
  { id: 'flow', states: ['form', 'processing', 'success', 'failed'] },
] as const;

export const haptics = [] as const;
