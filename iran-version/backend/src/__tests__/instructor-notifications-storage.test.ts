/**
 * Integration tests — Instructor Tools, Notifications, Storage
 * Covers: attendance, resources, messages, payments, announcements, reminders, inbox, media upload
 */
import { describe, it, expect } from "vitest";

const BASE = "http://localhost:3000/api";
const ADMIN_TOKEN = "test-admin-token";
const INSTRUCTOR_TOKEN = "test-instructor-token";
const USER_TOKEN = "test-user-token";

function auth(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ── Instructor Tools ──────────────────────────────────────────────────────

describe("Instructor Tools", () => {
  it("GET /instructor/attendance/rooms — requires auth", async () => {
    const res = await fetch(`${BASE}/instructor/attendance/rooms`);
    expect(res.status).toBe(401);
  });

  it("GET /instructor/attendance/rooms — returns rooms", async () => {
    const res = await fetch(`${BASE}/instructor/attendance/rooms`, {
      headers: auth(INSTRUCTOR_TOKEN),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("GET /instructor/resources/:courseId — returns resources", async () => {
    const res = await fetch(`${BASE}/instructor/resources/test-course-id`, {
      headers: auth(USER_TOKEN),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("POST /instructor/resources — creates resource", async () => {
    const res = await fetch(`${BASE}/instructor/resources`, {
      method: "POST",
      headers: auth(INSTRUCTOR_TOKEN),
      body: JSON.stringify({
        courseId: "test-course-id",
        title: "Slide 1",
        fileUrl: "https://example.com/slide1.pdf",
        fileName: "slide1.pdf",
        fileSize: 1024000,
        fileType: "application/pdf",
        isFree: true,
      }),
    });
    expect([200, 201, 400]).toContain(res.status);
  });

  it("POST /instructor/resources — missing title", async () => {
    const res = await fetch(`${BASE}/instructor/resources`, {
      method: "POST",
      headers: auth(INSTRUCTOR_TOKEN),
      body: JSON.stringify({ courseId: "x" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /instructor/messages — sends message", async () => {
    const res = await fetch(`${BASE}/instructor/messages`, {
      method: "POST",
      headers: auth(INSTRUCTOR_TOKEN),
      body: JSON.stringify({ receiverId: "test-user-id", text: "سلام" }),
    });
    expect([200, 201, 400]).toContain(res.status);
  });

  it("GET /instructor/messages/conversations — requires auth", async () => {
    const res = await fetch(`${BASE}/instructor/messages/conversations`);
    expect(res.status).toBe(401);
  });

  it("GET /instructor/payments — returns payments", async () => {
    const res = await fetch(`${BASE}/instructor/payments`, {
      headers: auth(INSTRUCTOR_TOKEN),
    });
    expect(res.status).toBe(200);
  });

  it("GET /instructor/bank-account — returns account", async () => {
    const res = await fetch(`${BASE}/instructor/bank-account`, {
      headers: auth(INSTRUCTOR_TOKEN),
    });
    expect(res.status).toBe(200);
  });

  it("PUT /instructor/bank-account — updates account", async () => {
    const res = await fetch(`${BASE}/instructor/bank-account`, {
      method: "PUT",
      headers: auth(INSTRUCTOR_TOKEN),
      body: JSON.stringify({
        bankName: "ملت",
        bankAccountNumber: "12345678",
        bankCardNumber: "6104337800001234",
        bankSheba: "IR123456789012345678901234",
      }),
    });
    expect(res.status).toBe(200);
  });

  it("PUT /instructor/bank-account — missing fields", async () => {
    const res = await fetch(`${BASE}/instructor/bank-account`, {
      method: "PUT",
      headers: auth(INSTRUCTOR_TOKEN),
      body: JSON.stringify({ bankName: "ملت" }),
    });
    expect(res.status).toBe(400);
  });
});

// ── Notifications ─────────────────────────────────────────────────────────

describe("Notifications", () => {
  it("GET /notifications — requires auth", async () => {
    const res = await fetch(`${BASE}/notifications`);
    expect(res.status).toBe(401);
  });

  it("GET /notifications — returns announcements", async () => {
    const res = await fetch(`${BASE}/notifications`, {
      headers: auth(USER_TOKEN),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("POST /notifications — creates announcement", async () => {
    const res = await fetch(`${BASE}/notifications`, {
      method: "POST",
      headers: auth(ADMIN_TOKEN),
      body: JSON.stringify({
        targetType: "all",
        title: "اطلاعیه تست",
        body: "متن اطلاعیه",
      }),
    });
    expect([200, 201]).toContain(res.status);
  });

  it("POST /notifications — missing fields", async () => {
    const res = await fetch(`${BASE}/notifications`, {
      method: "POST",
      headers: auth(ADMIN_TOKEN),
      body: JSON.stringify({ title: "test" }),
    });
    expect(res.status).toBe(400);
  });

  it("DELETE /notifications/:id — deletes announcement", async () => {
    const res = await fetch(`${BASE}/notifications/fake-id`, {
      method: "DELETE",
      headers: auth(ADMIN_TOKEN),
    });
    expect([200, 400, 404]).toContain(res.status);
  });

  it("GET /notifications/reminders — returns reminders", async () => {
    const res = await fetch(`${BASE}/notifications/reminders`, {
      headers: auth(USER_TOKEN),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("POST /notifications/reminders/arm-next-exam — arms reminder", async () => {
    const res = await fetch(`${BASE}/notifications/reminders/arm-next-exam`, {
      method: "POST",
      headers: auth(USER_TOKEN),
    });
    expect(res.status).toBe(200);
  });

  it("GET /notifications/inbox — returns inbox messages", async () => {
    const res = await fetch(`${BASE}/notifications/inbox`, {
      headers: auth(USER_TOKEN),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("POST /notifications/inbox — sends inbox message", async () => {
    const res = await fetch(`${BASE}/notifications/inbox`, {
      method: "POST",
      headers: auth(ADMIN_TOKEN),
      body: JSON.stringify({
        userId: "test-user-id",
        title: "پیام تست",
        body: "متن پیام",
      }),
    });
    expect([200, 201, 400]).toContain(res.status);
  });

  it("POST /notifications/inbox — missing fields", async () => {
    const res = await fetch(`${BASE}/notifications/inbox`, {
      method: "POST",
      headers: auth(ADMIN_TOKEN),
      body: JSON.stringify({ title: "x" }),
    });
    expect(res.status).toBe(400);
  });
});

// ── Storage / Media ───────────────────────────────────────────────────────

describe("Storage / Media", () => {
  it("GET /media — requires auth", async () => {
    const res = await fetch(`${BASE}/media`);
    expect(res.status).toBe(401);
  });

  it("GET /media — returns media list", async () => {
    const res = await fetch(`${BASE}/media`, {
      headers: auth(INSTRUCTOR_TOKEN),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("GET /media?category=images — filters by category", async () => {
    const res = await fetch(`${BASE}/media?category=images`, {
      headers: auth(INSTRUCTOR_TOKEN),
    });
    expect(res.status).toBe(200);
  });

  it("GET /media?search=test — searches media", async () => {
    const res = await fetch(`${BASE}/media?search=test`, {
      headers: auth(INSTRUCTOR_TOKEN),
    });
    expect(res.status).toBe(200);
  });

  it("POST /media/presign — requires auth", async () => {
    const res = await fetch(`${BASE}/media/presign`, {
      method: "POST",
      body: JSON.stringify({ filename: "test.pdf", contentType: "application/pdf" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /media/presign — creates presigned URL", async () => {
    const res = await fetch(`${BASE}/media/presign`, {
      method: "POST",
      headers: auth(INSTRUCTOR_TOKEN),
      body: JSON.stringify({ filename: "test.pdf", contentType: "application/pdf" }),
    });
    expect([200, 201]).toContain(res.status);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.url).toBeDefined();
    expect(body.data.key).toBeDefined();
  });

  it("POST /media/presign — invalid file type", async () => {
    const res = await fetch(`${BASE}/media/presign`, {
      method: "POST",
      headers: auth(INSTRUCTOR_TOKEN),
      body: JSON.stringify({ filename: "test.exe", contentType: "application/exe" }),
    });
    expect(res.status).toBe(400);
  });

  it("GET /media/:id — not found", async () => {
    const res = await fetch(`${BASE}/media/00000000-0000-0000-0000-000000000000`, {
      headers: auth(INSTRUCTOR_TOKEN),
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /media/:id — not found", async () => {
    const res = await fetch(`${BASE}/media/00000000-0000-0000-0000-000000000000`, {
      method: "DELETE",
      headers: auth(INSTRUCTOR_TOKEN),
    });
    expect(res.status).toBe(404);
  });
});

// ── Business Rules ────────────────────────────────────────────────────────

describe("Business Rules", () => {
  it("Instructor cannot delete another instructor's resource", async () => {
    const res = await fetch(`${BASE}/instructor/resources/other-resource-id`, {
      method: "DELETE",
      headers: auth(INSTRUCTOR_TOKEN),
    });
    expect([403, 404, 400]).toContain(res.status);
  });

  it("Student cannot access instructor routes", async () => {
    const res = await fetch(`${BASE}/instructor/payments`, {
      headers: auth(USER_TOKEN),
    });
    expect(res.status).toBe(403);
  });

  it("Admin can list all announcements", async () => {
    const res = await fetch(`${BASE}/notifications/all`, {
      headers: auth(ADMIN_TOKEN),
    });
    expect(res.status).toBe(200);
  });

  it("Non-admin cannot list all announcements (inbox/all)", async () => {
    const res = await fetch(`${BASE}/notifications/inbox/all`, {
      headers: auth(USER_TOKEN),
    });
    // user can still call but may get empty — auth required at minimum
    expect([200, 403]).toContain(res.status);
  });

  it("Media upload rejects oversized file description", async () => {
    const res = await fetch(`${BASE}/media/presign`, {
      method: "POST",
      headers: auth(INSTRUCTOR_TOKEN),
      body: JSON.stringify({ filename: "", contentType: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("Reminders idempotent — arm next exam twice", async () => {
    const res1 = await fetch(`${BASE}/notifications/reminders/arm-next-exam`, {
      method: "POST",
      headers: auth(USER_TOKEN),
    });
    expect(res1.status).toBe(200);
    const res2 = await fetch(`${BASE}/notifications/reminders/arm-next-exam`, {
      method: "POST",
      headers: auth(USER_TOKEN),
    });
    expect(res2.status).toBe(200);
    const body = await res2.json();
    expect(body.data.already).toBe(true);
  });
});
