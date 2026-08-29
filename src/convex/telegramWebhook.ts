import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

// ── Telegram Webhook Handler ─────────────────────────────────────────────────
// This is a PUBLIC httpAction — Telegram sends POST requests here.
// No auth required (Telegram doesn't send Convex auth tokens).

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

export const handleTelegramWebhook = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await request.json();
    const message = body?.message;

    if (!message) {
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat?.id;
    const text = (message.text || "").trim();
    const telegramId = message.from?.id;
    const firstName = message.from?.first_name || "کاربر";
    const username = message.from?.username;

    if (!chatId || !telegramId) {
      return new Response("OK", { status: 200 });
    }

    // Get the bot token from database
    const bots = await ctx.runQuery(api.telegramBot.getBotConfigPublic);
    if (!bots || bots.length === 0) {
      return new Response("OK", { status: 200 });
    }

    const bot = bots[0];
    const token = bot.token;

    if (!token) {
      return new Response("OK", { status: 200 });
    }

    // ── Handle /start with optional linking code ──────────────────────────
    if (text.startsWith("/start")) {
      const parts = text.split(/\s+/);
      const code = parts[1]?.trim().toUpperCase();

      // If a linking code was provided, try to link accounts
      if (code && code.length >= 6) {
        const codeDoc = await ctx.runQuery(api.telegramBot._findLinkingCode, { code });

        if (!codeDoc) {
          await sendTelegramMessage(token, chatId,
            "❌ لینک اتصال معتبر نیست یا منقضی شده است.\n\nلطفاً از سایت کد جدید دریافت کنید."
          );
          return new Response("OK", { status: 200 });
        }

        // Check expiry
        if (Date.now() > codeDoc.expiresAt) {
          await sendTelegramMessage(token, chatId,
            "⏰ لینک اتصال منقضی شده است.\n\nلطفاً از سایت کد جدید دریافت کنید."
          );
          return new Response("OK", { status: 200 });
        }

        // Check if already used
        if (codeDoc.usedAt) {
          await sendTelegramMessage(token, chatId,
            "⚠️ این لینک اتصال قبلاً استفاده شده است.\n\nاگر می‌خواهید حساب جدیدی متصل کنید، از سایت کد جدید دریافت کنید."
          );
          return new Response("OK", { status: 200 });
        }

        // Check if this Telegram account is already linked to someone
        const existingUser = await ctx.runQuery(api.telegramBot._findUserByTelegramId, { telegramId });
        if (existingUser && existingUser._id !== codeDoc.userId) {
          await sendTelegramMessage(token, chatId,
            "⚠️ این حساب Telegram قبلاً به حساب دیگری در Genova متصل شده است.\n\nبرای اتصال به حساب جدید، ابتدا اتصال قبلی را از سایت قطع کنید."
          );
          return new Response("OK", { status: 200 });
        }

        // If already linked to the same user
        if (existingUser && existingUser._id === codeDoc.userId) {
          await sendTelegramMessage(token, chatId,
            `✅ این حساب Telegram قبلاً به حساب Genova شما متصل شده است.\n\nخوش آمدید ${firstName}!`
          );
          return new Response("OK", { status: 200 });
        }

        // Complete the linking
        const result = await ctx.runMutation(api.telegramBot._completeLinking, {
          codeId: codeDoc._id,
          telegramId,
          telegramUsername: username,
          telegramFirstName: firstName,
        });

        if (result.success) {
          await sendTelegramMessage(token, chatId,
            `✅ حساب Telegram شما با موفقیت به Genova متصل شد!\n\nخوش آمدید ${firstName}! 🎉`
          );
        } else {
          const reasons: Record<string, string> = {
            already_used: "⚠️ این لینک قبلاً استفاده شده است.",
            expired: "⏰ این لینک منقضی شده است.",
            already_linked: "⚠️ این حساب Telegram قبلاً به حساب دیگری متصل شده.",
          };
          await sendTelegramMessage(token, chatId,
            reasons[result.reason] || "❌ خطای نامشخص."
          );
        }

        return new Response("OK", { status: 200 });
      }

      // Normal /start without code — send welcome message
      const welcomeMsg = bot.startMessage || `سلام ${firstName}! 👋\nبه Genova خوش آمدید.\n\nبرای شروع یکی از دستورات زیر را ارسال کنید:`;
      await sendTelegramMessage(token, chatId, welcomeMsg);
      return new Response("OK", { status: 200 });
    }

    // For any other text, send a generic "unknown command" message
    if (text.startsWith("/")) {
      await sendTelegramMessage(token, chatId,
        `دستور «${text}» شناسایی نشد.\n\nبرای شروع /start را ارسال کنید.`
      );
    }

    return new Response("OK", { status: 200 });
  } catch (err: unknown) {
    console.error("Telegram webhook error:", err);
    return new Response("OK", { status: 200 });
  }
});
