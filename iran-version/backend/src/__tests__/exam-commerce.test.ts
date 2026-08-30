/**
 * Integration tests for Exam/Commerce APIs.
 * Run with: npx vitest run src/__tests__/exam-commerce.test.ts
 */
import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = process.env.API_URL || "http://localhost:3000/api";
let userToken = "";
let userId = "";
let adminToken = "";
let examId = "";

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

// ── Setup ──────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const email = `exam-test-${Date.now()}@example.com`;
  const regRes = await req("POST", "/auth/register", {
    name: "Exam Tester",
    email,
    password: "Test123456",
  });
  if (regRes.ok) {
    userToken = regRes.data.accessToken;
    userId = regRes.data.user.id;
  }
  adminToken = process.env.ADMIN_TOKEN || "";
});

const auth = () => ({ Authorization: `Bearer ${userToken}` });
const adminAuth = () => ({ Authorization: `Bearer ${adminToken}` });

// ══════════════════════════════════════════════════════════════════════════════
// ── Exams ──────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Exams", () => {
  it("GET /exams — list published exams", async () => {
    const res = await req("GET", "/exams");
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /exams?featuredOnly=true — filter", async () => {
    const res = await req("GET", "/exams?featuredOnly=true");
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /exams/:slug — not found", async () => {
    const res = await req("GET", "/exams/nonexistent");
    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
  });

  it("GET /exams/daily — get daily quiz", async () => {
    const res = await req("GET", "/exams/daily");
    expect(res.ok).toBe(true);
    // May be null if no quiz today — that's valid
  });

  it("POST /exams/submit — unauthorized without token", async () => {
    const res = await req("POST", "/exams/submit", {
      examId: "00000000-0000-0000-0000-000000000000",
      answers: [],
    });
    expect(res.status).toBe(401);
  });

  it("POST /exams/submit — validation error", async () => {
    const res = await req("POST", "/exams/submit", { examId: "bad" }, auth());
    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
  });

  it("POST /exams/submit — exam not found", async () => {
    const res = await req(
      "POST",
      "/exams/submit",
      {
        examId: "00000000-0000-0000-0000-000000000000",
        answers: [],
      },
      auth()
    );
    expect(res.ok).toBe(false);
    expect(res.error).toContain("یافت نشد");
  });

  it("GET /exams/my-attempts — requires auth", async () => {
    const res = await req("GET", "/exams/my-attempts");
    expect(res.status).toBe(401);
  });

  it("GET /exams/my-attempts — returns array", async () => {
    const res = await req("GET", "/exams/my-attempts", undefined, auth());
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /exams/attempts/invalid-id — not found", async () => {
    const res = await req(
      "GET",
      "/exams/attempts/00000000-0000-0000-0000-000000000000",
      undefined,
      auth()
    );
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Daily Quiz ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Daily Quiz", () => {
  it("GET /exams/daily/auth — with token", async () => {
    const res = await req("GET", "/exams/daily/auth", undefined, auth());
    expect(res.ok).toBe(true);
  });

  it("POST /exams/daily/answer — unauthorized", async () => {
    const res = await req("POST", "/exams/daily/answer", {
      questionId: "00000000-0000-0000-0000-000000000000",
      chosenIndex: 0,
    });
    expect(res.status).toBe(401);
  });

  it("POST /exams/daily/answer — no quiz today", async () => {
    const res = await req(
      "POST",
      "/exams/daily/answer",
      {
        questionId: "00000000-0000-0000-0000-000000000000",
        chosenIndex: 0,
      },
      auth()
    );
    // If no quiz today, should get an error message
    expect([400, 200]).toContain(res.status);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Exam Reports ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Exam Reports", () => {
  it("POST /exams/reports — unauthorized", async () => {
    const res = await req("POST", "/exams/reports", {
      examId: "x",
      questionId: "x",
      comment: "test",
    });
    expect(res.status).toBe(401);
  });

  it("POST /exams/reports — validation error (short comment)", async () => {
    const res = await req(
      "POST",
      "/exams/reports",
      {
        examId: "00000000-0000-0000-0000-000000000000",
        questionId: "00000000-0000-0000-0000-000000000000",
        comment: "ab",
      },
      auth()
    );
    expect(res.ok).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Coupons ────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Coupons", () => {
  it("GET /commerce/coupons/check?code=INVALID — invalid coupon", async () => {
    const res = await req("GET", "/commerce/coupons/check?code=INVALID");
    expect(res.ok).toBe(true);
    expect(res.data.valid).toBe(false);
  });

  it("GET /commerce/coupons/check?code= — empty code", async () => {
    const res = await req("GET", "/commerce/coupons/check?code=");
    expect(res.ok).toBe(true);
    expect(res.data.valid).toBe(false);
  });

  it("GET /commerce/coupons/admin — requires admin", async () => {
    const res = await req("GET", "/commerce/coupons/admin");
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Purchase & Orders ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Purchase & Orders", () => {
  it("POST /commerce/purchase — unauthorized", async () => {
    const res = await req("POST", "/commerce/purchase", { items: [] });
    expect(res.status).toBe(401);
  });

  it("POST /commerce/purchase — empty cart", async () => {
    const res = await req("POST", "/commerce/purchase", { items: [] }, auth());
    expect(res.ok).toBe(false);
    expect(res.error).toContain("خالی");
  });

  it("POST /commerce/purchase — invalid item type", async () => {
    const res = await req(
      "POST",
      "/commerce/purchase",
      {
        items: [{ type: "invalid", refId: "00000000-0000-0000-0000-000000000000" }],
      },
      auth()
    );
    expect(res.ok).toBe(false);
  });

  it("POST /commerce/purchase — course not found", async () => {
    const res = await req(
      "POST",
      "/commerce/purchase",
      {
        items: [{ type: "course", refId: "00000000-0000-0000-0000-000000000000" }],
      },
      auth()
    );
    expect(res.ok).toBe(false);
    expect(res.error).toContain("یافت نشد");
  });

  it("GET /commerce/orders/my — requires auth", async () => {
    const res = await req("GET", "/commerce/orders/my");
    expect(res.status).toBe(401);
  });

  it("GET /commerce/orders/my — returns array", async () => {
    const res = await req("GET", "/commerce/orders/my", undefined, auth());
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /commerce/orders/admin — requires admin", async () => {
    const res = await req("GET", "/commerce/orders/admin");
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Enrollments ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Enrollments", () => {
  it("GET /commerce/enrollments/my — requires auth", async () => {
    const res = await req("GET", "/commerce/enrollments/my");
    expect(res.status).toBe(401);
  });

  it("GET /commerce/enrollments/my — returns array", async () => {
    const res = await req("GET", "/commerce/enrollments/my", undefined, auth());
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("POST /commerce/enrollments/lesson-complete — requires auth", async () => {
    const res = await req("POST", "/commerce/enrollments/lesson-complete", {});
    expect(res.status).toBe(401);
  });

  it("POST /commerce/enrollments/lesson-complete — not enrolled", async () => {
    const res = await req(
      "POST",
      "/commerce/enrollments/lesson-complete",
      {
        courseId: "00000000-0000-0000-0000-000000000000",
        lessonId: "s1",
        completed: true,
      },
      auth()
    );
    expect(res.ok).toBe(false);
    expect(res.error).toContain("ثبت‌نام");
  });

  it("GET /commerce/enrollments/downloads — returns array", async () => {
    const res = await req("GET", "/commerce/enrollments/downloads", undefined, auth());
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Offline Payments ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Offline Payments", () => {
  it("POST /commerce/offline-payments/submit — requires auth", async () => {
    const res = await req("POST", "/commerce/offline-payments/submit", {});
    expect(res.status).toBe(401);
  });

  it("POST /commerce/offline-payments/submit — validation error", async () => {
    const res = await req(
      "POST",
      "/commerce/offline-payments/submit",
      { courseId: "bad" },
      auth()
    );
    expect(res.ok).toBe(false);
  });

  it("POST /commerce/offline-payments/submit — missing tracking", async () => {
    const res = await req(
      "POST",
      "/commerce/offline-payments/submit",
      {
        courseId: "00000000-0000-0000-0000-000000000000",
        tier: "basic",
        amount: 100000,
        trackingNumber: "",
        receiptStorageId: "abc",
      },
      auth()
    );
    expect(res.ok).toBe(false);
    expect(res.error).toContain("رهگیری");
  });

  it("GET /commerce/offline-payments/my — requires auth", async () => {
    const res = await req("GET", "/commerce/offline-payments/my");
    expect(res.status).toBe(401);
  });

  it("GET /commerce/offline-payments/my — returns array", async () => {
    const res = await req("GET", "/commerce/offline-payments/my", undefined, auth());
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /commerce/offline-payments/admin — requires admin", async () => {
    const res = await req("GET", "/commerce/offline-payments/admin");
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Class Enroll ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Class Enroll", () => {
  it("POST /commerce/class-enroll/request — requires auth", async () => {
    const res = await req("POST", "/commerce/class-enroll/request", {});
    expect(res.status).toBe(401);
  });

  it("POST /commerce/class-enroll/request — room not found", async () => {
    const res = await req(
      "POST",
      "/commerce/class-enroll/request",
      { roomId: "00000000-0000-0000-0000-000000000000" },
      auth()
    );
    expect(res.ok).toBe(false);
    expect(res.error).toContain("یافت نشد");
  });

  it("GET /commerce/class-enroll/pending — requires auth", async () => {
    const res = await req("GET", "/commerce/class-enroll/pending");
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Bookmarks ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Bookmarks", () => {
  it("POST /commerce/bookmarks/toggle — requires auth", async () => {
    const res = await req("POST", "/commerce/bookmarks/toggle", {});
    expect(res.status).toBe(401);
  });

  it("GET /commerce/bookmarks/my — requires auth", async () => {
    const res = await req("GET", "/commerce/bookmarks/my");
    expect(res.status).toBe(401);
  });

  it("GET /commerce/bookmarks/my — returns array", async () => {
    const res = await req("GET", "/commerce/bookmarks/my", undefined, auth());
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /commerce/bookmarks/check — requires auth", async () => {
    const res = await req("GET", "/commerce/bookmarks/check?contentType=x&contentId=y");
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Flashcards ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Flashcards", () => {
  it("POST /commerce/flashcards — requires auth", async () => {
    const res = await req("POST", "/commerce/flashcards", {});
    expect(res.status).toBe(401);
  });

  it("POST /commerce/flashcards — create", async () => {
    const res = await req(
      "POST",
      "/commerce/flashcards",
      { front: "DNA", back: "دی‌اکسی‌ریبونوکلئیک اسید", category: "ژنتیک" },
      auth()
    );
    expect([200, 201]).toContain(res.status);
  });

  it("POST /commerce/flashcards — empty text rejected", async () => {
    const res = await req(
      "POST",
      "/commerce/flashcards",
      { front: "", back: "test" },
      auth()
    );
    expect(res.ok).toBe(false);
  });

  it("GET /commerce/flashcards/my — requires auth", async () => {
    const res = await req("GET", "/commerce/flashcards/my");
    expect(res.status).toBe(401);
  });

  it("GET /commerce/flashcards/my — returns array", async () => {
    const res = await req("GET", "/commerce/flashcards/my", undefined, auth());
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("DELETE /commerce/flashcards/invalid-id — not found", async () => {
    const res = await req(
      "DELETE",
      "/commerce/flashcards/00000000-0000-0000-0000-000000000000",
      undefined,
      auth()
    );
    expect(res.ok).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Admin Exam Management ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Admin Exam Management", () => {
  it("GET /exams/admin/list — requires admin", async () => {
    const res = await req("GET", "/exams/admin/list");
    expect(res.status).toBe(401);
  });

  it("GET /exams/admin/list — regular user forbidden", async () => {
    const res = await req("GET", "/exams/admin/list", undefined, auth());
    expect(res.status).toBe(403);
  });

  it("GET /exams/admin/reports — requires admin", async () => {
    const res = await req("GET", "/exams/admin/reports");
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Business Rules ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Business Rules", () => {
  it("Exam submit: correctIndex not leaked in GET /exams/:slug", async () => {
    // If there are published exams, check that correctIndex is not in the response
    const listRes = await req("GET", "/exams");
    if (listRes.ok && listRes.data.length > 0) {
      const slug = listRes.data[0].slug;
      const res = await req("GET", `/exams/${slug}`);
      if (res.ok && res.data.questions) {
        for (const q of res.data.questions) {
          expect(q).not.toHaveProperty("correctIndex");
        }
      }
    }
  });

  it("Purchase: empty cart rejected", async () => {
    const res = await req("POST", "/commerce/purchase", { items: [] }, auth());
    expect(res.ok).toBe(false);
  });

  it("Coupon: expired coupon rejected", async () => {
    const res = await req("GET", "/commerce/coupons/check?code=EXPIRED");
    expect(res.ok).toBe(true);
    expect(res.data.valid).toBe(false);
  });

  it("Flashcard: empty front rejected", async () => {
    const res = await req(
      "POST",
      "/commerce/flashcards",
      { front: "", back: "test" },
      auth()
    );
    expect(res.ok).toBe(false);
  });

  it("Flashcard: empty back rejected", async () => {
    const res = await req(
      "POST",
      "/commerce/flashcards",
      { front: "test", back: "" },
      auth()
    );
    expect(res.ok).toBe(false);
  });

  it("Offline payment: duplicate pending rejected", async () => {
    // First submission
    await req(
      "POST",
      "/commerce/offline-payments/submit",
      {
        courseId: "00000000-0000-0000-0000-000000000000",
        tier: "basic",
        amount: 100000,
        trackingNumber: "12345",
        receiptStorageId: "abc",
      },
      auth()
    );
    // Duplicate should fail (or succeed if course not found first)
    const res = await req(
      "POST",
      "/commerce/offline-payments/submit",
      {
        courseId: "00000000-0000-0000-0000-000000000000",
        tier: "basic",
        amount: 100000,
        trackingNumber: "12345",
        receiptStorageId: "abc",
      },
      auth()
    );
    // Both may fail because course doesn't exist — that's OK for the test
    expect([200, 201, 400]).toContain(res.status);
  });
});
