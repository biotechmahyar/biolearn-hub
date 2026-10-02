// Dual architecture mode store
// Persists global/iran mode selection to localStorage

export type AppMode = "global" | "iran";

const STORAGE_KEY = "nibrc-mode";

// ── Iran mirror availability ───────────────────────────────────────────────
// "iran" mode talks to a self-hosted REST mirror (Hono/PostgreSQL) that only
// exists when VITE_IRAN_SERVER_URL is configured. Without that env var every
// request falls back to http://localhost:3000, fails silently, and each page
// renders the empty REST result instead of its Convex data (courses,
// instructors, AI models, …). So the mode is only honoured when the mirror is
// really configured; otherwise the app always runs on the Convex backend.
export const IRAN_API_CONFIGURED = Boolean(
  (import.meta.env?.VITE_IRAN_SERVER_URL ?? "").trim(),
);

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
    // Drop a stale "iran" preference so the app can never stay stuck on the
    // dead REST mirror once the mirror is removed/unconfigured.
    if (!IRAN_API_CONFIGURED && raw === "iran") {
      localStorage.removeItem(STORAGE_KEY);
      return "global";
    }
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
    if (!IRAN_API_CONFIGURED && mode === "iran") {
      // No mirror to talk to — stay on Convex instead of blanking every list.
      mode = "global";
    }
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
