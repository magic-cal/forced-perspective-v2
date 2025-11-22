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

  PERFORMANCE: {
    // Toggle for less resource-intensive rendering
    lowPerformanceMode: false,
    // Reduced settings for low performance mode
    lowPerf: {
      rotationSpeed: 0,
      maxCardsPerRow: 15,
      animationDurations: {
        cardFlip: 1500,
        cameraUnlink: 3000,
        cardReveal: 750,
      },
      staggerDelayMs: 60,
    },
  },
} as const;
