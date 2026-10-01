import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import {
  AlignCenter,
  AlignRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Copy,
  Eye,
  EyeOff,
  GraduationCap,
  LayoutTemplate,
  Link2,
  Loader2,
  Minus,
  Plus,
  Share2,
  Sparkles,
  Target,
  Trash2,
  User,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import ResumeDocument, {
  DEFAULT_RESUME_STYLE,
  type ResumeStyle,
} from "@/components/resume/ResumeDocument";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/format";

type Education = { degree: string; field?: string; institute?: string; year?: string };
type Experience = { title: string; org?: string; period?: string; description?: string };
type Project = { name: string; description?: string; link?: string };
type Language = { name: string; level?: string };
type LinkItem = { label: string; url: string };

const lines = (t: string) =>
  t
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

// ── Design presets offered in the "Templates" tab ──────────────────────────
const TEMPLATES: { id: string; name: string; hint: string; style: Partial<ResumeStyle> }[] = [
  {
    id: "clean",
    name: "مینیمال آبی",
    hint: "دو ستون، فونت وزیرمتن، لهجهٔ آبی",
    style: DEFAULT_RESUME_STYLE,
  },
  {
    id: "classic",
    name: "کلاسیک راست‌چین",
    hint: "فونت کلاسیک و تیترهای ساده",
    style: { ...DEFAULT_RESUME_STYLE, font: "serif", headingStyle: "plain", accent: "#0F766E" },
  },
  {
    id: "compact",
    name: "فشردهٔ تک‌ستونه",
    hint: "تک‌ستونه و فشرده، مناسب رزومه‌های بلند",
    style: {
      ...DEFAULT_RESUME_STYLE,
      columns: 1,
      density: "compact",
      accent: "#7C3AED",
      width: "a5",
    },
  },
  {
    id: "bold",
    name: "پررنگ رُز",
    hint: "رنگ گرم، گوشه‌های گرد و سایهٔ پررنگ",
    style: {
      ...DEFAULT_RESUME_STYLE,
      accent: "#E11D48",
      radius: 28,
      shadow: "strong",
      density: "relaxed",
    },
  },
];

const ACCENT_SWATCHES = [
  "#2563EB",
  "#0F766E",
  "#7C3AED",
  "#E11D48",
  "#EA580C",
  "#0284C7",
  "#16A34A",
  "#0F172A",
];

// ── Small building blocks ─────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function PanelSection({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border p-4 last:border-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[12px] font-bold text-foreground">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors",
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function IconToggle({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-9 flex-1 items-center justify-center rounded-lg border transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

/** Collapsible block in the left list, expanding to reveal its editor. */
function BlockItem({
  title,
  open,
  onToggle,
  onAdd,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/70 last:border-0">
      <div className="flex items-center gap-1 px-3 py-2.5">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-right text-[12.5px] font-semibold text-foreground"
        >
          {open ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
          {title}
        </button>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            title="افزودن مورد"
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="size-3.5" />
          </button>
        )}
      </div>
      {open && children && <div className="space-y-2.5 px-3 pb-3">{children}</div>}
    </div>
  );
}

function RowEditor({
  item,
  fields,
  onChange,
  onRemove,
}: {
  item: Record<string, string>;
  fields: { key: string; label: string; wide?: boolean }[];
  onChange: (next: Record<string, string>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-2.5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground transition-colors hover:text-destructive"
          title="حذف مورد"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {fields.map((f) =>
        f.wide ? (
          <Textarea
            key={f.key}
            rows={2}
            value={item[f.key] ?? ""}
            placeholder={f.label}
            onChange={(e) => onChange({ ...item, [f.key]: e.target.value })}
            className="resize-none text-xs"
          />
        ) : (
          <Input
            key={f.key}
            value={item[f.key] ?? ""}
            placeholder={f.label}
            onChange={(e) => onChange({ ...item, [f.key]: e.target.value })}
            className="h-8 text-xs"
          />
        ),
      )}
    </div>
  );
}

/** Design controls, shared by the desktop properties rail and the mobile drawer. */
function StylePanel({
  style,
  setStyle,
}: {
  style: Required<ResumeStyle>;
  setStyle: React.Dispatch<React.SetStateAction<Required<ResumeStyle>>>;
}) {
  return (
    <>
      <PanelSection title="چیدمان">
        <div className="flex gap-1.5">
          <IconToggle
            active={style.columns === 2}
            onClick={() => setStyle({ ...style, columns: 2 })}
            title="دو ستون"
          >
            <LayoutTemplate className="size-4" />
          </IconToggle>
          <IconToggle
            active={style.columns === 1}
            onClick={() => setStyle({ ...style, columns: 1 })}
            title="یک ستون"
          >
            <AlignRight className="size-4" />
          </IconToggle>
          <IconToggle
            active={style.align === "start"}
            onClick={() => setStyle({ ...style, align: "start" })}
            title="راست‌چین"
          >
            <AlignRight className="size-4" />
          </IconToggle>
          <IconToggle
            active={style.align === "center"}
            onClick={() => setStyle({ ...style, align: "center" })}
            title="وسط‌چین"
          >
            <AlignCenter className="size-4" />
          </IconToggle>
        </div>
      </PanelSection>

      <PanelSection title="متن">
        <div className="space-y-2.5">
          <select
            value={style.font}
            onChange={(e) => setStyle({ ...style, font: e.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-card px-2 text-[11px] font-semibold outline-none focus:border-primary/50"
          >
            <option value="sans">وزیرمتن (Sans)</option>
            <option value="serif">نسخ کلاسیک (Serif)</option>
            <option value="mono">یکنواخت (Mono)</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0.8}
              max={1.3}
              step={0.05}
              value={style.scale}
              onChange={(e) => setStyle({ ...style, scale: Number(e.target.value) })}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
            <span className="w-10 text-[11px] font-bold text-muted-foreground">
              {faNum(Math.round(style.scale * 100))}٪
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ACCENT_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setStyle({ ...style, accent: c })}
                title={c}
                className={cn(
                  "size-6 rounded-lg border-2 transition-transform",
                  style.accent === c ? "scale-110 border-foreground" : "border-border",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <Segmented
            value={style.headingStyle}
            onChange={(v) => setStyle({ ...style, headingStyle: v })}
            options={[
              { value: "underline", label: "خط زیر تیتر" },
              { value: "plain", label: "تیتر ساده" },
            ]}
          />
        </div>
      </PanelSection>

      <PanelSection title="اندازه">
        <div className="grid grid-cols-3 gap-1.5">
          {(["a4", "a5", "letter"] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setStyle({ ...style, width: w })}
              className={cn(
                "rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors",
                style.width === w
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {w === "a4" ? "A4" : w === "a5" ? "A5" : "Letter"}
            </button>
          ))}
        </div>
        <div className="mt-2.5">
          <Segmented
            value={style.density}
            onChange={(v) => setStyle({ ...style, density: v })}
            options={[
              { value: "compact", label: "فشرده" },
              { value: "normal", label: "معمولی" },
              { value: "relaxed", label: "باز" },
            ]}
          />
        </div>
      </PanelSection>

      <PanelSection title="افکت‌های ظاهری">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="w-14 text-[11px] text-muted-foreground">گوشه</span>
            <input
              type="range"
              min={0}
              max={32}
              step={2}
              value={style.radius}
              onChange={(e) => setStyle({ ...style, radius: Number(e.target.value) })}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
            <span className="w-8 text-[11px] font-bold text-muted-foreground">
              {faNum(style.radius)}
            </span>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] text-muted-foreground">سایه</p>
            <Segmented
              value={style.shadow}
              onChange={(v) => setStyle({ ...style, shadow: v })}
              options={[
                { value: "none", label: "بدون" },
                { value: "soft", label: "ملایم" },
                { value: "strong", label: "پررنگ" },
              ]}
            />
          </div>
          <button
            type="button"
            onClick={() => setStyle({ ...style, outline: !style.outline })}
            className="flex w-full items-center justify-between rounded-lg border border-border px-2.5 py-2 text-[11px] font-semibold"
          >
            <span className="text-muted-foreground">خط دور صفحه</span>
            {style.outline ? (
              <Check className="size-4 text-primary" />
            ) : (
              <span className="size-4 rounded border border-border" />
            )}
          </button>
        </div>
      </PanelSection>
    </>
  );
}

// ── Editor ────────────────────────────────────────────────────────────────
type ResumeData = {
  resume: {
    slug: string;
    isVisible: boolean;
    headline?: string;
    summary?: string;
    skills?: string[];
    education: Education[];
    experience: Experience[];
    projects: Project[];
    achievements: string[];
    languages: Language[];
    links: LinkItem[];
    style?: ResumeStyle;
  } | null;
  identity: { name: string; avatarUrl: string | null; email: string; phone: string };
};

function ResumeEditorCanvas({ data }: { data: ResumeData }) {
  const save = useMutation(api.resumes.updateMyResume);
  const setVisibility = useMutation(api.resumes.setResumeVisibility);

  const r0 = data.resume;
  const [tab, setTab] = useState<"create" | "templates">("create");
  const [openBlock, setOpenBlock] = useState<string | null>("personal");
  const [zoom, setZoom] = useState(0.7);
  const [activeSection, setActiveSection] = useState<string | null>("summary");
  const [mobilePanel, setMobilePanel] = useState<"blocks" | "style" | null>(null);

  const [headline, setHeadline] = useState(() => r0?.headline ?? "");
  const [summary, setSummary] = useState(() => r0?.summary ?? "");
  const [skillsText, setSkillsText] = useState(() => (r0?.skills ?? []).join("\n"));
  const [achievementsText, setAchievementsText] = useState(() =>
    (r0?.achievements ?? []).join("\n"),
  );
  const [education, setEducation] = useState<Education[]>(() => (r0?.education ?? []) as Education[]);
  const [experience, setExperience] = useState<Experience[]>(() => (r0?.experience ?? []) as Experience[]);
  const [projects, setProjects] = useState<Project[]>(() => (r0?.projects ?? []) as Project[]);
  const [languages, setLanguages] = useState<Language[]>(() => (r0?.languages ?? []) as Language[]);
  const [links, setLinks] = useState<LinkItem[]>(() => (r0?.links ?? []) as LinkItem[]);
  const [style, setStyle] = useState<Required<ResumeStyle>>(
    () => ({ ...DEFAULT_RESUME_STYLE, ...(r0?.style ?? {}) }) as Required<ResumeStyle>,
  );
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const resume = r0;
  const identity = data.identity;

  const publicUrl = resume ? `${window.location.origin}/u/${resume.slug}` : null;

  const doc = useMemo(
    () => ({
      name: identity?.name ?? "دانشجوی ژنوا",
      avatarUrl: identity?.avatarUrl ?? null,
      email: identity?.email ?? "",
      phone: identity?.phone ?? "",
      headline,
      summary,
      skills: lines(skillsText),
      education,
      experience,
      projects,
      achievements: lines(achievementsText),
      languages,
      links,
    }),
    [identity, headline, summary, skillsText, education, experience, projects, achievementsText, languages, links],
  );

  const copyPublicUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("لینک عمومی رزومه کپی شد");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("کپی لینک ممکن نشد");
    }
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await save({
        headline,
        summary,
        skills: lines(skillsText),
        achievements: lines(achievementsText),
        education,
        experience,
        projects,
        languages,
        links,
        style,
      });
      toast.success("رزومه شما ذخیره شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ذخیره رزومه");
    } finally {
      setBusy(false);
    }
  };

  const toggleVisibility = async () => {
    if (!resume) return;
    try {
      await setVisibility({ visible: !resume.isVisible });
      toast.success(!resume.isVisible ? "رزومه شما اکنون عمومی است" : "رزومه از حالت عمومی خارج شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در تغییر وضعیت");
    }
  };

  if (data === undefined) {
    return null;
  }

  const blocks: { id: string; title: string; add?: () => void; body: React.ReactNode }[] = [
    {
      id: "personal",
      title: "اطلاعات اصلی",
      body: (
        <Field label="عنوان حرفه‌ای">
          <Input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="مثلاً: دانشجوی میکروبیولوژی"
            className="h-9 text-xs"
          />
        </Field>
      ),
    },
    {
      id: "summary",
      title: "خلاصه حرفه‌ای",
      body: (
        <Textarea
          rows={5}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="چند خط دربارهٔ خودتان…"
          className="resize-none text-xs"
        />
      ),
    },
    {
      id: "experience",
      title: "سوابق شغلی",
      add: () => setExperience([...experience, { title: "", org: "", period: "", description: "" }]),
      body: experience.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">موردی ثبت نشده است.</p>
      ) : (
        experience.map((item, i) => (
          <RowEditor
            key={i}
            item={item as unknown as Record<string, string>}
            fields={[
              { key: "title", label: "سمت" },
              { key: "org", label: "محل فعالیت" },
              { key: "period", label: "بازهٔ زمانی" },
              { key: "description", label: "شرح فعالیت", wide: true },
            ]}
            onChange={(next) =>
              setExperience(experience.map((x, j) => (j === i ? (next as Experience) : x)))
            }
            onRemove={() => setExperience(experience.filter((_, j) => j !== i))}
          />
        ))
      ),
    },
    {
      id: "education",
      title: "تحصیلات",
      add: () => setEducation([...education, { degree: "", field: "", institute: "", year: "" }]),
      body: education.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">موردی ثبت نشده است.</p>
      ) : (
        education.map((item, i) => (
          <RowEditor
            key={i}
            item={item as unknown as Record<string, string>}
            fields={[
              { key: "degree", label: "مدرک" },
              { key: "field", label: "رشته" },
              { key: "institute", label: "دانشگاه" },
              { key: "year", label: "سال" },
            ]}
            onChange={(next) =>
              setEducation(education.map((x, j) => (j === i ? (next as Education) : x)))
            }
            onRemove={() => setEducation(education.filter((_, j) => j !== i))}
          />
        ))
      ),
    },
    {
      id: "projects",
      title: "پروژه‌ها",
      add: () => setProjects([...projects, { name: "", description: "", link: "" }]),
      body: projects.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">موردی ثبت نشده است.</p>
      ) : (
        projects.map((item, i) => (
          <RowEditor
            key={i}
            item={item as unknown as Record<string, string>}
            fields={[
              { key: "name", label: "نام پروژه" },
              { key: "link", label: "لینک" },
              { key: "description", label: "توضیحات", wide: true },
            ]}
            onChange={(next) => setProjects(projects.map((x, j) => (j === i ? (next as Project) : x)))}
            onRemove={() => setProjects(projects.filter((_, j) => j !== i))}
          />
        ))
      ),
    },
    {
      id: "links",
      title: "لینک‌ها و شبکه‌های اجتماعی",
      add: () => setLinks([...links, { label: "", url: "" }]),
      body: links.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">موردی ثبت نشده است.</p>
      ) : (
        links.map((item, i) => (
          <RowEditor
            key={i}
            item={item as unknown as Record<string, string>}
            fields={[
              { key: "label", label: "عنوان" },
              { key: "url", label: "آدرس" },
            ]}
            onChange={(next) => setLinks(links.map((x, j) => (j === i ? (next as LinkItem) : x)))}
            onRemove={() => setLinks(links.filter((_, j) => j !== i))}
          />
        ))
      ),
    },
    {
      id: "skills",
      title: "مهارت‌ها",
      body: (
        <Textarea
          rows={4}
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          placeholder="هر خط یک مهارت"
          className="resize-none font-mono text-[11px]"
        />
      ),
    },
    {
      id: "achievements",
      title: "دستاوردها",
      body: (
        <Textarea
          rows={3}
          value={achievementsText}
          onChange={(e) => setAchievementsText(e.target.value)}
          placeholder="هر خط یک دستاورد"
          className="resize-none text-xs"
        />
      ),
    },
    {
      id: "languages",
      title: "زبان‌ها",
      add: () => setLanguages([...languages, { name: "", level: "" }]),
      body: languages.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">موردی ثبت نشده است.</p>
      ) : (
        languages.map((item, i) => (
          <RowEditor
            key={i}
            item={item as unknown as Record<string, string>}
            fields={[
              { key: "name", label: "زبان" },
              { key: "level", label: "سطح" },
            ]}
            onChange={(next) =>
              setLanguages(languages.map((x, j) => (j === i ? (next as Language) : x)))
            }
            onRemove={() => setLanguages(languages.filter((_, j) => j !== i))}
          />
        ))
      ),
    },
  ];

  const activeBlock = blocks.find((b) => b.id === activeSection);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-muted/40">
      {/* ── Top toolbar ────────────────────────────────────── */}
      <header className="z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <User className="size-4" />
          </span>
          <nav className="hidden items-center gap-1.5 text-[12px] text-muted-foreground sm:flex">
            <Link to="/" className="hover:text-foreground">
              ژنوا
            </Link>
            <ChevronDown className="size-3 -rotate-90" />
            <span className="font-semibold text-foreground">رزومه من</span>
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl text-xs lg:hidden"
            onClick={() => setMobilePanel("blocks")}
          >
            <Plus className="size-4" />
            بخش‌ها
          </Button>
          <span className="hidden items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground sm:flex">
            <Cloud className="size-3.5 text-emerald-500" />
            {busy ? "در حال ذخیره…" : "ذخیره شد"}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl text-xs"
            onClick={toggleVisibility}
            title={resume?.isVisible ? "رزومه عمومی است" : "رزومه خصوصی است"}
          >
            {resume?.isVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            <span className="hidden sm:inline">{resume?.isVisible ? "عمومی" : "خصوصی"}</span>
          </Button>
          <Button variant="outline" size="sm" className="hidden h-9 rounded-xl text-xs sm:inline-flex" asChild>
            <Link to={resume ? `/u/${resume.slug}` : "/resume"} target="_blank">
              <Copy className="size-4" />
              مشاهده
            </Link>
          </Button>
          <Button size="sm" className="h-9 rounded-xl text-xs" onClick={handleSave} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
            <span className="hidden sm:inline">ذخیره و اشتراک</span>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Left: blocks ──────────────────────────────────── */}
        <aside className="admin-scroll hidden w-[300px] shrink-0 overflow-y-auto border-l border-border bg-card lg:block">
          <div className="sticky top-0 z-10 border-b border-border bg-card p-3">
            <Segmented
              value={tab}
              onChange={(v) => setTab(v as "create" | "templates")}
              options={[
                { value: "create", label: "ساخت" },
                { value: "templates", label: "قالب‌ها" },
              ]}
            />
          </div>

          {tab === "create" ? (
            <div>
              {blocks.map((b) => (
                <BlockItem
                  key={b.id}
                  title={b.title}
                  open={openBlock === b.id}
                  onToggle={() => {
                    setOpenBlock(openBlock === b.id ? null : b.id);
                    setActiveSection(b.id);
                  }}
                  onAdd={b.add}
                >
                  {b.body}
                </BlockItem>
              ))}
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setStyle({ ...style, ...t.style });
                    toast.success(`قالب «${t.name}» اعمال شد`);
                  }}
                  className="w-full rounded-xl border border-border bg-card p-3 text-right transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <LayoutTemplate className="size-3.5" />
                    </span>
                    <p className="text-[12.5px] font-bold text-foreground">{t.name}</p>
                  </div>
                  <div className="flex h-14 gap-1.5 overflow-hidden rounded-lg bg-slate-100 p-2">
                    <div className="w-1/3 space-y-1">
                      <div className="h-1.5 w-full rounded bg-slate-300" />
                      <div className="h-1.5 w-3/4 rounded bg-slate-300" />
                      <div className="h-1.5 w-2/3 rounded bg-slate-300" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="h-1.5 w-full rounded bg-slate-300" />
                      <div className="h-1.5 w-5/6 rounded bg-slate-300" />
                      <div className="h-1.5 w-4/6 rounded bg-slate-300" />
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">{t.hint}</p>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* ── Center: canvas ────────────────────────────────── */}
        <main className="admin-scroll relative min-w-0 flex-1 overflow-auto bg-muted/40 p-6">
          <Button
            variant="outline"
            size="sm"
            className="absolute left-4 top-4 z-10 h-9 rounded-xl text-xs xl:hidden"
            onClick={() => setMobilePanel("style")}
          >
            <Sparkles className="size-4" />
            طراحی
          </Button>
          <div className="flex min-h-full items-start justify-center">
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
              <ResumeDocument
                data={doc}
                style={style}
                interactive={{ activeSection, onSelect: setActiveSection }}
              />
            </div>
          </div>

          {/* Floating canvas toolbar */}
          <div className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-border bg-card/95 p-1.5 shadow-lg backdrop-blur">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-xl"
              onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}
              title="کوچک‌نمایی"
            >
              <ZoomOut className="size-4" />
            </Button>
            <span className="min-w-11 text-center text-[11px] font-bold text-muted-foreground">
              {faNum(Math.round(zoom * 100))}٪
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-xl"
              onClick={() => setZoom((z) => Math.min(1.2, +(z + 0.1).toFixed(2)))}
              title="بزرگ‌نمایی"
            >
              <ZoomIn className="size-4" />
            </Button>
            <div className="mx-0.5 h-5 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-xl text-[11px]"
              onClick={() => setZoom(0.7)}
            >
              <Wand2 className="size-3.5" />
              اندازهٔ مناسب
            </Button>
          </div>
        </main>

        {/* ── Right: properties ─────────────────────────────── */}
        <aside className="admin-scroll hidden w-[300px] shrink-0 overflow-y-auto border-r border-border bg-card xl:block">
          <PanelSection
            title="ویرایش متن"
            action={
              <span className="text-[10px] text-muted-foreground">
                {activeBlock ? activeBlock.title : "یک بخش را انتخاب کنید"}
              </span>
            }
          >
            {activeBlock?.id === "summary" ? (
              <Textarea
                rows={5}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="resize-none text-xs"
              />
            ) : activeBlock?.id === "personal" ? (
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} className="h-9 text-xs" />
            ) : activeBlock?.id === "skills" ? (
              <Textarea
                rows={5}
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                className="resize-none font-mono text-[11px]"
              />
            ) : activeBlock?.id === "achievements" ? (
              <Textarea
                rows={4}
                value={achievementsText}
                onChange={(e) => setAchievementsText(e.target.value)}
                className="resize-none text-xs"
              />
            ) : (
              <p className="text-[11px] leading-5 text-muted-foreground">
                این بخش فهرستی است؛ برای ویرایش، آن را از فهرست کنار باز کنید.
              </p>
            )}
          </PanelSection>

          <StylePanel style={style} setStyle={setStyle} />

          <PanelSection title="دسترسی سریع">
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { icon: BookOpen, label: "پنل دانشجویی", to: "/dashboard" },
                { icon: GraduationCap, label: "گواهی‌ها", to: "/dashboard" },
                { icon: Target, label: "مهارت‌ها", to: "/skills" },
                { icon: Sparkles, label: "دوره‌ها", to: "/courses" },
              ].map((q) => (
                <Link
                  key={q.label}
                  to={q.to}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <q.icon className="size-3.5" />
                  {q.label}
                </Link>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2.5 h-9 w-full rounded-xl text-xs"
              onClick={copyPublicUrl}
              disabled={!publicUrl}
            >
              {copied ? <CheckCircle2 className="ml-1.5 size-4" /> : <Link2 className="ml-1.5 size-4" />}
              کپی لینک عمومی
            </Button>
          </PanelSection>
        </aside>
      </div>

      {/* ── Mobile drawers (same panels, for small screens) ── */}
      <Sheet open={mobilePanel === "blocks"} onOpenChange={(o) => setMobilePanel(o ? "blocks" : null)}>
        <SheetContent side="right" className="w-[88vw] overflow-y-auto p-0 sm:max-w-sm">
          <SheetTitle className="sr-only">بخش‌های رزومه</SheetTitle>
          <div className="sticky top-0 z-10 border-b border-border bg-card p-3">
            <Segmented
              value={tab}
              onChange={(v) => setTab(v as "create" | "templates")}
              options={[
                { value: "create", label: "ساخت" },
                { value: "templates", label: "قالب‌ها" },
              ]}
            />
          </div>
          {tab === "create" ? (
            <div>
              {blocks.map((b) => (
                <BlockItem
                  key={b.id}
                  title={b.title}
                  open={openBlock === b.id}
                  onToggle={() => {
                    setOpenBlock(openBlock === b.id ? null : b.id);
                    setActiveSection(b.id);
                  }}
                  onAdd={b.add}
                >
                  {b.body}
                </BlockItem>
              ))}
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setStyle({ ...style, ...t.style });
                    toast.success(`قالب «${t.name}» اعمال شد`);
                  }}
                  className="w-full rounded-xl border border-border bg-card p-3 text-right"
                >
                  <p className="text-[12.5px] font-bold text-foreground">{t.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{t.hint}</p>
                </button>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={mobilePanel === "style"} onOpenChange={(o) => setMobilePanel(o ? "style" : null)}>
        <SheetContent side="left" className="w-[88vw] overflow-y-auto p-0 sm:max-w-sm">
          <SheetTitle className="sr-only">تنظیمات طراحی</SheetTitle>
          <StylePanel style={style} setStyle={setStyle} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Route entry: loads first, then mounts the canvas with real data ─────────
export default function ResumeEditor() {
  const data = useQuery(api.resumes.getMyResume);
  if (data === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }
  if (data === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
        <User className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">برای ساخت رزومه ابتدا وارد حساب شوید.</p>
        <Button asChild className="rounded-xl">
          <Link to="/auth">ورود / ثبت‌نام</Link>
        </Button>
      </div>
    );
  }
  return <ResumeEditorCanvas data={data} />;
}
