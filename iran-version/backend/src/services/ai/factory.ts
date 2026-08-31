// ─── AI Provider Factory ─────────────────────────────────────────────────────
// Creates AI providers based on environment configuration and database settings.
// Falls back to the console provider if no provider is configured.

import type { AIProvider, AIProviderConfig } from "./ai-provider.interface.js";
import { ConsoleAIProvider } from "./console.provider.js";

// Lazy-loaded providers to avoid importing everything at startup
const providerRegistry = new Map<string, () => Promise<AIProvider>>();

// Register built-in providers
providerRegistry.set("console", async () => new ConsoleAIProvider());

// Register external providers — they are only loaded when actually needed.
providerRegistry.set("openai", async () => {
  const { OpenAIProvider } = await import("./openai.provider.js");
  return new OpenAIProvider();
});

providerRegistry.set("ollama", async () => {
  const { OllamaProvider } = await import("./ollama.provider.js");
  return new OllamaProvider();
});

providerRegistry.set("lmstudio", async () => {
  const { LMStudioProvider } = await import("./lmstudio.provider.js");
  return new LMStudioProvider();
});

// Internal provider is created dynamically with DB config — not a singleton
// It is created per-request in the chat flow, so it's registered but not cached.

// Singleton provider instance (for env-based fallback only)
let _activeProvider: AIProvider | null = null;
let _providerLoadAttempted = false;

/**
 * Get the active AI provider from env configuration.
 * Uses environment variable AI_PROVIDER to select, defaults to "console".
 */
export async function getAIProvider(): Promise<AIProvider> {
  if (_activeProvider) return _activeProvider;

  const providerName = process.env.AI_PROVIDER?.toLowerCase() || "console";

  const factory = providerRegistry.get(providerName);
  if (!factory) {
    console.warn(`[AI] Unknown provider "${providerName}" — falling back to console`);
    _activeProvider = new ConsoleAIProvider();
    return _activeProvider;
  }

  try {
    _activeProvider = await factory();
    console.log(`[AI] Provider initialized: ${_activeProvider.name}`);
    return _activeProvider;
  } catch (err) {
    if (!_providerLoadAttempted) {
      console.warn(`[AI] Failed to load provider "${providerName}" — falling back to console`, err);
      _providerLoadAttempted = true;
    }
    _activeProvider = new ConsoleAIProvider();
    return _activeProvider;
  }
}

/**
 * Reset the cached provider (for testing or config changes).
 */
export function resetAIProvider(): void {
  _activeProvider = null;
  _providerLoadAttempted = false;
}

/**
 * Get a provider by name (for multi-model support).
 */
export async function getProviderByName(name: string): Promise<AIProvider> {
  const factory = providerRegistry.get(name);
  if (!factory) {
    return new ConsoleAIProvider();
  }
  try {
    return await factory();
  } catch {
    return new ConsoleAIProvider();
  }
}

/**
 * Create an InternalAIProvider from DB config.
 */
export async function createInternalProvider(config: {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<AIProvider> {
  const { InternalAIProvider } = await import("./internal.provider.js");
  return new InternalAIProvider(config);
}

/**
 * Check if a provider is configured and available.
 */
export async function isAIConfigured(): Promise<boolean> {
  const provider = await getAIProvider();
  return provider.isAvailable();
}

/**
 * Register a custom provider.
 */
export function registerProvider(name: string, factory: () => Promise<AIProvider>): void {
  providerRegistry.set(name, factory);
}
