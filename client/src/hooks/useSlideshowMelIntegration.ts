import { useShowRunnerChild } from 'slideshow-mel';
import { useShowFlow } from './useShowFlow';

const ACTION_DESCRIPTORS = [{ key: 'reset', label: 'Reset Trick' }];

export function useSlideshowMelIntegration() {
  const { allSteps, currentStepIndex, handleNext, handleJumpToStep, handleAction } = useShowFlow();

  useShowRunnerChild({
    steps: allSteps,
    currentStepIndex,
    onNext: handleNext,
    onJumpToStep: handleJumpToStep,
    actions: ACTION_DESCRIPTORS,
    onAction: handleAction,
  });
}
