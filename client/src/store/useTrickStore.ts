import { create } from 'zustand';
import { TrickState } from '@/types/trick';

interface TrickStore {
  currentState: TrickState;
  nextState: () => void;
  prevState: () => void;
  resetTrick: () => void;
  setState: (state: TrickState) => void;

  // State-specific data
  isUnlinked: boolean;
  selectedCardId: string | null;
  isSelectionLocked: boolean;

  // Actions
  setUnlinked: (value: boolean) => void;
  setSelectedCard: (cardId: string | null) => void;
  lockSelection: () => void;
}

export const STATE_SEQUENCE: TrickState[] = [
  'setup',
  'forming',
  'cards-flipping',
  'participant-selection',
  'sphere-aligned',
  'final-flip',
  'scatter',
];

export const useTrickStore = create<TrickStore>((set, get) => ({
  currentState: 'setup',
  isUnlinked: false,
  selectedCardId: null,
  isSelectionLocked: false,

  setState: (state: TrickState) => {
    set({ currentState: state });
    
    // Auto-unlock when entering participant-selection
    if (state === 'participant-selection') {
      set({ isSelectionLocked: false });
    }
  },

  prevState: () => {
    const { currentState } = get();
    const currentIndex = STATE_SEQUENCE.indexOf(currentState);
    if (currentIndex > 0) {
      set({ currentState: STATE_SEQUENCE[currentIndex - 1] });
    }
  },

  nextState: () => {
    const { currentState } = get();
    const currentIndex = STATE_SEQUENCE.indexOf(currentState);

    console.log('nextState called:', { currentState, currentIndex, sequenceLength: STATE_SEQUENCE.length });

    if (currentIndex < STATE_SEQUENCE.length - 1) {
      const nextStateValue = STATE_SEQUENCE[currentIndex + 1];
      console.log('Transitioning to:', nextStateValue);
      set({ currentState: nextStateValue });

      // Auto-unlock when entering participant-selection
      if (nextStateValue === 'participant-selection') {
        set({ isSelectionLocked: false });
      }
      

    } else {
      console.log('Already at final state, cannot progress');
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
