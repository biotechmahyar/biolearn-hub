"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ── AI Provider call ────────────────────────────────────────────────────────

/**
 * Call the configured AI provider and save the response to the conversation.
 * This action runs server-side (Node.js) so the API key never reaches the browser.
 */
export const callAI = action({
  args: {
    conversationId: v.id("aiConversations"),
    modelId: v.optional(v.id("aiModels")),
  },
  handler: async (ctx, args) => {
    // Read AI config via internal query (API key stays server-side)
    const rawConfig: any = await ctx.runQuery(internal.aiChat.getAIConfigRaw, { modelId: args.modelId ?? undefined });

    if (!rawConfig || !rawConfig.apiKey) {
      // No AI configured — save a helpful message
      await ctx.runMutation(internal.aiChat.saveAIMessage, {
        conversationId: args.conversationId,
        content:
          "هوش مصنوعی هنوز توسط مدیر سایت پیکربندی نشده است. لطفاً منتظر بمانید تا کلید API تنظیم شود.",
      });
      return;
    }

    const { apiKey, baseUrl, model, provider, temperature, maxTokensPerRequest } = rawConfig;

    // Build message history from DB
    const messages = await ctx.runQuery(internal.aiChat.getConversationMessagesInternal, {
      conversationId: args.conversationId,
    });

    const chatMessages = [
      { role: "system" as const, content: rawConfig.systemPrompt || "شما یک دستیار تخصصی علوم زیستی هستید." },
      ...messages.map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    try {
      let responseText = "";

      if (provider === "anthropic") {
        const resp = await fetch(`${baseUrl}/v1/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTokensPerRequest,
            temperature,
            messages: chatMessages.filter((m) => m.role !== "system"),
            system: chatMessages.find((m) => m.role === "system")?.content ?? "",
          }),
        });
        const data = await resp.json() as any;
        if (data.error) {
          throw new Error(data.error.message ?? "Anthropic API error");
        }
        responseText = data.content?.[0]?.text ?? "پاسخی دریافت نشد.";
      } else if (provider === "google") {
        const contents = chatMessages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));
        const resp = await fetch(
          `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature,
                maxOutputTokens: maxTokensPerRequest,
              },
            }),
          }
        );
        const data = await resp.json() as any;
        if (data.error) {
          throw new Error(data.error.message ?? "Google AI error");
        }
        responseText =
          data.candidates?.[0]?.content?.parts?.[0]?.text ?? "پاسخی دریافت نشد.";
      } else {
        // OpenAI-compatible API (openai, gapgpt, custom)
        const resp = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: chatMessages,
            temperature,
            max_tokens: maxTokensPerRequest,
          }),
        });
        const data = await resp.json() as any;
        if (data.error) {
          throw new Error(data.error.message ?? "API error");
        }
        responseText =
          data.choices?.[0]?.message?.content ?? "پاسخی دریافت نشد.";
      }

      // Save the AI response
      await ctx.runMutation(internal.aiChat.saveAIMessage, {
        conversationId: args.conversationId,
        content: responseText,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "خطای ناشناخته";
      console.error("AI call failed:", msg);
      // Save error message so the user sees feedback
      await ctx.runMutation(internal.aiChat.saveAIMessage, {
        conversationId: args.conversationId,
        content: `خطا در اتصال به هوش مصنوعی: ${msg}`,
      });
    }
  },
});



// ── Test Connection ─────────────────────────────────────────────────────────

/**
 * Test the AI API connection with a minimal request.
 * Returns safe metadata only — never exposes the API key.
 */
export const testConnection = action({
  args: { modelId: v.optional(v.id("aiModels")), apiKey: v.optional(v.string()), baseUrl: v.optional(v.string()), provider: v.optional(v.string()), model: v.optional(v.string()) },
  handler: async (
    ctx,
    args
  ): Promise<{
    connected: boolean;
    message: string;
    provider: string | null;
    model: string | null;
    testedAt?: string;
  }> => {
    let apiKey = args.apiKey;
    let baseUrl = args.baseUrl;
    let provider = args.provider;
    let model = args.model;
    
    if (!apiKey) {
      const rawConfig: any = await ctx.runQuery(internal.aiChat.getAIConfigRaw, { modelId: args.modelId ?? undefined });
      if (rawConfig) {
        apiKey = rawConfig.apiKey;
        baseUrl = rawConfig.baseUrl;
        provider = rawConfig.provider;
        model = rawConfig.model;
      }
    }
    
    if (!apiKey || !baseUrl || !model || !provider) {
      return {
        connected: false,
        message: "کلید API تنظیم نشده است.",
        provider: provider ?? null,
        model: model ?? null,
      };
    }
    const testedAt = new Date().toISOString();

    try {
      if (provider === "anthropic") {
        const resp = await fetch(`${baseUrl}/v1/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 10,
            messages: [{ role: "user", content: "Hi" }],
          }),
        });
        if (!resp.ok) {
          const err = await resp.text();
          return {
            connected: false,
            message: `خطای HTTP ${resp.status}: ${err.slice(0, 100)}`,
            provider,
            model,
            testedAt,
          };
        }
        return { connected: true, message: "اتصال موفق", provider, model, testedAt };
      } else if (provider === "google") {
        const resp = await fetch(
          `${baseUrl}/v1beta/models/${model}?key=${apiKey}`
        );
        if (!resp.ok) {
          const err = await resp.text();
          return {
            connected: false,
            message: `خطای HTTP ${resp.status}: ${err.slice(0, 100)}`,
            provider,
            model,
            testedAt,
          };
        }
        return { connected: true, message: "اتصال موفق", provider, model, testedAt };
      } else {
        // OpenAI-compatible
        const resp = await fetch(`${baseUrl}/models`, {
          method: "GET",
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!resp.ok) {
          const err = await resp.text();
          return {
            connected: false,
            message: `خطای HTTP ${resp.status}: ${err.slice(0, 100)}`,
            provider,
            model,
            testedAt,
          };
        }
        return { connected: true, message: "اتصال موفق", provider, model, testedAt };
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "خطای ناشناخته";
      return {
        connected: false,
        message: `خطا در اتصال: ${msg}`,
        provider,
        model,
        testedAt,
      };
    }
  },
});

// ── AI Question Generation ─────────────────────────────────────────────────

export interface GeneratedQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: number;
}

/**
 * Generate exam questions using AI based on a prompt.
 * Returns structured questions for admin preview before saving.
 */
export const generateQuestions = action({
  args: {
    prompt: v.string(),
    count: v.number(),
    difficulty: v.number(),
    modelId: v.optional(v.id("aiModels")),
  },
  handler: async (ctx, args): Promise<{ questions: GeneratedQuestion[]; raw: string }> => {
    const rawConfig: any = await ctx.runQuery(internal.aiChat.getAIConfigRaw, { modelId: args.modelId ?? undefined });

    if (!rawConfig || !rawConfig.apiKey) {
      throw new Error("هوش مصنوعی پیکربندی نشده است. ابتدا API key را تنظیم کنید.");
    }

    const { apiKey, baseUrl, model, provider, temperature } = rawConfig;

    const systemPrompt = `شما یک متخصص طراحی سؤال امتحانی در حوزه علوم زیستی هستید.

قوانین:
- سؤالات باید دقیق، علمی و بدون ابهام باشند.
- هر سؤال باید ۴ گزینه داشته باشد.
- فقط یک گزینه صحیح باشد.
- توضیح باید علمی و دقیق باشد.
- از اصطلاحات تخصصی صحیح استفاده کنید.

پاسخ را دقیقاً به این فرمت JSON برگردانید (بدون متن اضافی):
[
  {
    "text": "متن سؤال",
    "options": ["گزینه ۱", "گزینه ۲", "گزینه ۳", "گزینه ۴"],
    "correctIndex": 0,
    "explanation": "توضیح علمی صحیح بودن پاسخ و چرا بقیه غلط هستند",
    "difficulty": ${args.difficulty}
  }
]

فقط آرایه JSON برگردانید، هیچ متن دیگری اضافه نکنید.`;

    const userPrompt = `${args.prompt}\n\nتعداد سؤالات مورد نیاز: ${args.count}\nسطح دشواری: ${args.difficulty} (۱=آسان، ۲=متوسط، ۳=سخت)`;

    let responseText = "";

    try {
      if (provider === "anthropic") {
        const resp = await fetch(`${baseUrl}/v1/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            temperature: temperature ?? 0.7,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
          }),
        });
        const data = await resp.json() as any;
        if (data.error) throw new Error(data.error.message ?? "AI error");
        responseText = data.content?.[0]?.text ?? "";
      } else if (provider === "google") {
        const resp = await fetch(
          `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
              generationConfig: { temperature: temperature ?? 0.7, maxOutputTokens: 4096 },
            }),
          }
        );
        const data = await resp.json() as any;
        if (data.error) throw new Error(data.error.message ?? "AI error");
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      } else {
        // OpenAI-compatible
        const resp = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: temperature ?? 0.7,
            max_tokens: 4096,
          }),
        });
        const data = await resp.json() as any;
        if (data.error) throw new Error(data.error.message ?? "AI error");
        responseText = data.choices?.[0]?.message?.content ?? "";
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "خطای ناشناخته";
      throw new Error(`خطا در فراخوانی هوش مصنوعی: ${msg}`);
    }

    // Parse JSON response
    try {
      // Extract JSON array from response (may be wrapped in markdown code block)
      let jsonStr = responseText.trim();
      const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      const questions: GeneratedQuestion[] = JSON.parse(jsonStr);

      // Validate each question
      const validated = questions.filter((q) => {
        return (
          q.text &&
          Array.isArray(q.options) &&
          q.options.length >= 2 &&
          typeof q.correctIndex === "number" &&
          q.correctIndex >= 0 &&
          q.correctIndex < q.options.length &&
          q.explanation
        );
      });

      if (validated.length === 0) {
        throw new Error("هوش مصنوعی سؤالات معتبری تولید نکرد. لطفاً دوباره تلاش کنید.");
      }

      return { questions: validated, raw: responseText };
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        throw new Error("پاسخ هوش مصنوعی قابل پردازش نیست. لطفاً دوباره تلاش کنید.");
      }
      throw parseError;
    }
  },
});

// ── AI Article Generation ──────────────────────────────────────────────────

export interface GeneratedArticle {
  title: string;
  category: string;
  excerpt: string;
  body: string;
}

/**
 * Generate free articles using AI based on a prompt.
 * Returns structured articles for admin preview before saving.
 */
export const generateArticles = action({
  args: {
    prompt: v.string(),
    count: v.number(),
    category: v.string(),
    modelId: v.optional(v.id("aiModels")),
  },
  handler: async (ctx, args): Promise<{ articles: GeneratedArticle[]; raw: string }> => {
    const rawConfig: any = await ctx.runQuery(internal.aiChat.getAIConfigRaw, { modelId: args.modelId ?? undefined });

    if (!rawConfig || !rawConfig.apiKey) {
      throw new Error("هوش مصنوعی پیکربندی نشده است. ابتدا API key را تنظیم کنید.");
    }

    const { apiKey, baseUrl, model, provider, temperature } = rawConfig;

    const systemPrompt = `شما یک متخصص تولید محتوای آموزشی در حوزه علوم زیستی هستید.

قوانین:
- مقالات باید علمی، دقیق و قابل فهم برای دانشجویان باشند.
- هر مقاله باید عنوان جذاب، خلاصه کوتاه و متن کامل داشته باشد.
- از اصطلاحات تخصصی صحیح استفاده کنید.
- مقالات باید آموزشی و مفید باشند.

پاسخ را دقیقاً به این فرمت JSON برگردانید (بدون متن اضافی):
[
  {
    "title": "عنوان مقاله",
    "category": "دسته‌بندی",
    "excerpt": "خلاصه کوتاه برای کارت مقاله",
    "body": "متن کامل مقاله با پاراگراف‌ها جدا شده با خط خالی"
  }
]

فقط آرایه JSON برگردانید، هیچ متن دیگری اضافه نکنید.`;

    const userPrompt = `${args.prompt}\n\nتعداد مقالات مورد نیاز: ${args.count}\nدسته‌بندی: ${args.category || 'عمومی'}`;

    let responseText = "";

    try {
      if (provider === "anthropic") {
        const resp = await fetch(`${baseUrl}/v1/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            temperature: temperature ?? 0.7,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
          }),
        });
        const data = await resp.json() as any;
        if (data.error) throw new Error(data.error.message ?? "AI error");
        responseText = data.content?.[0]?.text ?? "";
      } else if (provider === "google") {
        const resp = await fetch(
          `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
              generationConfig: { temperature: temperature ?? 0.7, maxOutputTokens: 4096 },
            }),
          }
        );
        const data = await resp.json() as any;
        if (data.error) throw new Error(data.error.message ?? "AI error");
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      } else {
        // OpenAI-compatible
        const resp = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: temperature ?? 0.7,
            max_tokens: 4096,
          }),
        });
        const data = await resp.json() as any;
        if (data.error) throw new Error(data.error.message ?? "AI error");
        responseText = data.choices?.[0]?.message?.content ?? "";
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "خطای ناشناخته";
      throw new Error(`خطا در فراخوانی هوش مصنوعی: ${msg}`);
    }

    try {
      let jsonStr = responseText.trim();
      const jsonMatch = jsonStr.match(/\[\s\S*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      const articles: GeneratedArticle[] = JSON.parse(jsonStr);

      const validated = articles.filter((a) => {
        return a.title && a.excerpt && a.body && a.body.length > 50;
      });

      if (validated.length === 0) {
        throw new Error("هوش مصنوعی مقاله معتبری تولید نکرد. لطفاً دوباره تلاش کنید.");
      }

      return { articles: validated, raw: responseText };
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        throw new Error("پاسخ هوش مصنوعی قابل پردازش نیست. لطفاً دوباره تلاش کنید.");
      }
      throw parseError;
    }
  },
});

// ── AI Writing Assistant (Content Studio) ─────────────────────────────────

/**
 * Single-turn AI text processing for the Content Studio editor.
 * Used for: Rewrite, Improve, Simplify, Expand, Shorten, Grammar,
 * Translate, Generate Heading, Generate Summary, etc.
 *
 * This action reads config server-side and returns the AI response.
 * The API key never reaches the browser.
 */
export const rewriteText = action({
  args: {
    prompt: v.string(),
    selectedText: v.optional(v.string()),
    modelId: v.optional(v.id("aiModels")),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; result?: string; error?: string }> => {
    // Read AI config server-side
    const rawConfig: any = await ctx.runQuery(internal.aiChat.getAIConfigRaw, {
      modelId: args.modelId ?? undefined,
    });

    if (!rawConfig || !rawConfig.apiKey) {
      return { ok: false, error: "هوش مصنوعی هنوز پیکربندی نشده است." };
    }

    const { apiKey, baseUrl, model, provider, temperature } = rawConfig;

    const systemPrompt = "You are a professional scientific writing assistant specializing in biology. Respond ONLY with the requested text transformation — no explanations, no markdown formatting, no code blocks, just the transformed text.";
    
    const userMessage = args.selectedText
      ? `${args.prompt}\n\n---\nText:\n${args.selectedText}`
      : args.prompt;

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userMessage },
    ];

    try {
      let responseText = "";

      if (provider === "anthropic") {
        const resp = await fetch(`${baseUrl}/v1/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 2048,
            temperature: temperature ?? 0.7,
            messages: chatMessages.filter((m) => m.role !== "system"),
            system: systemPrompt,
          }),
        });
        const data = (await resp.json()) as any;
        if (data.error) return { ok: false, error: data.error.message ?? "Anthropic API error" };
        responseText = data.content?.[0]?.text ?? "";
      } else if (provider === "google") {
        const contents = chatMessages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: "user", parts: [{ text: m.content }] }));
        const resp = await fetch(`${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents, generationConfig: { temperature: temperature ?? 0.7, maxOutputTokens: 2048 } }),
        });
        const data = (await resp.json()) as any;
        if (data.error) return { ok: false, error: data.error.message ?? "Google AI error" };
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      } else {
        // OpenAI-compatible
        const resp = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages: chatMessages, temperature: temperature ?? 0.7, max_tokens: 2048 }),
        });
        const data = (await resp.json()) as any;
        if (data.error) return { ok: false, error: data.error.message ?? "API error" };
        responseText = data.choices?.[0]?.message?.content ?? "";
      }

      if (!responseText.trim()) {
        return { ok: false, error: "پاسخ خالی از هوش مصنوعی دریافت شد." };
      }

      return { ok: true, result: responseText.trim() };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "خطای ناشناخته";
      console.error("AI rewriteText failed:", msg);
      return { ok: false, error: `خطا در اتصال: ${msg}` };
    }
  },
});

// ── AI Course Design Generation ───────────────────────────────────────────

export interface GeneratedCourseDesign {
  title: string;
  summary: string;
  description: string;
  audience: string[];
  prerequisites: string[];
  syllabus: { title: string; durationMin: number; free: boolean }[];
  pkgEconomy: number;
  pkgBasic: number;
  pkgPlus: number;
  pkgPremium: number;
  pkgEconomyFeatures: string[];
  pkgBasicFeatures: string[];
  pkgPlusFeatures: string[];
  pkgPremiumFeatures: string[];
}

export const generateCourseDesign = action({
  args: {
    skill: v.string(),
    modelId: v.optional(v.id("aiModels")),
  },
  handler: async (ctx, args): Promise<{ course: GeneratedCourseDesign; raw: string }> => {
    const rawConfig: any = await ctx.runQuery(internal.aiChat.getAIConfigRaw, { modelId: args.modelId ?? undefined });

    if (!rawConfig || !rawConfig.apiKey) {
      throw new Error("هوش مصنوعی پیکربندی نشده است. ابتدا API key را تنظیم کنید.");
    }

    const { apiKey, baseUrl, model, provider, temperature } = rawConfig;

    const systemPrompt = `شما یک طراح دوره آموزشی متخصص در حوزه علوم زیستی هستید.

قوانین:
- دوره باید علمی، کاربردی و جذاب باشد.
- قیمت‌ها باید واقع‌بینانه و مناسب بازار ایران باشند (تومان).
- سرفصل‌ها باید منطقی و پیش‌رونده باشند.
- هر پکیج باید ارزش افزوده مشخصی نسبت به پکیج قبلی داشته باشد.

پاسخ را دقیقاً به این فرمت JSON برگردانید (بدون متن اضافی):
{
  "title": "عنوان جذاب و حرفه‌ای دوره",
  "summary": "خلاصه ۲-۳ جمله‌ای دوره",
  "description": "توضیحات کامل ۳-۵ پاراگرافی دوره",
  "audience": ["مخاطب ۱", "mpeg2"],
  "prerequisites": ["پیش‌نیاز ۱"],
  "syllabus": [{"title": "جلسه ۱: عنوان", "durationMin": 60, "free": true}],
  "pkgEconomy": 299000,
  "pkgBasic": 499000,
  "pkgPlus": 799000,
  "pkgPremium": 1299000,
  "pkgEconomyFeatures": ["ویژگی ۱"],
  "pkgBasicFeatures": ["ویژگی ۱", "ویژگی ۲"],
  "pkgPlusFeatures": ["ویژگی ۱", "ویژگی ۲", "ویژگی ۳"],
  "pkgPremiumFeatures": ["همه ویژگی‌ها", "پشتیبانی ویژه", "گواهینامه"]
}

فقط آبجکت JSON برگردانید، هیچ متن دیگری اضافه نکنید.`;

    const userPrompt = `موضوع/مهارت دوره: ${args.skill}`;

    let responseText = "";

    try {
      if (provider === "anthropic") {
        const resp = await fetch(`${baseUrl}/v1/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            temperature: temperature ?? 0.7,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
          }),
        });
        const data = await resp.json() as any;
        if (data.error) throw new Error(data.error.message ?? "AI error");
        responseText = data.content?.[0]?.text ?? "";
      } else if (provider === "google") {
        const resp = await fetch(
          `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
              generationConfig: { temperature: temperature ?? 0.7, maxOutputTokens: 4096 },
            }),
          }
        );
        const data = await resp.json() as any;
        if (data.error) throw new Error(data.error.message ?? "AI error");
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      } else {
        const resp = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: temperature ?? 0.7,
            max_tokens: 4096,
          }),
        });
        const data = await resp.json() as any;
        if (data.error) throw new Error(data.error.message ?? "AI error");
        responseText = data.choices?.[0]?.message?.content ?? "";
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "خطای ناشناخته";
      throw new Error(`خطا در فراخوانی هوش مصنوعی: ${msg}`);
    }

    // Parse JSON response
    try {
      let jsonStr = responseText.trim();
      // Extract JSON object from response (may be wrapped in markdown code block)
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      const course: GeneratedCourseDesign = JSON.parse(jsonStr);

      // Validate required fields
      if (!course.title || !course.summary || !course.description) {
        throw new Error("پاسخ هوش مصنوعی ناقص است.");
      }

      return { course, raw: responseText };
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        throw new Error("پاسخ هوش مصنوعی قابل پردازش نیست. لطفاً دوباره تلاش کنید.");
      }
      throw parseError;
    }
  },
});
