/**
 * JWT utility — sign, verify, generate OTP.
 * Used by auth routes and Socket.IO middleware.
 */
import { sign, verify } from "jsonwebtoken";
import { randomInt } from "crypto";

function jwtSecret() { return process.env.JWT_SECRET || "dev-jwt-secret-change-me"; }
function refreshSecret() { return process.env.REFRESH_SECRET || "dev-refresh-secret-change-me"; }

export interface JwtPayload {
  sub: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: { userId: string; role?: string }): string {
  return sign({ sub: payload.userId, role: payload.role } as object, jwtSecret(), {
    expiresIn: "15m",
  } as any);
}

export function signRefreshToken(payload: { userId: string }): string {
  return sign({ sub: payload.userId } as object, refreshSecret(), {
    expiresIn: "7d",
  } as any);
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return verify(token, jwtSecret()) as JwtPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  try {
    return verify(token, refreshSecret()) as JwtPayload;
  } catch {
    return null;
  }
}

export function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

export function otpExpiresAt(minutes: number = 5): number {
  return Date.now() + minutes * 60 * 1000;
}
