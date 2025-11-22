import styled from 'styled-components';
import { useTrickStore } from '@/store/useTrickStore';
import { TrickState } from '@/types/trick';
import { useGameStore } from '@/store/gameStore';

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

const STATE_DESCRIPTIONS: Record<TrickState, string> = {
  'setup': 'Cards face participant. Views synced.',
  'cards-flipping': 'Cards flipping to backs. Animation in progress.',
  'unlink-and-rotate': 'Audience rotating 180°. Participant cards flip to faces.',
  'participant-selection': 'Participant selecting card. Audience sees backs.',
  'lock-and-reveal': 'Selected card reveals forced value.',
};

const STATE_LABELS: Record<TrickState, string> = {
  'setup': 'Setup',
  'cards-flipping': 'Cards Flipping',
  'unlink-and-rotate': 'Unlink & Rotate',
  'participant-selection': 'Participant Selection',
  'lock-and-reveal': 'Lock & Reveal',
};

export function TrickControls() {
  const { currentState, nextState, resetTrick, selectedCardId } = useTrickStore();
  const role = useGameStore((s) => s.role);

  const canProgress = () => {
    // Can't progress from lock-and-reveal (end state)
    if (currentState === 'lock-and-reveal') return false;
    
    // Need a selected card to progress from participant-selection
    if (currentState === 'participant-selection' && !selectedCardId) return false;
    
    return true;
  };

  // Show controls for magician role
  if (role !== 'magician') {
    return null;
  }

  return (
    <ControlsContainer>
      <ControlPanel>
        <StateDisplay>
          Current State
          <StateName>{STATE_LABELS[currentState]}</StateName>
        </StateDisplay>
        
        <StateInfo>{STATE_DESCRIPTIONS[currentState]}</StateInfo>
        
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
          <Button 
            onClick={nextState} 
            disabled={!canProgress()}
            title={!canProgress() ? 'Cannot progress from current state' : 'Progress to next state'}
          >
            {currentState === 'lock-and-reveal' ? 'Complete' : 'Next State'}
          </Button>
          <Button 
            variant="secondary" 
            onClick={resetTrick}
            title="Reset trick to setup state"
          >
            Reset
          </Button>
        </ButtonGroup>
      </ControlPanel>
    </ControlsContainer>
  );
}
