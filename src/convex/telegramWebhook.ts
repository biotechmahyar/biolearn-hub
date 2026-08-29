import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

// ── Telegram Webhook Handler ─────────────────────────────────────────────────
// This is a PUBLIC httpAction — Telegram sends POST requests here.
// No auth required (Telegram doesn't send Convex auth tokens).

export const handleTelegramWebhook = httpAction(async (ctx, request) => {
  // Only accept POST
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await request.json();

    // Telegram sends an "update" object
    // https://core.telegram.org/bots/api#update
    const message = body?.message;

    if (!message) {
      // Not a message update (e.g., callback_query, inline_query) — ignore
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat?.id;
    const text = (message.text || "").trim();
    const firstName = message.from?.first_name || "کاربر";

    if (!chatId) {
      return new Response("OK", { status: 200 });
    }

    // Get the bot token from database
    const bots = await ctx.runQuery(api.telegramBot.getBotConfigPublic);
    if (!bots || bots.length === 0) {
      // No bot configured — nothing to do
      return new Response("OK", { status: 200 });
    }

    const bot = bots[0];
    const token = bot.token;

    if (!token) {
      return new Response("OK", { status: 200 });
    }

    // Handle commands
    if (text === "/start") {
      const welcomeMsg = bot.startMessage || `سلام ${firstName}! 👋\nبه Genova خوش آمدید.\n\nبرای شروع یکی از دستورات زیر را ارسال کنید:`;

      // Send welcome message via Telegram API
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeMsg,
          parse_mode: "HTML",
        }),
      });

      return new Response("OK", { status: 200 });
    }

    // For any other text, send a generic "unknown command" message
    if (text.startsWith("/")) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `دستور «${text}» شناسایی نشد.\n\nبرای شروع /start را ارسال کنید.`,
        }),
      });
    }

    return new Response("OK", { status: 200 });
  } catch (err: unknown) {
    console.error("Telegram webhook error:", err);
    // Always return 200 to Telegram to prevent retries
    return new Response("OK", { status: 200 });
  }
});
