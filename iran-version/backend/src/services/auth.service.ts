import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb } from "../db/index.js";
import { users, sessions, refreshTokens, admins } from "../db/schema.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  parseExpiresIn,
} from "../lib/jwt.js";
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from "../lib/errors.js";

const SALT_ROUNDS = 12;

export interface AuthResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  const db = getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) {
    throw new BadRequestError("Email already registered");
  }
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const now = Date.now();
  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash,
      role: "user",
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

  const tokenPayload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  // Store refresh token
  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    expiresAt: now + parseExpiresIn(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"),
    createdAt: now,
  });

  return { user, accessToken, refreshToken };
}

export async function login(
  email: string,
  password: string
): Promise<AuthResult> {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user || !user.passwordHash) {
    throw new UnauthorizedError("Invalid email or password");
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }
  const tokenPayload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);
  const now = Date.now();

  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    expiresAt: now + parseExpiresIn(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"),
    createdAt: now,
  });

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  };
}

export async function refresh(refreshToken: string) {
  const payload = verifyToken(refreshToken);
  if (!payload) throw new UnauthorizedError("Invalid refresh token");

  const db = getDb();
  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, refreshToken))
    .limit(1);
  if (!stored) throw new UnauthorizedError("Refresh token not found");
  if (stored.expiresAt < Date.now()) {
    throw new UnauthorizedError("Refresh token expired");
  }

  // Delete old refresh token (rotation)
  await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));

  // Get user for new tokens
  const [user] = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);
  if (!user) throw new NotFoundError("User");

  const newPayload = { sub: user.id, email: user.email, role: user.role };
  const newAccess = signAccessToken(newPayload);
  const newRefresh = signRefreshToken(newPayload);
  const now = Date.now();

  await db.insert(refreshTokens).values({
    userId: user.id,
    token: newRefresh,
    expiresAt: now + parseExpiresIn(process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"),
    createdAt: now,
  });

  return { accessToken: newAccess, refreshToken: newRefresh };
}

export async function getCurrentUser(userId: string) {
  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      secondaryRole: users.secondaryRole,
      firstName: users.firstName,
      lastName: users.lastName,
      about: users.about,
      avatarUrl: users.avatarUrl,
      university: users.university,
      major: users.major,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new NotFoundError("User");
  return user;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const db = getDb();
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return false;
  return ["admin", "site_admin", "content_manager", "super_admin"].includes(
    user.role
  );
}
