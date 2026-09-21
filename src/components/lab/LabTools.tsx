/**
 * Genova Virtual Lab — interactive tools & simulators
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure client-side helpers that mirror what a student does at the bench:
 *   • calculators: dilution (C₁V₁ = C₂V₂), molarity, serial dilution, CFU, PCR mix
 *   • simulators: agarose gel electrophoresis, Gram-stain microscope, aseptic
 *     technique checklist
 *
 * Nothing here writes to the database — experiment progress and the lab
 * notebook are handled by `convex/lab.ts` (server validated) on the lab page.
 */
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calculator, CheckCircle2, Dna, Microscope, Pipette, TestTube2, Syringe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiInterpretButton } from "@/components/lab/BioAnalysisTools";
import { faNum } from "@/lib/format";
import { cn } from "@/lib/utils";

function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = "any",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-muted-foreground">{label}</span>
      <div className="relative">
        <Input
          dir="ltr"
          type="number"
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="text-left"
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

function ResultRow({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "primary" }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-bold", tone === "primary" && "text-violet-600 dark:text-violet-400")} dir="ltr">
        {value}
      </span>
    </div>
  );
}

const num = (raw: string, fallback = 0) => {
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
};

// ── Calculators ─────────────────────────────────────────────────────────────

function DilutionCalculator() {
  const [stock, setStock] = useState("100");
  const [target, setTarget] = useState("10");
  const [volume, setVolume] = useState("20");

  const c1 = num(stock);
  const c2 = num(target);
  const v2 = num(volume);
  const v1 = c1 > 0 ? (c2 * v2) / c1 : 0;
  const diluent = Math.max(0, v2 - v1);
  const valid = c1 > 0 && c2 > 0 && v2 > 0 && c2 <= c1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Pipette className="size-4 text-violet-500" />
          رقت محلول (C₁V₁ = C₂V₂)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="غلظت محلول مادر" value={stock} onChange={setStock} suffix="mg/mL" />
          <NumberField label="غلظت مورد نیاز" value={target} onChange={setTarget} suffix="mg/mL" />
          <NumberField label="حجم نهایی" value={volume} onChange={setVolume} suffix="mL" />
        </div>
        <div className="space-y-2">
          <ResultRow label="حجم محلول مادر" value={`${v1.toFixed(3)} mL`} tone="primary" />
          <ResultRow label="حجم حلال (آب/بافر)" value={`${diluent.toFixed(3)} mL`} />
        <AiInterpretButton resultText={`Dilution: C1=${stock} mg/mL, C2=${target} mg/mL, V2=${volume} mL → V1=${v1.toFixed(3)} mL, Diluent=${diluent.toFixed(3)} mL`} toolName="محاسبه رقت" />
        </div>
        {!valid ? (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            غلظت مادر باید بزرگ‌تر یا مساوی غلظت هدف باشد.
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {v1.toFixed(2)} میلی‌لیتر از محلول مادر بردار و با {diluent.toFixed(2)} میلی‌لیتر حلال به حجم
            {` ${v2}`} میلی‌لیتر برسان.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MolarityCalculator() {
  const [mass, setMass] = useState("5");
  const [mw, setMw] = useState("58.44");
  const [volume, setVolume] = useState("100");

  const m = num(mass);
  const mwValue = num(mw);
  const vMl = num(volume);
  const moles = mwValue > 0 ? m / mwValue : 0; // mg / (mg/mmol) = mmol
  const molarityMm = vMl > 0 ? (moles / vMl) * 1000 : 0;
  const molarityM = molarityMm / 1000;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <TestTube2 className="size-4 text-violet-500" />
          محاسبه غلظت مولی
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="جرم ماده" value={mass} onChange={setMass} suffix="mg" />
          <NumberField label="وزن مولکولی" value={mw} onChange={setMw} suffix="g/mol" />
          <NumberField label="حجم نهایی" value={volume} onChange={setVolume} suffix="mL" />
        </div>
        <div className="space-y-2">
          <ResultRow label="غلظت (mM)" value={`${molarityMm.toFixed(3)} mM`} tone="primary" />
          <ResultRow label="غلظت (M)" value={`${molarityM.toFixed(6)} M`} />
          <ResultRow label="مقدار ماده (mmol)" value={moles.toFixed(4)} />
        <AiInterpretButton resultText={`Molarity: Mass=${mass} mg, MW=${mw} g/mol, Volume=${volume} mL → ${molarityMm.toFixed(3)} mM (${molarityM.toFixed(6)} M)`} toolName="محاسبه غلظت مولی" />
        </div>
      </CardContent>
    </Card>
  );
}

function SerialDilutionCalculator() {
  const [start, setStart] = useState("1000");
  const [steps, setSteps] = useState("6");
  const [ratio, setRatio] = useState("10");

  const startValue = num(start);
  const stepCount = Math.max(0, Math.min(10, Math.round(num(steps))));
  const factor = Math.max(2, num(ratio, 10));
  const table = useMemo(
    () =>
      Array.from({ length: stepCount }, (_, index) => {
        const exponent = index + 1;
        return {
          label: `۱۰⁻${exponent}`,
          concentration: startValue / Math.pow(factor, exponent),
          transfer: factor === 10 ? "۱ به ۹" : `۱ به ${factor - 1}`,
        };
      }),
    [startValue, stepCount, factor],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Syringe className="size-4 text-violet-500" />
          سری رقت
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="غلظت اولیه" value={start} onChange={setStart} suffix="mg/mL" />
          <NumberField label="تعداد مرحله" value={steps} onChange={setSteps} step="1" />
          <NumberField label="ضریب رقت" value={ratio} onChange={setRatio} step="1" />
        </div>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-right font-medium">مرحله</th>
                <th className="px-3 py-2 text-right font-medium">نسبت انتقال</th>
                <th className="px-3 py-2 text-right font-medium">غلظت (mg/mL)</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row) => (
                <tr key={row.label} className="border-t">
                  <td className="px-3 py-1.5">{row.label}</td>
                  <td className="px-3 py-1.5">{row.transfer}</td>
                  <td className="px-3 py-1.5 font-medium" dir="ltr">
                    {row.concentration.toPrecision(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AiInterpretButton resultText={`Serial Dilution: Start=${start} mg/mL, ${stepCount} steps, factor=${factor} → ${table.map(r => `${r.label}: ${r.concentration.toPrecision(4)} mg/mL`).join(", ")}`} toolName="سری رقت" />
      </CardContent>
    </Card>
  );
}

function CfuCalculator() {
  const [colonies, setColonies] = useState("145");
  const [exponent, setExponent] = useState("5");
  const [plated, setPlated] = useState("0.1");

  const c = num(colonies);
  const exp = num(exponent);
  const v = num(plated, 0.1);
  const cfu = v > 0 ? c / (Math.pow(10, -exp) * v) : 0;
  const reliable = c >= 30 && c <= 300;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Microscope className="size-4 text-violet-500" />
          شمارش CFU
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="تعداد کلنی" value={colonies} onChange={setColonies} step="1" />
          <NumberField label="رقت (۱۰⁻ⁿ)" value={exponent} onChange={setExponent} step="1" />
          <NumberField label="حجم تلقیح" value={plated} onChange={setPlated} suffix="mL" />
        </div>
        <ResultRow label="بار میکروبی نمونه" value={`${cfu.toExponential(2)} CFU/mL`} tone="primary" />
        <AiInterpretButton resultText={`CFU: Colonies=${colonies}, Dilution=10^-${exponent}, Volume=${plated} mL → ${cfu.toExponential(2)} CFU/mL (${reliable ? "reliable" : "outside range"})`} toolName="شمارش CFU" />
        <div className="flex items-center gap-2">
          <Badge variant={reliable ? "secondary" : "outline"} className="rounded-full text-[10px]">
            {reliable ? "شمارش در محدوده معتبر (۳۰–۳۰۰)" : "خارج از محدوده معتبر — رقت را تغییر بده"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function MasterMixCalculator() {
  const [reactions, setReactions] = useState("16");
  const [perReaction, setPerReaction] = useState("25");
  const [overage, setOverage] = useState("10");

  const n = num(reactions);
  const per = num(perReaction);
  const extra = num(overage);
  const total = (n * per * (100 + extra)) / 100;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Calculator className="size-4 text-violet-500" />
          مستر‌میکس PCR
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="تعداد واکنش" value={reactions} onChange={setReactions} step="1" />
          <NumberField label="حجم هر واکنش" value={perReaction} onChange={setPerReaction} suffix="µL" />
          <NumberField label="اضافه احتیاطی" value={overage} onChange={setOverage} suffix="%" />
        </div>
        <ResultRow label="حجم کل مستر‌میکس" value={`${total.toFixed(1)} µL`} tone="primary" />
        <ResultRow label="حجم هر واکنش (با احتیاط)" value={`${((total / (n || 1)) || 0).toFixed(1)} µL`} />
        <AiInterpretButton resultText={`MasterMix: ${reactions} reactions × ${perReaction} µL + ${overage}% overage → Total ${total.toFixed(1)} µL`} toolName="مستر‌میکس PCR" />
      </CardContent>
    </Card>
  );
}

// ── Simulators ──────────────────────────────────────────────────────────────

const LADDER = [10000, 5000, 3000, 2000, 1500, 1000, 500, 100];

function GelSimulator() {
  const [samples, setSamples] = useState<{ name: string; bp: number }[]>([
    { name: "نمونه ۱", bp: 1500 },
    { name: "نمونه ۲", bp: 800 },
  ]);
  const [nextBp, setNextBp] = useState("1200");
  const [nextName, setNextName] = useState("نمونه ۳");

  // Agarose migration: smaller fragments travel further (log scale).
  const position = (bp: number) => {
    const min = Math.log10(100);
    const max = Math.log10(10000);
    const value = Math.min(max, Math.max(min, Math.log10(bp)));
    return ((max - value) / (max - min)) * 100; // 0% = wells (top), 100% = bottom
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Dna className="size-4 text-violet-500" />
          شبیه‌ساز الکتروفورز ژل آگارز
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-28">
            <NumberField label="اندازه (bp)" value={nextBp} onChange={setNextBp} step="1" />
          </div>
          <div className="w-32">
            <label className="block">
              <span className="mb-1 block text-[11px] text-muted-foreground">نام نمونه</span>
              <Input value={nextName} onChange={(event) => setNextName(event.target.value)} />
            </label>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const bp = Math.round(num(nextBp, 0));
              if (bp < 100 || bp > 10000) return;
              setSamples((prev) => [
                ...prev.slice(-4),
                { name: nextName || `نمونه ${prev.length + 1}`, bp },
              ]);
            }}
          >
            افزودن به ژل
          </Button>
          <Button variant="ghost" onClick={() => setSamples([])}>
            پاک کردن
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-2xl border bg-slate-950/80 p-3">
          <div className="flex gap-3">
            {/* Ladder lane */}
            <div className="relative h-64 w-14 shrink-0 rounded-lg bg-slate-900/60">
              <p className="absolute -top-0.5 left-0 right-0 text-center text-[9px] text-slate-400">Ladder</p>
              {LADDER.map((bp) => (
                <motion.div
                  key={bp}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute left-1 right-1 h-[3px] rounded bg-violet-400/80"
                  style={{ top: `${8 + position(bp) * 0.82}%` }}
                />
              ))}
            </div>

            {/* Samples */}
            <div className="flex flex-1 gap-3">
              {samples.length === 0 ? (
                <p className="flex flex-1 items-center justify-center text-[11px] text-slate-400">
                  نمونه‌ای روی ژل نیست — یک قطعه DNA اضافه کن.
                </p>
              ) : (
                samples.map((sample, index) => (
                  <div key={`${sample.name}-${index}`} className="relative h-64 w-14 rounded-lg bg-slate-900/60">
                    <p className="absolute -top-0.5 left-0 right-0 text-center text-[9px] text-slate-400">
                      {sample.name}
                    </p>
                    <motion.div
                      initial={{ y: -30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="absolute left-1 right-1 h-[5px] rounded bg-gradient-to-l from-teal-300 to-violet-300 shadow-[0_0_10px_rgba(167,139,250,0.8)]"
                      style={{ top: `${8 + position(sample.bp) * 0.82}%` }}
                    />
                    <p
                      className="absolute bottom-0.5 left-0 right-0 text-center text-[9px] font-medium text-teal-300"
                      dir="ltr"
                    >
                      {sample.bp}bp
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          قطعات کوچک‌تر سریع‌تر و دورتر مهاجرت می‌کنند؛ جای باند هر نمونه را با نردبان مقایسه کن تا اندازه را
          تخمین بزنی.
        </p>
      </CardContent>
    </Card>
  );
}

const SPECIMENS = [
  { id: "gpos-cocci", name: "کوکسی گرم‌مثبت", color: "#a78bfa", shape: "cocci", gram: "گرم‌مثبت" },
  { id: "gneg-bacilli", name: "باسیل گرم‌منفی", color: "#f472b6", shape: "rod", gram: "گرم‌منفی" },
  { id: "yeast", name: "مخمر", color: "#fcd34d", shape: "yeast", gram: "قارچ" },
  { id: "spore", name: "باسیل اسپوردار", color: "#34d399", shape: "spore", gram: "گرم‌مثبت" },
];

function MicroscopeSimulator() {
  const [specimenId, setSpecimenId] = useState(SPECIMENS[0].id);
  const [zoom, setZoom] = useState([60]);
  const specimen = SPECIMENS.find((item) => item.id === specimenId) ?? SPECIMENS[0];

  const fieldCount = specimen.shape === "yeast" ? 10 : 22;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Microscope className="size-4 text-violet-500" />
          شبیه‌ساز میکروسکوپ (رنگ‌آمیزی گرم)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {SPECIMENS.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={item.id === specimenId ? "default" : "outline"}
              onClick={() => setSpecimenId(item.id)}
            >
              {item.name}
            </Button>
          ))}
        </div>

        <div className="relative aspect-square overflow-hidden rounded-full border-4 border-slate-800 bg-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.14),transparent_65%)]" />
          {Array.from({ length: fieldCount }).map((_, index) => {
            const angle = index * 2.399;
            const radius = 8 + (index / fieldCount) * 30;
            const left = 50 + Math.cos(angle) * radius;
            const top = 50 + Math.sin(angle) * radius;
            const size = (specimen.shape === "yeast" ? 9 : 5) * (zoom[0] / 60);
            const isRod = specimen.shape === "rod" || specimen.shape === "spore";
            return (
              <motion.span
                key={index}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.02 }}
                className={cn("absolute block", isRod ? "rounded-sm" : "rounded-full")}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: isRod ? `${size * 2}px` : `${size}px`,
                  height: `${size}px`,
                  background: specimen.color,
                  opacity: 0.9,
                  boxShadow: `0 0 8px ${specimen.color}88`,
                }}
              />
            );
          })}
          <span className="absolute bottom-3 left-0 right-0 text-center text-[10px] text-slate-300">
            {specimen.name} · {specimen.gram} · بزرگ‌نمایی {faNum(Math.round(zoom[0] * 1.66))}×
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">بزرگ‌نمایی</span>
          <Slider value={zoom} min={20} max={100} step={1} onValueChange={setZoom} className="flex-1" />
        </div>
      </CardContent>
    </Card>
  );
}

const ASEPTIC_STEPS = [
  "دست‌ها را شسته و با الکل ۷۰٪ ضدعفونی کردم",
  "سطح میز کار و لامپ UV هود را پاک کردم",
  "وسایل فلزی را روی شعله استریل (سرخ) کردم",
  "درپوش پلیت را فقط در حد لازم باز نگه داشتم",
  "کار را در شعله و جریان هوا انجام دادم",
  "پس از پایان کار پلیت‌ها را با برچسب و تاریخ انکوباتور گذاشتم",
];

function AsepticChecklist() {
  const [checked, setChecked] = useState<boolean[]>(() => ASEPTIC_STEPS.map(() => false));
  const done = checked.filter(Boolean).length;
  const complete = done === ASEPTIC_STEPS.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="size-4 text-violet-500" />
          چک‌لیست تکنیک آسپتیک
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {ASEPTIC_STEPS.map((step, index) => (
          <button
            key={step}
            type="button"
            onClick={() =>
              setChecked((prev) => prev.map((value, i) => (i === index ? !value : value)))
            }
            className={cn(
              "flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-right text-xs transition-colors",
              checked[index]
                ? "border-violet-400 bg-violet-50 dark:bg-violet-950/40"
                : "hover:bg-muted/50",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border text-[10px]",
                checked[index] ? "border-violet-500 bg-violet-500 text-white" : "border-muted-foreground/40",
              )}
            >
              {checked[index] ? "✓" : ""}
            </span>
            <span className="flex-1 leading-5">{step}</span>
          </button>
        ))}
        <div className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-[11px]">
          وضعیت: {faNum(done)} از {faNum(ASEPTIC_STEPS.length)} مرحله انجام شده
          {complete ? " — آماده کار در هود! 🧪" : ""}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Tabs shell ──────────────────────────────────────────────────────────────

export function LabTools() {
  return (
    <Tabs defaultValue="calculators" className="gap-4">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="calculators">ابزارهای محاسباتی</TabsTrigger>
        <TabsTrigger value="simulators">شبیه‌سازها</TabsTrigger>
      </TabsList>

      <TabsContent value="calculators" className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <DilutionCalculator />
          <MolarityCalculator />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <SerialDilutionCalculator />
          <div className="space-y-4">
            <CfuCalculator />
            <MasterMixCalculator />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="simulators" className="space-y-4">
        <GelSimulator />
        <div className="grid gap-4 lg:grid-cols-2">
          <MicroscopeSimulator />
          <AsepticChecklist />
        </div>
      </TabsContent>
    </Tabs>
  );
}
