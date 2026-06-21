import { useShowRunnerChild } from 'slideshow-mel';
import type { RunnerStep } from 'slideshow-mel';
import { useTrickStore } from '@/store/useTrickStore';
import { useSocket } from '@/sockets/SocketProvider';
import { TrickState } from '@/types/trick';

const TRICK_STEPS: RunnerStep[] = [
  { id: 'setup',                 title: 'Flock',                description: 'Cards flying as boid flock.' },
  { id: 'forming',               title: 'Forming Sphere',       description: 'Cards assembling into sphere. Press Next when ready.' },
  { id: 'cards-flipping',        title: 'Cards Flipping',       description: 'Cards flipping to backs. Audience rotating.' },
  { id: 'participant-selection', title: 'Participant Selection', description: 'Participant selecting a card.' },
  { id: 'sphere-aligned',        title: 'Sphere Aligned',       description: 'Sphere aligning. Audience camera moves.' },
  { id: 'final-flip',            title: 'Final Flip',           description: 'Cards flipping to reveal.' },
  { id: 'scatter',               title: 'Scatter',              description: 'Cards scatter away. Selected card remains.' },
];

// Serialisable descriptors only — no functions, safe to send via postMessage
const ACTION_DESCRIPTORS = [{ key: 'reset', label: 'Reset Trick' }];

export function useSlideshowMelIntegration() {
  const { currentState, nextState, setState, resetTrick, selectedCardId } = useTrickStore();
  const socket = useSocket();

  const currentStepIndex = TRICK_STEPS.findIndex((s) => s.id === currentState);

  const handleNext = () => {
    // Mirror the canProgress guard from TrickControls
    if (currentState === 'scatter') return;
    if (currentState === 'participant-selection' && !selectedCardId) return;
    nextState();
    // nextState() is synchronous — getState() reflects the new value immediately
    const newState = useTrickStore.getState().currentState;
    socket?.emit('trick-state-change', { state: newState, timestamp: Date.now() });
  };

  const handleJumpToStep = (step: RunnerStep) => {
    setState(step.id as TrickState);
    socket?.emit('trick-state-change', { state: step.id, timestamp: Date.now() });
  };

  const handleAction = (key: string) => {
    if (key === 'reset') {
      resetTrick();
      // trick-reset tells other clients to also reset card selection state
      socket?.emit('trick-reset', { timestamp: Date.now() });
    }
  };

  useShowRunnerChild({
    steps: TRICK_STEPS,
    currentStepIndex,
    onNext: handleNext,
    onJumpToStep: handleJumpToStep,
    actions: ACTION_DESCRIPTORS,
    onAction: handleAction,
  });
}
