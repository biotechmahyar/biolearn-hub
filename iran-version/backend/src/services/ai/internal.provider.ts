// ─── Internal AI Provider ─────────────────────────────────────────────────────
// Connects ONLY to the Iranian/internal AI API configured through aiModels.
// Reads baseUrl, apiKey, model from the database (aiModels table).
// Supports OpenAI-compatible API format (the standard for Iranian AI services).
// No hardcoded URLs or keys — everything comes from admin configuration.

import type {
  AIProvider,
  AICompletionRequest,
  AICompletionResponse,
} from "./ai-provider.interface.js";

export class InternalAIProvider implements AIProvider {
  readonly name = "internal";

  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: {
    baseUrl: string;
    apiKey: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 2048;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey || !this.baseUrl) return false;
    try {
      const resp = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const resp = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || this.model,
        messages: request.messages,
        temperature: request.temperature ?? this.temperature,
        max_tokens: request.maxTokens ?? this.maxTokens,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "Unknown error");
      throw new Error(`Internal AI API error (${resp.status}): ${errText.slice(0, 200)}`);
    }

    const data = (await resp.json()) as any;

    if (data.error) {
      throw new Error(data.error.message ?? "Internal AI API error");
    }

    const content = data.choices?.[0]?.message?.content ?? "پاسخی دریافت نشد.";
    const usage = data.usage ?? {};
    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;

    return {
      content,
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens,
      },
      model: data.model || request.model || this.model,
      finishReason: data.choices?.[0]?.finish_reason === "stop" ? "stop" : "stop",
    };
  }

  estimateTokens(text: string): number {
    // Rough estimate: ~0.75 tokens per word for English, ~1.5 for Persian
    const words = text.split(/\s+/).length;
    return Math.ceil(words * 1.2);
  }
}
