import { CardSuit, CardValue } from '@/types/cards';

export const TRICK_CONFIG = {
  FORCED_CARD: {
    suit: 'diamonds' as CardSuit,
    value: '7' as CardValue,
  },

  ANIMATION_DURATIONS: {
    cardFlip: 3000,
    cameraUnlink: 7000,
    cardReveal: 1500,
  },

  CAMERA: {
    sphereRadius: 15,
    unlinkDistance: 15,
    syncThrottleMs: 50,
  },

  CARD_FLIP: {
    staggerDelayMs: 30,
    totalDuration: 4000,
  },
} as const;
