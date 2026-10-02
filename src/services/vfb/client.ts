/**
 * Virtual Fly Brain — HTTP client.
 * ─────────────────────────────────────────────────────────────────────────────
 * Every VFB request in Genova goes through this file. Components never build
 * URLs themselves. Responsibilities:
 *   • host + path allow-listing (no arbitrary outbound requests)
 *   • URLSearchParams encoding
 *   • request timeout + external abort signal
 *   • HTTP / malformed / API-level error normalisation
 *   • a small in-memory TTL cache (no database mirroring, no Convex changes)
 */
import type { VFBApiErrorShape, VFBErrorKind } from "./types";

/** Official VFBquery base (cached read-only deployment, no API key required). */
export const VFB_API_BASE = "https://v3-cached.virtualflybrain.org/";

/** Endpoints we are allowed to call. Anything else is rejected locally. */
export const VFB_ENDPOINTS = {
  search: "search",
  termInfo: "get_term_info",
  hierarchy: "get_hierarchy",
  runQuery: "run_query",
  connectivity: "query_connectivity",
  datasets: "list_connectome_datasets",
  xref: "xref",
  resolve: "resolve_entity",
} as const;

export type VFBEndpoint = (typeof VFB_ENDPOINTS)[keyof typeof VFB_ENDPOINTS];

/** Only these hosts may ever be contacted. */
const ALLOWED_API_HOSTS = new Set(["v3-cached.virtualflybrain.org"]);

/**
 * Hosts we are willing to load remote media from. Anything else returned by the
 * API is rendered as text/links instead of being fetched by the browser.
 */
const ALLOWED_MEDIA_HOSTS = new Set([
  "www.virtualflybrain.org",
  "virtualflybrain.org",
  "v3-cached.virtualflybrain.org",
]);

const DEFAULT_TIMEOUT_MS = 20_000;

/** Requests with the same key inside this window reuse the previous answer. */
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 120;

type CacheEntry = { at: number; value: unknown };
const memoryCache = new Map<string, CacheEntry>();

export class VFBApiError extends Error implements VFBApiErrorShape {
  readonly kind: VFBErrorKind;
  readonly status?: number;

  constructor(kind: VFBErrorKind, message: string, status?: number) {
    super(message);
    this.name = "VFBApiError";
    this.kind = kind;
    this.status = status;
  }
}

/** Human-facing copy. Never leaks stack traces or raw exceptions. */
export function vfbErrorMessage(error: unknown): string {
  if (error instanceof VFBApiError) {
    switch (error.kind) {
      case "timeout":
        return "پاسخی از Virtual Fly Brain دریافت نشد. لطفاً دوباره تلاش کنید.";
      case "aborted":
        return "";
      case "validation":
        return "ورودی نامعتبر است.";
      case "api":
      case "http":
      case "malformed":
      case "network":
      default:
        return "Virtual Fly Brain موقتاً در دسترس نیست. لطفاً دوباره تلاش کنید.";
    }
  }
  return "خطای غیرمنتظره در ارتباط با Virtual Fly Brain.";
}

export function isAbortError(error: unknown): boolean {
  return error instanceof VFBApiError && error.kind === "aborted";
}

function buildUrl(endpoint: VFBEndpoint, params?: Record<string, string | number | undefined>): URL {
  if (!Object.values(VFB_ENDPOINTS).includes(endpoint)) {
    throw new VFBApiError("validation", "Unknown VFB endpoint requested.");
  }
  const base = new URL(endpoint, VFB_API_BASE);
  if (base.hostname && !ALLOWED_API_HOSTS.has(base.hostname)) {
    throw new VFBApiError("validation", "Blocked request to a non-VFB host.");
  }
  if (params) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      search.set(key, String(value));
    }
    base.search = search.toString();
  }
  return base;
}

/**
 * Perform one VFB request.
 * `cacheKey` opts the call into the shared TTL cache (read-only GETs only).
 */
export async function vfbFetch<T>(
  endpoint: VFBEndpoint,
  params?: Record<string, string | number | undefined>,
  options?: { signal?: AbortSignal; timeoutMs?: number; cacheKey?: string; cache?: boolean },
): Promise<T> {
  const url = buildUrl(endpoint, params);
  // A signal that is already aborted never fires another `abort` event, so it has
  // to be checked up front or the request would run to completion.
  if (options?.signal?.aborted) throw new VFBApiError("aborted", "Request cancelled.");
  const useCache = options?.cache !== false && Boolean(options?.cacheKey);

  if (useCache && options?.cacheKey) {
    const hit = memoryCache.get(options.cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return hit.value as T;
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  options?.signal?.addEventListener("abort", onExternalAbort);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch {
    if (options?.signal?.aborted) throw new VFBApiError("aborted", "Request cancelled.");
    // fetch aborts on timeout too, so distinguish by our own flag.
    if (controller.signal.aborted) throw new VFBApiError("timeout", "VFB request timed out.");
    throw new VFBApiError("network", "Network error while contacting VFB.");
  } finally {
    clearTimeout(timeout);
    options?.signal?.removeEventListener("abort", onExternalAbort);
  }

  if (!response.ok) {
    throw new VFBApiError("http", `VFB responded with ${response.status}.`, response.status);
  }

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new VFBApiError("malformed", "VFB returned a non-JSON response.");
  }

  if (payload && typeof payload === "object" && "error" in (payload as Record<string, unknown>)) {
    throw new VFBApiError("api", String((payload as { error?: unknown }).error ?? "VFB API error."));
  }

  if (useCache && options?.cacheKey) {
    if (memoryCache.size >= CACHE_MAX_ENTRIES) {
      const oldest = memoryCache.keys().next().value;
      if (oldest) memoryCache.delete(oldest);
    }
    memoryCache.set(options.cacheKey, { at: Date.now(), value: payload });
  }

  return payload as T;
}

/** Clear the in-memory cache (used by the "refresh" button and on error retry). */
export function clearVFBCache(): void {
  memoryCache.clear();
}

// ── Input validation ────────────────────────────────────────────────────────

const ID_PATTERN = /^[A-Za-z0-9_:.#-]{1,128}$/;
const TERM_PATTERN = /^[A-Za-z0-9_:.#()' -]{1,160}$/;

export function assertVFBId(id: string): string {
  const value = (id ?? "").trim();
  if (!ID_PATTERN.test(value)) throw new VFBApiError("validation", "Invalid VFB identifier.");
  return value;
}

export function assertVFBTerm(value: string): string {
  const term = (value ?? "").trim();
  if (!term) throw new VFBApiError("validation", "A search term is required.");
  if (!TERM_PATTERN.test(term)) throw new VFBApiError("validation", "Invalid search term.");
  return term;
}

export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

// ── Safe URL helpers for data coming from the API ───────────────────────────

/** Allow only absolute https links — blocks `javascript:` / `data:` injection. */
export function safeHttpUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/** Only VFB-owned hosts may be loaded as remote media (thumbnails). */
export function safeMediaUrl(raw: unknown): string | undefined {
  const safe = safeHttpUrl(raw);
  if (!safe) return undefined;
  try {
    return ALLOWED_MEDIA_HOSTS.has(new URL(safe).hostname) ? safe : undefined;
  } catch {
    return undefined;
  }
}

// ── Markdown helpers used by the VFB payloads ───────────────────────────────

/** `[label](FBbt_00003748)` → `label`; plain text is returned unchanged. */
export function stripVFBLink(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** `![alt](https://… 'title')` and `[![…](url)](id,parent)` → the image URL. */
export function extractVFBThumbnail(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const match = raw.match(/!\[[^\]]*\]\(\s*([^)\s]+)/);
  return match ? safeMediaUrl(match[1]) : undefined;
}

/** `A|B|C` tags → `["A","B","C"]`. */
export function splitVFBCategories(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw.split("|").map((t) => t.trim()).filter(Boolean);
}
