import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  apiRequest,
  registerUser,
  loginUser,
  authHeaders,
  randomEmail,
  healthCheck,
} from "./setup.js";

describe("Auth API", () => {
  it("GET /api/health should return ok", async () => {
    const { status, data } = await apiRequest("GET", "/api/health");
    expect(status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it("POST /api/auth/register should create a new user", async () => {
    const email = randomEmail();
    const result = await registerUser("Test User", email, "password123");
    expect(result).toBeDefined();
    expect(result.email).toBe(email);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it("POST /api/auth/register should reject duplicate email", async () => {
    const email = randomEmail();
    await registerUser("Test User", email, "password123");
    const { status } = await apiRequest("POST", "/api/auth/register", {
      name: "Test User 2",
      email,
      password: "password123",
    });
    expect(status).toBe(400);
  });

  it("POST /api/auth/register should reject short password", async () => {
    const { status } = await apiRequest("POST", "/api/auth/register", {
      name: "Test",
      email: randomEmail(),
      password: "123",
    });
    expect(status).toBe(400);
  });

  it("POST /api/auth/login should return tokens", async () => {
    const email = randomEmail();
    await registerUser("Login Test", email, "password123");
    const result = await loginUser(email, "password123");
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it("POST /api/auth/login should reject wrong password", async () => {
    const email = randomEmail();
    await registerUser("Wrong Pass", email, "password123");
    const { status } = await apiRequest("POST", "/api/auth/login", {
      email,
      password: "wrongpassword",
    });
    expect(status).toBe(401);
  });

  it("GET /api/auth/me should return current user", async () => {
    const email = randomEmail();
    const user = await registerUser("Me Test", email, "password123");
    const { status, data } = await apiRequest(
      "GET",
      "/api/auth/me",
      undefined,
      authHeaders(user)
    );
    expect(status).toBe(200);
    expect(data.data.email).toBe(email);
  });

  it("GET /api/auth/me should reject unauthenticated", async () => {
    const { status } = await apiRequest("GET", "/api/auth/me");
    expect(status).toBe(401);
  });

  it("GET /api/auth/me should reject invalid token", async () => {
    const { status } = await apiRequest(
      "GET",
      "/api/auth/me",
      undefined,
      { Authorization: "Bearer invalid-token-here" }
    );
    expect(status).toBe(401);
  });

  it("POST /api/auth/refresh should rotate tokens", async () => {
    const email = randomEmail();
    const user = await registerUser("Refresh Test", email, "password123");
    const { status, data } = await apiRequest("POST", "/api/auth/refresh", {
      refreshToken: user.refreshToken,
    });
    expect(status).toBe(200);
    expect(data.data.accessToken).toBeDefined();
    expect(data.data.refreshToken).toBeDefined();
    expect(data.data.refreshToken).not.toBe(user.refreshToken);
  });

  it("POST /api/auth/refresh should reject invalid refresh token", async () => {
    const { status } = await apiRequest("POST", "/api/auth/refresh", {
      refreshToken: "invalid-refresh-token",
    });
    expect(status).toBe(401);
  });
});
