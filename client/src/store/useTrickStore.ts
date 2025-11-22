import { create } from 'zustand';
import { TrickState } from '@/types/trick';

interface TrickStore {
  currentState: TrickState;
  nextState: () => void;
  resetTrick: () => void;

  // State-specific data
  isUnlinked: boolean;
  selectedCardId: string | null;
  isSelectionLocked: boolean;

  // Actions
  setUnlinked: (value: boolean) => void;
  setSelectedCard: (cardId: string | null) => void;
  lockSelection: () => void;
}

const STATE_SEQUENCE: TrickState[] = [
  'setup',
  'cards-flipping',
  'unlink-and-rotate',
  'participant-selection',
  'lock-and-reveal',
];

export const useTrickStore = create<TrickStore>((set, get) => ({
  currentState: 'setup',
  isUnlinked: false,
  selectedCardId: null,
  isSelectionLocked: false,

  nextState: () => {
    const { currentState } = get();
    const currentIndex = STATE_SEQUENCE.indexOf(currentState);

    if (currentIndex < STATE_SEQUENCE.length - 1) {
      const nextState = STATE_SEQUENCE[currentIndex + 1];
      set({ currentState: nextState });

      // Auto-unlock when entering participant-selection
      if (nextState === 'participant-selection') {
        set({ isSelectionLocked: false });
      }
    }
  },

  resetTrick: () => {
    set({
      currentState: 'setup',
      isUnlinked: false,
      selectedCardId: null,
      isSelectionLocked: false,
    });
  },

  setUnlinked: (value: boolean) => set({ isUnlinked: value }),

  setSelectedCard: (cardId: string | null) => {
    const { isSelectionLocked } = get();
    if (!isSelectionLocked) {
      set({ selectedCardId: cardId });
    }
  },

  lockSelection: () => set({ isSelectionLocked: true }),
}));
