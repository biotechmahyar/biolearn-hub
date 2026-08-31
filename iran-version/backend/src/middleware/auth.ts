import { Context, Next } from "hono";
import { getUserFromToken } from "../lib/auth.js";
import { unauthorized, forbidden } from "../lib/response.js";
import type { users } from "../db/schema.js";

type UserRow = typeof users.$inferSelect;

declare module "hono" {
  interface ContextVariableMap {
    user: UserRow;
  }
}

/**
 * Require a valid JWT Bearer token. Sets `c.var.user`.
 */
export function requireAuth() {
  return async (c: Context, next: Next) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) return unauthorized(c);
    const token = header.slice(7);
    const user = await getUserFromToken(token);
    if (!user) return unauthorized(c, "توکن نامعتبر یا منقضی شده است.");
    c.set("user", user);
    await next();
  };
}

/**
 * Require one of the given roles on `user.role` or `user.secondaryRole`.
 */
export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    if (!user) return unauthorized(c);
    const hasRole =
      (user.role && roles.includes(user.role)) ||
      (user.secondaryRole && roles.includes(user.secondaryRole));
    if (!hasRole) return forbidden(c, "شما اجازه دسترسی به این بخش را ندارید.");
    await next();
  };
}

/**
 * Require admin role (admin, site_admin).
 */
export function requireAdmin() {
  return requireRole("admin", "site_admin");
}

/**
 * Require content staff role (admin, site_admin, content_manager, instructor).
 */
export function requireContentStaff() {
  return requireRole("admin", "site_admin", "content_manager", "instructor");
}

/**
 * Optional auth — sets `c.var.user` if valid token present, but doesn't block.
 */
export function optionalAuth() {
  return async (c: Context, next: Next) => {
    const header = c.req.header("Authorization");
    if (header?.startsWith("Bearer ")) {
      const token = header.slice(7);
      const user = await getUserFromToken(token);
      if (user) c.set("user", user);
    }
    await next();
  };
}
