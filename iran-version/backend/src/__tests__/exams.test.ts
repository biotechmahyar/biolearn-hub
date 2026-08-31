import { describe, it, expect } from "vitest";
import { apiRequest, registerUser, authHeaders, randomEmail } from "./setup.js";

describe("Exams API", () => {
  it("GET /api/exams should return array", async () => {
    const { status, data } = await apiRequest("GET", "/api/exams");
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("GET /api/exams/daily should return quiz or null", async () => {
    const { status, data } = await apiRequest("GET", "/api/exams/daily");
    expect(status).toBe(200);
    // Daily quiz might not exist for today
  });

  it("GET /api/exams/my-attempts requires auth", async () => {
    const { status } = await apiRequest("GET", "/api/exams/my-attempts");
    expect(status).toBe(401);
  });

  it("GET /api/exams/my-attempts returns array for authenticated user", async () => {
    const user = await registerUser("Exam User", randomEmail(), "password123");
    const { status, data } = await apiRequest(
      "GET",
      "/api/exams/my-attempts",
      undefined,
      authHeaders(user)
    );
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("POST /api/exams/submit requires auth", async () => {
    const { status } = await apiRequest("POST", "/api/exams/submit", {
      examId: "fake-id",
      answers: [],
    });
    expect(status).toBe(401);
  });

  it("POST /api/exams/daily/answer requires auth", async () => {
    const { status } = await apiRequest("POST", "/api/exams/daily/answer", {
      chosenIndex: 0,
    });
    expect(status).toBe(401);
  });

  it("POST /api/exams/reports requires auth", async () => {
    const { status } = await apiRequest("POST", "/api/exams/reports", {
      examId: "fake",
      questionId: "fake",
      reason: "test",
    });
    expect(status).toBe(401);
  });

  it("GET /api/exams/admin/list requires admin role", async () => {
    const user = await registerUser("Admin Test", randomEmail(), "password123");
    const { status } = await apiRequest(
      "GET",
      "/api/exams/admin/list",
      undefined,
      authHeaders(user)
    );
    expect(status).toBe(403);
  });
});
