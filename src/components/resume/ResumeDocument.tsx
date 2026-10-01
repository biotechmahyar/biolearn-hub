import { cn } from "@/lib/utils";

// ── Design settings shared by the editor canvas and the public page ────────
export type ResumeStyle = {
  font?: string;
  accent?: string;
  scale?: number;
  density?: string;
  columns?: number;
  width?: string;
  radius?: number;
  shadow?: string;
  outline?: boolean;
  headingStyle?: string;
  align?: string;
};

export const DEFAULT_RESUME_STYLE: Required<ResumeStyle> = {
  font: "sans",
  accent: "#2563EB",
  scale: 1,
  density: "normal",
  columns: 2,
  width: "a4",
  radius: 16,
  shadow: "soft",
  outline: true,
  headingStyle: "underline",
  align: "start",
};

export const FONT_STACKS: Record<string, string> = {
  sans: '"Vazirmatn", "Segoe UI", Tahoma, ui-sans-serif, system-ui, sans-serif',
  serif: '"Noto Naskh Arabic", "Times New Roman", Georgia, serif',
  mono: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
};

export const PAGE_WIDTHS: Record<string, number> = {
  a4: 794,
  a5: 560,
  letter: 816,
};

export const DENSITY_SCALE: Record<string, number> = {
  compact: 0.9,
  normal: 1,
  relaxed: 1.12,
};

export type ResumeDocData = {
  name: string;
  headline?: string | null;
  avatarUrl?: string | null;
  summary?: string | null;
  email?: string | null;
  phone?: string | null;
  skills: string[];
  education: { degree: string; field?: string; institute?: string; year?: string }[];
  experience: { title: string; org?: string; period?: string; description?: string }[];
  projects: { name: string; description?: string; link?: string }[];
  achievements: string[];
  languages: { name: string; level?: string }[];
  links: { label: string; url: string }[];
};

function resolve(style?: ResumeStyle | null): Required<ResumeStyle> {
  return { ...DEFAULT_RESUME_STYLE, ...(style ?? {}) };
}

function SectionTitle({
  children,
  style,
  align,
}: {
  children: React.ReactNode;
  style: Required<ResumeStyle>;
  align: string;
}) {
  const underline =
    style.headingStyle === "underline" ? (
      <span
        className="mt-1.5 block h-[3px] w-9 rounded-full"
        style={{ backgroundColor: style.accent }}
      />
    ) : null;
  return (
    <div className={cn("mb-3", align === "center" && "text-center")}>
      <h3
        className={cn(
          "text-[15px] font-extrabold tracking-tight",
          style.headingStyle === "plain" && "font-bold",
        )}
      >
        {children}
      </h3>
      {align === "center" ? <div className="flex justify-center">{underline}</div> : underline}
    </div>
  );
}

/**
 * The resume "paper". Rendered by the editor canvas (zoomable, live) and by
 * the public resume page, so what a member previews is exactly what visitors
 * see. Styling comes entirely from `style` — no site-specific assumptions.
 */
export default function ResumeDocument({
  data,
  style,
  className,
  interactive,
}: {
  data: ResumeDocData;
  style?: ResumeStyle | null;
  className?: string;
  /** Highlights the section that is currently selected in the editor. */
  interactive?: { activeSection?: string | null; onSelect?: (id: string) => void };
}) {
  const s = resolve(style);
  const accent = s.accent;
  const font = FONT_STACKS[s.font] ?? FONT_STACKS.sans;
  const width = PAGE_WIDTHS[s.width] ?? PAGE_WIDTHS.a4;
  const gap = 20 * DENSITY_SCALE[s.density] * s.scale;
  const align = s.align;

  const shadow =
    s.shadow === "none"
      ? "none"
      : s.shadow === "strong"
        ? "0 24px 60px -28px rgba(15,23,42,0.45)"
        : "0 18px 40px -30px rgba(15,23,42,0.3)";

  const wrapper = (id: string, children: React.ReactNode) => {
    if (!interactive) return <section className="break-inside-avoid">{children}</section>;
    const active = interactive.activeSection === id;
    return (
      <section
        onClick={() => interactive.onSelect?.(id)}
        className={cn(
          "break-inside-avoid rounded-lg p-1 transition-colors",
          interactive.onSelect && "cursor-pointer",
          active && "ring-2",
        )}
        style={active ? { boxShadow: `0 0 0 2px ${accent}55` } : undefined}
      >
        {children}
      </section>
    );
  };

  const contactBits = [data.phone, data.email].filter(Boolean) as string[];

  return (
    <div
      dir="rtl"
      className={cn("mx-auto origin-top", className)}
      style={{
        width,
        flexShrink: 0,
        fontFamily: font,
        fontSize: `${13 * s.scale}px`,
        lineHeight: 1.7,
      }}
    >
      <div
        className="min-h-[520px] bg-card p-8 text-foreground"
        style={{
          borderRadius: s.radius,
          boxShadow: shadow,
          border: s.outline ? "1px solid var(--border)" : "none",
        }}
      >
        {/* ── Identity header ─────────────────────────────── */}
        <header
          className={cn(
            "flex items-center gap-5 pb-6",
            align === "center" && "flex-col text-center",
          )}
        >
          <div
            className="flex size-20 shrink-0 items-center justify-center overflow-hidden bg-muted text-2xl font-extrabold text-muted-foreground"
            style={{ borderRadius: Math.max(8, s.radius - 4) }}
          >
            {data.avatarUrl ? (
              <img src={data.avatarUrl} alt={data.name} className="size-full object-cover" />
            ) : (
              (data.name ?? "د")[0]
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight">
              {data.name}
            </h1>
            {data.headline && (
              <p className="mt-1 text-base" style={{ color: accent }}>
                {data.headline}
              </p>
            )}
            {contactBits.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground" dir="ltr">
                {contactBits.join("  ·  ")}
              </p>
            )}
          </div>
        </header>

        <div
          className="mt-2 grid gap-x-8"
          style={{
            gridTemplateColumns: s.columns === 1 ? "1fr" : "minmax(0,0.85fr) minmax(0,1.15fr)",
            rowGap: gap,
          }}
        >
          {/* ── Right rail: contact, education, skills, languages ── */}
          <div className="space-y-6" style={{ rowGap: gap }}>
            {wrapper("contact", (
              <>
                <SectionTitle style={s} align={align}>
                  اطلاعات تماس
                </SectionTitle>
                {contactBits.length === 0 && data.links.length === 0 ? (
                  <p className="text-xs text-muted-foreground">اطلاعات تماس ثبت نشده است.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-foreground">
                    {contactBits.map((c) => (
                      <li key={c} dir="ltr" className="truncate text-right">
                        {c}
                      </li>
                    ))}
                    {data.links.map((l) => (
                      <li key={l.url} className="truncate">
                        <span style={{ color: accent }}>{l.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ))}

            {data.education.length > 0 &&
              wrapper("education", (
                <>
                  <SectionTitle style={s} align={align}>
                    تحصیلات
                  </SectionTitle>
                  <ul className="space-y-4">
                    {data.education.map((e, i) => (
                      <li key={i}>
                        <p className="text-sm font-bold">{e.degree}</p>
                        <p className="text-xs text-muted-foreground">
                          {[e.field, e.institute].filter(Boolean).join(" · ")}
                        </p>
                        {e.year && <p className="text-[11px] text-muted-foreground">{e.year}</p>}
                      </li>
                    ))}
                  </ul>
                </>
              ))}

            {data.skills.length > 0 &&
              wrapper("skills", (
                <>
                  <SectionTitle style={s} align={align}>
                    مهارت‌ها
                  </SectionTitle>
                  <div className="flex flex-wrap gap-1.5">
                    {data.skills.map((sk, i) => (
                      <span
                        key={`${sk}-${i}`}
                        className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{ borderColor: `${accent}44`, color: accent }}
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </>
              ))}

            {data.languages.length > 0 &&
              wrapper("languages", (
                <>
                  <SectionTitle style={s} align={align}>
                    زبان‌ها
                  </SectionTitle>
                  <ul className="space-y-1.5 text-xs text-foreground">
                    {data.languages.map((l, i) => (
                      <li key={i}>
                        <span className="font-semibold">{l.name}</span>
                        {l.level && <span className="text-muted-foreground"> — {l.level}</span>}
                      </li>
                    ))}
                  </ul>
                </>
              ))}
          </div>

          {/* ── Main column: profile, experience, projects, achievements ── */}
          <div className="space-y-6" style={{ rowGap: gap }}>
            {data.summary &&
              wrapper("summary", (
                <>
                  <SectionTitle style={s} align={align}>
                    خلاصه حرفه‌ای
                  </SectionTitle>
                  <p className="whitespace-pre-line text-xs leading-6 text-muted-foreground">
                    {data.summary}
                  </p>
                </>
              ))}

            {data.experience.length > 0 &&
              wrapper("experience", (
                <>
                  <SectionTitle style={s} align={align}>
                    تجربه کاری
                  </SectionTitle>
                  <ul className="space-y-4">
                    {data.experience.map((e, i) => (
                      <li key={i}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-sm font-bold">{e.title}</p>
                          {e.period && (
                            <p className="text-[11px] text-muted-foreground" dir="ltr">
                              {e.period}
                            </p>
                          )}
                        </div>
                        {e.org && <p className="text-xs text-muted-foreground">{e.org}</p>}
                        {e.description && (
                          <p className="mt-1 text-xs leading-6 text-muted-foreground">
                            {e.description}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              ))}

            {data.projects.length > 0 &&
              wrapper("projects", (
                <>
                  <SectionTitle style={s} align={align}>
                    پروژه‌ها
                  </SectionTitle>
                  <ul className="space-y-3">
                    {data.projects.map((p, i) => (
                      <li key={i}>
                        <p className="text-sm font-bold" style={{ color: accent }}>
                          {p.name}
                        </p>
                        {p.description && (
                          <p className="mt-0.5 text-xs leading-6 text-muted-foreground">
                            {p.description}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              ))}

            {data.achievements.length > 0 &&
              wrapper("achievements", (
                <>
                  <SectionTitle style={s} align={align}>
                    دستاوردها
                  </SectionTitle>
                  <ul className="space-y-1.5 text-xs leading-6 text-muted-foreground">
                    {data.achievements.map((a, i) => (
                      <li key={i} className="flex gap-2">
                        <span style={{ color: accent }}>•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
