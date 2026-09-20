import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveMiniAppIdentity } from "./miniAppAuth";

/**
 * Telegram Mini App auth provider
 * ─────────────────────────────────────────────────────────────────────────────
 * Lets a user open /mini inside Telegram and be signed in as their real Genova
 * account (with its real role) without typing anything.
 *
 * Flow:
 *  1. Telegram injects `initData` into the WebView.
 *  2. The client calls signIn("telegram_miniapp", { initData }).
 *  3. Initialization data is validated server-side by the shared Mini App auth
 *     layer (`./miniAppAuth`) — HMAC-SHA256 against the bot token plus an
 *     auth_date freshness check — and the Genova user linked to that platform
 *     id is resolved.
 *  4. A real session is created, so useAuth() / useQuery(...) work in the Mini
 *     App exactly like on the website, including role-gated admin queries.
 *
 * Security: the bot token never leaves the server, no password is involved,
 * and only accounts that were linked beforehand (profile → connect) can sign
 * in this way. Passing a user id from the client is impossible: the id always
 * comes from the HMAC-verified initData, and the platform is decided
 * server-side by which bot token validates the signature.
 */

/**
 * Build the Telegram Mini App credentials provider.
 * Declared as a function so `auth.ts` constructs it in the same module graph
 * as the other providers (avoids duplicate-type inference issues).
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

      // 1. Validate initData (shared layer) and resolve the platform identity
      const resolved = await resolveMiniAppIdentity(ctx, initData);

      // 2. The Genova account linked to this messenger account
      const user = (await ctx.runQuery(internal.miniAppAuth._findUserByPlatformId, {
        platform: resolved.platform,
        platformId: resolved.platformId,
      })) as { _id: Id<"users"> } | null;

      if (!user) {
        throw new Error(
          "حساب پیام‌رسان شما به Genova متصل نیست. ابتدا از سایت (پروفایل → اتصال) حساب خود را متصل کنید.",
        );
      }

      // 3. Create a real session for that user
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
