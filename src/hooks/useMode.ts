import { useSyncExternalStore, useCallback } from "react";
import { modeStore, type AppMode } from "@/lib/modeStore";

// Subscribe function for useSyncExternalStore
function onModeChange(callback: () => void) {
  return modeStore.onModeChange(() => callback());
}

// Snapshot function
function getSnapshot(): AppMode {
  return modeStore.getMode();
}

// Server snapshot (SSR)
function getServerSnapshot(): AppMode {
  return "global";
}

export function useMode() {
  const mode = useSyncExternalStore(onModeChange, getSnapshot, getServerSnapshot);

  const setMode = useCallback((newMode: AppMode) => {
    modeStore.setMode(newMode);
  }, []);

  const toggleMode = useCallback(() => {
    const current = modeStore.getMode();
    modeStore.setMode(current === "global" ? "iran" : "global");
  }, []);

  return {
    mode,
    isIran: mode === "iran",
    isGlobal: mode === "global",
    setMode,
    toggleMode,
  };
}
