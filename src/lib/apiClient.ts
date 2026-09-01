// Central API Client for NIBRC Dual Architecture
// Routes requests to either Convex (global) or Hono/PostgreSQL (iran) based on mode

import { modeStore, type AppMode } from "./modeStore";

// ── API Source Configuration ──────────────────────────────────────────────

const IRAN_SERVER_URL =
  import.meta.env.VITE_IRAN_SERVER_URL || "http://localhost:3000";

const SOURCES: Record<AppMode, string> = {
  global: "", // Convex handles this natively via useQuery/useMutation
  iran: IRAN_SERVER_URL,
};

// ── Token Management ─────────────────────────────────────────────────────

const TOKEN_KEY = "nibrc-access-token";
const REFRESH_KEY = "nibrc-refresh-token";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setTokens(tokens: TokenPair): void {
  try {
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  } catch {
    // ignore
  }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore
  }
}

// ── API Response Types ───────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: number;
}

interface RequestOptions extends Omit<RequestInit, "method" | "body"> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  skipAuth?: boolean;
}

// ── Token Refresh Logic ──────────────────────────────────────────────────

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${IRAN_SERVER_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.ok && data.data) {
      setTokens({
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ── Core API Client ──────────────────────────────────────────────────────

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = "GET", body, skipAuth = false, headers: extraHeaders, ...rest } = options;

  const mode = modeStore.getMode();
  const baseUrl = SOURCES[mode];

  // If in global mode and no Iran server URL, fall back gracefully
  if (!baseUrl) {
    return {
      ok: false,
      error:
        "In global mode, use Convex hooks (useQuery/useMutation) instead of apiClient",
      code: 400,
    };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extraHeaders as Record<string, string>),
  };

  // Add auth token
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
      ...rest,
    });

    // Handle 401 — try refresh
    if (response.status === 401 && !skipAuth && !path.includes("/auth/")) {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = tryRefreshToken();
      }

      const refreshed = await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;

      if (refreshed) {
        // Retry with new token
        const newToken = getAccessToken();
        if (newToken) {
          headers["Authorization"] = `Bearer ${newToken}`;
          const retryResponse = await fetch(`${baseUrl}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(30000),
            ...rest,
          });

          if (!retryResponse.ok) {
            const errData = await retryResponse.json().catch(() => ({}));
            return {
              ok: false,
              error: errData.error || `HTTP ${retryResponse.status}`,
              code: retryResponse.status,
            };
          }

          return retryResponse.json() as Promise<ApiResponse<T>>;
        }
      }

      // Refresh failed — clear tokens
      clearTokens();
      return {
        ok: false,
        error: "Session expired. Please login again.",
        code: 401,
      };
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        ok: false,
        error: errData.error || `HTTP ${response.status}`,
        code: response.status,
      };
    }

    return response.json() as Promise<ApiResponse<T>>;
  } catch (error) {
    // Network error — Iran server might be down
    return {
      ok: false,
      error:
        mode === "iran"
          ? "سرور داخلی در دسترس نیست"
          : "Network error",
      code: 0,
    };
  }
}

// ── Convenience Methods ──────────────────────────────────────────────────

export const api = {
  get<T = unknown>(path: string, opts?: RequestOptions) {
    return apiRequest<T>(path, { ...opts, method: "GET" });
  },
  post<T = unknown>(path: string, body?: unknown, opts?: RequestOptions) {
    return apiRequest<T>(path, { ...opts, method: "POST", body });
  },
  put<T = unknown>(path: string, body?: unknown, opts?: RequestOptions) {
    return apiRequest<T>(path, { ...opts, method: "PUT", body });
  },
  patch<T = unknown>(path: string, body?: unknown, opts?: RequestOptions) {
    return apiRequest<T>(path, { ...opts, method: "PATCH", body });
  },
  delete<T = unknown>(path: string, opts?: RequestOptions) {
    return apiRequest<T>(path, { ...opts, method: "DELETE" });
  },
};

// ── Auth API (for Iran mode) ─────────────────────────────────────────────

export const authApi = {
  async register(email: string, password: string, name: string) {
    const res = await api.post<{
      user: { id: string; email: string; name: string; role: string };
      accessToken: string;
      refreshToken: string;
    }>("/api/auth/register", { email, password, name }, { skipAuth: true });

    if (res.ok && res.data) {
      setTokens({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
      });
    }
    return res;
  },

  async login(email: string, password: string) {
    const res = await api.post<{
      user: {
        id: string;
        email: string;
        name: string;
        role: string;
        avatarUrl?: string;
      };
      accessToken: string;
      refreshToken: string;
    }>("/api/auth/login", { email, password }, { skipAuth: true });

    if (res.ok && res.data) {
      setTokens({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
      });
    }
    return res;
  },

  async logout() {
    await api.post("/api/auth/logout");
    clearTokens();
  },

  async me() {
    return api.get<{
      id: string;
      email: string;
      name: string;
      role: string;
      secondaryRole?: string;
      avatarUrl?: string;
      firstName?: string;
      lastName?: string;
      about?: string;
      phone?: string;
    }>("/api/auth/me");
  },
};
