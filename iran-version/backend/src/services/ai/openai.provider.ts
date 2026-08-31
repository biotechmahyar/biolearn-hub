// ─── OpenAI Provider (Stub) ─────────────────────────────────────────────────
// Placeholder for OpenAI API integration. Requires OPENAI_API_KEY env var.
// When configured, will make real API calls. Until then, returns unavailable.

import type {
  AIProvider,
  AICompletionRequest,
  AICompletionResponse,
} from "./ai-provider.interface.js";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    if (!this.apiKey) {
      return {
        content:
          "OpenAI API key is not configured. Set OPENAI_API_KEY to enable.",
        tokens: { prompt: 0, completion: 0, total: 0 },
        model: request.model,
        finishReason: "error",
      };
    }

    // TODO: Implement actual OpenAI API call
    // const response = await fetch("https://api.openai.com/v1/chat/completions", { ... });

    return {
      content: "OpenAI provider is not yet fully implemented.",
      tokens: { prompt: 0, completion: 0, total: 0 },
      model: request.model,
      finishReason: "error",
    };
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
