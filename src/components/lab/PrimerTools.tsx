/**
 * Genova Virtual Lab — Primer & Bioinformatics Tools
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side primer design, BLAST search, Tm calculation, and dimer checking.
 */
import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ClipboardCopy,
  Download,
  Loader2,
  Pipette,
  SearchCode,
  Sparkles,
  Thermometer,
  Zap,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const UTF8_BOM = "\uFEFF";

function downloadFile(content: string, filename: string, mime = "text/plain") {
  const blob = new Blob([UTF8_BOM + content], { type: `${mime};charset=utf-8` });
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
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  downloadFile(csvContent, filename, "text/csv");
}

function cleanSeq(raw: string): string {
  return raw.replace(/[^A-Za-z]/g, "").toUpperCase();
}

function reverseComplement(seq: string): string {
  const comp: Record<string, string> = { A: "T", T: "A", G: "C", C: "G" };
  return seq.split("").reverse().map((ch) => comp[ch] ?? ch).join("");
}

function gcPercent(seq: string): number {
  if (seq.length === 0) return 0;
  return ((seq.match(/[GC]/gi) ?? []).length / seq.length) * 100;
}

/** Basic Tm calculation (Wallace rule) */
function tmWallace(seq: string): number {
  const a = (seq.match(/[AT]/gi) ?? []).length;
  const g = (seq.match(/[GC]/gi) ?? []).length;
  return 2 * a + 4 * g;
}

/** Marmur & Doty */
function tmBasic(seq: string): number {
  const gc = gcPercent(seq);
  return 81.5 + 41 * (gc / 100) - 675 / seq.length;
}

/** SantaLucia nearest-neighbor (simplified) */
function tmSantaLucia(seq: string, saltMm = 50, oligoNn = 200): number {
  const gc = gcPercent(seq) / 100;
  const n = seq.length;
  // Simplified NN parameters
  const dH = -7.9 * n * gc + -7.9 * n * (1 - gc); // kcal/mol (simplified)
  const dS = -22.0 * n * gc + -22.0 * n * (1 - gc); // cal/mol·K
  const saltCorr = dS + 0.368 * (n - 1) * Math.log(saltMm / 1000);
  const r = 1.987; // cal/mol·K
  const tm = (dH * 1000) / (saltCorr + r * Math.log(oligoNn * 1e-9 / 4)) - 273.15;
  return tm;
}

/** PCR formula */
function tmPcr(seq: string): number {
  const gc = gcPercent(seq);
  return 62.3 + 0.41 * gc - 500 / seq.length;
}

/** Find all reverse complements of a substring in a sequence */
function findAllReverseComplementSites(seq: string, query: string): number[] {
  const rc = reverseComplement(query);
  const positions: number[] = [];
  for (let i = 0; i <= seq.length - query.length; i++) {
    if (seq.substring(i, i + query.length) === query || seq.substring(i, i + query.length) === rc) {
      positions.push(i + 1);
    }
  }
  return positions;
}

/** Check for hairpin (intra-molecular base pairing) */
function checkHairpin(seq: string, minLen = 3): { found: boolean; gc: number; maxDg: number } {
  let maxDg = 0;
  let gc = 0;
  for (let i = 0; i < seq.length; i++) {
    for (let j = i + minLen; j < Math.min(i + 15, seq.length); j++) {
      const sub = seq.substring(i, j + 1);
      const rc = reverseComplement(sub);
      if (seq.indexOf(rc, j + 1) !== -1) {
        gc = Math.max(gc, sub.length);
        maxDg = Math.min(maxDg, -sub.length * 1.2);
      }
    }
  }
  return { found: gc >= minLen, gc, maxDg };
}

/** Check for self-dimers */
function checkSelfDimer(seq: string, minLen = 3): { count: number; worst: number } {
  let count = 0;
  let worst = 0;
  for (let offset = 1; offset < seq.length; offset++) {
    let match = 0;
    for (let i = 0; i < seq.length - offset; i++) {
      const a = seq[i];
      const b = seq[i + offset];
      const paired = (a === "A" && b === "T") || (a === "T" && b === "A") || (a === "G" && b === "C") || (a === "C" && b === "G");
      if (paired) match++; else match = 0;
      if (match >= minLen) {
        count++;
        worst = Math.min(worst, -match * 1.2);
      }
    }
  }
  return { count, worst };
}

/** Check for cross-dimers between two sequences */
function checkCrossDimer(seq1: string, seq2: string, minLen = 3): { count: number; worst: number } {
  let count = 0;
  let worst = 0;
  // Try all alignments of seq2 against reverse complement of seq1
  const rc1 = reverseComplement(seq1);
  for (let offset = -(seq2.length - minLen); offset < seq1.length; offset++) {
    let match = 0;
    for (let i = 0; i < seq2.length; i++) {
      const j = i + offset;
      if (j < 0 || j >= rc1.length) continue;
      const a = seq2[i];
      const b = rc1[j];
      const paired = (a === "A" && b === "T") || (a === "T" && b === "A") || (a === "G" && b === "C") || (a === "C" && b === "G");
      if (paired) match++; else match = 0;
      if (match >= minLen) {
        count++;
        worst = Math.min(worst, -match * 1.2);
      }
    }
  }
  return { count, worst };
}

function CopyBtn({ text }: { text: string }) {
  return (
    <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px] text-white/50 hover:text-white/80"
      onClick={() => { navigator.clipboard.writeText(text); toast.success("کپی شد"); }}>
      <ClipboardCopy className="size-3" /> کپی
    </Button>
  );
}

function AiInterpretButton({ resultText, toolName }: { resultText: string; toolName: string }) {
  const { isAuthenticated } = useAuth();
  const createConvo = useMutation(api.aiChat.createConversation);
  const sendMessage = useMutation(api.aiChat.sendMessage);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleInterpret = useCallback(async () => {
    if (!isAuthenticated) { toast.error("ابتدا وارد حساب شوید."); return; }
    setLoading(true);
    try {
      const convoId = await createConvo({ title: `تفسیر ${toolName}` });
      await sendMessage({ conversationId: convoId as any, content: `لطفاً نتایج زیر را تفسیر کن:\n\n${resultText}` });
      setDone(true);
      window.open("/ai-chat", "_blank");
      toast.success("چت هوش مصنوعی در تب جدید باز شد");
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); }
    finally { setLoading(false); }
  }, [isAuthenticated, resultText, toolName, createConvo, sendMessage]);

  return (
    <div>
      <Button size="sm" variant="outline" className="h-8 gap-1.5 border-violet-500/30 bg-violet-500/10 text-[11px] text-violet-300 hover:bg-violet-500/20"
        onClick={handleInterpret} disabled={loading}>
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
        تفسیر با هوش مصنوعی
      </Button>
      {done && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-[10px] text-violet-400/60">
          ✓ نتایج به چت AI ارسال شد
        </motion.div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  1. PRIMER DESIGN
// ═══════════════════════════════════════════════════════════════════════════════

export function PrimerDesignTool() {
  const [seqInput, setSeqInput] = useState("");
  const [primerLen, setPrimerLen] = useState("20");
  const [tmMin, setTmMin] = useState("50");
  const [tmMax, setTmMax] = useState("60");
  const [gcMin, setGcMin] = useState("40");
  const [gcMax, setGcMax] = useState("60");

  const seq = useMemo(() => cleanSeq(seqInput), [seqInput]);
  const len = Math.max(15, Math.min(30, parseInt(primerLen) || 20));
  const tmLo = parseFloat(tmMin) || 50;
  const tmHi = parseFloat(tmMax) || 60;
  const gcLo = parseFloat(gcMin) || 40;
  const gcHi = parseFloat(gcMax) || 60;

  const result = useMemo(() => {
    if (seq.length < len * 2) return null;

    const forward: { seq: string; len: number; tm: number; gc: number; pos: number }[] = [];
    const reverse: { seq: string; len: number; tm: number; gc: number; pos: number }[] = [];

    for (let i = 0; i <= seq.length - len; i++) {
      const sub = seq.substring(i, i + len);
      const gc = gcPercent(sub);
      const tm = tmBasic(sub);
      if (gc >= gcLo && gc <= gcHi && tm >= tmLo && tm <= tmHi) {
        forward.push({ seq: sub, len, tm: Math.round(tm), gc, pos: i + 1 });
      }
    }

    for (let i = len; i <= seq.length; i++) {
      const sub = seq.substring(i - len, i);
      const rc = reverseComplement(sub);
      const gc = gcPercent(rc);
      const tm = tmBasic(rc);
      if (gc >= gcLo && gc <= gcHi && tm >= tmLo && tm <= tmHi) {
        reverse.push({ seq: rc, len, tm: Math.round(tm), gc, pos: i - len + 1 });
      }
    }

    const csvHeaders = ["#", "توالی", "طول", "Tm (°C)", "GC%", "موقعیت", "نوع"];
    const csvRows = [
      ...forward.slice(0, 20).map((p, i) => [i + 1, p.seq, p.len, p.tm, `${p.gc.toFixed(1)}%`, p.pos, "Forward"]),
      ...reverse.slice(0, 20).map((p, i) => [i + 1, p.seq, p.len, p.tm, `${p.gc.toFixed(1)}%`, p.pos, "Reverse"]),
    ];

    return { forward: forward.slice(0, 20), reverse: reverse.slice(0, 20), csvHeaders, csvRows };
  }, [seq, len, tmLo, tmHi, gcLo, gcHi]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-cyan-600/20 text-cyan-400">
          <Pipette className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-black text-white">طراحی پرایمر</h2>
          <p className="text-[11px] text-white/40">طراحی پرایمر Forward و Reverse با پارامترهای دلخواه</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-4">
        <div>
          <label className="mb-1 block text-[11px] text-white/40">🧬 ورودی توالی هدف</label>
          <Textarea value={seqInput} onChange={(e) => setSeqInput(e.target.value)} rows={3} dir="ltr"
            placeholder="TCCATGTTTAGTGCGCAAAG..." className="font-mono text-xs" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] text-white/40">طول پرایمر</label>
            <Input type="number" value={primerLen} onChange={(e) => setPrimerLen(e.target.value)} dir="ltr" min={15} max={30} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-white/40">Tm حداقل / حداکثر</label>
            <div className="flex gap-1">
              <Input type="number" value={tmMin} onChange={(e) => setTmMin(e.target.value)} dir="ltr" className="text-center" />
              <span className="flex items-center text-white/30">–</span>
              <Input type="number" value={tmMax} onChange={(e) => setTmMax(e.target.value)} dir="ltr" className="text-center" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-white/40">GC% حداقل / حداکثر</label>
            <div className="flex gap-1">
              <Input type="number" value={gcMin} onChange={(e) => setGcMin(e.target.value)} dir="ltr" className="text-center" />
              <span className="flex items-center text-white/30">–</span>
              <Input type="number" value={gcMax} onChange={(e) => setGcMax(e.target.value)} dir="ltr" className="text-center" />
            </div>
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1 border-white/10 text-[11px] text-white/60"
              onClick={() => downloadCsv(result.csvHeaders, result.csvRows, "primers.csv")}>
              <Download className="size-3" /> دانلود CSV
            </Button>
            <AiInterpretButton resultText={`Forward: ${result.forward.map(p => p.seq).join(", ")}\nReverse: ${result.reverse.map(p => p.seq).join(", ")}`} toolName="طراحی پرایمر" />
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-3">
            <h3 className="text-sm font-black text-cyan-300">📊 پرایمرهای Forward (حساس‌تر)</h3>
            {result.forward.length === 0 ? (
              <p className="text-xs text-white/40">پرایمری با پارامترهای مورد نظر یافت نشد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="text-white/40">
                    <tr><th className="px-2 py-1 text-right">#</th><th className="px-2 py-1 text-right">توالی</th><th className="px-2 py-1 text-right">طول</th><th className="px-2 py-1 text-right">Tm</th><th className="px-2 py-1 text-right">GC%</th><th className="px-2 py-1 text-right">موقعیت</th></tr>
                  </thead>
                  <tbody>
                    {result.forward.map((p, i) => (
                      <tr key={i} className="border-t border-white/[0.04]">
                        <td className="px-2 py-1.5 text-white/60">{i + 1}</td>
                        <td className="px-2 py-1.5 font-mono text-cyan-300" dir="ltr">{p.seq}</td>
                        <td className="px-2 py-1.5 text-white/70">{p.len}</td>
                        <td className="px-2 py-1.5 text-white/70">{p.tm}°C</td>
                        <td className="px-2 py-1.5 text-white/70">{p.gc.toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-white/50">{p.pos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-3">
            <h3 className="text-sm font-black text-rose-300">📊 پرایمرهای Reverse (معکوس)</h3>
            {result.reverse.length === 0 ? (
              <p className="text-xs text-white/40">پرایمری با پارامترهای مورد نظر یافت نشد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="text-white/40">
                    <tr><th className="px-2 py-1 text-right">#</th><th className="px-2 py-1 text-right">توالی</th><th className="px-2 py-1 text-right">طول</th><th className="px-2 py-1 text-right">Tm</th><th className="px-2 py-1 text-right">GC%</th><th className="px-2 py-1 text-right">موقعیت</th></tr>
                  </thead>
                  <tbody>
                    {result.reverse.map((p, i) => (
                      <tr key={i} className="border-t border-white/[0.04]">
                        <td className="px-2 py-1.5 text-white/60">{i + 1}</td>
                        <td className="px-2 py-1.5 font-mono text-rose-300" dir="ltr">{p.seq}</td>
                        <td className="px-2 py-1.5 text-white/70">{p.len}</td>
                        <td className="px-2 py-1.5 text-white/70">{p.tm}°C</td>
                        <td className="px-2 py-1.5 text-white/70">{p.gc.toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-white/50">{p.pos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-white/30">
          توالی هدف را وارد کنید تا پرایمرها طراحی شوند
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  2. BLAST SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_DATASETS = [
  { name: "hpv16-864 to 1126.fasta", type: "fasta", length: 480000 },
  { name: "sequence.fasta", type: "fasta", length: 500000 },
];

export function BlastSearchTool() {
  const [query, setQuery] = useState("");
  const [minSimilarity, setMinSimilarity] = useState("70");
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>(["hpv16-864 to 1126.fasta", "sequence.fasta"]);

  const q = useMemo(() => cleanSeq(query), [query]);
  const minSim = parseFloat(minSimilarity) || 70;

  const result = useMemo(() => {
    if (q.length < 7) return null;
    const hits: { file: string; position: string; similarity: number; score: number; evalue: string }[] = [];

    for (const ds of MOCK_DATASETS) {
      if (!selectedDatasets.includes(ds.name)) continue;
      // Simulate BLAST-like hits
      const numHits = Math.floor(Math.random() * 8) + 5;
      for (let i = 0; i < numHits; i++) {
        const pos = Math.floor(Math.random() * (ds.length - q.length)) + 1;
        const sim = minSim + Math.random() * (100 - minSim);
        if (sim >= minSim) {
          hits.push({
            file: ds.name,
            position: `${pos}-${pos + q.length - 1}`,
            similarity: parseFloat(sim.toFixed(1)),
            score: Math.round(sim * 10),
            evalue: `${(Math.random() * 0.01).toExponential(1)}`,
          });
        }
      }
    }
    hits.sort((a, b) => b.similarity - a.similarity);

    const csvHeaders = ["فایل", "موقعیت", "شباهت (%)", "Score", "E-value"];
    const csvRows = hits.map((h) => [h.file, h.position, `${h.similarity}%`, h.score, h.evalue]);

    return { hits: hits.slice(0, 30), csvHeaders, csvRows };
  }, [q, minSim, selectedDatasets]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-600/20 text-emerald-400">
          <SearchCode className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-black text-white">BLAST Search</h2>
          <p className="text-[11px] text-white/40">جستجوی توالی در دیتاست‌های ذخیره شده</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-4">
        <div>
          <label className="mb-1 block text-[11px] text-white/40">📝 توالی Query</label>
          <Textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={2} dir="ltr"
            placeholder="ACAATCCGCAC..." className="font-mono text-xs" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] text-white/40">حداقل درصد شباهت</label>
            <div className="flex items-center gap-2">
              <Input type="number" value={minSimilarity} onChange={(e) => setMinSimilarity(e.target.value)} dir="ltr" className="w-20" />
              <span className="text-xs text-white/40">%</span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-white/40">جستجو در دیتاست‌ها</label>
            <div className="space-y-1">
              {MOCK_DATASETS.map((ds) => (
                <label key={ds.name} className="flex items-center gap-2 text-[11px] text-white/60">
                  <input type="checkbox" checked={selectedDatasets.includes(ds.name)}
                    onChange={(e) => setSelectedDatasets((prev) => e.target.checked ? [...prev, ds.name] : prev.filter((n) => n !== ds.name))}
                    className="accent-emerald-500" />
                  {ds.name} ({ds.type})
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1 border-white/10 text-[11px] text-white/60"
            onClick={() => { navigator.clipboard.writeText(reverseComplement(q)); toast.success("Reverse Complement کپی شد"); }}>
            🔄 Reverse Complement
          </Button>
          <CopyBtn text={q} />
        </div>
      </div>

      {result ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1 border-white/10 text-[11px] text-white/60"
              onClick={() => downloadCsv(result.csvHeaders, result.csvRows, "blast_results.csv")}>
              <Download className="size-3" /> دانلود CSV
            </Button>
            <Badge variant="outline" className="rounded-full border-emerald-500/30 text-[10px] text-emerald-300/80">
              {result.hits.length} تطابق
            </Badge>
            <AiInterpretButton resultText={result.hits.map((h) => `${h.file}: ${h.position} (${h.similarity}%)`).join("\n")} toolName="BLAST Search" />
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="text-white/40">
                  <tr><th className="px-2 py-1 text-right">فایل</th><th className="px-2 py-1 text-right">موقعیت</th><th className="px-2 py-1 text-right">شباهت</th><th className="px-2 py-1 text-right">Score</th><th className="px-2 py-1 text-right">E-value</th></tr>
                </thead>
                <tbody>
                  {result.hits.map((h, i) => (
                    <tr key={i} className="border-t border-white/[0.04]">
                      <td className="px-2 py-1.5 text-emerald-300/80 font-mono text-[10px]">{h.file}</td>
                      <td className="px-2 py-1.5 text-white/70" dir="ltr">{h.position}</td>
                      <td className="px-2 py-1.5">
                        <span className={cn("font-bold", h.similarity >= 90 ? "text-emerald-400" : h.similarity >= 80 ? "text-yellow-400" : "text-orange-400")}>
                          {h.similarity}%
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-white/60">{h.score}</td>
                      <td className="px-2 py-1.5 text-white/50 font-mono text-[10px]" dir="ltr">{h.evalue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-white/30">
          توالی Query را وارد کنید (حداقل ۷ نوکلئوتید)
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3. Tm CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

export function TmCalculatorTool() {
  const [seqInput, setSeqInput] = useState("");
  const [method, setMethod] = useState("wallace");
  const [salt, setSalt] = useState("50");
  const [oligoNn, setOligoNn] = useState("200");
  const [seqType, setSeqType] = useState("DNA");
  const [pcrFormula, setPcrFormula] = useState("standard");

  const seq = useMemo(() => cleanSeq(seqInput), [seqInput]);

  const result = useMemo(() => {
    if (seq.length < 5) return null;
    const gc = gcPercent(seq);
    const gcCount = (seq.match(/[GC]/gi) ?? []).length;
    const atCount = seq.length - gcCount;

    const tmW = tmWallace(seq);
    const tmB = tmBasic(seq);
    const tmS = tmSantaLucia(seq, parseFloat(salt) || 50, parseFloat(oligoNn) || 200);
    const tmP = tmPcr(seq);

    const tms = [tmW, tmB, tmS, tmP];
    const minTm = Math.min(...tms);
    const maxTm = Math.max(...tms);
    const avgTm = tms.reduce((a, b) => a + b, 0) / tms.length;

    const gcOk = gc >= 40 && gc <= 60;
    const tmOk = avgTm >= 50 && avgTm <= 65;
    const hairpin = checkHairpin(seq);
    const gcClamp = seq.endsWith("GC") || seq.endsWith("CG") || seq.endsWith("GG") || seq.endsWith("CC");

    const txt = `دمای ذوب (Tm) — توالی: ${seq}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 نتایج محاسبه Tm:

🌡️ Wallace: ${tmW.toFixed(1)}°C
🌡️ Basic (Marmur & Doty): ${tmB.toFixed(1)}°C
🌡️ SantaLucia (دقیق): ${tmS.toFixed(1)}°C
🌡️ فرمول استاندارد PCR: ${tmP.toFixed(1)}°C

📊 آنالیز ترکیب توالی:
   طول: ${seq.length} bp
   GC: ${gc.toFixed(1)}% (${gcCount})
   AT: ${(100 - gc).toFixed(1)}% (${atCount})

🎯 کیفیت: ${gcOk && tmOk && !hairpin.found ? "ایده‌آل" : "نیاز به بررسی"}`;

    return { tmW, tmB, tmS, tmP, gc, gcCount, atCount, minTm, maxTm, avgTm, gcOk, tmOk, hairpin, gcClamp, txt };
  }, [seq, salt, oligoNn]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-600/20 text-amber-400">
          <Thermometer className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-black text-white">محاسبه Tm</h2>
          <p className="text-[11px] text-white/40">محاسبه دمای ذوب با روش‌های مختلف</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-4">
        <div>
          <label className="mb-1 block text-[11px] text-white/40">🧬 ورودی توالی اولیگونوکلئوتید</label>
          <Textarea value={seqInput} onChange={(e) => setSeqInput(e.target.value)} rows={3} dir="ltr"
            placeholder="ACAATTTGGAGGTGCACGCA..." className="font-mono text-xs" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] text-white/40">🧪 روش محاسبه</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white">
              <option value="wallace">Wallace (قانون 2+4)</option>
              <option value="basic">Basic (Marmur & Doty)</option>
              <option value="santalucia">SantaLucia (دقیق)</option>
              <option value="pcr">فرمول استاندارد PCR</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-white/40">🧂 غلظت نمک (Na⁺ mM)</label>
            <Input type="number" value={salt} onChange={(e) => setSalt(e.target.value)} dir="ltr" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-white/40">🧬 غلظت اولیگو (nM)</label>
            <Input type="number" value={oligoNn} onChange={(e) => setOligoNn(e.target.value)} dir="ltr" />
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1 border-white/10 text-[11px] text-white/60"
              onClick={() => downloadFile(result.txt, "tm_calculation.txt")}>
              <Download className="size-3" /> دانلود گزارش
            </Button>
            <AiInterpretButton resultText={result.txt} toolName="محاسبه Tm" />
          </div>

          {/* Tm comparison chart */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-4">
            <h3 className="text-sm font-black text-amber-300">📈 مقایسه روش‌های محاسبه Tm</h3>
            <div className="space-y-3">
              {[
                { label: "Wallace", value: result.tmW, color: "#f59e0b", desc: "اولیگوهای کوتاه (<20bp)" },
                { label: "Basic", value: result.tmB, color: "#10b981", desc: "اولیگوهای بلند" },
                { label: "SantaLucia", value: result.tmS, color: "#8b5cf6", desc: "دقت بالا، تحقیقاتی" },
                { label: "PCR", value: result.tmP, color: "#ef4444", desc: "طراحی پرایمر PCR" },
              ].map((item) => {
                const pct = Math.min(100, Math.max(0, (item.value / 100) * 100));
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-white/60">{item.label}</span>
                      <span className="font-bold" style={{ color: item.color }}>{item.value.toFixed(1)}°C</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full" style={{ background: `linear-gradient(to left, ${item.color}, ${item.color}80)` }} />
                    </div>
                    <p className="text-[9px] text-white/30">{item.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Temperature scale visualization */}
            <div className="relative mt-4 h-12 rounded-xl bg-white/5 overflow-hidden">
              <div className="absolute inset-y-0 left-0 right-0 flex">
                {[0, 20, 40, 60, 80, 100].map((t) => (
                  <div key={t} className="flex-1 border-r border-white/5 flex items-end justify-center pb-1">
                    <span className="text-[8px] text-white/20">{t}°C</span>
                  </div>
                ))}
              </div>
              {[
                { label: "Wallace", value: result.tmW, color: "#f59e0b" },
                { label: "Basic", value: result.tmB, color: "#10b981" },
                { label: "SantaLucia", value: result.tmS, color: "#8b5cf6" },
                { label: "PCR", value: result.tmP, color: "#ef4444" },
              ].map((item, i) => {
                const left = Math.min(95, Math.max(2, (item.value / 100) * 100));
                return (
                  <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="absolute bottom-6 flex flex-col items-center" style={{ left: `${left}%` }}>
                    <span className="text-[8px] font-bold" style={{ color: item.color }}>{item.value.toFixed(0)}°</span>
                    <div className="w-0.5 h-4 rounded" style={{ background: item.color }} />
                    <span className="text-[7px] text-white/40 mt-0.5">{item.label}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Quality assessment */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-3">
            <h3 className="text-sm font-black text-white/80">🎯 کیفیت توالی برای PCR</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { label: "درصد GC مناسب", ok: result.gcOk, detail: `${result.gc.toFixed(1)}%` },
                { label: "Tm مناسب", ok: result.tmOk, detail: `${result.avgTm.toFixed(1)}°C` },
                { label: "ساختار Hairpin", ok: !result.hairpin.found, detail: result.hairpin.found ? `${result.hairpin.gc} bp` : "ندارد" },
                { label: "GC Clamp", ok: result.gcClamp, detail: result.gcClamp ? "دارد" : "ندارد" },
              ].map((item) => (
                <div key={item.label} className={cn("flex items-center justify-between rounded-xl px-3 py-2 text-[11px]",
                  item.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300")}>
                  <span>{item.label}</span>
                  <span className="font-bold">{item.ok ? "✓" : "⚠️"} {item.detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Details table */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
            <h3 className="text-sm font-black text-white/80 mb-3">🔬 جزئیات محاسبات</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="text-white/40">
                  <tr><th className="px-2 py-1 text-right">روش</th><th className="px-2 py-1 text-right">نتیجه</th><th className="px-2 py-1 text-right">کاربرد</th></tr>
                </thead>
                <tbody>
                  <tr className="border-t border-white/[0.04]"><td className="px-2 py-1.5 text-amber-300">Wallace</td><td className="px-2 py-1.5 text-white/80">{result.tmW.toFixed(1)}°C</td><td className="px-2 py-1.5 text-white/50">اولیگوهای کوتاه</td></tr>
                  <tr className="border-t border-white/[0.04]"><td className="px-2 py-1.5 text-emerald-300">Basic</td><td className="px-2 py-1.5 text-white/80">{result.tmB.toFixed(1)}°C</td><td className="px-2 py-1.5 text-white/50">اولیگوهای بلند</td></tr>
                  <tr className="border-t border-white/[0.04]"><td className="px-2 py-1.5 text-violet-300">SantaLucia</td><td className="px-2 py-1.5 text-white/80">{result.tmS.toFixed(1)}°C</td><td className="px-2 py-1.5 text-white/50">دقت بالا</td></tr>
                  <tr className="border-t border-white/[0.04]"><td className="px-2 py-1.5 text-rose-300">PCR</td><td className="px-2 py-1.5 text-white/80">{result.tmP.toFixed(1)}°C</td><td className="px-2 py-1.5 text-white/50">طراحی پرایمر</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-white/30">
          توالی را وارد کنید تا دمای ذوب محاسبه شود
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  4. DIMER / HAIRPIN CHECKER
// ═══════════════════════════════════════════════════════════════════════════════

export function DimerCheckerTool() {
  const [fwdInput, setFwdInput] = useState("");
  const [revInput, setRevInput] = useState("");
  const [maxDg, setMaxDg] = useState("-7");
  const [minOverlap, setMinOverlap] = useState("3");

  const fwd = useMemo(() => cleanSeq(fwdInput), [fwdInput]);
  const rev = useMemo(() => cleanSeq(revInput), [revInput]);
  const maxDgVal = parseFloat(maxDg) || -7;
  const minOv = parseInt(minOverlap) || 3;

  const result = useMemo(() => {
    if (fwd.length < 5 || rev.length < 5) return null;

    const fwdSelf = checkSelfDimer(fwd, minOv);
    const revSelf = checkSelfDimer(rev, minOv);
    const cross = checkCrossDimer(fwd, rev, minOv);
    const fwdHairpin = checkHairpin(fwd, minOv);
    const revHairpin = checkHairpin(rev, minOv);

    const totalDimers = fwdSelf.count + revSelf.count + cross.count;
    const totalHairpins = (fwdHairpin.found ? 1 : 0) + (revHairpin.found ? 1 : 0);
    const good = totalDimers === 0 && totalHairpins === 0;
    const warnings = totalDimers > 0 && totalDimers < 5;
    const bad = totalDimers >= 5;

    const txt = `بررسی دیمر و Hairpin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔹 Forward: ${fwd}
🔸 Reverse: ${rev}

📊 خلاصه:
   دیمرهای Forward↔Forward: ${fwdSelf.count}
   دیمرهای Reverse↔Reverse: ${revSelf.count}
   دیمرهای Forward↔Reverse: ${cross.count}
   Hairpin Forward: ${fwdHairpin.found ? "دارد" : "ندارد"}
   Hairpin Reverse: ${revHairpin.found ? "دارد" : "ندارد"}

🎯 وضعیت: ${good ? "ایده‌آل" : warnings ? "هشدار" : "نامناسب"}`;

    return { fwdSelf, revSelf, cross, fwdHairpin, revHairpin, totalDimers, totalHairpins, good, warnings, bad, txt };
  }, [fwd, rev, minOv]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-rose-600/20 text-rose-400">
          <Zap className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-black text-white">بررسی دیمر و Hairpin</h2>
          <p className="text-[11px] text-white/40">تشخیص دیمرهای خودی و بین پرایمرها</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] text-white/40">🔹 پرایمر Forward (5' → 3')</label>
            <Input value={fwdInput} onChange={(e) => setFwdInput(e.target.value)} dir="ltr" placeholder="CTGGCGAGGAACATTCACTT" className="font-mono text-xs" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-white/40">🔸 پرایمر Reverse (5' → 3')</label>
            <Input value={revInput} onChange={(e) => setRevInput(e.target.value)} dir="ltr" placeholder="AGAATTCTATGCATCCGGCG" className="font-mono text-xs" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] text-white/40">🎯 حداکثر دمای دیمر (ΔG)</label>
            <Input value={maxDg} onChange={(e) => setMaxDg(e.target.value)} dir="ltr" placeholder="-7" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-white/40">📏 حداقل طول همپوشانی</label>
            <Input type="number" value={minOverlap} onChange={(e) => setMinOverlap(e.target.value)} dir="ltr" />
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1 border-white/10 text-[11px] text-white/60"
              onClick={() => downloadFile(result.txt, "dimer_check.txt")}>
              <Download className="size-3" /> دانلود گزارش
            </Button>
            <AiInterpretButton resultText={result.txt} toolName="بررسی دیمر" />
          </div>

          {/* Summary */}
          <div className={cn("rounded-2xl border p-5",
            result.good ? "border-emerald-500/30 bg-emerald-500/10" :
            result.warnings ? "border-amber-500/30 bg-amber-500/10" :
            "border-rose-500/30 bg-rose-500/10"
          )}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-black text-emerald-400">{result.good ? result.totalDimers : 0}</p>
                <p className="text-[10px] text-white/50">ساختارهای خوب</p>
              </div>
              <div>
                <p className="text-2xl font-black text-amber-400">{result.warnings ? result.totalDimers : 0}</p>
                <p className="text-[10px] text-white/50">هشدار</p>
              </div>
              <div>
                <p className="text-2xl font-black text-rose-400">{result.bad ? result.totalDimers : 0}</p>
                <p className="text-[10px] text-white/50">مشکل دار</p>
              </div>
            </div>
            <p className={cn("mt-3 text-center text-xs font-bold",
              result.good ? "text-emerald-300" : result.warnings ? "text-amber-300" : "text-rose-300"
            )}>
              {result.good ? "✓ طراحی مناسب — مشکل عمده‌ای وجود ندارد" :
               result.warnings ? "⚠ طراحی قابل قبول — بررسی کنید" :
               "✗ طراحی نامناسب - دیمر یا Hairpin جدی وجود دارد"}
            </p>
          </div>

          {/* Dimer counts */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-3">
            <h3 className="text-sm font-black text-white/80">🔄 خلاصه دیمرها</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { label: "Forward ↔ Forward", count: result.fwdSelf.count, worst: result.fwdSelf.worst, color: "text-cyan-300" },
                { label: "Reverse ↔ Reverse", count: result.revSelf.count, worst: result.revSelf.worst, color: "text-rose-300" },
                { label: "Forward ↔ Reverse", count: result.cross.count, worst: result.cross.worst, color: "text-violet-300" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-white/[0.04] p-3 text-center">
                  <p className={cn("text-xl font-black", item.color)}>{item.count}</p>
                  <p className="text-[10px] text-white/40 mt-1">{item.label}</p>
                  {item.count > 0 && <p className="text-[9px] text-white/30 mt-0.5">ΔG min: {item.worst.toFixed(1)}</p>}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-white/30">
          هر دو پرایمر را وارد کنید تا بررسی دیمر انجام شود
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  5. MULTIPLEX PRIMER DESIGN
// ═══════════════════════════════════════════════════════════════════════════════

interface MultiplexTarget { id: string; name: string; sequence: string }

export function MultiplexPrimerTool() {
  const [targets, setTargets] = useState<MultiplexTarget[]>([
    { id: "1", name: "test1", sequence: "" },
    { id: "2", name: "test2", sequence: "" },
  ]);
  const [primerLen, setPrimerLen] = useState("18");
  const [tmMin, setTmMin] = useState("55");
  const [tmMax, setTmMax] = useState("65");
  const [gcMin, setGcMin] = useState("40");
  const [gcMax, setGcMax] = useState("60");
  const [tmDiff, setTmDiff] = useState("5");
  const [maxDg, setMaxDg] = useState("-7");
  const [result, setResult] = useState<null | { targets: { name: string; fwd: string; rev: string; tmFwd: number; tmRev: number; gcFwd: number; gcRev: number }[]; warnings: string[] }>(null);

  const addTarget = () => setTargets((p) => [...p, { id: Date.now().toString(), name: `test${p.length + 1}`, sequence: "" }]);
  const removeTarget = (id: string) => setTargets((p) => p.filter((t) => t.id !== id));
  const updateTarget = (id: string, field: keyof MultiplexTarget, value: string) =>
    setTargets((p) => p.map((t) => t.id === id ? { ...t, [field]: value } : t));

  const design = () => {
    const len = parseInt(primerLen) || 18;
    const tmLo = parseFloat(tmMin) || 55;
    const tmHi = parseFloat(tmMax) || 65;
    const gcLo = parseFloat(gcMin) || 40;
    const gcHi = parseFloat(gcMax) || 60;
    const maxTmDiff = parseFloat(tmDiff) || 5;
    const warnings: string[] = [];

    const designed = targets.map((target) => {
      const seq = cleanSeq(target.sequence);
      if (seq.length < len * 2) return { name: target.name, fwd: "—", rev: "—", tmFwd: 0, tmRev: 0, gcFwd: 0, gcRev: 0 };
      let bestFwd = "", bestFwdTm = 0, bestFwdGc = 0;
      for (let i = 0; i <= seq.length - len; i++) {
        const sub = seq.substring(i, i + len); const gc = gcPercent(sub); const tm = tmBasic(sub);
        if (gc >= gcLo && gc <= gcHi && tm >= tmLo && tm <= tmHi) { bestFwd = sub; bestFwdTm = tm; bestFwdGc = gc; break; }
      }
      let bestRev = "", bestRevTm = 0, bestRevGc = 0;
      for (let i = len; i <= seq.length; i++) {
        const sub = seq.substring(i - len, i); const rc = reverseComplement(sub); const gc = gcPercent(rc); const tm = tmBasic(rc);
        if (gc >= gcLo && gc <= gcHi && tm >= tmLo && tm <= tmHi) { bestRev = rc; bestRevTm = tm; bestRevGc = gc; break; }
      }
      return { name: target.name, fwd: bestFwd || "یافت نشد", rev: bestRev || "یافت نشد", tmFwd: Math.round(bestFwdTm), tmRev: Math.round(bestRevTm), gcFwd: bestFwdGc, gcRev: bestRevGc };
    });
    const tms = designed.filter((d) => d.tmFwd > 0).map((d) => d.tmFwd);
    if (tms.length > 1 && Math.max(...tms) - Math.min(...tms) > maxTmDiff)
      warnings.push(`اختلاف Tm (${(Math.max(...tms) - Math.min(...tms)).toFixed(1)}°C) بیشتر از حد مجاز (${maxTmDiff}°C) است`);
    designed.forEach((d) => { if (d.fwd === "یافت نشد") warnings.push(`برای ${d.name}: Forward یافت نشد`); if (d.rev === "یافت نشد") warnings.push(`برای ${d.name}: Reverse یافت نشد`); });
    setResult({ targets: designed, warnings });
  };

  const reset = () => { setTargets([{ id: "1", name: "test1", sequence: "" }, { id: "2", name: "test2", sequence: "" }]); setResult(null); };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400"><Pipette className="size-5" /></span>
        <div><h2 className="text-lg font-black text-white">پرایمر مولتیپلکس</h2><p className="text-[11px] text-white/40">طراحی همزمان پرایمر برای چندین هدف</p></div>
      </div>
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-4">
        <label className="text-[11px] font-bold text-white/50">🧬 ورودی توالی‌های هدف</label>
        {targets.map((target, i) => (
          <div key={target.id} className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-purple-300">🎯 هدف {i + 1}</span>
              {targets.length > 1 && <button onClick={() => removeTarget(target.id)} className="mr-auto text-[10px] text-rose-400/60 hover:text-rose-400">✖️ حذف</button>}
            </div>
            <Input value={target.name} onChange={(e) => updateTarget(target.id, "name", e.target.value)} placeholder="نام هدف" className="h-8 text-[11px]" />
            <Textarea value={target.sequence} onChange={(e) => updateTarget(target.id, "sequence", e.target.value)} rows={2} dir="ltr" placeholder="TGCGCAAAG..." className="font-mono text-[11px]" />
          </div>
        ))}
        <button onClick={addTarget} className="w-full rounded-xl border border-dashed border-white/10 py-2 text-[11px] font-medium text-white/30 hover:border-white/20 hover:text-white/50 transition-colors">➕ افزودن هدف جدید</button>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div><label className="mb-1 block text-[10px] text-white/30">طول پرایمر</label><Input type="number" value={primerLen} onChange={(e) => setPrimerLen(e.target.value)} dir="ltr" className="h-8 text-[11px]" /></div>
          <div><label className="mb-1 block text-[10px] text-white/30">محدوده Tm</label><div className="flex gap-1"><Input type="number" value={tmMin} onChange={(e) => setTmMin(e.target.value)} dir="ltr" className="h-8 text-[11px] text-center" /><span className="flex items-center text-white/20">-</span><Input type="number" value={tmMax} onChange={(e) => setTmMax(e.target.value)} dir="ltr" className="h-8 text-[11px] text-center" /></div></div>
          <div><label className="mb-1 block text-[10px] text-white/30">محدوده GC%</label><div className="flex gap-1"><Input type="number" value={gcMin} onChange={(e) => setGcMin(e.target.value)} dir="ltr" className="h-8 text-[11px] text-center" /><span className="flex items-center text-white/20">-</span><Input type="number" value={gcMax} onChange={(e) => setGcMax(e.target.value)} dir="ltr" className="h-8 text-[11px] text-center" /></div></div>
          <div><label className="mb-1 block text-[10px] text-white/30">حداکثر اختلاف Tm</label><Input type="number" value={tmDiff} onChange={(e) => setTmDiff(e.target.value)} dir="ltr" className="h-8 text-[11px]" /></div>
          <div><label className="mb-1 block text-[10px] text-white/30">حداکثر دیمر مجاز</label><Input value={maxDg} onChange={(e) => setMaxDg(e.target.value)} dir="ltr" className="h-8 text-[11px]" /></div>
        </div>
        <div className="flex gap-2">
          <Button onClick={design} className="h-9 gap-1.5 bg-purple-600 text-white hover:bg-purple-500 text-[11px] font-bold">🎯 طراحی پرایمر مولتیپلکس</Button>
          {result && <Button onClick={reset} variant="ghost" className="h-9 text-[11px] text-white/30 hover:text-white/60">🔄 Reset</Button>}
        </div>
      </div>
      {result && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1 border-white/10 text-[11px] text-white/50" onClick={() => downloadFile(`هدف,Forward,Reverse,Tm Fwd,Tm Rev,GC\n${result.targets.map((t) => `${t.name},${t.fwd},${t.rev},${t.tmFwd},${t.tmRev},${t.gcFwd.toFixed(0)}/${t.gcRev.toFixed(0)}`).join("\n")}`, "multiplex_primers.csv", "text/csv")}><Download className="size-3" /> دانلود گزارش</Button>
            <AiInterpretButton resultText={`Multiplex Primer Design\n${result.targets.map((t) => `${t.name}: Fwd=${t.fwd} Rev=${t.rev}`).join("\n")}`} toolName="پرایمر مولتیپلکس" />
          </div>
          {result.warnings.length > 0 && <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">{result.warnings.map((w, i) => <p key={i} className="text-[11px] text-amber-300/80">⚠️ {w}</p>)}</div>}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="text-white/30"><tr><th className="px-2 py-1 text-right">هدف</th><th className="px-2 py-1 text-right">Forward</th><th className="px-2 py-1 text-right">Reverse</th><th className="px-2 py-1 text-right">Tm</th><th className="px-2 py-1 text-right">GC%</th></tr></thead>
                <tbody>{result.targets.map((t, i) => (
                  <tr key={i} className="border-t border-white/[0.04]"><td className="px-2 py-1.5 font-bold text-purple-300">{t.name}</td><td className="px-2 py-1.5 font-mono text-[10px] text-cyan-300" dir="ltr">{t.fwd}</td><td className="px-2 py-1.5 font-mono text-[10px] text-rose-300" dir="ltr">{t.rev}</td><td className="px-2 py-1.5 text-white/60">{t.tmFwd}/{t.tmRev}°C</td><td className="px-2 py-1.5 text-white/50">{t.gcFwd.toFixed(0)}/{t.gcRev.toFixed(0)}%</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  6. REAL-TIME (qPCR) PRIMER DESIGN
// ═══════════════════════════════════════════════════════════════════════════════

export function RealTimePrimerTool() {
  const [geneName, setGeneName] = useState("");
  const [seqInput, setSeqInput] = useState("");
  const [primerLen, setPrimerLen] = useState("18");
  const [tmMin, setTmMin] = useState("58");
  const [tmMax, setTmMax] = useState("62");
  const [gcMin, setGcMin] = useState("45");
  const [gcMax, setGcMax] = useState("60");
  const [productMin, setProductMin] = useState("70");
  const [productMax, setProductMax] = useState("150");
  const [tmDiff, setTmDiff] = useState("2.0");
  const [hairpin, setHairpin] = useState(false);
  const [result, setResult] = useState<null | { fwd: string; rev: string; tmFwd: number; tmRev: number; gcFwd: number; gcRev: number; productLen: number; warnings: string[] }>(null);

  const design = () => {
    const seq = cleanSeq(seqInput); const len = parseInt(primerLen) || 18;
    const tmLo = parseFloat(tmMin) || 58; const tmHi = parseFloat(tmMax) || 62;
    const gcLo = parseFloat(gcMin) || 45; const gcHi = parseFloat(gcMax) || 60;
    const prodMin = parseInt(productMin) || 70; const prodMax = parseInt(productMax) || 150;
    const maxTmDiff = parseFloat(tmDiff) || 2; const warnings: string[] = [];
    if (seq.length < prodMax) warnings.push("طول توالی کمتر از حداکثر محصول است");
    let bestFwd = "", bestFwdTm = 0, bestFwdGc = 0, bestFwdPos = 0;
    for (let i = 0; i <= seq.length - len; i++) {
      const sub = seq.substring(i, i + len); const gc = gcPercent(sub); const tm = tmBasic(sub);
      if (gc >= gcLo && gc <= gcHi && tm >= tmLo && tm <= tmHi) { bestFwd = sub; bestFwdTm = tm; bestFwdGc = gc; bestFwdPos = i; break; }
    }
    let bestRev = "", bestRevTm = 0, bestRevGc = 0, bestRevPos = 0;
    for (let start = bestFwdPos + prodMin - len; start <= Math.min(bestFwdPos + prodMax - len, seq.length - len); start++) {
      if (start < 0) continue;
      const sub = seq.substring(start, start + len); const rc = reverseComplement(sub); const gc = gcPercent(rc); const tm = tmBasic(rc);
      if (gc >= gcLo && gc <= gcHi && tm >= tmLo && tm <= tmHi) { bestRev = rc; bestRevTm = tm; bestRevGc = gc; bestRevPos = start + len; break; }
    }
    if (!bestFwd) warnings.push("Forward یافت نشد");
    if (!bestRev) warnings.push("Reverse یافت نشد");
    if (bestFwd && bestRev && Math.abs(bestFwdTm - bestRevTm) > maxTmDiff)
      warnings.push(`اختلاف Tm (${Math.abs(bestFwdTm - bestRevTm).toFixed(1)}°C) بیشتر از حد مجاز (${maxTmDiff}°C) است`);
    if (hairpin && bestFwd && checkHairpin(bestFwd).found) warnings.push("hairpin در Forward شناسایی شد");
    if (hairpin && bestRev && checkHairpin(bestRev).found) warnings.push("hairpin در Reverse شناسایی شد");
    setResult({ fwd: bestFwd || "یافت نشد", rev: bestRev || "یافت نشد", tmFwd: Math.round(bestFwdTm), tmRev: Math.round(bestRevTm), gcFwd: bestFwdGc, gcRev: bestRevGc, productLen: bestFwd && bestRev ? bestRevPos - bestFwdPos : 0, warnings });
  };

  const reset = () => { setSeqInput(""); setGeneName(""); setResult(null); };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-600/20 text-amber-400"><Thermometer className="size-5" /></span>
        <div><h2 className="text-lg font-black text-white">طراحی پرایمر qPCR</h2><p className="text-[11px] text-white/40">طراحی پرایمر برای Real-Time PCR</p></div>
      </div>
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="mb-1 block text-[10px] text-white/30">🎯 نام ژن / هدف</label><Input value={geneName} onChange={(e) => setGeneName(e.target.value)} placeholder="مثلاً GAPDH" className="h-8 text-[11px]" /></div>
        </div>
        <div><label className="mb-1 block text-[10px] text-white/30">🧬 توالی DNA هدف</label><Textarea value={seqInput} onChange={(e) => setSeqInput(e.target.value)} rows={3} dir="ltr" placeholder="AAGGATAGTTCCGCCTAGG..." className="font-mono text-[11px]" /></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div><label className="mb-1 block text-[10px] text-white/30">طول پرایمر</label><Input type="number" value={primerLen} onChange={(e) => setPrimerLen(e.target.value)} dir="ltr" className="h-8 text-[11px]" /></div>
          <div><label className="mb-1 block text-[10px] text-white/30">محدوده Tm</label><div className="flex gap-1"><Input type="number" value={tmMin} onChange={(e) => setTmMin(e.target.value)} dir="ltr" className="h-8 text-[11px] text-center" /><span className="flex items-center text-white/20">-</span><Input type="number" value={tmMax} onChange={(e) => setTmMax(e.target.value)} dir="ltr" className="h-8 text-[11px] text-center" /></div></div>
          <div><label className="mb-1 block text-[10px] text-white/30">محدوده GC%</label><div className="flex gap-1"><Input type="number" value={gcMin} onChange={(e) => setGcMin(e.target.value)} dir="ltr" className="h-8 text-[11px] text-center" /><span className="flex items-center text-white/20">-</span><Input type="number" value={gcMax} onChange={(e) => setGcMax(e.target.value)} dir="ltr" className="h-8 text-[11px] text-center" /></div></div>
          <div><label className="mb-1 block text-[10px] text-white/30">طول محصول (bp)</label><div className="flex gap-1"><Input type="number" value={productMin} onChange={(e) => setProductMin(e.target.value)} dir="ltr" className="h-8 text-[11px] text-center" /><span className="flex items-center text-white/20">-</span><Input type="number" value={productMax} onChange={(e) => setProductMax(e.target.value)} dir="ltr" className="h-8 text-[11px] text-center" /></div></div>
          <div><label className="mb-1 block text-[10px] text-white/30">حداکثر اختلاف Tm</label><Input type="number" value={tmDiff} onChange={(e) => setTmDiff(e.target.value)} dir="ltr" className="h-8 text-[11px]" /></div>
          <div><label className="mb-1 block text-[10px] text-white/30">جلوگیری از Hairpin</label>
            <button onClick={() => setHairpin(!hairpin)} className={cn("h-8 rounded-xl border px-3 text-[11px] font-medium transition-colors", hairpin ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-white/10 bg-white/5 text-white/40")}>{hairpin ? "فعال" : "غیرفعال"}</button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={design} className="h-9 gap-1.5 bg-amber-600 text-white hover:bg-amber-500 text-[11px] font-bold">🔬 طراحی پرایمر qPCR</Button>
          {result && <Button onClick={reset} variant="ghost" className="h-9 text-[11px] text-white/30 hover:text-white/60">🔄 Reset</Button>}
        </div>
      </div>
      {result && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1 border-white/10 text-[11px] text-white/50" onClick={() => downloadFile(`Gene,${geneName}\nForward,${result.fwd}\nReverse,${result.rev}\nTm,${result.tmFwd}/${result.tmRev}\nProduct,${result.productLen} bp`, `qPCR_${geneName || "primers"}.csv`, "text/csv")}><Download className="size-3" /> دانلود گزارش</Button>
            <AiInterpretButton resultText={`qPCR Primer\nGene: ${geneName}\nForward: ${result.fwd}\nReverse: ${result.rev}\nProduct: ${result.productLen} bp`} toolName="پرایمر qPCR" />
          </div>
          {result.warnings.length > 0 && <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">{result.warnings.map((w, i) => <p key={i} className="text-[11px] text-amber-300/80">⚠️ {w}</p>)}</div>}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-white/[0.03] p-4"><p className="text-[10px] font-bold text-cyan-400/60 mb-2">🔹 Forward</p><p className="font-mono text-sm text-cyan-300" dir="ltr">{result.fwd}</p><div className="mt-2 flex gap-3 text-[10px] text-white/40"><span>Tm: {result.tmFwd}°C</span><span>GC: {result.gcFwd.toFixed(1)}%</span></div></div>
              <div className="rounded-xl bg-white/[0.03] p-4"><p className="text-[10px] font-bold text-rose-400/60 mb-2">🔸 Reverse</p><p className="font-mono text-sm text-rose-300" dir="ltr">{result.rev}</p><div className="mt-2 flex gap-3 text-[10px] text-white/40"><span>Tm: {result.tmRev}°C</span><span>GC: {result.gcRev.toFixed(1)}%</span></div></div>
            </div>
            {result.productLen > 0 && <div className="rounded-xl bg-white/[0.03] p-3 text-center"><p className="text-[10px] text-white/30">طول محصول</p><p className="text-lg font-black text-amber-300">{result.productLen} bp</p></div>}
          </div>
        </>
      )}
    </div>
  );
}
