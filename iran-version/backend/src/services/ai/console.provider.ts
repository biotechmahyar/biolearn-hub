// ─── Console / Fallback AI Provider ──────────────────────────────────────────
// Default provider when no external AI service is configured.
// Returns structured "unavailable" responses — never crashes, never calls out.

import type {
  AIProvider,
  AICompletionRequest,
  AICompletionResponse,
} from "./ai-provider.interface.js";

const UNAVAILABLE_MESSAGE =
  "سرویس هوش مصنوعی در حال حاضر در دسترس نیست. " +
  "لطفاً بعداً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.";

export class ConsoleAIProvider implements AIProvider {
  readonly name = "console";

  async isAvailable(): Promise<boolean> {
    return true; // Always "available" in the sense of not crashing
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    // Log the request for debugging
    const lastUserMsg = [...request.messages]
      .reverse()
      .find((m) => m.role === "user");

    console.log("═══════════════════════════════════════════════════════════════");
    console.log("[AI — Console Provider]");
    console.log(`  Model: ${request.model}`);
    console.log(`  Messages: ${request.messages.length}`);
    if (lastUserMsg) {
      const preview =
        lastUserMsg.content.length > 100
          ? lastUserMsg.content.slice(0, 100) + "..."
          : lastUserMsg.content;
      console.log(`  Last user message: ${preview}`);
    }
    console.log("═══════════════════════════════════════════════════════════════");

    // Estimate tokens
    const promptTokens = request.messages.reduce(
      (sum, m) => sum + this.estimateTokens(m.content),
      0
    );

    return {
      content: UNAVAILABLE_MESSAGE,
      tokens: {
        prompt: promptTokens,
        completion: 0,
        total: promptTokens,
      },
      model: "console-fallback",
      finishReason: "stop",
    };
  }

  estimateTokens(text: string): number {
    // Simple heuristic: ~0.75 tokens per word for English, ~1 token per word for Persian
    // Just count words as a rough estimate
    return Math.max(1, Math.ceil(text.split(/\s+/).length * 1.2));
  }
}
