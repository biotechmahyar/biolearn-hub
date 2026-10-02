/**
 * Genova Virtual Lab — آزمایشگاه پروتئین
 * ─────────────────────────────────────────────────────────────────────────────
 * Three tools that cover the protein bench:
 *
 *   • SDS-PAGE       — Rf of a molecular-weight ladder, a log–linear standard
 *                     curve, and the unknown band's interpolated kDa with a
 *                     stated uncertainty.
 *   • Western Blot   — band densitometry, normalised for lane loading and for an
 *                     optional housekeeping control.
 *   • Protein Assay  — Bradford-style standard curve from the user's own
 *                     readings, plus Beer–Lambert on the declared ε.
 *
 * None of them ships a "reference" measurement. The ladder is a catalogue of
 * stated band positions, and every intensity and absorbance comes from the user,
 * so a wrong answer is traceable to a wrong input rather than a baked-in number.
 */
import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { AlertTriangle, Beaker, Info } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  DataTable,
  DownloadBtn,
  DownloadCsvBtn,
  KV,
  ResultBlock,
  SaveResultBtn,
  Td,
  ToolShell,
} from "./proteinUi";
import {
  BSA_STANDARDS,
  BLOT_PRESETS,
  GEL_PRESETS,
  LADDERS,
  beerLambert,
  blotDensitometry,
  estimateUnknownBand,
  faNum,
  proteinAssay,
  sdsPageStandardCurve,
  type LaneReading,
  type LadderPoint,
} from "./proteinLabCore";

// ── 1. SDS-PAGE ─────────────────────────────────────────────────────────────

export function SdsPageTool() {
  const [ladderId, setLadderId] = useState(LADDERS[0].id);
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [wellDistance, setWellDistance] = useState("100");
  const [unknownLane, setUnknownLane] = useState("L1");
  const [unknownDistance, setUnknownDistance] = useState("");

  const { isAuthenticated } = useAuth();
  const addNote = useMutation(api.lab.addNote);

  const ladder = LADDERS.find((l) => l.id === ladderId) ?? LADDERS[0];

  const points: LadderPoint[] = useMemo(
    () =>
      ladder.bands
        .map((b) => ({ kda: b.kda, name: b.name, distanceMm: Number(measurements[b.name] ?? "") }))
        .filter((p) => Number.isFinite(p.distanceMm) && p.distanceMm > 0),
    [ladder, measurements],
  );

  const curve = useMemo(
    () => (points.length >= 2 ? sdsPageStandardCurve(ladderId, points) : null),
    [ladderId, points],
  );

  const wellMm = Number(wellDistance.replace(/[^0-9.]/g, ""));
  const unknownMm = Number(unknownDistance.replace(/[^0-9.]/g, ""));
  const unknown = useMemo(() => {
    if (!curve || !(unknownMm > 0)) return null;
    return estimateUnknownBand(curve, { label: "نمونهٔ ناشناس", distanceMm: unknownMm, lane: unknownLane }, wellMm);
  }, [curve, unknownMm, unknownLane, wellMm]);

  const gel = GEL_PRESETS.find((g) => g.id === "10") ?? GEL_PRESETS[0];

  const report = useMemo(() => {
    if (!curve) return "";
    return [
      `مارکر: ${ladder.label}`,
      `ژل: ${gel.gel} — ${gel.resolves}`,
      "باندهای مارکر:",
      ...curve.ladder.map((b, i) => `  ${b.name}  Rf=${b.rf.toFixed(3)}  خطای پیش‌بینی=${curve.errors[i].errorPct.toFixed(1)}٪`),
      `شیب منحنی: ${curve.fit.slope.toFixed(4)}`,
      `عرض از مبدأ: ${curve.fit.intercept.toFixed(4)}`,
      `R²: ${curve.fit.r2.toFixed(5)}`,
      `میانگین خطای مطلق: ${curve.mapePct.toFixed(2)}٪`,
      curve.fitVerdict,
      unknown
        ? `نمونهٔ ناشناس: Rf=${unknown.rf.toFixed(3)} → ${unknown.kda.toFixed(2)} kDa (عدم قطعیت ${unknown.uncertaintyPct.toFixed(1)}٪)`
        : "",
      ...curve.notes.map((n) => `یادداشت: ${n}`),
    ]
      .filter(Boolean)
      .join("\n");
  }, [curve, ladder, gel, unknown]);

  async function save() {
    if (!isAuthenticated) {
      toast.error("برای ذخیره در آزمایشگاه باید وارد حساب خود شوید.");
      return;
    }
    try {
      await addNote({ title: "SDS-PAGE — منحنی استاندارد", body: report });
      toast.success("نتیجه در آزمایشگاه ذخیره شد.");
    } catch {
      toast.error("ذخیرهٔ نتیجه ناموفق بود.");
    }
  }

  return (
    <ToolShell
      title="SDS-PAGE — منحنی استاندارد و وزن مولکولی"
      subtitle="فاصلهٔ مهاجرت هر باند مارکر را وارد کنید تا منحنی استاندارد ساخته شود و وزن مولکولی باند نمونه تخمین زده شود. فرض پایه این روش — خطی بودن لگاریتم وزن مولکولی بر حسب Rf — تقریبی است و کیفیت برازش گزارش می‌شود."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-[11px] font-bold text-slate-700">مارکر استفاده‌شده</Label>
          <div className="space-y-1">
            {LADDERS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setLadderId(l.id);
                  setMeasurements({});
                }}
                className={`block w-full rounded-lg px-2.5 py-1.5 text-right text-[10.5px] transition ${
                  ladderId === l.id
                    ? "bg-emerald-500 text-white shadow"
                    : "bg-white text-slate-600 ring-1 ring-emerald-900/5 hover:bg-emerald-50"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold text-slate-700">
              فاصلهٔ لبهٔ چاهک تا پایین ژل (mm)
            </Label>
            <span className="text-[10px] text-slate-400">مبنای محاسبهٔ Rf</span>
          </div>
          <input
            value={wellDistance}
            onChange={(e) => setWellDistance(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            dir="ltr"
            className="h-9 w-full rounded-lg bg-white px-3 font-mono text-[12px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-bold text-slate-700">
            فاصلهٔ مهاجرت هر باند مارکر (mm)
          </Label>
          <div className="space-y-1.5">
            {ladder.bands.map((b) => (
              <div key={b.name} className="flex items-center gap-2">
                <span className="w-16 shrink-0 font-mono text-[10.5px] font-bold text-slate-600" dir="ltr">
                  {b.name}
                </span>
                <input
                  value={measurements[b.name] ?? ""}
                  onChange={(e) =>
                    setMeasurements((prev) => ({ ...prev, [b.name]: e.target.value.replace(/[^0-9.]/g, "") }))
                  }
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="mm"
                  className="h-8 flex-1 rounded-lg bg-white px-2.5 font-mono text-[11.5px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            ))}
          </div>
          <p className="text-[10px] leading-5 text-slate-500">
            بزرگ‌ترین پروتئین باید کمترین فاصله را داشته باشد. اگر ترتیب برعکس وارد شود، ابزار
            هشدار می‌دهد.
          </p>
        </div>

        {curve && (
          <>
            <ResultBlock
              title="منحنی استاندارد"
              badge={
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    curve.mapePct < 5
                      ? "bg-emerald-100 text-emerald-800"
                      : curve.mapePct < 12
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  خطای میانگین {faNum(curve.mapePct, 1)}٪
                </span>
              }
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <KV label="شیب" value={curve.fit.slope.toFixed(4)} />
                <KV label="عرض از مبدأ" value={curve.fit.intercept.toFixed(4)} />
                <KV label="ضریب تعیین R²" value={curve.fit.r2.toFixed(5)} />
                <KV label="تعداد باند" value={String(curve.fit.n)} />
              </div>
              <p className="flex items-start gap-1.5 text-[10.5px] leading-5 text-slate-600">
                <Info className="mt-0.5 size-3 shrink-0 text-emerald-600" />
                {curve.fitVerdict}
              </p>
            </ResultBlock>

            <ResultBlock title="جدول مارکر و پیش‌بینی">
              <DataTable headers={["باند", "فاصله (mm)", "Rf", "کیلو‌دالتون واقعی", "پیش‌بینی‌شده", "خطا"]}>
                {curve.ladder.map((b, i) => (
                  <tr key={b.name}>
                    <Td mono>{b.name}</Td>
                    <Td mono>{b.distanceMm.toFixed(1)}</Td>
                    <Td mono>{b.rf.toFixed(3)}</Td>
                    <Td mono>{b.kda}</Td>
                    <Td mono>{curve.errors[i].predictedKda.toFixed(1)}</Td>
                    <Td mono>
                      <span className={Math.abs(curve.errors[i].errorPct) < 5 ? "text-emerald-700" : "text-amber-700"}>
                        {curve.errors[i].errorPct > 0 ? "+" : ""}
                        {faNum(curve.errors[i].errorPct, 1)}٪
                      </span>
                    </Td>
                  </tr>
                ))}
              </DataTable>
            </ResultBlock>

            {curve.notes.length > 0 && (
              <div className="space-y-1.5">
                {curve.notes.map((n, i) => (
                  <p key={i} className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[10.5px] leading-5 text-amber-800">
                    <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                    {n}
                  </p>
                ))}
              </div>
            )}
          </>
        )}

        {/* Unknown band */}
        <ResultBlock title="باند نمونهٔ ناشناس">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">شمارهٔ لین</Label>
                <input
                  value={unknownLane}
                  onChange={(e) => setUnknownLane(e.target.value)}
                  dir="ltr"
                  className="h-9 w-full rounded-lg bg-white px-3 font-mono text-[12px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">فاصلهٔ مهاجرت (mm)</Label>
                <input
                  value={unknownDistance}
                  onChange={(e) => setUnknownDistance(e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="mm"
                  className="h-9 w-full rounded-lg bg-white px-3 font-mono text-[12px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            </div>

            {unknown && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <KV label="Rf نمونه" value={unknown.rf.toFixed(3)} />
                  <KV label="وزن مولکولی تخمینی" value={`${faNum(unknown.kda, 1)} kDa`} />
                  <KV label="عدم قطعیت" value={`${faNum(unknown.uncertaintyPct, 1)}٪`} hint="خطای برازش مارکر" />
                </div>
                <p className="text-[10px] leading-5 text-slate-500">{unknown.note}</p>
              </>
            )}
            {!curve && (
              <p className="text-[10.5px] text-slate-500">
                    برای تخمین وزن مولکولی، ابتدا منحنی استاندارد را بسازید (حداقل دو باند مارکر).
              </p>
            )}
          </div>
        </ResultBlock>

        <div className="rounded-2xl border border-emerald-900/5 bg-emerald-50/50 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-black text-emerald-800">
            <Beaker className="size-3.5" />
            چه ژلی برای چه محدوده‌ای؟
          </p>
          <div className="mt-2 space-y-1">
            {GEL_PRESETS.map((g) => (
              <p key={g.id} className="text-[10.5px] leading-5 text-slate-600">
                <span dir="ltr" className="font-mono font-bold text-emerald-700">
                  {g.gel}
                </span>{" "}
                — {g.resolves}
              </p>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-5 text-slate-500">
            در SDS-PAGE پروتئین به‌دلیل بار منفی یکنواخت، در میدان الکتریکی متناسب با لگاریتم اندازه
            حرکت می‌کند — همین است که رابطهٔ لگاریتمی–خطی را توجیه می‌کند.
          </p>
        </div>

        {curve && (
          <div className="flex flex-wrap gap-2">
            <SaveResultBtn onSave={save} />
            <DownloadBtn content={report} filename="genova-sds-page.txt" />
            <DownloadCsvBtn
              headers={["باند", "فاصله mm", "Rf", "kDa واقعی", "kDa پیش‌بینی", "خطا ٪"]}
              rows={curve.ladder.map((b, i) => [
                b.name,
                b.distanceMm.toFixed(1),
                b.rf.toFixed(3),
                b.kda,
                curve.errors[i].predictedKda.toFixed(2),
                curve.errors[i].errorPct.toFixed(2),
              ])}
              filename="genova-sds-page.csv"
            />
          </div>
        )}
      </div>
    </ToolShell>
  );
}

// ── 2. WESTERN BLOT ─────────────────────────────────────────────────────────

export function WesternBlotTool() {
  /** Rows are held as raw strings so partially-typed fields survive a re-render. */
  interface LaneDraft {
    lane: string;
    bandIod: string;
    laneIod: string;
    controlIod: string;
  }
  const [rows, setRows] = useState<LaneDraft[]>([{ lane: "L1", bandIod: "", laneIod: "", controlIod: "" }]);
  const [controlPreset, setControlPreset] = useState<string>(BLOT_PRESETS[0].id);

  const { isAuthenticated } = useAuth();
  const addNote = useMutation(api.lab.addNote);

  const readings: LaneReading[] = useMemo(
    () =>
      rows
        .map((r) => ({
          lane: r.lane,
          bandIod: Number(r.bandIod),
          laneIod: Number(r.laneIod),
          controlIod: r.controlIod === "" ? undefined : Number(r.controlIod),
        }))
        .filter((r) => Number.isFinite(r.bandIod) && r.bandIod > 0 && Number.isFinite(r.laneIod) && r.laneIod > 0),
    [rows],
  );

  const result = useMemo(
    () => (readings.length > 0 ? blotDensitometry(readings) : null),
    [readings],
  );

  const control = BLOT_PRESETS.find((c) => c.id === controlPreset) ?? BLOT_PRESETS[0];

  const report = useMemo(() => {
    if (!result) return "";
    return [
      `کنترل بارگذاری: ${control.label}`,
      `لین مرجع: ${result.referenceLane}`,
      ...result.lanes.map(
        (l) =>
          `  ${l.lane}: IOD باند=${l.bandIod}  نرمال‌شده=${l.normalised.toFixed(2)}٪  نسبت به کنترل=${l.vsControl != null ? l.vsControl.toFixed(2) : "—"}  نسبت به ${result.referenceLane}=${l.vsFirst.toFixed(2)}`,
      ),
      ...result.notes.map((n) => `یادداشت: ${n}`),
    ].join("\n");
  }, [result, control]);

  function update(index: number, key: keyof LaneDraft, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }

  async function save() {
    if (!isAuthenticated) {
      toast.error("برای ذخیره در آزمایشگاه باید وارد حساب خود شوید.");
      return;
    }
    try {
      await addNote({ title: "Western Blot — دنسیتومتری", body: report });
      toast.success("نتیجه در آزمایشگاه ذخیره شد.");
    } catch {
      toast.error("ذخیرهٔ نتیجه ناموفق بود.");
    }
  }

  return (
    <ToolShell
      title="Western Blot — دنسیتومتری و نرمال‌سازی"
      subtitle="شدت باند هر لین را از دستگاه تصویربرداری وارد کنید. شدت خام بدون نرمال‌سازی گمراه‌کننده است، چون لینی که نمونهٔ بیشتری ریخته شده باشد عمداً پررنگ‌تر می‌شود."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-[11px] font-bold text-slate-700">بانک کنترل بارگذاری</Label>
          <div className="space-y-1">
            {BLOT_PRESETS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setControlPreset(c.id)}
                className={`block w-full rounded-lg px-2.5 py-1.5 text-right text-[10.5px] transition ${
                  controlPreset === c.id
                    ? "bg-emerald-500 text-white shadow"
                    : "bg-white text-slate-600 ring-1 ring-emerald-900/5 hover:bg-emerald-50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] leading-5 text-slate-500">{control.note}</p>
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-bold text-slate-700">خوانش لین‌ها</Label>
          <div className="space-y-1.5">
            <div className="grid grid-cols-4 gap-2 px-1 text-[9.5px] font-bold text-slate-500">
              <span>لین</span>
              <span>IOD باند هدف</span>
              <span>IOD کل لین</span>
              <span>IOD کنترل</span>
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-4 gap-2">
                <input
                  value={r.lane}
                  onChange={(e) => update(i, "lane", e.target.value)}
                  dir="ltr"
                  className="h-8 rounded-lg bg-white px-2 font-mono text-[11px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                <input
                  value={r.bandIod}
                  onChange={(e) => update(i, "bandIod", e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="—"
                  className="h-8 rounded-lg bg-white px-2 font-mono text-[11px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                <input
                  value={r.laneIod}
                  onChange={(e) => update(i, "laneIod", e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="—"
                  className="h-8 rounded-lg bg-white px-2 font-mono text-[11px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                <input
                  value={r.controlIod}
                  onChange={(e) => update(i, "controlIod", e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="اختیاری"
                  className="h-8 rounded-lg bg-white px-2 font-mono text-[11px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setRows((prev) => [
                  ...prev,
                  { lane: `L${prev.length + 1}`, bandIod: "", laneIod: "", controlIod: "" },
                ])
              }
              className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[10.5px] font-bold text-emerald-700 hover:bg-emerald-100"
            >
              افزودن لین
            </button>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows((prev) => prev.slice(0, -1))}
                className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10.5px] font-bold text-slate-600 hover:bg-slate-200"
              >
                حذف آخرین
              </button>
            )}
          </div>
        </div>

        {result && result.lanes.length > 0 && (
          <>
            <ResultBlock
              title="نتیجهٔ دنسیتومتری"
              badge={
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  مرجع: {result.referenceLane}
                </span>
              }
            >
              <DataTable headers={["لین", "IOD باند", "نرمال‌شده", "نسبت به کنترل", "نسبت به مرجع"]}>
                {result.lanes.map((l) => (
                  <tr key={l.lane}>
                    <Td mono>{l.lane}</Td>
                    <Td mono>{l.bandIod.toLocaleString("fa-IR")}</Td>
                    <Td mono>{faNum(l.normalised, 2)}٪</Td>
                    <Td mono>{l.vsControl != null ? faNum(l.vsControl, 2) : "—"}</Td>
                    <Td mono>{faNum(l.vsFirst, 2)}</Td>
                  </tr>
                ))}
              </DataTable>

              <div className="space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-gradient-to-l from-emerald-500 to-teal-500" style={{ width: "100%" }} />
                </div>
                <p className="text-[10px] leading-5 text-slate-500">
                  ستون «نرمال‌شده» برابر باند تقسیم بر کل شدت لین است و اثر بارگذاری نابرابر را
                  می‌گیرد. ستون «نسبت به کنترل» شدت باند را بر شدت بانک کنترل همان لین می‌نگد و
                  دقیق‌تر است — به شرطی که بانک کنترل برای همهٔ لین‌ها وارد شده باشد.
                </p>
              </div>
            </ResultBlock>

            {result.notes.map((n, i) => (
              <p key={i} className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[10.5px] leading-5 text-amber-800">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                {n}
              </p>
            ))}

            <div className="flex flex-wrap gap-2">
              <SaveResultBtn onSave={save} />
              <DownloadBtn content={report} filename="genova-western-blot.txt" />
              <DownloadCsvBtn
                headers={["لین", "IOD باند", "نرمال‌شده ٪", "نسبت به کنترل", "نسبت به مرجع"]}
                rows={result.lanes.map((l) => [
                  l.lane,
                  l.bandIod,
                  l.normalised.toFixed(2),
                  l.vsControl != null ? l.vsControl.toFixed(3) : "",
                  l.vsFirst.toFixed(3),
                ])}
                filename="genova-western-blot.csv"
              />
            </div>
          </>
        )}
      </div>
    </ToolShell>
  );
}

// ── 3. PROTEIN ASSAY ────────────────────────────────────────────────────────

export function ProteinAssayTool() {
  const [blank, setBlank] = useState("0.02");
  const [dilution, setDilution] = useState("10");
  const [unknown, setUnknown] = useState("0.35");
  const [standards, setStandards] = useState<{ concentration: string; absorbance: string }[]>(
    BSA_STANDARDS.slice(1).map((s) => ({
      concentration: String(s.concentration),
      absorbance: String(s.absorbance),
    })),
  );
  const [eps, setEps] = useState("");
  const [pathLength, setPathLength] = useState("1");
  const [mw, setMw] = useState("");

  const { isAuthenticated } = useAuth();
  const addNote = useMutation(api.lab.addNote);

  const result = useMemo(() => {
    const points = standards
      .map((s) => ({
        concentration: Number(s.concentration.replace(/[^0-9.]/g, "")),
        absorbance: Number(s.absorbance.replace(/[^0-9.]/g, "")),
      }))
      .filter((p) => Number.isFinite(p.concentration) && Number.isFinite(p.absorbance));
    const b = Number(blank.replace(/[^0-9.]/g, ""));
    const u = Number(unknown.replace(/[^0-9.]/g, ""));
    const d = Number(dilution.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(b) || !Number.isFinite(u)) return null;
    return proteinAssay({
      blank: b,
      standards: points,
      unknownAbsorbance: u,
      dilutionFactor: Number.isFinite(d) && d > 0 ? d : 1,
    });
  }, [standards, blank, unknown, dilution]);

  const bl = useMemo(() => {
    const a = Number(unknown.replace(/[^0-9.]/g, ""));
    const e = Number(eps.replace(/[^0-9.]/g, ""));
    const l = Number(pathLength.replace(/[^0-9.]/g, ""));
    const m = Number(mw.replace(/[^0-9.]/g, ""));
    if (![a, e, l, m].every((v) => Number.isFinite(v))) return null;
    return beerLambert(a, l, e, m);
  }, [unknown, eps, pathLength, mw]);

  const report = useMemo(() => {
    if (!result) return "";
    return [
      `جذب نمونهٔ صفر: ${result.blank.toFixed(3)}`,
      `شیب منحنی استاندارد: ${result.fit.slope.toFixed(4)}`,
      `عرض از مبدأ: ${result.fit.intercept.toFixed(4)}`,
      `R²: ${result.fit.r2.toFixed(5)}`,
      `بازهٔ استانداردها: ${result.rangeMgMl[0]} تا ${result.rangeMgMl[1]} mg/mL`,
      `غلظت نمونه: ${result.concentrationMgMl.toFixed(4)} mg/mL`,
      `ضریب رقیق‌سازی: ${dilution}`,
      `غلظت پس از اعمال رقیق‌سازی: ${result.dilutedConcentrationMgMl.toFixed(4)} mg/mL`,
      ...result.notes.map((n) => `یادداشت: ${n}`),
    ].join("\n");
  }, [result, dilution]);

  async function save() {
    if (!isAuthenticated) {
      toast.error("برای ذخیره در آزمایشگاه باید وارد حساب خود شوید.");
      return;
    }
    try {
      await addNote({ title: "Protein Assay — منحنی استاندارد", body: report });
      toast.success("نتیجه در آزمایشگاه ذخیره شد.");
    } catch {
      toast.error("ذخیرهٔ نتیجه ناموفق بود.");
    }
  }

  return (
    <ToolShell
      title="Protein Assay — منحنی استاندارد و بیر-لامبرت"
      subtitle="جذب نمونه‌های استاندارد و نمونه را وارد کنید تا غلظت پروتئین از منحنی استاندارد خودتان محاسبه شود. جذب نمونهٔ صفر کلید کار است؛ اگر درست تنظیم نشده باشد، همهٔ نتایج جابه‌جا می‌شوند."
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700">جذب نمونهٔ صفر</Label>
            <input
              value={blank}
              onChange={(e) => setBlank(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              dir="ltr"
              className="h-9 w-full rounded-lg bg-white px-3 font-mono text-[12px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700">جذب نمونهٔ مجهول</Label>
            <input
              value={unknown}
              onChange={(e) => setUnknown(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              dir="ltr"
              className="h-9 w-full rounded-lg bg-white px-3 font-mono text-[12px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700">ضریب رقیق‌سازی</Label>
            <input
              value={dilution}
              onChange={(e) => setDilution(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              dir="ltr"
              className="h-9 w-full rounded-lg bg-white px-3 font-mono text-[12px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] font-bold text-slate-700">استانداردها</Label>
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-2 px-1 text-[9.5px] font-bold text-slate-500">
              <span>غلظت (mg/mL)</span>
              <span>جذب در ۵۹۵ nm</span>
            </div>
            {standards.map((s, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <input
                  value={s.concentration}
                  onChange={(e) =>
                    setStandards((prev) =>
                      prev.map((p, j) => (j === i ? { ...p, concentration: e.target.value.replace(/[^0-9.]/g, "") } : p)),
                    )
                  }
                  inputMode="decimal"
                  dir="ltr"
                  className="h-8 rounded-lg bg-white px-2.5 font-mono text-[11.5px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                <input
                  value={s.absorbance}
                  onChange={(e) =>
                    setStandards((prev) =>
                      prev.map((p, j) => (j === i ? { ...p, absorbance: e.target.value.replace(/[^0-9.]/g, "") } : p)),
                    )
                  }
                  inputMode="decimal"
                  dir="ltr"
                  className="h-8 rounded-lg bg-white px-2.5 font-mono text-[11.5px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            ))}
          </div>
          <p className="text-[10px] leading-5 text-slate-500">
            مقادیر اولیه بر پایهٔ یک منحنی نمونهٔ BSA وارد شده‌اند؛ آن‌ها را با خوانش‌های خودتان
            جایگزین کنید تا نتیجه واقعی خودتان باشد.
          </p>
        </div>

        {result && (
          <ResultBlock
            title="نتیجهٔ آزمون"
            badge={
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  result.withinRange ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                {result.withinRange ? "در بازهٔ استاندارد" : "خارج از بازه"}
              </span>
            }
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <KV label="غلظت نمونه" value={`${faNum(result.concentrationMgMl, 3)} mg/mL`} />
              <KV
                label="پس از رقیق‌سازی"
                value={`${faNum(result.dilutedConcentrationMgMl, 3)} mg/mL`}
                hint={`${dilution}×`}
              />
              <KV label="شیب" value={result.fit.slope.toFixed(4)} />
              <KV label="R²" value={result.fit.r2.toFixed(5)} />
            </div>
            <div className="rounded-xl bg-white p-3 ring-1 ring-emerald-900/5">
              <p className="text-[10px] text-slate-500">
                بازهٔ کالیبراسیون:{" "}
                <span dir="ltr" className="font-mono font-bold text-slate-700">
                  {result.rangeMgMl[0]} – {result.rangeMgMl[1]} mg/mL
                </span>
              </p>
              <p className="mt-1 text-[10px] leading-5 text-slate-500">
                جذب اصلاح‌شده نمونه (پس از کسر نمونهٔ صفر):{" "}
                <span dir="ltr" className="font-mono font-bold text-slate-700">
                  {result.blankCorrected.toFixed(3)}
                </span>
              </p>
            </div>
            {result.notes.map((n, i) => (
              <p key={i} className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[10.5px] leading-5 text-amber-800">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                {n}
              </p>
            ))}
          </ResultBlock>
        )}

        {/* Beer-Lambert */}
        <ResultBlock title="بیر-لامبرت (مسیر ریاضی)">
          <div className="space-y-3">
            <p className="text-[10.5px] leading-5 text-slate-600">
              رابطهٔ A = ε·c·l وقتی مول جذب ویژهٔ پروتئین را می‌دانید مستقیم به غلظت می‌دهد. در آزمون
              برادفورد پاسخ خطی نیست چون رنگ با پروتئین به‌صورت کوئوردینی واکنش می‌دهد؛ برای همین
              منحنی استاندارد لازم است. این دو مسیر جایگزین هم نیستند.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">
                  ε (M⁻¹·cm⁻¹)
                </Label>
                <input
                  value={eps}
                  onChange={(e) => setEps(e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="مثال: ۵۰۰۰۰"
                  className="h-9 w-full rounded-lg bg-white px-3 font-mono text-[12px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">طول مسیر (cm)</Label>
                <input
                  value={pathLength}
                  onChange={(e) => setPathLength(e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="decimal"
                  dir="ltr"
                  className="h-9 w-full rounded-lg bg-white px-3 font-mono text-[12px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">وزن مولکولی (g/mol)</Label>
                <input
                  value={mw}
                  onChange={(e) => setMw(e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="مثال: ۶۶۰۰۰"
                  className="h-9 w-full rounded-lg bg-white px-3 font-mono text-[12px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            </div>
            {bl && (
              <div className="grid grid-cols-2 gap-2">
                <KV label="غلظت مولار" value={`${bl.molarity.toExponential(3)} M`} />
                <KV label="غلظت جرمی" value={`${faNum(bl.mgPerMl, 4)} mg/mL`} />
              </div>
            )}
          </div>
        </ResultBlock>

        {result && (
          <div className="flex flex-wrap gap-2">
            <SaveResultBtn onSave={save} />
            <DownloadBtn content={report} filename="genova-protein-assay.txt" />
            <DownloadCsvBtn
              headers={["غلظت mg/mL", "جذب", "جذب اصلاح‌شده"]}
              rows={standards.map((s) => [
                s.concentration,
                s.absorbance,
                (Number(s.absorbance) - Number(blank) || 0).toFixed(3),
              ])}
              filename="genova-protein-assay.csv"
            />
          </div>
        )}
      </div>
    </ToolShell>
  );
}