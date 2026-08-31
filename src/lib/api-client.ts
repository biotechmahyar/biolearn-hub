/**
 * Central API client for the Iranian REST backend.
 *
 * Features:
 * - GET, POST, PUT, PATCH, DELETE
 * - Automatic JWT access/refresh token handling
 * - Automatic retry after token refresh
 * - Standardized error handling
 * - Request cancellation via AbortController
 * - No ad-hoc fetch() calls across the codebase
 */

const API_BASE = import.meta.env.VITE_API_URL || "";

// ─── Token Storage (in-memory + sessionStorage) ─────────────────────────────

let _accessToken: string | null = null;
let _refreshToken: string | null = null;

// On load, restore tokens from sessionStorage (if available)
if (typeof window !== "undefined") {
  try {
    _accessToken = sessionStorage.getItem("nibrc_access_token");
    _refreshToken = sessionStorage.getItem("nibrc_refresh_token");
  } catch {
    // sessionStorage may be unavailable
  }
}

export function setTokens(access: string | null, refresh: string | null) {
  _accessToken = access;
  _refreshToken = refresh;
  try {
    if (access) sessionStorage.setItem("nibrc_access_token", access);
    else sessionStorage.removeItem("nibrc_access_token");
    if (refresh) sessionStorage.setItem("nibrc_refresh_token", refresh);
    else sessionStorage.removeItem("nibrc_refresh_token");
  } catch {
    // sessionStorage may be unavailable
  }
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function getRefreshToken(): string | null {
  return _refreshToken;
}

export function clearTokens() {
  setTokens(null, null);
}

export function isAuthenticated(): boolean {
  return !!_accessToken;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; code?: string };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export interface ApiRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Skip auth header even if token exists */
  skipAuth?: boolean;
  /** Skip automatic refresh on 401 */
  skipRefresh?: boolean;
}

// ─── Refresh Logic ───────────────────────────────────────────────────────────

let _refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (!_refreshToken) return false;

  // Prevent concurrent refresh attempts
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: _refreshToken }),
      });

      if (!res.ok) {
        clearTokens();
        return false;
      }

      const data = (await res.json()) as ApiResponse<{
        accessToken: string;
        refreshToken: string;
      }>;

      if (data.ok) {
        setTokens(data.data.accessToken, data.data.refreshToken);
        return true;
      }

      clearTokens();
      return false;
    } catch {
      clearTokens();
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

// ─── Core Request Function ───────────────────────────────────────────────────

async function request<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    headers: customHeaders = {},
    signal,
    skipAuth = false,
    skipRefresh = false,
  } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  // Add auth header if token exists and not skipped
  if (!skipAuth && _accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    signal,
  };

  if (body !== undefined && method !== "GET") {
    fetchOptions.body = JSON.stringify(body);
  }

  let res = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

  // If 401 and we have a refresh token, try refresh and retry once
  if (res.status === 401 && !skipRefresh && _refreshToken) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry with new token
      headers["Authorization"] = `Bearer ${_accessToken}`;
      res = await fetch(`${API_BASE}${endpoint}`, { ...fetchOptions, headers });
    }
  }

  // Parse response
  const data = (await res.json()) as ApiResponse<T>;

  if (!data.ok) {
    const error = new Error(data.error || "API request failed");
    (error as any).code = data.code;
    (error as any).status = res.status;
    throw error;
  }

  return data.data;
}

// ─── Public API Methods ──────────────────────────────────────────────────────

export const apiClient = {
  get<T>(endpoint: string, options?: Omit<ApiRequestOptions, "method" | "body">) {
    return request<T>(endpoint, { ...options, method: "GET" });
  },

  post<T>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) {
    return request<T>(endpoint, { ...options, method: "POST", body });
  },

  put<T>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) {
    return request<T>(endpoint, { ...options, method: "PUT", body });
  },

  patch<T>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) {
    return request<T>(endpoint, { ...options, method: "PATCH", body });
  },

  delete<T>(endpoint: string, options?: Omit<ApiRequestOptions, "method" | "body">) {
    return request<T>(endpoint, { ...options, method: "DELETE" });
  },
};

export default apiClient;
