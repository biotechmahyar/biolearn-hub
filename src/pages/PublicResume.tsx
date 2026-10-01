import { useParams, Link } from "react-router";
import { useQuery } from "convex/react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Share2,
  User,
} from "lucide-react";
import { useState } from "react";
import { PublicLayout } from "@/components/site/PublicLayout";
import { api } from "@/convex/_generated/api";
import { faNum } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ResumeDocument from "@/components/resume/ResumeDocument";

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-4 text-primary" />
          </span>
          <h2 className="text-sm font-extrabold">{title}</h2>
        </div>
        <div className="mt-4">{children}</div>
      </CardContent>
    </Card>
  );
}

function EmptyLine() {
  return <p className="text-xs text-muted-foreground">موردی ثبت نشده است.</p>;
}

export default function PublicResume() {
  const { slug = "" } = useParams();
  const resume = useQuery(api.resumes.getPublicResume, { slug });
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be blocked */
    }
  };

  if (resume === undefined) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">در حال بارگذاری رزومه…</p>
        </div>
      </PublicLayout>
    );
  }

  if (!resume) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <User className="mx-auto size-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-extrabold">این رزومه پیدا نشد</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            آدرس نادرست است یا صاحب رزومه آن را از حالت عمومی خارج کرده است.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild className="rounded-full">
              <Link to="/">بازگشت به صفحه اصلی</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/resume">ساخت رزومه در ژنوا</Link>
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }


  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/12 via-background to-emerald-500/5 p-6 sm:p-8">
          <div className="pointer-events-none absolute -left-14 -top-16 size-48 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 right-8 size-40 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-primary/10 text-3xl font-extrabold text-primary ring-1 ring-primary/20">
              {resume.avatarUrl ? (
                <img
                  src={resume.avatarUrl}
                  alt={resume.name}
                  className="size-full object-cover"
                />
              ) : (
                (resume.name ?? "د")[0]
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {resume.name}
                </h1>
                <Badge className="border-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  رزومه عمومی
                </Badge>
              </div>
              {resume.headline && (
                <p className="mt-1 text-sm font-semibold text-primary">{resume.headline}</p>
              )}
              <div className="mt-2.5 flex flex-wrap gap-2">
                {resume.university && (
                  <span className="rounded-full border border-border/70 bg-background/60 px-3 py-1 text-[11px] font-bold text-muted-foreground">
                    {resume.university}
                  </span>
                )}
                {resume.major && (
                  <span className="rounded-full border border-border/70 bg-background/60 px-3 py-1 text-[11px] font-bold text-muted-foreground">
                    {resume.major}
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button size="sm" className="rounded-full" onClick={copyLink}>
                {copied ? (
                  <CheckCircle2 className="ml-1.5 size-4" />
                ) : (
                  <Share2 className="ml-1.5 size-4" />
                )}
                {copied ? "کپی شد" : "کپی لینک"}
              </Button>
            </div>
          </div>
        </div>

        {/* ── The document (same renderer as the editor canvas) ── */}
        <div className="mt-6">
          <ResumeDocument
            data={{
              name: resume.name,
              avatarUrl: resume.avatarUrl,
              headline: resume.headline,
              summary: resume.about,
              skills: resume.skills,
              education: resume.education,
              experience: resume.experience,
              projects: resume.projects,
              achievements: resume.achievements,
              languages: resume.languages,
              links: resume.links,
            }}
            style={resume.style}
          />
        </div>

        {/* ── Stats strip ────────────────────────────────────── */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "دوره گذرانده‌شده", value: resume.completedCourses.length },
            { label: "دوره در حال گذراندن", value: resume.inProgressCourses.length },
            { label: "گواهی", value: resume.certificates.length },
            { label: "کارگاه", value: resume.workshops.length },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border/70 bg-card p-4 text-center shadow-sm"
            >
              <p className="text-2xl font-extrabold text-primary">{faNum(s.value)}</p>
              <p className="mt-1 text-[11px] font-bold text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Platform activity (courses / certificates / workshops) ── */}
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Section title="دوره‌های گذرانده‌شده" icon={CheckCircle2}>
            {resume.completedCourses.length === 0 ? (
              <EmptyLine />
            ) : (
              <ul className="space-y-2">
                {resume.completedCourses.map((c, i) => (
                  <li key={`${c.slug}-${i}`}>
                    <Link
                      to={`/courses/${c.slug}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5 transition-colors hover:border-emerald-500/40"
                    >
                      <span className="truncate text-[13px] font-bold">{c.title}</span>
                      <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                        {faNum(c.percent)}٪
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="دوره‌های در حال گذراندن" icon={BookOpen}>
            {resume.inProgressCourses.length === 0 ? (
              <EmptyLine />
            ) : (
              <ul className="space-y-2">
                {resume.inProgressCourses.map((c, i) => (
                  <li key={`${c.slug}-${i}`}>
                    <Link
                      to={`/courses/${c.slug}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5 transition-colors hover:border-primary/40"
                    >
                      <span className="truncate text-[13px] font-bold">{c.title}</span>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-extrabold text-primary">
                        {faNum(c.percent)}٪
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="گواهی‌نامه‌ها" icon={Award}>
            {resume.certificates.length === 0 ? (
              <EmptyLine />
            ) : (
              <ul className="space-y-2">
                {resume.certificates.map((c, i) => (
                  <li
                    key={`${c.code ?? c.courseName}-${i}`}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-bold">{c.courseName}</span>
                      {c.verifyLink && (
                        <Link
                          to={c.verifyLink}
                          className="shrink-0 text-[11px] font-bold text-primary hover:underline"
                        >
                          استعلام
                        </Link>
                      )}
                    </div>
                    {c.code && (
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground" dir="ltr">
                        {c.code}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="کارگاه‌ها" icon={GraduationCap}>
            {resume.workshops.length === 0 ? (
              <EmptyLine />
            ) : (
              <ul className="space-y-2">
                {resume.workshops.map((w, i) => (
                  <li key={`${w.slug}-${i}`}>
                    <Link
                      to={`/workshops/${w.slug}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5 transition-colors hover:border-sky-500/40"
                    >
                      <span className="truncate text-[13px] font-bold">{w.title}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {w.date}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

        </div>

        {/* ── Footer CTA ─────────────────────────────────────── */}
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center">
          <p className="text-sm font-bold">تو هم رزومه دیجیتال ژنوا را بساز</p>
          <p className="mt-1 text-xs text-muted-foreground">
            صفحه عمومی اختصاصی با دوره‌ها، گواهی‌ها و مهارت‌هایت — قابل اشتراک‌گذاری با یک لینک.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button asChild className="rounded-full">
              <Link to="/resume">ساخت رزومه من</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/skills">کشف مهارت‌ها</Link>
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
