import { create } from 'zustand';
import type { SessionStateEventData } from '../../../shared/socketEvents';

interface SessionStore {
  sessionStartTime: number;
  rotationStopTime: number | null;
  sphereRotation: number;
  setSessionState: (data: SessionStateEventData) => void;
  setSphereRotation: (rotation: number) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  // Default to now so rows start at 0 if session-state hasn't arrived yet
  sessionStartTime: Date.now(),
  rotationStopTime: null,
  sphereRotation: 0,
  setSessionState: (data) =>
    set({
      sessionStartTime: data.sessionStartTime,
      rotationStopTime: data.rotationStopTime,
      sphereRotation: data.sphereRotation,
    }),
  setSphereRotation: (rotation) => set({ sphereRotation: rotation }),
}));
