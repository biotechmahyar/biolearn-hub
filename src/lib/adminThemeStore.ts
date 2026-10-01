// Admin console theme store
// Persists the light/dark choice for the admin panel only — the public site
// keeps using the global settings provider. Mirrors lib/modeStore.

import { useSyncExternalStore, useCallback } from "react";
import { forceReloadAfterThemeChange } from "@/lib/forceReload";

export type AdminTheme = "light" | "dark";

const STORAGE_KEY = "genova-admin-theme";

const listeners: Set<(theme: AdminTheme) => void> = new Set();

function read(): AdminTheme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function write(theme: AdminTheme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // private browsing / storage disabled — the choice still applies this session
  }
  applyAdminTheme(theme);
  for (const listener of listeners) {
    try {
      listener(theme);
    } catch {
      // ignore listener errors
    }
  }
  // Hard reload so portal layers pick up the new palette immediately.
  forceReloadAfterThemeChange();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): AdminTheme {
  return read();
}

/**
 * Applies the admin theme and returns a cleanup that restores the public
 * site's own appearance.
 *
 * Two things have to happen: the `admin-scope` tokens go on <body> (portalled
 * overlays such as dialogs and dropdowns render there), and the root `dark`
 * class is kept in sync so every `dark:` utility variant inside the panel
 * matches the admin theme instead of the site-wide setting.
 */
export function applyAdminTheme(theme: AdminTheme): () => void {
  if (typeof document === "undefined") return () => {};
  const root = document.documentElement;
  const hadDark = root.classList.contains("dark");
  root.classList.toggle("dark", theme === "dark");
  document.body.classList.add("admin-scope");
  document.body.classList.toggle("admin-dark", theme === "dark");
  return () => {
    document.body.classList.remove("admin-scope", "admin-dark");
    root.classList.toggle("dark", hadDark);
  };
}

export function useAdminTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "light" as AdminTheme);

  const setTheme = useCallback((next: AdminTheme) => {
    write(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(read() === "dark" ? "light" : "dark");
  }, [setTheme]);

  return { theme, setTheme, toggleTheme };
}
