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
  const url = new URLSearchParams(window.location.search);
  const role = url.get("role") as UserRole | null;
  if (role) {
    console.log("Setting role from URL", role);
    useGameStore.setState({ role });
  }

  return useGameStore((state) => [state.role, state.setRole] as const);
}
