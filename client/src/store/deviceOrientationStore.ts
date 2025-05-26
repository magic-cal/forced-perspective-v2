import { create } from "zustand";

interface DeviceOrientationState {
  isEnabled: boolean;
  toggle: () => void;
}

export const useDeviceOrientationStore = create<DeviceOrientationState>(
  (set) => ({
    isEnabled: false,
    toggle: () => set((state) => ({ isEnabled: !state.isEnabled })),
  })
);
