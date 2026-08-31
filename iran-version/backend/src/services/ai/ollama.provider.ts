// ─── Ollama Provider (Stub) ─────────────────────────────────────────────────
// Placeholder for Ollama API integration (self-hosted LLMs).
// Uses OLLAMA_HOST env var (default: http://localhost:11434).
// When Ollama is running, this provider can make real API calls.

import type {
  AIProvider,
  AICompletionRequest,
  AICompletionResponse,
} from "./ai-provider.interface.js";

export class OllamaProvider implements AIProvider {
  readonly name = "ollama";
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_HOST || "http://localhost:11434";
  }

  async isAvailable(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/tags`, {
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
        content: "Ollama server is not running. Start it with `ollama serve`.",
        tokens: { prompt: 0, completion: 0, total: 0 },
        model: request.model,
        finishReason: "error",
      };
    }

    try {
      const resp = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxTokens ?? 1024,
          },
          stream: false,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return {
          content: `Ollama error: ${errText}`,
          tokens: { prompt: 0, completion: 0, total: 0 },
          model: request.model,
          finishReason: "error",
        };
      }

      const data = (await resp.json()) as {
        message?: { content?: string };
        prompt_eval_count?: number;
        eval_count?: number;
      };

      return {
        content: data.message?.content || "",
        tokens: {
          prompt: data.prompt_eval_count || 0,
          completion: data.eval_count || 0,
          total: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        model: request.model,
        finishReason: "stop",
      };
    } catch (err) {
      return {
        content: `Ollama connection failed: ${err instanceof Error ? err.message : "unknown error"}`,
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
