/**
 * Genova Virtual Lab — alignment tools
 * ─────────────────────────────────────────────────────────────────────────────
 * Two tools in the «همترازی» group:
 *
 *   • Pairwise Alignment — Needleman–Wunsch or Smith–Waterman on two
 *     sequences, rendered as a three-line alignment with a match ruler.
 *   • Sequence Similarity Calculator — identity, positives, transitions,
 *     transversions and gaps for both methods side by side.
 *
 * Both tools display the substitution scheme that produced their numbers.
 * There is no BLOSUM/nucleotide substitution matrix in this build, so the tool
 * never presents its score as a biological or evolutionary measurement.
 */
import { useCallback, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { ArrowLeftRight, GitCompare, Info, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CopyBtn,
  DataTable,
  DownloadBtn,
  KV,
  MiniBar,
  ResultBlock,
  SaveResultBtn,
  Td,
  ToolShell,
  pct,
} from "./proteinUi";
import {
  DEFAULT_SCORES,
  MAX_ALIGNMENT_LENGTH,
  METHOD_HINT,
  METHOD_LABEL,
  align,
  cleanAlignmentSequence,
  compareMethods,
  complement,
  similarityStats,
  type AlignMethod,
  type AlignmentResult,
  type ScoreScheme,
  type SimilarityStats,
} from "./alignmentCore";

const BLOCK = 60;

function ScoresBar({
  scores,
  onChange,
}: {
  scores: ScoreScheme;
  onChange: (next: ScoreScheme) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
      {(
        [
          { key: "match", label: "امتیاز تطابق" },
          { key: "mismatch", label: "امتیاز عدم تطابق" },
          { key: "gap", label: "جریمهٔ شکاف" },
        ] as const
      ).map((f) => (
        <label key={f.key} className="block w-28">
          <span className="mb-1 block text-[10px] text-slate-500">{f.label}</span>
          <Input
            type="number"
            step={1}
            value={scores[f.key]}
            onChange={(e) =>
              onChange({ ...scores, [f.key]: Number.parseInt(e.target.value, 10) || 0 })
            }
            className="h-8 text-[12px]"
          />
        </label>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...scores, allowAmbiguity: !scores.allowAmbiguity })}
        aria-pressed={scores.allowAmbiguity}
        className="h-8 cursor-pointer rounded-lg bg-white px-2.5 text-[11px] font-semibold text-slate-600 ring-1 ring-emerald-900/10 hover:bg-emerald-50"
      >
        {scores.allowAmbiguity ? "جایگزینی مجاز: متوسط (کد مبهم = ۰)" : "جایگزینی مجاز: خیر"}
      </button>
      <button
        type="button"
        onClick={() => onChange({ ...DEFAULT_SCORES })}
        className="h-8 cursor-pointer rounded-lg px-2 text-[11px] text-slate-500 underline-offset-2 hover:underline"
      >
        بازنشانی امتیازها
      </button>
    </div>
  );
}

function MethodPicker({
  value,
  onChange,
}: {
  value: AlignMethod;
  onChange: (next: AlignMethod) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {(["global", "local"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={cn(
              "cursor-pointer rounded-xl px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
              value === m
                ? "bg-emerald-700 text-white"
                : "bg-white text-slate-600 ring-1 ring-emerald-900/10 hover:bg-emerald-50",
            )}
          >
            {METHOD_LABEL[m]}
          </button>
        ))}
      </div>
      <p className="text-[10.5px] leading-5 text-slate-500">{METHOD_HINT[value]}</p>
    </div>
  );
}

function SeqBox({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  accent: "a" | "b";
}) {
  return (
    <label className="block flex-1">
      <span
        className={cn(
          "mb-1 block text-[11px] font-bold",
          accent === "a" ? "text-emerald-700" : "text-sky-700",
        )}
      >
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir="ltr"
        spellCheck={false}
        rows={4}
        placeholder="مثال: ATGGCCTGC..."
        className="w-full resize-y rounded-xl border border-emerald-900/10 bg-white p-2.5 font-mono text-[12px] leading-6 outline-none focus:border-emerald-300"
      />
      <span className="mt-1 block text-[10px] text-slate-400">
        {cleanAlignmentSequence(value, "dna").length.toLocaleString("fa-IR")} نوکلئوتید معتبر
      </span>
    </label>
  );
}

/** Three-line alignment viewer with a colour-coded ruler. */
function AlignmentView({ result, labelA, labelB }: { result: AlignmentResult; labelA: string; labelB: string }) {
  const blocks = Math.ceil(result.columns / BLOCK);
  return (
    <div className="max-h-[420px] space-y-3 overflow-auto rounded-xl bg-slate-950/95 p-3">
      {Array.from({ length: blocks }, (_, b) => {
        const s = b * BLOCK;
        const aChunk = result.alignedA.slice(s, s + BLOCK);
        const bChunk = result.alignedB.slice(s, s + BLOCK);
        const rChunk = result.ruler.slice(s, s + BLOCK);
        return (
          <div key={b} dir="ltr" className="space-y-0.5 font-mono text-[11.5px] leading-5">
            <div className="flex gap-2">
              <span className="w-16 shrink-0 select-none text-right text-[9.5px] text-slate-500">
                {labelA} {String(s + 1).padStart(5, " ")}
              </span>
              <span className="text-emerald-300">{aChunk}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-16 shrink-0" />
              <span className="text-slate-500">{rChunk}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-16 shrink-0 select-none text-right text-[9.5px] text-slate-500">
                {labelB} {String(s + 1).padStart(5, " ")}
              </span>
              <span className="text-sky-300">{bChunk}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatsGrid({ stats }: { stats: SimilarityStats }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <KV label="شباهت/همسانی" value={pct(stats.identity)} hint="ستون‌های کاملاً یکسان ÷ کل ستون‌ها" />
      <KV label="هویت بدون شکاف" value={pct(stats.identityNoGaps)} hint="ستون‌های یکسان ÷ ستون‌های بدون شکاف" />
      <KV label="تطابق دقیق" value={String(stats.identical)} />
      <KV label="عدم تطابق" value={String(stats.mismatches)} />
      <KV label="شکاف" value={String(stats.gaps)} hint={`${stats.gapPositions} ستون دوتای خالی`} />
      <KV label="موقعیت‌های مثبت (IUPAC)" value={String(stats.positives)} hint="کد مبهم سازگار، نه تطابق دقیق" />
      <KV label="ترنزیشن / ترنزورژن" value={`${stats.transitions} / ${stats.transversions}`} />
      <KV label="طولانی‌ترین رشتهٔ یکسان" value={String(stats.longestRun)} hint="تطابق پیاپی" />
    </div>
  );
}

function StatsBar({ stats }: { stats: SimilarityStats }) {
  return (
    <MiniBar
      data={[
        { label: "تطابق", value: stats.identical, caption: "تطابق" },
        { label: "مثبت", value: stats.positives, caption: "مثبت" },
        { label: "عدم تطابق", value: stats.mismatches, caption: "عدم تطابق" },
        { label: "شکاف", value: stats.gaps, caption: "شکاف" },
      ]}
      color="#0d9488"
      height={140}
    />
  );
}

function integrityNote() {
  return (
    <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2.5 text-[10.5px] leading-5 text-amber-800">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      امتیازهای جانشینی در این ابزار یک <strong>طرح امتیازدهی انتخابی</strong> هستند، نه یک ماتریس زیستی.
      هیچ ماتریسی مانند BLOSUM یا ماتریس نوکلئوتیدی مشتق‌شده از داده در سایت بارگذاری نشده، بنابراین عدد
      شباهت اینجا «درصد ستون‌های یکسان» است و نه فاصلهٔ تکاملی. برای مقایسه با پایگاه داده، BLAST لازم
      است.
    </p>
  );
}

// ── 1. PAIRWISE ALIGNMENT ───────────────────────────────────────────────────

export function PairwiseAlignTool() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [method, setMethod] = useState<AlignMethod>("local");
  const [scores, setScores] = useState<ScoreScheme>({ ...DEFAULT_SCORES });
  const { isAuthenticated } = useAuth();
  const addNote = useMutation(api.lab.addNote);

  const seqA = useMemo(() => cleanAlignmentSequence(a, "dna"), [a]);
  const seqB = useMemo(() => cleanAlignmentSequence(b, "dna"), [b]);
  const tooLong = seqA.length > MAX_ALIGNMENT_LENGTH || seqB.length > MAX_ALIGNMENT_LENGTH;
  const ready = seqA.length > 0 && seqB.length > 0 && !tooLong;

  const result = useMemo(
    () => (ready ? align(seqA, seqB, method, scores, "dna") : null),
    [ready, seqA, seqB, method, scores],
  );
  const stats = useMemo(
    () => (result ? similarityStats(result.alignedA, result.alignedB, "dna", method, scores) : null),
    [result, method, scores],
  );

  const fasta = useMemo(() => {
    if (!result) return "";
    const wrap = (s: string) => s.replace(/(.{60})/g, "$1\n");
    return [
      ">alignment_1 Smith-Waterman/Needleman-Wunsch",
      `>score=${result.score} identity=${(stats ? stats.identity * 100 : 0).toFixed(2)}%`,
      wrap(result.alignedA),
      ">",
      wrap(result.alignedB),
    ].join("\n");
  }, [result, stats]);

  const save = async () => {
    if (!isAuthenticated) {
      toast.error("برای ذخیره ابتدا وارد حساب شوید.");
      return;
    }
    if (!result || !stats) return;
    try {
      await addNote({
        title: "همترازی دو توالی",
        body: [
          `روش: ${METHOD_LABEL[method]}`,
          `طول A: ${seqA.length} · طول B: ${seqB.length}`,
          `امتیاز: ${result.score} · ستون‌ها: ${result.columns}`,
          `همسانی: ${(stats.identity * 100).toFixed(2)}%`,
          `طرح امتیازدهی: match=${scores.match}, mismatch=${scores.mismatch}, gap=${scores.gap}`,
          `بازهٔ پوشش: A ${result.startA}-${result.endA} · B ${result.startB}-${result.endB}`,
          "",
          "توجه: امتیازها پارامتر انتخابی کاربر هستند، نه ماتریس زیستی.",
        ].join("\n"),
        tags: ["lab", "alignment"],
      });
      toast.success("نتیجه در دفترچهٔ آزمایشگاه ذخیره شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    }
  };

  return (
    <ToolShell
      title="همترازی دو توالی"
      subtitle="با الگوریتم برنامه‌ریزی پویا، توالی‌ها را سراسری (Needleman–Wunsch) یا محلی (Smith–Waterman) همتراز می‌کند."
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <SeqBox label="توالی اول" value={a} onChange={setA} accent="a" />
          <button
            type="button"
            aria-label="جایگزینی دو توالی"
            onClick={() => {
              setA(b);
              setB(a);
            }}
            className="mb-6 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-emerald-900/10 hover:bg-emerald-50"
          >
            <ArrowLeftRight className="size-4" />
          </button>
          <SeqBox label="توالی دوم" value={b} onChange={setB} accent="b" />
        </div>

        <MethodPicker value={method} onChange={setMethod} />
        <ScoresBar scores={scores} onChange={setScores} />

        {tooLong && (
          <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-800">
            یکی از توالی‌ها بلندتر از {MAX_ALIGNMENT_LENGTH.toLocaleString("fa-IR")} نوکلئوتید است. همترازی
            دوطرفه با این طول مرورگر را قفل می‌کند؛ لطفاً بخش موردنظر را برش دهید.
          </p>
        )}

        {result && (
          <div className="flex flex-wrap items-center gap-2">
            <CopyBtn text={fasta} label="کپی همترازی" />
            <DownloadBtn
              content={`${fasta}\n\nscore=${result.score}\ncolumns=${result.columns}\nrangeA=${result.startA}-${result.endA}\nrangeB=${result.startB}-${result.endB}\nmatrix: match=${scores.match} mismatch=${scores.mismatch} gap=${scores.gap} ambiguity=${scores.allowAmbiguity}`}
              filename="pairwise-alignment.txt"
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-[11px]"
              onClick={() => {
                setA("");
                setB("");
              }}
            >
              <RotateCcw className="size-3" />
              بازنشانی
            </Button>
            <SaveResultBtn onSave={save} />
          </div>
        )}
      </div>

      {result && stats && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <KV label="امتیاز همترازی" value={String(result.score)} />
            <KV label="طول ستون‌ها" value={String(result.columns)} />
            <KV
              label="بازهٔ پوشش‌داده‌شده"
              value={
                method === "local"
                  ? `A: ${result.startA}–${result.endA} · B: ${result.startB}–${result.endB}`
                  : "کل توالی"
              }
            />
            <KV label="شباهت/همسانی" value={pct(stats.identity)} />
          </div>

          <ResultBlock title="نمایش همترازی">
            <AlignmentView result={result} labelA="A" labelB="B" />
            <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
              <span><span className="font-mono text-emerald-700">|</span> تطابق دقیق</span>
              <span><span className="font-mono text-amber-600">:</span> سازگار با کد مبهم</span>
              <span><span className="font-mono">-</span> شکاف</span>
            </div>
          </ResultBlock>
        </>
      )}

      {!ready && !tooLong && (
        <p className="rounded-2xl border border-dashed border-emerald-900/10 bg-emerald-50/40 px-4 py-6 text-center text-[12px] text-slate-500">
          هر دو توالی را وارد کنید تا همترازی محاسبه شود.
        </p>
      )}

      {integrityNote()}
    </ToolShell>
  );
}

// ── 2. SIMILARITY CALCULATOR ────────────────────────────────────────────────

export function SimilarityCalculatorTool() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [alphabet, setAlphabet] = useState<"dna" | "rna">("dna");
  const [scores, setScores] = useState<ScoreScheme>({ ...DEFAULT_SCORES });
  const { isAuthenticated } = useAuth();
  const addNote = useMutation(api.lab.addNote);

  const clean = useCallback(
    (raw: string) => cleanAlignmentSequence(raw, alphabet),
    [alphabet],
  );
  const seqA = useMemo(() => clean(a), [a, clean]);
  const seqB = useMemo(() => clean(b), [b, clean]);
  const tooLong = seqA.length > MAX_ALIGNMENT_LENGTH || seqB.length > MAX_ALIGNMENT_LENGTH;
  const ready = seqA.length > 0 && seqB.length > 0 && !tooLong;

  const both = useMemo(
    () => (ready ? compareMethods(seqA, seqB, alphabet, scores) : null),
    [ready, seqA, seqB, alphabet, scores],
  );

  const report = useMemo(() => {
    if (!both) return "";
    const lines = [
      "Sequence Similarity Report — Genova Virtual Lab",
      "================================================",
      `نوع توالی: ${alphabet.toUpperCase()}`,
      `طول توالی اول: ${seqA.length}`,
      `طول توالی دوم: ${seqB.length}`,
      `طرح امتیازدهی: match=${scores.match}, mismatch=${scores.mismatch}, gap=${scores.gap}, جایگزینی=${scores.allowAmbiguity ? "متوسط" : "غیرفعال"}`,
      "",
    ];
    for (const m of ["global", "local"] as const) {
      const s = both[m].stats;
      lines.push(
        `--- ${METHOD_LABEL[m]} ---`,
        `امتیاز: ${both[m].result.score}`,
        `ستون‌ها: ${s.columns}`,
        `شباهت/همسانی: ${(s.identity * 100).toFixed(2)}%`,
        `هویت بدون شکاف: ${(s.identityNoGaps * 100).toFixed(2)}%`,
        `تطابق دقیق: ${s.identical}`,
        `عدم تطابق: ${s.mismatches}`,
        `شکاف: ${s.gaps}`,
        `موقعیت مثبت (IUPAC): ${s.positives}`,
        `ترنزیشن: ${s.transitions}`,
        `ترنزورژن: ${s.transversions}`,
        "",
      );
    }
    lines.push("توجه: شباهت = ستون‌های کاملاً یکسان / کل ستون‌ها. این عدد فاصلهٔ تکاملی نیست.");
    return lines.join("\n");
  }, [both, alphabet, seqA.length, seqB.length, scores]);

  const saveSimilarity = async () => {
    if (!isAuthenticated) {
      toast.error("برای ذخیره ابتدا وارد حساب شوید.");
      return;
    }
    if (!both) return;
    try {
      await addNote({
        title: "محاسبهٔ شباهت توالی",
        body: [
          `نوع توالی: ${alphabet.toUpperCase()}`,
          `طول A: ${seqA.length} · طول B: ${seqB.length}`,
          `طرح امتیازدهی: match=${scores.match}, mismatch=${scores.mismatch}, gap=${scores.gap}`,
          "",
          ...(["global", "local"] as const).flatMap((m) => {
            const s = both[m].stats;
            return [
              `--- ${METHOD_LABEL[m]} ---`,
              `امتیاز: ${both[m].result.score} · ستون‌ها: ${s.columns}`,
              `همسانی: ${(s.identity * 100).toFixed(2)}% · بدون شکاف: ${(s.identityNoGaps * 100).toFixed(2)}%`,
              `تطابق=${s.identical} · مثبت=${s.positives} · عدم تطابق=${s.mismatches} · شکاف=${s.gaps}`,
              `ترنزیشن=${s.transitions} · ترنزورژن=${s.transversions}`,
            ];
          }),
        ].join("\n"),
        tags: ["lab", "alignment"],
      });
      toast.success("نتیجه در دفترچهٔ آزمایشگاه ذخیره شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود");
    }
  };

  return (
    <ToolShell
      title="محاسبه‌گر شباهت توالی"
      subtitle="هویت، تطابق دقیق، عدم تطابق و شکاف را برای هر دو روش سراسری و محلی هم‌زمان حساب می‌کند."
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <SeqBox label="توالی اول (Sequence A)" value={a} onChange={setA} accent="a" />
          <button
            type="button"
            aria-label="جایگزینی دو توالی"
            onClick={() => {
              setA(b);
              setB(a);
            }}
            className="mb-6 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-emerald-900/10 hover:bg-emerald-50"
          >
            <ArrowLeftRight className="size-4" />
          </button>
          <SeqBox label="توالی دوم (Sequence B)" value={b} onChange={setB} accent="b" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {(["dna", "rna"] as const).map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => setAlphabet(x)}
                className={cn(
                  "cursor-pointer rounded-xl px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
                  alphabet === x
                    ? "bg-emerald-700 text-white"
                    : "bg-white text-slate-600 ring-1 ring-emerald-900/10 hover:bg-emerald-50",
                )}
              >
                {x === "dna" ? "DNA/RNA — حالت DNA" : "DNA/RNA — حالت RNA"}
              </button>
            ))}
          </div>
          <span className="flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1.5 text-[11px] font-semibold text-violet-700">
            <GitCompare className="size-3.5" />
            روش محاسبه: هر دو (سراسری + محلی)
          </span>
          <ScoresBar scores={scores} onChange={setScores} />
        </div>

        {tooLong && (
          <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-800">
            یکی از توالی‌ها بلندتر از {MAX_ALIGNMENT_LENGTH.toLocaleString("fa-IR")} نوکلئوتید است.
          </p>
        )}

        {ready && (
          <div className="flex flex-wrap items-center gap-2">
            <CopyBtn text={report} label="کپی گزارش" />
            <DownloadBtn content={report} filename="sequence-similarity-report.txt" />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-[11px]"
              onClick={() => {
                setA("");
                setB("");
              }}
            >
              <RotateCcw className="size-3" />
              بازنشانی
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-[11px]"
              onClick={() => {
                setA(complement(a, alphabet));
                setB(complement(b, alphabet));
              }}
            >
              <Sparkles className="size-3" />
              مکمل معکوس هر دو
            </Button>
            <SaveResultBtn onSave={saveSimilarity} />
          </div>
        )}
      </div>

      {both && (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["global", "local"] as const).map((m) => (
              <div
                key={m}
                className="rounded-2xl border border-emerald-900/5 bg-slate-50/70 p-3"
              >
                <p className="mb-2 text-[11px] font-bold text-emerald-700">{METHOD_LABEL[m]}</p>
                <div className="grid grid-cols-2 gap-2">
                  <KV label="شباهت/همسانی" value={pct(both[m].stats.identity)} />
                  <KV label="امتیاز" value={String(both[m].result.score)} />
                </div>
                <div className="mt-2">
                  <StatsBar stats={both[m].stats} />
                </div>
              </div>
            ))}
          </div>

          <ResultBlock title="آمار تفصیلی — روش محلی">
            <StatsGrid stats={both.local.stats} />
          </ResultBlock>

          <ResultBlock title="آمار تفصیلی — روش سراسری">
            <StatsGrid stats={both.global.stats} />
          </ResultBlock>

          <ResultBlock title="مقایسهٔ دو روش">
            <DataTable headers={["شاخص", "سراسری", "محلی"]}>
              {(
                [
                  ["شباهت/همسانی", (s: SimilarityStats) => pct(s.identity)],
                  ["هویت بدون شکاف", (s: SimilarityStats) => pct(s.identityNoGaps)],
                  ["تطابق دقیق", (s: SimilarityStats) => String(s.identical)],
                  ["عدم تطابق", (s: SimilarityStats) => String(s.mismatches)],
                  ["شکاف", (s: SimilarityStats) => String(s.gaps)],
                  ["ستون‌ها", (s: SimilarityStats) => String(s.columns)],
                ] as [string, (s: SimilarityStats) => string][]
              ).map(([label, fn]) => (
                <tr key={label}>
                  <Td>{label}</Td>
                  <Td mono>{fn(both.global.stats)}</Td>
                  <Td mono>{fn(both.local.stats)}</Td>
                </tr>
              ))}
            </DataTable>
          </ResultBlock>
        </>
      )}

      {!ready && !tooLong && (
        <p className="rounded-2xl border border-dashed border-emerald-900/10 bg-emerald-50/40 px-4 py-6 text-center text-[12px] text-slate-500">
          دو توالی را وارد کنید تا شباهت محاسبه شود.
        </p>
      )}

      {integrityNote()}
    </ToolShell>
  );
}