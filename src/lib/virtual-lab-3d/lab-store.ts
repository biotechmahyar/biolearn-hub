import { create } from "zustand";

export interface LabManagerState {
  manager: {
    yaw: number;
    pitch: number;
    locked: boolean;
    position: { x: number; y: number; z: number };
  };
  hoveredId: string | null;
  panelId: string | null;
  setLocked: (locked: boolean) => void;
  setHoveredId: (id: string | null) => void;
  setPanelId: (id: string | null) => void;
}

export const useLabStore = create<LabManagerState>((set, get) => ({
  manager: {
    yaw: 0,
    pitch: 0,
    locked: false,
    position: { x: 0, y: 1.7, z: 5.2 },
  },
  hoveredId: null,
  panelId: null,
  setLocked: (locked) => set({ manager: { ...get().manager, locked } }),
  setHoveredId: (hoveredId) => set({ hoveredId }),
  setPanelId: (panelId) => set({ panelId }),
}));
