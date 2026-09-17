import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { query, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Telegram Mini App auth provider
 * ─────────────────────────────────────────────────────────────────
 * Lets a user open /mini inside Telegram and be signed in as their
 * real Genova account (with its real role) without typing anything.
 *
 * Flow:
 *  1. Telegram injects `initData` into the WebView (window.Telegram.WebApp).
 *  2. The client calls signIn("telegram_miniapp", { initData }).
 *  3. Here we validate initData with HMAC-SHA256 against the bot token
 *     (same algorithm as Telegram docs — implemented with Web Crypto so
 *     this runs in the default Convex runtime, not "use node"), find the
 *     Genova user linked to that telegramId and create a real session.
 *  4. After that, useAuth() / useQuery(...) work in the Mini App exactly
 *     like on the website — including role-based admin queries.
 *
 * Security: only users who already linked their account through the
 * website (one-time code flow) can sign in this way. The bot token
 * never leaves the server and no password is involved.
 */

// ── Web Crypto HMAC implementation of Telegram's initData validation ────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

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

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

interface ValidatedInitData {
  telegramId: number;
  authDate: number;
}

/**
 * Validate Telegram Mini App initData (HMAC-SHA256, per official docs).
 * Throws on any failure so invalid requests never reach user lookup.
 */
async function validateInitData(
  initData: string,
  botToken: string,
): Promise<ValidatedInitData> {
  const params = new URLSearchParams(initData);

  const hash = params.get("hash");
  if (!hash) throw new Error("initData معتبر نیست (hash missing).");
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, val]) => `${k}=${val}`)
    .join("\n");

  // secret_key = HMAC_SHA256(key = "WebAppData", message = botToken)
  const secretKey = await hmacSha256(
    new TextEncoder().encode("WebAppData"),
    botToken,
  );
  // computed_hash = HMAC_SHA256(key = secret_key, message = dataCheckString)
  const computed = await hmacSha256(secretKey, dataCheckString);

  if (!constantTimeEqual(bytesToHex(computed), hash.toLowerCase())) {
    throw new Error("اعتبارسنجی Mini App ناموفق بود.");
  }

  const userStr = params.get("user");
  if (!userStr) throw new Error("اطلاعات کاربر یافت نشد.");
  let user: { id?: number };
  try {
    user = JSON.parse(userStr);
  } catch {
    throw new Error("اطلاعات کاربر نامعتبر است.");
  }
  if (!user.id || typeof user.id !== "number") {
    throw new Error("User ID نامعتبر است.");
  }

  const authDate = parseInt(params.get("auth_date") ?? "0", 10);
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (authDate > 0 && ageSeconds > 60 * 60 * 24) {
    throw new Error("نشست تلگرام منقضی شده است. مینی‌اپ را ببندید و دوباره باز کنید.");
  }

  return { telegramId: user.id, authDate };
}

// ── Internal lookups (authorize runs in an action ctx, so it uses runQuery) ──

/** Bot token for HMAC validation — server-side only. */
export const _getBotToken = internalQuery({
  args: {},
  handler: async (ctx) => {
    const bots = await ctx.db.query("telegramBot").collect();
    const bot = bots[0];
    if (!bot?.tokenEncrypted) return null;
    return atob(bot.tokenEncrypted);
  },
});

/** The Genova user linked to a Telegram account. */
export const _findLinkedUser = internalQuery({
  args: { telegramId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q) => q.eq("telegramId", args.telegramId))
      .first();
  },
});

// ── The provider (kept in auth.ts style: inline, no cross-file typing quirks) ─

/**
 * Build the Telegram Mini App credentials provider.
 * Declared as a function so `auth.ts` constructs it in the same module
 * graph as the other providers (avoids duplicate-type inference issues).
 */
export function makeTelegramMiniAppProvider() {
  return ConvexCredentials({
    id: "telegram_miniapp",
    async authorize(
      credentials: Record<string, unknown>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ctx: any,
    ): Promise<{ userId: Id<"users"> }> {
      const initData = credentials?.initData as string | undefined;
      if (!initData || typeof initData !== "string") {
        throw new Error("initData تلگرام یافت نشد.");
      }

      // 1. Bot token (server-side only)
      const botToken: string | null = await ctx.runQuery(
        internal.telegramMiniAppAuth._getBotToken,
        {},
      );
      if (!botToken) throw new Error("بات تلگرام تنظیم نشده است.");

      // 2. Validate initData — throws if HMAC fails or auth_date is stale
      const { telegramId } = await validateInitData(initData, botToken);

      // 3. The Genova account linked to this Telegram account
      const user = (await ctx.runQuery(
        internal.telegramMiniAppAuth._findLinkedUser,
        { telegramId },
      )) as { _id: Id<"users"> } | null;
      if (!user) {
        throw new Error(
          "حساب تلگرام شما به Genova متصل نیست. ابتدا از سایت (پروفایل → اتصال تلگرام) حساب خود را متصل کنید.",
        );
      }

      // 4. Create a real session for that user
      return { userId: user._id };
    },
  });
}

// ── Mini App admin data (works once signed in via initData) ──────────────────

function requireAdminUser<U extends { role?: string } | null>(user: U): U {
  if (!user || (user.role !== "admin" && user.role !== "site_admin")) {
    throw new Error("فقط مدیر سامانه و مدیر سایت به این بخش دسترسی دارند.");
  }
  return user;
}

/** Open mentor questions — for the admin tab inside the Mini App. */
export const miniAppOpenQuestions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    requireAdminUser(user);
    const questions = await ctx.db.query("mentorQuestions").order("desc").take(100);
    return questions
      .filter((q) => q.status === "open")
      .map((q) => ({
        _id: q._id,
        studentName: q.studentName ?? null,
        topic: q.topic ?? null,
        text: q.text,
        createdAt: q.createdAt,
      }));
  },
});

/** Users with pending profile edits — approve/reject right from Telegram. */
export const miniAppPendingProfiles = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    requireAdminUser(user);
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => !!u.pendingProfile)
      .map((u) => ({
        _id: u._id,
        name: u.name ?? null,
        email: u.email ?? null,
        pendingFirstName: u.pendingProfile?.firstName ?? null,
        pendingLastName: u.pendingProfile?.lastName ?? null,
        pendingAbout: u.pendingProfile?.about ?? null,
        submittedAt: u.pendingProfile?.submittedAt ?? 0,
      }))
      .sort((a, b) => b.submittedAt - a.submittedAt);
  },
});

/** Headline counters for the admin home card. */
export const miniAppAdminStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    requireAdminUser(user);
    const users = await ctx.db.query("users").collect();
    const courses = await ctx.db.query("courses").collect();
    const questions = await ctx.db.query("mentorQuestions").collect();
    return {
      users: users.length,
      courses: courses.length,
      openQuestions: questions.filter((q) => q.status === "open").length,
      pendingProfiles: users.filter((u) => !!u.pendingProfile).length,
    };
  },
});
