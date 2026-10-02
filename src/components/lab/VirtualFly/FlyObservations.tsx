/**
 * Genova Virtual Lab — observations & results (Phase D)
 * ─────────────────────────────────────────────────────────────────────────────
 * This panel closes the loop opened in Phase C: it turns "an experiment was
 * defined" into "here is what was actually read, and here is what I make of
 * it".
 *
 * The one rule that shapes the whole file: **results are built from real data
 * only.** The simulated fly lives elsewhere in the workspace and none of its
 * telemetry is ever read here — mixing a heuristic model's numbers into a
 * results table is exactly the mistake this lab must not make. The panel shows
 * that separation explicitly.
 *
 * Two ways to record an observation:
 *   1. `vfb_readout` — press "خوانش زندهٔ VFB"; the browser calls the Virtual
 *      Fly Brain API for the experiment's neural target and the response is
 *      stored verbatim with the entity id, the source name and the moment it
 *      was read. Nothing is computed on the way in.
 *   2. `lab` — the student writes down something they observed themselves. No
 *      numbers are attached automatically.
 *
 * The written "result" line is a HYPOTHESIS, badged as such. Genova never
 * writes it for the student.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Bug, Database, Loader2, Radar, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { faNum, formatJalaliDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { runVfbReadout, type VfbReadout } from "@/services/vfb/labReadout";
import { isAbortError, vfbErrorMessage } from "@/services/vfb/client";
import { VFB_SOURCE } from "@/services/vfb/types";
import { DataKindBadge } from "./dataKind";
import type { FlyRow } from "./types";

// ── Local types ─────────────────────────────────────────────────────────────

const FRAME =
  "rounded-2xl border border-emerald-900/5 bg-white shadow-[0_1px_2px_rgba(6,78,59,0.04),0_12px_28px_-20px_rgba(6,78,59,0.25)]";

interface EvidenceMeasurement {
  key: string;
  label: string;
  value: number;
  unit?: string;
}

interface ObservationEvidence {
  entityId: string;
  entityLabel: string;
  source: string;
  accessedAt: number;
  found: boolean;
  measurements: EvidenceMeasurement[];
  datasets: string[];
  notes: string[];
}

interface ObservationRow {
  _id: string;
  experimentId: string;
  note?: string;
  evidence?: ObservationEvidence;
  method: "vfb_readout" | "lab" | "import";
  result?: string;
  createdAt: number;
}

const METHOD_LABEL: Record<ObservationRow["method"], string> = {
  vfb_readout: "خوانش VFB",
  lab: "مشاهدهٔ آزمایشگاه",
  import: "ورودی دستی",
};

/** Per-key summary across every stored observation of this experiment. */
interface KeySummary {
  key: string;
  label: string;
  unit?: string;
  count: number;
  first: number;
  last: number;
  min: number;
  max: number;
}

function summarise(observations: ObservationRow[]): KeySummary[] {
  const byKey = new Map<string, KeySummary>();
  for (const obs of observations) {
    const measurements = obs.evidence?.measurements ?? [];
    for (const m of measurements) {
      const current = byKey.get(m.key);
      if (!current) {
        byKey.set(m.key, {
          key: m.key,
          label: m.label,
          unit: m.unit,
          count: 1,
          first: m.value,
          last: m.value,
          min: m.value,
          max: m.value,
        });
        continue;
      }
      current.count += 1;
      current.last = m.value;
      current.min = Math.min(current.min, m.value);
      current.max = Math.max(current.max, m.value);
      if (!current.unit && m.unit) current.unit = m.unit;
    }
  }
  return [...byKey.values()];
}

function formatValue(value: number, unit?: string): string {
  const n = Number.isInteger(value) ? faNum(value) : faNum(value.toFixed(2));
  return unit ? `${n} ${unit}` : n;
}

// ── VFB readout preview ─────────────────────────────────────────────────────

function ReadoutPreview({ readout }: { readout: VfbReadout }) {
  return (
    <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-emerald-800">
          <Database className="size-3.5" />
          پیش‌نمایش خوانش — {readout.entityLabel}
        </p>
        <DataKindBadge kind="real" />
      </div>

      {!readout.found ? (
        <p className="rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-5 text-amber-800 ring-1 ring-amber-200">
          <AlertTriangle className="ml-1 inline size-3" />
          {readout.notes[0] ?? "VFB رکوردی برای این شناسه برنگرداند."}
        </p>
      ) : readout.measurements.length === 0 ? (
        <p className="text-[11px] text-slate-500">VFB هیچ عددی برای این ترم برنگرداند.</p>
      ) : (
        <dl className="grid gap-1.5 sm:grid-cols-2">
          {readout.measurements.map((m) => (
            <div key={m.key} className="flex items-baseline justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-emerald-900/10">
              <dt className="text-[10.5px] text-slate-600">{m.label}</dt>
              <dd dir="ltr" className="text-left font-mono text-[11.5px] font-bold text-emerald-800">
                {formatValue(m.value, m.unit)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="text-[10px] leading-5 text-slate-500">
        منبع: <span dir="ltr">{readout.source}</span> · شناسه:{" "}
        <span dir="ltr" className="font-mono">{readout.entityId}</span> · زمان خوانش:{" "}
        {formatJalaliDate(readout.accessedAt)}
      </p>
      {readout.datasets.length > 0 && (
        <p className="flex flex-wrap gap-1">
          {readout.datasets.map((d) => (
            <span key={d} dir="ltr" className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[9.5px] text-emerald-700 ring-1 ring-emerald-200">
              {d}
            </span>
          ))}
        </p>
      )}
      {readout.notes.length > 0 && (
        <ul className="space-y-0.5">
          {readout.notes.map((n) => (
            <li key={n} className="text-[10px] leading-5 text-slate-500">
              · {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Panel ───────────────────────────────────────────────────────────────────

interface Props {
  fly: FlyRow;
  experimentId: string;
  target: { vfbId: string; label: string } | null;
  onOpenBrain: (term: { id: string; label: string }) => void;
}

export default function FlyObservations({ fly, experimentId, target, onOpenBrain }: Props) {
  const observations = useQuery(api.flyObservations.listMyObservations, {
    experimentId: experimentId as Id<"flyExperiments">,
  });
  const createMut = useMutation(api.flyObservations.createObservation);
  const deleteMut = useMutation(api.flyObservations.deleteObservation);

  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [readout, setReadout] = useState<VfbReadout | null>(null);
  const [partner, setPartner] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const rows: ObservationRow[] = useMemo(
    () => (observations ?? []) as unknown as ObservationRow[],
    [observations],
  );
  const summaries = useMemo(() => summarise(rows), [rows]);
  const realCount = rows.filter((r) => (r.evidence?.measurements.length ?? 0) > 0).length;

  const run = useCallback(async <T,>(fn: () => Promise<T>, ok?: string): Promise<T | undefined> => {
    setBusy(true);
    try {
      const value = await fn();
      if (ok) toast.success(ok);
      return value;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیرهٔ مشاهده ناموفق بود");
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);

  const readLive = useCallback(async () => {
    if (!target) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setReading(true);
    try {
      const value = await runVfbReadout({
        id: target.vfbId,
        label: target.label,
        connectivityTo: partner.trim() || undefined,
        signal: controller.signal,
      });
      setReadout(value);
      if (!value.found) toast.warning("VFB رکوردی برای این ترم برنگرداند.");
    } catch (e) {
      if (isAbortError(e)) return;
      setReadout(null);
      toast.error(`خوانش VFB ناموفق بود: ${vfbErrorMessage(e)}`);
    } finally {
      setReading(false);
    }
  }, [target, partner]);

  const saveReadout = useCallback(async () => {
    if (!readout || readout.measurements.length === 0) {
      toast.error("این خوانش عددی ندارد؛ قابل ثبت به‌عنوان دادهٔ واقعی نیست.");
      return;
    }
    const id = await run(
      () =>
        createMut({
          experimentId: experimentId as Id<"flyExperiments">,
          method: "vfb_readout",
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(result.trim() ? { result: result.trim() } : {}),
          evidence: readout,
        }),
      "خوانش VFB به‌عنوان مشاهده ثبت شد",
    );
    if (id) {
      setReadout(null);
      setNote("");
      setResult("");
    }
  }, [readout, note, result, createMut, experimentId, run]);

  const saveLabNote = useCallback(async () => {
    if (!note.trim() && !result.trim()) {
      toast.error("یادداشت مشاهده یا نتیجه لازم است.");
      return;
    }
    const id = await run(
      () =>
        createMut({
          experimentId: experimentId as Id<"flyExperiments">,
          method: "lab",
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(result.trim() ? { result: result.trim() } : {}),
        }),
      "مشاهدهٔ آزمایشگاه ثبت شد",
    );
    if (id) {
      setNote("");
      setResult("");
    }
  }, [note, result, createMut, experimentId, run]);

  return (
    <div className={cn(FRAME, "space-y-3 p-4")}>
      <p className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-slate-500">
        <Bug className="size-3.5" />
        داده و نتیجهٔ <span dir="ltr" className="font-mono">{fly.genovaFlyId}</span> ·{" "}
        {fly.name}
      </p>

      {/* ── Data ── */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-700">
            <Radar className="size-3.5 text-emerald-600" />
            دادهٔ آزمایش
          </p>
          <DataKindBadge kind="real" />
        </div>

        {!target ? (
          <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 px-3 py-3 text-[11px] leading-6 text-amber-800">
            این آزمایش هدف عصبی ندارد، پس هیچ دادهٔ واقعی نمی‌توان برایش خواند. یک نهاد واقعی از{" "}
            <span dir="ltr">{VFB_SOURCE.name}</span> انتخاب کنید تا خوانش زنده فعال شود. ژنوا بدون
            منبع، عدد تولید نمی‌کند.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-2">
              <Button
                type="button"
                size="sm"
                disabled={reading || busy}
                onClick={readLive}
                className="h-9 gap-1.5 rounded-xl bg-emerald-700 px-3 text-[12px] text-white hover:bg-emerald-800"
              >
                {reading ? <Loader2 className="size-3.5 animate-spin" /> : <Radar className="size-3.5" />}
                خوانش زندهٔ VFB
              </Button><label className="min-w-[180px] flex-1">
                  <span className="mb-1 block text-[10px] text-slate-500">
                    نوع نورون مقصد برای اتصال‌پذیری (اختیاری)
                  </span>
                  <Input
                    value={partner}
                    onChange={(e) => setPartner(e.target.value)}
                    placeholder="مثلاً LPLC2 یا FBbt_00003788"
                    className="h-9 text-[12px]"
                  />
                </label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onOpenBrain({ id: target.vfbId, label: target.label })}
                className="h-9 rounded-xl border-emerald-900/10 bg-white text-[11.5px] text-slate-700 hover:border-emerald-300"
              >
                اکسپلورر
              </Button>
            </div>
            <p className="text-[10px] leading-5 text-slate-500">
              خوانش مستقیماً از <span dir="ltr">{VFB_SOURCE.name}</span> می‌آید و عیناً ذخیره می‌شود؛
              ژنوا در این مسیر هیچ عددی نمی‌سازد، گرد نمی‌کند یا حدس نمی‌زند. اگر VFB نوعی را مبهم
              بداند یا مجموعه‌داده‌ای را کنار بگذارد، همان توضیح خودش ثبت می‌شود.
            </p>
            {readout && <ReadoutPreview readout={readout} />}
            {readout && readout.measurements.length > 0 && (
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={saveReadout}
                className="h-9 gap-1.5 rounded-xl bg-emerald-700 px-3 text-[12px] text-white hover:bg-emerald-800"
              >
                ثبت این خوانش به‌عنوان مشاهده
              </Button>
            )}
          </>
        )}
      </section>

      {/* ── Student's own record ── */}
      <section className="space-y-2 border-t border-emerald-900/5 pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11.5px] font-bold text-slate-700">یادداشت و نتیجه‌گیری شما</p>
          <DataKindBadge kind="observation" />
        </div>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="مشاهدهٔ خود را بنویسید: چه دیدید، در چه مدت، با چه شرایطی."
          className="min-h-[70px] text-[12px]"
        />
        <Textarea
          value={result}
          onChange={(e) => setResult(e.target.value)}
          placeholder="نتیجه‌گیری شما — این یک فرضیه است، نه اندازه‌گیری."
          className="min-h-[70px] text-[12px]"
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={saveLabNote}
            className="h-9 gap-1.5 rounded-xl border-emerald-900/10 bg-white px-3 text-[12px] text-slate-700 hover:border-emerald-300"
          >
            ثبت مشاهدهٔ آزمایشگاه
          </Button>
          <span className="text-[10px] text-slate-400">
            بدون خوانش VFB، این ثبت فقط «مشاهده» است و عددی به آن اضافه نمی‌شود.
          </span>
        </div>
      </section>

      {/* ── Recorded observations ── */}
      <section className="space-y-2 border-t border-emerald-900/5 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11.5px] font-bold text-slate-700">مشاهده‌های ثبت‌شده</p>
          <span className="text-[10px] text-slate-500">
            {faNum(rows.length)} مشاهده · {faNum(realCount)} با دادهٔ واقعی
          </span>
        </div>

        {observations === undefined && (
          <p className="flex items-center justify-center gap-2 py-4 text-[11.5px] text-slate-500">
            <Loader2 className="size-3.5 animate-spin text-emerald-600" />
            در حال بارگذاری…
          </p>
        )}
        {observations !== undefined && rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-emerald-900/10 bg-emerald-50/40 px-3 py-5 text-center text-[11.5px] text-slate-500">
            هنوز مشاهده‌ای ثبت نشده است.
          </p>
        )}

        <ul className="space-y-1.5">
          {rows.map((row) => {
            const hasEvidence = (row.evidence?.measurements.length ?? 0) > 0;
            return (
              <li key={row._id} className="rounded-xl border border-emerald-900/5 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {METHOD_LABEL[row.method]}
                    </span>
                    {hasEvidence ? <DataKindBadge kind="real" /> : <DataKindBadge kind="observation" />}
                    {row.result && <DataKindBadge kind="hypothesis" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">{formatJalaliDate(row.createdAt)}</span>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label="حذف مشاهده"
                      onClick={() => run(() => deleteMut({ id: row._id as Id<"flyObservations"> }), "مشاهده حذف شد")}
                      className="cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {row.evidence && (
                  <p className="mt-1.5 text-[10px] text-slate-500">
                    <span dir="ltr" className="font-mono">{row.evidence.entityId}</span> ·{" "}
                    <span dir="ltr">{row.evidence.source}</span> · خوانش در{" "}
                    {formatJalaliDate(row.evidence.accessedAt)}
                    {row.evidence.datasets.length > 0 && (
                      <>
                        {" "}· مجموعه‌داده: <span dir="ltr">{row.evidence.datasets.join("، ")}</span>
                      </>
                    )}
                  </p>
                )}

                {hasEvidence && (
                  <dl className="mt-1.5 grid gap-1 sm:grid-cols-2">
                    {row.evidence!.measurements.map((m) => (
                      <div
                        key={m.key}
                        className="flex items-baseline justify-between gap-2 rounded-lg bg-emerald-50/60 px-2 py-1"
                      >
                        <dt className="text-[10px] text-slate-600">{m.label}</dt>
                        <dd dir="ltr" className="text-left font-mono text-[11px] font-semibold text-emerald-800">
                          {formatValue(m.value, m.unit)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {row.note && (
                  <p className="mt-1.5 whitespace-pre-wrap text-[11.5px] leading-6 text-slate-600">{row.note}</p>
                )}
                {row.result && (
                  <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-fuchsia-50 px-2.5 py-1.5 text-[11.5px] leading-6 text-fuchsia-800 ring-1 ring-fuchsia-100">
                    <strong>نتیجه‌گیری (فرضیه):</strong> {row.result}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Results, real data only ── */}
      <section className="space-y-2 border-t border-emerald-900/5 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11.5px] font-bold text-slate-700">نتایج — فقط از دادهٔ واقعی</p>
          <DataKindBadge kind="real" />
        </div>

        {summaries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-emerald-900/10 bg-emerald-50/40 px-3 py-5 text-center text-[11.5px] leading-6 text-slate-500">
            تا وقتی یک خوانش واقعی ثبت نشود، نتیجه‌ای محاسبه نمی‌شود. ژنوا نتیجهٔ خالی یا ساختگی
            نمایش نمی‌دهد.
          </p>
        ) : (
          <>
            <p className="text-[10px] leading-5 text-slate-500">
              جدول زیر فقط مقادیری را خلاصه می‌کند که واقعاً از{" "}
              <span dir="ltr">{VFB_SOURCE.name}</span> خوانده و ذخیره شده‌اند: تعداد خوانش، و کمینه و
              بیشینهٔ مقدارهای ثبت‌شده. این اعداد زیستی نیستند — شمارش‌ها و فرادادهٔ همان API هستند.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-[11px]">
                <thead>
                  <tr className="bg-emerald-50/70">
                    <th className="rounded-r-lg px-2.5 py-1.5 text-right font-bold text-emerald-800">شاخص</th>
                    <th className="px-2.5 py-1.5 text-center font-bold text-emerald-800">تعداد</th>
                    <th className="px-2.5 py-1.5 text-center font-bold text-emerald-800">کمینه</th>
                    <th className="px-2.5 py-1.5 text-center font-bold text-emerald-800">بیشینه</th>
                    <th className="rounded-l-lg px-2.5 py-1.5 text-center font-bold text-emerald-800">آخرین</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((s) => (
                    <tr key={s.key} className="border-t border-emerald-900/5">
                      <td className="px-2.5 py-1.5 text-right text-slate-700">{s.label}</td>
                      <td dir="ltr" className="px-2.5 py-1.5 text-center font-mono text-slate-700">
                        {faNum(s.count)}
                      </td>
                      <td dir="ltr" className="px-2.5 py-1.5 text-center font-mono text-slate-700">
                        {formatValue(s.min, s.unit)}
                      </td>
                      <td dir="ltr" className="px-2.5 py-1.5 text-center font-mono text-slate-700">
                        {formatValue(s.max, s.unit)}
                      </td>
                      <td dir="ltr" className="px-2.5 py-1.5 text-center font-mono font-semibold text-emerald-800">
                        {formatValue(s.last, s.unit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[10px] leading-5 text-amber-800 ring-1 ring-amber-100">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          خروجی شبیه‌سازیِ رفتار در این جدول وارد نمی‌شود. تله‌متری آن یک مدل محاسباتی با پارامترهای
          دستی است و اندازه‌گیری آزمایشگاهی نیست؛ ترکیب آن با دادهٔ واقعی، نتیجهٔ ساختگی می‌سازد.
        </p>
      </section>
    </div>
  );
}