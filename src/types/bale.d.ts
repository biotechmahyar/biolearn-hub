/**
 * Type declarations for the official Bale Mini App SDK.
 *
 * Reference: https://docs.bale.ai/miniapp
 * SDK script: https://tapi.bale.ai/miniapp.js?3
 *
 * Only the properties/methods actually used by the platform adapter are declared.
 */

interface BaleWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  allows_write_to_pm?: boolean;
}

interface BaleWebAppInitData {
  query_id?: string;
  user?: BaleWebAppUser;
  auth_date?: string;
  hash?: string;
}

interface BaleThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
}

interface BaleBackButton {
  show(): void;
  hide(): void;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
}

interface BaleSettingsButton {
  show(): void;
  hide(): void;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
}

interface BaleWebApp {
  /** SDK version string. */
  readonly version: string;
  /** Current initData string for server-side HMAC validation. */
  readonly initData: string;
  /** Parsed initData (unvalidated — do NOT trust for auth). */
  readonly initDataUnsafe: BaleWebAppInitData;
  /** Current color scheme: "light" | "dark". */
  readonly colorScheme: "light" | "dark";
  /** Platform theme parameters. */
  readonly themeParams: BaleThemeParams;
  /** True when opened from a web browser iframe. */
  readonly isIframe: boolean;
  /** Whether the Mini App platform is supported on this device. */
  readonly isMiniAppSupported: boolean;

  /** Signal that the Mini App is ready to be displayed. */
  ready(): void;
  /** Expand the Mini App to full height. */
  expand(): void;
  /** Close / dismiss the Mini App. */
  close(): void;
  /** Open a URL in the external browser. */
  openLink(url: string): void;
  /** Send data back to the bot (string payload). */
  sendData(data: string): void;

  /** Back button controller. */
  readonly BackButton: BaleBackButton;
  /** Settings button controller. */
  readonly SettingsButton: BaleSettingsButton;
}

interface BaleNamespace {
  WebApp: BaleWebApp;
}

declare global {
  interface Window {
    Bale?: BaleNamespace;
  }
}

export {};
