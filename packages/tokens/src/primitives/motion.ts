/**
 * Motion values that exist as numbers or named native transitions in source.
 * Native sheet / tab / picker timing is system-owned and has no numeric token.
 */
export const primitiveMotion = {
  duration: {
    onboardingReady: 850,
    flowProcessing: 1400,
  },
  navigation: {
    onboarding: 'fade',
    flowPush: 'slide_from_right',
  },
  opacity: {
    disabled: 0.45,
  },
} as const;
