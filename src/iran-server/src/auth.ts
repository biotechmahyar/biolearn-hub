// @ts-nocheck
import { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, generateId, now } from "./db.js";
import { users } from "./schema.js";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "nibrc-iran-dev-secret-change-in-production";
const JWT_EXPIRES = "7d";
const REFRESH_EXPIRES = "30d";

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

// Generate access token
export function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// Generate refresh token
export function signRefreshToken(payload: AuthPayload): string {
  return jwt.sign({ ...payload, type: "refresh" }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES });
}

// Verify token
export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload & { type?: string };
    if (decoded.type === "refresh") return null; // refresh tokens not valid for auth
    return { userId: decoded.userId, email: decoded.email, role: decoded.role };
  } catch {
    return null;
  }
}

// Verify refresh token
export function verifyRefreshToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload & { type?: string };
    if (decoded.type !== "refresh") return null;
    return { userId: decoded.userId, email: decoded.email, role: decoded.role };
  } catch {
    return null;
  }
}

// Auth middleware - extracts user from Authorization header
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ ok: false, error: "Unauthorized", code: 401 }, 401);
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return c.json({ ok: false, error: "Invalid or expired token", code: 401 }, 401);
  }

  // Attach user to context
  c.set("userId", payload.userId);
  c.set("userEmail", payload.email);
  c.set("userRole", payload.role);

  await next();
}

// Optional auth middleware - doesn't fail if no token
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      c.set("userId", payload.userId);
      c.set("userEmail", payload.email);
      c.set("userRole", payload.role);
    }
  }
  await next();
}

// Role check helpers
export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const role = c.get("userRole") as string;
    if (!roles.includes(role)) {
      return c.json({ ok: false, error: "Forbidden", code: 403 }, 403);
    }
    await next();
  };
}

// Auth routes
export function authRoutes() {
  return {
    // POST /api/auth/register
    register: async (c: Context) => {
      try {
        const body = await c.req.json();
        const { email, password, name } = body;

        if (!email || !password || !name) {
          return c.json({ ok: false, error: "ایمیل، رمز عبور و نام الزامی است" }, 400);
        }

        // Check existing
        const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existing.length > 0) {
          return c.json({ ok: false, error: "ایمیل قبلاً ثبت شده است" }, 409);
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const userId = generateId();
        await db.insert(users)// @ts-ignore.values({
          id: userId,
          email,
          name,
          passwordHash,
          role: "user",
          createdAt: now(),
          updatedAt: now(),
        });

        const authPayload: AuthPayload = { userId, email, role: "user" };
        const accessToken = signAccessToken(authPayload);
        const refreshToken = signRefreshToken(authPayload);

        return c.json({
          ok: true,
          data: {
            user: { id: userId, email, name, role: "user" },
            accessToken,
            refreshToken,
          },
        });
      } catch (error) {
        console.error("[AUTH] Register error:", error);
        return c.json({ ok: false, error: "خطا در ثبت نام" }, 500);
      }
    },

    // POST /api/auth/login
    login: async (c: Context) => {
      try {
        const body = await c.req.json();
        const { email, password } = body;

        if (!email || !password) {
          return c.json({ ok: false, error: "ایمیل و رمز عبور الزامی است" }, 400);
        }

        // Find user
        const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (result.length === 0) {
          return c.json({ ok: false, error: "کاربر یافت نشد" }, 401);
        }

        const user = result[0];
        if (!user.passwordHash) {
          return c.json({ ok: false, error: "حساب کاربری بدون رمز عبور" }, 401);
        }

        // Verify password
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return c.json({ ok: false, error: "رمز عبور اشتباه است" }, 401);
        }

        const authPayload: AuthPayload = {
          userId: user.id,
          email: user.email || "",
          role: user.role || "user",
        };
        const accessToken = signAccessToken(authPayload);
        const refreshToken = signRefreshToken(authPayload);

        return c.json({
          ok: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              avatarUrl: user.avatarUrl,
            },
            accessToken,
            refreshToken,
          },
        });
      } catch (error) {
        console.error("[AUTH] Login error:", error);
        return c.json({ ok: false, error: "خطا در ورود" }, 500);
      }
    },

    // POST /api/auth/refresh
    refresh: async (c: Context) => {
      try {
        const body = await c.req.json();
        const { refreshToken } = body;

        if (!refreshToken) {
          return c.json({ ok: false, error: "Refresh token الزامی است" }, 400);
        }

        const payload = verifyRefreshToken(refreshToken);
        if (!payload) {
          return c.json({ ok: false, error: "Refresh token نامعتبر است" }, 401);
        }

        // Fetch current user role (might have changed)
        const result = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
        const user = result[0];
        if (!user) {
          return c.json({ ok: false, error: "کاربر یافت نشد" }, 401);
        }

        const newPayload: AuthPayload = {
          userId: user.id,
          email: user.email || "",
          role: user.role || "user",
        };

        const newAccessToken = signAccessToken(newPayload);
        const newRefreshToken = signRefreshToken(newPayload);

        return c.json({
          ok: true,
          data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          },
        });
      } catch (error) {
        console.error("[AUTH] Refresh error:", error);
        return c.json({ ok: false, error: "خطا در بروزرسانی توکن" }, 500);
      }
    },

    // GET /api/auth/me
    me: async (c: Context) => {
      const userId = c.get("userId") as string;
      if (!userId) {
        return c.json({ ok: false, error: "Unauthorized" }, 401);
      }

      try {
        const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (result.length === 0) {
          return c.json({ ok: false, error: "کاربر یافت نشد" }, 404);
        }

        const user = result[0];
        return c.json({
          ok: true,
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            secondaryRole: user.secondaryRole,
            avatarUrl: user.avatarUrl,
            firstName: user.firstName,
            lastName: user.lastName,
            about: user.about,
            phone: user.phone,
          },
        });
      } catch (error) {
        console.error("[AUTH] Me error:", error);
        return c.json({ ok: false, error: "خطا در دریافت اطلاعات کاربر" }, 500);
      }
    },

    // POST /api/auth/logout
    logout: async (c: Context) => {
      // JWT is stateless — client simply discards tokens
      return c.json({ ok: true, data: { message: "با موفقیت خارج شدید" } });
    },

    // GET /api/auth/is-admin
    isAdmin: async (c: Context) => {
      const role = c.get("userRole") as string;
      return c.json({
        ok: true,
        data: { isAdmin: role === "admin" || role === "site_admin" },
      });
    },
  };
}
