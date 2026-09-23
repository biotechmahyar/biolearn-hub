/**
 * Bale Bot webhook
 * ─────────────────────────────────────────────────────────────────────────────
 * `POST /bale/webhook` — receives updates from Bale for the Genova bot.
 * Registered with the official API: https://tapi.bale.ai/bot<token>/setWebhook
 *
 * Behaviour
 *   1. Only POST is accepted (the route is registered as POST).
 *   2. The body is parsed defensively; malformed JSON / non-object payloads are
 *      rejected with 400 and never reach any handler.
 *   3. Only supported update types are processed:
 *      `message`, `callback_query`, `web_app_data`, `pre_checkout_query`.
 *      Anything else (edited_message, channel_post, …) is acknowledged (200)
 *      and ignored.
 *   4. Responses are sent quickly and never contain secrets.
 *
 * Security (read this before extending the handler)
 *   Bale's `setWebhook` accepts only a `url` parameter — there is **no**
 *   signature/secret-token mechanism (unlike Mini App initData HMAC, which we
 *   verify in ./miniAppAuth). So a POST arriving here is *not* proof that it
 *   came from Bale. Consequently this endpoint must stay non-privileged:
 *     • no authentication, no user creation
 *     • account linking only consumes a one-time, short-lived, unused code
 *       that the *signed-in* user generated on the website (same table as the
 *       Telegram bot) — a payload alone can never link anything
 *     • no database writes beyond consuming that code
 *     • no payment approval (`pre_checkout_query` is deliberately ignored)
 *     • Bale ids from the payload are treated as external identifiers only
 *   Mini App authentication always goes through the validated
 *   `WebApp.initData` flow (see ./baleMiniAppAuth and ./miniAppAuth).
 *   `web_app_data` payloads are never used as identity.
 *
 *   Outbound effects: replying to `/start` with the configured welcome text
 *   (a non-privileged, static message), prompting for a linking code, and
 *   consuming a valid linking code. If Bale ever ships a webhook secret,
 *   verify it here before extending this handler.
 */

import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  getBaleWebhookInfo,
  sendBaleMessage,
  setBaleWebhook,
  type BaleApiCtx,
} from "./baleApi";

/** Update types this step knows about. Anything else is ignored safely. */
const SUPPORTED_UPDATE_TYPES = [
  "message",
  "callback_query",
  "web_app_data",
  "pre_checkout_query",
] as const;

type SupportedUpdateType = (typeof SUPPORTED_UPDATE_TYPES)[number];

/** Used only when no welcome text is configured. */
const DEFAULT_START_MESSAGE =
  "سلام! 👋\nبه Genova خوش آمدید.\n\nبرای استفاده از امکانات، مینی‌اپ را از منوی بازو باز کنید.";

interface BaleChat {
  id?: number;
  type?: string;
}

interface BaleUser {
  id?: number;
  first_name?: string;
  username?: string;
}

interface BaleMessage {
  message_id?: number;
  text?: string;
  chat?: BaleChat;
  from?: BaleUser;
  web_app_data?: { data?: string; button_text?: string };
}

interface BaleUpdate {
  update_id?: number;
  message?: BaleMessage;
  callback_query?: unknown;
  pre_checkout_query?: unknown;
  web_app_data?: { data?: string };
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Try to link the Bale account using a one-time code generated on the website.
 *
 * The code table is shared with the Telegram bot (created by the signed-in
 * user via telegramBot.generateLinkingCode). Validation happens twice: friendly
 * checks here for good error messages, then atomically again inside
 * baleBot._completeLinkingByCode.
 */
async function tryBaleLinkByCode(
  ctx: unknown,
  chatId: number,
  baleUser: BaleUser,
  rawCode: string,
): Promise<void> {
  if (typeof baleUser.id !== "number") return;
  const c = ctx as any;
  const apiCtx = ctx as unknown as BaleApiCtx;
  const send = (t: string) => sendBaleMessage(apiCtx, chatId, t);

  const code = rawCode.trim().toUpperCase();
  const codeDoc = await c.runQuery(internal.telegramBot._findLinkingCode, { code });
  if (!codeDoc) {
    await send("❌ کد اتصال معتبر نیست یا منقضی شده است.\n\nلطفاً از سایت کد جدید دریافت کنید.");
    return;
  }
  if (Date.now() > codeDoc.expiresAt) {
    await send("⏰ کد اتصال منقضی شده است.\n\nلطفاً از سایت کد جدید دریافت کنید.");
    return;
  }
  if (codeDoc.usedAt) {
    await send("⚠️ این کد قبلاً استفاده شده است.\n\nاگر می‌خواهید حساب جدیدی متصل کنید، از سایت کد جدید بگیرید.");
    return;
  }

  const existing = await c.runQuery(internal.baleBot._findUserByBaleId, { baleId: baleUser.id });
  if (existing && existing._id !== codeDoc.userId) {
    await send("⚠️ این حساب Bale قبلاً به حساب دیگری متصل شده است.\n\nبرای اتصال به حساب جدید، ابتدا اتصال قبلی را قطع کنید.");
    return;
  }
  if (existing && existing._id === codeDoc.userId) {
    await send(`✅ این حساب Bale قبلاً به حساب Genova شما متصل شده است.\n\nخوش آمدید ${baleUser.first_name ?? ""}!`);
    return;
  }

  const result = await c.runMutation(internal.baleBot._completeLinkingByCode, {
    codeId: codeDoc._id,
    baleId: baleUser.id,
    baleUsername: baleUser.username,
    baleFirstName: baleUser.first_name,
  });
  if (result?.success) {
    await send(`✅ حساب Bale شما با موفقیت به Genova متصل شد!\n\nخوش آمدید ${baleUser.first_name ?? ""}! 🎉`);
  } else {
    const reasons: Record<string, string> = {
      already_used: "⚠️ این کد قبلاً استفاده شده است.",
      expired: "⏰ این کد منقضی شده است.",
      already_linked: "⚠️ این حساب Bale قبلاً به حساب دیگری متصل شده.",
    };
    await send(reasons[result?.reason as string] || "❌ خطای نامشخص.");
  }
}

export const handleBaleWebhook = httpAction(async (ctx, request) => {
  // 1. Only POST updates are meaningful.
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
  }

  // 2. Read + parse the body safely.
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return jsonResponse({ ok: false, error: "unreadable_body" }, 400);
  }

  if (raw.trim().length === 0) {
    return jsonResponse({ ok: false, error: "empty_body" }, 400);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return jsonResponse({ ok: false, error: "malformed_json" }, 400);
  }

  if (!isRecord(parsed)) {
    return jsonResponse({ ok: false, error: "invalid_payload" }, 400);
  }

  const update = parsed as BaleUpdate;

  // 3. Structural validation: a real Bale update always carries update_id.
  if (typeof update.update_id !== "number") {
    return jsonResponse({ ok: false, error: "invalid_update" }, 400);
  }

  // 4. Route by the first supported field present.
  const type = SUPPORTED_UPDATE_TYPES.find((candidate) =>
    isRecord(update[candidate as keyof BaleUpdate]),
  ) as SupportedUpdateType | undefined;

  if (!type) {
    // Unsupported update type — acknowledge so Bale stops retrying.
    return jsonResponse({ ok: true, ignored: true });
  }

  if (type === "callback_query") {
    // Only the linking-code prompt has a button; everything else is
    // acknowledged without any side effect.
    const cq = update.callback_query as
      | { data?: unknown; message?: { chat?: { id?: unknown } } }
      | undefined;
    const data = typeof cq?.data === "string" ? cq.data : "";
    const cbChatId = cq?.message?.chat?.id;
    if (data === "cmd_enter_code" && typeof cbChatId === "number") {
      await sendBaleMessage(
        ctx as unknown as BaleApiCtx,
        cbChatId,
        "🔑 لطفاً کد اتصال حساب خود را ارسال کنید:\n\n(کد ۸ کاراکتری که از بخش پروفایل سایت دریافت کرده‌اید)",
      );
      return jsonResponse({ ok: true, type });
    }
    return jsonResponse({ ok: true, type });
  }

  if (type === "pre_checkout_query") {
    // Payments are not implemented. Never approve a checkout here.
    return jsonResponse({ ok: true, type, ignored: true });
  }

  if (type === "web_app_data") {
    // Mini App button payloads are NOT identity proof and must never create or
    // authenticate a user. Parsed for structure only; contents are not stored
    // and not logged.
    return jsonResponse({ ok: true, type });
  }

  // ── message ──────────────────────────────────────────────────────────────
  const message = (update.message ?? {}) as BaleMessage;

  // `web_app_data` arrives nested inside the message on both messengers.
  if (isRecord(message.web_app_data)) {
    return jsonResponse({ ok: true, type: "web_app_data" });
  }

  const chatId = message.chat?.id;
  if (typeof chatId !== "number") {
    return jsonResponse({ ok: true, type, ignored: true });
  }

  const text = typeof message.text === "string" ? message.text.trim() : "";
  const isStart = text === "/start" || text.startsWith("/start ");

  // `/start <CODE>` — direct linking with a code from the website.
  if (isStart && message.from) {
    const startCode = text.split(/\s+/)[1]?.trim();
    if (startCode && startCode.length >= 6) {
      await tryBaleLinkByCode(ctx, chatId, message.from, startCode);
      return jsonResponse({ ok: true, type });
    }
  }

  const isHelp = text === "/help";

  if (isStart || isHelp) {
    const config = (await ctx.runQuery(internal.baleBot._getBotRuntimeConfig, {})) as {
      configured: boolean;
      active: boolean;
      startMessage: string | null;
      botUsername?: string | null;
      siteUrl?: string | null;
    } | null;

    if (config?.configured && config.active) {
      // Non-privileged, static welcome text. Failures are swallowed: the
      // webhook must still acknowledge the update.
      const siteUrl = config.siteUrl ?? process.env.SITE_URL ?? "";
      const miniAppUrl = siteUrl ? `${siteUrl.replace(/\/+$/, "")}/mini` : "";
      const botUsername = config.botUsername ?? "";

      // Build the persistent reply keyboard (like Telegram) + mini app button
      const replyKeyboard = {
        keyboard: [
          [
            { text: "\u{1F916} هوش مصنوعی" },
            { text: "\u{1F4AC} ثبت س\u0648\u0627\u0644" },
          ],
          [
            { text: "\u{1F464} پروفایل" },
            { text: "\u{1F4B0} اشتراک و سکه" },
          ],
          [
            { text: "\u{1F517} معرفی به دوستان (سکه رایگان)" },
          ],
          [
            {
              text: "\u{1F680} باز کردن Genova",
              web_app: miniAppUrl ? { url: miniAppUrl } : undefined,
            },
          ],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      };

      await sendBaleMessage(
        ctx as unknown as BaleApiCtx,
        chatId,
        config.startMessage ?? DEFAULT_START_MESSAGE,
        { reply_markup: replyKeyboard },
      );

      // Prompt for the linking code when this Bale user is not linked yet.
      const linkedUser = message.from?.id
        ? await (ctx as any).runQuery(internal.baleBot._findUserByBaleId, { baleId: message.from.id })
        : null;
      if (!linkedUser) {
        await sendBaleMessage(
          ctx as unknown as BaleApiCtx,
          chatId,
          "🔑 آیا کد اتصال حساب دارید؟\n\nاگر کد اتصال از سایت دریافت کرده‌اید، دکمه زیر را بزنید و کد را بفرستید.",
          { reply_markup: { inline_keyboard: [[{ text: "🔑 کد دارم", callback_data: "cmd_enter_code" }]] } },
        );
      }
    }
  }

  // ── Reply-keyboard button routing ──────────────────────────────────────
  const replyButtonMap: Record<string, string> = {
    "\u{1F916} هوش مصنوعی": "برای استفاده از هوش مصنوعی، ابتدا حساب خود را در سایت Genova متصل کنید و سپس از بخش چت‌بات استفاده کنید.",
    "\u{1F4AC} ثبت سؤال": "برای ثبت سؤال، لطفاً سؤال خود را مستقیماً تایپ کنید تا برای مدیران ارسال شود.",
    "\u{1F464} پروفایل": "برای مشاهده پروفایل خود، وارد مینی‌اپ Genova شوید.",
    "\u{1F4B0} اشتراک و سکه": "برای مشاهده اشتراک و سکه‌های خود، وارد مینی‌اپ Genova شوید.",
    "\u{1F517} معرفی به دوستان (سکه رایگان)": "برای دریافت لینک دعوت و کسب سکه رایگان، وارد مینی‌اپ Genova شوید.",
  };

  const replyResponse = replyButtonMap[text];
  if (replyResponse) {
    await sendBaleMessage(
      ctx as unknown as BaleApiCtx,
      chatId,
      replyResponse,
    );
    return jsonResponse({ ok: true, type });
  }

  // One-time linking code entry (8 chars generated on the website profile).
  if (/^[A-Za-z0-9]{8}$/.test(text) && message.from) {
    await tryBaleLinkByCode(ctx, chatId, message.from, text);
    return jsonResponse({ ok: true, type });
  }

  // Every other message is acknowledged and ignored — no privileged work is
  // performed from an unverified webhook payload.
  return jsonResponse({ ok: true, type });
});

/**
 * GET /bale/setup-webhook
 *
 * One-time setup endpoint: registers this deployment's webhook with Bale using
 * the server-side token. Mirrors the existing Telegram setup endpoint.
 *
 * The URL is derived from configuration (`BALE_WEBHOOK_BASE_URL` or Convex's own
 * `CONVEX_SITE_URL`) and never from caller input, so it cannot become an open
 * redirect, and the response never contains the token. Bale has no webhook
 * secret, so this endpoint reveals nothing an attacker could not already guess
 * (`/bale/webhook`) — it only points Bale at the current deployment.
 */
export const setupBaleWebhookOnce = httpAction(async (ctx) => {
  const base = process.env.BALE_WEBHOOK_BASE_URL ?? process.env.CONVEX_SITE_URL;
  if (!base) {
    return jsonResponse({ ok: false, error: "CONVEX_SITE_URL is not configured." }, 500);
  }

  const webhookUrl = `${base.replace(/\/+$/, "")}/bale/webhook`;
  const setResult = await setBaleWebhook(ctx as unknown as BaleApiCtx, webhookUrl);
  const infoResult = await getBaleWebhookInfo(ctx as unknown as BaleApiCtx);

  // Record the outcome on the existing bot config row (no schema changes).
  await ctx.runMutation(internal.baleBot._updateBotInfo, {
    webhookUrl: setResult.ok ? webhookUrl : undefined,
    connected: setResult.ok,
    lastTestResult: setResult.ok ? "success" : setResult.error,
  });

  // Always answer 200 so the caller can read the real reason: a 5xx status is
  // replaced by the CDN's own error page, which would hide the actual error.
  // The `ok` flag in the body is the source of truth here.
  return jsonResponse({
    ok: setResult.ok,
    webhookUrl,
    setWebhook: setResult,
    webhookInfo: infoResult,
    hint: setResult.ok
      ? undefined
      : "اگر خطای توکن دیدید، BALE_BOT_TOKEN را در متغیرهای محیطی Convex تنظیم کنید.",
  });
});
