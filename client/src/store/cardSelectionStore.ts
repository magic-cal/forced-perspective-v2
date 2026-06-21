import { create } from "zustand";
import { CardData } from "@/components/canvas/Card/types";

interface CardSelectionState {
  selectedCard: CardData | null;
  setSelectedCard: (card: CardData | null) => void;
  hoveredCard: CardData | null;
  setHoveredCard: (card: CardData | null) => void;
}

export const useCardSelectionStore = create<CardSelectionState>((set) => ({
  selectedCard: null,
  setSelectedCard: (card) => set({ selectedCard: card }),
  hoveredCard: null,
  setHoveredCard: (card) => set({ hoveredCard: card }),
}));
