// Dual architecture mode store
// Persists global/iran mode selection to localStorage

export type AppMode = "global" | "iran";

const STORAGE_KEY = "nibrc-mode";

export interface ModeStore {
  getMode(): AppMode;
  setMode(mode: AppMode): void;
  onModeChange(callback: (mode: AppMode) => void): () => void;
}

// Listeners for mode changes
const listeners: Set<(mode: AppMode) => void> = new Set();

function getFromStorage(): AppMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "global" || raw === "iran") return raw;
  } catch {
    // SSR or private browsing
  }
  return "global";
}

export const modeStore: ModeStore = {
  getMode(): AppMode {
    return getFromStorage();
  },

  setMode(mode: AppMode): void {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
    // Notify all listeners
    for (const listener of listeners) {
      try {
        listener(mode);
      } catch {
        // ignore listener errors
      }
    }
  },

  onModeChange(callback: (mode: AppMode) => void): () => void {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },
};
