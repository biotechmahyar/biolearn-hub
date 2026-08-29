"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const resp = await fetch(url, init);
  return await resp.json();
}

/** Test connection with saved token */
export const testConnection = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("عدم دسترسی.");

    const tokenData = await ctx.runQuery(api.telegramBot._getRawToken);
    if (!tokenData?.token) throw new Error("توکن بات ذخیره نشده است.");

    const token: string = tokenData.token;

    try {
      const data: any = await fetchJson(`https://api.telegram.org/bot${token}/getMe`, {
        signal: AbortSignal.timeout(15000),
      });

      if (data.ok) {
        await ctx.runMutation(api.telegramBot._updateBotInfo, {
          botId: String(data.result.id),
          botName: data.result.first_name,
          botUsername: data.result.username,
          connected: true,
          lastTestResult: "success",
        });
        return {
          success: true,
          botId: String(data.result.id),
          botName: data.result.first_name as string,
          botUsername: data.result.username as string,
        };
      } else {
        await ctx.runMutation(api.telegramBot._updateBotInfo, {
          connected: false,
          lastTestResult: (data.description as string) || "خطای نامشخص",
        });
        return { success: false, error: (data.description as string) || "خطای نامشخص" };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "خطای شبکه";
      await ctx.runMutation(api.telegramBot._updateBotInfo, {
        connected: false,
        lastTestResult: msg,
      });
      return { success: false, error: msg };
    }
  },
});

/** Disconnect bot */
export const disconnectBot = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("عدم دسترسی.");

    const tokenData = await ctx.runQuery(api.telegramBot._getRawToken);
    if (!tokenData?.token) throw new Error("توکن یافت نشد.");

    try {
      await fetchJson(`https://api.telegram.org/bot${tokenData.token}/deleteWebhook`, {
        signal: AbortSignal.timeout(10000),
      });
    } catch { /* ignore */ }

    await ctx.runMutation(api.telegramBot._updateBotInfo, {
      connected: false,
      webhookUrl: undefined,
      botId: undefined,
      botName: undefined,
      botUsername: undefined,
      lastTestResult: "disconnected",
    });
    return { success: true };
  },
});

/** Get bot commands */
export const getBotCommands = action({
  args: {},
  handler: async (ctx) => {
    const tokenData = await ctx.runQuery(api.telegramBot._getRawToken);
    if (!tokenData?.token) throw new Error("توکن یافت نشد.");

    try {
      const data: any = await fetchJson(`https://api.telegram.org/bot${tokenData.token}/getMyCommands`, {
        signal: AbortSignal.timeout(10000),
      });
      if (data.ok) return { success: true, commands: data.result as Array<{ command: string; description: string }> };
      return { success: false, error: data.description as string };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "خطا" };
    }
  },
});

/** Set bot commands */
export const setBotCommands = action({
  args: {
    commands: v.array(
      v.object({
        command: v.string(),
        description: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const tokenData = await ctx.runQuery(api.telegramBot._getRawToken);
    if (!tokenData?.token) throw new Error("توکن یافت نشد.");

    try {
      const data: any = await fetchJson(`https://api.telegram.org/bot${tokenData.token}/setMyCommands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commands: args.commands }),
        signal: AbortSignal.timeout(10000),
      });
      return { success: data.ok as boolean, error: data.ok ? undefined : (data.description as string) };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "خطا" };
    }
  },
});

/** Setup webhook — auto-builds URL from CONVEX_SITE_URL */
export const setupWebhook = action({
  args: {},
  handler: async (ctx) => {
    const tokenData = await ctx.runQuery(api.telegramBot._getRawToken);
    if (!tokenData?.token) throw new Error("توکن یافت نشد.");

    // Build webhook URL from Convex site URL
    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!siteUrl) throw new Error("CONVEX_SITE_URL تنظیم نشده است.");
    const webhookUrl = `${siteUrl}/telegram/webhook`;

    try {
      // Set webhook with Telegram
      const setData: any = await fetchJson(
        `https://api.telegram.org/bot${tokenData.token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&drop_pending_updates=true`,
        { signal: AbortSignal.timeout(15000) },
      );

      if (setData.ok) {
        await ctx.runMutation(api.telegramBot._updateBotInfo, { webhookUrl });
      }
      return { success: setData.ok as boolean, webhookUrl, error: setData.ok ? undefined : (setData.description as string) };
    } catch (err: unknown) {
      return { success: false, webhookUrl, error: err instanceof Error ? err.message : "خطا" };
    }
  },
});

/** Set webhook with custom URL */
export const setWebhook = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const tokenData = await ctx.runQuery(api.telegramBot._getRawToken);
    if (!tokenData?.token) throw new Error("توکن یافت نشد.");

    try {
      const data: any = await fetchJson(
        `https://api.telegram.org/bot${tokenData.token}/setWebhook?url=${encodeURIComponent(args.url)}`,
        { signal: AbortSignal.timeout(15000) },
      );
      if (data.ok) {
        await ctx.runMutation(api.telegramBot._updateBotInfo, { webhookUrl: args.url });
      }
      return { success: data.ok as boolean, error: data.ok ? undefined : (data.description as string) };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "خطا" };
    }
  },
});

/** Get webhook info from Telegram */
export const getWebhookInfo = action({
  args: {},
  handler: async (ctx) => {
    const tokenData = await ctx.runQuery(api.telegramBot._getRawToken);
    if (!tokenData?.token) throw new Error("توکن یافت نشد.");

    try {
      const data: any = await fetchJson(
        `https://api.telegram.org/bot${tokenData.token}/getWebhookInfo`,
        { signal: AbortSignal.timeout(10000) },
      );

      if (data.ok && data.result) {
        const info = data.result;
        return {
          success: true,
          url: info.url || null,
          hasCustomCertificate: info.has_custom_certificate || false,
          pendingUpdateCount: info.pending_update_count || 0,
          lastErrorDate: info.last_error_date || null,
          lastErrorMessage: info.last_error_message || null,
          maxConnections: info.max_connections || 0,
          allowedUpdates: info.allowed_updates || [],
        };
      }
      return { success: false, error: data.description as string };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "خطا" };
    }
  },
});

/** Remove webhook */
export const removeWebhook = action({
  args: {},
  handler: async (ctx) => {
    const tokenData = await ctx.runQuery(api.telegramBot._getRawToken);
    if (!tokenData?.token) throw new Error("توکن یافت نشد.");

    try {
      const data: any = await fetchJson(
        `https://api.telegram.org/bot${tokenData.token}/deleteWebhook`,
        { signal: AbortSignal.timeout(10000) },
      );
      await ctx.runMutation(api.telegramBot._updateBotInfo, { webhookUrl: undefined });
      return { success: data.ok as boolean, error: data.ok ? undefined : (data.description as string) };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "خطا" };
    }
  },
});
