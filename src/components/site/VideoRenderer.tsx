// ══════════════════════════════════════════════════════════════════════════════
// VideoRenderer — shared component used by both instructor preview & student player
// ══════════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { resolveVideoSource, type ResolvedVideoSource } from "@/lib/videoResolver";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Film, ExternalLink, AlertTriangle } from "lucide-react";

interface VideoRendererProps {
  /** Raw video URL from database */
  url: string | null | undefined;
  /** Called with current playback time (only for direct video) */
  onTimeUpdate?: (currentTime: number) => void;
  /** Called when video ends (only for direct video) */
  onEnded?: () => void;
  /** Optional poster image URL */
  poster?: string;
  /** Whether this is in an iframe sandbox (e.g. embedded preview) */
  className?: string;
}

// ── Iframe player (Aparat, YouTube, Vimeo, generic embed) ────────────────────
function IframePlayer({
  source,
  className,
}: {
  source: ResolvedVideoSource;
  className?: string;
}) {
  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-border bg-black ${className ?? ""}`}>
      <div className="relative w-full" style={{ paddingBottom: "56.25%" /* 16:9 */ }}>
        <iframe
          src={source.url}
          className="absolute inset-0 h-full w-full border-0 m-0 p-0"
          style={{ margin: 0, padding: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title={`پخش ویدئو — ${source.label}`}
          loading="lazy"
        />
      </div>
    </div>
  );
}

// ── HTML5 Video player (direct files) ────────────────────────────────────────
function DirectVideoPlayer({
  source,
  onTimeUpdate,
  onEnded,
  poster,
  className,
}: {
  source: ResolvedVideoSource;
  onTimeUpdate?: (t: number) => void;
  onEnded?: () => void;
  poster?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`relative w-full overflow-hidden rounded-xl border border-border bg-muted/30 ${className ?? ""}`}>
        <div className="aspect-video flex flex-col items-center justify-center gap-3 p-6 text-center">
          <AlertTriangle className="size-8 text-amber-400" />
          <p className="text-sm font-medium">پخش فایل ویدئو ناموفق بود</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            فایل ممکن است در دسترس نباشد یا فرمت آن پشتیبانی نشود.
          </p>
          <Button size="sm" variant="outline" asChild>
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="ml-1.5 size-3" />
              باز کردن لینک
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-border bg-black ${className ?? ""}`}>
      <video
        className="h-full w-full"
        controls
        playsInline
        preload="metadata"
        poster={poster}
        onError={() => setFailed(true)}
        onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
        onEnded={onEnded}
      >
        <source src={source.url} />
        مرورگر شما از پخش ویدئو پشتیبانی نمی‌کند.
      </video>
    </div>
  );
}

// ── External link fallback (Files.ir, share pages, etc.) ─────────────────────
function ExternalLinkFallback({
  source,
  className,
}: {
  source: ResolvedVideoSource;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-dashed border-amber-400/30 bg-amber-400/5 ${className ?? ""}`}
    >
      <div className="aspect-video flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-amber-400/10">
          <Film className="size-7 text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold">این لینک مستقیماً قابل پخش نیست</p>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            این لینک یک صفحه اشتراک‌گذاری فایل است و در پلیر داخلی قابل پخش نیست.
            برای پخش مستقیم، از لینک مستقیم فایل ویدئو (.mp4) یا لینک Embed
            سرویس‌هایی مانند آپارات استفاده کنید.
          </p>
        </div>
        <Button size="sm" variant="outline" asChild>
          <a href={source.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="ml-1.5 size-3.5" />
            باز کردن لینک در تب جدید
          </a>
        </Button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main VideoRenderer
// ══════════════════════════════════════════════════════════════════════════════

export function VideoRenderer({
  url,
  onTimeUpdate,
  onEnded,
  poster,
  className,
}: VideoRendererProps) {
  const source = resolveVideoSource(url);

  if (!source) {
    return null;
  }

  switch (source.type) {
    case "embed":
      return <IframePlayer source={source} className={className} />;

    case "direct":
      return (
        <DirectVideoPlayer
          source={source}
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
          poster={poster}
          className={className}
        />
      );

    case "external":
      return <ExternalLinkFallback source={source} className={className} />;
  }
}

// ── Small badge showing detected source type ─────────────────────────────────
export function VideoSourceBadge({ url }: { url: string | null | undefined }) {
  const source = resolveVideoSource(url);
  if (!source) return null;

  const colorMap: Record<string, string> = {
    embed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    direct: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    external: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };

  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-medium ${colorMap[source.type]}`}
    >
      {source.type === "embed" && "🔗"}
      {source.type === "direct" && "🎬"}
      {source.type === "external" && "⚠️"}
      <span className="mr-1">{source.label}</span>
    </Badge>
  );
}
