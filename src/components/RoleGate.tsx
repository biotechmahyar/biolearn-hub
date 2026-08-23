import { useAuth } from "@/hooks/use-auth";
import { Dna } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

// Which panel a role lands on after sign-in.
export const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  instructor: "/panel/instructor",
  mentor: "/panel/mentor",
  content_manager: "/panel/content",
  support: "/panel/support",
};

export const ROLE_LABEL: Record<string, string> = {
  admin: "مدیریت",
  instructor: "استودیوی استاد",
  mentor: "میز منتور",
  content_manager: "استودیوی محتوا",
  support: "میز پشتیبانی",
};

export function panelForRole(role?: string | null): string {
  if (!role) return "/dashboard";
  return ROLE_HOME[role] ?? "/dashboard";
}

type RoleGateProps = {
  allowed: string[];
  children: ReactNode;
  title: string;
};

export function RoleGate({ allowed, children, title }: RoleGateProps) {
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
        <p className="font-mono text-xs text-muted-foreground">loading {title}…</p>
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  const role = user.role ?? "user";
  if (!allowed.includes(role)) {
    // Redirect staff members to their own panel instead of the student dashboard.
    return <Navigate to={panelForRole(role)} replace />;
  }

  return <>{children}</>;
}
