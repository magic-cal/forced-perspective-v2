export type TrickState =
  | 'setup'
  | 'forming'
  | 'cards-flipping'
  | 'participant-selection'
  | 'sphere-aligned'
  | 'final-flip'
  | 'scatter';

export type ViewType = 'participant' | 'audience';

export interface TrickStateData {
  state: TrickState;
  timestamp: number;

  // Animation states
  isFlippingCards: boolean;
  isUnlinking: boolean;
  isRevealing: boolean;

  // Selection data
  selectedCardId: string | null;
  hoveredCardId: string | null;
  isSelectionLocked: boolean;

  // Camera data
  isUnlinked: boolean;
  audienceCameraPosition: [number, number, number];
  audienceCameraRotation: [number, number, number];
}
