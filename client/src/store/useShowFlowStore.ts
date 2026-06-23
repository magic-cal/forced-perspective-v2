import { create } from 'zustand';

export type ShowPhase = 'landing' | 'start-gallery' | 'trick' | 'end-gallery';

interface ShowFlowState {
  galleryEnabled: boolean;
  showPhase: ShowPhase;
  galleryIndex: number;
  setGalleryEnabled: (enabled: boolean) => void;
  setShowPhase: (phase: ShowPhase) => void;
  setGalleryIndex: (index: number) => void;
  reset: () => void;
}

const initialGalleryEnabled =
  new URLSearchParams(window.location.search).get('gallery') !== '0';

export const useShowFlowStore = create<ShowFlowState>((set) => ({
  galleryEnabled: initialGalleryEnabled,
  showPhase: 'landing',
  galleryIndex: 0,

  setGalleryEnabled: (enabled) => set({ galleryEnabled: enabled }),
  setShowPhase: (phase) => set({ showPhase: phase }),
  setGalleryIndex: (index) => set({ galleryIndex: index }),

  reset: () => {
    set({
      showPhase: 'landing',
      galleryIndex: 0,
    });
  },
}));
