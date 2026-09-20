import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { resolveMiniAppIdentity } from "./miniAppAuth";

/**
 * Bale Mini App auth provider
 * ─────────────────────────────────────────────────────────────────────────────
 * Bale Messenger (the Iranian messenger) uses a Mini App scheme identical to
 * Telegram: the WebView hands the page a URL-encoded `initData` string signed
 * with the bot token, and the `user` inside it is only trustworthy after the
 * HMAC has been verified server-side.
 *
 * Flow:
 *  1. Bale injects `initData` into window.Bale.WebApp (SDK loaded in index.html).
 *  2. The shared Mini App page (no separate Bale page) calls
 *     signIn("bale_miniapp", { initData }).
 *  3. `./miniAppAuth` validates the signature against the configured bot tokens
 *     — the platform is decided server-side, so a wrong platform hint from the
 *     client can never produce a wrong identity — and enforces auth_date
 *     freshness.
 *  4. The Genova user linked to that Bale id gets a real session, so the Mini
 *     App works exactly like it does inside Telegram.
 *
 * Security: bot token stays server-side; an unlinked Bale account cannot sign
 * in (it is asked to link from the website first, same as Telegram); a
 * client-supplied user id is never accepted.
 */
export function makeBaleMiniAppProvider() {
  return ConvexCredentials({
    id: "bale_miniapp",
    async authorize(
      credentials: Record<string, unknown>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ctx: any,
    ): Promise<{ userId: Id<"users"> }> {
      const initData = credentials?.initData as string | undefined;
      if (!initData || typeof initData !== "string") {
        throw new Error("initData بله یافت نشد.");
      }

      // 1. Validate initData (shared layer: HMAC + auth_date freshness)
      const resolved = await resolveMiniAppIdentity(ctx, initData);

      // 2. The Genova account linked to this messenger account
      const user = (await ctx.runQuery(internal.miniAppAuth._findUserByPlatformId, {
        platform: resolved.platform,
        platformId: resolved.platformId,
      })) as { _id: Id<"users"> } | null;

      if (!user) {
        throw new Error(
          "حساب بله شما به Genova متصل نیست. ابتدا از سایت (پروفایل → اتصال) حساب خود را متصل کنید.",
        );
      }

      // 3. Real session for that user
      return { userId: user._id };
    },
  });
}
