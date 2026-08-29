import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * GET /telegram/setup-webhook
 * One-time endpoint: reads bot token from DB, sets webhook to this Convex site.
 * After use, this endpoint can be removed.
 */
export const setupWebhookOnce = httpAction(async (ctx) => {
  try {
    // Get bot config from DB
    const bots = await ctx.runQuery(api.telegramBot.getBotConfigPublic);
    if (!bots || bots.length === 0 || !bots[0].token) {
      return new Response("No bot token configured", { status: 400 });
    }

    const token = bots[0].token;

    // Build webhook URL from Convex site URL
    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!siteUrl) {
      return new Response("CONVEX_SITE_URL not set in Convex environment", { status: 500 });
    }

    const webhookUrl = `${siteUrl}/telegram/webhook`;

    // Call Telegram setWebhook API
    const resp = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&drop_pending_updates=true`,
      { signal: AbortSignal.timeout(15000) },
    );
    const data = await resp.json();

    // Get webhook info to verify
    const infoResp = await fetch(
      `https://api.telegram.org/bot${token}/getWebhookInfo`,
      { signal: AbortSignal.timeout(10000) },
    );
    const info = await infoResp.json();

    return new Response(
      JSON.stringify({
        setWebhook: data,
        webhookInfo: info.result,
        webhookUrl,
      }, null, 2),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
