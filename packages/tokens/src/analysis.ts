/**
 * Visual weight estimate from current screens (Home-weighted, then averaged
 * with Wallet / Earn / Activity / flow sheets). Not a pixel-perfect histogram.
 */
export const colorDistribution = {
  method: 'Approximate painted area of primary screens, not a 60/30/10 target.',
  current: [
    { role: 'Dominant', token: 'colors.background', value: '#F3F3F3', percent: 46 },
    { role: 'Supporting', token: 'colors.surface', value: '#FFFFFF', percent: 28 },
    { role: 'Supporting dark', token: 'walletColors.bodyStart', value: '#2B2D33', percent: 12 },
    { role: 'Accent', token: 'colors.action', value: '#08AFD3', percent: 6 },
    { role: 'Text / ink', token: 'colors.textPrimary', value: '#111111', percent: 5 },
    { role: 'Status', token: 'earning + notificationBadge', value: '#20AD2B / #FF3B30', percent: 3 },
  ],
  targetModel: {
    60: { slot: 'Dominant surface', filled: false },
    30: { slot: 'Supporting brand/neutral', filled: false },
    10: { slot: 'Accent', filled: false },
  },
} as const;

export const accessibilityFlags = [
  {
    id: 'cyan-on-white',
    issue: 'Action cyan #08AFD3 on white is below 4.5:1 for small text.',
    usedFor: 'Selected chip fills, some icon tints',
  },
  {
    id: 'white-on-cyan',
    issue: 'White label on PrimaryActionButton (~3:1) is below AA for 14pt semibold.',
    usedFor: 'Primary CTA',
  },
  {
    id: 'secondary-text',
    issue: '#787878 on #F3F3F3 is near 4.5:1 — caption sizes 10–12 may fail AA.',
    usedFor: 'Captions, meta',
  },
  {
    id: 'disabled-cta',
    issue: 'Disabled CTA at 0.45 opacity further reduces already-low contrast.',
    usedFor: 'PrimaryActionButton',
  },
  {
    id: 'quick-amount',
    issue: 'Quick amount height 40pt is below 44pt recommended touch target.',
    usedFor: 'Add money chips',
  },
  {
    id: 'named-status',
    issue: 'Resolved. Status uses colors.success / colors.danger / colors.pending.',
    usedFor: 'TransactionDetailsSheet, flow success/processing',
  },
] as const;
