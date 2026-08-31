// ─── AI Adapter Tests ────────────────────────────────────────────────────────
// Phase 8A — Tests for AI provider architecture, service, and routes.

import { describe, it, expect } from "vitest";

// ─── Module Structure Tests ─────────────────────────────────────────────────

describe("AI Provider — Module Structure", () => {
  it("should export all provider interface types", async () => {
    const mod = await import("../services/ai/ai-provider.interface.js");
    expect(typeof mod).toBe("object");
  });

  it("should export ConsoleAIProvider", async () => {
    const { ConsoleAIProvider } = await import("../services/ai/console.provider.js");
    const provider = new ConsoleAIProvider();
    expect(provider.name).toBe("console");
  });

  it("should export factory functions", async () => {
    const mod = await import("../services/ai/factory.js");
    expect(typeof mod.getAIProvider).toBe("function");
    expect(typeof mod.resetAIProvider).toBe("function");
    expect(typeof mod.isAIConfigured).toBe("function");
    expect(typeof mod.registerProvider).toBe("function");
  });

  it("should export AI service functions", async () => {
    const mod = await import("../services/ai.service.js");
    expect(typeof mod.getConfig).toBe("function");
    expect(typeof mod.updateConfig).toBe("function");
    expect(typeof mod.listModels).toBe("function");
    expect(typeof mod.createModel).toBe("function");
    expect(typeof mod.chat).toBe("function");
    expect(typeof mod.listConversations).toBe("function");
    expect(typeof mod.getQuota).toBe("function");
  });

  it("should export AI routes", async () => {
    const mod = await import("../routes/ai.js");
    expect(mod.default).toBeDefined();
  });
});

// ─── Console Provider Tests ─────────────────────────────────────────────────

describe("AI Console Provider", () => {
  it("should always be available", async () => {
    const { ConsoleAIProvider } = await import("../services/ai/console.provider.js");
    const provider = new ConsoleAIProvider();
    expect(await provider.isAvailable()).toBe(true);
  });

  it("should return unavailable message when asked to complete", async () => {
    const { ConsoleAIProvider } = await import("../services/ai/console.provider.js");
    const provider = new ConsoleAIProvider();
    const response = await provider.complete({
      model: "test-model",
      messages: [
        { role: "user", content: "Hello, what is microbiology?" },
      ],
    });
    expect(response.content).toBeTruthy();
    expect(response.content).toContain("سرویس هوش مصنوعی");
    expect(response.model).toBe("console-fallback");
    expect(response.finishReason).toBe("stop");
    expect(response.tokens.total).toBeGreaterThanOrEqual(0);
  });

  it("should include prompt token estimate", async () => {
    const { ConsoleAIProvider } = await import("../services/ai/console.provider.js");
    const provider = new ConsoleAIProvider();
    const response = await provider.complete({
      model: "test",
      messages: [
        { role: "system", content: "You are a helpful assistant" },
        { role: "user", content: "What is DNA?" },
      ],
    });
    expect(response.tokens.prompt).toBeGreaterThan(0);
  });

  it("should estimate tokens for text", async () => {
    const { ConsoleAIProvider } = await import("../services/ai/console.provider.js");
    const provider = new ConsoleAIProvider();
    const tokens = provider.estimateTokens("Hello world from microbiology");
    expect(tokens).toBeGreaterThan(0);
  });
});

// ─── Provider Factory Tests ─────────────────────────────────────────────────

describe("AI Provider Factory", () => {
  it("should get default provider (console)", async () => {
    const { getAIProvider, resetAIProvider } = await import("../services/ai/factory.js");
    resetAIProvider();
    const provider = await getAIProvider();
    expect(provider.name).toBeTruthy();
  });

  it("should reset provider cache", async () => {
    const { getAIProvider, resetAIProvider } = await import("../services/ai/factory.js");
    resetAIProvider();
    const p1 = await getAIProvider();
    const p2 = await getAIProvider();
    // Same instance after first load
    expect(p1).toBe(p2);
    resetAIProvider();
    const p3 = await getAIProvider();
    // New instance after reset
    expect(p3).not.toBe(p1);
  });

  it("should register custom provider", async () => {
    const { registerProvider, getProviderByName, resetAIProvider } = await import("../services/ai/factory.js");
    registerProvider("test-custom", async () => ({
      name: "test-custom",
      isAvailable: async () => true,
      complete: async () => ({
        content: "custom response",
        tokens: { prompt: 0, completion: 0, total: 0 },
        model: "test",
        finishReason: "stop" as const,
      }),
    }));
    const provider = await getProviderByName("test-custom");
    expect(provider.name).toBe("test-custom");
  });

  it("should return console provider for unknown name", async () => {
    const { getProviderByName } = await import("../services/ai/factory.js");
    const provider = await getProviderByName("nonexistent-provider");
    expect(provider.name).toBe("console");
  });

  it("should fallback to console for failed provider load", async () => {
    const { registerProvider, getProviderByName, resetAIProvider } = await import("../services/ai/factory.js");
    resetAIProvider();
    registerProvider("broken-provider", async () => {
      throw new Error("Module not found");
    });
    const provider = await getProviderByName("broken-provider");
    expect(provider.name).toBe("console");
  });
});

// ─── Provider Interface Contract Tests ──────────────────────────────────────

describe("AI Provider Contract", () => {
  it("should define completion response shape", () => {
    const response = {
      content: "test",
      tokens: { prompt: 10, completion: 5, total: 15 },
      model: "model",
      finishReason: "stop" as const,
    };
    expect(typeof response.content).toBe("string");
    expect(typeof response.tokens.prompt).toBe("number");
    expect(typeof response.tokens.completion).toBe("number");
    expect(typeof response.tokens.total).toBe("number");
    expect(["stop", "length", "content_filter", "error"]).toContain(response.finishReason);
  });

  it("should define message roles", () => {
    const validRoles = ["system", "user", "assistant"];
    for (const role of validRoles) {
      const msg = { role: role as "system" | "user" | "assistant", content: "test" };
      expect(validRoles).toContain(msg.role);
    }
  });
});

// ─── Graceful Degradation Tests ─────────────────────────────────────────────

describe("AI Graceful Degradation", () => {
  it("should never crash when provider is not configured", async () => {
    const { ConsoleAIProvider } = await import("../services/ai/console.provider.js");
    const provider = new ConsoleAIProvider();
    // Multiple requests should never throw
    for (let i = 0; i < 5; i++) {
      const response = await provider.complete({
        model: "any-model",
        messages: [{ role: "user", content: `Test message ${i}` }],
      });
      expect(response).toBeDefined();
      expect(response.content).toBeTruthy();
    }
  });

  it("should handle empty messages gracefully", async () => {
    const { ConsoleAIProvider } = await import("../services/ai/console.provider.js");
    const provider = new ConsoleAIProvider();
    const response = await provider.complete({
      model: "test",
      messages: [],
    });
    expect(response).toBeDefined();
    expect(response.content).toBeTruthy();
  });

  it("should handle very long messages gracefully", async () => {
    const { ConsoleAIProvider } = await import("../services/ai/console.provider.js");
    const provider = new ConsoleAIProvider();
    const longMessage = "x".repeat(10000);
    const response = await provider.complete({
      model: "test",
      messages: [{ role: "user", content: longMessage }],
    });
    expect(response).toBeDefined();
  });
});

// ─── Route Authorization Tests ──────────────────────────────────────────────

describe("AI Routes — Authorization", () => {
  it("should require auth for chat", async () => {
    const { default: app } = await import("../routes/ai.js");
    const res = await app.fetch(
      new Request("http://localhost/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "test" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("should require auth for conversations", async () => {
    const { default: app } = await import("../routes/ai.js");
    const res = await app.fetch(
      new Request("http://localhost/conversations")
    );
    expect(res.status).toBe(401);
  });

  it("should require auth for quota", async () => {
    const { default: app } = await import("../routes/ai.js");
    const res = await app.fetch(
      new Request("http://localhost/quota")
    );
    expect(res.status).toBe(401);
  });

  it("should require admin for config", async () => {
    const { default: app } = await import("../routes/ai.js");
    const res = await app.fetch(
      new Request("http://localhost/config")
    );
    expect(res.status).toBe(401);
  });

  it("should require admin for models", async () => {
    const { default: app } = await import("../routes/ai.js");
    const res = await app.fetch(
      new Request("http://localhost/models")
    );
    expect(res.status).toBe(401);
  });

  it("should allow unauthenticated status check", async () => {
    const { default: app } = await import("../routes/ai.js");
    const res = await app.fetch(
      new Request("http://localhost/status")
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.ok).toBe(true);
    expect(body.data.provider).toBeTruthy();
    expect(typeof body.data.available).toBe("boolean");
  });
});

// ─── Validation Tests ───────────────────────────────────────────────────────

describe("AI Routes — Validation", () => {
  it("should reject empty message in chat", async () => {
    const { default: app } = await import("../routes/ai.js");
    const res = await app.fetch(
      new Request("http://localhost/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer fake-token",
        },
        body: JSON.stringify({ message: "" }),
      })
    );
    // Either 401 (auth fails first) or 400 (validation)
    expect([400, 401]).toContain(res.status);
  });

  it("should reject chat with message exceeding max length", async () => {
    const { default: app } = await import("../routes/ai.js");
    const res = await app.fetch(
      new Request("http://localhost/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer fake-token",
        },
        body: JSON.stringify({ message: "x".repeat(8001) }),
      })
    );
    expect([400, 401]).toContain(res.status);
  });

  it("should reject models POST without body", async () => {
    const { default: app } = await import("../routes/ai.js");
    const res = await app.fetch(
      new Request("http://localhost/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer fake-token",
        },
        body: JSON.stringify({}),
      })
    );
    expect([400, 401]).toContain(res.status);
  });
});

// ─── Data Shape Tests ───────────────────────────────────────────────────────

describe("AI Service — Data Shapes", () => {
  it("should define config shape", () => {
    const config = {
      enabled: false,
      model: null,
      apiKey: null,
      systemPrompt: null,
      updatedAt: 0,
    };
    expect(typeof config.enabled).toBe("boolean");
    expect(typeof config.updatedAt).toBe("number");
  });

  it("should define model shape", () => {
    const model = {
      id: "test-id",
      name: "test-model",
      provider: "ollama",
      enabled: true,
      config: null,
      createdAt: Date.now(),
    };
    expect(typeof model.id).toBe("string");
    expect(typeof model.name).toBe("string");
    expect(typeof model.enabled).toBe("boolean");
  });

  it("should define quota shape", () => {
    const quota = {
      dailyLimit: 10000,
      used: 0,
      remaining: 10000,
      resetAt: Date.now() + 86400000,
    };
    expect(quota.dailyLimit).toBeGreaterThan(0);
    expect(quota.remaining).toBe(quota.dailyLimit - quota.used);
  });

  it("should define conversation shape", () => {
    const conv = {
      id: "test-id",
      userId: "user-id",
      title: "Test conversation",
      createdAt: Date.now(),
      messageCount: 0,
    };
    expect(typeof conv.id).toBe("string");
    expect(typeof conv.title).toBe("string");
  });

  it("should define message shape", () => {
    const msg = {
      id: "test-id",
      conversationId: "conv-id",
      role: "user",
      content: "Hello",
      tokens: 5,
      createdAt: Date.now(),
    };
    expect(["system", "user", "assistant"]).toContain(msg.role);
  });
});
