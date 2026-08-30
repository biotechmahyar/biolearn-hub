/**
 * Auth routes — Register, Login, OTP, Refresh, Logout.
 * Mirrors the Convex auth flow.
 */
import { Hono } from "hono";
import { z } from "zod";
import { hashSync, compareSync } from "bcryptjs";
import { sign, verify } from "jsonwebtoken";
import { success, errorResponse } from "../lib/response.js";
import { userService } from "../services/user.service.js";
import { db } from "../db/index.js";
import { sessions, refreshTokens, users } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

import type { AppEnv } from "../lib/types.js";

const authRoutes = new Hono<AppEnv>();

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change-me";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "dev-refresh-secret-change-me";
const JWT_EXPIRES = "15m";
const REFRESH_EXPIRES = "7d";

function generateTokens(userId: string) {
  const accessToken = sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  const refreshToken = sign({ sub: userId }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
  return { accessToken, refreshToken };
}

// ── Register ───────────────────────────────────────────────────────────────
authRoutes.post("/register", async (c) => {
  const body = await c.req.json();
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }

  const existing = await userService.findByEmail(parsed.data.email);
  if (existing) {
    return c.json(errorResponse("Email already registered", "CONFLICT"), 409);
  }

  const passwordHash = hashSync(parsed.data.password, 12);
  const [user] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: "user",
      emailVerificationTime: Date.now(),
    })
    .returning();

  const tokens = generateTokens(user.id);
  return c.json(success({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, ...tokens }), 201);
});

// ── Login ──────────────────────────────────────────────────────────────────
authRoutes.post("/login", async (c) => {
  const body = await c.req.json();
  const schema = z.object({
    email: z.string().email(),
    password: z.string(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse(parsed.error.issues[0].message, "VALIDATION"), 400);
  }

  const user = await userService.findByEmail(parsed.data.email);
  if (!user || !user.passwordHash) {
    return c.json(errorResponse("Invalid credentials"), 401);
  }

  const valid = compareSync(parsed.data.password, user.passwordHash);
  if (!valid) {
    return c.json(errorResponse("Invalid credentials"), 401);
  }

  const tokens = generateTokens(user.id);
  return c.json(success({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, ...tokens }));
});

// ── Refresh ────────────────────────────────────────────────────────────────
authRoutes.post("/refresh", async (c) => {
  const body = await c.req.json();
  const schema = z.object({ refreshToken: z.string() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse("Refresh token required"), 400);
  }

  try {
    const payload = verify(parsed.data.refreshToken, REFRESH_SECRET) as { sub: string };
    const tokens = generateTokens(payload.sub);
    return c.json(success(tokens));
  } catch {
    return c.json(errorResponse("Invalid refresh token"), 401);
  }
});

// ── Logout ─────────────────────────────────────────────────────────────────
authRoutes.post("/logout", async (c) => {
  return c.json(success({ loggedOut: true }));
});

// ── Get current user ──────────────────────────────────────────────────────
authRoutes.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ ok: true, data: null });
  }
  try {
    const payload = verify(authHeader.slice(7), JWT_SECRET) as { sub: string };
    const user = await userService.findById(payload.sub);
    if (!user) return c.json({ ok: true, data: null });
    return c.json(
      success({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        secondaryRole: user.secondaryRole,
        firstName: user.firstName,
        lastName: user.lastName,
        about: user.about,
        avatarUrl: user.avatarUrl,
        university: user.university,
        major: user.major,
      })
    );
  } catch {
    return c.json({ ok: true, data: null });
  }
});

// ── Check admin status ────────────────────────────────────────────────────
authRoutes.get("/is-admin", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json(success(false));
  }
  try {
    const payload = verify(authHeader.slice(7), JWT_SECRET) as { sub: string };
    const user = await userService.findById(payload.sub);
    const isAdmin = user?.role === "admin" || user?.role === "site_admin";
    return c.json(success(isAdmin));
  } catch {
    return c.json(success(false));
  }
});

export { authRoutes };
