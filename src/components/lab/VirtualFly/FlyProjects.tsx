/**
 * Genova Virtual Lab — research projects (Phase E)
 * ─────────────────────────────────────────────────────────────────────────────
 * A project is the student's own framing: one fly, one question, one hypothesis,
 * and several experiments underneath. This panel shows what exists and refuses
 * to imply what it means.
 *
 * What it deliberately does NOT do:
 *   • compute a p-value, a correlation, or "significant improvement";
 *   • mix simulation telemetry into the evidence;
 *   • present the hypothesis as if the data had confirmed it.
 *
 * With a handful of student observations any such statistic would look
 * rigorous and mean nothing, so the summary below is **counts plus the
 * measurement keys that were actually read from the Virtual Fly Brain**. Every
 * number on screen can be traced back to a stored VFB response.
 */
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ChevronDown,
  FlaskConical,
  Loader2,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { faNum, formatJalaliDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { VFB_SOURCE } from "@/services/vfb/types";
import { DataKindBadge } from "./dataKind";
import type { FlyRow } from "./types";

const FRAME =
  "rounded-2xl border border-emerald-900/5 bg-white shadow-[0_1px_2px_rgba(6,78,59,0.04),0_12px_28px_-20px_rgba(6,78,59,0.25)]";

type ProjectStatus = "draft" | "active" | "completed";

interface ProjectRow {
  _id: string;
  title: string;
  question: string;
  hypothesis: string;
  status: ProjectStatus;
  createdAt: number;
  updatedAt: number;
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: "پیش‌نویس",
  active: "در جریان",
  completed: "تمام‌شده",
};

const STATUS_CHIP: Record<ProjectStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-sky-100 text-sky-800",
  completed: "bg-emerald-100 text-emerald-800",
};

interface Summary {
  experiments: number;
  completedExperiments: number;
  observations: number;
  observationsWithRealData: number;
  measurementKeys: string[];
  sources: string[];
}

const EMPTY: Summary = {
  experiments: 0,
  completedExperiments: 0,
  observations: 0,
  observationsWithRealData: 0,
  measurementKeys: [],
  sources: [],
};

export default function FlyProjects({ fly }: { fly: FlyRow }) {
  const projects = useQuery(api.flyProjects.listMyProjects, {
    flyId: fly._id as Id<"virtualFlies">,
  });
  const createMut = useMutation(api.flyProjects.createProject);
  const deleteMut = useMutation(api.flyProjects.deleteProject);

  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [hypothesis, setHypothesis] = useState("");

  const rows: ProjectRow[] = useMemo(
    () => (projects ?? []) as unknown as ProjectRow[],
    [projects],
  );

  const run = useCallback(async <T,>(fn: () => Promise<T>, ok?: string): Promise<T | undefined> => {
    setBusy(true);
    try {
      const value = await fn();
      if (ok) toast.success(ok);
      return value;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیرهٔ پروژه ناموفق بود");
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);

  const submit = useCallback(async () => {
    if (!title.trim() || !question.trim() || !hypothesis.trim()) {
      toast.error("عنوان، پرسش و فرضیه هر سه لازم‌اند.");
      return;
    }
    const id = await run(
      () =>
        createMut({
          flyId: fly._id as Id<"virtualFlies">,
          title: title.trim(),
          question: question.trim(),
          hypothesis: hypothesis.trim(),
        }),
      "پروژهٔ پژوهش ساخته شد",
    );
    if (id) {
      setTitle("");
      setQuestion("");
      setHypothesis("");
      setCreating(false);
      setOpenId(id);
    }
  }, [title, question, hypothesis, createMut, fly._id, run]);

  return (
    <div className={cn(FRAME, "space-y-3 p-4")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-700">
          <Target className="size-3.5 text-emerald-600" />
          پروژهٔ پژوهش این مگس
        </p>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => setCreating((v) => !v)}
          className="h-8 gap-1.5 rounded-lg bg-emerald-700 px-2.5 text-[11px] text-white hover:bg-emerald-800"
        >
          {creating ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          {creating ? "بستن" : "پروژهٔ جدید"}
        </Button>
      </div>

      {creating && (
        <div className="space-y-2 rounded-xl bg-slate-50 p-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان کوتاه پروژه"
            className="h-9 text-[12px]"
          />
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="پرسش پژوهش: دقیقاً می‌خواهید بدانید چه چیزی؟"
            className="min-h-[64px] text-[12px]"
          />
          <Textarea
            value={hypothesis}
            onChange={(e) => setHypothesis(e.target.value)}
            placeholder="فرضیه: حدس شما چیست؟ (این پیش‌بینی است، نه نتیجه)"
            className="min-h-[64px] text-[12px]"
          />
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={submit}
            className="h-9 gap-1.5 rounded-xl bg-emerald-700 px-3 text-[12px] text-white hover:bg-emerald-800"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FlaskConical className="size-3.5" />}
            ساخت پروژه
          </Button>
        </div>
      )}

      {projects === undefined && (
        <p className="flex items-center justify-center gap-2 py-5 text-[11.5px] text-slate-500">
          <Loader2 className="size-3.5 animate-spin text-emerald-600" />
          در حال بارگذاری…
        </p>
      )}

      {projects !== undefined && rows.length === 0 && !creating && (
        <p className="rounded-xl border border-dashed border-emerald-900/10 bg-emerald-50/40 px-3 py-5 text-center text-[11.5px] leading-6 text-slate-500">
          هنوز پروژه‌ای نساخته‌اید. یک پرسش و یک فرضیه بنویسید، بعد آزمایش‌ها را به آن وصل کنید.
        </p>
      )}

      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li key={row._id}>
            <button
              type="button"
              onClick={() => setOpenId(row._id === openId ? null : row._id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-right transition-colors",
                row._id === openId
                  ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200"
                  : "border-emerald-900/5 bg-white hover:border-emerald-200 hover:bg-emerald-50/40",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <FlaskConical className="size-3.5 shrink-0 text-emerald-600" />
                <span className="truncate text-[12px] font-bold text-slate-800">{row.title}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    STATUS_CHIP[row.status],
                  )}
                >
                  {STATUS_LABEL[row.status]}
                </span>
                <ChevronDown
                  className={cn("size-3.5 text-slate-400 transition-transform", row._id === openId && "rotate-180")}
                />
              </span>
            </button>
            {row._id === openId && <ProjectView fly={fly} project={row} onDelete={deleteMut} busy={busy} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Open project ────────────────────────────────────────────────────────────

function ProjectView({
  fly,
  project,
  onDelete,
  busy,
}: {
  fly: FlyRow;
  project: ProjectRow;
  onDelete: ReturnType<typeof useMutation<typeof api.flyProjects.deleteProject>>;
  busy: boolean;
}) {
  const summary = useQuery(api.flyProjects.projectSummary, {
    projectId: project._id as Id<"flyProjects">,
  });
  const experiments = useQuery(api.flyExperiments.listMyExperiments, {
    flyId: fly._id as Id<"virtualFlies">,
  });
  const updateMut = useMutation(api.flyProjects.updateProject);

  const s: Summary = (summary as unknown as Summary | undefined) ?? EMPTY;
  const members: { _id: string; name: string; status: string }[] = useMemo(
    () =>
      (((experiments ?? []) as unknown[]) as { _id: string; name: string; status: string; projectId?: string }[])
        .filter((e) => e.projectId === project._id),
    [experiments, project._id],
  );

  return (
    <div className="mt-2 space-y-3 rounded-xl border border-emerald-900/5 bg-slate-50 p-3">
      {/* Question */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10.5px] font-bold text-slate-600">پرسش پژوهش</p>
          <DataKindBadge kind="hypothesis" />
        </div>
        <p className="rounded-lg bg-white px-2.5 py-2 text-[12px] leading-6 text-slate-700 ring-1 ring-emerald-900/5">
          {project.question}
        </p>
      </section>

      {/* Hypothesis */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10.5px] font-bold text-slate-600">فرضیهٔ شما</p>
          <DataKindBadge kind="hypothesis" />
        </div>
        <p className="rounded-lg bg-fuchsia-50 px-2.5 py-2 text-[12px] leading-6 text-fuchsia-800 ring-1 ring-fuchsia-100">
          {project.hypothesis}
        </p>
        <p className="text-[10px] leading-5 text-slate-500">
          فرضیه یک پیش‌بینی است. تا وقتی داده‌ای برای مقایسه نداشته باشید، هیچ‌جای سایت آن را تأییدشده
          نشان نمی‌دهد.
        </p>
      </section>

      {/* Experiments in this project */}
      <section className="space-y-1.5">
        <p className="text-[10.5px] font-bold text-slate-600">آزمایش‌های این پروژه</p>
        {members.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            هنوز آزمایشی به این پروژه وصل نشده. در فضای کار هر آزمایش، فیلد «پروژهٔ پژوهش» را انتخاب
            کنید.
          </p>
        ) : (
          <ul className="space-y-1">
            {members.map((m) => (
              <li
                key={m._id}
                className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-emerald-900/5"
              >
                <span className="min-w-0 truncate text-[11.5px] text-slate-700">{m.name}</span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[9.5px] text-slate-600">
                  {m.status === "completed" ? "تکمیل‌شده" : "در جریان"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* What the data actually contains — counts and keys, no statistics. */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10.5px] font-bold text-slate-600">خلاصهٔ دادهٔ واقعی پروژه</p>
          <DataKindBadge kind="real" />
        </div>
        <dl className="grid grid-cols-2 gap-1.5">
          {[
            { label: "آزمایش", value: s.experiments },
            { label: "آزمایش تکمیل‌شده", value: s.completedExperiments },
            { label: "مشاهده", value: s.observations },
            { label: "مشاهده با دادهٔ واقعی", value: s.observationsWithRealData },
          ].map((row) => (
            <div key={row.label} className="rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-emerald-900/5">
              <dt className="text-[10px] text-slate-500">{row.label}</dt>
              <dd className="mt-0.5 font-mono text-[12px] font-bold text-slate-800">
                {faNum(row.value)}
              </dd>
            </div>
          ))}
        </dl>
        {s.measurementKeys.length > 0 && (
          <p className="flex flex-wrap gap-1">
            {s.measurementKeys.map((k) => (
              <span
                key={k}
                dir="ltr"
                className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[9.5px] text-emerald-700 ring-1 ring-emerald-200"
              >
                {k}
              </span>
            ))}
          </p>
        )}
        {s.sources.length > 0 && (
          <p className="text-[10px] text-slate-500">
            منبع: <span dir="ltr">{s.sources.join("، ")}</span>
          </p>
        )}
        {s.observationsWithRealData === 0 && (
          <p className="text-[10.5px] text-slate-500">
            تا وقتی خوانش واقعی ثبت نشود، این پروژه هیچ داده‌ای ندارد — فقط یک پرسش و یک فرضیه.
          </p>
        )}
      </section>

      <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[10px] leading-5 text-amber-800 ring-1 ring-amber-100">
        <AlertTriangle className="mt-0.5 size-3 shrink-0" />
        این پروژه هیچ آزمون آماری‌ای انجام نمی‌دهد. ژنوا p-value، همبستگی یا «تفاوت معنادار» حساب
        نمی‌کند؛ با چند مشاهدهٔ دانشجویی چنین عددی فقط ظاهر علمی دارد و بی‌معناست. هر عددی که اینجا می‌بینید
        یا شمارش است یا عیناً از <span dir="ltr">{VFB_SOURCE.name}</span> آمده است.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() =>
            updateMut({ id: project._id as Id<"flyProjects">, status: "completed" }).then(
              () => toast.success("پروژه بسته شد"),
              (e: unknown) => toast.error(e instanceof Error ? e.message : "خطا"),
            )
          }
          className="h-8 rounded-lg border-emerald-900/10 bg-white text-[11px] text-slate-700 hover:border-emerald-300"
        >
          بستن پروژه
        </Button>
        <span className="text-[10px] text-slate-400">
          ساخته‌شده {formatJalaliDate(project.createdAt)}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          disabled={busy}
          aria-label="حذف پروژه"
          onClick={() =>
            onDelete({ id: project._id as Id<"flyProjects"> }).then(
              () => toast.success("پروژه حذف شد"),
              (e: unknown) => toast.error(e instanceof Error ? e.message : "خطا"),
            )
          }
          className="cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}