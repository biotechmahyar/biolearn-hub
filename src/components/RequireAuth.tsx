import { useAuth } from "@/hooks/use-auth";
import { Dna } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
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
        <p className="font-mono text-xs text-muted-foreground">loading workspace…</p>
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

  return children;
}
