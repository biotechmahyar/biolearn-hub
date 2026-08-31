import { createServer } from "node:http";
import app from "../index.js";

// Suppress console logs in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

export function suppressLogs() {
  console.log = () => {};
  console.error = () => {};
}

export function restoreLogs() {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
}

// ─── API Test Client ─────────────────────────────────────────────────────────

export interface TestUser {
  id: string;
  name: string;
  email: string;
  role: string;
  accessToken: string;
  refreshToken: string;
}

export async function apiRequest(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<{ status: number; data: any }> {
  const url = `http://localhost${path}`;
  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  const response = await app.fetch(
    new Request(url, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })
  );

  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<TestUser> {
  const { data } = await apiRequest("POST", "/api/auth/register", {
    name,
    email,
    password,
  });
  const result = data.data;
  return {
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    role: result.user.role,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  };
}

export async function loginUser(
  email: string,
  password: string
): Promise<TestUser> {
  const { data } = await apiRequest("POST", "/api/auth/login", {
    email,
    password,
  });
  const result = data.data;
  return {
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    role: result.user.role,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  };
}

export function authHeaders(user: TestUser): Record<string, string> {
  return { Authorization: `Bearer ${user.accessToken}` };
}

export function randomEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

// ─── Health Check ────────────────────────────────────────────────────────────

export async function healthCheck(): Promise<boolean> {
  const { status } = await apiRequest("GET", "/api/health");
  return status === 200;
}
