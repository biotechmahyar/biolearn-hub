import { describe, it, expect } from "vitest";
import { apiRequest } from "./setup.js";

describe("Content API (Public)", () => {
  it("GET /api/content/categories should return array", async () => {
    const { status, data } = await apiRequest("GET", "/api/content/categories");
    expect(status).toBe(200);
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("GET /api/content/courses should return array", async () => {
    const { status, data } = await apiRequest("GET", "/api/content/courses");
    expect(status).toBe(200);
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("GET /api/content/instructors should return array", async () => {
    const { status, data } = await apiRequest("GET", "/api/content/instructors");
    expect(status).toBe(200);
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("GET /api/content/articles should return array", async () => {
    const { status, data } = await apiRequest("GET", "/api/content/articles");
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("GET /api/content/products should return array", async () => {
    const { status, data } = await apiRequest("GET", "/api/content/products");
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("GET /api/content/workshops should return array", async () => {
    const { status, data } = await apiRequest("GET", "/api/content/workshops");
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("GET /api/content/testimonials should return array", async () => {
    const { status, data } = await apiRequest("GET", "/api/content/testimonials");
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("GET /api/content/courses/nonexistent should return 404", async () => {
    const { status } = await apiRequest("GET", "/api/content/courses/nonexistent");
    expect(status).toBe(404);
  });

  it("GET /api/content/dictionary should return array", async () => {
    const { status, data } = await apiRequest("GET", "/api/content/dictionary");
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it("GET /api/health/db should return db status", async () => {
    const { status, data } = await apiRequest("GET", "/api/health/db");
    expect(status).toBe(200);
    expect(data.data.connected).toBeDefined();
  });

  it("GET /api/nonexistent should return 404", async () => {
    const { status } = await apiRequest("GET", "/api/nonexistent");
    expect(status).toBe(404);
  });
});
