/**
 * Genova Virtual Lab — fly experiments (Phase C)
 * ─────────────────────────────────────────────────────────────────────────────
 * The experiment builder and the experiment workspace, both scoped to one fly.
 *
 * What this feature is:
 *   • a student-authored protocol — objective, condition, stimulus, duration;
 *   • an optional *neural target* that must be a real Virtual Fly Brain entity,
 *     picked with the same live search used everywhere else in the lab;
 *   • a workspace where the stimulus from the experiment drives the fly viewer,
 *     so the student can watch a **simulated** response under a chosen condition.
 *
 * What it is not: it does not produce experimental results. The viewer output
 * stays labelled SIMULATION, and no observation/result row is written yet — that
 * is Phase D. The provenance chips below each value keep the three data kinds
 * apart (REAL DATA / GENOVA METADATA / SIMULATION).
 */
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FlaskConical,
  Loader2,
  Play,
  Radar,
  Save,
  Trash2,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { faNum, formatJalaliDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { STIMULUS_LABEL, type StimulusKind } from "@/services/behavior/engine";
import { VFB_SOURCE } from "@/services/vfb/types";
import { DataKindBadge } from "./dataKind";
import FlyObservations from "./FlyObservations";
import { FlyViewer } from "./FlyViewer";
import type { FlyRow } from "./types";
import { VfbAnchorPicker, type VfbAnchor } from "./VfbAnchorPicker";

// ── Types ───────────────────────────────────────────────────────────────────

type ExperimentStatus = "draft" | "in_progress" | "completed";

interface ExperimentTarget {
  vfbId: string;
  label: string;
  entityType?: string;
  source: string;
  accessedAt: number;
}

interface ExperimentRow {
  _id: string;
  flyId: string;
  name: string;
  objective?: string;
  condition?: string;
  stimulusKind: StimulusKind;
  stimulusIntensity: number;
  target?: ExperimentTarget;
  durationMin: number;
  params?: string;
  status: ExperimentStatus;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

const STATUS_LABEL: Record<ExperimentStatus, string> = {
  draft: "پیش‌نویس",
  in_progress: "در حال اجرا",
  completed: "تکمیل‌شده",
};

const STATUS_CHIP: Record<ExperimentStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  in_progress: "bg-sky-100 text-sky-800",
  completed: "bg-emerald-100 text-emerald-800",
};

const FRAME =
  "rounded-2xl border border-emerald-900/5 bg-white shadow-[0_1px_2px_rgba(6,78,59,0.04),0_12px_28px_-20px_rgba(6,78,59,0.25)]";

// ── Builder form ────────────────────────────────────────────────────────────

function ExperimentBuilder({
  fly,
  busy,
  create,
}: {
  fly: FlyRow;
  busy: boolean;
  create: (args: Record<string, unknown>) => Promise<string>;
}) {
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [condition, setCondition] = useState("");
  const [stimulusKind, setStimulusKind] = useState<StimulusKind>("none");
  const [intensity, setIntensity] = useState(0.5);
  const [duration, setDuration] = useState("5");
  const [target, setTarget] = useState<VfbAnchor | null>(null);

  const submit = useCallback(async () => {
    if (!name.trim()) {
      toast.error("نام آزمایش لازم است.");
      return;
    }
    const durationMin = Number.parseInt(duration, 10);
    if (!Number.isFinite(durationMin) || durationMin <= 0) {
      toast.error("مدت آزمایش باید یک عدد مثبت باشد.");
      return;
    }
    await create({
      flyId: fly._id,
      name: name.trim(),
      objective,
      condition,
      stimulusKind,
      stimulusIntensity: intensity,
      durationMin,
      ...(target ? { target: { vfbId: target.vfbId, label: target.label, ...(target.entityType ? { entityType: target.entityType } : {}) } } : {}),
    });
    setName("");
    setObjective("");
    setCondition("");
    setTarget(null);
  }, [name, objective, condition, stimulusKind, intensity, duration, target, create, fly._id]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-600">نام آزمایش</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: پاسخ به نور در مسیر بینایی"
            className="h-9 text-[12px]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-600">مدت (دقیقه)</span>
          <Input
            type="number"
            min={1}
            max={600}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="h-9 text-[12px]"
          />
        </label>
        <div className="sm:col-span-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-slate-600">هدف آزمایش</span>
            <Textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="مثال: بررسی تغییر مسیر حرکتی پس از محرک نوری"
              className="min-h-[64px] text-[12px]"
            />
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-slate-600">شرایط</span>
            <Textarea
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="مثال: دمای اتاق، نور محیط، زمان ثبت…"
              className="min-h-[56px] text-[12px]"
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-900/5 bg-slate-50 px-3 py-3">
        <p className="mb-2 text-[11px] font-bold text-slate-700">محرک آزمایش</p>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(STIMULUS_LABEL) as StimulusKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setStimulusKind(k)}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                stimulusKind === k
                  ? "bg-emerald-700 text-white"
                  : "bg-white text-slate-600 ring-1 ring-emerald-900/10 hover:bg-emerald-50",
              )}
            >
              {STIMULUS_LABEL[k]}
            </button>
          ))}
        </div>
        <label className="mt-2.5 flex items-center gap-2">
          <span className="text-[10.5px] text-slate-500">شدت</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="h-1.5 flex-1 accent-emerald-700"
            aria-label="شدت محرک آزمایش"
          />
          <span dir="ltr" className="w-9 text-left font-mono text-[10.5px] text-slate-600">
            {intensity.toFixed(2)}
          </span>
        </label>
      </div>

      <VfbAnchorPicker idPrefix="new-exp" value={target} onChange={setTarget} />

      <Button
        type="button"
        size="sm"
        disabled={busy}
        onClick={submit}
        className="h-9 gap-1.5 rounded-xl bg-emerald-700 px-4 text-[12px] text-white hover:bg-emerald-800"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ClipboardList className="size-3.5" />}
        ساخت آزمایش
      </Button>
    </div>
  );
}

// ── Workspace ───────────────────────────────────────────────────────────────

interface WorkspaceProps {
  fly: FlyRow;
  experiment: ExperimentRow;
  busy: boolean;
  onUpdate: (args: Record<string, unknown>) => Promise<void>;
  onDelete: () => Promise<void>;
  onOpenBrain: (term: { id: string; label: string }) => void;
}

function ExperimentWorkspace({
  fly,
  experiment,
  busy,
  onUpdate,
  onDelete,
  onOpenBrain,
}: WorkspaceProps) {
  const [objective, setObjective] = useState(experiment.objective ?? "");
  const [condition, setCondition] = useState(experiment.condition ?? "");
  const [duration, setDuration] = useState(String(experiment.durationMin));
  const [showSimulation, setShowSimulation] = useState(false);

  // Adopt external changes (autosave / another tab) without clobbering typing.
  const signature = `${experiment.updatedAt}:${experiment.name}`;
  const [lastSignature, setLastSignature] = useState(signature);
  if (signature !== lastSignature) {
    setLastSignature(signature);
    setObjective(experiment.objective ?? "");
    setCondition(experiment.condition ?? "");
    setDuration(String(experiment.durationMin));
  }

  const target: VfbAnchor | null = experiment.target
    ? {
        vfbId: experiment.target.vfbId,
        label: experiment.target.label,
        ...(experiment.target.entityType ? { entityType: experiment.target.entityType } : {}),
      }
    : null;

  const saveFields = useCallback(async () => {
    const durationMin = Number.parseInt(duration, 10);
    await onUpdate({
      objective,
      condition,
      durationMin: Number.isFinite(durationMin) && durationMin > 0 ? durationMin : experiment.durationMin,
    });
  }, [objective, condition, duration, experiment.durationMin, onUpdate]);

  const sections = useMemo(
    () =>
      [
        { id: "brain", label: "مغز", icon: Brain },
        { id: "stimulus", label: "محرک", icon: FlaskConical },
        { id: "data", label: "داده", icon: Radar },
        { id: "result", label: "نتیجه", icon: BarChart3 },
      ] as const,
    [],
  );

  return (
    <div className={cn(FRAME, "overflow-hidden")}>
      <header className="border-b border-emerald-900/5 bg-gradient-to-l from-emerald-50/80 to-white px-4 py-3.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold text-emerald-700">
              <ClipboardList className="size-3.5" />
              Experiment Workspace · {fly.genovaFlyId}
            </p>
            <h3 className="mt-0.5 truncate text-[15px] font-extrabold text-slate-900">{experiment.name}</h3>
            <p className="mt-0.5 text-[10.5px] text-slate-500">
              ساخته‌شده {formatJalaliDate(experiment.createdAt)} · آخرین تغییر{" "}
              {formatJalaliDate(experiment.updatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_CHIP[experiment.status])}>
              {STATUS_LABEL[experiment.status]}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                onUpdate({ status: experiment.status === "completed" ? "in_progress" : "completed" })
              }
              className="h-8 gap-1 rounded-lg border-emerald-900/10 bg-white text-[11px] text-slate-700 hover:border-emerald-300"
            >
              <CheckCircle2 className="size-3.5" />
              {experiment.status === "completed" ? "بازگشت به جریان" : "تکمیل آزمایش"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={onDelete}
              className="h-8 gap-1 rounded-lg border-rose-200 bg-white text-[11px] text-rose-600 hover:border-rose-300"
            >
              <Trash2 className="size-3.5" />
              حذف
            </Button>
          </div>
        </div>
      </header>

      <div className="space-y-4 p-4">
        {/* Definition */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11.5px] font-bold text-slate-700">تعریف آزمایش</p>
            <DataKindBadge kind="metadata" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10.5px] text-slate-500">هدف</span>
              <Textarea
                value={objective}
                onBlur={saveFields}
                onChange={(e) => setObjective(e.target.value)}
                className="min-h-[60px] text-[12px]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] text-slate-500">شرایط</span>
              <Textarea
                value={condition}
                onBlur={saveFields}
                onChange={(e) => setCondition(e.target.value)}
                className="min-h-[60px] text-[12px]"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block w-28">
              <span className="mb-1 block text-[10.5px] text-slate-500">مدت (دقیقه)</span>
              <Input
                type="number"
                min={1}
                max={600}
                value={duration}
                onBlur={saveFields}
                onChange={(e) => setDuration(e.target.value)}
                className="h-9 text-[12px]"
              />
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={saveFields}
              className="h-9 gap-1.5 rounded-xl border-emerald-900/10 bg-white text-[11.5px] text-slate-700 hover:border-emerald-300"
            >
              <Save className="size-3.5" />
              ذخیره
            </Button>
            <span className="text-[10px] text-slate-400">ذخیرهٔ خودکار هنگام خروج از هر فیلد</span>
          </div>
        </section>

        {/* Neural target — must be a real VFB entity */}
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11.5px] font-bold text-slate-700">هدف عصبی</p>
            <DataKindBadge kind="real" />
          </div>
          <VfbAnchorPicker
            idPrefix={`exp-${experiment._id}`}
            value={target}
            onChange={(anchor) =>
              onUpdate({
                target: anchor
                  ? {
                      vfbId: anchor.vfbId,
                      label: anchor.label,
                      ...(anchor.entityType ? { entityType: anchor.entityType } : {}),
                    }
                  : undefined,
              })
            }
          />
          {experiment.target && (
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenBrain({ id: experiment.target!.vfbId, label: experiment.target!.label })}
              className="mt-2 h-8 gap-1 rounded-lg bg-emerald-700 px-2.5 text-[11px] text-white hover:bg-emerald-800"
            >
              <Brain className="size-3.5" />
              باز کردن هدف عصبی در اکسپلورر
            </Button>
          )}
          <p className="mt-1.5 text-[10px] leading-5 text-slate-500">
            بدون هدف عصبی، آزمایش هنوز اجرا می‌شود اما هیچ دادهٔ اعصابی به آن نسبت داده نمی‌شود. منبع همیشه{" "}
            <span dir="ltr">{VFB_SOURCE.name}</span> است.
          </p>
        </section>

        {/* Workspace steps */}
        <section>
          <p className="mb-2 text-[11.5px] font-bold text-slate-700">گام‌های فضای کار</p>
          <div className="grid gap-1.5 sm:grid-cols-4">
            {sections.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-center gap-2 rounded-xl bg-emerald-50/70 px-3 py-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-emerald-700 text-[10px] font-bold text-white">
                    {faNum(i + 1)}
                  </span>
                  <Icon className="size-3.5 text-emerald-600" />
                  <span className="text-[11px] font-semibold text-emerald-800">{s.label}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10.5px] text-slate-500">
            گام «داده» فقط چیزی را نشان می‌دهد که واقعاً از{" "}
            <span dir="ltr">{VFB_SOURCE.name}</span> خوانده شده باشد. بدون خوانش، جدول نتایج خالی می‌ماند.
          </p>
        </section>

        {/* Behaviour under this experiment's stimulus.
            Kept collapsed by default: the results panel is built from real VFB
            readouts, and an open simulation next to it invites the student to
            read model output as if it were measured. */}
        <section className="border-t border-emerald-900/5 pt-4">
          <button
            type="button"
            onClick={() => setShowSimulation((v) => !v)}
            aria-expanded={showSimulation}
            className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-right transition-colors hover:bg-slate-100"
          >
            <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-700">
              <Play className="size-3.5 text-amber-500" />
              شبیه‌سازی رفتار (خارج از نتایج)
            </span>
            <ChevronDown
              className={cn("size-4 text-slate-400 transition-transform", showSimulation && "rotate-180")}
            />
          </button>
          {showSimulation ? (
            <div className="mt-3">
              <FlyViewer
                fly={fly}
                locked
                stimulus={{ kind: experiment.stimulusKind, intensity: experiment.stimulusIntensity }}
              />
            </div>
          ) : (
            <p className="mt-2 px-1 text-[10.5px] leading-5 text-slate-500">
              این بخش فقط یک مدل محاسباتی است و در جدول نتایج بالا حساب نمی‌شود. برای دیدنش بازش
              کنید.
            </p>
          )}
        </section>

        {/* Observations + results — the real-data half of the workspace. */}
        <FlyObservations
          fly={fly}
          experimentId={experiment._id}
          target={target}
          onOpenBrain={onOpenBrain}
        />
      </div>
    </div>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────────

export function FlyExperiments({ fly, onOpenBrain }: { fly: FlyRow; onOpenBrain: (term: { id: string; label: string }) => void }) {
  const experiments = useQuery(api.flyExperiments.listMyExperiments, {
    flyId: fly._id as Id<"virtualFlies">,
  });
  const createMut = useMutation(api.flyExperiments.createExperiment);
  const updateMut = useMutation(api.flyExperiments.updateExperiment);
  const deleteMut = useMutation(api.flyExperiments.deleteExperiment);

  const [mode, setMode] = useState<"idle" | "create">("idle");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rows: ExperimentRow[] = useMemo(
    () => (experiments ?? []) as unknown as ExperimentRow[],
    [experiments],
  );
  const open = rows.find((r) => r._id === openId) ?? null;

  const run = useCallback(async <T,>(fn: () => Promise<T>, ok?: string): Promise<T | undefined> => {
    setBusy(true);
    try {
      const result = await fn();
      if (ok) toast.success(ok);
      return result;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیرهٔ آزمایش ناموفق بود");
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);

  const handleCreate = useCallback(
    async (args: Record<string, unknown>) => {
      const id = await run(() => createMut(args as never), "آزمایش ساخته شد");
      if (id) {
        setMode("idle");
        setOpenId(id);
      }
      return id ?? "";
    },
    [createMut, run],
  );

  const handleUpdate = useCallback(
    async (args: Record<string, unknown>) => {
      if (!open) return;
      const payload = { id: open._id, ...args } as never;
      await run(() => updateMut(payload), "آزمایش به‌روزرسانی شد");
    },
    [open, updateMut, run],
  );

  const handleDelete = useCallback(async () => {
    if (!open) return;
    const ok = await run(() => deleteMut({ id: open._id as never }), "آزمایش حذف شد");
    if (ok) setOpenId(null);
  }, [open, deleteMut, run]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-700">
          <ClipboardList className="size-3.5 text-emerald-600" />
          آزمایش‌های این مگس
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => setMode(mode === "create" ? "idle" : "create")}
          className="h-8 gap-1.5 rounded-lg bg-emerald-700 px-2.5 text-[11px] text-white hover:bg-emerald-800"
        >
          {mode === "create" ? "بستن" : "آزمایش جدید"}
        </Button>
      </div>

      {mode === "create" && (
        <div className={cn(FRAME, "p-3.5")}>
          <ExperimentBuilder fly={fly} busy={busy} create={handleCreate} />
        </div>
      )}

      {experiments === undefined && (
        <p className="flex items-center justify-center gap-2 py-6 text-[11.5px] text-slate-500">
          <Loader2 className="size-3.5 animate-spin text-emerald-600" />
          در حال بارگذاری آزمایش‌ها…
        </p>
      )}

      {experiments !== undefined && rows.length === 0 && mode !== "create" && (
        <p className="rounded-xl border border-dashed border-emerald-900/10 bg-emerald-50/40 px-3 py-6 text-center text-[11.5px] text-slate-500">
          هنوز آزمایشی برای این مگس تعریف نشده است. یک آزمایش بسازید تا فضای کار آن باز شود.
        </p>
      )}

      {rows.length > 0 && (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row._id}>
              <button
                type="button"
                onClick={() => setOpenId(row._id === openId ? null : row._id)}
                className={cn(
                  "w-full rounded-xl border px-3 py-2.5 text-right transition-colors",
                  row._id === openId
                    ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200"
                    : "border-emerald-900/5 bg-white hover:border-emerald-200 hover:bg-emerald-50/40",
                )}
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="truncate text-[12px] font-bold text-slate-800">{row.name}</span>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_CHIP[row.status])}>
                    {STATUS_LABEL[row.status]}
                  </span>
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9.5px] text-slate-600">
                    محرک: {STIMULUS_LABEL[row.stimulusKind]} · {row.stimulusIntensity.toFixed(2)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9.5px] text-slate-600">
                    {faNum(row.durationMin)} دقیقه
                  </span>
                  {row.target && (
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9.5px] text-emerald-700">
                      هدف: {row.target.label}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <ExperimentWorkspace
          fly={fly}
          experiment={open}
          busy={busy}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onOpenBrain={onOpenBrain}
        />
      )}
    </div>
  );
}

export default FlyExperiments;
