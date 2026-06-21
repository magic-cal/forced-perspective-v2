import { create } from "zustand";

export type UserRole = "magician" | "spectator" | "audience";

interface GameState {
  isConnected: boolean;
  roomId: string | null;
  role: UserRole | null;
  setConnection: (status: boolean) => void;
  setRoom: (id: string | null) => void;
  setRole: (role: UserRole | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  isConnected: false,
  roomId: null,
  role: "audience",
  setConnection: (status) => set({ isConnected: status }),
  setRoom: (id) => set({ roomId: id }),
  setRole: (role) => set({ role }),
}));

export function useUserRole() {
  const role = useGameStore((state) => state.role);
  const setRole = useGameStore((state) => state.setRole);

  return [role, setRole] as const;
}
