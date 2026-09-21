/**
 * Genova Virtual Lab — Bioinformatics Analysis Tools
 * ─────────────────────────────────────────────────────────────────────────────
 * Six client-side bioinformatics tools for biology students:
 *   1. DNA Sequence Analysis
 *   2. RNA Sequence Analysis
 *   3. Protein Analysis
 *   4. GC% Sliding Window
 *   5. Pattern Search
 *   6. Nucleotide Counter
 *
 * All computations are purely client-side. No data is sent to the server.
 */
import { useCallback, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  ClipboardCopy,
  Download,
  FileText,
  Loader2,
  Search,
  SearchCode,
  Sparkles,
  Dna,
  ArrowDownAZ,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
//  CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const DNA_COMPLEMENT: Record<string, string> = {
  A: "T", T: "A", G: "C", C: "G",
  a: "t", t: "a", g: "c", c: "g",
  U: "A", u: "a",
};

const RNA_COMPLEMENT: Record<string, string> = {
  A: "U", U: "A", G: "C", C: "G",
  a: "u", u: "a", g: "c", c: "g",
};

const CODON_TABLE: Record<string, string> = {
  TTT: "F", TTC: "F", TTA: "L", TTG: "L",
  CTT: "L", CTC: "L", CTA: "L", CTG: "L",
  ATT: "I", ATC: "I", ATA: "I", ATG: "M",
  GTT: "V", GTC: "V", GTA: "V", GTG: "V",
  TCT: "S", TCC: "S", TCA: "S", TCG: "S",
  CCT: "P", CCC: "P", CCA: "P", CCG: "P",
  ACT: "T", ACC: "T", ACA: "T", ACG: "T",
  GCT: "A", GCC: "A", GCA: "A", GCG: "A",
  TAT: "Y", TAC: "Y", TAA: "*", TAG: "*",
  CAT: "H", CAC: "H", CAA: "Q", CAG: "Q",
  AAT: "N", AAC: "N", AAA: "K", AAG: "K",
  GAT: "D", GAC: "D", GAA: "E", GAG: "E",
  TGT: "C", TGC: "C", TGA: "*", TGG: "W",
  CGT: "R", CGC: "R", CGA: "R", CGG: "R",
  AGT: "S", AGC: "S", AGA: "R", AGG: "R",
  GGT: "G", GGC: "G", GGA: "G", GGG: "G",
};

const AMINO_ACID_NAMES: Record<string, string> = {
  A: "آلانین", R: "آرژینین", N: "آسپاراژین", D: "آسپارتیک اسید",
  C: "سیستئین", E: "گلوتامیک اسید", Q: "گلوتامین", G: "گلیسین",
  H: "هیستیدین", I: "ایزولوسین", L: "لوسین", K: "لیزین",
  M: "متیونین", F: "فنیل‌آلانین", P: "پرولین", S: "سرین",
  T: "ترئونین", W: "تریپتوفان", Y: "تیروزین", V: "والین",
};

const THREE_LETTER: Record<string, string> = {
  A: "Ala", R: "Arg", N: "Asn", D: "Asp", C: "Cys",
  E: "Glu", Q: "Gln", G: "Gly", H: "His", I: "Ile",
  L: "Leu", K: "Lys", M: "Met", F: "Phe", P: "Pro",
  S: "Ser", T: "Thr", W: "Trp", Y: "Tyr", V: "Val",
};

const AA_MW: Record<string, number> = {
  A: 89.09, R: 174.20, N: 132.12, D: 133.10, C: 121.16,
  E: 147.13, Q: 146.15, G: 75.03, H: 155.16, I: 131.17,
  L: 131.17, K: 146.19, M: 149.21, F: 165.19, P: 115.13,
  S: 105.09, T: 119.12, W: 204.23, Y: 181.19, V: 117.15,
};

const AA_GRAVY: Record<string, number> = {
  A: 1.8, R: -4.5, N: -3.5, D: -3.5, C: 2.5,
  E: -3.5, Q: -3.5, G: -0.4, H: -3.2, I: 4.5,
  L: 3.8, K: -3.9, M: 1.9, F: 2.8, P: -1.6,
  S: -0.8, T: -0.7, W: -0.9, Y: -1.3, V: 4.2,
};

const AA_INSTABILITY: Record<string, number> = {
  A: 1.05, R: -1.77, N: 11.76, D: 11.06, C: -1.77,
  E: -1.77, Q: -1.77, G: 1.05, H: -1.77, I: -1.77,
  L: -1.77, K: -1.77, M: -1.77, F: 1.05, P: 8.81,
  S: 1.05, T: 1.05, W: -1.77, Y: 1.05, V: -1.77,
};

const AA_CHARGE_PH7: Record<string, number> = {
  D: -1, E: -1, H: 0.1, K: 1, R: 1, C: -0.03, Y: -0.01,
};

function cleanSeq(raw: string): string {
  return raw.replace(/[^A-Za-z]/g, "").toUpperCase();
}

function isValidDna(seq: string): boolean {
  return seq.length > 0 && /^[ATGC]+$/i.test(seq);
}

function isValidRna(seq: string): boolean {
  return seq.length > 0 && /^[AUGC]+$/i.test(seq);
}

function isValidProtein(seq: string): boolean {
  return seq.length > 0 && /^[ACDEFGHIKLMNPQRSTVWY]+$/i.test(seq);
}

function countBases(seq: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ch of seq) counts[ch] = (counts[ch] || 0) + 1;
  return counts;
}

function reverseComplement(seq: string, isRna: boolean): string {
  const comp = isRna ? RNA_COMPLEMENT : DNA_COMPLEMENT;
  return seq
    .split("")
    .reverse()
    .map((ch) => comp[ch] ?? ch)
    .join("");
}

function translateDna(seq: string, frame = 1): string {
  let protein = "";
  for (let i = frame - 1; i + 2 < seq.length; i += 3) {
    const codon = seq.substring(i, i + 3);
    const aa = CODON_TABLE[codon] ?? "?";
    if (aa === "*") break;
    protein += aa;
  }
  return protein;
}

function gcPercent(seq: string): number {
  if (seq.length === 0) return 0;
  const gc = (seq.match(/[GC]/gi) ?? []).length;
  return (gc / seq.length) * 100;
}

function downloadFile(content: string, filename: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");
  downloadFile(csvContent, filename, "text/csv");
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SHARED UI
// ═══════════════════════════════════════════════════════════════════════════════

function ResultBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-3 backdrop-blur-sm">
      <h4 className="text-xs font-black tracking-wide text-violet-300/80">{title}</h4>
      {children}
    </div>
  );
}

function KV({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-2.5 text-xs">
      <span className="text-white/50">{label}</span>
      <span className={cn("font-black tabular-nums", primary ? "text-violet-300" : "text-white/80")} dir="ltr">{value}</span>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 gap-1 text-[11px]"
      onClick={() => { navigator.clipboard.writeText(text); toast.success("کپی شد"); }}
    >
      <ClipboardCopy className="size-3" /> کپی
    </Button>
  );
}

function DownloadTxtBtn({ content, filename }: { content: string; filename: string }) {
  return (
    <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => downloadFile(content, filename)}>
      <Download className="size-3" /> دانلود TXT
    </Button>
  );
}

function DownloadCsvBtn({ headers, rows, filename }: { headers: string[]; rows: (string | number)[][]; filename: string }) {
  return (
    <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => downloadCsv(headers, rows, filename)}>
      <Download className="size-3" /> دانلود CSV
    </Button>
  );
}

function SimpleBarChart({ data, color = "#8b5cf6" }: { data: { label: string; value: number }[]; color?: string }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-36 px-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <span className="text-[11px] font-black tabular-nums" style={{ color }}>{d.value}</span>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(d.value / maxVal) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full rounded-t-lg min-h-[2px] relative overflow-hidden"
            style={{ background: `linear-gradient(to top, ${color}40, ${color})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10" />
          </motion.div>
          <span className="text-[11px] font-bold text-white/60 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── AI Interpretation ──────────────────────────────────────────────────────

function AiInterpretButton({ resultText, toolName }: { resultText: string; toolName: string }) {
  const { isAuthenticated } = useAuth();
  const createConvo = useMutation(api.aiChat.createConversation);
  const sendMessage = useMutation(api.aiChat.sendMessage);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleInterpret = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error("برای استفاده از تفسیر هوش مصنوعی ابتدا وارد حساب شوید.");
      return;
    }
    setLoading(true);
    try {
      const convoId = await createConvo({ title: `تفسیر ${toolName}` });
      await sendMessage({
        conversationId: convoId as any,
        content: `لطفاً نتایج زیر را از ابزار «${toolName}» آزمایشگاه مجازی ژنوا تفسیر کن. به زبان ساده و علمی توضیح بده که هر عدد چه معنایی دارد و چه نتیجه‌ای می‌توان گرفت.\n\n${resultText}`,
      });
      setDone(true);
      toast.success("تفسیر با هوش مصنوعی ارسال شد! برای مشاهده پاسخ به بخش هوش مصنوعی بروید.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در ارسال تفسیر");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, resultText, toolName, createConvo, sendMessage]);

  return (
    <div>
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1.5 border-violet-500/30 bg-violet-500/10 text-[11px] text-violet-300 hover:bg-violet-500/20 hover:text-violet-200"
        onClick={handleInterpret}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Sparkles className="size-3.5" />
        )}
        تفسیر با هوش مصنوعی
      </Button>
      {done && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4"
        >
          <div className="flex items-start gap-2">
            <Sparkles className="size-4 shrink-0 text-violet-400 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-violet-300">تفسیر هوش مصنوعی</p>
              <p className="mt-1 text-[11px] leading-6 text-violet-200/70">نتایج به چت هوش مصنوعی ارسال شد. برای مشاهده تفسیر کامل به بخش AI Chat سایت مراجعه کنید.</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  1. DNA SEQUENCE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export function DnaAnalysisTool() {
  const [input, setInput] = useState("");
  const seq = useMemo(() => cleanSeq(input), [input]);
  const valid = useMemo(() => isValidDna(seq), [seq]);

  const result = useMemo(() => {
    if (!valid) return null;
    const counts = countBases(seq);
    const rc = reverseComplement(seq, false);
    const frame1 = translateDna(seq, 1);
    const frame2 = translateDna(seq, 2);
    const frame3 = translateDna(seq, 3);
    const mw = (counts.A ?? 0) * 312.2 + (counts.T ?? 0) * 303.2 + (counts.G ?? 0) * 328.2 + (counts.C ?? 0) * 288.2 + 79.0;
    const gc = gcPercent(seq);
    const at = 100 - gc;

    const txt = `📊 نتایج تحلیل DNA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ توالی معتبر است

📏 طول توالی: ${seq.length} نوکلئوتید

🧬 درصد GC: ${gc.toFixed(1)}%
🧬 درصد AT: ${at.toFixed(1)}%

🔢 شمارش نوکلئوتیدها:
   A: ${counts.A ?? 0}
   T: ${counts.T ?? 0}
   G: ${counts.G ?? 0}
   C: ${counts.C ?? 0}

🔄 Reverse Complement:
${rc}

🧪 ترجمه به پروتئین (چارچوب ۱):
${frame1}

🧪 ترجمه به پروتئین (چارچوب ۲):
${frame2}

🧪 ترجمه به پروتئین (چارچوب ۳):
${frame3}

⚖️ وزن مولکولی تقریبی: ${mw.toFixed(1)} دالتون`;

    return { counts, rc, frame1, frame2, frame3, mw, gc, at, txt };
  }, [seq, valid]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-400">
          <Dna className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-black text-white">تحلیل DNA</h2>
          <p className="text-[11px] text-white/40">شمارش نوکلئوتیدها، درصد GC، Reverse Complement و ترجمه پروتئین</p>
        </div>
      </div>

      <div>
          <label className="mb-1 block text-[11px] text-white/40">🧬 ورودی توالی DNA</label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            dir="ltr"
            placeholder="ATGGCCTGCAGCTTCGACGGCTACTGA..."
            className="font-mono text-xs"
          />
          {input && !valid && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-500">
              <AlertTriangle className="size-3" /> توالی نامعتبر — فقط حروف A, T, G, C مجاز هستند
            </p>
          )}
        </div>

        {result ? (
          <>
            <div className="flex flex-wrap gap-2">
              <CopyBtn text={result.txt} />
              <DownloadTxtBtn content={result.txt} filename="dna_analysis.txt" />
              <AiInterpretButton resultText={result.txt} toolName="تحلیل DNA" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ResultBlock title="📊 نتایج تحلیل">
                <KV label="طول توالی" value={`${seq.length} nt`} primary />
                <KV label="درصد GC" value={`${result.gc.toFixed(1)}%`} />
                <KV label="درصد AT" value={`${result.at.toFixed(1)}%`} />
                <KV label="وزن مولکولی" value={`${result.mw.toFixed(1)} Da`} />
              </ResultBlock>
              <ResultBlock title="🔢 شمارش نوکلئوتیدها">
                <SimpleBarChart
                  data={[
                    { label: "A", value: result.counts.A ?? 0 },
                    { label: "T", value: result.counts.T ?? 0 },
                    { label: "G", value: result.counts.G ?? 0 },
                    { label: "C", value: result.counts.C ?? 0 },
                  ]}
                  color="#8b5cf6"
                />
              </ResultBlock>
            </div>

            <ResultBlock title="🔄 Reverse Complement">
              <p className="font-mono text-[11px] leading-6 break-all" dir="ltr">{result.rc}</p>
              <CopyBtn text={result.rc} />
            </ResultBlock>

            <ResultBlock title="🧪 ترجمه به پروتئین (چارچوب ۱)">
              <p className="font-mono text-xs" dir="ltr">{result.frame1}</p>
              <CopyBtn text={result.frame1} />
            </ResultBlock>
            {result.frame2 && (
              <ResultBlock title="🧪 ترجمه به پروتئین (چارچوب ۲)">
                <p className="font-mono text-xs" dir="ltr">{result.frame2}</p>
                <CopyBtn text={result.frame2} />
              </ResultBlock>
            )}
            {result.frame3 && (
              <ResultBlock title="🧪 ترجمه به پروتئین (چارچوب ۳)">
                <p className="font-mono text-xs" dir="ltr">{result.frame3}</p>
                <CopyBtn text={result.frame3} />
              </ResultBlock>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-violet-300/40 p-8 text-center text-xs text-muted-foreground">
            توالی DNA را وارد کنید تا تحلیل نمایش داده شود
          </div>
        )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  2. RNA SEQUENCE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export function RnaAnalysisTool() {
  const [input, setInput] = useState("");
  const seq = useMemo(() => cleanSeq(input), [input]);
  const valid = useMemo(() => isValidRna(seq), [seq]);

  const result = useMemo(() => {
    if (!valid) return null;
    const counts = countBases(seq);
    const gc = gcPercent(seq);
    const mw = (counts.A ?? 0) * 329.2 + (counts.U ?? 0) * 284.2 + (counts.G ?? 0) * 345.2 + (counts.C ?? 0) * 305.2 + 79.0;
    const kda = mw / 1000;

    // cDNA
    const cdna = seq.replace(/U/gi, "T").replace(/u/g, "t");

    // Translation
    const protein = translateDna(cdna, 1);

    // Simplified secondary structure (dot-bracket)
    let pairs = 0;
    let loops = 0;
    let inLoop = false;
    const structure: string[] = [];
    for (let i = 0; i < seq.length; i++) {
      const j = seq.length - 1 - i;
      if (i >= j) { structure.push("."); continue; }
      const a = seq[i].toUpperCase();
      const b = seq[j].toUpperCase();
      const paired = (a === "A" && b === "U") || (a === "U" && b === "A") || (a === "G" && b === "C") || (a === "C" && b === "G");
      if (paired) {
        structure.push(i < seq.length / 2 ? "(" : ")");
        pairs++;
        inLoop = false;
      } else {
        structure.push(".");
        if (!inLoop) { loops++; inLoop = true; }
      }
    }
    const dotBracket = structure.join("");

    const txt = `📊 نتیجه تحلیل RNA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧬 توالی RNA:
${seq}
📏 طول توالی: ${seq.length} نوکلئوتید
🧬 درصد GC: ${gc.toFixed(1)}%
⚖️ وزن مولکولی: ${mw.toFixed(1)} دالتون (Da)
⚖️ وزن مولکولی: ${kda.toFixed(2)} کیلودالتون (kDa)

📊 ترکیب نوکلئوتیدها:
   A: ${counts.A ?? 0}, U: ${counts.U ?? 0}, G: ${counts.G ?? 0}, C: ${counts.C ?? 0}

🔄 توالی DNA معادل (cDNA):
${cdna}

🧪 ترجمه به پروتئین:
${protein}
📏 طول پروتئین: ${protein.length} اسید آمینه

🧬 ساختار ثانویه ساده (پیش‌بینی):
${dotBracket}
🔗 جفت‌های باز: ${pairs}
🔄 حلقه‌ها: ${loops}

📊 نمودار توزیع نوکلئوتیدها:`;

    return { counts, gc, mw, kda, cdna, protein, dotBracket, pairs, loops, txt };
  }, [seq, valid]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-400">
          <Dna className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-black text-white">تحلیل RNA</h2>
          <p className="text-[11px] text-white/40">شمارش، وزن مولکولی، cDNA، ترجمه و ساختار ثانویه</p>
        </div>
      </div>
        <div>
          <label className="mb-1 block text-[11px] text-muted-foreground">🧬 ورودی توالی RNA</label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            dir="ltr"
            placeholder="CAAUCGGACGUUGAGCGCCGCUUG..."
            className="font-mono text-xs"
          />
          {input && !valid && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-500">
              <AlertTriangle className="size-3" /> توالی نامعتبر — فقط حروف A, U, G, C مجاز هستند
            </p>
          )}
        </div>

        {result ? (
          <>
            <div className="flex flex-wrap gap-2">
              <CopyBtn text={result.txt} />
              <DownloadTxtBtn content={result.txt} filename="rna_analysis.txt" />
              <AiInterpretButton resultText={result.txt} toolName="تحلیل RNA" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ResultBlock title="📊 نتایج تحلیل RNA">
                <KV label="طول توالی" value={`${seq.length} nt`} primary />
                <KV label="درصد GC" value={`${result.gc.toFixed(1)}%`} />
                <KV label="وزن مولکولی" value={`${result.mw.toFixed(1)} Da`} />
                <KV label="وزن (kDa)" value={`${result.kda.toFixed(2)} kDa`} />
              </ResultBlock>
              <ResultBlock title="📊 ترکیب نوکلئوتیدها">
                <SimpleBarChart
                  data={[
                    { label: "A", value: result.counts.A ?? 0 },
                    { label: "U", value: result.counts.U ?? 0 },
                    { label: "G", value: result.counts.G ?? 0 },
                    { label: "C", value: result.counts.C ?? 0 },
                  ]}
                  color="#8b5cf6"
                />
              </ResultBlock>
            </div>

            <ResultBlock title="🔄 توالی DNA معادل (cDNA)">
              <p className="font-mono text-[11px] leading-6 break-all" dir="ltr">{result.cdna}</p>
              <CopyBtn text={result.cdna} />
            </ResultBlock>

            <ResultBlock title="🧪 ترجمه به پروتئین">
              <p className="font-mono text-xs" dir="ltr">{result.protein}</p>
              <p className="text-[10px] text-muted-foreground">طول: {result.protein.length} اسید آمینه</p>
              <CopyBtn text={result.protein} />
            </ResultBlock>

            <ResultBlock title="🧬 ساختار ثانویه ساده (پیش‌بینی)">
              <p className="font-mono text-[10px] leading-5 break-all" dir="ltr">{result.dotBracket}</p>
              <div className="flex gap-4 text-[11px]">
                <span>🔗 جفت‌های باز: <strong>{result.pairs}</strong></span>
                <span>🔄 حلقه‌ها: <strong>{result.loops}</strong></span>
              </div>
            </ResultBlock>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-violet-300/40 p-8 text-center text-xs text-muted-foreground">
            توالی RNA را وارد کنید تا تحلیل نمایش داده شود
          </div>
        )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3. PROTEIN ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

function getAaCategory(aa: string): string {
  const acidic = "DE";
  const basic = "RKH";
  const hydrophobic = "AILMFWV";
  const hydrophilic = "STNQCY";
  if (acidic.includes(aa)) return "بار منفی";
  if (basic.includes(aa)) return "بار مثبت";
  if (hydrophobic.includes(aa)) return "آبگریز";
  if (hydrophilic.includes(aa)) return "آبدوست";
  return "ویژه";
}

function calcProteinMw(seq: string): number {
  let sum = 0;
  for (const ch of seq) sum += AA_MW[ch.toUpperCase()] ?? 0;
  return sum - (seq.length - 1) * 18.015;
}

function calcPi(seq: string): number {
  const pKas: { pKa: number; charge: (pH: number) => number }[] = [];
  for (const ch of seq) {
    const aa = ch.toUpperCase();
    if (aa === "D" || aa === "E" || aa === "C" || aa === "Y" || aa === "H" || aa === "K" || aa === "R") {
      const pKaMap: Record<string, { pKa: number; charge: (pH: number) => number }> = {
        D: { pKa: 3.65, charge: (pH) => 1 / (1 + Math.pow(10, pH - 3.65)) },
        E: { pKa: 4.25, charge: (pH) => 1 / (1 + Math.pow(10, pH - 4.25)) },
        C: { pKa: 8.18, charge: (pH) => 1 / (1 + Math.pow(10, pH - 8.18)) },
        Y: { pKa: 10.07, charge: (pH) => 1 / (1 + Math.pow(10, pH - 10.07)) },
        H: { pKa: 6.00, charge: (pH) => 1 / (1 + Math.pow(10, 6.00 - pH)) },
        K: { pKa: 10.53, charge: (pH) => 1 / (1 + Math.pow(10, 10.53 - pH)) },
        R: { pKa: 12.48, charge: (pH) => 1 / (1 + Math.pow(10, 12.48 - pH)) },
      };
      if (pKaMap[aa]) pKas.push(pKaMap[aa]);
    }
  }
  // N-terminus
  pKas.push({ pKa: 9.6, charge: (pH) => 1 / (1 + Math.pow(10, 9.6 - pH)) });
  // C-terminus
  pKas.push({ pKa: 2.34, charge: (pH) => 1 / (1 + Math.pow(10, pH - 2.34)) });

  let lo = 0, hi = 14;
  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    let charge = 0;
    for (const pk of pKas) charge += pk.charge(mid);
    charge -= pKas.length - 2; // subtract the +1 for each basic (already counted as fractional)
    // recalculate properly
    charge = 0;
    // N-term: positive at low pH
    charge += 1 / (1 + Math.pow(10, mid - 9.6));
    // C-term: negative at high pH
    charge -= 1 / (1 + Math.pow(10, 2.34 - mid));
    // acidic side chains
    charge -= 1 / (1 + Math.pow(10, mid - 3.65)) * (seq.match(/[D]/gi) ?? []).length / Math.max(1, (seq.match(/[D]/gi) ?? []).length);
    charge -= 1 / (1 + Math.pow(10, mid - 4.25)) * (seq.match(/[E]/gi) ?? []).length / Math.max(1, (seq.match(/[E]/gi) ?? []).length);
    // basic side chains
    charge += 1 / (1 + Math.pow(10, mid - 10.53)) * (seq.match(/[K]/gi) ?? []).length / Math.max(1, (seq.match(/[K]/gi) ?? []).length);
    charge += 1 / (1 + Math.pow(10, 12.48 - mid)) * (seq.match(/[R]/gi) ?? []).length / Math.max(1, (seq.match(/[R]/gi) ?? []).length);
    charge += 1 / (1 + Math.pow(10, 6.0 - mid)) * (seq.match(/[H]/gi) ?? []).length / Math.max(1, (seq.match(/[H]/gi) ?? []).length);

    if (charge > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function calcExtinctionCoefficient(seq: string): { ec: number; a280: number } {
  const nW = (seq.match(/W/gi) ?? []).length;
  const nY = (seq.match(/Y/gi) ?? []).length;
  const nC = (seq.match(/C/gi) ?? []).length;
  const ec = nW * 5500 + nY * 1490 + nC * 125;
  const mw = calcProteinMw(seq);
  const a280 = ec / (mw / 1000);
  return { ec, a280 };
}

function calcGravy(seq: string): number {
  let sum = 0;
  for (const ch of seq) sum += AA_GRAVY[ch.toUpperCase()] ?? 0;
  return sum / seq.length;
}

function calcInstabilityIndex(seq: string): number {
  let sum = 0;
  for (let i = 0; i < seq.length - 1; i++) {
    const d1 = AA_INSTABILITY[seq[i].toUpperCase()] ?? 0;
    const d2 = AA_INSTABILITY[seq[i + 1].toUpperCase()] ?? 0;
    sum += d1 + d2;
  }
  return (10 / seq.length) * sum;
}

function calcNetCharge(seq: string): number {
  let charge = 0;
  // Acidic
  charge -= (seq.match(/[D]/gi) ?? []).length;
  charge -= (seq.match(/[E]/gi) ?? []).length;
  // Basic
  charge += (seq.match(/[K]/gi) ?? []).length;
  charge += (seq.match(/[R]/gi) ?? []).length;
  // His (partial at pH 7)
  charge += (seq.match(/[H]/gi) ?? []).length * 0.1;
  return charge;
}

export function ProteinAnalysisTool() {
  const [input, setInput] = useState("");
  const seq = useMemo(() => cleanSeq(input), [input]);
  const valid = useMemo(() => isValidProtein(seq), [seq]);

  const result = useMemo(() => {
    if (!valid) return null;
    const counts = countBases(seq);
    const length = seq.length;
    const mw = calcProteinMw(seq);
    const kda = mw / 1000;
    const pi = calcPi(seq);
    const { ec, a280 } = calcExtinctionCoefficient(seq);
    const gravy = calcGravy(seq);
    const instability = calcInstabilityIndex(seq);
    const netCharge = calcNetCharge(seq);

    // Amino acid composition
    const allAas = "ARNDCEQGHILKMFPSTWYV".split("");
    const composition = allAas
      .filter((aa: string) => (counts[aa] ?? 0) > 0)
      .map((aa: string) => ({
        aa,
        three: THREE_LETTER[aa],
        name: AMINO_ACID_NAMES[aa],
        count: counts[aa] ?? 0,
        percent: ((counts[aa] ?? 0) / length) * 100,
        category: getAaCategory(aa),
      }))
      .sort((a, b) => b.count - a.count);

    const acidic = composition.filter((c) => c.category === "بار منفی").reduce((s, c) => s + c.count, 0);
    const basic = composition.filter((c) => c.category === "بار مثبت").reduce((s, c) => s + c.count, 0);
    const hydrophobic = composition.filter((c) => c.category === "آبگریز").reduce((s, c) => s + c.count, 0);
    const hydrophilic = composition.filter((c) => c.category === "آبدوست").reduce((s, c) => s + c.count, 0);

    const txt = `📊 نتیجه تحلیل پروتئین
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧬 توالی پروتئین:
${seq}
📏 طول پروتئین: ${length} اسید آمینه
⚖️ وزن مولکولی: ${mw.toFixed(1)} دالتون (Da)
⚖️ وزن مولکولی: ${kda.toFixed(2)} کیلودالتون (kDa)
⚡ نقطه ایزوالکتریک (pI): ${pi.toFixed(2)}
🧬 ضریب خاموشی: ${ec.toFixed(0)} M⁻¹ cm⁻¹
🌊 جذب در 280 نانومتر: ${a280.toFixed(3)} (mg/mL)⁻¹ cm⁻¹

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ترکیب اسید آمینه
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
اسید آمینه | سه حرفی | تعداد | درصد | دسته
${composition.map((c) => `${c.aa} | ${c.three} | ${c.count} | ${c.percent.toFixed(1)}% | ${c.category}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 خواص فیزیکوشیمیایی
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧬 اسیدهای آمینه اسیدی: ${acidic} (${((acidic / length) * 100).toFixed(1)}%)
🧬 اسیدهای آمینه بازی: ${basic} (${((basic / length) * 100).toFixed(1)}%)
💧 اسیدهای آمینه آبگریز: ${hydrophobic} (${((hydrophobic / length) * 100).toFixed(1)}%)
💧 اسیدهای آمینه آبدوست: ${hydrophilic} (${((hydrophilic / length) * 100).toFixed(1)}%)
➕ بار خالص در pH 7: ${netCharge.toFixed(2)}
📊 شاخص ناپایداری: ${instability.toFixed(1)} - ${instability < 40 ? "پایدار" : "ناپایدار"}
🌍 شاخص هیدروپاتی (GRAVY): ${gravy.toFixed(2)}`;

    return { composition, length, mw, kda, pi, ec, a280, gravy, instability, netCharge, acidic, basic, hydrophobic, hydrophilic, txt };
  }, [seq, valid]);

  return (
    <Card className="border-violet-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Dna className="size-4 text-violet-500" />
          تحلیل پروتئین
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          توالی پروتئین را وارد کنید: ترکیب اسید آمینه، خواص فیزیکوشیمیایی و نمودارها
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-1 block text-[11px] text-muted-foreground">🧬 ورودی توالی پروتئین</label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            dir="ltr"
            placeholder="MKTLLILAVLCLAQARAA..."
            className="font-mono text-xs"
          />
          {input && !valid && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-500">
              <AlertTriangle className="size-3" /> توالی نامعتبر — فقط حروف استاندارد اسید آمینه مجاز هستند
            </p>
          )}
        </div>

        {result ? (
          <>
            <div className="flex flex-wrap gap-2">
              <CopyBtn text={result.txt} />
              <DownloadTxtBtn content={result.txt} filename="protein_analysis.txt" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ResultBlock title="📊 اطلاعات پایه">
                <KV label="طول پروتئین" value={`${result.length} aa`} primary />
                <KV label="وزن مولکولی" value={`${result.mw.toFixed(1)} Da`} />
                <KV label="وزن (kDa)" value={`${result.kda.toFixed(2)} kDa`} />
                <KV label="نقطه ایزوالکتریک" value={`pI ${result.pi.toFixed(2)}`} />
                <KV label="ضریب خاموشی" value={`${result.ec.toFixed(0)} M⁻¹cm⁻¹`} />
                <KV label="جذب 280nm" value={`${result.a280.toFixed(3)}`} />
              </ResultBlock>
              <ResultBlock title="📊 خواص فیزیکوشیمیایی">
                <KV label="اسیدی" value={`${result.acidic} (${((result.acidic / result.length) * 100).toFixed(1)}%)`} />
                <KV label="بازی" value={`${result.basic} (${((result.basic / result.length) * 100).toFixed(1)}%)`} />
                <KV label="آبگریز" value={`${result.hydrophobic} (${((result.hydrophobic / result.length) * 100).toFixed(1)}%)`} />
                <KV label="آبدوست" value={`${result.hydrophilic} (${((result.hydrophilic / result.length) * 100).toFixed(1)}%)`} />
                <KV label="بار خالص pH 7" value={result.netCharge.toFixed(2)} />
                <KV label="شاخص ناپایداری" value={`${result.instability.toFixed(1)} — ${result.instability < 40 ? "پایدار" : "ناپایدار"}`} />
                <KV label="GRAVY" value={result.gravy.toFixed(2)} />
              </ResultBlock>
            </div>

            <ResultBlock title="📊 ترکیب اسید آمینه">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1 text-right">اسید آمینه</th>
                      <th className="px-2 py-1 text-right">سه حرفی</th>
                      <th className="px-2 py-1 text-right">تعداد</th>
                      <th className="px-2 py-1 text-right">درصد</th>
                      <th className="px-2 py-1 text-right">دسته</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.composition.map((c) => (
                      <tr key={c.aa} className="border-t">
                        <td className="px-2 py-1 font-bold">{c.aa}</td>
                        <td className="px-2 py-1">{c.three}</td>
                        <td className="px-2 py-1">{c.count}</td>
                        <td className="px-2 py-1">{c.percent.toFixed(1)}%</td>
                        <td className="px-2 py-1">
                          <Badge variant="outline" className="rounded-full text-[9px]">{c.category}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ResultBlock>

            <ResultBlock title="📊 نمودار ترکیب دسته‌ای">
              <SimpleBarChart
                data={[
                  { label: "آبگریز", value: result.hydrophobic },
                  { label: "آبدوست", value: result.hydrophilic },
                  { label: "بار مثبت", value: result.basic },
                  { label: "بار منفی", value: result.acidic },
                ]}
                color="#8b5cf6"
              />
            </ResultBlock>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-violet-300/40 p-8 text-center text-xs text-muted-foreground">
            توالی پروتئین را وارد کنید تا تحلیل نمایش داده شود
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  4. GC% SLIDING WINDOW
// ═══════════════════════════════════════════════════════════════════════════════

export function GcWindowTool() {
  const [input, setInput] = useState("");
  const [windowSize, setWindowSize] = useState("50");
  const seq = useMemo(() => cleanSeq(input), [input]);
  const valid = useMemo(() => isValidDna(seq), [seq]);
  const win = Math.max(1, parseInt(windowSize) || 50);

  const result = useMemo(() => {
    if (!valid || seq.length < win) return null;
    const rows: { pos: number; gc: number }[] = [];
    for (let i = 0; i <= seq.length - win; i++) {
      const window = seq.substring(i, i + win);
      rows.push({ pos: i + 1, gc: gcPercent(window) });
    }
    const avg = rows.reduce((s, r) => s + r.gc, 0) / rows.length;
    const max = rows.reduce((m, r) => Math.max(m, r.gc), 0);
    const min = rows.reduce((m, r) => Math.min(m, r.gc), Infinity);
    const maxPos = rows.find((r) => r.gc === max)?.pos ?? 0;
    const minPos = rows.find((r) => r.gc === min)?.pos ?? 0;

    const csvHeaders = ["موقعیت شروع", "GC%"];
    const csvRows = rows.map((r) => [r.pos, `${r.gc.toFixed(1)}%`]);

    return { rows, avg, max, min, maxPos, minPos, csvHeaders, csvRows };
  }, [seq, valid, win]);

  return (
    <Card className="border-violet-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BarChart3 className="size-4 text-violet-500" />
          محاسبه GC% پنجره‌ای
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          درصد GC را در پنجره‌های متحرک محاسبه کنید — مناسب برای تحلیل توزیع GC در ژنوم
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">🧬 ورودی توالی DNA</label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={2}
              dir="ltr"
              placeholder="ATGGCCTGCAGCTTCGACGGCTACTGA..."
              className="font-mono text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">📐 اندازه پنجره</label>
            <Input
              type="number"
              value={windowSize}
              onChange={(e) => setWindowSize(e.target.value)}
              min={1}
              dir="ltr"
            />
          </div>
        </div>

        {result ? (
          <>
            <div className="flex flex-wrap gap-2">
              <DownloadCsvBtn
                headers={result.csvHeaders}
                rows={result.csvRows}
                filename="gc_sliding_window.csv"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <KV label="میانگین GC%" value={`${result.avg.toFixed(1)}%`} primary />
              <KV label="بیشترین GC%" value={`${result.max.toFixed(1)}% (موقعیت ${result.maxPos})`} />
              <KV label="کمترین GC%" value={`${result.min.toFixed(1)}% (موقعیت ${result.minPos})`} />
            </div>

            <ResultBlock title={`📊 نتایج GC% پنجره‌ای (اندازه پنجره: ${win})`}>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-background text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1 text-right">موقعیت شروع</th>
                      <th className="px-2 py-1 text-right">GC%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((r) => (
                      <tr key={r.pos} className="border-t">
                        <td className="px-2 py-1">{r.pos}</td>
                        <td className="px-2 py-1 font-medium" dir="ltr">{r.gc.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ResultBlock>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-violet-300/40 p-8 text-center text-xs text-muted-foreground">
            {seq.length > 0 && seq.length < win
              ? `طول توالی (${seq.length}) کمتر از اندازه پنجره (${win}) است`
              : "توالی DNA و اندازه پنجره را وارد کنید"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  5. PATTERN SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

export function PatternSearchTool() {
  const [seqInput, setSeqInput] = useState("");
  const [patternInput, setPatternInput] = useState("");
  const [caseInsensitive, setCaseInsensitive] = useState(true);

  const seq = useMemo(() => cleanSeq(seqInput), [seqInput]);
  const pattern = useMemo(() => cleanSeq(patternInput), [patternInput]);

  const result = useMemo(() => {
    if (!seq || !pattern) return null;
    const searchSeq = caseInsensitive ? seq.toUpperCase() : seq;
    const searchPattern = caseInsensitive ? pattern.toUpperCase() : pattern;

    const matches: number[] = [];
    for (let i = 0; i <= searchSeq.length - searchPattern.length; i++) {
      if (searchSeq.substring(i, i + searchPattern.length) === searchPattern) {
        matches.push(i + 1);
      }
    }

    const csvHeaders = ["موقعیت", "توالی پیدا شده"];
    const csvRows = matches.map((pos) => [pos, searchSeq.substring(pos - 1, pos - 1 + searchPattern.length)]);

    return { matches, csvHeaders, csvRows };
  }, [seq, pattern, caseInsensitive]);

  return (
    <Card className="border-violet-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <SearchCode className="size-4 text-violet-500" />
          جستجوی الگو
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          الگوی مورد نظر را در توالی DNA/RNA/Protein جستجو کنید
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-1 block text-[11px] text-muted-foreground">🧬 ورودی توالی DNA/RNA/Protein</label>
          <Textarea
            value={seqInput}
            onChange={(e) => setSeqInput(e.target.value)}
            rows={2}
            dir="ltr"
            placeholder="ATGCGTACGTAGCTAGCTAGCATGCTAGCTAGCTAGC"
            className="font-mono text-xs"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">🔍 الگوی جستجو</label>
            <Input
              value={patternInput}
              onChange={(e) => setPatternInput(e.target.value)}
              dir="ltr"
              placeholder="ATG, GCT, TGA..."
              className="font-mono text-xs"
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs">
              <input
                type="checkbox"
                checked={caseInsensitive}
                onChange={(e) => setCaseInsensitive(e.target.checked)}
                className="accent-violet-500"
              />
              حساسیت (Ignore Case)
            </label>
          </div>
        </div>

        {result ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full">
                🔍 {result.matches.length} تطابق پیدا شد
              </Badge>
              <DownloadCsvBtn
                headers={result.csvHeaders}
                rows={result.csvRows}
                filename="pattern_search.csv"
              />
            </div>

            {result.matches.length > 0 ? (
              <ResultBlock title="🔍 نتایج جستجو">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0 bg-background text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1 text-right">#</th>
                        <th className="px-2 py-1 text-right">موقعیت</th>
                        <th className="px-2 py-1 text-right">تطابق</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.matches.map((pos, idx) => (
                        <tr key={pos} className="border-t">
                          <td className="px-2 py-1">{idx + 1}</td>
                          <td className="px-2 py-1 font-medium">{pos}</td>
                          <td className="px-2 py-1 font-mono" dir="ltr">
                            ...{seq.substring(Math.max(0, pos - 6), pos - 1)}
                            <span className="bg-violet-500/20 font-bold">{seq.substring(pos - 1, pos - 1 + pattern.length)}</span>
                            {seq.substring(pos - 1 + pattern.length, pos - 1 + pattern.length + 5)}...
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ResultBlock>
            ) : (
              <div className="rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground text-center">
                هیچ تطابقی پیدا نشد
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-violet-300/40 p-8 text-center text-xs text-muted-foreground">
            توالی و الگو را وارد کنید تا جستجو انجام شود
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  6. NUCLEOTIDE COUNTER
// ═══════════════════════════════════════════════════════════════════════════════

type SeqType = "DNA" | "RNA" | "Protein";

export function NucleotideCounterTool() {
  const [input, setInput] = useState("");
  const [seqType, setSeqType] = useState<SeqType>("DNA");
  const [showChart, setShowChart] = useState(true);

  const seq = useMemo(() => cleanSeq(input), [input]);

  const isValid = useMemo(() => {
    if (!seq) return false;
    if (seqType === "DNA") return /^[ATGC]+$/.test(seq);
    if (seqType === "RNA") return /^[AUGC]+$/.test(seq);
    return /^[ACDEFGHIKLMNPQRSTVWY]+$/.test(seq);
  }, [seq, seqType]);

  const result = useMemo(() => {
    if (!isValid) return null;
    const counts = countBases(seq);

    let labels: string[];
    if (seqType === "DNA") labels = ["A", "T", "G", "C"];
    else if (seqType === "RNA") labels = ["A", "U", "G", "C"];
    else labels = "ACDEFGHIKLMNPQRSTWY".split("");

    const data = labels.map((l) => ({ label: l, value: counts[l] ?? 0 }));
    const total = data.reduce((s, d) => s + d.value, 0);

    const csvHeaders = ["نوکلئوتید", "تعداد", "درصد"];
    const csvRows = data.map((d) => [d.label, d.value, `${total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%`]);

    return { data, total, csvHeaders, csvRows };
  }, [seq, isValid, seqType]);

  return (
    <Card className="border-violet-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ArrowDownAZ className="size-4 text-violet-500" />
          شمارش نوکلئوتیدها
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          تعداد و درصد هر نوکلئوتید/اسید آمینه را با نمودار و جدول مشاهده کنید
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-1 block text-[11px] text-muted-foreground">🧬 ورودی توالی DNA/RNA</label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            dir="ltr"
            placeholder="ATGCGTACGTAGCTAGCTAGCATGCTAGCTAGCTAGC"
            className="font-mono text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">🧪 نوع توالی</label>
            <div className="flex gap-1">
              {(["DNA", "RNA", "Protein"] as SeqType[]).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={seqType === t ? "default" : "outline"}
                  onClick={() => setSeqType(t)}
                  className={cn(seqType === t && "bg-violet-600 hover:bg-violet-700")}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted-foreground">📊 نمایش</label>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={showChart ? "default" : "outline"}
                onClick={() => setShowChart(true)}
                className={cn(showChart && "bg-violet-600 hover:bg-violet-700")}
              >
                نمودار + جدول
              </Button>
              <Button
                size="sm"
                variant={!showChart ? "default" : "outline"}
                onClick={() => setShowChart(false)}
                className={cn(!showChart && "bg-violet-600 hover:bg-violet-700")}
              >
                فقط جدول
              </Button>
            </div>
          </div>
        </div>

        {result ? (
          <>
            <div className="flex flex-wrap gap-2">
              <DownloadCsvBtn
                headers={result.csvHeaders}
                rows={result.csvRows}
                filename="nucleotide_count.csv"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-[11px]"
                onClick={() => { navigator.clipboard.writeText(seq); toast.success("کپی شد"); }}
              >
                <ClipboardCopy className="size-3" /> کپی توالی
              </Button>
            </div>

            {showChart && (
              <ResultBlock title="📊 نمودار توزیع">
                <SimpleBarChart data={result.data} color="#8b5cf6" />
              </ResultBlock>
            )}

            <ResultBlock title="📊 جدول شمارش">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1 text-right">{seqType === "Protein" ? "اسید آمینه" : "نوکلئوتید"}</th>
                      <th className="px-2 py-1 text-right">تعداد</th>
                      <th className="px-2 py-1 text-right">درصد</th>
                      <th className="px-2 py-1 text-right">نمودار</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((d) => (
                      <tr key={d.label} className="border-t">
                        <td className="px-2 py-1 font-bold">{d.label}</td>
                        <td className="px-2 py-1">{d.value}</td>
                        <td className="px-2 py-1" dir="ltr">{result.total > 0 ? ((d.value / result.total) * 100).toFixed(1) : 0}%</td>
                        <td className="px-2 py-1">
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-violet-500 transition-all"
                              style={{ width: `${result.total > 0 ? (d.value / result.total) * 100 : 0}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">مجموع: {result.total} {seqType === "Protein" ? "اسید آمینه" : "نوکلئوتید"}</p>
            </ResultBlock>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-violet-300/40 p-8 text-center text-xs text-muted-foreground">
            توالی را وارد کنید تا شمارش نمایش داده شود
          </div>
        )}
      </CardContent>
    </Card>
  );
}
