// ─── OTP Service ─────────────────────────────────────────────────────────────
// Generates, stores, and verifies OTP codes using PostgreSQL.
// Uses the pluggable email adapter for delivery.

import { eq, and } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { otpCodes, authRateLimits } from "../db/schema.js";
import { sendOtpEmail } from "./email.service.js";
import { BadRequestError, UnauthorizedError, NotFoundError } from "../lib/errors.js";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function generateCode(): string {
  let code = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

/**
 * Send an OTP code to the given email.
 * Rate-limits to prevent abuse.
 */
export async function sendOtp(email: string): Promise<{ sent: boolean }> {
  const db = getDb();
  const now = Date.now();

  // Check rate limit
  const [rateLimit] = await db
    .select()
    .from(authRateLimits)
    .where(
      and(
        eq(authRateLimits.identifier, email),
        // Check if rate limit window is still active
      )
    )
    .limit(1);

  if (rateLimit && rateLimit.attempts >= RATE_LIMIT_MAX_ATTEMPTS && rateLimit.expireAt > now) {
    throw new BadRequestError("Too many attempts. Please try again later.");
  }

  // Generate code
  const code = generateCode();
  const expiresAt = now + OTP_EXPIRY_MS;

  // Store OTP
  await db.insert(otpCodes).values({
    email,
    code,
    expiresAt,
    createdAt: now,
  });

  // Update rate limit
  if (rateLimit && rateLimit.expireAt > now) {
    await db
      .update(authRateLimits)
      .set({ attempts: rateLimit.attempts + 1 })
      .where(eq(authRateLimits.id, rateLimit.id));
  } else {
    // Reset or create rate limit
    if (rateLimit) {
      await db
        .update(authRateLimits)
        .set({ attempts: 1, expireAt: now + RATE_LIMIT_WINDOW_MS })
        .where(eq(authRateLimits.id, rateLimit.id));
    } else {
      await db.insert(authRateLimits).values({
        identifier: email,
        attempts: 1,
        expireAt: now + RATE_LIMIT_WINDOW_MS,
      });
    }
  }

  // Send email
  await sendOtpEmail(email, code);

  return { sent: true };
}

/**
 * Verify an OTP code.
 * Returns true if valid, throws if invalid/expired.
 */
export async function verifyOtp(
  email: string,
  code: string
): Promise<boolean> {
  const db = getDb();
  const now = Date.now();

  // Find the latest unused OTP for this email
  const [otp] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.email, email),
        eq(otpCodes.code, code),
        eq(otpCodes.used, false)
      )
    )
    .orderBy(otpCodes.createdAt)
    .limit(1);

  if (!otp) {
    throw new UnauthorizedError("Invalid or expired verification code");
  }

  if (otp.expiresAt < now) {
    throw new UnauthorizedError("Verification code has expired");
  }

  // Mark as used
  await db
    .update(otpCodes)
    .set({ used: true })
    .where(eq(otpCodes.id, otp.id));

  return true;
}
