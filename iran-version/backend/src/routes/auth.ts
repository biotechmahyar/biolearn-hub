import { Hono } from "hono";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "../db/index.js";
import { users, sessions, refreshTokens, otpCodes } from "../db/schema.js";
import { eq, and, gt } from "drizzle-orm";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateOtpCode,
} from "../modules/auth/jwt.js";
import { requireAuth } from "../middleware/auth.js";

export const authRoutes = new Hono();

// ── Register ─────────────────────────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(4),
});

authRoutes.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", details: parsed.error.flatten() }, 400);
  }

  const { name, email, password } = parsed.data;

  // Check if user exists
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash, role: "user" })
    .returning();

  const accessToken = signAccessToken({ userId: user.id, email, role: "user" });
  const refresh = signRefreshToken(user.id);

  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refresh.token,
    expiresAt: refresh.expiresAt,
  });

  return c.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken: refresh.token,
  });
});

// ── Login ────────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRoutes.post("/login", async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Validation failed" }, 400);
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !user.passwordHash) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email!, role: user.role! });
  const refresh = signRefreshToken(user.id);

  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refresh.token,
    expiresAt: refresh.expiresAt,
  });

  return c.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken: refresh.token,
  });
});

// ── Send OTP ─────────────────────────────────────────────────────────────────
authRoutes.post("/otp/send", async (c) => {
  const { email } = await c.req.json();
  if (!email) return c.json({ error: "Email required" }, 400);

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await db.insert(otpCodes).values({ email, code, expiresAt });

  // TODO: Send email via SMTP (configure in .env)
  console.log(`[DEV] OTP for ${email}: ${code}`);

  return c.json({ message: "OTP sent" });
});

// ── Verify OTP ───────────────────────────────────────────────────────────────
authRoutes.post("/otp/verify", async (c) => {
  const { email, code } = await c.req.json();
  if (!email || !code) return c.json({ error: "Email and code required" }, 400);

  const [otp] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.email, email),
        eq(otpCodes.code, code),
        eq(otpCodes.used, false),
        gt(otpCodes.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!otp) {
    return c.json({ error: "Invalid or expired OTP" }, 401);
  }

  // Mark OTP as used
  await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otp.id));

  // Find or create user
  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    [user] = await db
      .insert(users)
      .values({ email, name: email.split("@")[0], role: "user" })
      .returning();
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email!, role: user.role! });
  const refresh = signRefreshToken(user.id);

  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refresh.token,
    expiresAt: refresh.expiresAt,
  });

  return c.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken: refresh.token,
  });
});

// ── Refresh Token ────────────────────────────────────────────────────────────
authRoutes.post("/refresh", async (c) => {
  const { refreshToken } = await c.req.json();
  if (!refreshToken) return c.json({ error: "Refresh token required" }, 400);

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    return c.json({ error: "Invalid refresh token" }, 401);
  }

  // Check if refresh token exists in DB
  const [existing] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, refreshToken))
    .limit(1);

  if (!existing) {
    return c.json({ error: "Refresh token not found" }, 401);
  }

  // Delete old refresh token (rotation)
  await db.delete(refreshTokens).where(eq(refreshTokens.id, existing.id));

  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user) return c.json({ error: "User not found" }, 401);

  const accessToken = signAccessToken({ userId: user.id, email: user.email!, role: user.role! });
  const newRefresh = signRefreshToken(user.id);

  await db.insert(refreshTokens).values({
    userId: user.id,
    token: newRefresh.token,
    expiresAt: newRefresh.expiresAt,
  });

  return c.json({ accessToken, refreshToken: newRefresh.token });
});

// ── Logout ───────────────────────────────────────────────────────────────────
authRoutes.post("/logout", requireAuth, async (c) => {
  const user = c.get("user");
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.userId));
  return c.json({ message: "Logged out" });
});

// ── Me (current user) ────────────────────────────────────────────────────────
authRoutes.get("/me", requireAuth, async (c) => {
  const user = c.get("user");
  const u = user.dbUser;
  return c.json({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    secondaryRole: u.secondaryRole,
    image: u.image,
    university: u.university,
    major: u.major,
  });
});
