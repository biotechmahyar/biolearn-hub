/**
 * AI Actions — "use node" for external API calls.
 *
 * Flow: React → Convex Action → AI Provider → Convex Action → React
 *
 * The API key is read from the DB via a query call, never exposed to the client.
 * We use `ctx.runQuery` with a FunctionReference to avoid circular type imports.
 */

"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import type { FunctionReference } from "convex/server";

const PROVIDER_URLS: Record<string, string> = {
  gapgpt: "https://api.gapgpt.app/v1/chat/completions",
};

// Reference to the query that returns the stored API key.
// Using a string-based FunctionReference avoids circular type deps in
// the generated api module (which includes this very file).
const getConfigRef: FunctionReference<"query", "internal"> =
  "ai:getConfigForAction" as unknown as FunctionReference<"query", "internal">;

/** Read the stored API key server-side. Never exposed to the client. */
async function getStoredConfig(ctx: any): Promise<{
  apiKey: string;
  provider: string;
  model: string;
}> {
  const meta = await ctx.runQuery(getConfigRef);
  if (!meta || !meta.apiKey) {
    throw new Error(
      "کلید API تنظیم نشده است. مدیر سایت ابتدا کلید را ذخیره کند.",
    );
  }
  return meta;
}

// ── Chat Completion ───────────────────────────────────────────────────

export const chatCompletion = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(
          v.literal("user"),
          v.literal("assistant"),
          v.literal("system"),
        ),
        content: v.string(),
      }),
    ),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ content: string }> => {
    const meta = await getStoredConfig(ctx);
    const model: string = args.model || meta.model || "gapgpt-qwen-3.5";
    const provider: string = meta.provider || "gapgpt";
    const baseUrl: string = PROVIDER_URLS[provider] || PROVIDER_URLS.gapgpt;

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${meta.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: args.messages,
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`خطای AI (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data: any = await res.json();
    return {
      content: data.choices?.[0]?.message?.content ?? "پاسخی دریافت نشد.",
    };
  },
});

// ── Test Connection ───────────────────────────────────────────────────

export const testConnection = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    connected: boolean;
    provider: string;
    message: string;
    testedAt: string;
  }> => {
    const meta = await getStoredConfig(ctx).catch(() => null);
    if (!meta) {
      return {
        connected: false,
        provider: "unknown",
        message: "کلید API ذخیره نشده است.",
        testedAt: new Date().toISOString(),
      };
    }

    const provider: string = meta.provider || "gapgpt";
    const baseUrl: string = PROVIDER_URLS[provider] || PROVIDER_URLS.gapgpt;

    try {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${meta.apiKey}`,
        },
        body: JSON.stringify({
          model: "gapgpt-qwen-3.5",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 10,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return {
          connected: false,
          provider,
          message: `خطای ${res.status}: ${errText.slice(0, 150)}`,
          testedAt: new Date().toISOString(),
        };
      }

      return {
        connected: true,
        provider,
        message: "اتصال با موفقیت برقرار شد.",
        testedAt: new Date().toISOString(),
      };
    } catch {
      return {
        connected: false,
        provider,
        message: "خطا در اتصال به سرور.",
        testedAt: new Date().toISOString(),
      };
    }
  },
});
