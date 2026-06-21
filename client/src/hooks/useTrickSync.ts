import { useEffect } from 'react';
import { useSocket } from '@/sockets/SocketProvider';
import { useTrickStore } from '@/store/useTrickStore';
import { useGameStore } from '@/store/gameStore';
import { useCardSelectionStore } from '@/store/cardSelectionStore';
import { debug } from '@/config/debug';
import { TrickState } from '@/types/trick';

/**
 * Hook to synchronize trick state across all clients via socket
 * - Magician broadcasts state changes
 * - All roles listen for and apply state changes
 */
export function useTrickSync() {
  const socket = useSocket();
  const role = useGameStore((s) => s.role);

  // Subscribe to Zustand store changes and broadcast via socket (only for magician)
  useEffect(() => {
    if (!socket || role !== 'magician') return;

    debug.trick('[useTrickSync] Magician subscribing to store changes');

    const unsubscribe = useTrickStore.subscribe((state, prevState) => {
      // Broadcast state changes
      if (state.currentState !== prevState.currentState) {
        debug.trick(`[Magician] Broadcasting state change: ${state.currentState}`);
        socket.emit('trick-state-change', {
          state: state.currentState,
          timestamp: Date.now(),
        });
        
        // If state changed to 'setup', broadcast reset
        if (state.currentState === 'setup' && prevState.currentState !== 'setup') {
          debug.trick('[Magician] Broadcasting trick reset');
          socket.emit('trick-reset', {
            timestamp: Date.now(),
          });
        }
      }

      // Broadcast unlink changes
      if (state.isUnlinked !== prevState.isUnlinked && state.isUnlinked) {
        debug.trick('[Magician] Broadcasting unlink triggered');
        socket.emit('unlink-triggered', {
          timestamp: Date.now(),
        });
      }

      // Broadcast card selection changes
      if (state.selectedCardId !== prevState.selectedCardId && state.selectedCardId) {
        debug.trick(`[Magician] Broadcasting card selection: ${state.selectedCardId}`);
        socket.emit('card-selected', {
          cardId: state.selectedCardId,
          suit: 'unknown', // Will be filled by actual card data
          value: 'unknown',
          timestamp: Date.now(),
        });
      }
    });

    return unsubscribe;
  }, [socket, role]);

  // Listen for state changes from other clients (all roles)
  useEffect(() => {
    if (!socket) return;

    debug.trick(`[useTrickSync] ${role} subscribing to socket events`);

    const handleStateChange = (data: { state: string; timestamp: number }) => {
      debug.trick(`[${role}] Received state change: ${data.state}`);
      const currentState = useTrickStore.getState().currentState;
      if (currentState !== data.state) {
        debug.trick(`[${role}] Updating state from ${currentState} to ${data.state}`);
        useTrickStore.getState().setState(data.state as TrickState);
      }
    };

    const handleUnlinkTriggered = () => {
      debug.trick(`[${role}] Received unlink triggered`);
      if (!useTrickStore.getState().isUnlinked) {
        useTrickStore.getState().setUnlinked(true);
      }
    };

    const handleCardSelected = (data: { cardId: string }) => {
      debug.trick(`[${role}] Received card selection: ${data.cardId}`);
      if (useTrickStore.getState().selectedCardId !== data.cardId) {
        useTrickStore.getState().setSelectedCard(data.cardId);
      }
    };

    const handleTrickReset = () => {
      debug.trick(`[${role}] Received trick reset`);
      useTrickStore.getState().resetTrick();
      
      // Also reset card selection store
      useCardSelectionStore.getState().setSelectedCard(null);
      useCardSelectionStore.getState().setHoveredCard(null);
    };

    socket.on('trick-state-change', handleStateChange);
    socket.on('unlink-triggered', handleUnlinkTriggered);
    socket.on('card-selected', handleCardSelected);
    socket.on('trick-reset', handleTrickReset);

    return () => {
      socket.off('trick-state-change', handleStateChange);
      socket.off('unlink-triggered', handleUnlinkTriggered);
      socket.off('card-selected', handleCardSelected);
      socket.off('trick-reset', handleTrickReset);
    };
  }, [socket, role]);
}
