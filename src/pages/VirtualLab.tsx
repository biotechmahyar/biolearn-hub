/**
 * Genova Virtual Lab — «آزمایشگاه مجازی ژنوا»
 * ─────────────────────────────────────────────────────────────────────────────
 * Perform lab work online: run graded experiment protocols step by step, use the
 * bench calculators, play with the gel/microscope simulators and keep a lab
 * notebook.
 *
 * Everything that must be trustworthy is server-side (convex/lab.ts): the
 * protocol catalog, step ordering, answer grading and the notebook. The client
 * only renders and submits choices.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Atom,
  Beaker,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  Microscope,
  NotebookPen,
  RotateCcw,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LabTools } from "@/components/lab/LabTools";
import { useAuth } from "@/hooks/use-auth";
import { faNum, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  microbiology: "میکروب‌شناسی",
  biotechnology: "بیوتکنولوژی",
  molecular: "مولکولی",
  analytical: "تحلیلی",
};

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "مقدماتی",
  2: "میانی",
  3: "پیشرفته",
};

const CATEGORY_ICONS: Record<string, typeof Beaker> = {
  microbiology: Microscope,
  biotechnology: FlaskConical,
  molecular: Atom,
  analytical: Beaker,
};

type Experiment = {
  slug: string;
  title: string;
  category: string;
  difficulty: number;
  durationMin: number;
  summary: string;
  equipment: string[];
  stepCount: number;
  totalPoints: number;
  steps: {
    title: string;
    detail: string;
    check?: { question: string; options: string[] };
  }[];
};

type ProgressRow = {
  experimentSlug: string;
  status: string;
  stepsDone: number[];
  score?: number;
};

export default function VirtualLab() {
  const { user, isAuthenticated } = useAuth();
  const experiments = useQuery(api.lab.listExperiments);
  const progress = useQuery(api.lab.listMyProgress, isAuthenticated ? {} : "skip");
  const summary = useQuery(api.lab.myLabSummary, isAuthenticated ? {} : "skip");

  const [tab, setTab] = useState("experiments");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const bySlug = useMemo(() => {
    const map = new Map<string, ProgressRow>();
    for (const row of (progress ?? []) as ProgressRow[]) map.set(row.experimentSlug, row);
    return map;
  }, [progress]);

  const visible = (experiments ?? []).filter(
    (experiment) => filter === "all" || experiment.category === filter,
  );

  const active = (experiments ?? []).find((experiment) => experiment.slug === activeSlug) ?? null;

  return (
    <PublicLayout>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-violet-500/20 bg-gradient-to-br from-violet-950 via-slate-950 to-slate-900">
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.35),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.25),transparent_40%)]" />
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {[...Array(14)].map((_, index) => (
            <motion.span
              key={index}
              className="absolute rounded-full bg-violet-300/40"
              style={{ left: `${6 + index * 6.6}%`, top: `${20 + (index % 5) * 14}%` }}
              animate={{ y: [0, -18, 0], opacity: [0.25, 0.7, 0.25] }}
              transition={{ duration: 6 + (index % 4), repeat: Infinity, delay: index * 0.25 }}
            >
              <span className="block size-1.5" />
            </motion.span>
          ))}
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <Badge className="mb-4 rounded-full border-violet-400/40 bg-violet-500/15 text-violet-200">
              <FlaskConical className="mr-1 size-3.5" />
              Genova Virtual Lab
            </Badge>
            <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">
              آزمایشگاه مجازی ژنوا
            </h1>
            <p className="mt-4 text-sm leading-7 text-violet-100/85 sm:text-base">
              هر کاری که در آزمایشگاه واقعی انجام می‌دهی، اینجا هم می‌توانی تمرین کنی: پروتکل‌های
              گام‌به‌گام با تصحیح خودکار، ماشین‌حساب‌های دقیق رقت و مولاریته، شبیه‌ساز ژل
              الکتروفورز و میکروسکوپ، و دفتر آزمایشگاه آنلاین. بدون هدر دادن محیط کشت و نمونه.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild className="bg-violet-600 hover:bg-violet-700">
                <a href="#experiments">
                  <Beaker className="mr-1.5 size-4" />
                  شروع آزمایش
                </a>
              </Button>
              <Button asChild variant="outline" className="border-violet-300/40 text-violet-100">
                <a href="#tools">
                  <Microscope className="mr-1.5 size-4" />
                  ابزارها و شبیه‌سازها
                </a>
              </Button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "پروتکل آماده", value: faNum(experiments?.length ?? 0) },
                { label: "امتیاز آزمایشگاهی", value: faNum(summary?.points ?? 0) },
                { label: "آزمایش تکمیل‌شده", value: faNum(summary?.completed ?? 0) },
                { label: "یادداشت دفتر", value: faNum(summary?.notes ?? 0) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-violet-400/25 bg-white/5 px-3 py-3 backdrop-blur"
                >
                  <p className="text-xl font-black text-white">{stat.value}</p>
                  <p className="mt-0.5 text-[11px] text-violet-200/80">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <section id="experiments" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Tabs value={tab} onValueChange={setTab} className="gap-6">
          <TabsList className="flex w-full flex-wrap justify-start">
            <TabsTrigger value="experiments">پروتکل‌های آزمایش</TabsTrigger>
            <TabsTrigger value="tools">ابزارها و شبیه‌سازها</TabsTrigger>
            <TabsTrigger value="notebook">دفتر آزمایشگاه</TabsTrigger>
          </TabsList>

          {/* Experiments */}
          <TabsContent value="experiments" className="space-y-6">
            {!isAuthenticated ? (
              <Card className="border-violet-500/30 bg-violet-500/5">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                  <span>
                    برای ثبت پیشرفت، امتیاز و یادداشت‌ها لازم است وارد حساب ژنوا شوی.
                  </span>
                  <Button asChild size="sm" className="bg-violet-600 hover:bg-violet-700">
                    <Link to="/auth?returnTo=/lab">ورود به حساب</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "همه" },
                ...Object.entries(CATEGORY_LABELS).map(([id, label]) => ({ id, label })),
              ].map((item) => (
                <Button
                  key={item.id}
                  size="sm"
                  variant={filter === item.id ? "default" : "outline"}
                  onClick={() => setFilter(item.id)}
                  className={cn(filter === item.id && "bg-violet-600 hover:bg-violet-700")}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {visible.map((experiment, index) => {
                const Icon = CATEGORY_ICONS[experiment.category] ?? Beaker;
                const row = bySlug.get(experiment.slug) as ProgressRow | undefined;
                const done = row?.stepsDone.length ?? 0;
                const percent = Math.round((done / experiment.stepCount) * 100);
                return (
                  <motion.div
                    key={experiment.slug}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: index * 0.04 }}
                  >
                    <Card
                      className={cn(
                        "h-full cursor-pointer transition-all hover:-translate-y-0.5 hover:border-violet-400/60 hover:shadow-lg",
                        activeSlug === experiment.slug && "border-violet-500 ring-2 ring-violet-500/20",
                      )}
                      onClick={() => setActiveSlug(experiment.slug)}
                    >
                      <CardContent className="space-y-3 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                              <Icon className="size-5" />
                            </span>
                            <div>
                              <h3 className="text-sm font-bold leading-6">{experiment.title}</h3>
                              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                                {experiment.summary}
                              </p>
                            </div>
                          </div>
                          {row?.status === "completed" ? (
                            <Badge className="shrink-0 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="mr-1 size-3" />
                              تمام
                            </Badge>
                          ) : done > 0 ? (
                            <Badge variant="secondary" className="shrink-0 rounded-full text-[10px]">
                              {faNum(percent)}٪
                            </Badge>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          <Badge variant="outline" className="rounded-full">
                            {CATEGORY_LABELS[experiment.category]}
                          </Badge>
                          <Badge variant="outline" className="rounded-full">
                            {DIFFICULTY_LABELS[experiment.difficulty]}
                          </Badge>
                          <span>{faNum(experiment.durationMin)} دقیقه</span>
                          <span>·</span>
                          <span>{faNum(experiment.stepCount)} مرحله</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <Trophy className="size-3" />
                            {faNum(experiment.totalPoints)} امتیاز
                          </span>
                        </div>

                        {done > 0 ? <Progress value={percent} className="h-1.5" /> : null}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {active ? <ExperimentRunner experiment={active} progress={bySlug.get(active.slug) as ProgressRow | undefined} isAuthenticated={isAuthenticated} /> : null}
          </TabsContent>

          {/* Tools */}
          <TabsContent value="tools" className="space-y-6">
            <LabTools />
          </TabsContent>

          {/* Notebook */}
          <TabsContent value="notebook" className="space-y-6">
            <Notebook isAuthenticated={isAuthenticated} experiments={experiments ?? []} />
          </TabsContent>
        </Tabs>
      </section>
    </PublicLayout>
  );
}

// ── Experiment runner ───────────────────────────────────────────────────────

function ExperimentRunner({
  experiment,
  progress,
  isAuthenticated,
}: {
  experiment: Experiment;
  progress?: ProgressRow;
  isAuthenticated: boolean;
}) {
  const startExperiment = useMutation(api.lab.startExperiment);
  const recordStep = useMutation(api.lab.recordStep);
  const resetExperiment = useMutation(api.lab.resetExperiment);

  const [choice, setChoice] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const done = progress?.stepsDone ?? [];
  const nextIndex = done.length;
  const finished = progress?.status === "completed";
  const step = experiment.steps[nextIndex];

  const submit = async () => {
    if (!isAuthenticated) {
      toast.error("برای ثبت مرحله ابتدا وارد حساب شوید.");
      return;
    }
    if (!step) return;
    if (step.check && choice === null) {
      toast.error("پاسخ این مرحله را انتخاب کن.");
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      if (done.length === 0) await startExperiment({ slug: experiment.slug });
      const result = (await recordStep({
        slug: experiment.slug,
        stepIndex: nextIndex,
        choice: choice ?? undefined,
      })) as {
        ok: boolean;
        correct: boolean;
        expected: number | null;
        earned?: number;
        finished?: boolean;
      };

      if (!result.correct) {
        setFeedback({
          ok: false,
          message: `پاسخ درست نبود. گزینه صحیح: ${faNum((result.expected ?? 0) + 1)} — دوباره تلاش کن.`,
        });
        setChoice(null);
      } else {
        setFeedback({
          ok: true,
          message: result.finished
            ? `آزمایش کامل شد! ${faNum(result.earned ?? 0)} امتیاز گرفتی 🎉`
            : `مرحله ثبت شد (+${faNum(result.earned ?? 0)} امتیاز)`,
        });
        setChoice(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در ثبت مرحله");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-violet-500/30">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold">{experiment.title}</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              تجهیزات: {experiment.equipment.join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full text-[10px]">
              {faNum(done.length)} از {faNum(experiment.stepCount)} مرحله
            </Badge>
            {done.length > 0 && isAuthenticated ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await resetExperiment({ slug: experiment.slug });
                  setFeedback(null);
                  setChoice(null);
                }}
              >
                <RotateCcw className="mr-1 size-3.5" />
                شروع از اول
              </Button>
            ) : null}
          </div>
        </div>

        <Progress value={(done.length / experiment.stepCount) * 100} className="h-1.5" />

        {/* Completed steps */}
        <ol className="space-y-2">
          {experiment.steps.map((item, index) => {
            const isDone = done.includes(index);
            const isCurrent = index === nextIndex && !finished;
            return (
              <li
                key={item.title}
                className={cn(
                  "rounded-2xl border px-4 py-3",
                  isDone
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : isCurrent
                      ? "border-violet-500/50 bg-violet-500/5"
                      : "border-border opacity-70",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      isDone
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                          ? "bg-violet-500 text-white"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isDone ? "✓" : faNum(index + 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold">{item.title}</p>
                    <p className="mt-1 text-[11px] leading-6 text-muted-foreground">{item.detail}</p>

                    {isCurrent && item.check ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                          {item.check.question}
                        </p>
                        {item.check.options.map((option, optionIndex) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setChoice(optionIndex)}
                            className={cn(
                              "flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-right text-[11px] leading-5 transition-colors",
                              choice === optionIndex
                                ? "border-violet-500 bg-violet-500/10"
                                : "hover:bg-muted/50",
                            )}
                          >
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold">
                              {faNum(optionIndex + 1)}
                            </span>
                            <span className="flex-1">{option}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {isCurrent ? (
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={busy}
                          className="bg-violet-600 hover:bg-violet-700"
                          onClick={submit}
                        >
                          {busy ? "در حال ثبت…" : "ثبت مرحله"}
                        </Button>
                        {!isAuthenticated ? (
                          <span className="text-[11px] text-muted-foreground">
                            برای ثبت، ابتدا وارد حساب شو.
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {finished ? (
          <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300">
            این پروتکل را با موفقیت به پایان رساندی — {faNum(progress?.score ?? 0)} امتیاز ثبت شده است.
          </div>
        ) : null}

        {feedback ? (
          <div
            className={cn(
              "rounded-2xl px-4 py-3 text-xs",
              feedback.ok
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
            )}
          >
            {feedback.message}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ── Notebook ────────────────────────────────────────────────────────────────

function Notebook({
  isAuthenticated,
  experiments,
}: {
  isAuthenticated: boolean;
  experiments: Experiment[];
}) {
  const notes = useQuery(api.lab.myNotes, isAuthenticated ? {} : "skip");
  const addNote = useMutation(api.lab.addNote);
  const deleteNote = useMutation(api.lab.deleteNote);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isAuthenticated) {
    return (
      <Card className="border-violet-500/30 bg-violet-500/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span>دفتر آزمایشگاه به حساب شما متصل است؛ برای استفاده وارد شو.</span>
          <Button asChild size="sm" className="bg-violet-600 hover:bg-violet-700">
            <Link to="/auth?returnTo=/lab">ورود به حساب</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardContent className="space-y-3 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <NotebookPen className="size-4 text-violet-500" />
            یادداشت جدید
          </h3>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="عنوان آزمایش یا مشاهدات"
          />
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={5}
            placeholder="نتیجه، اعداد، مشاهدات میکروسکوپی…"
          />
          <Input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="برچسب‌ها با کاما (گرم، رقت، PCR)"
          />
          <select
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className="w-full rounded-xl border bg-background px-3 py-2 text-xs"
          >
            <option value="">مربوط به کدام آزمایش؟ (اختیاری)</option>
            {experiments.map((experiment) => (
              <option key={experiment.slug} value={experiment.slug}>
                {experiment.title}
              </option>
            ))}
          </select>
          <Button
            className="w-full bg-violet-600 hover:bg-violet-700"
            disabled={busy || title.trim().length < 2 || body.trim().length < 2}
            onClick={async () => {
              setBusy(true);
              try {
                await addNote({
                  title,
                  body,
                  tags: tags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                  experimentSlug: slug || undefined,
                });
                setTitle("");
                setBody("");
                setTags("");
                setSlug("");
                toast.success("یادداشت ثبت شد");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "خطا در ثبت یادداشت");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "در حال ثبت…" : "ثبت در دفتر"}
          </Button>
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Sparkles className="size-3" />
            یادداشت‌ها فقط برای خودت قابل مشاهده است.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <ClipboardList className="size-4 text-violet-500" />
          یادداشت‌های من ({faNum(notes?.length ?? 0)})
        </h3>
        {notes === undefined ? (
          <p className="text-xs text-muted-foreground">در حال بارگذاری…</p>
        ) : notes.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-xs text-muted-foreground">
              هنوز یادداشتی ثبت نکرده‌ای. بعد از هر آزمایش مشاهداتت را همین‌جا بنویس.
            </CardContent>
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note._id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold">{note.title}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatDate(note.createdAt)}
                      {note.experimentSlug
                        ? ` · ${
                            experiments.find((item) => item.slug === note.experimentSlug)?.title ??
                            note.experimentSlug
                          }`
                        : ""}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={async () => {
                      await deleteNote({ id: note._id });
                      toast.success("یادداشت حذف شد");
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[11px] leading-6 text-muted-foreground">
                  {note.body}
                </p>
                {note.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {note.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="rounded-full text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
