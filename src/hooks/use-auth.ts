/**
 * useAuth hook — provides authentication state and actions.
 *
 * Now backed by the JWT auth provider instead of Convex Auth.
 * Compatible with existing components that use useAuth().
 */

import { useAuthContext } from "@/lib/auth-provider";

export function useAuth() {
  const { isLoading, isAuthenticated, user, signIn, signOut } = useAuthContext();
  return { isLoading, isAuthenticated, user, signIn, signOut };
}
