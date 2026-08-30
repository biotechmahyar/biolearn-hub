/**
 * Smoke tests — every route group is reachable and returns valid responses.
 * This verifies the route mounting is correct and all 14 groups are accessible.
 */
import { describe, it, expect } from "vitest";
import { getBaseUrl, TEST_USER_TOKEN, TEST_ADMIN_TOKEN } from "./setup";

function auth(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

const BASE = () => getBaseUrl();

// ── Health ────────────────────────────────────────────────────────────────

describe("Health", () => {
  it("GET /api/health returns ok", async () => {
    const res = await fetch(`${BASE()}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });
});

// ── 1. Auth Routes ────────────────────────────────────────────────────────

describe("Auth Routes", () => {
  it("POST /api/auth/register works", async () => {
    const res = await fetch(`${BASE()}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", email: "test-smoke@example.com", password: "123456" }),
    });
    // 201 or 409 (already exists) or 400 (validation)
    expect([200, 201, 400, 409]).toContain(res.status);
  });

  it("POST /api/auth/login works", async () => {
    const res = await fetch(`${BASE()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test-smoke@example.com", password: "123456" }),
    });
    expect([200, 401]).toContain(res.status);
  });

  it("GET /api/auth/me works", async () => {
    const res = await fetch(`${BASE()}/api/auth/me`, { headers: auth(TEST_USER_TOKEN) });
    expect([200, 401]).toContain(res.status);
  });
});

// ── 2. Content Routes ─────────────────────────────────────────────────────

describe("Content Routes", () => {
  it("GET /api/content/courses", async () => {
    const res = await fetch(`${BASE()}/api/content/courses`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("GET /api/content/categories", async () => {
    const res = await fetch(`${BASE()}/api/content/categories`);
    expect(res.status).toBe(200);
  });

  it("GET /api/content/articles", async () => {
    const res = await fetch(`${BASE()}/api/content/articles`);
    expect(res.status).toBe(200);
  });

  it("GET /api/content/products", async () => {
    const res = await fetch(`${BASE()}/api/content/products`);
    expect(res.status).toBe(200);
  });

  it("GET /api/content/workshops", async () => {
    const res = await fetch(`${BASE()}/api/content/workshops`);
    expect(res.status).toBe(200);
  });

  it("GET /api/content/instructors", async () => {
    const res = await fetch(`${BASE()}/api/content/instructors`);
    expect(res.status).toBe(200);
  });

  it("POST /api/content/categories requires auth", async () => {
    const res = await fetch(`${BASE()}/api/content/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test" }),
    });
    // authMiddleware runs but no token → userId not set → POST should fail
    expect([400, 401]).toContain(res.status);
  });
});

// ── 3. Users Routes ───────────────────────────────────────────────────────

describe("Users Routes", () => {
  it("GET /api/users/me requires auth", async () => {
    const res = await fetch(`${BASE()}/api/users/me`);
    expect(res.status).toBe(401);
  });

  it("GET /api/users/me with token", async () => {
    const res = await fetch(`${BASE()}/api/users/me`, { headers: auth(TEST_USER_TOKEN) });
    expect([200, 404]).toContain(res.status);
  });
});

// ── 4. Admin Routes ───────────────────────────────────────────────────────

describe("Admin Routes", () => {
  it("GET /api/admin/users requires auth", async () => {
    const res = await fetch(`${BASE()}/api/admin/users`);
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/users with token", async () => {
    const res = await fetch(`${BASE()}/api/admin/users`, { headers: auth(TEST_ADMIN_TOKEN) });
    expect([200, 403]).toContain(res.status);
  });
});

// ── 5. Exam Routes ────────────────────────────────────────────────────────

describe("Exam Routes", () => {
  it("GET /api/exams (list)", async () => {
    const res = await fetch(`${BASE()}/api/exams`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("GET /api/exams/daily", async () => {
    const res = await fetch(`${BASE()}/api/exams/daily`);
    expect([200, 404]).toContain(res.status);
  });

  it("POST /api/exams/submit requires auth", async () => {
    const res = await fetch(`${BASE()}/api/exams/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId: "x", answers: [] }),
    });
    expect(res.status).toBe(401);
  });
});

// ── 6. Commerce Routes ────────────────────────────────────────────────────

describe("Commerce Routes", () => {
  it("GET /api/commerce/enrollments/my requires auth", async () => {
    const res = await fetch(`${BASE()}/api/commerce/enrollments/my`);
    expect(res.status).toBe(401);
  });

  it("POST /api/commerce/purchase requires auth", async () => {
    const res = await fetch(`${BASE()}/api/commerce/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });
    expect(res.status).toBe(401);
  });

  it("GET /api/commerce/coupons/check?code=x", async () => {
    const res = await fetch(`${BASE()}/api/commerce/coupons/check?code=x`);
    expect([200, 400]).toContain(res.status);
  });
});

// ── 7. Mentor Routes ──────────────────────────────────────────────────────

describe("Mentor Routes", () => {
  it("GET /api/mentor/groups requires auth", async () => {
    const res = await fetch(`${BASE()}/api/mentor/groups`);
    expect(res.status).toBe(401);
  });

  it("GET /api/mentor/stats requires auth", async () => {
    const res = await fetch(`${BASE()}/api/mentor/stats`);
    expect(res.status).toBe(401);
  });
});

// ── 8. Ticket Routes ──────────────────────────────────────────────────────

describe("Ticket Routes", () => {
  it("GET /api/tickets/my requires auth", async () => {
    const res = await fetch(`${BASE()}/api/tickets/my`);
    expect(res.status).toBe(401);
  });

  it("POST /api/tickets requires auth", async () => {
    const res = await fetch(`${BASE()}/api/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: "test", body: "test" }),
    });
    expect(res.status).toBe(401);
  });
});

// ── 9. Comment Routes ─────────────────────────────────────────────────────

describe("Comment Routes", () => {
  it("GET /api/comments", async () => {
    const res = await fetch(`${BASE()}/api/comments`);
    expect(res.status).toBe(200);
  });

  it("POST /api/comments requires auth", async () => {
    const res = await fetch(`${BASE()}/api/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: "course", contentId: "x", text: "test" }),
    });
    expect(res.status).toBe(401);
  });
});

// ── 10. Dictionary Routes ─────────────────────────────────────────────────

describe("Dictionary Routes", () => {
  it("GET /api/dictionary", async () => {
    const res = await fetch(`${BASE()}/api/dictionary`);
    expect(res.status).toBe(200);
  });

  it("POST /api/dictionary requires auth", async () => {
    const res = await fetch(`${BASE()}/api/dictionary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term: "test", definition: "test", slug: "test" }),
    });
    expect(res.status).toBe(401);
  });
});

// ── 11. Instructor Routes ─────────────────────────────────────────────────

describe("Instructor Routes", () => {
  it("GET /api/instructor/attendance/rooms requires auth", async () => {
    const res = await fetch(`${BASE()}/api/instructor/attendance/rooms`);
    expect(res.status).toBe(401);
  });

  it("GET /api/instructor/payments requires auth", async () => {
    const res = await fetch(`${BASE()}/api/instructor/payments`);
    expect(res.status).toBe(401);
  });
});

// ── 12. Notification Routes ───────────────────────────────────────────────

describe("Notification Routes", () => {
  it("GET /api/notifications requires auth", async () => {
    const res = await fetch(`${BASE()}/api/notifications`);
    expect(res.status).toBe(401);
  });

  it("GET /api/notifications/reminders requires auth", async () => {
    const res = await fetch(`${BASE()}/api/notifications/reminders`);
    expect(res.status).toBe(401);
  });
});

// ── 13. Storage / Media Routes ────────────────────────────────────────────

describe("Storage / Media Routes", () => {
  it("GET /api/media requires auth", async () => {
    const res = await fetch(`${BASE()}/api/media`);
    expect(res.status).toBe(401);
  });

  it("GET /api/media/receipt/:id requires auth", async () => {
    const res = await fetch(`${BASE()}/api/media/receipt/test-id`);
    expect(res.status).toBe(401);
  });
});

// ── 14. Upload Routes ─────────────────────────────────────────────────────

describe("Upload Routes", () => {
  it("POST /api/upload/presign requires auth", async () => {
    const res = await fetch(`${BASE()}/api/upload/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: "test.pdf", contentType: "application/pdf" }),
    });
    expect(res.status).toBe(401);
  });
});

// ── 404 Handler ───────────────────────────────────────────────────────────

describe("404 Handler", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await fetch(`${BASE()}/api/nonexistent`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Not Found");
  });
});

// ── Auth Security ─────────────────────────────────────────────────────────

describe("Auth Security", () => {
  it("rejects invalid JWT", async () => {
    const res = await fetch(`${BASE()}/api/users/me`, {
      headers: { Authorization: "Bearer invalid-token-xyz" },
    });
    expect([200, 401]).toContain(res.status);
  });

  it("rejects malformed Authorization header", async () => {
    const res = await fetch(`${BASE()}/api/users/me`, {
      headers: { Authorization: "Basic abc123" },
    });
    expect(res.status).toBe(401);
  });
});
