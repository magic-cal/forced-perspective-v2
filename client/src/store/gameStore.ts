import { create } from "zustand";

interface GameState {
  isConnected: boolean;
  roomId: string | null;
  role: "magician" | "spectator" | null;
  setConnection: (status: boolean) => void;
  setRoom: (id: string | null) => void;
  setRole: (role: "magician" | "spectator" | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  isConnected: false,
  roomId: null,
  role: null,
  setConnection: (status) => set({ isConnected: status }),
  setRoom: (id) => set({ roomId: id }),
  setRole: (role) => set({ role }),
}));
