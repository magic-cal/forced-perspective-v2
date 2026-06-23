import { create } from 'zustand';

export type ShowPhase = 'start-gallery' | 'trick' | 'end-gallery';

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

export const useShowFlowStore = create<ShowFlowState>((set, get) => ({
  galleryEnabled: initialGalleryEnabled,
  showPhase: initialGalleryEnabled ? 'start-gallery' : 'trick',
  galleryIndex: 0,

  setGalleryEnabled: (enabled) => set({ galleryEnabled: enabled }),
  setShowPhase: (phase) => set({ showPhase: phase }),
  setGalleryIndex: (index) => set({ galleryIndex: index }),

  reset: () => {
    const { galleryEnabled } = get();
    set({
      showPhase: galleryEnabled ? 'start-gallery' : 'trick',
      galleryIndex: 0,
    });
  },
}));
