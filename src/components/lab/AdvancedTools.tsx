/**
 * Advanced Bioinformatics Tools for Genova Virtual Lab
 * ──────────────────────────────────────────────────────
 * ORF Finder · 6-Frame Translation · Sequence Alignment
 * Format Converter · PCR Simulator · Codon Usage
 * GC/AT Skew · Chi-Square Test · Probe Designer
 */
import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Dna,
  Search,
  ArrowRightLeft,
  Beaker,
  BarChart3,
  Shield,
  Thermometer,
  Zap,
  Download,
  Copy,
  RotateCcw,
  Target,
  CheckCircle,
  AlertTriangle,
  Info,
  FileSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AiInterpretButton } from "./BioAnalysisTools";

// ═══════════════════════════════════════════════════════════════════════════════
//  SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function cleanSeq(raw: string): string {
  return raw.replace(/[^A-Za-zATUGCRYSWKMBDHVN]/g, "").toUpperCase();
}

function downloadFile(name: string, content: string, mime = "text/plain") {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function copyText(text: string) {
  navigator.clipboard.writeText(text);
}

// Genetic code table (standard)
const CODON_TABLE: Record<string, string> = {
  TTT: "F", TTC: "F", TTA: "L", TTG: "L", CTT: "L", CTC: "L", CTA: "L", CTG: "L",
  ATT: "I", ATC: "I", ATA: "I", ATG: "M", GTT: "V", GTC: "V", GTA: "V", GTG: "V",
  TCT: "S", TCC: "S", TCA: "S", TCG: "S", CCT: "P", CCC: "P", CCA: "P", CCG: "P",
  ACT: "T", ACC: "T", ACA: "T", ACG: "T", GCT: "A", GCC: "A", GCA: "A", GCG: "A",
  TAT: "Y", TAC: "Y", TAA: "*", TAG: "*", CAT: "H", CAC: "H", CAA: "Q", CAG: "Q",
  AAT: "N", AAC: "N", AAA: "K", AAG: "K", GAT: "D", GAC: "D", GAA: "E", GAG: "E",
  TGT: "C", TGC: "C", TGA: "*", TGG: "W", CGT: "R", CGC: "R", CGA: "R", CGG: "R",
  AGT: "S", AGC: "S", AGA: "R", AGG: "R", GGT: "G", GGC: "G", GGA: "G", GGG: "G",
};

function complementDNA(seq: string): string {
  const map: Record<string, string> = { A: "T", T: "A", G: "C", C: "G" };
  return seq
    .split("")
    .map((c) => map[c] ?? "N")
    .join("");
}

function reverseComplementDNA(seq: string): string {
  return complementDNA(seq).split("").reverse().join("");
}

function transcribeDNAtoRNA(dna: string): string {
  return dna.replace(/T/g, "U");
}

function translateFrame(seq: string, frame: number): string {
  let protein = "";
  for (let i = frame; i + 2 < seq.length; i += 3) {
    const codon = seq.slice(i, i + 3);
    protein += CODON_TABLE[codon] ?? "X";
  }
  return protein;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function ResultBlock({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "lab-card rounded-xl border p-4",
        "border-indigo-500/10 bg-indigo-500/[0.03]",
        className,
      )}
    >
      <h3 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-indigo-400/70">
        {title}
      </h3>
      {children}
    </motion.div>
  );
}

function StatBadge({
  label,
  value,
  color = "indigo",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border px-3 py-2 text-center",
        "border-white/[0.04] bg-white/[0.02]",
      )}
    >
      <span className="text-[18px] font-bold text-white">{value}</span>
      <span className="text-[9px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </span>
    </div>
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 5,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      dir="ltr"
      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 font-mono text-[12px] text-white/80 placeholder:text-white/15 focus:border-indigo-500/40 focus:bg-white/[0.05] focus:outline-none"
    />
  );
}

function ActionBtns({
  onDownload,
  onCopy,
  downloadName,
  downloadContent,
  onReset,
}: {
  onDownload?: () => void;
  onCopy?: () => void;
  downloadName?: string;
  downloadContent?: string;
  onReset?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {onDownload && (
        <Button
          onClick={() => {
            if (downloadName && downloadContent) {
              downloadFile(downloadName, downloadContent);
            }
            onDownload();
          }}
          size="sm"
          variant="outline"
          className="gap-1.5 border-white/[0.06] bg-white/[0.03] text-[11px] text-white/50 hover:bg-white/[0.06] hover:text-white/80"
        >
          <Download className="size-3" />
          دانلود
        </Button>
      )}
      {onCopy && (
        <Button
          onClick={onCopy}
          size="sm"
          variant="outline"
          className="gap-1.5 border-white/[0.06] bg-white/[0.03] text-[11px] text-white/50 hover:bg-white/[0.06] hover:text-white/80"
        >
          <Copy className="size-3" />
          کپی
        </Button>
      )}
      {onReset && (
        <Button
          onClick={onReset}
          size="sm"
          variant="outline"
          className="gap-1.5 border-white/[0.06] bg-white/[0.03] text-[11px] text-white/50 hover:bg-white/[0.06] hover:text-white/80"
        >
          <RotateCcw className="size-3" />
          Reset
        </Button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  1. ORF FINDER & 6-FRAME TRANSLATION
// ═══════════════════════════════════════════════════════════════════════════════

export function OrfFinderTool() {
  const [seq, setSeq] = useState("");
  const [minLen, setMinLen] = useState(30);
  const [results, setResults] = useState<{
    orfs: Array<{ frame: number; start: number; end: number; length: number; protein: string; isLongest: boolean }>;
    translations: string[];
    revComp: string;
  } | null>(null);

  const analyze = useCallback(() => {
    const dna = cleanSeq(seq);
    if (dna.length < 3) return;

    const revComp = reverseComplementDNA(dna);
    const allSeqs = [
      { seq: dna, frame: 1, label: "Frame +1" },
      { seq: dna, frame: 2, label: "Frame +2" },
      { seq: dna, frame: 3, label: "Frame +3" },
      { seq: revComp, frame: 4, label: "Frame -1" },
      { seq: revComp, frame: 5, label: "Frame -2" },
      { seq: revComp, frame: 6, label: "Frame -3" },
    ];

    const orfs: Array<{
      frame: number;
      start: number;
      end: number;
      length: number;
      protein: string;
      isLongest: boolean;
    }> = [];

    for (const { seq: s, frame } of allSeqs) {
      let inOrf = false;
      let orfStart = 0;
      let orfProtein = "";

      for (let i = 0; i + 2 < s.length; i += 3) {
        const codon = s.slice(i, i + 3);
        const aa = CODON_TABLE[codon] ?? "X";

        if (aa === "M" && !inOrf) {
          inOrf = true;
          orfStart = i;
          orfProtein = "M";
        } else if (inOrf) {
          orfProtein += aa;
          if (aa === "*" || i + 3 >= s.length) {
            if (orfProtein.length - 1 >= minLen / 3) {
              orfs.push({
                frame,
                start: orfStart,
                end: i + 3,
                length: orfProtein.length - 1,
                protein: orfProtein.slice(0, -1),
                isLongest: false,
              });
            }
            inOrf = false;
          }
        }
      }
      // Handle unclosed ORFs
      if (inOrf && orfProtein.length - 1 >= minLen / 3) {
        orfs.push({
          frame,
          start: orfStart,
          end: s.length,
          length: orfProtein.length - 1,
          protein: orfProtein,
          isLongest: false,
        });
      }
    }

    // Mark longest per frame
    const byFrame = new Map<number, typeof orfs>();
    for (const o of orfs) {
      if (!byFrame.has(o.frame)) byFrame.set(o.frame, []);
      byFrame.get(o.frame)!.push(o);
    }
    for (const frameOrfs of byFrame.values()) {
      const maxLen = Math.max(...frameOrfs.map((o) => o.length));
      for (const o of frameOrfs) {
        if (o.length === maxLen) o.isLongest = true;
      }
    }

    const translations = allSeqs.map(({ seq: s, frame }) => {
      const offset = (frame - 1) % 3;
      return `${allSeqs[frame - 1].label}:\n${translateFrame(s, offset)}`;
    });

    setResults({ orfs, translations, revComp });
  }, [seq, minLen]);

  const reset = () => {
    setSeq("");
    setResults(null);
  };

  const resultText = results
    ? `ORF Finder Results:\nTotal ORFs: ${results.orfs.length}\n${results.orfs.map((o) => `Frame ${o.frame}: pos ${o.start}-${o.end}, ${o.length}aa`).join("\n")}\nTranslations:\n${results.translations.join("\n\n")}`
    : "";

  return (
    <div className="space-y-4">
      <ResultBlock title="🧬 یافتن ORF و ترجمه ۶ فریم">
        <p className="mb-3 text-[11px] text-white/40">
          توالی DNA وارد کنید. Open Reading Frameها شناسایی و ترجمه ۶ فریم خوانش نمایش داده می‌شود.
        </p>
        <TextArea
          value={seq}
          onChange={setSeq}
          placeholder="ATGGCTAGCTCGATCGATCGATCG..."
          rows={4}
        />
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-medium text-white/30">
              حداقل طول آمینه اسید:
            </label>
            <input
              type="number"
              value={minLen}
              onChange={(e) => setMinLen(Number(e.target.value) || 30)}
              className="w-20 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-center text-[12px] text-white/80 focus:border-indigo-500/40 focus:outline-none"
            />
          </div>
          <Button onClick={analyze} disabled={!seq.trim()} className="gap-1.5 bg-indigo-600 text-[11px] text-white hover:bg-indigo-500">
            <Search className="size-3" /> جستجوی ORF
          </Button>
          <Button onClick={reset} size="sm" variant="outline" className="gap-1.5 border-white/[0.06] bg-white/[0.03] text-[11px] text-white/40">
            <RotateCcw className="size-3" /> Reset
          </Button>
        </div>
      </ResultBlock>

      {results && (
        <>
          <div className="flex flex-wrap gap-2">
            <StatBadge label="ORF یافت شده" value={String(results.orfs.length)} />
            <StatBadge label="طول توالی" value={String(cleanSeq(seq).length)} />
            <StatBadge label="逆转互补" value={`${results.revComp.length}bp`} />
          </div>

          {results.orfs.length > 0 && (
            <ResultBlock title="🎯 ORFهای شناسایی شده">
              <div className="space-y-2">
                {results.orfs.map((orf, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-3 text-[11px]",
                      orf.isLongest
                        ? "border-emerald-500/30 bg-emerald-500/[0.05]"
                        : "border-white/[0.04] bg-white/[0.02]",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-indigo-500/20 text-[9px] text-indigo-300">
                        فریم {orf.frame}
                      </Badge>
                      <span className="font-mono text-white/50">
                        {orf.start}–{orf.end}
                      </span>
                      <Badge className="bg-cyan-500/20 text-[9px] text-cyan-300">
                        {orf.length} aa
                      </Badge>
                      {orf.isLongest && (
                        <Badge className="bg-emerald-500/20 text-[9px] text-emerald-300">
                          طولانی‌ترین
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 font-mono text-[10px] break-all text-white/40">
                      {orf.protein}
                    </div>
                  </div>
                ))}
              </div>
            </ResultBlock>
          )}

          <ResultBlock title="🔄 ترجمه ۶ فریم">
            <div className="space-y-3">
              {results.translations.map((t, i) => (
                <div key={i}>
                  <p className="mb-1 text-[10px] font-bold text-white/30">{t.split(":\n")[0]}</p>
                  <div className="max-h-32 overflow-y-auto rounded-lg bg-black/30 p-2 font-mono text-[10px] break-all text-white/40 lab-scrollbar">
                    {t.split(":\n")[1]}
                  </div>
                </div>
              ))}
            </div>
          </ResultBlock>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => downloadFile("orf_results.txt", `ORF Results\nLength: ${cleanSeq(seq).length}\n\nORFs:\n${results.orfs.map((o) => `Frame ${o.frame}: pos ${o.start}-${o.end}, ${o.length}aa`).join("\n")}\n\nTranslations:\n${results.translations.join("\n\n")}`)}
              size="sm"
              variant="outline"
              className="gap-1.5 border-white/[0.06] bg-white/[0.03] text-[11px] text-white/50 hover:bg-white/[0.06]"
            >
              <Download className="size-3" /> دانلود نتایج
            </Button>
            <Button
              onClick={() => copyText(resultText)}
              size="sm"
              variant="outline"
              className="gap-1.5 border-white/[0.06] bg-white/[0.03] text-[11px] text-white/50 hover:bg-white/[0.06]"
            >
              <Copy className="size-3" /> کپی
            </Button>
          </div>

          <AiInterpretButton resultText={resultText} toolName="یافتن ORF و ترجمه ۶ فریم" />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  2. SEQUENCE ALIGNMENT (Needleman-Wunsch)
// ═══════════════════════════════════════════════════════════════════════════════

export function SequenceAlignmentTool() {
  const [seq1, setSeq1] = useState("");
  const [seq2, setSeq2] = useState("");
  const [match, setMatch] = useState(1);
  const [mismatch, setMismatch] = useState(-1);
  const [gap, setGap] = useState(-2);
  const [result, setResult] = useState<{
    aligned1: string;
    aligned2: string;
    identity: number;
    score: number;
    matchStr: string;
  } | null>(null);

  const align = useCallback(() => {
    const s1 = cleanSeq(seq1);
    const s2 = cleanSeq(seq2);
    if (!s1 || !s2) return;

    const n = s1.length;
    const m = s2.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    const trace: number[][][] = Array.from({ length: n + 1 }, () =>
      Array.from({ length: m + 1 }, () => []),
    );

    for (let i = 1; i <= n; i++) dp[i][0] = dp[i - 1][0] + gap;
    for (let j = 1; j <= m; j++) dp[0][j] = dp[0][j - 1] + gap;

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const sc = s1[i - 1] === s2[j - 1] ? match : mismatch;
        const diag = dp[i - 1][j - 1] + sc;
        const up = dp[i - 1][j] + gap;
        const left = dp[i][j - 1] + gap;
        const max = Math.max(diag, up, left);
        dp[i][j] = max;
        if (max === diag) trace[i][j].push(0);
        if (max === up) trace[i][j].push(1);
        if (max === left) trace[i][j].push(2);
      }
    }

    // Traceback
    let a1 = "";
    let a2 = "";
    let i = n;
    let j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && trace[i][j].includes(0) && dp[i][j] === dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? match : mismatch)) {
        a1 = s1[i - 1] + a1;
        a2 = s2[j - 1] + a2;
        i--;
        j--;
      } else if (i > 0 && trace[i][j].includes(1) && dp[i][j] === dp[i - 1][j] + gap) {
        a1 = s1[i - 1] + a1;
        a2 = "-" + a2;
        i--;
      } else if (j > 0) {
        a1 = "-" + a1;
        a2 = s2[j - 1] + a2;
        j--;
      } else {
        break;
      }
    }

    let matches = 0;
    let matchStr = "";
    for (let k = 0; k < a1.length; k++) {
      if (a1[k] === a2[k] && a1[k] !== "-") {
        matches++;
        matchStr += "|";
      } else {
        matchStr += " ";
      }
    }

    setResult({
      aligned1: a1,
      aligned2: a2,
      identity: Math.round((matches / Math.max(n, m)) * 100),
      score: dp[n][m],
      matchStr,
    });
  }, [seq1, seq2, match, mismatch, gap]);

  const reset = () => {
    setSeq1("");
    setSeq2("");
    setResult(null);
  };

  const resultText = result
    ? `Alignment Results:\nIdentity: ${result.identity}%\nScore: ${result.score}\n\nSeq1: ${result.aligned1}\n      ${result.matchStr}\nSeq2: ${result.aligned2}`
    : "";

  return (
    <div className="space-y-4">
      <ResultBlock title="🔄 همترازی توالی (Needleman-Wunsch)">
        <p className="mb-3 text-[11px] text-white/40">
          دو توالی DNA یا پروتئین وارد کنید. همترازی جهانی (Global Alignment) انجام می‌شود.
        </p>
        <div className="space-y-3">
          <TextArea value={seq1} onChange={setSeq1} placeholder="توالی اول (Query)..." rows={3} />
          <TextArea value={seq2} onChange={setSeq2} placeholder="توالی دوم (Subject)..." rows={3} />
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-medium text-white/30">Match:</label>
            <input type="number" value={match} onChange={(e) => setMatch(Number(e.target.value) || 1)}
              className="w-16 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 text-center text-[12px] text-white/80 focus:border-indigo-500/40 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-white/30">Mismatch:</label>
            <input type="number" value={mismatch} onChange={(e) => setMismatch(Number(e.target.value) || -1)}
              className="w-16 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 text-center text-[12px] text-white/80 focus:border-indigo-500/40 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-white/30">Gap:</label>
            <input type="number" value={gap} onChange={(e) => setGap(Number(e.target.value) || -2)}
              className="w-16 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 text-center text-[12px] text-white/80 focus:border-indigo-500/40 focus:outline-none" />
          </div>
          <Button onClick={align} disabled={!seq1.trim() || !seq2.trim()} className="gap-1.5 bg-indigo-600 text-[11px] text-white hover:bg-indigo-500">
            <ArrowRightLeft className="size-3" /> همترازی
          </Button>
          <Button onClick={reset} size="sm" variant="outline" className="gap-1.5 border-white/[0.06] bg-white/[0.03] text-[11px] text-white/40">
            <RotateCcw className="size-3" /> Reset
          </Button>
        </div>
      </ResultBlock>

      {result && (
        <>
          <div className="flex flex-wrap gap-2">
            <StatBadge label="Identity" value={`${result.identity}%`} />
            <StatBadge label="Score" value={String(result.score)} />
            <StatBadge label="طول" value={String(result.aligned1.length)} />
          </div>

          <ResultBlock title="📊 نتیجه همترازی">
            <div className="overflow-x-auto">
              <div className="min-w-[300px] space-y-1 font-mono text-[11px]">
                <div>
                  <span className="inline-block w-8 text-white/20">Seq1:</span>
                  <span className="text-cyan-300 break-all">{result.aligned1}</span>
                </div>
                <div>
                  <span className="inline-block w-8 text-white/20">{"    "}</span>
                  <span className="text-emerald-400">{result.matchStr}</span>
                </div>
                <div>
                  <span className="inline-block w-8 text-white/20">Seq2:</span>
                  <span className="text-amber-300 break-all">{result.aligned2}</span>
                </div>
              </div>
            </div>
          </ResultBlock>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadFile("alignment.txt", resultText)} size="sm" variant="outline" className="gap-1.5 border-white/[0.06] bg-white/[0.03] text-[11px] text-white/50 hover:bg-white/[0.06]">
              <Download className="size-3" /> دانلود
            </Button>
            <Button onClick={() => copyText(resultText)} size="sm" variant="outline" className="gap-1.5 border-white/[0.06] bg-white/[0.03] text-[11px] text-white/50 hover:bg-white/[0.06]">
              <Copy className="size-3" /> کپی
            </Button>
          </div>

          <AiInterpretButton resultText={resultText} toolName="همترازی توالی" />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3. FORMAT CONVERTER
// ═══════════════════════════════════════════════════════════════════════════════

export function FormatConverterTool() {
  const [input, setInput] = useState("");
  const [fromFormat, setFromFormat] = useState<"dna" | "rna" | "protein">("dna");
  const [toFormat, setToFormat] = useState<"dna" | "rna" | "protein">("rna");
  const [result, setResult] = useState<string | null>(null);

  const convert = useCallback(() => {
    const seq = cleanSeq(input);
    if (!seq) return;

    if (fromFormat === "dna" && toFormat === "rna") {
      setResult(transcribeDNAtoRNA(seq));
    } else if (fromFormat === "rna" && toFormat === "dna") {
      setResult(seq.replace(/U/g, "T"));
    } else if (fromFormat === "dna" && toFormat === "protein") {
      setResult(translateFrame(seq, 0));
    } else if (fromFormat === "rna" && toFormat === "protein") {
      setResult(translateFrame(seq.replace(/U/g, "T"), 0));
    } else if (fromFormat === "protein" && toFormat === "dna") {
      setResult("(تبدیل پروتئین به DNA نیاز به جدول کدون معکوس دارد — در دست ساخت)");
    } else {
      setResult("(تبدیل امکان‌پذیر نیست)");
    }
  }, [input, fromFormat, toFormat]);

  return (
    <div className="space-y-4">
      <ResultBlock title="📄 تبدیل فرمت توالی">
        <p className="mb-3 text-[11px] text-white/40">
          توالی را بین DNA، RNA و پروتئین تبدیل کنید.
        </p>
        <TextArea value={input} onChange={setInput} placeholder="ATGCTAGCTAGCTAGC..." rows={4} />
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-medium text-white/30">از فرمت:</label>
            <select
              value={fromFormat}
              onChange={(e) => setFromFormat(e.target.value as typeof fromFormat)}
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/80 focus:border-indigo-500/40 focus:outline-none"
            >
              <option value="dna">DNA</option>
              <option value="rna">RNA</option>
              <option value="protein">پروتئین</option>
            </select>
          </div>
          <ArrowRightLeft className="mb-1 size-4 text-white/20" />
          <div>
            <label className="mb-1 block text-[10px] font-medium text-white/30">به فرمت:</label>
            <select
              value={toFormat}
              onChange={(e) => setToFormat(e.target.value as typeof toFormat)}
              className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/80 focus:border-indigo-500/40 focus:outline-none"
            >
              <option value="dna">DNA</option>
              <option value="rna">RNA</option>
              <option value="protein">پروتئین</option>
            </select>
          </div>
          <Button onClick={convert} disabled={!input.trim()} className="gap-1.5 bg-indigo-600 text-[11px] text-white hover:bg-indigo-500">
            <ArrowRightLeft className="size-3" /> تبدیل
          </Button>
        </div>
      </ResultBlock>

      {result && (
        <ResultBlock title="📊 نتیجه تبدیل">
          <div className="rounded-lg bg-black/30 p-3 font-mono text-[12px] break-all text-white/60 lab-scrollbar max-h-40 overflow-y-auto">
            {result}
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => downloadFile("converted_seq.txt", result)} size="sm" variant="outline" className="gap-1.5 border-white/[0.06] bg-white/[0.03] text-[11px] text-white/50 hover:bg-white/[0.06]">
              <Download className="size-3" /> دانلود
            </Button>
            <Button onClick={() => copyText(result)} size="sm" variant="outline" className="gap-1.5 border-white/[0.06] bg-white/[0.03] text-[11px] text-white/50 hover:bg-white/[0.06]">
              <Copy className="size-3" /> کپی
            </Button>
          </div>
          <AiInterpretButton resultText={`Format conversion result:\n${result}`} toolName="تبدیل فرمت" />
        </ResultBlock>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  4. PCR SIMULATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function PcrSimulatorTool() {
  const [template, setTemplate] = useState("");
  const [fwdPrimer, setFwdPrimer] = useState("");
  const [revPrimer, setRevPrimer] = useState("");
  const [cycles, setCycles] = useState(30);
  const [result, setResult] = useState<{
    copies: number;
    expectedSize: number;
    cycleData: Array<{ cycle: number; copies: number }>;
  } | null>(null);

  const simulate = useCallback(() => {
    const tmpl = cleanSeq(template);
    const fwd = cleanSeq(fwdPrimer);
    const rev = cleanSeq(revPrimer);
    if (!tmpl || !fwd || !rev) return;

    // Find primer positions
    const fwdPos = tmpl.indexOf(fwd);
    const revPos = tmpl.indexOf(reverseComplementDNA(rev));
    const size = fwdPos >= 0 && revPos >= 0 ? Math.abs(revPos + rev.length - fwdPos) : 0;

    const cycleData: Array<{ cycle: number; copies: number }> = [];
    let copies = 1;
    for (let c = 1; c <= cycles; c++) {
      copies *= 2;
      cycleData.push({ cycle: c, copies });
    }

    setResult({ copies, expectedSize: size || tmpl.length, cycleData });
  }, [template, fwdPrimer, revPrimer, cycles]);

  const resultText = result
    ? `PCR Simulation:\nCycles: ${cycles}\nFinal copies: ${result.copies.toLocaleString()}\nExpected product size: ${result.expectedSize} bp\nCycle data:\n${result.cycleData.map((d) => `Cycle ${d.cycle}: ${d.copies}`).join("\n")}`
    : "";

  return (
    <div className="space-y-4">
      <ResultBlock title="🧪 شبیه‌سازی PCR">
        <p className="mb-3 text-[11px] text-white/40">
          توالی الگو و پرایمرها را وارد کنید. تعداد کپی نهایی و اندازه محصول نمایش داده می‌شود.
        </p>
        <div className="space-y-3">
          <TextArea value={template} onChange={setTemplate} placeholder="توالی الگو (Template DNA)..." rows={3} />
          <TextArea value={fwdPrimer} onChange={setFwdPrimer} placeholder="پرایمر Forward (5'→3')..." rows={2} />
          <TextArea value={revPrimer} onChange={setRevPrimer} placeholder="پرایمر Reverse (5'→3')..." rows={2} />
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-medium text-white/30">تعداد سیکل‌ها:</label>
            <input type="number" value={cycles} min={1} max={50} onChange={(e) => setCycles(Math.min(50, Math.max(1, Number(e.target.value) || 30)))}
              className="w-20 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-center text-[12px] text-white/80 focus:border-indigo-500/40 focus:outline-none" />
          </div>
          <Button onClick={simulate} disabled={!template.trim() || !fwdPrimer.trim() || !revPrimer.trim()} className="gap-1.5 bg-indigo-600 text-[11px] text-white hover:bg-indigo-500">
            <Beaker className="size-3" /> شبیه‌سازی
          </Button>
        </div>
      </ResultBlock>

      {result && (
        <>
          <div className="flex flex-wrap gap-2">
            <StatBadge label="کپی نهایی" value={result.copies.toLocaleString()} />
            <StatBadge label="اندازه محصول" value={`${result.expectedSize} bp`} />
            <StatBadge label="سیکل‌ها" value={String(cycles)} />
          </div>

          <ResultBlock title="📈 رشد نمایی کپی‌ها">
            <div className="space-y-1">
              {result.cycleData.slice(0, 10).map((d) => (
                <div key={d.cycle} className="flex items-center gap-2 text-[11px]">
                  <span className="w-16 text-white/30">سیکل {d.cycle}:</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{ width: `${Math.min(100, (d.copies / result.copies) * 100)}%` }}
                    />
                  </div>
                  <span className="w-24 text-left font-mono text-white/50">{d.copies.toLocaleString()}</span>
                </div>
              ))}
              {result.cycleData.length > 10 && (
                <p className="text-[10px] text-white/20">... و {result.cycleData.length - 10} سیکل دیگر</p>
              )}
            </div>
          </ResultBlock>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadFile("pcr_simulation.txt", resultText)} size="sm" variant="outline" className="gap-1.5 border-white/[0.06] bg-white/[0.03] text-[11px] text-white/50 hover:bg-white/[0.06]">
              <Download className="size-3" /> دانلود
            </Button>
          </div>
          <AiInterpretButton resultText={resultText} toolName="شبیه‌سازی PCR" />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  5. CODON USAGE TABLE
// ═══════════════════════════════════════════════════════════════════════════════

export function CodonUsageTool() {
  const [seq, setSeq] = useState("");

  const results = useMemo(() => {
    const dna = cleanSeq(seq);
    if (dna.length < 3) return null;

    const codons: Record<string, number> = {};
    for (let i = 0; i + 2 < dna.length; i += 3) {
      const c = dna.slice(i, i + 3);
      codons[c] = (codons[c] || 0) + 1;
    }

    const total = Object.values(codons).reduce((a, b) => a + b, 0);

    // Group by amino acid
    const byAA: Record<string, Array<{ codon: string; count: number; freq: number }>> = {};
    for (const [codon, count] of Object.entries(codons)) {
      const aa = CODON_TABLE[codon] ?? "X";
      if (!byAA[aa]) byAA[aa] = [];
      byAA[aa].push({ codon, count, freq: Math.round((count / total) * 10000) / 100 });
    }

    return { codons, total, byAA };
  }, [seq]);

  return (
    <div className="space-y-4">
      <ResultBlock title="📊 جدول فراوانی کُدون">
        <p className="mb-3 text-[11px] text-white/40">
          توالی DNA وارد کنید. فراوانی هر کدون و گروه‌بندی بر اساس اسید آمینه نمایش داده می‌شود.
        </p>
        <TextArea value={seq} onChange={setSeq} placeholder="ATGCTAGCTAGCTAGC..." rows={4} />
      </ResultBlock>

      {results && (
        <>
          <div className="flex flex-wrap gap-2">
            <StatBadge label="کل کدون‌ها" value={String(results.total)} />
            <StatBadge label="کدون یکتا" value={String(Object.keys(results.codons).length)} />
          </div>

          <ResultBlock title="🧬 فراوانی کدون‌ها بر اساس اسید آمینه">
            <div className="space-y-3">
              {Object.entries(results.byAA)
                .sort((a, b) => (b[1].reduce((s, x) => s + x.count, 0)) - (a[1].reduce((s, x) => s + x.count, 0)))
                .map(([aa, codonList]) => (
                  <div key={aa}>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-[12px] font-bold text-white/60">{aa}</span>
                      <span className="text-[9px] text-white/20">
                        ({codonList.reduce((s, x) => s + x.count, 0)})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {codonList
                        .sort((a, b) => b.count - a.count)
                        .map((c) => (
                          <div
                            key={c.codon}
                            className="flex flex-col items-center rounded-lg border border-white/[0.04] bg-white/[0.02] px-2 py-1"
                          >
                            <span className="font-mono text-[11px] text-white/70">{c.codon}</span>
                            <span className="text-[9px] text-white/30">{c.freq}%</span>
                            <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.04]">
                              <div
                                className="h-full rounded-full bg-indigo-500/50"
                                style={{ width: `${c.freq}%` }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          </ResultBlock>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  6. GC / AT SKEW
// ═══════════════════════════════════════════════════════════════════════════════

export function GcSkewTool() {
  const [seq, setSeq] = useState("");
  const [windowSize, setWindowSize] = useState(100);

  const results = useMemo(() => {
    const dna = cleanSeq(seq);
    if (dna.length < windowSize) return null;

    const points: Array<{ pos: number; gcSkew: number; atSkew: number; gcContent: number }> = [];
    for (let i = 0; i + windowSize <= dna.length; i += Math.max(1, Math.floor(windowSize / 5))) {
      const win = dna.slice(i, i + windowSize);
      const g = (win.match(/G/g) || []).length;
      const c = (win.match(/C/g) || []).length;
      const a = (win.match(/A/g) || []).length;
      const t = (win.match(/T/g) || []).length;
      const gcSkew = g + c > 0 ? (g - c) / (g + c) : 0;
      const atSkew = a + t > 0 ? (a - t) / (a + t) : 0;
      const gcContent = ((g + c) / windowSize) * 100;
      points.push({ pos: i + 1, gcSkew, atSkew, gcContent });
    }

    const maxGcSkew = Math.max(...points.map((p) => Math.abs(p.gcSkew)));
    const avgGc = points.reduce((s, p) => s + p.gcContent, 0) / points.length;

    return { points, maxGcSkew, avgGc, totalLen: dna.length };
  }, [seq, windowSize]);

  const resultText = results
    ? `GC/AT Skew Analysis\nWindow size: ${windowSize}\nTotal length: ${results.totalLen}\nAvg GC%: ${results.avgGc.toFixed(1)}%\nMax |GC Skew|: ${results.maxGcSkew.toFixed(3)}\nData points: ${results.points.length}`
    : "";

  return (
    <div className="space-y-4">
      <ResultBlock title="📈 GC Skew / AT Skew">
        <p className="mb-3 text-[11px] text-white/40">
          GC Skew = (G−C)/(G+C) و AT Skew = (A−T)/(A+T) در پنجره‌های متحرک. برای شناسایی مناطق غیرمتقارن ژنومی مفید است.
        </p>
        <TextArea value={seq} onChange={setSeq} placeholder="ATGCTAGCTAGCTAGC..." rows={4} />
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-medium text-white/30">اندازه پنجره:</label>
            <input type="number" value={windowSize} min={10} onChange={(e) => setWindowSize(Math.max(10, Number(e.target.value) || 100))}
              className="w-20 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-center text-[12px] text-white/80 focus:border-indigo-500/40 focus:outline-none" />
          </div>
        </div>
      </ResultBlock>

      {results && (
        <>
          <div className="flex flex-wrap gap-2">
            <StatBadge label="میانگین GC%" value={`${results.avgGc.toFixed(1)}%`} />
            <StatBadge label="حداکثر |Skew|" value={results.maxGcSkew.toFixed(3)} />
            <StatBadge label="نقاط" value={String(results.points.length)} />
          </div>

          <ResultBlock title="📊 نمودار GC Skew">
            <div className="h-40 overflow-x-auto">
              <div className="flex items-end gap-px h-full min-w-[400px]">
                {results.points.map((p, i) => {
                  const h = Math.abs(p.gcSkew) * 100;
                  const isPos = p.gcSkew >= 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-center h-full relative" title={`pos:${p.pos} skew:${p.gcSkew.toFixed(3)}`}>
                      <div
                        className={cn("w-full rounded-sm", isPos ? "bg-emerald-500/60" : "bg-rose-500/60")}
                        style={{ height: `${Math.max(2, h)}%`, marginTop: isPos ? "auto" : "50%", marginBottom: isPos ? "50%" : "auto" }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[8px] text-white/20">
                <span>۱</span>
                <span>{results.totalLen}</span>
              </div>
            </div>
            <div className="mt-2 flex gap-4 text-[10px]">
              <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-emerald-500/60" /> مثبت (G &gt; C)</span>
              <span className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-rose-500/60" /> منفی (C &gt; G)</span>
            </div>
          </ResultBlock>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadFile("gc_skew.csv", `Position,GC_Skew,AT_Skew,GC%\n${results.points.map((p) => `${p.pos},${p.gcSkew.toFixed(4)},${p.atSkew.toFixed(4)},${p.gcContent.toFixed(1)}`).join("\n")}`)} size="sm" variant="outline" className="gap-1.5 border-white/[0.06] bg-white/[0.03] text-[11px] text-white/50 hover:bg-white/[0.06]">
              <Download className="size-3" /> CSV
            </Button>
          </div>
          <AiInterpretButton resultText={resultText} toolName="GC Skew / AT Skew" />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  7. CHI-SQUARE TEST FOR NUCLEOTIDE COMPOSITION
// ═══════════════════════════════════════════════════════════════════════════════

export function ChiSquareTool() {
  const [seq, setSeq] = useState("");
  const [expected, setExpected] = useState({ A: 25, T: 25, G: 25, C: 25 });

  const result = useMemo(() => {
    const dna = cleanSeq(seq);
    if (dna.length < 10) return null;

    const counts = { A: 0, T: 0, G: 0, C: 0 };
    for (const c of dna) {
      if (c in counts) counts[c as keyof typeof counts]++;
    }
    const n = dna.length;

    const expCounts = {
      A: (expected.A / 100) * n,
      T: (expected.T / 100) * n,
      G: (expected.G / 100) * n,
      C: (expected.C / 100) * n,
    };

    let chiSq = 0;
    const contributions: Array<{ base: string; observed: number; expected: number; contrib: number }> = [];
    for (const base of ["A", "T", "G", "C"] as const) {
      const obs = counts[base];
      const exp = expCounts[base];
      const contrib = exp > 0 ? ((obs - exp) ** 2) / exp : 0;
      chiSq += contrib;
      contributions.push({ base, observed: obs, expected: exp, contrib });
    }

    const df = 3;
    // Critical values for df=3: 0.05→7.815, 0.01→11.345
    const significant005 = chiSq > 7.815;
    const significant001 = chiSq > 11.345;

    const observedPct = {
      A: ((counts.A / n) * 100).toFixed(1),
      T: ((counts.T / n) * 100).toFixed(1),
      G: ((counts.G / n) * 100).toFixed(1),
      C: ((counts.C / n) * 100).toFixed(1),
    };

    return { counts, n, chiSq, contributions, significant005, significant001, observedPct };
  }, [seq, expected]);

  const resultText = result
    ? `Chi-Square Test\nTotal: ${result.n}\nObserved: A=${result.observedPct.A}% T=${result.observedPct.T}% G=${result.observedPct.G}% C=${result.observedPct.C}%\nχ² = ${result.chiSq.toFixed(4)}\ndf = 3\nSignificant at 0.05: ${result.significant005 ? "YES" : "NO"}`
    : "";

  return (
    <div className="space-y-4">
      <ResultBlock title="🔬 آزمون Chi-Square ترکیب نوکلئوتیدی">
        <p className="mb-3 text-[11px] text-white/40">
          آیا ترکیب نوکلئوتیدی توالی شما با یک توزیع انتظاری تفاوت معناداری دارد؟
        </p>
        <TextArea value={seq} onChange={setSeq} placeholder="ATGCTAGCTAGCTAGC..." rows={4} />
        <div className="mt-3 grid grid-cols-4 gap-2">
          {(["A", "T", "G", "C"] as const).map((base) => (
            <div key={base}>
              <label className="mb-1 block text-[10px] font-medium text-white/30">{base} (% انتظاری):</label>
              <input
                type="number"
                value={expected[base]}
                min={0}
                max={100}
                onChange={(e) => setExpected((prev) => ({ ...prev, [base]: Number(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 text-center text-[12px] text-white/80 focus:border-indigo-500/40 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </ResultBlock>

      {result && (
        <>
          <div className="flex flex-wrap gap-2">
            <StatBadge label="χ²" value={result.chiSq.toFixed(2)} />
            <StatBadge label="df" value="3" />
            <StatBadge label="طول" value={String(result.n)} />
          </div>

          <ResultBlock title="📊 جزئیات">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-2 py-1 text-right text-white/30">نوکلئوتید</th>
                    <th className="px-2 py-1 text-right text-white/30">مشاهده</th>
                    <th className="px-2 py-1 text-right text-white/30">انتظار</th>
                    <th className="px-2 py-1 text-right text-white/30">مشارکت χ²</th>
                  </tr>
                </thead>
                <tbody>
                  {result.contributions.map((c) => (
                    <tr key={c.base} className="border-b border-white/[0.03]">
                      <td className="px-2 py-1.5 font-bold text-white/60">{c.base}</td>
                      <td className="px-2 py-1.5 text-white/50">{c.observed} ({((c.observed / result.n) * 100).toFixed(1)}%)</td>
                      <td className="px-2 py-1.5 text-white/40">{c.expected.toFixed(1)}</td>
                      <td className="px-2 py-1.5 text-white/50">{c.contrib.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ResultBlock>

          <ResultBlock
            title={result.significant001 ? "⚠️ نتیجه: تفاوت معنادار (p < 0.01)" : result.significant005 ? "⚠️ نتیجه: تفاوت معنادار (p < 0.05)" : "✅ نتیجه: تفاوت معنادار نیست"}
            className={result.significant005 ? "border-amber-500/30 bg-amber-500/[0.05]" : "border-emerald-500/30 bg-emerald-500/[0.05]"}
          >
            <p className="text-[11px] text-white/50">
              χ² = {result.chiSq.toFixed(4)} با {result.significant005 ? "تفاوت آماری معنادار" : "بدون تفاوت آماری معنادار"} در سطح اطمینان 95%.
            </p>
          </ResultBlock>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadFile("chi_square.txt", resultText)} size="sm" variant="outline" className="gap-1.5 border-white/[0.06] bg-white/[0.03] text-[11px] text-white/50 hover:bg-white/[0.06]">
              <Download className="size-3" /> دانلود
            </Button>
          </div>
          <AiInterpretButton resultText={resultText} toolName="آزمون Chi-Square" />
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  8. PROBE DESIGNER
// ═══════════════════════════════════════════════════════════════════════════════

export function ProbeDesignerTool() {
  const [seq, setSeq] = useState("");
  const [targetRegion, setTargetRegion] = useState("");
  const [probeLen, setProbeLen] = useState(20);
  const [tmRange, setTmRange] = useState<[number, number]>([55, 65]);

  const results = useMemo(() => {
    const dna = cleanSeq(seq);
    if (dna.length < probeLen) return null;

    const probes: Array<{
      seq: string;
      start: number;
      length: number;
      gc: number;
      tm: number;
      type: "forward" | "reverse";
    }> = [];

    // Scan for probes across the sequence
    for (let i = 0; i + probeLen <= dna.length; i++) {
      const probe = dna.slice(i, i + probeLen);
      const g = (probe.match(/G/g) || []).length;
      const c = (probe.match(/C/g) || []).length;
      const gc = ((g + c) / probeLen) * 100;
      const tm = 64.9 + 41 * ((g + c - 16.4) / probeLen);

      if (gc >= 40 && gc <= 60 && tm >= tmRange[0] && tm <= tmRange[1]) {
        probes.push({
          seq: probe,
          start: i,
          length: probeLen,
          gc,
          tm,
          type: "forward",
        });
        // Also reverse complement
        const rc = reverseComplementDNA(probe);
        const rcG = (rc.match(/G/g) || []).length;
        const rcC = (rc.match(/C/g) || []).length;
        const rcGc = ((rcG + rcC) / probeLen) * 100;
        const rcTm = 64.9 + 41 * ((rcG + rcC - 16.4) / probeLen);
        probes.push({
          seq: rc,
          start: i,
          length: probeLen,
          gc: rcGc,
          tm: rcTm,
          type: "reverse",
        });
      }
    }

    // Remove duplicates and limit
    const unique = probes
      .filter((p, i, arr) => arr.findIndex((x) => x.seq === p.seq && x.start === x.start) === i)
      .slice(0, 20)
      .sort((a, b) => Math.abs(a.tm - 60) - Math.abs(b.tm - 60));

    return { probes: unique, totalScanned: Math.max(0, dna.length - probeLen + 1) };
  }, [seq, probeLen, tmRange]);

  const resultText = results
    ? `Probe Design Results:\nTarget length: ${cleanSeq(seq).length}bp\nProbe length: ${probeLen}bp\nTm range: ${tmRange[0]}-${tmRange[1]}°C\nProbes found: ${results.probes.length}\n\n${results.probes.map((p) => `${p.seq} | pos:${p.start} | Tm:${p.tm.toFixed(1)} | GC:${p.gc.toFixed(1)}% | ${p.type}`).join("\n")}`
    : "";

  return (
    <div className="space-y-4">
      <ResultBlock title="🎯 طراحی Probe هیبریداسیون">
        <p className="mb-3 text-[11px] text-white/40">
          Probeهایی با Tm و GC% مناسب برای هیبریداسیون طراحی کنید.
        </p>
        <TextArea value={seq} onChange={setSeq} placeholder="ATGCTAGCTAGCTAGC..." rows={4} />
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-medium text-white/30">طول Probe (bp):</label>
            <input type="number" value={probeLen} min={10} max={40} onChange={(e) => setProbeLen(Math.max(10, Math.min(40, Number(e.target.value) || 20)))}
              className="w-20 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-center text-[12px] text-white/80 focus:border-indigo-500/40 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-white/30">Tm حداقل:</label>
            <input type="number" value={tmRange[0]} onChange={(e) => setTmRange([Number(e.target.value) || 55, tmRange[1]])}
              className="w-20 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-center text-[12px] text-white/80 focus:border-indigo-500/40 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-medium text-white/30">Tm حداکثر:</label>
            <input type="number" value={tmRange[1]} onChange={(e) => setTmRange([tmRange[0], Number(e.target.value) || 65])}
              className="w-20 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-center text-[12px] text-white/80 focus:border-indigo-500/40 focus:outline-none" />
          </div>
        </div>
      </ResultBlock>

      {results && (
        <>
          <div className="flex flex-wrap gap-2">
            <StatBadge label="Probe یافت شده" value={String(results.probes.length)} />
            <StatBadge label="بررسی شده" value={String(results.totalScanned)} />
          </div>

          {results.probes.length > 0 && (
            <ResultBlock title="🎯 Probeهای پیشنهادی">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-2 py-1 text-right text-white/30">#</th>
                      <th className="px-2 py-1 text-right text-white/30">توالی</th>
                      <th className="px-2 py-1 text-right text-white/30">موقعیت</th>
                      <th className="px-2 py-1 text-right text-white/30">طول</th>
                      <th className="px-2 py-1 text-right text-white/30">Tm</th>
                      <th className="px-2 py-1 text-right text-white/30">GC%</th>
                      <th className="px-2 py-1 text-right text-white/30">نوع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.probes.map((p, i) => (
                      <tr key={i} className="border-b border-white/[0.03]">
                        <td className="px-2 py-1.5 text-white/40">{i + 1}</td>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-cyan-300">{p.seq}</td>
                        <td className="px-2 py-1.5 text-white/50">{p.start}</td>
                        <td className="px-2 py-1.5 text-white/50">{p.length}</td>
                        <td className="px-2 py-1.5 text-white/50">{p.tm.toFixed(1)}°C</td>
                        <td className="px-2 py-1.5 text-white/50">{p.gc.toFixed(1)}%</td>
                        <td className="px-2 py-1.5">
                          <Badge className={cn("text-[8px]", p.type === "forward" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300")}>
                            {p.type === "forward" ? "Forward" : "Reverse"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ResultBlock>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadFile("probes.csv", `#,Sequence,Position,Length,Tm,GC%,Type\n${results.probes.map((p, i) => `${i + 1},${p.seq},${p.start},${p.length},${p.tm.toFixed(1)},${p.gc.toFixed(1)},${p.type}`).join("\n")}`)} size="sm" variant="outline" className="gap-1.5 border-white/[0.06] bg-white/[0.03] text-[11px] text-white/50 hover:bg-white/[0.06]">
              <Download className="size-3" /> CSV
            </Button>
          </div>
          <AiInterpretButton resultText={resultText} toolName="طراحی Probe" />
        </>
      )}
    </div>
  );
}
