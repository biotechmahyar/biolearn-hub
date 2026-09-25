/**
 * Bale Bot API layer (server-side only)
 * ─────────────────────────────────────────────────────────────────────────────
 * Bale's Bot API mirrors Telegram's: every method is called as
 *
 *   https://tapi.bale.ai/bot<token>/METHOD_NAME
 *
 * using GET/POST with JSON bodies, and answers with `{ ok, result | description }`.
 * Docs: https://docs.bale.ai
 *
 * Deliberately small: only the operations this project needs right now
 * (setWebhook / deleteWebhook / getWebhookInfo / sendMessage). It is not a full
 * Bale Bot API client.
 *
 * Security
 *   - The bot token comes from `BALE_BOT_TOKEN` (env) or the admin-configured
 *     bot row, read through an internal query. It never leaves the server.
 *   - The token is never included in returned values, thrown errors, or logs:
 *     errors surface only the HTTP status and Bale's `description`.
 *
 * Runtime note: this module has no "use node" directive so it can be imported
 * by both the V8 runtime (webhook httpAction) and "use node" action files.
 */

import { internal } from "./_generated/api";

/** Centralised Bale Bot API base URL — the single place the host is defined. */
export const BALE_API_BASE_URL = "https://tapi.bale.ai";

/** Minimal runner surface: anything able to run an internal query. */
export interface BaleApiCtx {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runQuery: (fn: any, args?: any) => Promise<any>;
}

/** Result of a Bale Bot API call — never contains the token. */
export type BaleApiResult<T = unknown> =
  | { ok: true; result: T }
  | { ok: false; error: string };

/** Options accepted by {@link sendBaleMessage}. */
export interface BaleSendMessageOptions {
  /** "HTML" | "Markdown" | "MarkdownV2" depending on what Bale supports. */
  parse_mode?: string;
  /** Inline keyboard / reply keyboard markup (caller-provided JSON). */
  reply_markup?: unknown;
  disable_notification?: boolean;
}

/**
 * Read the Bale bot token, server-side only.
 * Returns null when nothing is configured.
 */
export async function getBaleBotToken(ctx: BaleApiCtx): Promise<string | null> {
  const data = (await ctx.runQuery(internal.baleBot._getRawToken, {})) as
    | { token?: string }
    | null;
  const token = data?.token;
  return typeof token === "string" && token.length > 0 ? token : null;
}

/**
 * Perform one Bale Bot API method call.
 *
 * Fails safely: a missing token, a network failure, a non-JSON response or an
 * `ok: false` answer all come back as `{ ok: false, error }` instead of
 * throwing, and none of those paths can leak the token.
 */
export async function baleApiCall<T = unknown>(
  ctx: BaleApiCtx,
  method: string,
  payload?: Record<string, unknown>,
): Promise<BaleApiResult<T>> {
  const token = await getBaleBotToken(ctx);
  if (!token) {
    return { ok: false, error: "توکن بازوی بله تنظیم نشده است." };
  }

  const url = `${BALE_API_BASE_URL}/bot${token}/${method}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
      signal: AbortSignal.timeout(15000),
    });

    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; result?: unknown; description?: string; error_code?: number }
      | null;

    if (!data || typeof data !== "object") {
      return { ok: false, error: `پاسخ نامعتبر از سرور بله (HTTP ${response.status}).` };
    }

    if (data.ok === true) {
      return { ok: true, result: data.result as T };
    }

    const description =
      typeof data.description === "string" && data.description.length > 0
        ? data.description
        : `خطای API بله (HTTP ${response.status})`;
    return { ok: false, error: description };
  } catch (err) {
    // Note: only the message is surfaced — never the request URL (which
    // contains the token).
    const message = err instanceof Error ? err.message : "خطای شبکه در ارتباط با بله.";
    return { ok: false, error: message };
  }
}

// ── Concrete operations ────────────────────────────────────────────────────

/**
 * Send a text message to a Bale chat.
 *
 * Internal/server-side helper for later notification steps — there is
 * intentionally no UI for sending messages.
 */
export async function sendBaleMessage(
  ctx: BaleApiCtx,
  chatId: number | string,
  text: string,
  options?: BaleSendMessageOptions,
): Promise<BaleApiResult<unknown>> {
  return await baleApiCall(ctx, "sendMessage", {
    chat_id: chatId,
    text,
    ...(options ?? {}),
  });
}

/** Register the webhook URL Bale should POST updates to. */
export async function setBaleWebhook(
  ctx: BaleApiCtx,
  webhookUrl: string,
): Promise<BaleApiResult<unknown>> {
  return await baleApiCall(ctx, "setWebhook", { url: webhookUrl });
}

/** Current webhook status as reported by Bale. */
export async function getBaleWebhookInfo(
  ctx: BaleApiCtx,
): Promise<BaleApiResult<Record<string, unknown>>> {
  return await baleApiCall<Record<string, unknown>>(ctx, "getWebhookInfo");
}

/** Remove the webhook (useful when switching back to getUpdates). */
export async function deleteBaleWebhook(ctx: BaleApiCtx): Promise<BaleApiResult<unknown>> {
  return await baleApiCall(ctx, "deleteWebhook");
}

/** Acknowledge an inline-button click so Bale leaves the button loading state. */
export async function answerBaleCallbackQuery(
  ctx: BaleApiCtx,
  callbackQueryId: string,
  text?: string,
): Promise<BaleApiResult<unknown>> {
  return await baleApiCall(ctx, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

/** Register the slash commands shown in Bale's bot command menu. */
export async function setBaleCommands(
  ctx: BaleApiCtx,
  commands: Array<{ command: string; description: string }>,
): Promise<BaleApiResult<unknown>> {
  return await baleApiCall(ctx, "setMyCommands", { commands });
}
