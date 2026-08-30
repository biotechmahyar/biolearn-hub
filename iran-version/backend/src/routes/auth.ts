import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { db } from "../db/index.js";
import { users, admins } from "../db/schema.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  requireAuth,
} from "../middleware/auth.js";
import { eq } from "drizzle-orm";
import { z } from "zod";

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

// POST /api/auth/register
auth.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "ورودی نامعتبر است." }, 400);
  }
  const { name, email, password } = parsed.data;
  const emailLower = email.toLowerCase().trim();

  // Check existing
  const existing = await db.query.users.findFirst({
    where: eq(users.email, emailLower),
  });
  if (existing) {
    return c.json({ ok: false, error: "حسابی با این ایمیل از قبل وجود دارد." }, 409);
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

  const payload = { userId: user.id, email: emailLower, role: "user" };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return c.json(
    {
      ok: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      },
    },
    201
  );
});

// POST /api/auth/login
auth.post("/login", async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: false, error: "ورودی نامعتبر است." }, 400);
  }
  const { email, password } = parsed.data;
  const emailLower = email.toLowerCase().trim();

  const user = await db.query.users.findFirst({
    where: eq(users.email, emailLower),
  });
  if (!user || !user.passwordHash) {
    return c.json({ ok: false, error: "ایمیل یا رمز عبور اشتباه است." }, 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ ok: false, error: "ایمیل یا رمز عبور اشتباه است." }, 401);
  }

  const payload = { userId: user.id, email: emailLower, role: user.role || "user" };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return c.json({
    ok: true,
    data: {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    },
  });
});

// POST /api/auth/refresh
auth.post("/refresh", async (c) => {
  const body = await c.req.json();
  const { refreshToken } = body;
  if (!refreshToken) {
    return c.json({ ok: false, error: "refreshToken لازم است." }, 400);
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    return c.json({ ok: false, error: "توکن نامعتبر است." }, 401);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId),
  });
  if (!user) {
    return c.json({ ok: false, error: "کاربر یافت نشد." }, 401);
  }

  const newPayload = { userId: user.id, email: user.email || undefined, role: user.role || "user" };
  const newAccessToken = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken(newPayload);

  return c.json({
    ok: true,
    data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
  });
});

// POST /api/auth/logout (client-side, no server state to invalidate for JWT)
auth.post("/logout", async (c) => {
  return c.json({ ok: true, data: null });
});

// GET /api/auth/me
auth.get("/me", requireAuth, async (c) => {
  const user = c.get("user");
  return c.json({
    ok: true,
    data: {
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
    },
  });
});

// GET /api/auth/is-admin
auth.get("/is-admin", requireAuth, async (c) => {
  const user = c.get("user");
  const isAdminUser = user.role === "admin" || user.role === "site_admin";
  return c.json(isAdminUser);
});

export default auth;
