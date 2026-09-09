"use node";

import { createHmac } from "node:crypto";

// ── Types ──────────────────────────────────────────────────────────────────

/** Raw user object parsed from Mini App initData (platform-agnostic shape). */
export interface MiniAppUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  [key: string]: unknown;
}

/** Successfully validated Mini App initData. */
export interface ValidatedMiniAppInitData {
  /** Parsed user object — trusted only after HMAC verification. */
  user: MiniAppUser;
  /** Seconds since epoch when the user authenticated. */
  authDate: number;
  /** Query ID for client-server communication (may be absent on some platforms). */
  queryId?: string;
  /** All other parsed key-value pairs from initData (excluding hash). */
  params: Map<string, string>;
}

// ── Shared HMAC Validator ──────────────────────────────────────────────────

/**
 * Validate Mini App initData using HMAC-SHA256.
 *
 * This function is platform-agnostic. It works identically for:
 * - Telegram WebApp initData
 * - Bale Mini App initData
 * - Any future platform using the same HMAC scheme
 *
 * Algorithm (documented by both Telegram and Bale):
 *   1. Parse initData as URL-encoded key=value pairs
 *   2. Remove "hash" from the pairs
 *   3. Sort remaining pairs by key, join as "key=value\n" → data_check_string
 *   4. secret_key = HMAC_SHA256(key = botToken, message = "WebAppData")
 *   5. computed_hash = HMAC_SHA256(key = secret_key, message = data_check_string)
 *   6. Compare computed_hash with supplied hash (constant-time)
 *
 * Security notes:
 * - The bot token MUST be server-side only and NEVER returned/leaked.
 * - User identity is only trusted AFTER successful HMAC verification.
 * - auth_date freshness is NOT checked here (caller decides policy).
 *
 * @param initData - Raw URL-encoded initData string from the Mini App client.
 * @param botToken - Server-side bot token for this platform.
 * @returns Validated and parsed initData.
 * @throws If initData is malformed, hash is missing, or HMAC verification fails.
 */
export function validateMiniAppInitData(
  initData: string,
  botToken: string,
): ValidatedMiniAppInitData {
  if (!initData || typeof initData !== "string") {
    throw new Error("initData is required.");
  }

  // 1. Parse initData query parameters
  const params = new URLSearchParams(initData);

  // 2. Extract and remove hash
  const hash = params.get("hash");
  if (!hash) {
    throw new Error("initData معتبر نیست (hash missing).");
  }
  params.delete("hash");

  // 3. Build data_check_string: sorted key=value pairs joined by newlines
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  // 4. Derive secret key: HMAC_SHA256(key = botToken, message = "WebAppData")
  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  // 5. Compute hash: HMAC_SHA256(key = secret_key, message = data_check_string)
  const computedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // 6. Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(computedHash, hash)) {
    throw new Error("اعتبارسنجی Mini App ناموفق بود.");
  }

  // 7. Extract user info (trusted only after HMAC verification)
  const userStr = params.get("user");
  if (!userStr) {
    throw new Error("اطلاعات کاربر یافت نشد.");
  }

  let user: MiniAppUser;
  try {
    user = JSON.parse(userStr);
  } catch {
    throw new Error("اطلاعات کاربر نامعتبر است.");
  }

  if (!user.id || typeof user.id !== "number") {
    throw new Error("User ID نامعتبر است.");
  }

  // 8. Extract auth_date
  const authDateStr = params.get("auth_date");
  const authDate = authDateStr ? parseInt(authDateStr, 10) : 0;

  // 9. Extract query_id (optional — present on some platforms)
  const queryId = params.get("query_id") ?? undefined;

  // 10. Rebuild params map without hash (for caller use)
  const cleanParams = new Map<string, string>();
  for (const [k, v] of params.entries()) {
    cleanParams.set(k, v);
  }

  return { user, authDate, queryId, params: cleanParams };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Constant-time string comparison to prevent timing attacks on hash comparison.
 * Falls back to simple comparison if the lengths differ (hash length mismatch
 * is already a clear failure and not secret).
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  try {
    // Node.js crypto.timingSafeEqual requires Buffers
    const { timingSafeEqual } = require("node:crypto") as typeof import("node:crypto");
    return timingSafeEqual(Buffer.from(a, "utf-8"), Buffer.from(b, "utf-8"));
  } catch {
    // Fallback: byte-by-byte comparison (still constant-time for equal lengths)
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
