import { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import { db } from "../db/index.js";
import { users, admins } from "../db/schema.js";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret";

export interface JwtPayload {
  userId: string;
  email?: string;
  role?: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "15m" });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || "dev-refresh-secret", {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || "dev-refresh-secret") as JwtPayload;
  } catch {
    return null;
  }
}

// Get user from Authorization header (optional - sets ctx.set("user"))
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      const user = await db.query.users.findFirst({ where: eq(users.id, payload.userId) });
      if (user) {
        c.set("user", { ...user, _id: user.id });
      }
    }
  }
  await next();
}

// Require authentication
export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ ok: false, error: "وارد نشده‌اید." }, 401);
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return c.json({ ok: false, error: "توکن نامعتبر است." }, 401);
  }
  const user = await db.query.users.findFirst({ where: eq(users.id, payload.userId) });
  if (!user) {
    return c.json({ ok: false, error: "کاربر یافت نشد." }, 401);
  }
  c.set("user", { ...user, _id: user.id });
  await next();
}

// Require any admin role
export async function requireAdmin(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ ok: false, error: "وارد نشده‌اید." }, 401);
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return c.json({ ok: false, error: "توکن نامعتبر است." }, 401);
  }
  const user = await db.query.users.findFirst({ where: eq(users.id, payload.userId) });
  if (!user) {
    return c.json({ ok: false, error: "کاربر یافت نشد." }, 401);
  }
  if (user.role !== "admin" && user.role !== "site_admin") {
    return c.json({ ok: false, error: "دسترسی ادمین لازم است." }, 403);
  }
  c.set("user", { ...user, _id: user.id });
  await next();
}

// Require content staff (content_manager, admin, site_admin)
export async function requireContentStaff(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ ok: false, error: "وارد نشده‌اید." }, 401);
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return c.json({ ok: false, error: "توکن نامعتبر است." }, 401);
  }
  const user = await db.query.users.findFirst({ where: eq(users.id, payload.userId) });
  if (!user) {
    return c.json({ ok: false, error: "کاربر یافت نشد." }, 401);
  }
  if (!["admin", "site_admin", "content_manager"].includes(user.role || "")) {
    return c.json({ ok: false, error: "دسترسی لازم است." }, 403);
  }
  c.set("user", { ...user, _id: user.id });
  await next();
}

// Require support staff (support, admin, site_admin)
export async function requireSupportStaff(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ ok: false, error: "وارد نشده‌اید." }, 401);
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return c.json({ ok: false, error: "توکن نامعتبر است." }, 401);
  }
  const user = await db.query.users.findFirst({ where: eq(users.id, payload.userId) });
  if (!user) {
    return c.json({ ok: false, error: "کاربر یافت نشد." }, 401);
  }
  if (!["admin", "site_admin", "support"].includes(user.role || "")) {
    return c.json({ ok: false, error: "دسترسی پشتیبانی لازم است." }, 403);
  }
  c.set("user", { ...user, _id: user.id });
  await next();
}

// Require instructor or admin
export async function requireInstructorOrAdmin(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ ok: false, error: "وارد نشده‌اید." }, 401);
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return c.json({ ok: false, error: "توکن نامعتبر است." }, 401);
  }
  const user = await db.query.users.findFirst({ where: eq(users.id, payload.userId) });
  if (!user) {
    return c.json({ ok: false, error: "کاربر یافت نشد." }, 401);
  }
  if (!["admin", "site_admin", "instructor"].includes(user.role || "")) {
    return c.json({ ok: false, error: "فقط مدرس یا ادمین می‌تواند این عملیات را انجام دهد." }, 403);
  }
  c.set("user", { ...user, _id: user.id });
  await next();
}

// Require system admin only (admin role, not site_admin)
export async function requireSystemAdmin(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ ok: false, error: "وارد نشده‌اید." }, 401);
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return c.json({ ok: false, error: "توکن نامعتبر است." }, 401);
  }
  const user = await db.query.users.findFirst({ where: eq(users.id, payload.userId) });
  if (!user) {
    return c.json({ ok: false, error: "کاربر یافت نشد." }, 401);
  }
  if (user.role !== "admin") {
    return c.json({ ok: false, error: "فقط ادمین سامانه می‌تواند این عملیات را انجام دهد." }, 403);
  }
  c.set("user", { ...user, _id: user.id });
  await next();
}

// Require mentor or admin
export async function requireMentorOrAdmin(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ ok: false, error: "وارد نشده‌اید." }, 401);
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return c.json({ ok: false, error: "توکن نامعتبر است." }, 401);
  }
  const user = await db.query.users.findFirst({ where: eq(users.id, payload.userId) });
  if (!user) {
    return c.json({ ok: false, error: "کاربر یافت نشد." }, 401);
  }
  if (!["admin", "site_admin", "mentor"].includes(user.role || "")) {
    return c.json({ ok: false, error: "فقط منتور یا ادمین می‌تواند این عملیات را انجام دهد." }, 403);
  }
  c.set("user", { ...user, _id: user.id });
  await next();
}

// Helper: check if user is admin
export async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return user?.role === "admin" || user?.role === "site_admin";
}

// Helper: check if user is content staff
export async function isContentStaff(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return ["admin", "site_admin", "content_manager"].includes(user?.role || "");
}

// Helper: check email in admins table
export async function isEmailAdmin(email: string): Promise<boolean> {
  const admin = await db.query.admins.findFirst({ where: eq(admins.email, email) });
  return !!admin;
}
