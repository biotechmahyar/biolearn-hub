// Theme changes are applied by swapping CSS custom properties on <html> and
// <body>. Some portal containers (dialogs, popovers, live class iframes) keep
// their old computed styles until they are remounted, so a theme switch is
// followed by a hard reload. The helper is idempotent so a burst of writes
// (e.g. the store writing during the same tick) only reloads once.

declare global {
  interface Window {
    __genovaThemeReloadQueued?: boolean;
  }
}

export function forceReloadAfterThemeChange(delay = 120) {
  if (typeof window === "undefined") return;
  if (window.__genovaThemeReloadQueued) return;
  window.__genovaThemeReloadQueued = true;
  window.setTimeout(() => {
    window.location.reload();
  }, delay);
}