/**
 * Returns true when the logged-in user is an admin / site_admin
 * viewing another role's panel in read-only mode.
 */
import { useAuth } from "@/hooks/use-auth";

const ADMIN_ROLES = new Set(["admin", "site_admin"]);

export function useViewOnly(): boolean {
  const { user } = useAuth();
  return ADMIN_ROLES.has(user?.role as string);
}
