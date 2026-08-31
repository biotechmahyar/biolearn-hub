// ─── LM Studio Provider (Stub) ──────────────────────────────────────────────
// Placeholder for LM Studio API integration (local GUI-based LLM).
// Uses LMSTUDIO_HOST env var (default: http://localhost:1234).
// LM Studio is OpenAI-compatible, so it uses the /v1/chat/completions endpoint.

import type {
  AIProvider,
  AICompletionRequest,
  AICompletionResponse,
} from "./ai-provider.interface.js";

export class LMStudioProvider implements AIProvider {
  readonly name = "lmstudio";
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.LMSTUDIO_HOST || "http://localhost:1234";
  }

  async isAvailable(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(3000),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    if (!(await this.isAvailable())) {
      return {
        content: "LM Studio is not running. Start it and load a model.",
        tokens: { prompt: 0, completion: 0, total: 0 },
        model: request.model,
        finishReason: "error",
      };
    }

    try {
      const resp = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 1024,
          stream: false,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return {
          content: `LM Studio error: ${errText}`,
          tokens: { prompt: 0, completion: 0, total: 0 },
          model: request.model,
          finishReason: "error",
        };
      }

      const data = (await resp.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };

      return {
        content: data.choices?.[0]?.message?.content || "",
        tokens: {
          prompt: data.usage?.prompt_tokens || 0,
          completion: data.usage?.completion_tokens || 0,
          total: data.usage?.total_tokens || 0,
        },
        model: request.model,
        finishReason: "stop",
      };
    } catch (err) {
      return {
        content: `LM Studio connection failed: ${err instanceof Error ? err.message : "unknown error"}`,
        tokens: { prompt: 0, completion: 0, total: 0 },
        model: request.model,
        finishReason: "error",
      };
    }
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 3.5);
  }
}
