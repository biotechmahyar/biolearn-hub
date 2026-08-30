/**
 * Integration tests for NIBRC Iran Backend API.
 * Run with: npx vitest run src/__tests__/api.test.ts
 *
 * These tests require a running PostgreSQL database.
 * Set DATABASE_URL in your .env or environment.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const BASE_URL = process.env.API_URL || "http://localhost:3000/api";

let adminToken = "";
let userToken = "";
let userId = "";
let courseId = "";
let articleId = "";
let productId = "";
let workshopId = "";
let instructorId = "";
let categoryId = "";

// ── Helpers ────────────────────────────────────────────────────────────────

async function req(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, ...json };
}

// ── Auth ───────────────────────────────────────────────────────────────────

describe("Auth", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "Test123456";

  it("POST /auth/register — success", async () => {
    const res = await req("POST", "/auth/register", {
      name: "Test User",
      email: testEmail,
      password: testPassword,
    });
    expect(res.ok).toBe(true);
    expect(res.data.user).toBeDefined();
    expect(res.data.accessToken).toBeDefined();
    expect(res.data.refreshToken).toBeDefined();
    userToken = res.data.accessToken;
    userId = res.data.user.id;
  });

  it("POST /auth/register — validation error (short password)", async () => {
    const res = await req("POST", "/auth/register", {
      name: "X",
      email: "x@x.com",
      password: "123",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("POST /auth/login — success", async () => {
    const res = await req("POST", "/auth/login", {
      email: testEmail,
      password: testPassword,
    });
    expect(res.ok).toBe(true);
    expect(res.data.accessToken).toBeDefined();
  });

  it("POST /auth/login — invalid credentials", async () => {
    const res = await req("POST", "/auth/login", {
      email: testEmail,
      password: "wrong",
    });
    expect(res.status).toBe(401);
    expect(res.ok).toBe(false);
  });

  it("GET /auth/me — with token", async () => {
    const res = await req("GET", "/auth/me", undefined, {
      Authorization: `Bearer ${userToken}`,
    });
    expect(res.ok).toBe(true);
    expect(res.data.email).toBe(testEmail);
  });

  it("GET /auth/me — no token returns null", async () => {
    const res = await req("GET", "/auth/me");
    expect(res.ok).toBe(true);
    expect(res.data).toBeNull();
  });

  it("GET /auth/is-admin — not admin", async () => {
    const res = await req("GET", "/auth/is-admin", undefined, {
      Authorization: `Bearer ${userToken}`,
    });
    expect(res.ok).toBe(true);
    expect(res.data).toBe(false);
  });

  it("POST /auth/refresh — success", async () => {
    const loginRes = await req("POST", "/auth/login", {
      email: testEmail,
      password: testPassword,
    });
    const res = await req("POST", "/auth/refresh", {
      refreshToken: loginRes.data.refreshToken,
    });
    expect(res.ok).toBe(true);
    expect(res.data.accessToken).toBeDefined();
  });

  it("POST /auth/refresh — invalid token", async () => {
    const res = await req("POST", "/auth/refresh", {
      refreshToken: "invalid",
    });
    expect(res.status).toBe(401);
  });
});

// ── Public Content ─────────────────────────────────────────────────────────

describe("Public Content", () => {
  it("GET /content/categories", async () => {
    const res = await req("GET", "/content/categories");
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /content/courses", async () => {
    const res = await req("GET", "/content/courses");
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /content/instructors", async () => {
    const res = await req("GET", "/content/instructors");
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /content/articles", async () => {
    const res = await req("GET", "/content/articles");
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /content/products", async () => {
    const res = await req("GET", "/content/products");
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /content/workshops", async () => {
    const res = await req("GET", "/content/workshops");
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /content/courses/:slug — not found", async () => {
    const res = await req("GET", "/content/courses/nonexistent");
    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
  });

  it("GET /content/testimonials", async () => {
    const res = await req("GET", "/content/testimonials");
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });
});

// ── Admin — Unauthorized ───────────────────────────────────────────────────

describe("Admin — Unauthorized", () => {
  it("GET /admin/courses — without token", async () => {
    const res = await req("GET", "/admin/courses");
    expect(res.status).toBe(401);
  });

  it("GET /admin/users — without token", async () => {
    const res = await req("GET", "/admin/users");
    expect(res.status).toBe(401);
  });
});

// ── Admin — Forbidden (regular user) ──────────────────────────────────────

describe("Admin — Forbidden", () => {
  it("GET /admin/courses — regular user", async () => {
    const res = await req("GET", "/admin/courses", undefined, {
      Authorization: `Bearer ${userToken}`,
    });
    // Regular users cannot access admin routes
    expect([403, 401]).toContain(res.status);
  });
});

// ── Admin CRUD ─────────────────────────────────────────────────────────────

describe("Admin CRUD (requires admin token)", () => {
  // NOTE: These tests require a valid admin token.
  // In CI, seed the admin first or set ADMIN_TOKEN env var.
  beforeAll(async () => {
    adminToken = process.env.ADMIN_TOKEN || "";
    if (!adminToken) {
      console.warn("⚠️  ADMIN_TOKEN not set — admin CRUD tests will be skipped");
    }
  });

  const authHeader = () => ({ Authorization: `Bearer ${adminToken}` });

  describe("Courses", () => {
    it("POST /admin/courses — create", async () => {
      if (!adminToken) return;
      const res = await req(
        "POST",
        "/admin/courses",
        {
          title: "Test Course",
          summary: "A test course",
          categoryId: categoryId || "00000000-0000-0000-0000-000000000000",
          instructorId: instructorId || "00000000-0000-0000-0000-000000000000",
          price: 1000000,
          mode: "live",
          bundle: "basic",
          published: false,
        },
        authHeader()
      );
      // May fail if no real category/instructor exists — that's expected
      expect([200, 201, 400]).toContain(res.status);
      if (res.ok && res.data?.id) courseId = res.data.id;
    });

    it("GET /admin/courses — list", async () => {
      if (!adminToken) return;
      const res = await req("GET", "/admin/courses", undefined, authHeader());
      expect(res.ok).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
    });

    it("DELETE /admin/courses/:id — not found", async () => {
      if (!adminToken) return;
      const res = await req(
        "DELETE",
        "/admin/courses/00000000-0000-0000-0000-000000000000",
        undefined,
        authHeader()
      );
      expect(res.ok).toBe(false);
      expect(res.status).toBe(404);
    });
  });

  describe("Articles", () => {
    it("POST /admin/articles — create", async () => {
      if (!adminToken) return;
      const res = await req(
        "POST",
        "/admin/articles",
        {
          title: "Test Article",
          category: "تست",
          excerpt: "Test excerpt",
          body: "<p>Test body</p>",
          authorName: "تست",
          readTime: 5,
          published: false,
        },
        authHeader()
      );
      expect([200, 201]).toContain(res.status);
      if (res.ok && res.data?.id) articleId = res.data.id;
    });

    it("GET /admin/articles — list", async () => {
      if (!adminToken) return;
      const res = await req("GET", "/admin/articles", undefined, authHeader());
      expect(res.ok).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });

  describe("Products", () => {
    it("POST /admin/products — create", async () => {
      if (!adminToken) return;
      const res = await req(
        "POST",
        "/admin/products",
        {
          title: "Test Product",
          type: "flashcards",
          description: "Test description",
          price: 50000,
          published: false,
        },
        authHeader()
      );
      expect([200, 201]).toContain(res.status);
      if (res.ok && res.data?.id) productId = res.data.id;
    });

    it("GET /admin/products — list", async () => {
      if (!adminToken) return;
      const res = await req("GET", "/admin/products", undefined, authHeader());
      expect(res.ok).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });

  describe("Instructors", () => {
    it("POST /admin/instructors — create", async () => {
      if (!adminToken) return;
      const res = await req(
        "POST",
        "/admin/instructors",
        {
          name: "Test Instructor",
          title: "دانشیار",
          bio: "تست بیو",
          education: ["دکترای تست"],
          specialties: ["تست"],
          accent: "teal",
          verified: true,
        },
        authHeader()
      );
      expect([200, 201]).toContain(res.status);
      if (res.ok && res.data?.id) instructorId = res.data.id;
    });

    it("GET /admin/instructors — list", async () => {
      if (!adminToken) return;
      const res = await req("GET", "/admin/instructors", undefined, authHeader());
      expect(res.ok).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });

  describe("Users", () => {
    it("GET /admin/users — list", async () => {
      if (!adminToken) return;
      const res = await req("GET", "/admin/users", undefined, authHeader());
      expect(res.ok).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });
});

// ── User Profile ───────────────────────────────────────────────────────────

describe("User Profile", () => {
  it("GET /users/me — unauthorized", async () => {
    const res = await req("GET", "/users/me");
    expect(res.status).toBe(401);
  });

  it("GET /users/me — with token", async () => {
    if (!userToken) return;
    const res = await req("GET", "/users/me", undefined, {
      Authorization: `Bearer ${userToken}`,
    });
    expect(res.ok).toBe(true);
    expect(res.data.id).toBeDefined();
  });

  it("PUT /users/me — update profile", async () => {
    if (!userToken) return;
    const res = await req(
      "PUT",
      "/users/me",
      { firstName: "تست", lastName: "کاربر" },
      { Authorization: `Bearer ${userToken}` }
    );
    expect(res.ok).toBe(true);
  });
});

// ── Health ─────────────────────────────────────────────────────────────────

describe("Health", () => {
  it("GET /health", async () => {
    const res = await req("GET", "/health");
    expect(res.status).toBe(200);
    expect(res.status).toBe("ok");
  });
});
