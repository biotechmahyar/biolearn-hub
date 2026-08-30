import { Hono } from "hono";
import bcrypt from "bcrypt";
import { z } from "zod";
import { db } from "../db/index.js";
import { users, admins as adminsTable, sessions, refreshTokens } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth, getCurrentUser, signAccessToken, signRefreshToken, verifyToken } from "../middleware/auth.js";
import { successResponse, errorResponse } from "../types/index.js";

const auth = new Hono();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// POST /api/auth/register
auth.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse("ورودی نامعتبر است."), 400);
  }
  const { name, email, password } = parsed.data;
  const emailLower = email.trim().toLowerCase();

  // Check existing
  const existing = await db.select().from(users).where(eq(users.email, emailLower)).limit(1);
  if (existing.length > 0) {
    return c.json(errorResponse("حسابی با این ایمیل از قبل وجود دارد."), 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(users)
    .values({
      name: name.trim(),
      email: emailLower,
      passwordHash,
      role: "user",
    })
    .returning();

  const accessToken = signAccessToken(user.id, user.email ?? undefined, user.role ?? undefined);
  const refreshToken = signRefreshToken(user.id);

  return c.json(
    successResponse({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    }),
    201,
  );
});

// POST /api/auth/login
auth.post("/login", async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse("ورودی نامعتبر است."), 400);
  }
  const { email, password } = parsed.data;
  const emailLower = email.trim().toLowerCase();

  const rows = await db.select().from(users).where(eq(users.email, emailLower)).limit(1);
  if (rows.length === 0) {
    return c.json(errorResponse("ایمیل یا رمز عبور اشتباه است."), 401);
  }
  const user = rows[0];
  if (!user.passwordHash) {
    return c.json(errorResponse("حساب شما رمز عبور ندارد."), 401);
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json(errorResponse("ایمیل یا رمز عبور اشتباه است."), 401);
  }

  const accessToken = signAccessToken(user.id, user.email ?? undefined, user.role ?? undefined);
  const refreshToken = signRefreshToken(user.id);

  // Store session
  await db.insert(sessions).values({
    userId: user.id,
    token: accessToken,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  return c.json(
    successResponse({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    }),
  );
});

// POST /api/auth/refresh
auth.post("/refresh", async (c) => {
  const body = await c.req.json();
  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(errorResponse("ورودی نامعتبر است."), 400);
  }
  try {
    const payload = verifyToken(parsed.data.refreshToken);
    if (payload.type !== "refresh") {
      return c.json(errorResponse("توکن نامعتبر است."), 401);
    }
    const rows = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (rows.length === 0) {
      return c.json(errorResponse("کاربر یافت نشد."), 401);
    }
    const user = rows[0];
    const accessToken = signAccessToken(user.id, user.email ?? undefined, user.role ?? undefined);
    const newRefreshToken = signRefreshToken(user.id);
    return c.json(successResponse({ accessToken, refreshToken: newRefreshToken }));
  } catch {
    return c.json(errorResponse("توکن منقضی یا نامعتبر است."), 401);
  }
});

// POST /api/auth/logout
auth.post("/logout", async (c) => {
  // Client-side: just discard tokens. Server could blacklist, but MVP is stateless.
  return c.json(successResponse({ message: "با موفقیت خارج شدید." }));
});

// GET /api/auth/me
auth.get("/me", requireAuth, async (c) => {
  const user = getCurrentUser(c);
  if (!user) {
    return c.json(errorResponse("کاربر یافت نشد."), 404);
  }
  return c.json(
    successResponse({
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
    }),
  );
});

// GET /api/auth/is-admin
auth.get("/is-admin", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(successResponse(false));
  }
  try {
    const payload = verifyToken(authHeader.slice(7));
    if (payload.type === "refresh") return c.json(successResponse(false));
    const rows = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (rows.length === 0) return c.json(successResponse(false));
    const user = rows[0];
    const email = user.email;
    if (!email) return c.json(successResponse(false));
    const adminRow = await db.select().from(adminsTable).where(eq(adminsTable.email, email)).limit(1);
    return c.json(successResponse(adminRow.length > 0 || user.role === "admin" || user.role === "site_admin"));
  } catch {
    return c.json(successResponse(false));
  }
});

export default auth;
