import { describe, it, expect } from "vitest";
import { apiRequest, registerUser, authHeaders, randomEmail } from "./setup.js";

describe("Admin RBAC", () => {
  it("GET /api/admin/courses requires admin role", async () => {
    const user = await registerUser("Regular User", randomEmail(), "password123");
    const { status } = await apiRequest(
      "GET",
      "/api/admin/courses",
      undefined,
      authHeaders(user)
    );
    expect(status).toBe(403);
  });

  it("GET /api/admin/users requires admin role", async () => {
    const user = await registerUser("Regular User 2", randomEmail(), "password123");
    const { status } = await apiRequest(
      "GET",
      "/api/admin/users",
      undefined,
      authHeaders(user)
    );
    expect(status).toBe(403);
  });

  it("GET /api/admin/articles requires admin role", async () => {
    const user = await registerUser("Regular User 3", randomEmail(), "password123");
    const { status } = await apiRequest(
      "GET",
      "/api/admin/articles",
      undefined,
      authHeaders(user)
    );
    expect(status).toBe(403);
  });

  it("GET /api/admin/products requires admin role", async () => {
    const user = await registerUser("Regular User 4", randomEmail(), "password123");
    const { status } = await apiRequest(
      "GET",
      "/api/admin/products",
      undefined,
      authHeaders(user)
    );
    expect(status).toBe(403);
  });

  it("GET /api/admin/workshops requires admin role", async () => {
    const user = await registerUser("Regular User 5", randomEmail(), "password123");
    const { status } = await apiRequest(
      "GET",
      "/api/admin/workshops",
      undefined,
      authHeaders(user)
    );
    expect(status).toBe(403);
  });

  it("GET /api/admin/instructors requires admin role", async () => {
    const user = await registerUser("Regular User 6", randomEmail(), "password123");
    const { status } = await apiRequest(
      "GET",
      "/api/admin/instructors",
      undefined,
      authHeaders(user)
    );
    expect(status).toBe(403);
  });

  it("POST /api/admin/courses without auth returns 401", async () => {
    const { status } = await apiRequest("POST", "/api/admin/courses", {
      title: "Test",
    });
    expect(status).toBe(401);
  });

  it("GET /api/admin/profiles/pending requires admin role", async () => {
    const user = await registerUser("Regular User 7", randomEmail(), "password123");
    const { status } = await apiRequest(
      "GET",
      "/api/admin/profiles/pending",
      undefined,
      authHeaders(user)
    );
    expect(status).toBe(403);
  });

  it("GET /api/admin/offline-payments requires admin role", async () => {
    const user = await registerUser("Regular User 8", randomEmail(), "password123");
    const { status } = await apiRequest(
      "GET",
      "/api/admin/offline-payments",
      undefined,
      authHeaders(user)
    );
    expect(status).toBe(403);
  });

  it("GET /api/commerce/orders/admin requires admin role", async () => {
    const user = await registerUser("Regular User 9", randomEmail(), "password123");
    const { status } = await apiRequest(
      "GET",
      "/api/commerce/orders/admin",
      undefined,
      authHeaders(user)
    );
    expect(status).toBe(403);
  });

  it("Instructor-only endpoints require auth", async () => {
    const { status } = await apiRequest("GET", "/api/instructor/attendance/rooms");
    expect(status).toBe(401);
  });

  it("Mentor groups are publicly listable", async () => {
    const { status, data } = await apiRequest("GET", "/api/mentor/groups");
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("Ticket creation requires auth", async () => {
    const { status } = await apiRequest("POST", "/api/tickets", {
      subject: "Test",
      text: "Hello",
    });
    expect(status).toBe(401);
  });

  it("Comment listing requires target params", async () => {
    const { status } = await apiRequest("GET", "/api/comments");
    expect(status).toBe(400);
  });

  it("Notifications are publicly listable", async () => {
    const { status, data } = await apiRequest("GET", "/api/notifications");
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("Media listing requires auth", async () => {
    const { status } = await apiRequest("GET", "/api/media");
    expect(status).toBe(401);
  });
});
