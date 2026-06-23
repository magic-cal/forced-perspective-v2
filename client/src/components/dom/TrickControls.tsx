import styled from 'styled-components';
import { useGameStore } from '@/store/gameStore';
import { useShowFlow } from '@/hooks/useShowFlow';
import { LANDMARKS } from '@/config/landmarks';

const ControlsContainer = styled.div`
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ControlPanel = styled.div`
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px 20px;
  min-width: 250px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const StateDisplay = styled.div`
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StateName = styled.div`
  color: #4fc3f7;
  font-size: 18px;
  font-weight: 700;
  margin-top: 4px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  background: ${props =>
    props.variant === 'secondary'
      ? 'rgba(255, 255, 255, 0.1)'
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
  flex: 1;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    background: ${props =>
      props.variant === 'secondary'
        ? 'rgba(255, 255, 255, 0.2)'
        : 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'};
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const StateInfo = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  margin-top: 8px;
  line-height: 1.4;
`;

const STATE_DESCRIPTIONS: Record<string, string> = {
  'setup': 'Cards flying as flock. Press Next to form sphere.',
  'forming': 'Cards assembling into sphere. Press Next when sphere is formed.',
  'cards-flipping': 'Cards flipping to backs. Audience rotating. Animation in progress.',
  'participant-selection': 'Participant selecting card. Audience sees backs.',
  'sphere-aligned': 'Sphere aligning. Audience camera moving into position.',
  'final-flip': 'Cards flipping to reveal. Animation in progress.',
  'scatter': 'Cards scatter away. Selected card remains.',
};

const TRICK_STATE_LABELS: Record<string, string> = {
  'setup': 'Flock',
  'forming': 'Forming Sphere',
  'cards-flipping': 'Cards Flipping & Unlink',
  'participant-selection': 'Participant Selection',
  'sphere-aligned': 'Sphere Aligned',
  'final-flip': 'Final Flip',
  'scatter': 'Scatter',
};

export function TrickControls() {
  const role = useGameStore((s) => s.role);
  const {
    handleNext, handlePrev, handleAction, handleGalleryToggle, handleForceRefresh,
    canNext, canPrev, galleryEnabled, showPhase, galleryIndex,
    currentState, selectedCardId,
  } = useShowFlow();

  if (role !== 'magician') return null;

  const phaseLabel = (() => {
    if (showPhase === 'landing')       return 'Pre-Show Landing';
    if (showPhase === 'start-gallery') return `Opening Gallery — ${galleryIndex + 1} / ${LANDMARKS.length}`;
    if (showPhase === 'end-gallery')   return `Closing Gallery — ${galleryIndex + 1} / ${LANDMARKS.length}`;
    return 'Trick';
  })();

  const stateLabel = showPhase === 'trick' ? TRICK_STATE_LABELS[currentState] ?? currentState : '';
  const stateDescription = showPhase === 'trick' ? STATE_DESCRIPTIONS[currentState] : '';

  const nextLabel = (() => {
    if (showPhase === 'landing')       return 'Start Show →';
    if (showPhase === 'start-gallery') return galleryIndex < LANDMARKS.length - 1 ? 'Next Image →' : 'Start Trick →';
    if (showPhase === 'trick' && currentState === 'scatter') return galleryEnabled ? 'End Gallery →' : 'Complete';
    if (showPhase === 'end-gallery') return galleryIndex < LANDMARKS.length - 1 ? 'Next Image →' : 'Done';
    return 'Next →';
  })();

  return (
    <ControlsContainer>
      <ControlPanel>
        <StateDisplay>
          {phaseLabel}
          {stateLabel && <StateName>{stateLabel}</StateName>}
        </StateDisplay>

        {stateDescription && <StateInfo>{stateDescription}</StateInfo>}

        {currentState === 'participant-selection' && !selectedCardId && (
          <StateInfo style={{ color: '#ff9800', marginTop: '12px' }}>
            ⚠️ Waiting for participant to select a card
          </StateInfo>
        )}

        {currentState === 'participant-selection' && selectedCardId && (
          <StateInfo style={{ color: '#4caf50', marginTop: '12px' }}>
            ✓ Card selected: {selectedCardId}
          </StateInfo>
        )}

        <ButtonGroup>
          <Button variant="secondary" onClick={handlePrev} disabled={!canPrev}>
            ← Back
          </Button>
          <Button onClick={handleNext} disabled={!canNext}>
            {nextLabel}
          </Button>
        </ButtonGroup>

        <ButtonGroup>
          <Button variant="secondary" onClick={() => handleAction('reset')}>
            Reset
          </Button>
          <Button variant="secondary" onClick={handleForceRefresh}>
            Refresh All
          </Button>
        </ButtonGroup>

        <ButtonGroup>
          <Button variant="secondary" onClick={handleGalleryToggle}>
            Gallery: {galleryEnabled ? 'On' : 'Off'}
          </Button>
        </ButtonGroup>
      </ControlPanel>
    </ControlsContainer>
  );
}
