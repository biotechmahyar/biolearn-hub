export type Role =
  | "user"
  | "member"
  | "instructor"
  | "mentor"
  | "content_manager"
  | "support"
  | "site_admin"
  | "admin";

export const ROLES: readonly Role[] = [
  "user",
  "member",
  "instructor",
  "mentor",
  "content_manager",
  "support",
  "site_admin",
  "admin",
] as const;

export function isValidRole(role: string): role is Role {
  return (ROLES as readonly string[]).includes(role);
}

export interface JwtPayload {
  sub: string;
  email?: string;
  role?: Role;
  type?: string;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

export function errorResponse(error: string, code?: string): ApiResponse {
  return { ok: false, error, code };
}

// Role helpers
export function isAdmin(role?: string | null): boolean {
  return role === "admin";
}

export function isSiteAdmin(role?: string | null): boolean {
  return role === "site_admin";
}

export function isAnyAdmin(role?: string | null): boolean {
  return role === "admin" || role === "site_admin";
}

export function isContentStaff(role?: string | null): boolean {
  return role === "content_manager" || role === "admin" || role === "site_admin";
}

export function isInstructor(role?: string | null): boolean {
  return role === "instructor";
}

export function isMentor(role?: string | null): boolean {
  return role === "mentor";
}

export function isSupport(role?: string | null): boolean {
  return role === "support";
}

export function canEditDictionary(role?: string | null): boolean {
  return role === "instructor" || role === "content_manager" || role === "site_admin" || role === "admin";
}
