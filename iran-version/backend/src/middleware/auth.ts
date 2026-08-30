import { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { errorResponse, type JwtPayload, type Role } from "../types/index.js";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-to-a-random-secret";

export function signAccessToken(userId: string, email?: string, role?: string): string {
  const payload: Record<string, unknown> = { sub: userId, email, role };
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN || "15m") as string,
  });
}

export function signRefreshToken(userId: string): string {
  const payload: Record<string, unknown> = { sub: userId, type: "refresh" };
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN || "7d") as string,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  secondaryRole?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  about?: string | null;
  university?: string | null;
  major?: string | null;
}

// Middleware: requires valid JWT, attaches user to context
export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(errorResponse("وارد نشده‌اید.", "UNAUTHORIZED"), 401);
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    if (payload.type === "refresh") {
      return c.json(errorResponse("توکن دسترسی معتبر نیست.", "INVALID_TOKEN"), 401);
    }
    const userId = payload.sub;
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (rows.length === 0) {
      return c.json(errorResponse("کاربر یافت نشد.", "USER_NOT_FOUND"), 401);
    }
    const user = rows[0];
    c.set("user", user as AuthUser);
    c.set("userId", userId);
    await next();
  } catch {
    return c.json(errorResponse("توکن نامعتبر یا منقضی شده است.", "INVALID_TOKEN"), 401);
  }
}

// Middleware: optional auth — attaches user if token present, otherwise continues
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = verifyToken(token);
      if (payload.type !== "refresh") {
        const rows = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
        if (rows.length > 0) {
          c.set("user", rows[0] as AuthUser);
          c.set("userId", payload.sub);
        }
      }
    } catch {
      // Token invalid — continue without auth
    }
  }
  await next();
}

// Helper: get current user from context (set by requireAuth or optionalAuth)
export function getCurrentUser(c: Context): AuthUser | null {
  return c.get("user") || null;
}

export function getCurrentUserId(c: Context): string | null {
  return c.get("userId") || null;
}
