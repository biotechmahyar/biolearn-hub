// ─── AI Provider Subsystem ───────────────────────────────────────────────────
export type {
  AIProvider,
  AICompletionRequest,
  AICompletionResponse,
  AIMessage,
  AIStreamChunk,
  AIProviderConfig,
} from "./ai-provider.interface.js";

export { ConsoleAIProvider } from "./console.provider.js";
export {
  getAIProvider,
  resetAIProvider,
  getProviderByName,
  isAIConfigured,
  registerProvider,
} from "./factory.js";
