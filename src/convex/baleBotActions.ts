"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { linkMiniAppIdentity, type MiniAppRunnerCtx } from "./miniAppAuth";
import {
  baleApiCall,
  deleteBaleWebhook,
  getBaleWebhookInfo,
  setBaleWebhook,
  type BaleApiCtx,
} from "./baleApi";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Webhook management is admin-only. The check runs server-side against the
 * caller's real role — it is never taken from client input.
 */
async function requireAdminAction(ctx: {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  runQuery: (fn: any, args?: any) => Promise<any>;
}): Promise<void> {
  const userId = await getAuthUserId(ctx as never);
  if (!userId) throw new Error("عدم دسترسی: ابتدا وارد شوید.");

  const user = (await ctx.runQuery(internal.baleBot._findUserById, { userId })) as
    | { role?: string }
    | null;

  if (!user || (user.role !== "admin" && user.role !== "site_admin")) {
    throw new Error("فقط مدیر سامانه و مدیر سایت به این بخش دسترسی دارند.");
  }
}

/**
 * Resolve the webhook URL from configuration (never hard-coded).
 * `BALE_WEBHOOK_BASE_URL` wins when set, otherwise Convex's own site URL —
 * which is correct per deployment (dev vs prod).
 */
function resolveWebhookUrl(customUrl?: string): string {
  const candidate =
    customUrl ??
    `${(process.env.BALE_WEBHOOK_BASE_URL ?? process.env.CONVEX_SITE_URL ?? "").replace(/\/+$/, "")}/bale/webhook`;

  if (!candidate || candidate.startsWith("/bale")) {
    throw new Error("CONVEX_SITE_URL تنظیم نشده است. آدرس وب‌هوک را پیکربندی کنید.");
  }
  if (!/^https:\/\//i.test(candidate)) {
    throw new Error("آدرس وب‌هوک باید با https شروع شود.");
  }
  return candidate;
}

// ── Bot connection test (admin only) ────────────────────────────────────────

/** Verify the saved token with Bale's getMe method. */
export const testConnection = action({
  args: {},
  handler: async (ctx) => {
    await requireAdminAction(ctx);

    const result = await baleApiCall<{
      id?: string | number;
      first_name?: string;
      username?: string;
    }>(ctx as unknown as BaleApiCtx, "getMe");

    if (!result.ok) {
      await ctx.runMutation(internal.baleBot._updateBotInfo, {
        connected: false,
        lastTestResult: result.error,
      });
      return { success: false as const, error: result.error };
    }

    const botId = result.result.id === undefined ? undefined : String(result.result.id);
    const botName = result.result.first_name?.trim() || undefined;
    const botUsername = result.result.username?.trim() || undefined;

    await ctx.runMutation(internal.baleBot._updateBotInfo, {
      botId,
      botName,
      botUsername,
      connected: true,
      lastTestResult: "success",
    });

    return { success: true as const, botId, botName, botUsername };
  },
});

// ── Webhook management (admin only) ─────────────────────────────────────────

/**
 * Register the Bale webhook.
 *
 * Uses the official `setWebhook` method. Safe by design: admin-only, the URL is
 * configuration-driven, and the bot token is read server-side and never
 * returned. Nothing is registered automatically on every request.
 */
export const setWebhook = action({
  args: { customUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdminAction(ctx);

    const webhookUrl = resolveWebhookUrl(args.customUrl);
    const result = await setBaleWebhook(ctx as unknown as BaleApiCtx, webhookUrl);

    await ctx.runMutation(internal.baleBot._updateBotInfo, {
      webhookUrl: result.ok ? webhookUrl : undefined,
      connected: result.ok,
      lastTestResult: result.ok ? "success" : result.error,
    });

    return {
      success: result.ok,
      webhookUrl,
      error: result.ok ? undefined : result.error,
    };
  },
});

/** Current webhook status, straight from Bale (`getWebhookInfo`). */
export const getWebhookInfo = action({
  args: {},
  handler: async (ctx) => {
    await requireAdminAction(ctx);

    const result = await getBaleWebhookInfo(ctx as unknown as BaleApiCtx);
    if (!result.ok) return { success: false as const, error: result.error };

    const info = result.result ?? {};
    return {
      success: true as const,
      url: (info.url as string) || null,
      pendingUpdateCount: (info.pending_update_count as number) ?? null,
      lastErrorMessage: (info.last_error_message as string) ?? null,
    };
  },
});

/** Remove the webhook (`deleteWebhook`). */
export const deleteWebhook = action({
  args: {},
  handler: async (ctx) => {
    await requireAdminAction(ctx);

    const result = await deleteBaleWebhook(ctx as unknown as BaleApiCtx);

    if (result.ok) {
      await ctx.runMutation(internal.baleBot._updateBotInfo, {
        webhookUrl: undefined,
        connected: false,
        lastTestResult: "disconnected",
      });
    }

    return {
      success: result.ok,
      error: result.ok ? undefined : result.error,
    };
  },
});

// ── Mini App account linking ────────────────────────────────────────────────

/**
 * Validate Bale Mini App initData and link the Bale account
 * to the currently signed-in Genova user.
 *
 * Flow: Bale WebApp → initData → backend HMAC validation → account linking.
 *
 * Security:
 * - initData is validated server-side with HMAC-SHA256 against the Bale bot
 *   token (see ./miniAppAuth). The token never leaves the server.
 * - auth_date freshness is enforced (24h) inside the shared validator.
 * - The platform is resolved server-side from the signature itself, so a
 *   wrong platform hint from the client cannot link the wrong identity.
 * - A client-supplied user id is never accepted: the Bale user id always comes
 *   from the verified initData.
 * - Linking is a single transaction that refuses duplicates in both
 *   directions (one user ↔ one Bale account).
 */
export const linkByBaleInitData = action({
  args: { initData: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("لطفاً وارد شوید.");

    return await linkMiniAppIdentity(ctx as unknown as MiniAppRunnerCtx, args.initData, userId);
  },
});
