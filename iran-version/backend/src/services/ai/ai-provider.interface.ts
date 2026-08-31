// ─── AI Provider Interface ───────────────────────────────────────────────────
// Abstract contract for AI model providers. Each provider must implement
// text completion and (optionally) streaming. The backend never calls an
// external API directly — it goes through this interface.

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionRequest {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AICompletionResponse {
  content: string;
  tokens: { prompt: number; completion: number; total: number };
  model: string;
  finishReason: "stop" | "length" | "content_filter" | "error";
}

export interface AIStreamChunk {
  content: string;
  done: boolean;
  tokens?: { prompt: number; completion: number; total: number };
}

export interface AIProvider {
  /** Human-readable name of the provider */
  readonly name: string;

  /** Whether this provider is currently available */
  isAvailable(): Promise<boolean>;

  /** Generate a completion */
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;

  /** Generate a streaming completion (optional — falls back to complete) */
  stream?(request: AICompletionRequest): AsyncGenerator<AIStreamChunk>;

  /** Estimate token count for a message (optional — defaults to word count) */
  estimateTokens?(text: string): number;
}

// ─── Provider Configuration ─────────────────────────────────────────────────

export interface AIProviderConfig {
  /** Provider name (used as discriminator) */
  provider: string;
  /** Model identifier */
  model?: string;
  /** API key (optional — not needed for local providers) */
  apiKey?: string;
  /** Provider-specific options */
  options?: Record<string, unknown>;
}
