import { useState, useCallback, useRef } from 'react';
import { TRICK_CONFIG } from '@/config/trick';

interface CardFlipAnimationOptions {
  totalCards: number;
  onComplete?: () => void;
}

export function useCardFlipAnimation({ totalCards, onComplete }: CardFlipAnimationOptions) {
  const [isAnimating, setIsAnimating] = useState(false);
  const startTimeRef = useRef<number>(0);
  const completedRef = useRef(false);

  const startFlipAnimation = useCallback(() => {
    if (totalCards === 0) {
      console.warn('Cannot start flip animation: totalCards is 0');
      return;
    }

    console.log(`Starting flip animation for ${totalCards} cards`);
    setIsAnimating(true);
    startTimeRef.current = Date.now();
    completedRef.current = false;
  }, [totalCards]);

  const getFlippedCards = useCallback(
    (currentTime: number): Set<number> => {
      if (!isAnimating) return new Set();

      const elapsed = currentTime - startTimeRef.current;
      const { staggerDelayMs, totalDuration } = TRICK_CONFIG.CARD_FLIP;

      // Calculate how many cards should be flipped based on elapsed time
      const cardsToFlip = Math.floor(elapsed / staggerDelayMs);
      const flippedSet = new Set<number>();

      for (let i = 0; i < Math.min(cardsToFlip, totalCards); i++) {
        flippedSet.add(i);
      }

      // Check if animation is complete
      if (elapsed >= totalDuration && !completedRef.current) {
        console.log('Flip animation complete');
        completedRef.current = true;
        setIsAnimating(false);
        
        // Call onComplete callback after a short delay
        setTimeout(() => {
          onComplete?.();
        }, 100);
      }

      return flippedSet;
    },
    [isAnimating, totalCards, onComplete]
  );

  const resetAnimation = useCallback(() => {
    setIsAnimating(false);
    startTimeRef.current = 0;
    completedRef.current = false;
  }, []);

  return {
    startFlipAnimation,
    getFlippedCards,
    isAnimating,
    resetAnimation,
  };
}
