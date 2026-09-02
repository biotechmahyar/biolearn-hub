// ══════════════════════════════════════════════════════════════════════════════
// Video Source Resolver — detects URL type and provider, returns playback info
// Supports: direct URLs, embed URLs, embed codes (<script>, <iframe>)
// ══════════════════════════════════════════════════════════════════════════════

export type VideoSourceType = "direct" | "embed" | "external";
export type VideoProvider =
  | "aparat"
  | "youtube"
  | "vimeo"
  | "iranhls"
  | "direct"
  | "generic";

export interface ResolvedVideoSource {
  type: VideoSourceType;
  provider: VideoProvider;
  url: string; // The URL to use for playback (may be normalized)
  label: string; // Human-readable label for the provider
}

// ══════════════════════════════════════════════════════════════════════════════
// Provider Whitelist — centralized list of trusted embed domains
// ══════════════════════════════════════════════════════════════════════════════

const EMBED_PROVIDERS: Record<string, string[]> = {
  aparat: ["aparat.com", "www.aparat.com"],
  youtube: ["youtube.com", "www.youtube.com", "youtu.be"],
  vimeo: ["vimeo.com", "player.vimeo.com"],
  iranhls: ["stream.iranhls.com"],
};

// Flat list of all trusted embed domains for quick lookup
const TRUSTED_EMBED_DOMAINS = Object.values(EMBED_PROVIDERS).flat();

// Direct video file extensions
const DIRECT_VIDEO_EXTENSIONS =
  /\.(mp4|webm|ogg|mov|m4v|m3u8|mkv|avi)(\?|#|$)/i;

// ══════════════════════════════════════════════════════════════════════════════
// Provider Detection Helpers
// ══════════════════════════════════════════════════════════════════════════════

function detectProvider(url: string): VideoProvider {
  const lower = url.toLowerCase();
  if (/aparat\.com/i.test(lower)) return "aparat";
  if (/(?:youtube\.com|youtu\.be)/i.test(lower)) return "youtube";
  if (/vimeo\.com/i.test(lower)) return "vimeo";
  if (/stream\.iranhls\.com/i.test(lower)) return "iranhls";
  return "generic";
}

function detectProviderByHostname(hostname: string): VideoProvider | null {
  const lower = hostname.toLowerCase();
  for (const [provider, domains] of Object.entries(EMBED_PROVIDERS)) {
    if (domains.some((d) => lower === d || lower.endsWith("." + d))) {
      return provider as VideoProvider;
    }
  }
  return null;
}

function isTrustedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return TRUSTED_EMBED_DOMAINS.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith("." + d),
    );
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Embed Code Parser — parses <script>, <iframe>, <object> embed codes
// Extracts the source URL without executing any code.
// ══════════════════════════════════════════════════════════════════════════════

export interface ParsedEmbedCode {
  found: boolean;
  url: string | null;
  tagType: "script" | "iframe" | "object" | "unknown" | null;
}

/**
 * Safely parses an embed code string and extracts the source URL.
 * NEVER executes any code — only regex/string extraction.
 */
export function parseEmbedCode(input: string): ParsedEmbedCode {
  const trimmed = input.trim();
  if (!trimmed) return { found: false, url: null, tagType: null };

  // 1. Try <script src="..."> pattern
  const scriptMatch = trimmed.match(
    /<script[^>]*\ssrc=["']([^"']+)["'][^>]*>/i,
  );
  if (scriptMatch) {
    const url = scriptMatch[1].trim();
    if (isValidHttpUrl(url)) {
      return { found: true, url, tagType: "script" };
    }
  }

  // 2. Try <iframe src="..."> pattern
  const iframeMatch = trimmed.match(
    /<iframe[^>]*\ssrc=["']([^"']+)["'][^>]*>/i,
  );
  if (iframeMatch) {
    const url = iframeMatch[1].trim();
    if (isValidHttpUrl(url)) {
      return { found: true, url, tagType: "iframe" };
    }
  }

  // 3. Try <object data="..."> or <object ... param src="...">
  const objectDataMatch = trimmed.match(
    /<object[^>]*\sdata=["']([^"']+)["'][^>]*>/i,
  );
  if (objectDataMatch) {
    const url = objectDataMatch[1].trim();
    if (isValidHttpUrl(url)) {
      return { found: true, url, tagType: "object" };
    }
  }

  // 4. Try bare URL that looks like a video embed endpoint
  if (
    isValidHttpUrl(trimmed) &&
    /embed|player|video/i.test(trimmed)
  ) {
    return { found: true, url: trimmed, tagType: "unknown" };
  }

  return { found: false, url: null, tagType: null };
}

function isValidHttpUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// URL Normalization per Provider
// ══════════════════════════════════════════════════════════════════════════════

function normalizeAparatUrl(url: string): string {
  // Already a proper embed URL
  const embedMatch = url.match(
    /aparat\.com\/(?:embed\/|video\/video\/embed\/videohash\/)([\w]+)\/?(?:vt\/frame)?/i,
  );
  if (embedMatch) {
    return `https://www.aparat.com/video/video/embed/videohash/${embedMatch[1]}/vt/frame`;
  }
  // Watch URL: https://www.aparat.com/v/VIDEO_ID
  const watchMatch = url.match(/aparat\.com\/v\/([\w]+)/i);
  if (watchMatch) {
    return `https://www.aparat.com/video/video/embed/videohash/${watchMatch[1]}/vt/frame`;
  }
  return url;
}

function normalizeYouTubeUrl(url: string): string {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/,
  );
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  if (/youtube\.com\/embed\//i.test(url)) return url;
  return url;
}

function normalizeVimeoUrl(url: string): string {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (match) return `https://player.vimeo.com/video/${match[1]}`;
  if (/player\.vimeo\.com\/video\//i.test(url)) return url;
  return url;
}

function normalizeIranHlsUrl(url: string): string {
  // Accept both embed code URLs and direct URLs
  // https://stream.iranhls.com/Video/Embed/VIDEO_ID
  const match = url.match(/stream\.iranhls\.com\/Video\/Embed\/([\w]+)/i);
  if (match) return `https://stream.iranhls.com/Video/Embed/${match[1]}`;
  return url;
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Resolver
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Resolves a video URL or embed code into a playback source.
 *
 * Handles:
 * - Direct video URLs (.mp4, .webm, etc.)
 * - Embed URLs (Aparat, YouTube, Vimeo, IranHLS, generic)
 * - Embed codes (<script src="...">, <iframe src="...">)
 * - Share/page links (Files.ir, etc.) → external fallback
 */
export function resolveVideoSource(
  input: string | null | undefined,
): ResolvedVideoSource | null {
  if (!input || !input.trim()) return null;

  const trimmed = input.trim();

  // ── Step 1: Check if input contains HTML embed code ──────────────────────
  const looksLikeHtml =
    /<script[\s>]/i.test(trimmed) ||
    /<iframe[\s>]/i.test(trimmed) ||
    /<object[\s>]/i.test(trimmed);

  if (looksLikeHtml) {
    const parsed = parseEmbedCode(trimmed);
    if (parsed.found && parsed.url) {
      // Validate the extracted URL
      if (!isValidHttpUrl(parsed.url)) {
        return {
          type: "external",
          provider: "generic",
          url: parsed.url,
          label: "لینک نامعتبر",
        };
      }

      // Check if the extracted URL is from a trusted provider
      const provider = detectProvider(parsed.url);
      if (provider !== "generic" || isTrustedDomain(parsed.url)) {
        // Known provider — resolve to embed
        return resolveAsEmbed(parsed.url, provider);
      }

      // Unknown domain in embed code — block for security
      return {
        type: "external",
        provider: "generic",
        url: parsed.url,
        label: "سرویس ناشناخته",
      };
    }

    // Embed code found but URL could not be extracted
    return {
      type: "external",
      provider: "generic",
      url: trimmed,
      label: "کد Embed نامعتبر",
    };
  }

  // ── Step 2: Check if input is a URL ──────────────────────────────────────
  if (isValidHttpUrl(trimmed)) {
    return resolveAsUrl(trimmed);
  }

  // ── Step 3: Not a URL or embed code ──────────────────────────────────────
  return {
    type: "external",
    provider: "generic",
    url: trimmed,
    label: "ورودی نامعتبر",
  };
}

// ── Resolve a plain URL ──────────────────────────────────────────────────────
function resolveAsUrl(url: string): ResolvedVideoSource {
  // Direct video file
  if (DIRECT_VIDEO_EXTENSIONS.test(url)) {
    return {
      type: "direct",
      provider: "direct",
      url,
      label: "ویدئوی مستقیم",
    };
  }

  // Known embed provider by URL pattern
  const provider = detectProvider(url);
  if (provider !== "generic") {
    return resolveAsEmbed(url, provider);
  }

  // Check hostname against whitelist
  if (isTrustedDomain(url)) {
    const hostname = (() => {
      try { return new URL(url).hostname; } catch { return ""; }
    })();
    const matchedProvider = detectProviderByHostname(hostname);
    return {
      type: "embed",
      provider: matchedProvider ?? "generic",
      url,
      label: matchedProvider ? getProviderLabel(matchedProvider) : "پخش‌کننده",
    };
  }

  // Unknown HTTPS URL — try as direct video (player has error handling)
  if (/^https?:\/\//i.test(url)) {
    return {
      type: "direct",
      provider: "generic",
      url,
      label: "ویدئو",
    };
  }

  return {
    type: "external",
    provider: "generic",
    url,
    label: "لینک خارجی",
  };
}

// ── Resolve as embed URL with provider-specific normalization ────────────────
function resolveAsEmbed(
  url: string,
  provider: VideoProvider,
): ResolvedVideoSource {
  switch (provider) {
    case "aparat":
      return {
        type: "embed",
        provider: "aparat",
        url: normalizeAparatUrl(url),
        label: "آپارات",
      };
    case "youtube":
      return {
        type: "embed",
        provider: "youtube",
        url: normalizeYouTubeUrl(url),
        label: "یوتیوب",
      };
    case "vimeo":
      return {
        type: "embed",
        provider: "vimeo",
        url: normalizeVimeoUrl(url),
        label: "Vimeo",
      };
    case "iranhls":
      return {
        type: "embed",
        provider: "iranhls",
        url: normalizeIranHlsUrl(url),
        label: "IranHLS",
      };
    default:
      return {
        type: "embed",
        provider: "generic",
        url,
        label: "پخش‌کننده",
      };
  }
}

function getProviderLabel(provider: VideoProvider): string {
  const labels: Record<VideoProvider, string> = {
    aparat: "آپارات",
    youtube: "یوتیوب",
    vimeo: "Vimeo",
    iranhls: "IranHLS",
    direct: "ویدئوی مستقیم",
    generic: "پخش‌کننده",
  };
  return labels[provider];
}
