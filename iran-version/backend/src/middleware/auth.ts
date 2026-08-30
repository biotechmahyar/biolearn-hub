import { Context, Next } from "hono";
import { verifyAccessToken, JwtPayload } from "../modules/auth/jwt.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

// Extend Hono context to carry user
declare module "hono" {
  interface ContextVariableMap {
    user: JwtPayload & { dbUser: any };
  }
}

/**
 * Require authentication — attaches user to context.
 */
export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token);
  if (!payload) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const [dbUser] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
  if (!dbUser) {
    return c.json({ error: "User not found" }, 401);
  }

  c.set("user", { ...payload, dbUser });
  await next();
}

/**
 * Optional authentication — attaches user if token present, but doesn't block.
 */
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    if (payload) {
      const [dbUser] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
      if (dbUser) {
        c.set("user", { ...payload, dbUser });
      }
    }
  }
  await next();
}

/**
 * Require specific role(s).
 */
export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (!roles.includes(user.dbUser.role) && !roles.includes(user.dbUser.secondaryRole)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
}

/**
 * Require admin (admin or site_admin).
 */
export async function requireAdmin(c: Context, next: Next) {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (user.dbUser.role !== "admin" && user.dbUser.role !== "site_admin") {
    return c.json({ error: "Forbidden: admin access required" }, 403);
  }
  await next();
}

/**
 * Require system admin (admin only).
 */
export async function requireSystemAdmin(c: Context, next: Next) {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  if (user.dbUser.role !== "admin") {
    return c.json({ error: "Forbidden: system admin access required" }, 403);
  }
  await next();
}
