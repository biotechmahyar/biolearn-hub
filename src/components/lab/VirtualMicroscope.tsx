/**
 * Genova Virtual Lab — میکروسکوپ مجازی
 * ─────────────────────────────────────────────────────────────────────────────
 * Draws a field of view for a chosen specimen and objective pair, and shows the
 * optics behind it. The important teaching moment is the resolution check: a
 * 1 µm coccus simply cannot be resolved by a 0.25 NA dry objective, however much
 * you zoom. The tool says so instead of drawing a blurry fake.
 *
 * The specimens are schematic cartoons generated from declared sizes. They are a
 * teaching model, not microscopy data and not any real slide.
 */
import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { AlertTriangle, Eye, Info, Ruler } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import {
  KV,
  ResultBlock,
  SaveResultBtn,
  ToolShell,
} from "./proteinUi";
import {
  LAMBDA_NM,
  OCULARS,
  OBJECTIVES,
  SPECIMENS,
  STANDARD_FIELD_NUMBER_MM,
  checkResolution,
  computeOptics,
  faNum,
  groundTruth,
  type Specimen,
} from "./microscopeCore";

/** Palette per specimen kind, kept in the app's emerald lab theme. */
const KIND_STYLE: Record<string, { body: string; edge: string; accent: string; label: string }> = {
  cell: { body: "#a7f3d0", edge: "#059669", accent: "#047857", label: "سلول" },
  bacteria: { body: "#c4b5fd", edge: "#7c3aed", accent: "#5b21b6", label: "باکتری" },
  tissue: { body: "#fecdd3", edge: "#e11d48", accent: "#9f1239", label: "بافت" },
};

/**
 * SVG field of view. Everything is scaled to the real field diameter, so the
 * specimen is drawn at its true relative size for this objective.
 */
function FieldView({
  specimen,
  totalMag,
  fieldUm,
}: {
  specimen: Specimen;
  totalMag: number;
  fieldUm: number;
}) {
  const style = KIND_STYLE[specimen.kind];
  const SIZE = 340;

  // How many specimen bodies fit across the field, from the real field diameter.
  const bodiesAcross = Math.max(1, fieldUm / (specimen.typicalSizeUm * 2.2));

  return (
    <div className="space-y-2">
      <div className="flex justify-center rounded-2xl bg-slate-900 p-3">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-auto w-full max-w-[340px]"
          role="img"
          aria-label={`میدان دید شبیه‌سازی‌شده برای ${specimen.label}`}
        >
          <defs>
            <radialGradient id="field-bg" cx="50%" cy="45%" r="65%">
              <stop offset="0%" stopColor="#fff7ed" />
              <stop offset="100%" stopColor="#fed7aa" />
            </radialGradient>
          </defs>

          {/* Circular field */}
          <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - 4} fill="url(#field-bg)" />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={SIZE / 2 - 4}
            fill="none"
            stroke="#334155"
            strokeWidth={10}
          />

          {/* Specimen bodies */}
          {specimen.parts.map((p, i) => {
            const cx = p.x * SIZE;
            const cy = p.y * SIZE;
            const rx = p.r * SIZE * 0.5;
            const ry = rx / p.aspect;
            return (
              <g key={i}>
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx={rx}
                  ry={ry}
                  transform={`rotate(${p.rotation} ${cx} ${cy})`}
                  fill={style.body}
                  stroke={style.edge}
                  strokeWidth={1.2}
                  opacity={0.92}
                />
                {p.inner && (
                  <circle cx={cx + p.inner.dx * rx} cy={cy + p.inner.dy * ry} r={p.inner.r * rx} fill={style.accent} opacity={0.75} />
                )}
                {p.granules?.map((g, j) => (
                  <circle
                    key={j}
                    cx={cx + g.x * rx}
                    cy={cy + g.y * ry}
                    r={g.r * rx}
                    fill={style.accent}
                    opacity={0.6}
                  />
                ))}
              </g>
            );
          })}

          {/* Scale bar: one specimen length, so it stays physically meaningful. */}
          <g>
            <line
              x1={24}
              y1={SIZE - 26}
              x2={24 + (specimen.typicalSizeUm / fieldUm) * (SIZE - 48)}
              y2={SIZE - 26}
              stroke="#0f172a"
              strokeWidth={3}
            />
            <text
              x={24}
              y={SIZE - 34}
              fontSize={11}
              fill="#0f172a"
              fontFamily="monospace"
              direction="ltr"
            >
              {faNum(specimen.typicalSizeUm, 1)} µm
            </text>
          </g>
        </svg>
      </div>
      <p className="text-[10.5px] leading-5 text-slate-500">
        این یک تصویر میکروسکوپی واقعی نیست؛ یک طرح شماتیک آموزشی است که از اندازهٔ اعلام‌شدهٔ{" "}
        {specimen.label} و از قطر واقعی میدان دید ({faNum(fieldUm, 0)} میکرومتر در{" "}
        {faNum(totalMag)}×) ساخته می‌شود. در این میدان حدود{" "}
        <span className="font-bold text-emerald-700">{faNum(bodiesAcross, 1)}</span> اندازهٔ نمونه
        جا می‌شود.
      </p>
    </div>
  );
}

export function VirtualMicroscopeTool() {
  const [specimenId, setSpecimenId] = useState(SPECIMENS[0].id);
  const [objectiveId, setObjectiveId] = useState(SPECIMENS[0].recommendedObjective);
  const [ocularId, setOcularId] = useState("10x");
  const [measured, setMeasured] = useState("");

  const { isAuthenticated } = useAuth();
  const addNote = useMutation(api.lab.addNote);

  const specimen = useMemo<Specimen>(
    () => SPECIMENS.find((s) => s.id === specimenId) ?? SPECIMENS[0],
    [specimenId],
  );

  const optics = useMemo(() => computeOptics(objectiveId, ocularId), [objectiveId, ocularId]);

  const check = useMemo(
    () => (optics ? checkResolution(specimen.typicalSizeUm, optics) : null),
    [optics, specimen],
  );

  const truth = useMemo(() => groundTruth(specimen), [specimen]);

  const measuredValue = Number(measured.replace(/[^0-9.]/g, ""));
  const hasMeasured = measured.length > 0 && Number.isFinite(measuredValue) && measuredValue > 0;
  const errorPct = hasMeasured
    ? ((measuredValue - truth.valueUm) / truth.valueUm) * 100
    : null;

  const report = useMemo(() => {
    if (!optics) return "";
    return [
      `نمونه: ${specimen.label}`,
      `اندازهٔ مرجع: ${faNum(truth.valueUm, 1)} µm`,
      `بازهٔ اندازه: ${faNum(specimen.sizeRangeUm[0], 0)} تا ${faNum(specimen.sizeRangeUm[1], 0)} µm`,
      `عدسی هدف: ${optics.objective.label}`,
      `چشمی: ${faNum(optics.ocularMag)}×`,
      `بزرگ‌نمایی کل: ${faNum(optics.totalMag)}×`,
      `عدد apertures: ${optics.objective.na}`,
      `حد تفکیک آبه در ${LAMBDA_NM} nm: ${faNum(optics.resolutionUm, 3)} µm`,
      `قطر میدان دید: ${faNum(optics.fieldOfViewUm, 0)} µm`,
      `فاصلهٔ کاری: ${faNum(optics.workingDistanceUm, 0)} µm`,
      `بازهٔ بزرگ‌نمایی مفید: ${faNum(optics.minUsefulMag, 0)}× تا ${faNum(optics.maxUsefulMag, 0)}×`,
      check ? `وضعیت تفکیک: ${check.verdict} — ${check.message}` : "",
      hasMeasured ? `اندازه‌گیری کاربر: ${faNum(measuredValue, 1)} µm (خطا ${faNum(errorPct ?? 0, 1)}٪)` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }, [optics, specimen, truth, check, hasMeasured, measuredValue, errorPct]);

  async function save() {
    if (!isAuthenticated) {
      toast.error("برای ذخیره در آزمایشگاه باید وارد حساب خود شوید.");
      return;
    }
    try {
      await addNote({ title: `میکروسکوپ مجازی — ${specimen.label}`, body: report });
      toast.success("نتیجه در آزمایشگاه ذخیره شد.");
    } catch {
      toast.error("ذخیرهٔ نتیجه ناموفق بود.");
    }
  }

  return (
    <ToolShell
      title="میکروسکوپ مجازی"
      subtitle="نمونه، عدسی هدف و چشمی را انتخاب کنید تا میدان دید و حد تفکیک واقعی آن محاسبه شود. اندازه‌ها از فرمول‌های اپتیکی می‌آیند، نه از تصویرسازی حدسی."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        {/* Controls */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-slate-700">نوع نمونه</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["cell", "bacteria", "tissue"] as const).map((kind) => {
                const items = SPECIMENS.filter((s) => s.kind === kind);
                return (
                  <div key={kind} className="space-y-1">
                    <div className="rounded-lg bg-slate-100 px-2 py-1 text-center text-[9.5px] font-bold text-slate-500">
                      {KIND_STYLE[kind].label}
                    </div>
                    {items.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSpecimenId(s.id);
                          setObjectiveId(s.recommendedObjective);
                          setMeasured("");
                        }}
                        className={`block w-full rounded-lg px-2 py-1.5 text-right text-[10px] leading-4 transition ${
                          specimenId === s.id
                            ? "bg-emerald-500 text-white shadow"
                            : "bg-white text-slate-600 ring-1 ring-emerald-900/5 hover:bg-emerald-50"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-slate-700">عدسی هدف</Label>
            <div className="space-y-1">
              {OBJECTIVES.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setObjectiveId(o.id)}
                  className={`block w-full rounded-lg px-2.5 py-1.5 text-right text-[10.5px] transition ${
                    objectiveId === o.id
                      ? "bg-emerald-500 text-white shadow"
                      : "bg-white text-slate-600 ring-1 ring-emerald-900/5 hover:bg-emerald-50"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-slate-700">عدسی چشمی</Label>
            <div className="space-y-1">
              {OCULARS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOcularId(o.id)}
                  className={`block w-full rounded-lg px-2.5 py-1.5 text-right text-[10.5px] transition ${
                    ocularId === o.id
                      ? "bg-emerald-500 text-white shadow"
                      : "bg-white text-slate-600 ring-1 ring-emerald-900/5 hover:bg-emerald-50"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Field */}
        <div className="space-y-4">
          {optics && (
            <>
              <ResultBlock
                title="میدان دید"
                badge={
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    {faNum(optics.totalMag)}×
                  </span>
                }
              >
                <FieldView
                  specimen={specimen}
                  totalMag={optics.totalMag}
                  fieldUm={optics.fieldOfViewUm}
                />
              </ResultBlock>

              <ResultBlock title="پارامترهای اپتیکی">
                <div className="grid grid-cols-2 gap-2">
                  <KV label="عدد apertures" value={optics.objective.na.toFixed(2)} hint={`محیط immersion: ${optics.objective.medium}`} />
                  <KV
                    label="حد تفکیک (آبه)"
                    value={`${faNum(optics.resolutionUm, 3)} µm`}
                    hint={`در طول موج ${LAMBDA_NM} nm`}
                  />
                  <KV
                    label="قطر میدان دید"
                    value={`${faNum(optics.fieldOfViewUm, 0)} µm`}
                    hint={`${faNum(optics.fieldOfViewMm, 2)} mm`}
                  />
                  <KV
                    label="فاصلهٔ کاری"
                    value={`${faNum(optics.workingDistanceUm, 0)} µm`}
                    hint={`${optics.objective.workingDistanceMm} mm`}
                  />
                </div>

                <div className="rounded-xl bg-white p-3 ring-1 ring-emerald-900/5">
                  <p className="text-[10px] text-slate-500">
                    بازهٔ بزرگ‌نمایی مفید برای این عدسی:{" "}
                    <span dir="ltr" className="font-mono font-bold text-slate-700">
                      {faNum(optics.minUsefulMag, 0)}× – {faNum(optics.maxUsefulMag, 0)}×
                    </span>
                  </p>
                  <p className="mt-1 text-[10px] leading-5 text-slate-500">
                    بالاتر از حدود ۱۰۰۰× عدد apertures، چشم دیگر جزئیات تازه‌ای نمی‌بیند و فقط
                    «بزرگ‌نمایی تهی» اضافه می‌شود؛ پایین‌تر از آن هم تصویر آن‌قدر کوچک است که دیده
                    نمی‌شود.
                  </p>
                  {!optics.inUsefulRange && (
                    <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] leading-5 text-amber-800">
                      <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                      بزرگ‌نمایی کل {faNum(optics.totalMag)}× خارج از بازهٔ مفید این عدسی است.
                    </p>
                  )}
                </div>

                <p className="text-[10px] leading-5 text-slate-500">
                  فرمول‌های به‌کاررفته: حد تفکیک آبه d = λ ÷ (۲·NA) با λ = {LAMBDA_NM} nm، و قطر میدان
                  دید D = فیلد ÷ بزرگ‌نمایی با فیلد استاندارد {STANDARD_FIELD_NUMBER_MM} mm. این
                  مقادیر نظری‌اند و انحراف اپتیکی یا کیفیت واقعی لامپ را در نظر نمی‌گیرند.
                </p>
              </ResultBlock>

              {/* Resolution verdict */}
              {check && (
                <ResultBlock title="آیا این ساختار قابل دیدن است؟">
                  <div
                    className={`rounded-xl px-3 py-2.5 ring-1 ${
                      check.verdict === "resolvable"
                        ? "bg-emerald-50 ring-emerald-200"
                        : check.verdict === "marginal"
                        ? "bg-amber-50 ring-amber-200"
                        : "bg-rose-50 ring-rose-200"
                    }`}
                  >
                    <p
                      className={`flex items-start gap-1.5 text-[11px] leading-5 ${
                        check.verdict === "resolvable"
                          ? "text-emerald-800"
                          : check.verdict === "marginal"
                          ? "text-amber-800"
                          : "text-rose-800"
                      }`}
                    >
                      <Eye className="mt-0.5 size-3.5 shrink-0" />
                      {check.message}
                    </p>
                  </div>
                </ResultBlock>
              )}

              {/* Measurement */}
              <ResultBlock title="اندازه‌گیری با خط‌کش">
                <div className="space-y-3">
                  <p className="text-[10.5px] leading-5 text-slate-600">
                    اندازهٔ مرجع این نمونه در جدول‌های استاندارد{" "}
                    <span className="font-bold text-emerald-700">
                      {faNum(truth.valueUm, 1)} میکرومتر
                    </span>{" "}
                    است (بازهٔ {faNum(specimen.sizeRangeUm[0], 0)}–
                    {faNum(specimen.sizeRangeUm[1], 0)} میکرومتر). مقداری را که روی خط‌کش می‌خوانید
                    وارد کنید تا خطای شما محاسبه شود.
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-700">
                      اندازهٔ اندازه‌گیری‌شده (میکرومتر)
                    </Label>
                    <input
                      value={measured}
                      onChange={(e) => setMeasured(e.target.value.replace(/[^0-9.]/g, ""))}
                      inputMode="decimal"
                      dir="ltr"
                      placeholder={faNum(truth.valueUm, 1)}
                      className="h-9 w-full rounded-lg bg-white px-3 font-mono text-[12px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>

                  {hasMeasured && errorPct !== null && (
                    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-emerald-900/5">
                      <p className="text-[10.5px] text-slate-600">
                        خطای نسبی شما:{" "}
                        <span
                          dir="ltr"
                          className={`font-mono font-bold ${
                            Math.abs(errorPct) < 10
                              ? "text-emerald-700"
                              : Math.abs(errorPct) < 25
                              ? "text-amber-700"
                              : "text-rose-700"
                          }`}
                        >
                          {errorPct > 0 ? "+" : ""}
                          {faNum(errorPct, 1)}٪
                        </span>
                      </p>
                      <p className="mt-1 text-[10px] leading-5 text-slate-500">
                        {Math.abs(errorPct) < 10
                          ? "خطای شما در محدودهٔ قابل قبول یک تخمین چشمی است."
                          : "این خطا بزرگ است. یا اندازهٔ نمونه با جدول مرجع فرق دارد، یا تخمین چشمی دقیق نیست."}
                      </p>
                    </div>
                  )}
                </div>
              </ResultBlock>
            </>
          )}
        </div>
      </div>

      {/* Specimen info */}
      <ResultBlock title={`دربارهٔ ${specimen.label}`}>
        <div className="space-y-2 text-[10.5px] leading-6 text-slate-600">
          <p>{specimen.description}</p>
          <p className="flex items-start gap-1.5">
            <Ruler className="mt-0.5 size-3 shrink-0 text-emerald-600" />
            <span>
              روش رنگ‌آمیزی: {specimen.stain}
            </span>
          </p>
          <p className="flex items-start gap-1.5">
            <Info className="mt-0.5 size-3 shrink-0 text-emerald-600" />
            <span>{truth.hint}</span>
          </p>
        </div>
      </ResultBlock>

      <div className="flex flex-wrap gap-2">
        <SaveResultBtn onSave={save} />
      </div>
    </ToolShell>
  );
}