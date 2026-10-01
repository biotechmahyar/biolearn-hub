// Desk theme store
// Shared by the role workspaces (Content Studio, Mentor desk, …). Each desk is a
// focused tool with its own canvas, so the palette is scoped instead of global:
// tokens are placed on <body> (portalled dialogs/menus render there) and the
// root `dark` class is kept in sync so `dark:` utilities inside the desk match
// the desk theme rather than the public-site setting.
//
// The choice is persisted per desk key, so the mentor desk and the content
// studio can each keep their own light/dark preference. Mirrors
// lib/adminThemeStore.

import { useCallback, useSyncExternalStore } from "react";
import { forceReloadAfterThemeChange } from "@/lib/forceReload";

export type DeskTheme = "light" | "dark";

const listenersByKey = new Map<string, Set<(theme: DeskTheme) => void>>();

const storageKey = (key: string) => `genova-desk-theme:${key}`;

function read(key: string): DeskTheme {
  try {
    return localStorage.getItem(storageKey(key)) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function subscribe(key: string, callback: () => void) {
  let set = listenersByKey.get(key);
  if (!set) {
    set = new Set();
    listenersByKey.set(key, set);
  }
  set.add(callback);
  return () => {
    set.delete(callback);
  };
}

function write(key: string, theme: DeskTheme) {
  try {
    localStorage.setItem(storageKey(key), theme);
  } catch {
    // private browsing / storage disabled — the choice still applies this session
  }
  applyDeskTheme(theme, key);
  listenersByKey.get(key)?.forEach((listener) => {
    try {
      listener(theme);
    } catch {
      // ignore listener errors
    }
  });
  // Every desk theme switch ends in a hard reload so portal layers (dialogs,
  // popovers, the live-class iframes) pick the new palette up as well.
  forceReloadAfterThemeChange();
}

/**
 * Applies the desk theme and returns a cleanup that restores the public site's
 * own appearance.
 */
export function applyDeskTheme(theme: DeskTheme, key = "default"): () => void {
  if (typeof document === "undefined") return () => {};
  const root = document.documentElement;
  const hadDark = root.classList.contains("dark");
  root.classList.toggle("dark", theme === "dark");
  document.body.classList.add("desk-scope");
  document.body.classList.toggle("desk-dark", theme === "dark");
  return () => {
    document.body.classList.remove("desk-scope", "desk-dark");
    root.classList.toggle("dark", hadDark);
    void key;
  };
}

export function useDeskTheme(key = "default") {
  const theme = useSyncExternalStore(
    (cb) => subscribe(key, cb),
    () => read(key),
    () => "light" as DeskTheme,
  );

  const setTheme = useCallback(
    (next: DeskTheme) => write(key, next),
    [key],
  );

  const toggleTheme = useCallback(() => {
    write(key, read(key) === "dark" ? "light" : "dark");
  }, [key]);

  return { theme, setTheme, toggleTheme };
}