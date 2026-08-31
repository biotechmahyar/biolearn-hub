// ─── AI Actions Service ──────────────────────────────────────────────────────
// Migrates generateQuestions, generateArticles, rewriteText from original
// Convex aiActions.ts. Uses the same system prompts, input/output shapes,
// validation logic, and provider branching as the original.
// All three functions use getRawConfig() and fetch() directly for provider
// compatibility (matching the original's multi-provider support).

import { getRawConfig } from "./ai.service.js";
import type { AIMessage } from "./ai/ai-provider.interface.js";

// ─── Types (matching original Convex interfaces) ────────────────────────────

export interface GeneratedQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: number;
}

export interface GeneratedArticle {
  title: string;
  category: string;
  excerpt: string;
  body: string;
}

// ─── Shared provider call logic ─────────────────────────────────────────────

interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: string;
  temperature: number;
  maxTokensPerRequest: number;
}

/**
 * Call the AI provider with the given messages.
 * Supports anthropic, google, and openai-compatible providers.
 * Matches the original Convex aiActions.ts provider branching exactly.
 */
async function callAIProvider(
  config: ProviderConfig,
  messages: AIMessage[],
  systemPrompt: string,
  maxTokens: number
): Promise<string> {
  const { apiKey, baseUrl, model, provider, temperature } = config;

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
        max_tokens: maxTokens,
        temperature: temperature ?? 0.7,
        system: systemPrompt,
        messages: messages.filter((m) => m.role !== "system"),
      }),
    });
    const data = (await resp.json()) as any;
    if (data.error) throw new Error(data.error.message ?? "AI error");
    return data.content?.[0]?.text ?? "";
  } else if (provider === "google") {
    const contents = messages
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
          generationConfig: { temperature: temperature ?? 0.7, maxOutputTokens: maxTokens },
        }),
      }
    );
    const data = (await resp.json()) as any;
    if (data.error) throw new Error(data.error.message ?? "AI error");
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } else {
    // OpenAI-compatible (openai, gapgpt, custom)
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens,
      }),
    });
    const data = (await resp.json()) as any;
    if (data.error) throw new Error(data.error.message ?? "API error");
    return data.choices?.[0]?.message?.content ?? "";
  }
}

// ─── generateQuestions ───────────────────────────────────────────────────────

const QUESTIONS_SYSTEM_PROMPT = `شما یک متخصص طراحی سؤال امتحانی در حوزه علوم زیستی هستید.

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
    "difficulty": 1
  }
]

فقط آرایه JSON برگردانید، هیچ متن دیگری اضافه نکنید.`;

/**
 * Generate exam questions using AI based on a prompt.
 * Returns structured questions for admin preview before saving.
 * Matches original Convex aiActions.generateQuestions exactly.
 */
export async function generateQuestions(args: {
  prompt: string;
  count: number;
  difficulty: number;
  modelId?: string;
}): Promise<{ questions: GeneratedQuestion[]; raw: string }> {
  const rawConfig = await getRawConfig(args.modelId);

  if (!rawConfig || !rawConfig.apiKey) {
    throw new Error("هوش مصنوعی پیکربندی نشده است. ابتدا API key را تنظیم کنید.");
  }

  const userPrompt = `${args.prompt}\n\nتعداد سؤالات مورد نیاز: ${args.count}\nسطح دشواری: ${args.difficulty} (۱=آسان، ۲=متوسط، ۳=سخت)`;

  const messages: AIMessage[] = [
    { role: "system", content: QUESTIONS_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  let responseText = "";
  try {
    responseText = await callAIProvider(rawConfig, messages, QUESTIONS_SYSTEM_PROMPT, 4096);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "خطای ناشناخته";
    throw new Error(`خطا در فراخوانی هوش مصنوعی: ${msg}`);
  }

  // Parse JSON response (may be wrapped in markdown code block)
  try {
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
}

// ─── generateArticles ────────────────────────────────────────────────────────

const ARTICLES_SYSTEM_PROMPT = `شما یک متخصص تولید محتوای آموزشی در حوزه علوم زیستی هستید.

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

/**
 * Generate free articles using AI based on a prompt.
 * Returns structured articles for admin preview before saving.
 * Matches original Convex aiActions.generateArticles exactly.
 */
export async function generateArticles(args: {
  prompt: string;
  count: number;
  category: string;
  modelId?: string;
}): Promise<{ articles: GeneratedArticle[]; raw: string }> {
  const rawConfig = await getRawConfig(args.modelId);

  if (!rawConfig || !rawConfig.apiKey) {
    throw new Error("هوش مصنوعی پیکربندی نشده است. ابتدا API key را تنظیم کنید.");
  }

  const userPrompt = `${args.prompt}\n\nتعداد مقالات مورد نیاز: ${args.count}\nدسته‌بندی: ${args.category || "عمومی"}`;

  const messages: AIMessage[] = [
    { role: "system", content: ARTICLES_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  let responseText = "";
  try {
    responseText = await callAIProvider(rawConfig, messages, ARTICLES_SYSTEM_PROMPT, 4096);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "خطای ناشناخته";
    throw new Error(`خطا در فراخوانی هوش مصنوعی: ${msg}`);
  }

  try {
    let jsonStr = responseText.trim();
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
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
}

// ─── rewriteText ─────────────────────────────────────────────────────────────

const REWRITE_SYSTEM_PROMPT =
  "You are a professional scientific writing assistant specializing in biology. Respond ONLY with the requested text transformation — no explanations, no markdown formatting, no code blocks, just the transformed text.";

/**
 * Single-turn AI text processing for the Content Studio editor.
 * Used for: Rewrite, Improve, Simplify, Expand, Shorten, Grammar,
 * Translate, Generate Heading, Generate Summary, etc.
 * Returns { ok, result?, error? } — does NOT throw on errors.
 * Matches original Convex aiActions.rewriteText exactly.
 */
export async function rewriteText(args: {
  prompt: string;
  selectedText?: string;
  modelId?: string;
}): Promise<{ ok: boolean; result?: string; error?: string }> {
  const rawConfig = await getRawConfig(args.modelId);

  if (!rawConfig || !rawConfig.apiKey) {
    return { ok: false, error: "هوش مصنوعی هنوز پیکربندی نشده است." };
  }

  const userMessage = args.selectedText
    ? `${args.prompt}\n\n---\nText:\n${args.selectedText}`
    : args.prompt;

  const messages: AIMessage[] = [
    { role: "system", content: REWRITE_SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  try {
    let responseText = await callAIProvider(rawConfig, messages, REWRITE_SYSTEM_PROMPT, 2048);

    if (!responseText.trim()) {
      return { ok: false, error: "پاسخ خالی از هوش مصنوعی دریافت شد." };
    }

    return { ok: true, result: responseText.trim() };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "خطای ناشناخته";
    console.error("AI rewriteText failed:", msg);
    return { ok: false, error: `خطا در اتصال: ${msg}` };
  }
}
