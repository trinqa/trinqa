export interface WelcomeSlide {
  id: 'earning' | 'access' | 'control';
  title: string;
  body: string;
  cta: string;
  /** Slide 1 is the product itself in motion; the other two are illustrations. */
  media: { kind: 'video'; source: number } | { kind: 'image'; source: number };
}

/** How long each slide holds before it advances on its own. */
export const WELCOME_SLIDE_MS = 4000;

export const welcomeSlides: WelcomeSlide[] = [
  {
    id: 'earning',
    title: 'Put your idle money to work.',
    body: 'Trinqa puts eligible idle money into strategies that match your risk and time horizon.',
    cta: 'Continue',
    media: {
      kind: 'video',
      source: require('../../../assets/videos/welcome-1.mp4') as number,
    },
  },
  {
    id: 'access',
    title: 'Your money stays ready.',
    body: 'When you need it, Trinqa makes only what you need available — without unwinding everything.',
    cta: 'Continue',
    media: {
      kind: 'image',
      source: require('../../../assets/images/welcome-2.png') as number,
    },
  },
  {
    id: 'control',
    title: 'You choose the goal.\nTrinqa handles the rest.',
    body: 'Set your risk, time horizon, and liquidity needs. Trinqa coordinates your portfolio in the background.',
    cta: 'Set up my portfolio  →',
    media: {
      kind: 'image',
      source: require('../../../assets/images/welcome-3.png') as number,
    },
  },
];
