// ══════════════════════════════════════════════════════════════════════════════
// Video Source Resolver — detects URL type and provider, returns playback info
// ══════════════════════════════════════════════════════════════════════════════

export type VideoSourceType = "direct" | "embed" | "external";
export type VideoProvider =
  | "aparat"
  | "youtube"
  | "vimeo"
  | "direct"
  | "generic";

export interface ResolvedVideoSource {
  type: VideoSourceType;
  provider: VideoProvider;
  url: string; // The URL to use for playback (may be normalized)
  label: string; // Human-readable label for the provider
}

// ── Trusted embed domains (whitelist) ────────────────────────────────────────
const TRUSTED_EMBED_DOMAINS = [
  "aparat.com",
  "www.aparat.com",
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "vimeo.com",
  "player.vimeo.com",
];

// ── Direct video file extensions ─────────────────────────────────────────────
const DIRECT_VIDEO_EXTENSIONS =
  /\.(mp4|webm|ogg|mov|m4v|m3u8|mkv|avi)(\?|#|$)/i;

// ── Provider detection helpers ───────────────────────────────────────────────

function isAparatUrl(url: string): boolean {
  return /aparat\.com/i.test(url);
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

function isVimeoUrl(url: string): boolean {
  return /vimeo\.com/i.test(url);
}

function isDirectVideoUrl(url: string): boolean {
  return DIRECT_VIDEO_EXTENSIONS.test(url);
}

function isFilesIrUrl(url: string): boolean {
  return /files\.ir/i.test(url);
}

// ── Normalize Aparat URLs to canonical embed format ──────────────────────────
function normalizeAparatUrl(url: string): string {
  // Already a proper embed URL
  // https://www.aparat.com/embed/VIDEO_ID?data
  // https://www.aparat.com/video/video/embed/videohash/VIDEO_ID/vt/frame
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

  // Fallback: return original URL and let iframe try it
  return url;
}

// ── Normalize YouTube URL to embed ───────────────────────────────────────────
function normalizeYouTubeUrl(url: string): string {
  // watch URL: youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/,
  );
  if (watchMatch) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }
  // Already an embed URL
  if (/youtube\.com\/embed\//i.test(url)) {
    return url;
  }
  return url;
}

// ── Normalize Vimeo URL to embed ─────────────────────────────────────────────
function normalizeVimeoUrl(url: string): string {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (match) {
    return `https://player.vimeo.com/video/${match[1]}`;
  }
  if (/player\.vimeo\.com\/video\//i.test(url)) {
    return url;
  }
  return url;
}

// ══════════════════════════════════════════════════════════════════════════════
// Main resolver
// ══════════════════════════════════════════════════════════════════════════════

export function resolveVideoSource(url: string | null | undefined): ResolvedVideoSource | null {
  if (!url || !url.trim()) return null;

  const trimmed = url.trim();

  // 1. Direct video file → HTML5 <video>
  if (isDirectVideoUrl(trimmed)) {
    return {
      type: "direct",
      provider: "direct",
      url: trimmed,
      label: "ویدئوی مستقیم",
    };
  }

  // 2. Aparat → iframe
  if (isAparatUrl(trimmed)) {
    return {
      type: "embed",
      provider: "aparat",
      url: normalizeAparatUrl(trimmed),
      label: "آپارات",
    };
  }

  // 3. YouTube → iframe
  if (isYouTubeUrl(trimmed)) {
    return {
      type: "embed",
      provider: "youtube",
      url: normalizeYouTubeUrl(trimmed),
      label: "یوتیوب",
    };
  }

  // 4. Vimeo → iframe
  if (isVimeoUrl(trimmed)) {
    return {
      type: "embed",
      provider: "vimeo",
      url: normalizeVimeoUrl(trimmed),
      label: "Vimeo",
    };
  }

  // 5. Files.ir → external share link (not playable directly)
  if (isFilesIrUrl(trimmed)) {
    return {
      type: "external",
      provider: "generic",
      url: trimmed,
      label: "لینک اشتراک فایل",
    };
  }

  // 6. HTTPS with no video extension — could be a direct stream or embed
  //    Try as direct video first; if it fails the player will show fallback
  if (/^https?:\/\//i.test(trimmed)) {
    // If it looks like a trusted embed domain, treat as embed
    try {
      const parsed = new URL(trimmed);
      const isTrusted = TRUSTED_EMBED_DOMAINS.some(
        (d) => parsed.hostname === d || parsed.hostname.endsWith("." + d),
      );
      if (isTrusted) {
        return {
          type: "embed",
          provider: "generic",
          url: trimmed,
          label: "پخش‌کننده",
        };
      }
    } catch {
      // Invalid URL
    }

    // Unknown HTTPS URL — try as direct video (the player has error handling)
    return {
      type: "direct",
      provider: "generic",
      url: trimmed,
      label: "ویدئو",
    };
  }

  // 7. Non-HTTP URL or unrecognized
  return {
    type: "external",
    provider: "generic",
    url: trimmed,
    label: "لینک خارجی",
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Helpers for UI
// ══════════════════════════════════════════════════════════════════════════════

export function getVideoSourceBadge(
  source: ResolvedVideoSource | null,
): { icon: string; text: string; color: string } | null {
  if (!source) return null;

  switch (source.type) {
    case "embed":
      return {
        icon: "🔗",
        text: `${source.label} — قابل پخش`,
        color: "text-emerald-400",
      };
    case "direct":
      return {
        icon: "🎬",
        text: `${source.label} — قابل پخش`,
        color: "text-emerald-400",
      };
    case "external":
      return {
        icon: "⚠️",
        text: `${source.label} — لینک اشتراک، ممکن است قابل پخش مستقیم نباشد`,
        color: "text-amber-400",
      };
  }
}
