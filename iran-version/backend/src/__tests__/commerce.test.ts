import { describe, it, expect } from "vitest";
import { apiRequest, registerUser, authHeaders, randomEmail } from "./setup.js";

describe("Commerce API", () => {
  it("GET /api/commerce/coupons/check without code should fail", async () => {
    const { status } = await apiRequest("GET", "/api/commerce/coupons/check");
    expect(status).toBe(400);
  });

  it("GET /api/commerce/coupons/check with nonexistent code returns null", async () => {
    const { status, data } = await apiRequest(
      "GET",
      "/api/commerce/coupons/check?code=NONEXISTENT"
    );
    expect(status).toBe(200);
    expect(data.data).toBeNull();
  });

  it("POST /api/commerce/purchase requires auth", async () => {
    const { status } = await apiRequest("POST", "/api/commerce/purchase", {
      items: [],
    });
    expect(status).toBe(401);
  });

  it("POST /api/commerce/purchase rejects empty cart", async () => {
    const user = await registerUser("Purchase User", randomEmail(), "password123");
    const { status } = await apiRequest(
      "POST",
      "/api/commerce/purchase",
      { items: [] },
      authHeaders(user)
    );
    expect(status).toBe(400);
  });

  it("GET /api/commerce/orders/my requires auth", async () => {
    const { status } = await apiRequest("GET", "/api/commerce/orders/my");
    expect(status).toBe(401);
  });

  it("GET /api/commerce/enrollments/my returns array for user", async () => {
    const user = await registerUser("Enroll User", randomEmail(), "password123");
    const { status, data } = await apiRequest(
      "GET",
      "/api/commerce/enrollments/my",
      undefined,
      authHeaders(user)
    );
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("GET /api/commerce/bookmarks/my returns array for user", async () => {
    const user = await registerUser("Bookmark User", randomEmail(), "password123");
    const { status, data } = await apiRequest(
      "GET",
      "/api/commerce/bookmarks/my",
      undefined,
      authHeaders(user)
    );
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("GET /api/commerce/flashcards/my returns array for user", async () => {
    const user = await registerUser("Flashcard User", randomEmail(), "password123");
    const { status, data } = await apiRequest(
      "GET",
      "/api/commerce/flashcards/my",
      undefined,
      authHeaders(user)
    );
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("GET /api/commerce/offline-payments/my requires auth", async () => {
    const { status } = await apiRequest("GET", "/api/commerce/offline-payments/my");
    expect(status).toBe(401);
  });

  it("GET /api/commerce/class-enroll/pending requires auth", async () => {
    const { status } = await apiRequest("GET", "/api/commerce/class-enroll/pending");
    expect(status).toBe(401);
  });

  it("POST /api/commerce/bookmarks/toggle requires auth", async () => {
    const { status } = await apiRequest("POST", "/api/commerce/bookmarks/toggle", {
      targetType: "course",
      targetId: "fake-id",
    });
    expect(status).toBe(401);
  });

  it("POST /api/commerce/flashcards requires auth", async () => {
    const { status } = await apiRequest("POST", "/api/commerce/flashcards", {
      courseId: "fake",
      front: "Q",
      back: "A",
    });
    expect(status).toBe(401);
  });
});
