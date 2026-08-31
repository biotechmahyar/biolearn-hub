import { Context, Next } from "hono";
import { verifyToken, JwtPayload } from "../lib/jwt.js";
import { UnauthorizedError, ForbiddenError } from "../lib/errors.js";

export interface UserContext {
  userId: string;
  email: string;
  role: string;
}

// Extend Hono context to carry user info
declare module "hono" {
  interface ContextVariableMap {
    user: UserContext;
  }
}

/**
 * Authentication middleware — extracts and verifies JWT from Authorization header.
 * Sets c.set("user", ...) on success.
 */
export async function authenticate(c: Context, next: Next): Promise<void> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }
  const token = authHeader.slice(7);
  const payload: JwtPayload | null = verifyToken(token);
  if (!payload) {
    throw new UnauthorizedError("Invalid or expired token");
  }
  c.set("user", {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
  });
  await next();
}

/**
 * Optional authentication — sets user if valid token present, continues otherwise.
 */
export async function optionalAuth(c: Context, next: Next): Promise<void> {
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      c.set("user", {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      });
    }
  }
  await next();
}

/**
 * Require specific roles. Must be used after `authenticate`.
 */
export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next): Promise<void> => {
    const user = c.get("user");
    if (!user) throw new UnauthorizedError();
    if (!roles.includes(user.role)) {
      throw new ForbiddenError(
        `Requires one of: ${roles.join(", ")}`
      );
    }
    await next();
  };
}

/**
 * Require admin role (admin, site_admin, content_manager, super_admin).
 */
export const requireAdmin = requireRole(
  "admin",
  "site_admin",
  "content_manager",
  "super_admin"
);

/**
 * Require instructor role.
 */
export const requireInstructor = requireRole(
  "instructor",
  "admin",
  "site_admin"
);
