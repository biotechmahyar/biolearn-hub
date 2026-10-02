/**
 * Genova Virtual Lab — آزمایشگاه تخمیر
 * ─────────────────────────────────────────────────────────────────────────────
 * Fits the user's own growth and product series and reports the standard
 * parameters: µmax, Xmax, lag, qP, specific productivity and substrate yields.
 *
 * The model comparison is the point of the tool. Rather than picking a curve and
 * presenting its parameters as fact, both classical models are fitted and shown
 * side by side, so the student can see which one the data actually supports and
 * when neither does. Everything labelled a fit is a fit, and a poor fit is
 * called out rather than hidden.
 */
import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { AlertTriangle, Info } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  pct,
} from "./proteinUi";
import {
  MODEL_LABELS,
  compareModels,
  faNum,
  fermentationMetrics,
  fitGrowth,
  substrateYields,
  type GrowthModel,
  type GrowthPoint,
  type ProductPoint,
} from "./fermentationCore";

/** A worked example, clearly labelled as one — the user replaces it. */
const EXAMPLE_GROWTH = [
  "0, 0.10",
  "2, 0.13",
  "4, 0.28",
  "6, 0.71",
  "8, 1.62",
  "10, 3.20",
  "12, 5.15",
  "14, 6.95",
  "16, 8.25",
  "18, 9.05",
  "20, 9.52",
  "22, 9.75",
  "24, 9.85",
].join("\n");

const EXAMPLE_PRODUCT = [
  "0, 0.00",
  "4, 0.05",
  "8, 0.28",
  "12, 0.95",
  "16, 1.85",
  "20, 2.55",
  "24, 2.90",
].join("\n");

/** Parse "t, value" lines, skipping blanks and anything non-numeric. */
function parsePairs(raw: string): { t: number; v: number }[] {
  const out: { t: number; v: number }[] = [];
  for (const line of raw.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/[,;\t]/);
    if (parts.length < 2) continue;
    const t = Number(parts[0].replace(/[^0-9.-]/g, ""));
    const v = Number(parts[1].replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(t) || !Number.isFinite(v)) continue;
    out.push({ t, v });
  }
  return out;
}

export function FermentationTool() {
  const [growthRaw, setGrowthRaw] = useState(EXAMPLE_GROWTH);
  const [productRaw, setProductRaw] = useState(EXAMPLE_PRODUCT);
  const [model, setModel] = useState<GrowthModel>("logistic");
  const [unit, setUnit] = useState("OD600");
  const [initialSubstrate, setInitialSubstrate] = useState("10");
  const [finalSubstrate, setFinalSubstrate] = useState("2");

  const { isAuthenticated } = useAuth();
  const addNote = useMutation(api.lab.addNote);

  const growth = useMemo<GrowthPoint[]>(
    () => parsePairs(growthRaw).map((r) => ({ t: r.t, x: r.v })),
    [growthRaw],
  );
  const product = useMemo<ProductPoint[]>(
    () => parsePairs(productRaw).map((r) => ({ t: r.t, p: r.v })),
    [productRaw],
  );

  const fits = useMemo(() => compareModels(growth), [growth]);
  const active = useMemo(() => fitGrowth(growth, model), [growth, model]);
  const metrics = useMemo(
    () => (active ? fermentationMetrics(growth, product, active) : null),
    [growth, product, active],
  );

  const yields = useMemo(() => {
    if (growth.length < 2) return null;
    const first = growth[0].x;
    const last = growth[growth.length - 1].x;
    const finalP = product.length > 0 ? product[product.length - 1].p : 0;
    return substrateYields(
      {
        initial: Number(initialSubstrate.replace(/[^0-9.]/g, "")),
        final: Number(finalSubstrate.replace(/[^0-9.]/g, "")),
      },
      last,
      first,
      finalP,
    );
  }, [growth, product, initialSubstrate, finalSubstrate]);

  /** Observed points plus both fitted curves, for one chart. */
  const chartData = useMemo(() => {
    const times = [...new Set(growth.map((p) => p.t))].sort((a, b) => a - b);
    const logistic = fits.logistic;
    const gompertz = fits.gompertz;
    const prodAt = (t: number) => {
      if (product.length === 0) return undefined;
      let best = product[0];
      for (const p of product) if (Math.abs(p.t - t) < Math.abs(best.t - t)) best = p;
      return best.p;
    };
    return times.map((t) => ({
      t,
      observed: growth.find((p) => p.t === t)?.x,
      logistic: logistic ? logistic.curve.find((c) => c.t === t)?.predicted : undefined,
      gompertz: gompertz ? gompertz.curve.find((c) => c.t === t)?.predicted : undefined,
      product: prodAt(t),
    }));
  }, [growth, product, fits]);

  const report = useMemo(() => {
    if (!active) return "";
    return [
      `واحد زیست‌توده: ${unit}`,
      `مدل انتخابی: ${MODEL_LABELS[model]}`,
      `X0: ${active.X0.toFixed(4)}`,
      `Xmax: ${active.Xmax.toFixed(4)}`,
      `µmax: ${active.muMax.toFixed(4)} 1/h`,
      `زمان دو شدن: ${active.doublingTimeH.toFixed(3)} h`,
      `lag: ${active.lag.toFixed(3)} h`,
      `R²: ${active.r2.toFixed(5)}   RMSE: ${active.rmse.toFixed(5)}`,
      `مقایسهٔ مدل‌ها — لجستیک R²=${fits.logistic?.r2.toFixed(4) ?? "—"} / گامپرتز R²=${fits.gompertz?.r2.toFixed(4) ?? "—"}`,
      metrics
        ? [
            `بیشترین تیتر: ${metrics.peakProduct.toFixed(3)} در ساعت ${metrics.peakTime}`,
            `qP: ${metrics.qP.toFixed(4)} (تیتر بر ساعت)`,
            `بازده ویژه: ${metrics.specificProductivity.toFixed(4)}`,
            `بازده بر زیست‌توده: ${metrics.yieldOnBiomass != null ? metrics.yieldOnBiomass.toFixed(3) : "—"}`,
            `سهم وابسته به رشد: ${metrics.growthAssociated != null ? metrics.growthAssociated.toFixed(3) : "—"}`,
          ].join("\n")
        : "",
      yields
        ? [
            `ساب‌استرات مصرف‌شده: ${yields.substrateConsumed.toFixed(3)}`,
            `Yx/S: ${Number.isFinite(yields.YxS) ? yields.YxS.toFixed(3) : "—"}`,
            `Yp/S: ${Number.isFinite(yields.YpS) ? yields.YpS.toFixed(3) : "—"}`,
          ].join("\n")
        : "",
      ...active.warnings.map((w) => `هشدار برازش: ${w}`),
      ...(metrics?.warnings ?? []).map((w) => `هشدار تولید: ${w}`),
      ...(yields?.warnings ?? []).map((w) => `هشدار بازده: ${w}`),
    ]
      .filter(Boolean)
      .join("\n");
  }, [active, model, unit, fits, metrics, yields]);

  async function save() {
    if (!isAuthenticated) {
      toast.error("برای ذخیره در آزمایشگاه باید وارد حساب خود شوید.");
      return;
    }
    try {
      await addNote({ title: "آزمایشگاه تخمیر — برازش رشد", body: report });
      toast.success("نتیجه در آزمایشگاه ذخیره شد.");
    } catch {
      toast.error("ذخیرهٔ نتیجه ناموفق بود.");
    }
  }

  const betterModel =
    fits.logistic && fits.gompertz
      ? fits.logistic.r2 >= fits.gompertz.r2
        ? "logistic" as GrowthModel
        : "gompertz" as GrowthModel
      : null;

  return (
    <ToolShell
      title="آزمایشگاه تخمیر — برازش منحنی رشد"
      subtitle="داده‌های زمانی خودتان را وارد کنید تا پارامترهای سینتیکی استخراج شود. هر دو مدل کلاسیک به‌طور مستقل برازش داده می‌شوند تا ببینید کدام‌یک واقعاً با دادهٔ شما سازگار است."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-slate-700">
              سری زمانی رشد — هر خط: زمان (ساعت) , مقدار
            </Label>
            <textarea
              value={growthRaw}
              onChange={(e) => setGrowthRaw(e.target.value)}
              dir="ltr"
              spellCheck={false}
              className="min-h-[170px] w-full rounded-lg bg-white px-3 py-2 font-mono text-[11.5px] leading-5 ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
            <p className="text-[10px] leading-5 text-slate-500">
              {growth.length.toLocaleString("fa-IR")} نقطه وارد شده. نمونهٔ اولیه یک مثال است؛ آن را با
              دادهٔ خودتان جایگزین کنید.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-slate-700">
              سری زمانی محصول — هر خط: زمان (ساعت) , تیتر
            </Label>
            <textarea
              value={productRaw}
              onChange={(e) => setProductRaw(e.target.value)}
              dir="ltr"
              spellCheck={false}
              className="min-h-[130px] w-full rounded-lg bg-white px-3 py-2 font-mono text-[11.5px] leading-5 ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-slate-700">واحد اندازه‌گیری</Label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="h-9 w-full rounded-lg bg-white px-3 text-[12px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-slate-700">مدل برازش</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["logistic", "gompertz"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModel(m)}
                  className={`rounded-lg px-2.5 py-2 text-[11px] font-bold transition ${
                    model === m
                      ? "bg-emerald-500 text-white shadow"
                      : "bg-white text-slate-600 ring-1 ring-emerald-900/5 hover:bg-emerald-50"
                  }`}
                >
                  {MODEL_LABELS[m]}
                  {fits[m] && (
                    <span dir="ltr" className="mr-1 font-mono text-[9.5px] opacity-75">
                      R²={fits[m]!.r2.toFixed(4)}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {betterModel && betterModel !== model && (
              <p className="text-[10px] leading-5 text-slate-500">
                دادهٔ شما با مدل {MODEL_LABELS[betterModel]} بهتر برازش می‌شود.
              </p>
            )}
          </div>

          <div className="rounded-xl bg-white p-3 ring-1 ring-emerald-900/5">
            <p className="mb-2 text-[10px] font-bold text-slate-600">مقایسهٔ مدل‌ها</p>
            <div className="h-[210px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="t" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" width={38} />
                  <Tooltip
                    contentStyle={{ fontSize: 10, borderRadius: 8 }}
                    formatter={(value: number | string, name: string) => [
                      Number(value).toFixed(3),
                      String(name),
                    ]}
                  />
                  <Line dataKey="observed" name="observed" stroke="#0f172a" strokeWidth={2} dot={{ r: 2.5 }} />
                  <Line dataKey="logistic" name="logistic" stroke="#059669" strokeWidth={1.8} dot={false} />
                  <Line dataKey="gompertz" name="gompertz" stroke="#7c3aed" strokeWidth={1.8} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-[9.5px] leading-4 text-slate-400">
              نقطه‌های سیاه = دادهٔ مشاهده‌شده · خط سبز = برازش لجستیک · خط بنفش = برازش گامپرتز
            </p>
          </div>
        </div>
      </div>

      {/* Fit parameters */}
      {active && (
        <>
          <ResultBlock
            title={`پارامترهای برازش — ${MODEL_LABELS[model]}`}
            badge={
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  active.r2 > 0.95
                    ? "bg-emerald-100 text-emerald-800"
                    : active.r2 > 0.85
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                R² = {active.r2.toFixed(4)}
              </span>
            }
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <KV label="X₀ (زیست‌تودهٔ اولیه)" value={faNum(active.X0, 3)} />
              <KV label="Xmax" value={faNum(active.Xmax, 3)} />
              <KV label="µmax (1/h)" value={faNum(active.muMax, 4)} />
              <KV label="زمان دو شدن (h)" value={faNum(active.doublingTimeH, 3)} />
              <KV
                label="lag (h)"
                value={model === "gompertz" ? faNum(active.lag, 3) : "—"}
                hint={model === "logistic" ? "مدل لجستیک فاز تأخیر ندارد" : undefined}
              />
              <KV label="RMSE" value={faNum(active.rmse, 4)} />
              <KV label="زمان Half-max (h)" value={Number.isFinite(active.tAtHalfMax) ? faNum(active.tAtHalfMax, 2) : "—"} />
              <KV label="بیشترین مقدار مشاهده‌شده" value={faNum(active.maxObserved, 3)} />
            </div>

            {active.warnings.map((w, i) => (
              <p key={i} className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[10.5px] leading-5 text-amber-800">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                {w}
              </p>
            ))}
          </ResultBlock>

          {/* Model comparison table */}
          <ResultBlock title="کدام مدل با داده سازگارتر است؟">
            <DataTable headers={["مدل", "R²", "RMSE", "µmax", "Xmax", "lag"]}>
              {(["logistic", "gompertz"] as const).map((m) => {
                const f = fits[m];
                return (
                  <tr key={m} className={model === m ? "bg-emerald-50/60" : ""}>
                    <Td>{MODEL_LABELS[m]}</Td>
                    <Td mono>{f ? f.r2.toFixed(5) : "—"}</Td>
                    <Td mono>{f ? faNum(f.rmse, 4) : "—"}</Td>
                    <Td mono>{f ? faNum(f.muMax, 4) : "—"}</Td>
                    <Td mono>{f ? faNum(f.Xmax, 3) : "—"}</Td>
                    <Td mono>{f ? faNum(f.lag, 3) : "—"}</Td>
                  </tr>
                );
              })}
            </DataTable>
            <p className="text-[10px] leading-5 text-slate-500">
              هیچ‌کدام از این دو مدل «درست» نیستند؛ هر دو تقریب ریاضی‌اند. اگر اختلاف R² کم باشد،
              داده برای انتخاب قطعی بین این دو کافی نیست و هر دو توصیف قابل قبولی می‌دهند.
            </p>
          </ResultBlock>
        </>
      )}

      {/* Production metrics */}
      {metrics && (
        <ResultBlock title="شاخص‌های تولید محصول">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <KV label="بیشترین تیتر" value={faNum(metrics.peakProduct, 3)} hint={`در ساعت ${faNum(metrics.peakTime, 1)}`} />
            <KV label="تیتر پایانی" value={faNum(metrics.finalProduct, 3)} />
            <KV label="qP (تیتر بر ساعت)" value={faNum(metrics.qP, 4)} />
            <KV label="µmax مشاهده‌شده (1/h)" value={faNum(metrics.observedMuMax, 4)} />
            <KV label="زیست‌توده در اوج محصول" value={faNum(metrics.biomassAtPeak, 3)} />
            <KV label="بازده ویژهٔ تولید" value={faNum(metrics.specificProductivity, 4)} />
            <KV
              label="بازده بر زیست‌توده"
              value={metrics.yieldOnBiomass != null ? faNum(metrics.yieldOnBiomass, 3) : "—"}
            />
            <KV
              label="سهم وابسته به رشد"
              value={metrics.growthAssociated != null ? faNum(metrics.growthAssociated, 3) : "—"}
              hint={metrics.growthAssociated != null ? pct(metrics.growthAssociated) : undefined}
            />
          </div>
          <p className="text-[10px] leading-5 text-slate-500">
            qP از شیب خط بین مبدأ و نقطهٔ اوج تیتر به‌دست می‌آید — همان تعریف رایج بهره‌وری حجمی.
            «سهم وابسته به رشد» نسبت qP به حاصل‌ضرب µmax در Xmax است: اگر نزدیک ۱ باشد تولید
            عملاً با رشد هم‌بسته است و اگر خیلی کوچک باشد محصول عمدتاً در فاز سکون ساخته می‌شود.
          </p>
          {metrics.warnings.map((w, i) => (
            <p key={i} className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[10.5px] leading-5 text-amber-800">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              {w}
            </p>
          ))}
        </ResultBlock>
      )}

      {/* Substrate yields */}
      <ResultBlock title="مصرف ساب‌استرات و بازده">
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">ساب‌استرات اولیه (g/L)</Label>
              <input
                value={initialSubstrate}
                onChange={(e) => setInitialSubstrate(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                dir="ltr"
                className="h-9 w-full rounded-lg bg-white px-3 font-mono text-[12px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-slate-700">ساب‌استرات پایانی (g/L)</Label>
              <input
                value={finalSubstrate}
                onChange={(e) => setFinalSubstrate(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                dir="ltr"
                className="h-9 w-full rounded-lg bg-white px-3 font-mono text-[12px] ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          </div>

          {yields && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <KV label="ساب‌استرات مصرف‌شده" value={faNum(yields.substrateConsumed, 3)} />
                <KV label="کسر مصرف‌شده" value={pct(yields.fractionConsumed)} />
                <KV label="Yx/S (زیست‌توده بر ساب‌استرات)" value={Number.isFinite(yields.YxS) ? faNum(yields.YxS, 3) : "—"} />
                <KV label="Yp/S (محصول بر ساب‌استرات)" value={Number.isFinite(yields.YpS) ? faNum(yields.YpS, 3) : "—"} />
              </div>
              {yields.warnings.map((w, i) => (
                <p key={i} className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[10.5px] leading-5 text-amber-800">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  {w}
                </p>
              ))}
            </>
          )}
        </div>
      </ResultBlock>

      <div className="space-y-2 rounded-2xl border border-emerald-900/5 bg-emerald-50/50 p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-black text-emerald-800">
          <Info className="size-3.5" />
          این ابزار چه کار می‌کند و چه کار نمی‌کند
        </p>
        <ul className="space-y-1 pr-4 text-[10.5px] leading-5 text-slate-600">
          <li className="list-disc">
            هر دو مدل به روش کمترین مربعات برازش داده می‌شوند و هر دو با دادهٔ شما محاسبه می‌شوند؛
            نتیجه به یک انتخاب از پیش تعیین‌شده وابسته نیست.
          </li>
          <li className="list-disc">
            پارامترها «برازش» هستند، نه اندازه‌گیری مستقیم. اگر R² پایین باشد، هیچ‌کدام از
            پارامترها قابل استناد نیست و ابزار هشدار می‌دهد.
          </li>
          <li className="list-disc">
            بازده‌ها فقط از داده‌های مشاهده‌شدهٔ شما حساب می‌شوند؛ بازده تئوریک یا بازده مرجعی در
            این ابزار وجود ندارد.
          </li>
          <li className="list-disc">
            اثر دما، pH و اکسیژن بر رشد مستقیماً شبیه‌سازی نمی‌شود؛ این ابزار دادهٔ شما را تحلیل
            می‌کند، نه شرایط آزمایش را پیش‌بینی.
          </li>
        </ul>
      </div>

      {active && (
        <div className="flex flex-wrap gap-2">
          <SaveResultBtn onSave={save} />
          <DownloadBtn content={report} filename="genova-fermentation.txt" />
          <DownloadCsvBtn
            headers={["زمان h", "زیست‌تودهٔ مشاهده‌شده", "برازش لجستیک", "برازش گامپرتز"]}
            rows={chartData.map((r) => [
              r.t,
              r.observed?.toFixed(4) ?? "",
              r.logistic?.toFixed(4) ?? "",
              r.gompertz?.toFixed(4) ?? "",
            ])}
            filename="genova-fermentation.csv"
          />
        </div>
      )}
    </ToolShell>
  );
}