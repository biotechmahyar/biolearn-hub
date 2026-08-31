/**
 * JWT Authentication Provider
 *
 * Replaces ConvexAuthProvider with a local JWT-based auth system.
 * Provides login, register, logout, session restoration, and
 * authenticated user data to the entire React tree.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  apiClient,
  setTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
} from "./api-client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  secondaryRole: string | null;
  image: string | null;
  university: string | null;
  major: string | null;
  createdAt: string;
}

interface AuthContextValue {
  /** True while initial session check is in progress */
  isLoading: boolean;
  /** True if user is authenticated */
  isAuthenticated: boolean;
  /** Current user data (null if not authenticated) */
  user: User | null;
  /** Sign in with email/password. Throws on error. */
  signIn: (email: string, password: string) => Promise<void>;
  /** Register with name/email/password. Throws on error. */
  signUp: (name: string, email: string, password: string) => Promise<void>;
  /** Sign out and clear tokens */
  signOut: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const isAuthenticated = !!user;

  // Restore session on mount
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const token = getAccessToken();
      if (!token) {
        // No token — try refresh if we have a refresh token
        const refresh = getRefreshToken();
        if (!refresh) {
          if (!cancelled) setIsLoading(false);
          return;
        }
        // Try refresh
        try {
          const res = await fetch("/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: refresh }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.ok) {
              setTokens(data.data.accessToken, data.data.refreshToken);
              // Fetch user with new token
              const me = await apiClient.get<User>("/api/auth/me", { skipRefresh: true });
              if (!cancelled) setUser(me);
            } else {
              clearTokens();
            }
          } else {
            clearTokens();
          }
        } catch {
          clearTokens();
        }
        if (!cancelled) setIsLoading(false);
        return;
      }

      // We have an access token — fetch user
      try {
        const me = await apiClient.get<User>("/api/auth/me", { skipRefresh: false });
        if (!cancelled) setUser(me);
      } catch {
        // Token invalid — try refresh
        const refresh = getRefreshToken();
        if (refresh) {
          try {
            const res = await fetch("/api/auth/refresh", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken: refresh }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.ok) {
                setTokens(data.data.accessToken, data.data.refreshToken);
                const me = await apiClient.get<User>("/api/auth/me", { skipRefresh: true });
                if (!cancelled) setUser(me);
              } else {
                clearTokens();
              }
            } else {
              clearTokens();
            }
          } catch {
            clearTokens();
          }
        } else {
          clearTokens();
        }
      }
      if (!cancelled) setIsLoading(false);
    }

    restoreSession();
    return () => { cancelled = true; };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await apiClient.post<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>("/api/auth/login", { email, password });
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const data = await apiClient.post<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>("/api/auth/register", { name, email, password });
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const signOut = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isLoading, isAuthenticated, user, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
