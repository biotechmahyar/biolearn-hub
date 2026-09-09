/**
 * Mini App Platform Adapter
 *
 * Provides a thin abstraction over the browser-level platform APIs
 * for Mini App environments. This allows the Mini App UI to remain
 * platform-agnostic without redesigning anything.
 *
 * Supported platforms:
 *   - "telegram" — window.Telegram.WebApp
 *   - "bale"     — window.Bale.WebApp
 *   - "browser"  — plain browser fallback (no platform injection)
 *
 * Platform detection is deferred until first access of `platform`
 * to ensure SDKs loaded via <script> tags in index.html are available.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type PlatformName = "telegram" | "bale" | "browser";

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

// ── SDK Access Helpers ─────────────────────────────────────────────────────

/**
 * Safely access the Telegram WebApp object.
 * Returns null if not available (normal browser or SSR).
 */
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

/**
 * Safely access the Bale WebApp object.
 * Returns null if the Bale SDK is not loaded (normal browser or SSR).
 */
function getBaleWebApp(): Record<string, unknown> | null {
  try {
    const bale = (window as unknown as Record<string, unknown>)?.Bale;
    if (bale && typeof bale === "object") {
      const webApp = (bale as Record<string, unknown>)?.WebApp;
      if (webApp && typeof webApp === "object") {
        return webApp as Record<string, unknown>;
      }
    }
  } catch {
    // SSR or restricted context
  }
  return null;
}

// ── Telegram Adapter ───────────────────────────────────────────────────────

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

// ── Bale Adapter ───────────────────────────────────────────────────────────

const balePlatform: MiniAppPlatform = {
  name: "bale",

  isAvailable() {
    return getBaleWebApp() !== null;
  },

  getInitData() {
    const webApp = getBaleWebApp();
    const initData = webApp?.initData;
    return typeof initData === "string" && initData.length > 0 ? initData : null;
  },

  getUser() {
    const webApp = getBaleWebApp();
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
    const webApp = getBaleWebApp();
    if (typeof webApp?.close === "function") {
      webApp.close();
    }
  },

  openLink(url: string) {
    const webApp = getBaleWebApp();
    if (typeof webApp?.openLink === "function") {
      webApp.openLink(url);
    } else {
      window.open(url, "_blank");
    }
  },

  async showAlert(message: string) {
    // Bale SDK does not document showAlert — use browser fallback
    window.alert(message);
  },

  async showConfirm(message: string) {
    // Bale SDK does not document showConfirm — use browser fallback
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
 * Detection is deferred: called on first access of `platform`, not at
 * module-import time. This ensures SDKs loaded via <script> tags in
 * index.html have been evaluated before we check for them.
 *
 * Priority: Telegram > Bale > Browser fallback.
 *
 * Telegram and Bale use mutually exclusive global objects
 * (window.Telegram vs window.Bale), so they never conflict.
 */
function detectPlatform(): MiniAppPlatform {
  if (telegramPlatform.isAvailable()) {
    return telegramPlatform;
  }
  if (balePlatform.isAvailable()) {
    return balePlatform;
  }
  return browserPlatform;
}

/**
 * Singleton platform instance.
 *
 * Lazily resolved on first access to ensure SDKs loaded via <script> tags
 * in index.html are available when detection runs. Once resolved, the
 * same instance is returned for the lifetime of the page.
 */
let _platform: MiniAppPlatform | null = null;

export function getPlatform(): MiniAppPlatform {
  if (!_platform) {
    _platform = detectPlatform();
  }
  return _platform;
}

/**
 * Backward-compatible property export.
 * Code using `import { platform } from ...` continues to work unchanged
 * because Vite/Bundlers resolve property access to the getter.
 */
export const platform: MiniAppPlatform = /* @__PURE__ */ (() => getPlatform())();
