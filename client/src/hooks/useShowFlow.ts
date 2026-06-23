import { useCallback } from 'react';
import type { RunnerStep } from 'slideshow-mel';
import { LANDMARKS } from '@/config/landmarks';
import { useSocket } from '@/sockets/SocketProvider';
import { useTrickStore } from '@/store/useTrickStore';
import { useShowFlowStore } from '@/store/useShowFlowStore';
import type { TrickState } from '@/types/trick';

export const TRICK_STEPS: RunnerStep[] = [
  { id: 'setup',                 title: 'Flock',                description: 'Cards flying as boid flock.' },
  { id: 'forming',               title: 'Forming Sphere',       description: 'Cards assembling into sphere.' },
  { id: 'cards-flipping',        title: 'Cards Flipping',       description: 'Cards flipping to backs.' },
  { id: 'participant-selection', title: 'Participant Selection', description: 'Participant selecting a card.' },
  { id: 'sphere-aligned',        title: 'Sphere Aligned',       description: 'Sphere aligning. Audience camera moves.' },
  { id: 'final-flip',            title: 'Final Flip',           description: 'Cards flipping to reveal.' },
  { id: 'scatter',               title: 'Scatter',              description: 'Cards scatter away. Selected card remains.' },
];

function buildSteps(galleryEnabled: boolean): RunnerStep[] {
  const startSteps: RunnerStep[] = LANDMARKS.map((_, i) => ({
    id: `start-gallery-${i}`,
    title: `Image ${i + 1} / ${LANDMARKS.length}`,
    description: `Opening landmark ${i + 1}`,
  }));
  const endSteps: RunnerStep[] = LANDMARKS.map((_, i) => ({
    id: `end-gallery-${i}`,
    title: `End Image ${i + 1} / ${LANDMARKS.length}`,
    description: `Closing landmark ${i + 1}`,
  }));
  return galleryEnabled ? [...startSteps, ...TRICK_STEPS, ...endSteps] : [...TRICK_STEPS];
}

export function useShowFlow() {
  const socket = useSocket();
  const { currentState, nextState, setState, resetTrick, selectedCardId } = useTrickStore();
  const {
    galleryEnabled, showPhase, galleryIndex,
    setGalleryEnabled, setShowPhase, setGalleryIndex, reset,
  } = useShowFlowStore();

  const allSteps = buildSteps(galleryEnabled);

  const currentStepIndex = (() => {
    const trickOffset = galleryEnabled ? LANDMARKS.length : 0;
    if (showPhase === 'start-gallery') return galleryIndex;
    if (showPhase === 'trick') return trickOffset + TRICK_STEPS.findIndex(s => s.id === currentState);
    return trickOffset + TRICK_STEPS.length + galleryIndex;
  })();

  const canNext =
    showPhase === 'start-gallery'
      ? true
      : showPhase === 'trick'
        ? currentState !== 'scatter'
          ? currentState !== 'participant-selection' || !!selectedCardId
          : galleryEnabled // scatter: can proceed only if end gallery follows
        : galleryIndex < LANDMARKS.length - 1; // end-gallery: blocked on last image

  const handleNext = useCallback(() => {
    if (!canNext) return;

    if (showPhase === 'start-gallery') {
      if (galleryIndex < LANDMARKS.length - 1) {
        const next = galleryIndex + 1;
        setGalleryIndex(next);
        socket?.emit('landmark-index', { index: next, senderId: socket.id });
      } else {
        setShowPhase('trick');
        socket?.emit('landmark-finish', { senderId: socket.id });
      }
    } else if (showPhase === 'trick') {
      if (currentState === 'scatter') {
        setShowPhase('end-gallery');
        setGalleryIndex(0);
        socket?.emit('end-gallery-start');
      } else {
        nextState();
        const newState = useTrickStore.getState().currentState;
        socket?.emit('trick-state-change', { state: newState, timestamp: Date.now() });
      }
    } else {
      // end-gallery: advance to next image (last image is blocked by canNext)
      const next = galleryIndex + 1;
      setGalleryIndex(next);
      socket?.emit('end-landmark-index', { index: next, senderId: socket.id });
    }
  }, [
    canNext, showPhase, galleryIndex, galleryEnabled, currentState,
    socket, nextState, setShowPhase, setGalleryIndex,
  ]);

  const handleJumpToStep = useCallback((step: RunnerStep) => {
    const { id } = step;
    if (id.startsWith('start-gallery-')) {
      const idx = parseInt(id.slice('start-gallery-'.length), 10);
      setShowPhase('start-gallery');
      setGalleryIndex(idx);
      socket?.emit('landmark-index', { index: idx, senderId: socket?.id });
    } else if (id.startsWith('end-gallery-')) {
      const idx = parseInt(id.slice('end-gallery-'.length), 10);
      setShowPhase('end-gallery');
      setGalleryIndex(idx);
      socket?.emit('end-gallery-start');
      if (idx > 0) socket?.emit('end-landmark-index', { index: idx, senderId: socket?.id });
    } else {
      setState(id as TrickState);
      if (showPhase !== 'trick') setShowPhase('trick');
      socket?.emit('trick-state-change', { state: id, timestamp: Date.now() });
    }
  }, [showPhase, setShowPhase, setGalleryIndex, setState, socket]);

  const handleAction = useCallback((key: string) => {
    if (key === 'reset') {
      resetTrick();
      reset();
      socket?.emit('trick-reset', { timestamp: Date.now() });
    }
  }, [resetTrick, reset, socket]);

  const handleGalleryToggle = useCallback(() => {
    const newEnabled = !galleryEnabled;
    setGalleryEnabled(newEnabled);
    if (!newEnabled && showPhase === 'start-gallery') {
      setShowPhase('trick');
      socket?.emit('gallery-skip');
    }
  }, [galleryEnabled, showPhase, setGalleryEnabled, setShowPhase, socket]);

  return {
    allSteps,
    currentStepIndex,
    canNext,
    handleNext,
    handleJumpToStep,
    handleAction,
    galleryEnabled,
    handleGalleryToggle,
    showPhase,
    galleryIndex,
    currentState,
    selectedCardId,
  };
}
