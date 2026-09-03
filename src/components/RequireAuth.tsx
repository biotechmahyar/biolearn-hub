import { useAuth } from "@/hooks/use-auth";
import { Dna } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { panelForRole } from "@/components/RoleGate";

/**
 * RequireAuth checks:
 * 1. Loading → show spinner
 * 2. Not authenticated → redirect to /auth?returnTo=...
 * 3. Authenticated but staff member on /dashboard → redirect to their own panel
 * 4. Otherwise → render children
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <span className="relative flex size-16 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-2xl border border-primary/25" />
          <span className="flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
            <Dna className="size-7 animate-pulse text-primary" />
          </span>
        </span>
        <p className="text-sm font-bold text-foreground">صبر کنید…</p>
        <p className="text-xs text-muted-foreground">در حال بررسی دسترسی</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  // Staff members should never land on /dashboard — redirect them to their own panel.
  const role = user?.role;
  if (role && role !== "user" && role !== "member") {
    const theirPanel = panelForRole(role);
    if (location.pathname === "/dashboard") {
      return <Navigate to={theirPanel} replace />;
    }
  }

  return children;
}
