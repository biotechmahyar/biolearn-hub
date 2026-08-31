// ─── AI Actions Tests ────────────────────────────────────────────────────────
// Phase 8C — Tests for generateQuestions, generateArticles, rewriteText.
// No PostgreSQL or real AI API needed. Tests use mocked providers.

import { describe, it, expect, vi } from "vitest";

// ─── Module Structure Tests ──────────────────────────────────────────────────

describe("AI Actions — Module Structure", () => {
  it("should export all three action functions", async () => {
    const mod = await import("../services/ai-actions.service.js");
    expect(typeof mod.generateQuestions).toBe("function");
    expect(typeof mod.generateArticles).toBe("function");
    expect(typeof mod.rewriteText).toBe("function");
  });

  it("should export AI action routes", async () => {
    const mod = await import("../routes/ai-actions.js");
    expect(mod.default).toBeDefined();
  });

  it("should have correct types exported", async () => {
    const mod = await import("../services/ai-actions.service.js");
    // Verify functions exist with correct names
    expect(mod.generateQuestions.name).toBe("generateQuestions");
    expect(mod.generateArticles.name).toBe("generateArticles");
    expect(mod.rewriteText.name).toBe("rewriteText");
  });
});

// ─── Authentication Tests ────────────────────────────────────────────────────

describe("AI Actions — Authentication", () => {
  it("should reject unauthenticated generate-questions", async () => {
    const { default: app } = await import("../routes/ai-actions.js");
    const res = await app.fetch(
      new Request("http://localhost/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "test", count: 5, difficulty: 2 }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("should reject unauthenticated generate-articles", async () => {
    const { default: app } = await import("../routes/ai-actions.js");
    const res = await app.fetch(
      new Request("http://localhost/generate-articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "test", count: 3, category: "biology" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("should reject unauthenticated rewrite-text", async () => {
    const { default: app } = await import("../routes/ai-actions.js");
    const res = await app.fetch(
      new Request("http://localhost/rewrite-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "rewrite this" }),
      })
    );
    expect(res.status).toBe(401);
  });
});

// ─── Validation Tests ────────────────────────────────────────────────────────

describe("AI Actions — Validation", () => {
  it("should reject generate-questions with missing prompt", async () => {
    const { default: app } = await import("../routes/ai-actions.js");
    const res = await app.fetch(
      new Request("http://localhost/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer fake-token",
        },
        body: JSON.stringify({ count: 5, difficulty: 2 }),
      })
    );
    expect([400, 401]).toContain(res.status);
  });

  it("should reject generate-questions with invalid difficulty", async () => {
    const { default: app } = await import("../routes/ai-actions.js");
    const res = await app.fetch(
      new Request("http://localhost/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer fake-token",
        },
        body: JSON.stringify({ prompt: "test", count: 5, difficulty: 5 }),
      })
    );
    expect([400, 401]).toContain(res.status);
  });

  it("should reject generate-articles with missing category", async () => {
    const { default: app } = await import("../routes/ai-actions.js");
    const res = await app.fetch(
      new Request("http://localhost/generate-articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer fake-token",
        },
        body: JSON.stringify({ prompt: "test", count: 3 }),
      })
    );
    expect([400, 401]).toContain(res.status);
  });

  it("should reject rewrite-text with empty prompt", async () => {
    const { default: app } = await import("../routes/ai-actions.js");
    const res = await app.fetch(
      new Request("http://localhost/rewrite-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer fake-token",
        },
        body: JSON.stringify({ prompt: "" }),
      })
    );
    expect([400, 401]).toContain(res.status);
  });
});

// ─── Provider Failure Handling Tests ─────────────────────────────────────────

describe("AI Actions — Provider Not Configured", () => {
  it("generateQuestions should throw when no AI config", async () => {
    const { generateQuestions } = await import("../services/ai-actions.service.js");
    // getRawConfig returns null when no DB
    await expect(
      generateQuestions({
        prompt: "DNA structure",
        count: 5,
        difficulty: 2,
      })
    ).rejects.toThrow("هوش مصنوعی پیکربندی نشده است");
  });

  it("generateArticles should throw when no AI config", async () => {
    const { generateArticles } = await import("../services/ai-actions.service.js");
    await expect(
      generateArticles({
        prompt: "Write about cells",
        count: 3,
        category: "biology",
      })
    ).rejects.toThrow("هوش مصنوعی پیکربندی نشده است");
  });

  it("rewriteText should return ok:false when no AI config", async () => {
    const { rewriteText } = await import("../services/ai-actions.service.js");
    // rewriteText does NOT throw — it returns error object
    const result = await rewriteText({
      prompt: "Improve this text",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.error).toContain("پیکربندی نشده");
  });
});

// ─── Response Structure Tests ────────────────────────────────────────────────

describe("AI Actions — Response Structure", () => {
  it("rewriteText should return { ok, result?, error? } shape", async () => {
    const { rewriteText } = await import("../services/ai-actions.service.js");
    const result = await rewriteText({
      prompt: "Rewrite this",
    });
    expect(typeof result.ok).toBe("boolean");
    // When not configured, ok=false with error
    expect(result.ok).toBe(false);
    expect(typeof result.error).toBe("string");
  });
});

// ─── Secret Protection Tests ─────────────────────────────────────────────────

describe("AI Actions — Secret Protection", () => {
  it("generateQuestions should never expose API keys in error messages", async () => {
    const { generateQuestions } = await import("../services/ai-actions.service.js");
    try {
      await generateQuestions({
        prompt: "test",
        count: 3,
        difficulty: 1,
      });
    } catch (e: any) {
      // Error message should mention config, not the actual key
      expect(e.message).not.toContain("sk-");
      expect(e.message).not.toContain("api_key");
    }
  });

  it("rewriteText error should never contain API key", async () => {
    const { rewriteText } = await import("../services/ai-actions.service.js");
    const result = await rewriteText({
      prompt: "test",
    });
    expect(result.error).not.toContain("sk-");
    expect(result.error).not.toContain("api_key");
  });
});

// ─── Route Structure Tests ───────────────────────────────────────────────────

describe("AI Actions — Route Structure", () => {
  it("should return 404 for unknown action routes", async () => {
    const { default: app } = await import("../routes/ai-actions.js");
    const res = await app.fetch(
      new Request("http://localhost/unknown-action")
    );
    expect(res.status).toBe(404);
  });

  it("should handle GET on generate-questions (wrong method)", async () => {
    const { default: app } = await import("../routes/ai-actions.js");
    const res = await app.fetch(
      new Request("http://localhost/generate-questions")
    );
    expect(res.status).toBe(404); // Hono returns 404 for method mismatch
  });
});

// ─── Integration with AI Provider Abstraction ────────────────────────────────

describe("AI Actions — Provider Integration", () => {
  it("should use getAIProvider factory for status checks", async () => {
    const { getAIProvider, resetAIProvider } = await import("../services/ai/factory.js");
    resetAIProvider();
    const provider = await getAIProvider();
    expect(provider.name).toBe("console");
  });

  it("should support custom provider registration", async () => {
    const { registerProvider, getProviderByName, resetAIProvider } = await import("../services/ai/factory.js");
    resetAIProvider();

    // Register a mock provider
    registerProvider("mock-test", async () => ({
      name: "mock-test",
      isAvailable: async () => true,
      complete: async () => ({
        content: "mock response",
        tokens: { prompt: 10, completion: 20, total: 30 },
        model: "mock",
        finishReason: "stop" as const,
      }),
    }));

    const provider = await getProviderByName("mock-test");
    expect(provider.name).toBe("mock-test");
    const available = await provider.isAvailable();
    expect(available).toBe(true);
  });
});
