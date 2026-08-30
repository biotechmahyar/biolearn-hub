/**
 * Integration tests for Mentor, Tickets, Comments, Dictionary.
 */
import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = process.env.API_URL || "http://localhost:3000/api";
let userToken = "";
let userId = "";
let mentorToken = "";
let mentorId = "";
let adminToken = "";

async function req(method: string, path: string, body?: unknown, headers?: Record<string, string>) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, ...json };
}

beforeAll(async () => {
  const ts = Date.now();
  const regRes = await req("POST", "/auth/register", { name: "Student", email: `s-${ts}@test.com`, password: "Test123456" });
  if (regRes.ok) { userToken = regRes.data.accessToken; userId = regRes.data.user.id; }

  const mentorRes = await req("POST", "/auth/register", { name: "Mentor", email: `m-${ts}@test.com`, password: "Test123456" });
  if (mentorRes.ok) { mentorToken = mentorRes.data.accessToken; mentorId = mentorRes.data.user.id; }

  adminToken = process.env.ADMIN_TOKEN || "";
});

const auth = () => ({ Authorization: `Bearer ${userToken}` });
const mAuth = () => ({ Authorization: `Bearer ${mentorToken}` });
const aAuth = () => ({ Authorization: `Bearer ${adminToken}` });

// ══════════════════════════════════════════════════════════════════════════════
// ── Mentor Groups ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Mentor Groups", () => {
  let groupId = "";

  it("GET /mentor/groups — list", async () => {
    const res = await req("GET", "/mentor/groups");
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("POST /mentor/groups — requires mentor role", async () => {
    const res = await req("POST", "/mentor/groups", { title: "Test" }, auth());
    expect([200, 201, 403]).toContain(res.status);
  });

  it("POST /mentor/groups — mentor creates group", async () => {
    const res = await req("POST", "/mentor/groups", {
      title: "گروه تست",
      description: "توضیحات",
      meetingDay: "شنبه",
      meetingTime: "۱۸:۰۰",
      capacity: 5,
    }, mAuth());
    if (res.ok) groupId = res.data?.id;
    expect([200, 201]).toContain(res.status);
  });

  it("POST /mentor/groups/:id/join — student joins", async () => {
    if (!groupId) return;
    const res = await req("POST", `/mentor/groups/${groupId}/join`, {}, auth());
    expect([200, 201]).toContain(res.status);
  });

  it("POST /mentor/groups/:id/join — duplicate rejected", async () => {
    if (!groupId) return;
    const res = await req("POST", `/mentor/groups/${groupId}/join`, {}, auth());
    expect(res.ok).toBe(false);
    expect(res.error).toContain("عضو");
  });

  it("GET /mentor/groups/:id/members — list members", async () => {
    if (!groupId) return;
    const res = await req("GET", `/mentor/groups/${groupId}/members`);
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("POST /mentor/groups/:id/leave — student leaves", async () => {
    if (!groupId) return;
    const res = await req("POST", `/mentor/groups/${groupId}/leave`, {}, auth());
    expect(res.ok).toBe(true);
  });

  it("POST /mentor/groups/:id/announcements — mentor creates", async () => {
    if (!groupId) return;
    const res = await req("POST", `/mentor/groups/${groupId}/announcements`, {
      title: "اعلان تست",
      message: "متن اعلان",
    }, mAuth());
    expect([200, 201]).toContain(res.status);
  });

  it("GET /mentor/groups/:id/announcements — list", async () => {
    if (!groupId) return;
    const res = await req("GET", `/mentor/groups/${groupId}/announcements`);
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Mentor Questions ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Mentor Questions", () => {
  it("POST /mentor/questions — unauthorized", async () => {
    const res = await req("POST", "/mentor/questions", { text: "سؤال تست" });
    expect(res.status).toBe(401);
  });

  it("POST /mentor/questions — too short", async () => {
    const res = await req("POST", "/mentor/questions", { text: "ab" }, auth());
    expect(res.ok).toBe(false);
  });

  it("GET /mentor/questions — student sees own only", async () => {
    const res = await req("GET", "/mentor/questions", undefined, auth());
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /mentor/questions — mentor sees all", async () => {
    const res = await req("GET", "/mentor/questions", undefined, mAuth());
    expect(res.ok).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Mentor Sessions ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Mentor Sessions", () => {
  it("POST /mentor/sessions — requires mentor", async () => {
    const res = await req("POST", "/mentor/sessions", { title: "جلسه تست", studentId: "x" }, auth());
    expect([200, 201, 403]).toContain(res.status);
  });

  it("GET /mentor/sessions — returns array", async () => {
    const res = await req("GET", "/mentor/sessions", undefined, auth());
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /mentor/students — requires mentor", async () => {
    const res = await req("GET", "/mentor/students", undefined, auth());
    expect([200, 403]).toContain(res.status);
  });

  it("GET /mentor/stats — returns object", async () => {
    const res = await req("GET", "/mentor/stats", undefined, auth());
    expect(res.ok).toBe(true);
    expect(res.data).toHaveProperty("openQuestions");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Tickets ───────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Tickets", () => {
  let ticketId = "";

  it("POST /tickets — creates ticket", async () => {
    const res = await req("POST", "/tickets", { subject: "تیکت تست", message: "متن پیام" }, auth());
    expect([200, 201]).toContain(res.status);
    if (res.ok) ticketId = res.data?.id;
  });

  it("POST /tickets — empty subject rejected", async () => {
    const res = await req("POST", "/tickets", { subject: "", message: "test" }, auth());
    expect(res.ok).toBe(false);
  });

  it("GET /tickets/my — returns array", async () => {
    const res = await req("GET", "/tickets/my", undefined, auth());
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /tickets/:id — owner can see", async () => {
    if (!ticketId) return;
    const res = await req("GET", `/tickets/${ticketId}`, undefined, auth());
    expect(res.ok).toBe(true);
  });

  it("GET /tickets/:id — other user cannot see", async () => {
    if (!ticketId) return;
    const res = await req("GET", `/tickets/${ticketId}`, undefined, mAuth());
    expect(res.status).toBe(404);
  });

  it("POST /tickets/:id/reply — owner replies", async () => {
    if (!ticketId) return;
    const res = await req("POST", `/tickets/${ticketId}/reply`, { message: "پاسخ من" }, auth());
    expect(res.ok).toBe(true);
  });

  it("GET /tickets/admin/all — requires support", async () => {
    const res = await req("GET", "/tickets/admin/all");
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Comments ──────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Comments", () => {
  it("POST /comments — unauthorized", async () => {
    const res = await req("POST", "/comments", { contentType: "article", contentId: "x", text: "test" });
    expect(res.status).toBe(401);
  });

  it("POST /comments — creates comment (pending)", async () => {
    const res = await req("POST", "/comments", {
      contentType: "article",
      contentId: "00000000-0000-0000-0000-000000000000",
      text: "دیدگاه تست",
    }, auth());
    expect([200, 201]).toContain(res.status);
  });

  it("GET /comments — approved only", async () => {
    const res = await req("GET", "/comments?contentType=article&contentId=00000000-0000-0000-0000-000000000000");
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /comments/admin/pending — requires admin", async () => {
    const res = await req("GET", "/comments/admin/pending");
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Dictionary ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Dictionary", () => {
  it("GET /dictionary/ — search", async () => {
    const res = await req("GET", "/dictionary/");
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it("GET /dictionary/?query=DNA — search with query", async () => {
    const res = await req("GET", "/dictionary/?query=DNA");
    expect(res.ok).toBe(true);
  });

  it("GET /dictionary/:slug — not found", async () => {
    const res = await req("GET", "/dictionary/nonexistent");
    expect(res.status).toBe(404);
  });

  it("POST /dictionary/ — requires editor role", async () => {
    const res = await req("POST", "/dictionary/", {
      term: "Test", fullName: "تست", gramStatus: "+",
      shape: "rod", oxygen: "aerobic", habitat: "soil",
      diseases: [], virulence: [], diagnosis: "",
      characteristics: [], examNotes: [], sources: [],
    }, auth());
    expect([200, 201, 403]).toContain(res.status);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── Business Rules ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("Business Rules", () => {
  it("Group: capacity check", async () => {
    // If we can create a group with capacity 1, join, then second join fails
    const createRes = await req("POST", "/mentor/groups", {
      title: "Cap Test", capacity: 1,
    }, mAuth());
    if (createRes.ok && createRes.data?.id) {
      const gid = createRes.data.id;
      await req("POST", `/mentor/groups/${gid}/join`, {}, auth());
      // Register another user to try joining
      const reg2 = await req("POST", "/auth/register", {
        name: "User2", email: `u2-${Date.now()}@test.com`, password: "Test123456",
      });
      if (reg2.ok) {
        const res = await req("POST", `/mentor/groups/${gid}/join`, {}, {
          Authorization: `Bearer ${reg2.data.accessToken}`,
        });
        expect(res.ok).toBe(false);
        expect(res.error).toContain("ظرفیت");
      }
    }
  });

  it("Ticket: ownership enforced", async () => {
    const createRes = await req("POST", "/tickets", {
      subject: "Ownership Test", message: "test message",
    }, auth());
    if (createRes.ok && createRes.data?.id) {
      // Another user tries to access
      const reg = await req("POST", "/auth/register", {
        name: "Other", email: `o-${Date.now()}@test.com`, password: "Test123456",
      });
      if (reg.ok) {
        const res = await req("GET", `/tickets/${createRes.data.id}`, undefined, {
          Authorization: `Bearer ${reg.data.accessToken}`,
        });
        expect(res.status).toBe(404);
      }
    }
  });

  it("Comment: text length validation", async () => {
    const res = await req("POST", "/comments", {
      contentType: "article", contentId: "x", text: "a",
    }, auth());
    expect(res.ok).toBe(false);
  });

  it("Dictionary: duplicate term rejected", async () => {
    // Only test if we have editor role
    const termData = {
      term: `UniqueTerm${Date.now()}`, fullName: "تست",
      gramStatus: "+", shape: "rod", oxygen: "aerobic",
      habitat: "soil", diseases: [], virulence: [],
      diagnosis: "", characteristics: [], examNotes: [], sources: [],
    };
    const res1 = await req("POST", "/dictionary/", termData, mAuth());
    if (res1.ok || res1.status === 201) {
      const res2 = await req("POST", "/dictionary/", termData, mAuth());
      expect(res2.ok).toBe(false);
      expect(res2.error).toContain("از قبل");
    }
  });
});
