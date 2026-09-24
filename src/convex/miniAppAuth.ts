/**
 * Shared Mini App authentication layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for Mini App `initData` validation. Used by:
 *   • the auth providers            (telegram_miniapp / bale_miniapp)
 *   • the account-linking actions   (Telegram & Bale)
 *
 * Security model
 *  - `initData` is validated with HMAC-SHA256 exactly as documented by both
 *     Telegram and Bale:
 *       secret      = HMAC_SHA256(key = "WebAppData", message = botToken)
 *       computed    = HMAC_SHA256(key = secret,      message = data_check_string)
 *   - `auth_date` freshness is enforced **here** (24h by default) so Telegram
 *     and Bale get the same protection.
 *   - Bot tokens are read server-side only (bot config row, or an env var
 *     fallback) and are never returned to the client.
 *   - The platform is decided **server-side**: whichever bot token validates
 *     the HMAC wins. A client-supplied platform name is only a hint, and a
 *     client-supplied user id is never accepted.
 *
 * This module stays runtime-agnostic (Web Crypto only — no "use node") because
 * it runs both in the Convex default runtime (auth providers) and inside
 * "use node" action files (the linking actions).
 */

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

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

export interface MiniAppInitDataOptions {
  /**
   * Maximum allowed age of `auth_date` in seconds.
   * Defaults to {@link DEFAULT_MINI_APP_AUTH_DATE_FRESHNESS_SECONDS}.
   * Pass `0` to disable the freshness check.
   */
  authDateFreshnessSeconds?: number;
}

/** Platforms whose Mini App initData we can validate. */
export type MiniAppPlatformName = "telegram" | "bale";

/** A Mini App identity resolved server-side from a validated initData. */
export interface ResolvedMiniAppIdentity {
  platform: MiniAppPlatformName;
  /** The numeric platform user id (Telegram user id / Bale user id). */
  platformId: number;
  user: MiniAppUser;
  authDate: number;
}

/** Minimal runner surface shared by action ctx and auth-provider ctx. */
export interface MiniAppRunnerCtx {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  runQuery: (fn: any, args?: any) => Promise<any>;
  runMutation: (fn: any, args?: any) => Promise<any>;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/**
 * Default freshness window for `auth_date`: 24 hours.
 * Both Telegram and Bale refresh initData every time the Mini App is opened,
 * so a legitimate request is seconds old — 24h only rejects clearly stale
 * (replayed) payloads without affecting normal usage.
 */
export const DEFAULT_MINI_APP_AUTH_DATE_FRESHNESS_SECONDS = 24 * 60 * 60;

// ── Web Crypto helpers ─────────────────────────────────────────────────────

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(message) as unknown as ArrayBuffer,
  );
  return new Uint8Array(signature);
}

/** Constant-time comparison to prevent timing attacks on hash comparison. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ── Shared HMAC validator ──────────────────────────────────────────────────

/**
 * Validate Mini App `initData` with HMAC-SHA256.
 *
 * Platform-agnostic: works identically for Telegram, Bale, and any future
 * platform using the same scheme.
 *
 * @param initData - Raw URL-encoded initData string from the Mini App client.
 * @param botToken - Server-side bot token for that platform.
 * @param options  - Optional validation options (auth_date freshness).
 * @throws If initData is malformed, the hash is missing, HMAC verification
 *         fails, or `auth_date` is older than the freshness window.
 */
export async function validateMiniAppInitData(
  initData: string,
  botToken: string,
  options?: MiniAppInitDataOptions,
): Promise<ValidatedMiniAppInitData> {
  if (!initData || typeof initData !== "string") {
    throw new Error("initData is required.");
  }
  if (!botToken) {
    throw new Error("توکن بات در دسترس نیست.");
  }

  // 1. Parse initData query parameters
  const params = new URLSearchParams(initData);

  // 2. Extract and remove hash
  const hash = params.get("hash");
  if (!hash) {
    throw new Error("initData معتبر نیست (hash موجود نیست).");
  }
  params.delete("hash");

  // 3. Build data_check_string: sorted key=value pairs joined by newlines
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, value]) => `${k}=${value}`)
    .join("\n");

  // 4. secret = HMAC_SHA256(key = "WebAppData", message = botToken)
  //    Telegram and Bale both use the literal "WebAppData" as the HMAC key.
  const secretKey = await hmacSha256(
    new TextEncoder().encode("WebAppData"),
    botToken,
  );

  // 5. computed = HMAC_SHA256(key = secret, message = data_check_string)
  const computedHash = bytesToHex(await hmacSha256(secretKey, dataCheckString));

  // 6. Constant-time comparison
  if (!timingSafeEqual(computedHash, hash.toLowerCase())) {
    throw new Error("اعتبارسنجی Mini App ناموفق بود.");
  }

  // 7. Parse the user object (trusted only now, after HMAC verification)
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

  if (!user?.id || typeof user.id !== "number") {
    throw new Error("User ID نامعتبر است.");
  }

  // 8. auth_date freshness (shared policy for every platform)
  const authDate = parseInt(params.get("auth_date") ?? "0", 10);
  const freshness =
    options?.authDateFreshnessSeconds ??
    DEFAULT_MINI_APP_AUTH_DATE_FRESHNESS_SECONDS;

  if (freshness > 0 && Number.isFinite(authDate) && authDate > 0) {
    const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
    if (ageSeconds > freshness) {
      throw new Error(
        "نشست Mini App منقضی شده است. مینی‌اپ را ببندید و دوباره باز کنید.",
      );
    }
  }

  // 9. query_id (present on some platforms)
  const queryId = params.get("query_id") ?? undefined;

  // 10. Rebuild the params map without `hash` (for caller use)
  const cleanParams = new Map<string, string>();
  for (const [k, value] of params.entries()) {
    cleanParams.set(k, value);
  }

  return { user, authDate, queryId, params: cleanParams };
}

// ── Server-side bot tokens ─────────────────────────────────────────────────

/**
 * Read both Mini App bot tokens, server-side only.
 *
 * Order: Bale prefers the deployment env var (the spec'd source of truth) and
 * falls back to the admin-configured bot row; Telegram keeps its existing
 * DB-first behaviour for backward compatibility.
 */
export const _getPlatformTokens = internalQuery({
  args: {},
  handler: async (ctx) => {
    const telegramRows = await ctx.db.query("telegramBot").collect();
    const baleRows = await ctx.db.query("baleBot").collect();

    const telegramStored = telegramRows[0]?.tokenEncrypted;
    const baleStored = baleRows[0]?.tokenEncrypted;

    const decode = (encoded?: string): string | null => {
      if (!encoded) return null;
      try {
        return atob(encoded);
      } catch {
        return null;
      }
    };

    return {
      telegram: decode(telegramStored) ?? process.env.TELEGRAM_BOT_TOKEN ?? null,
      bale: process.env.BALE_BOT_TOKEN ?? decode(baleStored),
    };
  },
});

// ── Identity resolution (platform decided server-side) ─────────────────────

/**
 * Resolve which platform a chunk of initData belongs to — and who the user is —
 * by validating its HMAC against every configured bot token.
 *
 * Why not trust the client's platform name? Both messengers ship SDKs that read
 * the same `tgWebApp*` URL parameters and both SDKs load on every page, so the
 * browser can report the wrong platform. The HMAC can only succeed for the
 * platform whose token signed it, so the server is the authority.
 */
export async function resolveMiniAppIdentity(
  ctx: MiniAppRunnerCtx,
  initData: string,
): Promise<ResolvedMiniAppIdentity> {
  const tokens = (await ctx.runQuery(internal.miniAppAuth._getPlatformTokens, {})) as {
    telegram: string | null;
    bale: string | null;
  };

  const attempts: { platform: MiniAppPlatformName; token: string | null }[] = [
    { platform: "telegram", token: tokens?.telegram ?? null },
    { platform: "bale", token: tokens?.bale ?? null },
  ];

  const configured = attempts.filter((a) => !!a.token);
  if (configured.length === 0) {
    throw new Error("توکن بات تنظیم نشده است. با مدیر سامانه تماس بگیرید.");
  }

  let lastMessage: string | null = null;

  for (const attempt of configured) {
    try {
      const validated = await validateMiniAppInitData(initData, attempt.token!);
      return {
        platform: attempt.platform,
        platformId: validated.user.id,
        user: validated.user,
        authDate: validated.authDate,
      };
    } catch (err) {
      lastMessage = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(lastMessage ?? "اعتبارسنجی Mini App ناموفق بود.");
}

// ── Linked-user lookup ─────────────────────────────────────────────────────

/** The Genova user linked to a platform identity, or null. */
export const _findUserByPlatformId = internalQuery({
  args: {
    platform: v.union(v.literal("telegram"), v.literal("bale")),
    platformId: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.platform === "telegram") {
      return await ctx.db
        .query("users")
        .withIndex("by_telegramId", (q) => q.eq("telegramId", args.platformId))
        .first();
    }
    return await ctx.db
      .query("users")
      .withIndex("by_baleId", (q) => q.eq("baleId", args.platformId))
      .first();
  },
});

// ── Linking (transactional, duplicate-safe) ────────────────────────────────

/**
 * Persist a resolved platform identity onto a Genova user.
 *
 * Runs inside a single Convex mutation so the duplicate checks and the write
 * are atomic — two concurrent requests can never link the same messenger
 * account to two users.
 */
export const _linkResolvedIdentity = internalMutation({
  args: {
    userId: v.id("users"),
    platform: v.union(v.literal("telegram"), v.literal("bale")),
    platformId: v.number(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("کاربر Genova یافت نشد.");

    const isTelegram = args.platform === "telegram";
    const currentPlatformId = isTelegram ? user.telegramId : user.baleId;

    // Already linked to this same messenger account → idempotent success.
    if (currentPlatformId === args.platformId) {
      return { alreadyLinked: true, userId: user._id, platform: args.platform };
    }

    // This Genova user already carries a *different* account of this platform.
    if (currentPlatformId && currentPlatformId !== args.platformId) {
      throw new Error(
        "حساب Genova شما قبلاً به حساب دیگری در همین پیام‌رسان متصل شده است. ابتدا آن را قطع کنید.",
      );
    }

    // Is this messenger account already owned by another Genova user?
    const owner = isTelegram
      ? await ctx.db
          .query("users")
          .withIndex("by_telegramId", (q) => q.eq("telegramId", args.platformId))
          .first()
      : await ctx.db
          .query("users")
          .withIndex("by_baleId", (q) => q.eq("baleId", args.platformId))
          .first();

    if (owner && owner._id !== user._id) {
      throw new Error(
        "این حساب پیام‌رسان قبلاً به یک حساب Genova دیگر متصل شده است.",
      );
    }

    const now = Date.now();
    if (isTelegram) {
      await ctx.db.patch(user._id, {
        telegramId: args.platformId,
        telegramUsername: args.username,
        telegramFirstName: args.firstName,
        telegramLinkedAt: now,
      });
    } else {
      await ctx.db.patch(user._id, {
        baleId: args.platformId,
        baleUsername: args.username,
        baleFirstName: args.firstName,
        baleLinkedAt: now,
      });
    }

    return { alreadyLinked: false, userId: user._id, platform: args.platform };
  },
});

/**
 * Validate initData and link the corresponding messenger account to the
 * currently signed-in Genova user.
 *
 * Shared by both linking actions (`linkByTelegramInitData` /
 * `linkByBaleInitData`) so a mis-detected platform on the client can never
 * break linking.
 */
export async function linkMiniAppIdentity(
  ctx: MiniAppRunnerCtx,
  initData: string,
  currentUserId: Id<"users">,
): Promise<{ success: true; alreadyLinked: boolean; platform: MiniAppPlatformName }> {
  const resolved = await resolveMiniAppIdentity(ctx, initData);

  const result = (await ctx.runMutation(internal.miniAppAuth._linkResolvedIdentity, {
    userId: currentUserId,
    platform: resolved.platform,
    platformId: resolved.platformId,
    username: typeof resolved.user.username === "string" ? resolved.user.username : undefined,
    firstName:
      typeof resolved.user.first_name === "string" ? resolved.user.first_name : undefined,
  })) as { alreadyLinked: boolean } | null;

  return {
    success: true,
    alreadyLinked: !!result?.alreadyLinked,
    platform: resolved.platform,
  };
}
