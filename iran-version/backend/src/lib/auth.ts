import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "../db/index.js";
import { users, sessions, refreshTokens } from "../db/schema.js";
import { eq, and, gt } from "drizzle-orm";
import { nanoid } from "nanoid";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

export interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export function signAccessToken(user: { id: string; email?: string | null; role?: string | null }) {
  return jwt.sign(
    { sub: user.id, email: user.email ?? undefined, role: user.role ?? undefined },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function parseExpires(expr: string): Date {
  const match = expr.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const n = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const ms: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return new Date(Date.now() + n * (ms[unit] ?? 86400000));
}

export async function createTokens(user: { id: string; email?: string | null; role?: string | null }) {
  const accessToken = signAccessToken(user);
  const refreshToken = nanoid(64);

  // Clean expired refresh tokens for this user
  await db.delete(refreshTokens).where(
    and(eq(refreshTokens.userId, user.id), gt(refreshTokens.expiresAt, new Date()))
  );

  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    expiresAt: parseExpires(REFRESH_EXPIRES_IN),
  });

  return { accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken: string) {
  const row = await db.query.refreshTokens.findFirst({
    where: and(
      eq(refreshTokens.token, refreshToken),
      gt(refreshTokens.expiresAt, new Date())
    ),
  });
  if (!row) return null;

  // Delete used refresh token (rotation)
  await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id));

  const user = await db.query.users.findFirst({ where: eq(users.id, row.userId) });
  if (!user) return null;

  return createTokens(user);
}

export async function getUserFromToken(token: string) {
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub) });
  return user ?? null;
}
