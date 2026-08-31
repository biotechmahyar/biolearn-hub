/**
 * API client for the Iran Mirror backend.
 * All requests go to /api/* which is proxied to the FastAPI backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || "https://react-4k9h04.chbkn.dev";

export async function apiGet<T>(path: string): Promise<T | undefined> {
  try {
    const resp = await fetch(`${API_BASE}${path}`);
    if (!resp.ok) return undefined;
    return await resp.json();
  } catch {
    return undefined;
  }
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T | undefined> {
  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!resp.ok) return undefined;
    return await resp.json();
  } catch {
    return undefined;
  }
}
