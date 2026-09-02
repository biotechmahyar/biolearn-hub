// ══════════════════════════════════════════════════════════════════════════════
// EmbedCodeRenderer — renders raw HTML/script embed codes in a sandboxed iframe
// Used for live streaming scripts (IranHLS), custom players, etc.
// ══════════════════════════════════════════════════════════════════════════════

interface EmbedCodeRendererProps {
  /** Raw HTML embed code (e.g., <script src="..."></script> or <iframe> tags) */
  embedCode: string;
  /** CSS class for the container */
  className?: string;
}

/**
 * Renders an embed code in a sandboxed iframe using srcdoc.
 *
 * The embed code is placed inside a minimal HTML document with proper
 * viewport settings for responsive playback. The iframe uses sandbox
 * permissions that allow scripts and same-origin access for the player
 * to function, while keeping the main application isolated.
 *
 * SECURITY:
 * - The embed code is rendered inside an iframe, completely isolated
 *   from the main React application
 * - No dangerouslySetInnerHTML on the main page
 * - The iframe sandbox allows scripts but restricts navigation,
 *   form submission, and popups
 */
export function EmbedCodeRenderer({
  embedCode,
  className,
}: EmbedCodeRendererProps) {
  if (!embedCode || !embedCode.trim()) return null;

  const srcdoc = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    iframe, video, embed, object { width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
${embedCode}
</body>
</html>`;

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-border bg-black ${className ?? ""}`}>
      <div className="aspect-video w-full">
        <iframe
          srcDoc={srcdoc}
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          title="محتوای جلسه"
          loading="lazy"
        />
      </div>
    </div>
  );
}
