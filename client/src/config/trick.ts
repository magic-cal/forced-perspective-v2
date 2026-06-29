import { CardSuit, CardValue } from '@/types/cards';

export const TRICK_CONFIG = {
  FORCED_CARD: {
    suit: 'diamonds' as CardSuit,
    value: '10' as CardValue,
  },

  ANIMATION_DURATIONS: {
    cardFlip: 3000,
    cameraUnlink: 9000,
    cardReveal: 1500,
    cardMoveToFulcrum: 2000,
  },

  CAMERA: {
    sphereRadius: 15,
    unlinkDistance: 15,
    syncThrottleMs: 50,
  },

  SPHERE_ALIGNMENT: {
    // Duration to slow down rotation and align sphere
    duration: 5000,
    // Easing for rotation slowdown
    rotationSlowdownDuration: 1000,
    // Duration of the audience camera move into the aligned line-of-sight (ms)
    audienceCamDuration: 5000,
  },

  CARD_FLIP: {
    staggerDelayMs: 20,
    totalDuration: 3_000,
  },

  PERFORMANCE: {
    // Toggle for less resource-intensive rendering
    lowPerformanceMode: false,
    // Reduced settings for low performance mode
    lowPerf: {
      rotationSpeed: 0,
      maxCardsPerRow: 15,
      animationDurations: {
        cardFlip: 1_500,
        cameraUnlink: 3_000,
        cardReveal: 750,
      },
      staggerDelayMs: 60,
    },
    // XR-specific settings — applied automatically when Quest/headset is presenting
    xr: {
      boidFrameSkip: 3,      // run boid simulation every N frames during setup only
      formingDuration: 2000, // ms cards spend flying to sphere in XR
    },
    // Audience-specific forming duration — longer so the effect is more dramatic from outside
    audienceFormingDuration: 20000,
  },
} as const;
