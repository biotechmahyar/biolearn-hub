import { Play, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { blockDef, styleToCss, type StudioElement, type SiteTheme } from "./blocks";

function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href?: string;
  children: React.ReactNode;
  variant?: string;
  className?: string;
}) {
  const cls = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-full px-5 text-[15px] font-medium transition-colors h-11",
    variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
    variant === "outline" && "border border-border bg-background hover:bg-accent",
    variant === "ghost" && "text-foreground hover:bg-accent",
    className,
  );
  if (!href) return <span className={cn(cls, "opacity-60")}>{children}</span>;
  if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={cls}>
      {children}
    </Link>
  );
}

function YouTubeEmbed({ url, poster }: { url: string; poster?: string }) {
  const [playing, setPlaying] = useState(false);
  let embedUrl: string | null = null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      embedUrl = `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    } else if (u.hostname.includes("youtu.be")) {
      embedUrl = `https://www.youtube.com/embed${u.pathname}`;
    } else if (u.hostname.includes("youtube.com/embed")) {
      embedUrl = url;
    }
  } catch {
    embedUrl = null;
  }
  if (!embedUrl) return null;
  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="group relative block aspect-video w-full overflow-hidden rounded-2xl border border-border/60 bg-muted"
      >
        {poster ? (
          <img src={poster} alt="" className="size-full object-cover" />
        ) : (
          <div className="size-full bg-gradient-to-br from-muted to-background" />
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-background/85 shadow-lg transition-transform group-hover:scale-110">
            <Play className="size-6 text-foreground" />
          </span>
        </span>
      </button>
    );
  }
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/60">
      <iframe
        src={`${embedUrl}?autoplay=1`}
        title="video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="size-full"
      />
      <button
        type="button"
        onClick={() => setPlaying(false)}
        className="absolute left-2 top-2 rounded-full bg-background/85 p-1.5"
        title="بستن ویدئو"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function LightboxImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  if (!src) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
        بدون تصویر
      </div>
    );
  }
  return (
    <>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full cursor-zoom-in rounded-2xl object-cover"
        onClick={() => setOpen(true)}
      />
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-6"
          onClick={() => setOpen(false)}
        >
          <img src={src} alt={alt} className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      )}
    </>
  );
}

/**
 * Renders a single Site Studio element. Used both by the public site
 * (published data) and by the studio canvas (draft data).
 */
export function BlockRenderer({
  el,
  theme,
}: {
  el: StudioElement;
  theme?: SiteTheme | null;
}) {
  const def = blockDef(el.type);
  if (!def) return null;
  const p = el.props ?? {};
  const css = styleToCss(el.style, theme);
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");

  switch (el.type) {
    case "hero":
      return (
        <div
          className="relative overflow-hidden border border-border/50 bg-card/60 p-6 sm:p-10"
          style={css}
        >
          <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2">
            <div className={cn(str("image") && "lg:col-span-1", !str("image") && "lg:col-span-2")}>
              {str("badge") && (
                <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs text-primary">
                  {str("badge")}
                </span>
              )}
              <h1 className="text-balance text-3xl font-black leading-[1.25] sm:text-4xl lg:text-[2.75rem]">
                {str("title")}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{str("subtitle")}</p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                {str("primaryText") && (
                  <ButtonLink href={str("primaryLink")}>{str("primaryText")}</ButtonLink>
                )}
                {str("secondaryText") && (
                  <ButtonLink href={str("secondaryLink")} variant="outline">
                    {str("secondaryText")}
                  </ButtonLink>
                )}
              </div>
            </div>
            {str("image") && (
              <div className="relative">
                <img
                  src={str("image")}
                  alt=""
                  className="aspect-[4/3] w-full rounded-3xl border border-border/60 object-cover shadow-xl"
                />
              </div>
            )}
          </div>
        </div>
      );
    case "heading":
      return (
        <h2 style={css} className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {str("text")}
        </h2>
      );
    case "text":
      return (
        <p style={css} className="whitespace-pre-line text-[15px] leading-7 text-muted-foreground">
          {str("text")}
        </p>
      );
    case "image":
      return (
        <figure style={css}>
          <LightboxImage src={str("src")} alt={str("alt")} />
          {str("caption") && (
            <figcaption className="mt-2 text-center text-xs text-muted-foreground">{str("caption")}</figcaption>
          )}
        </figure>
      );
    case "button":
      return (
        <div style={css}>
          <ButtonLink href={str("href")} variant={str("variant") || "primary"}>
            {str("text")}
          </ButtonLink>
        </div>
      );
    case "card":
      return (
        <div
          style={css}
          className="rounded-2xl border border-border/60 bg-card/70 p-5 transition-shadow hover:shadow-md"
        >
          <div className="text-2xl">{str("icon") || "🧬"}</div>
          <h3 className="mt-3 text-lg font-bold">{str("title")}</h3>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{str("text")}</p>
          {str("link") && (
            <Link to={str("link")} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              ادامه…
            </Link>
          )}
        </div>
      );
    case "gallery": {
      const imgs = str("images")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const cols = Math.min(6, Math.max(1, Number(p.columns) || 3));
      return (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, ...css }}
        >
          {imgs.length === 0 && (
            <div className="col-span-full flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
              تصویری اضافه نشده
            </div>
          )}
          {imgs.map((src, i) => (
            <LightboxImage key={`${src}-${i}`} src={src} alt="" />
          ))}
        </div>
      );
    }
    case "video": {
      const src = str("src");
      return (
        <div style={css}>
          {src.includes("<iframe") ? (
            <div
              className="aspect-video w-full overflow-hidden rounded-2xl border border-border/60 [&>iframe]:size-full"
              dangerouslySetInnerHTML={{ __html: src }}
            />
          ) : src.includes("youtube") || src.includes("youtu.be") ? (
            <YouTubeEmbed url={src} poster={str("poster")} />
          ) : src ? (
            <video src={src} controls poster={str("poster")} className="aspect-video w-full rounded-2xl bg-black" />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
              ویدئویی انتخاب نشده
            </div>
          )}
        </div>
      );
    }
    case "stats": {
      const items = str("items")
        .split("\n")
        .map((l) => l.split("|").map((x) => x.trim()))
        .filter((parts) => parts[0]);
      return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3" style={css}>
          {items.map(([num, label], i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card/70 px-4 py-3 text-center">
              <p className="text-xl font-extrabold text-primary">{num}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{label ?? ""}</p>
            </div>
          ))}
        </div>
      );
    }
    case "cta":
      return (
        <div
          className="relative overflow-hidden rounded-3xl border border-primary/25 bg-primary/5 p-6 text-center sm:p-10"
          style={css}
        >
          <div className="pointer-events-none absolute -bottom-20 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          <h3 className="relative text-2xl font-black">{str("title")}</h3>
          <p className="relative mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{str("text")}</p>
          {str("buttonText") && (
            <div className="relative mt-6 flex justify-center">
              <ButtonLink href={str("buttonLink")}>{str("buttonText")}</ButtonLink>
            </div>
          )}
        </div>
      );
    case "link":
      return (
        <div style={css}>
          <Link to={str("href") || "/"} className="text-sm font-medium text-primary hover:underline">
            {str("text")}
          </Link>
        </div>
      );
    default:
      return (
        <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground" style={css}>
          بلوک ناشناخته: {el.type}
        </div>
      );
  }
}
