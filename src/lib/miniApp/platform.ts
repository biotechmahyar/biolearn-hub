/**
 * Mini App Platform Adapter
 *
 * Provides a thin abstraction over the browser-level platform APIs
 * (currently Telegram WebApp). This allows the Mini App UI to remain
 * platform-agnostic without redesigning anything.
 *
 * Currently supports:
 *   - "telegram" — window.Telegram.WebApp
 *   - "browser"  — plain browser fallback (no platform injection)
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type PlatformName = "telegram" | "browser";

export interface MiniAppPlatform {
  /** Which platform was detected at page load. */
  name: PlatformName;

  /** Whether a platform WebApp SDK is available in the current window. */
  isAvailable(): boolean;

  /** Return initData if running inside a supported Mini App, else null. */
  getInitData(): string | null;

  /** Return the platform-injected user object, or null. */
  getUser(): Record<string, unknown> | null;

  /** Close / dismiss the Mini App (no-op on plain browser). */
  close(): void;

  /** Open a URL externally. Falls back to window.open. */
  openLink(url: string): void;

  /** Show a platform-native alert. Falls back to window.alert. */
  showAlert(message: string): Promise<void>;

  /** Show a platform-native confirm dialog. Falls back to window.confirm. */
  showConfirm(message: string): Promise<boolean>;
}

// ── Telegram Adapter ───────────────────────────────────────────────────────

function getTelegramWebApp(): Record<string, unknown> | null {
  try {
    const tg = (window as unknown as Record<string, unknown>)?.Telegram;
    if (tg && typeof tg === "object") {
      const webApp = (tg as Record<string, unknown>)?.WebApp;
      if (webApp && typeof webApp === "object") {
        return webApp as Record<string, unknown>;
      }
    }
  } catch {
    // SSR or restricted context
  }
  return null;
}

const telegramPlatform: MiniAppPlatform = {
  name: "telegram",

  isAvailable() {
    return getTelegramWebApp() !== null;
  },

  getInitData() {
    const webApp = getTelegramWebApp();
    const initData = webApp?.initData;
    return typeof initData === "string" && initData.length > 0 ? initData : null;
  },

  getUser() {
    const webApp = getTelegramWebApp();
    const initDataUnsafe = webApp?.initDataUnsafe;
    if (initDataUnsafe && typeof initDataUnsafe === "object") {
      const user = (initDataUnsafe as Record<string, unknown>)?.user;
      return user && typeof user === "object"
        ? (user as Record<string, unknown>)
        : null;
    }
    return null;
  },

  close() {
    const webApp = getTelegramWebApp();
    if (typeof webApp?.close === "function") {
      webApp.close();
    }
  },

  openLink(url: string) {
    window.open(url, "_blank");
  },

  async showAlert(message: string) {
    const webApp = getTelegramWebApp();
    if (typeof webApp?.showAlert === "function") {
      await new Promise<void>((resolve) => {
        (webApp as Record<string, Function>).showAlert(message, () => resolve());
      });
    } else {
      window.alert(message);
    }
  },

  async showConfirm(message: string) {
    const webApp = getTelegramWebApp();
    if (typeof webApp?.showConfirm === "function") {
      return new Promise<boolean>((resolve) => {
        (webApp as Record<string, Function>).showConfirm(message, (ok: boolean) => resolve(ok));
      });
    }
    return window.confirm(message);
  },
};

// ── Browser Fallback ───────────────────────────────────────────────────────

const browserPlatform: MiniAppPlatform = {
  name: "browser",

  isAvailable() {
    return false;
  },

  getInitData() {
    return null;
  },

  getUser() {
    return null;
  },

  close() {
    // no-op
  },

  openLink(url: string) {
    window.open(url, "_blank");
  },

  async showAlert(message: string) {
    window.alert(message);
  },

  async showConfirm(message: string) {
    return window.confirm(message);
  },
};

// ── Platform Detection ─────────────────────────────────────────────────────

/**
 * Detect which platform is active.
 *
 * Detection is simple: if window.Telegram.WebApp exists → Telegram,
 * otherwise → plain browser.
 *
 * Future: extend with Bale detection when Bale adapter is added.
 */
function detectPlatform(): MiniAppPlatform {
  if (telegramPlatform.isAvailable()) {
    return telegramPlatform;
  }
  return browserPlatform;
}

/** Singleton platform instance, resolved once at import time. */
export const platform: MiniAppPlatform = detectPlatform();
