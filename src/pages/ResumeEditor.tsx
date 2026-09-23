import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Share2,
  Sparkles,
  Target,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Education = { degree: string; field?: string; institute?: string; year?: string };
type Experience = { title: string; org?: string; period?: string; description?: string };
type Project = { name: string; description?: string; link?: string };
type Language = { name: string; level?: string };
type LinkItem = { label: string; url: string };

type FieldDef<T> = {
  key: Extract<keyof T, string>;
  label: string;
  placeholder?: string;
  wide?: boolean;
};

function ListRows<T extends Record<string, unknown>>({
  title,
  hint,
  items,
  empty,
  fields,
  onChange,
}: {
  title: string;
  hint?: string;
  items: T[];
  empty: () => T;
  fields: FieldDef<T>[];
  onChange: (next: T[]) => void;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold">{title}</p>
          {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => onChange([...items, empty()])}>
          <Plus className="ml-1 size-3.5" />
          افزودن
        </Button>
      </div>
      <div className="mt-3 space-y-3">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">موردی ثبت نشده است.</p>
        )}
        {items.map((item, idx) => (
          <div key={idx} className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="flex justify-end">
              <button
                type="button"
                className="text-[11px] font-bold text-destructive hover:underline"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
              >
                حذف این مورد
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {fields.map((f) =>
                f.wide ? (
                  <Textarea
                    key={f.key}
                    rows={2}
                    className="sm:col-span-2 text-xs"
                    placeholder={f.placeholder ?? f.label}
                    value={String(item[f.key] ?? "")}
                    onChange={(e) =>
                      onChange(
                        items.map((it, i) => (i === idx ? { ...it, [f.key]: e.target.value } : it)),
                      )
                    }
                  />
                ) : (
                  <Input
                    key={f.key}
                    className="text-xs"
                    placeholder={f.placeholder ?? f.label}
                    value={String(item[f.key] ?? "")}
                    onChange={(e) =>
                      onChange(
                        items.map((it, i) => (i === idx ? { ...it, [f.key]: e.target.value } : it)),
                      )
                    }
                  />
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  hint,
  icon: Icon,
  children,
}: {
  title: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-4 text-primary" />
          </span>
          {title}
          {hint && <span className="text-[11px] font-normal text-muted-foreground">— {hint}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

const lines = (t: string) =>
  t
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

export default function ResumeEditor() {
  const resume = useQuery(api.resumes.getMyResume);
  const save = useMutation(api.resumes.updateMyResume);
  const setVisibility = useMutation(api.resumes.setResumeVisibility);

  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [achievementsText, setAchievementsText] = useState("");
  const [education, setEducation] = useState<Education[]>([]);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (resume && !hydrated) {
      setHeadline(resume.headline ?? "");
      setSummary(resume.summary ?? "");
      setSkillsText((resume.skills ?? []).join("\n"));
      setAchievementsText((resume.achievements ?? []).join("\n"));
      setEducation((resume.education ?? []) as Education[]);
      setExperience((resume.experience ?? []) as Experience[]);
      setProjects((resume.projects ?? []) as Project[]);
      setLanguages((resume.languages ?? []) as Language[]);
      setLinks((resume.links ?? []) as LinkItem[]);
      setHydrated(true);
    }
  }, [resume, hydrated]);

  const publicUrl = resume ? `${window.location.origin}/u/${resume.slug}` : null;

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
      toast.success(
        !resume.isVisible
          ? "رزومه شما اکنون عمومی است"
          : "رزومه شما از حالت عمومی خارج شد",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در تغییر وضعیت");
    }
  };

  if (resume === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <User className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">رزومه دیجیتال من</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                رزومه خود را بسازید و با لینک اختصاصی به اشتراک بگذارید
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="rounded-full" onClick={toggleVisibility}>
              {resume?.isVisible ? <Eye className="ml-1.5 size-4" /> : <EyeOff className="ml-1.5 size-4" />}
              {resume?.isVisible ? "عمومی" : "خصوصی"}
            </Button>
            {resume && (
              <>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link to={`/u/${resume.slug}`} target="_blank">
                    <ExternalLink className="ml-1.5 size-4" />
                    مشاهده صفحه عمومی
                  </Link>
                </Button>
                <Button size="sm" className="rounded-full" onClick={copyPublicUrl}>
                  {copied ? <CheckCircle2 className="ml-1.5 size-4" /> : <Share2 className="ml-1.5 size-4" />}
                  {copied ? "کپی شد" : "کپی لینک"}
                </Button>
              </>
            )}
          </div>
        </div>

        {publicUrl && (
          <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
            <p className="text-[11px] font-bold text-primary">لینک عمومی رزومه شما</p>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground" dir="ltr">
              {publicUrl}
            </p>
          </div>
        )}

        {/* ── Identity ──────────────────────────────────────── */}
        <SectionCard title="اطلاعات اصلی" hint="عنوان و معرفی کوتاه" icon={Sparkles}>
          <div className="space-y-1.5">
            <Label className="text-xs">عنوان حرفه‌ای (headline)</Label>
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="مثلاً: دانشجوی میکروبیولوژی | علاقه‌مند به بیوانفورماتیک"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">درباره من</Label>
            <Textarea
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="چند خط درباره خودتان، علایق علمی و اهداف تحصیلی…"
            />
          </div>
        </SectionCard>

        <SectionCard title="مهارت‌ها" hint="هر خط یک مهارت" icon={Target}>
          <Textarea
            rows={4}
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            placeholder={"کشت باکتریایی\nاستخراج DNA\nکروماتوگرافی HPLC\nبیوانفورماتیک پایه"}
            className="font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            مهارت‌های مرتبط را از صفحه «مهارت‌ها» هم ببینید و دوره‌های عملی آن‌ها را بگذرانید.
          </p>
        </SectionCard>

        <ListRows<Education>
          title="تحصیلات"
          hint="مدرک، رشته، دانشگاه و سال"
          items={education}
          empty={() => ({ degree: "", field: "", institute: "", year: "" })}
          fields={[
            { key: "degree", label: "مدرک (کارشناسی/ارشد/دکتری)" },
            { key: "field", label: "رشته تحصیلی" },
            { key: "institute", label: "دانشگاه / مؤسسه" },
            { key: "year", label: "سال فراغت" },
          ]}
          onChange={setEducation}
        />

        <ListRows<Experience>
          title="تجربه کاری و پژوهشی"
          hint="سمت، محل فعالیت و بازه زمانی"
          items={experience}
          empty={() => ({ title: "", org: "", period: "", description: "" })}
          fields={[
            { key: "title", label: "سمت / عنوان فعالیت" },
            { key: "org", label: " محل فعالیت" },
            { key: "period", label: "بازه زمانی (مثلاً ۱۴۰۲–۱۴۰۳)" },
            { key: "description", label: "شرح فعالیت", wide: true },
          ]}
          onChange={setExperience}
        />

        <ListRows<Project>
          title="پروژه‌ها"
          hint="پروژه‌های پژوهشی، آزمایشگاهی یا نرم‌افزاری"
          items={projects}
          empty={() => ({ name: "", description: "", link: "" })}
          fields={[
            { key: "name", label: "نام پروژه" },
            { key: "link", label: "لینک (اختیاری)", placeholder: "https://…" },
            { key: "description", label: "توضیحات پروژه", wide: true },
          ]}
          onChange={setProjects}
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <ListRows<Language>
            title="زبان‌ها"
            items={languages}
            empty={() => ({ name: "", level: "" })}
            fields={[
              { key: "name", label: "زبان (مثلاً انگلیسی)" },
              { key: "level", label: "سطح (مثلاً آکادمیک)" },
            ]}
            onChange={setLanguages}
          />

          <ListRows<LinkItem>
            title="لینک‌ها"
            hint="گیت‌هاب، لینکدین، گوگل‌اسکالر و…"
            items={links}
            empty={() => ({ label: "", url: "" })}
            fields={[
              { key: "label", label: "عنوان لینک" },
              { key: "url", label: "آدرس", placeholder: "https://…" },
            ]}
            onChange={setLinks}
          />
        </div>

        <SectionCard title="دستاوردها" hint="هر خط یک دستاورد" icon={Award}>
          <Textarea
            rows={3}
            value={achievementsText}
            onChange={(e) => setAchievementsText(e.target.value)}
            placeholder={"نفر برگزیده المپیاد دانشجویی\nنویسنده مقاله ISI"}
            className="text-xs"
          />
        </SectionCard>

        <Separator />

        {/* ── Save ──────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-10">
          <p className="text-xs text-muted-foreground">
            دوره‌ها، گواهی‌ها و کارگاه‌های شما به‌صورت خودکار در صفحه عمومی نمایش داده می‌شوند.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/dashboard">
                <BookOpen className="ml-1.5 size-4" />
                پنل دانشجویی
              </Link>
            </Button>
            <Button className="rounded-full" onClick={handleSave} disabled={busy}>
              {busy ? (
                <Loader2 className="ml-1.5 size-4 animate-spin" />
              ) : (
                <Save className="ml-1.5 size-4" />
              )}
              ذخیره رزومه
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
