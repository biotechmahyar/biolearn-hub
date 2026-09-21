/**
 * Restriction Enzyme Tools for Genova Virtual Lab
 * ─────────────────────────────────────────────────────────────────────
 * 4 tools: Mapper, Search (4 modes), Compatibility, Methylation
 */
import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Scissors,
  RotateCcw,
  Search,
  Copy,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  ExternalLink,
  Atom,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// ═══════════════════════════════════════════════════════════════════════
// ENZYME DATABASE
// ═══════════════════════════════════════════════════════════════════════

interface Enzyme {
  name: string;
  site: string;
  length: number;
  cutType: "5' sticky" | "3' sticky" | "blunt";
  cutPosition: number;
  source: string;
  buffer: string;
  temp: number;
  isoschizomers: string[];
  compatibleWith: string[];
  methylationSensitive: boolean;
  category: string;
}

const ENZYME_DB: Enzyme[] = [
  { name: "EcoRI", site: "GAATTC", length: 6, cutType: "5' sticky", cutPosition: 1, source: "Escherichia coli", buffer: "CutSmart, EcoRI Buffer", temp: 37, isoschizomers: ["ApoI", "RsrI"], compatibleWith: ["BamHI", "HindIII", "XbaI", "SalI", "PstI"], methylationSensitive: false, category: "common" },
  { name: "EcoRV", site: "GATATC", length: 6, cutType: "blunt", cutPosition: 3, source: "Escherichia coli", buffer: "CutSmart, EcoRV Buffer", temp: 37, isoschizomers: [], compatibleWith: ["EcoRI", "BamHI", "HindIII"], methylationSensitive: false, category: "common" },
  { name: "BamHI", site: "GGATCC", length: 6, cutType: "5' sticky", cutPosition: 1, source: "Bacillus amyloliquefaciens", buffer: "CutSmart, BamHI Buffer", temp: 37, isoschizomers: ["BstI"], compatibleWith: ["EcoRI", "HindIII", "XbaI", "SalI"], methylationSensitive: false, category: "common" },
  { name: "HindIII", site: "AAGCTT", length: 6, cutType: "5' sticky", cutPosition: 1, source: "Haemophilus influenzae", buffer: "CutSmart, HindIII Buffer", temp: 37, isoschizomers: [], compatibleWith: ["EcoRI", "BamHI", "XbaI", "SalI", "PstI"], methylationSensitive: false, category: "common" },
  { name: "XbaI", site: "TCTAGA", length: 6, cutType: "5' sticky", cutPosition: 1, source: "Xanthomonas badrii", buffer: "CutSmart, XbaI Buffer", temp: 37, isoschizomers: [], compatibleWith: ["EcoRI", "BamHI", "HindIII", "SalI"], methylationSensitive: false, category: "common" },
  { name: "SalI", site: "GTCGAC", length: 6, cutType: "5' sticky", cutPosition: 1, source: "Streptomyces albus", buffer: "CutSmart, SalI Buffer", temp: 37, isoschizomers: [], compatibleWith: ["EcoRI", "BamHI", "HindIII", "XbaI"], methylationSensitive: false, category: "common" },
  { name: "PstI", site: "CTGCAG", length: 6, cutType: "3' sticky", cutPosition: 5, source: "Providencia stuartii", buffer: "CutSmart, PstI Buffer", temp: 37, isoschizomers: ["PaeR7I"], compatibleWith: ["EcoRI", "HindIII", "XbaI"], methylationSensitive: false, category: "common" },
  { name: "NotI", site: "GCGGCCGC", length: 8, cutType: "5' sticky", cutPosition: 2, source: "Nocardia otitidis-caviarum", buffer: "CutSmart, NotI Buffer", temp: 37, isoschizomers: ["CciNI"], compatibleWith: ["EcoRI"], methylationSensitive: true, category: "rare" },
  { name: "SmaI", site: "CCCGGG", length: 6, cutType: "blunt", cutPosition: 3, source: "Serratia marcescens", buffer: "CutSmart, SmaI Buffer", temp: 25, isoschizomers: ["XmaI", "Cfr9I"], compatibleWith: ["EcoRV"], methylationSensitive: false, category: "common" },
  { name: "XmaI", site: "CCCGGG", length: 6, cutType: "5' sticky", cutPosition: 1, source: "Xanthomonas malvacearum", buffer: "CutSmart, XmaI Buffer", temp: 37, isoschizomers: ["SmaI", "Cfr9I"], compatibleWith: ["BamHI"], methylationSensitive: false, category: "common" },
  { name: "NdeI", site: "CATATG", length: 6, cutType: "5' sticky", cutPosition: 2, source: "Neisseria denitrificans", buffer: "CutSmart, NdeI Buffer", temp: 37, isoschizomers: [], compatibleWith: ["BamHI", "EcoRI"], methylationSensitive: false, category: "common" },
  { name: "KpnI", site: "GGTACC", length: 6, cutType: "3' sticky", cutPosition: 5, source: "Klebsiella pneumoniae", buffer: "CutSmart, KpnI Buffer", temp: 37, isoschizomers: ["Asp718I"], compatibleWith: ["EcoRI", "HindIII"], methylationSensitive: false, category: "common" },
  { name: "NcoI", site: "CCATGG", length: 6, cutType: "5' sticky", cutPosition: 1, source: "Nocardia corallina", buffer: "CutSmart, NcoI Buffer", temp: 37, isoschizomers: [], compatibleWith: ["BamHI", "NdeI"], methylationSensitive: false, category: "common" },
  { name: "SpeI", site: "ACTAGT", length: 6, cutType: "5' sticky", cutPosition: 1, source: "Sphaerotilus natans", buffer: "CutSmart, SpeI Buffer", temp: 37, isoschizomers: ["AvrII"], compatibleWith: ["EcoRI", "HindIII", "XbaI"], methylationSensitive: false, category: "common" },
  { name: "NheI", site: "GCTAGC", length: 6, cutType: "5' sticky", cutPosition: 1, source: "Nocardia elizabethii", buffer: "CutSmart, NheI Buffer", temp: 37, isoschizomers: [], compatibleWith: ["SpeI", "XbaI"], methylationSensitive: false, category: "common" },
  { name: "ApaI", site: "GGGCCC", length: 6, cutType: "3' sticky", cutPosition: 5, source: "Arthrobacter protophormiae", buffer: "CutSmart, ApaI Buffer", temp: 37, isoschizomers: [], compatibleWith: ["EcoRI"], methylationSensitive: true, category: "common" },
  { name: "HpaII", site: "CCGG", length: 4, cutType: "5' sticky", cutPosition: 1, source: "Haemophilus parainfluenzae", buffer: "CutSmart, HpaII Buffer", temp: 37, isoschizomers: ["MspI"], compatibleWith: ["EcoRI"], methylationSensitive: true, category: "methylation" },
  { name: "MspI", site: "CCGG", length: 4, cutType: "5' sticky", cutPosition: 1, source: "Moraxella species", buffer: "CutSmart, MspI Buffer", temp: 37, isoschizomers: ["HpaII"], compatibleWith: ["HpaII"], methylationSensitive: false, category: "methylation" },
  { name: "BstUI", site: "CGCG", length: 4, cutType: "blunt", cutPosition: 2, source: "Bacillus stearothermophilus", buffer: "CutSmart, BstUI Buffer", temp: 60, isoschizomers: [], compatibleWith: ["HpaII"], methylationSensitive: true, category: "methylation" },
  { name: "HhaI", site: "GCGC", length: 4, cutType: "3' sticky", cutPosition: 3, source: "Haemophilus haemolyticus", buffer: "CutSmart, HhaI Buffer", temp: 37, isoschizomers: [], compatibleWith: ["BstUI"], methylationSensitive: true, category: "methylation" },
  { name: "AgeI", site: "ACCGGT", length: 6, cutType: "5' sticky", cutPosition: 1, source: "Agrobacterium efas", buffer: "CutSmart, AgeI Buffer", temp: 37, isoschizomers: ["PinAI"], compatibleWith: ["EcoRI"], methylationSensitive: false, category: "common" },
  { name: "ClaI", site: "ATCGAT", length: 6, cutType: "5' sticky", cutPosition: 2, source: "Clostridium lentocellum", buffer: "CutSmart, ClaI Buffer", temp: 37, isoschizomers: [], compatibleWith: ["EcoRI"], methylationSensitive: true, category: "common" },
  { name: "MluI", site: "ACGCGT", length: 6, cutType: "5' sticky", cutPosition: 1, source: "Micrococcus luteus", buffer: "CutSmart, MluI Buffer", temp: 37, isoschizomers: [], compatibleWith: ["EcoRI"], methylationSensitive: false, category: "common" },
  { name: "SacI", site: "GAGCTC", length: 6, cutType: "3' sticky", cutPosition: 5, source: "Streptomyces acromyceticus", buffer: "CutSmart, SacI Buffer", temp: 37, isoschizomers: [], compatibleWith: ["EcoRI"], methylationSensitive: false, category: "common" },
  { name: "Acc65I", site: "GGTACC", length: 6, cutType: "5' sticky", cutPosition: 1, source: "Acetobacter aceti", buffer: "CutSmart", temp: 37, isoschizomers: ["KpnI", "Asp718I"], compatibleWith: ["EcoRI"], methylationSensitive: false, category: "common" },
  { name: "PvuII", site: "CAGCTG", length: 6, cutType: "blunt", cutPosition: 3, source: "Proteus vulgaris", buffer: "CutSmart", temp: 37, isoschizomers: [], compatibleWith: ["EcoRV"], methylationSensitive: false, category: "common" },
  { name: "SphI", site: "GCATGC", length: 6, cutType: "3' sticky", cutPosition: 5, source: "Streptomyces phaeochromogenes", buffer: "CutSmart", temp: 37, isoschizomers: ["PaeI"], compatibleWith: ["EcoRI", "PstI"], methylationSensitive: false, category: "common" },
  { name: "BglII", site: "AGATCT", length: 6, cutType: "5' sticky", cutPosition: 1, source: "Bacillus globigii", buffer: "CutSmart", temp: 37, isoschizomers: ["BamHI*"], compatibleWith: ["BamHI", "EcoRI", "HindIII"], methylationSensitive: false, category: "common" },
  { name: "BsrGI", site: "TGTACA", length: 6, cutType: "5' sticky", cutPosition: 1, source: "Bacillus sphaericus", buffer: "CutSmart", temp: 37, isoschizomers: [], compatibleWith: ["EcoRI"], methylationSensitive: false, category: "common" },
  { name: "FspI", site: "TGCGCA", length: 6, cutType: "blunt", cutPosition: 3, source: "Fischerella sp.", buffer: "CutSmart", temp: 37, isoschizomers: [], compatibleWith: ["EcoRV"], methylationSensitive: false, category: "common" },
];

// ═══════════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════

function cleanSeq(raw: string): string {
  return raw.replace(/[^ACGTURYSWKMBDHVNacgturyswkmbdhvn]/g, "").toUpperCase();
}

function rc(seq: string): string {
  const map: Record<string, string> = { A: "T", T: "A", G: "C", C: "G", U: "A" };
  return seq
    .split("")
    .reverse()
    .map((b) => map[b] || b)
    .join("");
}

function downloadFile(name: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(name: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  downloadFile(name, csv, "text/csv;charset=utf-8");
}

function findAllSites(seq: string, site: string): number[] {
  const positions: number[] = [];
  let idx = 0;
  while (true) {
    const pos = seq.indexOf(site, idx);
    if (pos === -1) break;
    positions.push(pos + 1);
    idx = pos + 1;
  }
  return positions;
}

function getCutDescription(e: Enzyme): string {
  if (e.cutType === "blunt") return "blunt";
  return e.cutType;
}

// ═══════════════════════════════════════════════════════════════════════
// AI INTERPRET BUTTON
// ═══════════════════════════════════════════════════════════════════════

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
        content: `لطفاً نتایج زیر را از ابزار «${toolName}» آزمایشگاه مجازی ژنوا تفسیر کن. به زبان ساده و علمی توضیح بده.\n\n${resultText}`,
      });
      setDone(true);
      window.open("/ai-chat", "_blank");
      toast.success("چت هوش مصنوعی در تب جدید باز شد");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در ارسال تفسیر");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, resultText, toolName, createConvo, sendMessage]);

  return (
    <div>
      <Button size="sm" variant="outline"
        className="h-8 gap-1.5 border-rose-500/30 bg-rose-500/10 text-[11px] text-rose-300 hover:bg-rose-500/20 hover:text-rose-200"
        onClick={handleInterpret} disabled={loading}>
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
        تفسیر با هوش مصنوعی
      </Button>
      {done && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="size-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-300">تفسیر هوش مصنوعی</p>
              <p className="mt-1 text-[11px] leading-6 text-rose-200/70">نتایج به چت هوش مصنوعی ارسال شد. برای مشاهده تفسیر کامل به بخش AI Chat سایت مراجعه کنید.</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TOOL 1: RESTRICTION MAPPER
// ═══════════════════════════════════════════════════════════════════════

export function RestrictionMapperTool() {
  const [seq, setSeq] = useState("");
  const [enzymeFilter, setEnzymeFilter] = useState("__all__");
  const [result, setResult] = useState<null | { sites: { enzyme: Enzyme; positions: number[] }[]; total: number }>(null);

  const analyze = useCallback(() => {
    const cleaned = cleanSeq(seq);
    if (cleaned.length < 4) { toast.error("حداقل ۴ نوکلئوتید وارد کنید."); return; }
    const enzymes = enzymeFilter === "__all__" ? ENZYME_DB : ENZYME_DB.filter((e) => e.name === enzymeFilter);
    const sites = enzymes.map((e) => ({ enzyme: e, positions: findAllSites(cleaned, e.site) })).filter((s) => s.positions.length > 0);
    const total = sites.reduce((acc, s) => acc + s.positions.length, 0);
    setResult({ sites, total });
    toast.success(`${total} جایگاه برش یافت شد.`);
  }, [seq, enzymeFilter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/20">
          <Scissors className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Restriction Mapper</h2>
          <p className="text-[11px] text-white/40">جستجوی جایگاه برش آنزیم‌های محدودکننده در توالی DNA</p>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-[11px] text-white/50">🧬 ورودی توالی DNA</Label>
        <Textarea value={seq} onChange={(e) => setSeq(e.target.value)} rows={4}
          placeholder="مثال: CGCGCTAGATGTTTCTGCGCCAATGCAGGTAAGTAATACTCGCTGGATGCCGAGTCCGGAC..."
          className="font-mono text-[12px] border-white/[0.06] bg-white/[0.03] text-white/90 placeholder:text-white/20" />
      </div>

      <div className="space-y-2">
        <Label className="text-[11px] text-white/50">🔎 جستجوی آنزیم خاص (اختیاری)</Label>
        <select value={enzymeFilter} onChange={(e) => setEnzymeFilter(e.target.value)}
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[12px] text-white/80">
          <option value="__all__">همه آنزیم‌ها</option>
          {ENZYME_DB.map((e) => <option key={e.name} value={e.name}>{e.name} ({e.site})</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <Button onClick={analyze} className="gap-2 bg-gradient-to-r from-rose-500 to-pink-600 text-[12px] text-white hover:from-rose-600 hover:to-pink-700">
          <Scissors className="size-3.5" /> جستجوی جایگاه برش
        </Button>
        {result && (
          <Button variant="outline" size="sm" className="gap-2 border-white/[0.08] text-[11px]"
            onClick={() => {
              const rows = [["آنزیم", "جایگاه برش", "نوع برش", "تعداد", "موقعیت‌ها"]];
              result.sites.forEach((s) => rows.push([s.enzyme.name, s.enzyme.site, getCutDescription(s.enzyme), String(s.positions.length), s.positions.join(" ، ")]));
              downloadCsv("restriction_mapper.csv", rows);
            }}>
            <Download className="size-3" /> دانلود نتایج (CSV)
          </Button>
        )}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-white/50">📊 نتایج جستجو</span>
            <Badge variant="outline" className="text-[10px] border-white/[0.08] bg-white/[0.03]">{result.sites.length} آنزیم · {result.total} جایگاه</Badge>
          </div>

          {result.sites.length === 0 ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
              <AlertTriangle className="mx-auto mb-2 size-5 text-amber-400" />
              <p className="text-[12px] text-amber-300">هیچ جایگاه برشی یافت نشد.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-3 py-2.5 text-right font-semibold text-white/50">آنزیم</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-white/50">جایگاه برش</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-white/50">نوع برش</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-white/50">تعداد</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-white/50">موقعیت‌ها</th>
                  </tr>
                </thead>
                <tbody>
                  {result.sites.map((s) => (
                    <tr key={s.enzyme.name} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-3 py-2 font-mono font-bold text-rose-300">{s.enzyme.name}</td>
                      <td className="px-3 py-2 font-mono text-white/70">{s.enzyme.site}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={`text-[9px] ${
                          s.enzyme.cutType === "blunt" ? "border-amber-500/30 text-amber-400" :
                          s.enzyme.cutType === "5' sticky" ? "border-cyan-500/30 text-cyan-400" :
                          "border-violet-500/30 text-violet-400"
                        }`}>{getCutDescription(s.enzyme)}</Badge>
                      </td>
                      <td className="px-3 py-2 text-white/70">{s.positions.length}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-white/50">{s.positions.join(" ، ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <AiInterpretButton
            resultText={result.sites.map((s) => `${s.enzyme.name} (${s.enzyme.site}): ${s.positions.length} cuts at positions ${s.positions.join(", ")}`).join("\n")}
            toolName="Restriction Mapper" />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TOOL 2: ENZYME SEARCH (4 modes)
// ═══════════════════════════════════════════════════════════════════════

export function EnzymeSearchTool() {
  const [mode, setMode] = useState<"name" | "sequence" | "compare" | "cloning">("name");
  const [enzymeName, setEnzymeName] = useState("");
  const [dnaSeq, setDnaSeq] = useState("");
  const [enzyme1, setEnzyme1] = useState("");
  const [enzyme2, setEnzyme2] = useState("");
  const [onlyBlunt, setOnlyBlunt] = useState(false);
  const [onlySticky, setOnlySticky] = useState(false);
  const [result, setResult] = useState<any>(null);

  const search = useCallback(() => {
    setResult(null);
    if (mode === "name") {
      const name = enzymeName.trim().toLowerCase();
      if (!name) { toast.error("نام آنزیم را وارد کنید."); return; }
      const e = ENZYME_DB.find((en) => en.name.toLowerCase() === name);
      if (!e) { toast.error(`آنزیم «${enzymeName}» یافت نشد.`); return; }
      setResult({ type: "name", enzyme: e });
    } else if (mode === "sequence") {
      const cleaned = cleanSeq(dnaSeq);
      if (cleaned.length < 4) { toast.error("حداقل ۴ نوکلئوتید وارد کنید."); return; }
      let enzymes = ENZYME_DB;
      if (onlyBlunt) enzymes = enzymes.filter((e) => e.cutType === "blunt");
      if (onlySticky) enzymes = enzymes.filter((e) => e.cutType !== "blunt");
      const sites = enzymes.map((e) => ({ enzyme: e, positions: findAllSites(cleaned, e.site) })).filter((s) => s.positions.length > 0);
      setResult({ type: "sequence", sites });
    } else if (mode === "compare") {
      const e1 = ENZYME_DB.find((e) => e.name.toLowerCase() === enzyme1.trim().toLowerCase());
      const e2 = ENZYME_DB.find((e) => e.name.toLowerCase() === enzyme2.trim().toLowerCase());
      if (!e1 || !e2) { toast.error("هر دو آنزیم باید در دیتابیس موجود باشند."); return; }
      const compatible = e1.compatibleWith.includes(e2.name) || e2.compatibleWith.includes(e1.name);
      const sameIso = e1.isoschizomers.includes(e2.name) || e2.isoschizomers.includes(e1.name);
      setResult({ type: "compare", e1, e2, compatible, sameIso });
    } else if (mode === "cloning") {
      const cleaned = cleanSeq(dnaSeq);
      if (cleaned.length < 10) { toast.error("حداقل ۱۰ نوکلئوتید وارد کنید."); return; }
      // Find enzymes that cut exactly once (good for cloning)
      const candidates = ENZYME_DB.filter((e) => {
        if (e.cutType === "blunt") return false;
        const count = findAllSites(cleaned, e.site).length;
        return count === 1;
      }).map((e) => ({ enzyme: e, positions: findAllSites(cleaned, e.site) }));
      setResult({ type: "cloning", candidates });
    }
  }, [mode, enzymeName, dnaSeq, enzyme1, enzyme2, onlyBlunt, onlySticky]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 shadow-lg shadow-rose-500/20">
          <Search className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold">جستجوی آنزیم</h2>
          <p className="text-[11px] text-white/40">۴ نوع جستجوی مختلف برای آنزیم‌های محدودکننده</p>
        </div>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {([
          { id: "name" as const, label: "جستجو بر اساس نام", icon: "🔍" },
          { id: "sequence" as const, label: "محاسبه جایگاه برش", icon: "🧬" },
          { id: "compare" as const, label: "مقایسه دو آنزیم", icon: "⚖️" },
          { id: "cloning" as const, label: "پیشنهاد برای کلونینگ", icon: "🧫" },
        ]).map((m) => (
          <button key={m.id} onClick={() => { setMode(m.id); setResult(null); }}
            className={`rounded-xl border p-3 text-right text-[11px] transition-all ${
              mode === m.id ? "border-rose-500/40 bg-rose-500/10 text-rose-300" : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:bg-white/[0.04]"
            }`}>
            <span className="text-base">{m.icon}</span>
            <p className="mt-1 font-semibold">{m.label}</p>
          </button>
        ))}
      </div>

      {/* Inputs per mode */}
      {mode === "name" && (
        <div className="space-y-2">
          <Label className="text-[11px] text-white/50">✂️ نام آنزیم</Label>
          <Input value={enzymeName} onChange={(e) => setEnzymeName(e.target.value)} placeholder="مثال: EcoRI"
            className="font-mono text-[12px] border-white/[0.06] bg-white/[0.03] text-white/90 placeholder:text-white/20" />
        </div>
      )}

      {mode === "sequence" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-[11px] text-white/50">🧬 توالی DNA</Label>
            <Textarea value={dnaSeq} onChange={(e) => setDnaSeq(e.target.value)} rows={3}
              className="font-mono text-[12px] border-white/[0.06] bg-white/[0.03] text-white/90 placeholder:text-white/20" />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-[11px] text-white/50 cursor-pointer">
              <Checkbox checked={onlyBlunt} onCheckedChange={(v) => setOnlyBlunt(v === true)} className="border-white/20" />
              فقط blunt
            </label>
            <label className="flex items-center gap-2 text-[11px] text-white/50 cursor-pointer">
              <Checkbox checked={onlySticky} onCheckedChange={(v) => setOnlySticky(v === true)} className="border-white/20" />
              فقط sticky
            </label>
          </div>
        </div>
      )}

      {mode === "compare" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-[11px] text-white/50">آنزیم اول</Label>
            <Input value={enzyme1} onChange={(e) => setEnzyme1(e.target.value)} placeholder="مثال: EcoRI"
              className="font-mono text-[12px] border-white/[0.06] bg-white/[0.03] text-white/90 placeholder:text-white/20" />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] text-white/50">آنزیم دوم</Label>
            <Input value={enzyme2} onChange={(e) => setEnzyme2(e.target.value)} placeholder="مثال: BamHI"
              className="font-mono text-[12px] border-white/[0.06] bg-white/[0.03] text-white/90 placeholder:text-white/20" />
          </div>
        </div>
      )}

      {mode === "cloning" && (
        <div className="space-y-2">
          <Label className="text-[11px] text-white/50">🧬 توالی DNA هدف</Label>
          <Textarea value={dnaSeq} onChange={(e) => setDnaSeq(e.target.value)} rows={3}
            placeholder="آنزیم‌هایی که دقیقاً یک‌بار برش می‌دهند پیشنهاد می‌شوند"
            className="font-mono text-[12px] border-white/[0.06] bg-white/[0.03] text-white/90 placeholder:text-white/20" />
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={search} className="gap-2 bg-gradient-to-r from-rose-500 to-pink-600 text-[12px] text-white hover:from-rose-600 hover:to-pink-700">
          <Search className="size-3.5" /> جستجو
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setResult(null); setEnzymeName(""); setDnaSeq(""); setEnzyme1(""); setEnzyme2(""); }}
          className="gap-1 text-[11px] text-white/30 hover:text-white/60">
          <RotateCcw className="size-3" /> Reset
        </Button>
        {result && (
          <Button variant="outline" size="sm" className="gap-2 border-white/[0.08] text-[11px] mr-auto"
            onClick={() => {
              const rows: string[][] = [["آنزیم", "جایگاه برش", "نوع برش", "تعداد", "موقعیت‌ها / سازگار با"]];
              if (result.type === "name") { rows.push([result.enzyme.name, result.enzyme.site, getCutDescription(result.enzyme), result.enzyme.isoschizomers.join(", ")]); }
              else if (result.type === "sequence") { result.sites.forEach((s: any) => rows.push([s.enzyme.name, s.enzyme.site, getCutDescription(s.enzyme), String(s.positions.length), s.positions.join(", ")])); }
              else if (result.type === "compare") { rows.push([`${result.e1.name} vs ${result.e2.name}`, result.compatible ? "سازگار" : "ناسازگار", result.sameIso ? "ایزو‌شیمر" : ""]); }
              else if (result.type === "cloning") { result.candidates.forEach((c: any) => rows.push([c.enzyme.name, c.enzyme.site, getCutDescription(c.enzyme), "1", c.positions.join(", ")])); }
              downloadCsv("enzyme_search.csv", rows);
            }}>
            <Download className="size-3" /> دانلود نتایج (CSV)
          </Button>
        )}
      </div>

      {/* Results */}
      {result?.type === "name" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 font-mono font-bold text-sm">{result.enzyme.name}</div>
              <div>
                <p className="font-mono text-lg text-white/90">{result.enzyme.site}</p>
                <p className="text-[10px] text-white/30">{result.enzyme.source} · Type II</p>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
              <div className="rounded-lg bg-white/[0.03] p-3">
                <p className="text-white/30 mb-1">🧪 بافر</p>
                <p className="text-white/70">{result.enzyme.buffer}</p>
              </div>
              <div className="rounded-lg bg-white/[0.03] p-3">
                <p className="text-white/30 mb-1">🌡️ دما</p>
                <p className="text-white/70">{result.enzyme.temp}°C</p>
              </div>
              <div className="rounded-lg bg-white/[0.03] p-3">
                <p className="text-white/30 mb-1">🔄 نوع برش</p>
                <p className="text-white/70">{getCutDescription(result.enzyme)}</p>
              </div>
              <div className="rounded-lg bg-white/[0.03] p-3">
                <p className="text-white/30 mb-1">📍 منبع</p>
                <p className="text-white/70">{result.enzyme.source}</p>
              </div>
            </div>
            {result.enzyme.isoschizomers.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-[11px]">
                <span className="text-white/30">ایزو‌شیمرها:</span>
                {result.enzyme.isoschizomers.map((iso: string) => (
                  <Badge key={iso} variant="outline" className="text-[9px] border-cyan-500/30 text-cyan-400">{iso}</Badge>
                ))}
              </div>
            )}
          </div>
          <AiInterpretButton
            resultText={`Enzyme: ${result.enzyme.name}\nSite: ${result.enzyme.site}\nCut: ${getCutDescription(result.enzyme)} at position ${result.enzyme.cutPosition}\nSource: ${result.enzyme.source}\nBuffer: ${result.enzyme.buffer}\nTemp: ${result.enzyme.temp}C\nIsoschizomers: ${result.enzyme.isoschizomers.join(", ") || "none"}\nMethylation sensitive: ${result.enzyme.methylationSensitive}`}
            toolName="جستجوی آنزیم" />
        </div>
      )}

      {result?.type === "sequence" && (
        <div className="space-y-3">
          {result.sites.length === 0 ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
              <p className="text-[12px] text-amber-300">هیچ جایگاه برشی یافت نشد.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-3 py-2.5 text-right font-semibold text-white/50">نقشه برش</th>
                  </tr>
                </thead>
                <tbody>
                  {result.sites.map((s: any) => (
                    <tr key={s.enzyme.name} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-rose-300">{s.enzyme.name}</span>
                          <span className="font-mono text-white/60">{s.enzyme.site}</span>
                          <Badge variant="outline" className={`text-[9px] ${s.enzyme.cutType === "blunt" ? "border-amber-500/30 text-amber-400" : "border-cyan-500/30 text-cyan-400"}`}>{getCutDescription(s.enzyme)}</Badge>
                          <span className="text-white/40">{s.positions.length}×</span>
                          <span className="font-mono text-[10px] text-white/40">{s.positions.join(", ")}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <AiInterpretButton
            resultText={result.sites.map((s: any) => `${s.enzyme.name} (${s.enzyme.site}): ${getCutDescription(s.enzyme)}, ${s.positions.length} cuts at ${s.positions.join(", ")}`).join("\n")}
            toolName="محاسبه جایگاه برش" />
        </div>
      )}

      {result?.type === "compare" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[result.e1, result.e2].map((e: Enzyme) => (
              <div key={e.name} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="font-mono font-bold text-rose-300 text-sm">{e.name}</p>
                <p className="font-mono text-white/60 text-[12px] mt-1">{e.site}</p>
                <p className="text-[10px] text-white/30 mt-2">{getCutDescription(e)} · {e.temp}°C</p>
              </div>
            ))}
          </div>
          <div className={`rounded-xl border p-4 text-center ${result.compatible ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
            {result.compatible ? <CheckCircle2 className="mx-auto mb-2 size-5 text-emerald-400" /> : <AlertTriangle className="mx-auto mb-2 size-5 text-red-400" />}
            <p className={`text-[12px] font-semibold ${result.compatible ? "text-emerald-300" : "text-red-300"}`}>
              {result.compatible ? "سازگار — این دو آنزیم دُم‌های سازگار تولید می‌کنند" : "ناسازگار — دُم‌های این دو آنزیم با هم سازگار نیستند"}
            </p>
            {result.sameIso && <p className="mt-2 text-[11px] text-cyan-400">این دو آنزیم ایزو‌شیمر یکدیگر هستند.</p>}
          </div>
          <AiInterpretButton
            resultText={`Comparing ${result.e1.name} (${result.e1.site}, ${getCutDescription(result.e1)}) with ${result.e2.name} (${result.e2.site}, ${getCutDescription(result.e2)})\nCompatible: ${result.compatible}\nIsoschizomers: ${result.sameIso}`}
            toolName="مقایسه دو آنزیم" />
        </div>
      )}

      {result?.type === "cloning" && (
        <div className="space-y-3">
          {result.candidates.length === 0 ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
              <p className="text-[12px] text-amber-300">هیچ آنزیم مناسبی یافت نشد.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-3 py-2.5 text-right font-semibold text-white/50">آنزیم</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-white/50">جایگاه برش</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-white/50">نوع برش</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-white/50">موقعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {result.candidates.map((c: any) => (
                    <tr key={c.enzyme.name} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-3 py-2 font-mono font-bold text-emerald-300">{c.enzyme.name}</td>
                      <td className="px-3 py-2 font-mono text-white/70">{c.enzyme.site}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-[9px] border-cyan-500/30 text-cyan-400">{getCutDescription(c.enzyme)}</Badge></td>
                      <td className="px-3 py-2 font-mono text-white/50">{c.positions[0]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <AiInterpretButton
            resultText={`Cloning suggestions for sequence (${dnaSeq.length}bp):\n${result.candidates.map((c: any) => `${c.enzyme.name} (${c.enzyme.site}) at position ${c.positions[0]}`).join("\n")}`}
            toolName="پیشنهاد آنزیم برای کلونینگ" />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TOOL 3: COMPATIBLE & ISOSCHIZOMERS FINDER
// ═══════════════════════════════════════════════════════════════════════

export function EnzymeCompatibilityTool() {
  const [enzymeName, setEnzymeName] = useState("");
  const [searchType, setSearchType] = useState<"compatible" | "isoschizomers">("compatible");
  const [result, setResult] = useState<null | { enzyme: Enzyme; matches: Enzyme[] }>(null);

  const search = useCallback(() => {
    const name = enzymeName.trim().toLowerCase();
    if (!name) { toast.error("نام آنزیم را وارد کنید."); return; }
    const e = ENZYME_DB.find((en) => en.name.toLowerCase() === name);
    if (!e) { toast.error(`آنزیم «${enzymeName}» یافت نشد.`); return; }
    if (searchType === "compatible") {
      const matches = ENZYME_DB.filter((en) => e.compatibleWith.includes(en.name) || en.compatibleWith.includes(e.name));
      setResult({ enzyme: e, matches });
    } else {
      const matches = ENZYME_DB.filter((en) => e.isoschizomers.includes(en.name));
      setResult({ enzyme: e, matches });
    }
  }, [enzymeName, searchType]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
          <Scissors className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Compatible & Isoschizomers Finder</h2>
          <p className="text-[11px] text-white/40">جستجوی آنزیم‌های سازگار و ایزو‌شیمر</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-[11px] text-white/50">✂️ نام آنزیم محدودکننده</Label>
          <Input value={enzymeName} onChange={(e) => setEnzymeName(e.target.value)} placeholder="مثال: EcoRI"
            className="font-mono text-[12px] border-white/[0.06] bg-white/[0.03] text-white/90 placeholder:text-white/20" />
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] text-white/50">🎯 نوع جستجو</Label>
          <RadioGroup value={searchType} onValueChange={(v) => { setSearchType(v as any); setResult(null); }}
            className="flex gap-4">
            <label className="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
              <RadioGroupItem value="compatible" className="border-white/20" />
              آنزیم‌های Compatible (چسبنده)
            </label>
            <label className="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer">
              <RadioGroupItem value="isoschizomers" className="border-white/20" />
              ایزو‌شیمرها
            </label>
          </RadioGroup>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={search} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-[12px] text-white hover:from-amber-600 hover:to-orange-700">
          <Search className="size-3.5" /> جستجو
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setResult(null); setEnzymeName(""); }} className="gap-1 text-[11px] text-white/30 hover:text-white/60">
          <RotateCcw className="size-3" /> Reset
        </Button>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Enzyme info card */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/20">
                <Scissors className="size-6 text-amber-400" />
              </div>
              <div>
                <p className="font-mono text-xl font-bold text-white/90">{result.enzyme.name}</p>
                <p className="font-mono text-sm text-white/50">{result.enzyme.site}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <Badge variant="outline" className={`border-white/[0.08] ${result.enzyme.cutType === "blunt" ? "text-amber-400" : "text-cyan-400"}`}>
                🔄 {getCutDescription(result.enzyme)}
              </Badge>
              <Badge variant="outline" className="border-white/[0.08] text-white/50">🧪 بافر: {result.enzyme.buffer}</Badge>
              <Badge variant="outline" className="border-white/[0.08] text-white/50">🌡️ {result.enzyme.temp}°C</Badge>
              <Badge variant="outline" className="border-white/[0.08] text-white/50">📍 {result.enzyme.source}</Badge>
              <Badge variant="outline" className="border-white/[0.08] text-white/50">🧬 Type II</Badge>
            </div>
          </div>

          {/* Matches */}
          {result.matches.length === 0 ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
              <p className="text-[12px] text-amber-300">هیچ آنزیم {searchType === "compatible" ? "سازگار" : "ایزو‌شیمری"} یافت نشد.</p>
            </div>
          ) : (
            <div>
              <p className="text-[11px] text-white/40 mb-2">📋 نتایج: {result.matches.length} آنزیم</p>
              <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="px-3 py-2.5 text-right font-semibold text-white/50">آنزیم</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-white/50">جایگاه</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-white/50">نوع</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-white/50">منبع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.matches.map((m) => (
                      <tr key={m.name} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-3 py-2 font-mono font-bold text-amber-300">{m.name}</td>
                        <td className="px-3 py-2 font-mono text-white/70">{m.site}</td>
                        <td className="px-3 py-2"><Badge variant="outline" className={`text-[9px] ${m.cutType === "blunt" ? "border-amber-500/30 text-amber-400" : "border-cyan-500/30 text-cyan-400"}`}>{getCutDescription(m)}</Badge></td>
                        <td className="px-3 py-2 text-white/40">{m.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <AiInterpretButton
            resultText={`${result.enzyme.name} (${result.enzyme.site}): ${searchType === "compatible" ? "Compatible enzymes" : "Isoschizomers"}: ${result.matches.map((m) => `${m.name} (${m.site})`).join(", ") || "none"}`}
            toolName="سازگاری آنزیم‌ها" />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TOOL 4: DNA METHYLATION ANALYSIS
// ═══════════════════════════════════════════════════════════════════════

export function DnaMethylationTool() {
  const [seq, setSeq] = useState("");
  const [methType, setMethType] = useState<"CpG" | "CHG" | "CHH">("CpG");
  const [minIslandLen, setMinIslandLen] = useState(200);
  const [minGcPct, setMinGcPct] = useState(50);
  const [result, setResult] = useState<any>(null);

  const analyze = useCallback(() => {
    const cleaned = cleanSeq(seq);
    if (cleaned.length < 10) { toast.error("حداقل ۱۰ نوکلئوتید وارد کنید."); return; }

    // Find CpG positions
    const cpgPositions: number[] = [];
    for (let i = 0; i < cleaned.length - 1; i++) {
      if (cleaned[i] === "C" && cleaned[i + 1] === "G") {
        cpgPositions.push(i + 1);
      }
    }

    // CpG density
    const density = (cpgPositions.length / cleaned.length) * 1000;

    // Obs/Exp ratio
    const cCount = (cleaned.match(/C/g) || []).length;
    const gCount = (cleaned.match(/G/g) || []).length;
    const expected = (cCount * gCount) / cleaned.length;
    const obsExp = expected > 0 ? cCount / expected : 0;

    // CpG Islands (simple sliding window)
    const islands: { start: number; end: number; length: number; cpgCount: number; gcPct: number; obsExp: number; status: string }[] = [];
    const windowSize = minIslandLen;
    for (let i = 0; i <= cleaned.length - windowSize; i += 10) {
      const window = cleaned.slice(i, i + windowSize);
      const gcCount = (window.match(/[GC]/g) || []).length;
      const gcPct = (gcCount / windowSize) * 100;
      const windowCpg = cpgPositions.filter((p) => p >= i + 1 && p <= i + windowSize).length;
      const windowC = (window.match(/C/g) || []).length;
      const windowG = (window.match(/G/g) || []).length;
      const windowExpected = (windowC * windowG) / windowSize;
      const windowObsExp = windowExpected > 0 ? windowCpg / windowExpected : 0;

      if (gcPct >= minGcPct && windowObsExp >= 0.6 && windowCpg >= 10) {
        const status = i < cleaned.length * 0.3 ? "🎯 پروموتر" : "島 جزیره";
        islands.push({ start: i + 1, end: i + windowSize, length: windowSize, cpgCount: windowCpg, gcPct, obsExp: windowObsExp, status });
      }
    }

    // Deduplicate overlapping islands
    const uniqueIslands = islands.filter((island, idx) => {
      if (idx === 0) return true;
      return island.start > islands[idx - 1].end;
    });

    // Methylation level estimation
    const methylLevel = cpgPositions.length < 5 ? "پایین (Low)" :
      cpgPositions.length < 15 ? "متوسط (Partially methylated)" :
      "بالا (Hypermethylated)";

    // Enzymes sensitive to methylation
    const sensitiveEnzymes = ENZYME_DB.filter((e) => e.methylationSensitive);

    // Colored sequence
    const coloredSeq: { pos: number; bases: string; cpgs: { offset: number; methylated: boolean }[] }[] = [];
    for (let i = 0; i < cleaned.length; i += 50) {
      const chunk = cleaned.slice(i, i + 50);
      const cpgs: { offset: number; methylated: boolean }[] = [];
      for (let j = 0; j < chunk.length - 1; j++) {
        if (chunk[j] === "C" && chunk[j + 1] === "G") {
          cpgs.push({ offset: j, methylated: Math.random() > 0.3 });
        }
      }
      coloredSeq.push({ pos: i + 1, bases: chunk, cpgs });
    }

    setResult({
      total: cleaned.length,
      cpgCount: cpgPositions.length,
      density: density.toFixed(1),
      obsExp: obsExp.toFixed(2),
      islandCount: uniqueIslands.length,
      methylLevel,
      cpgPositions,
      islands: uniqueIslands,
      sensitiveEnzymes,
      coloredSeq,
    });
    toast.success(`${cpgPositions.length} جایگاه CpG و ${uniqueIslands.length} جزیره CpG یافت شد.`);
  }, [seq, methType, minIslandLen, minGcPct]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/20">
          <Atom className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold">آنالیز متیلاسیون DNA</h2>
          <p className="text-[11px] text-white/40">شناسایی جزایر CpG و الگوهای متیلاسیون</p>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-[11px] text-white/50">🧬 ورودی توالی DNA</Label>
        <Textarea value={seq} onChange={(e) => setSeq(e.target.value)} rows={4}
          className="font-mono text-[12px] border-white/[0.06] bg-white/[0.03] text-white/90 placeholder:text-white/20" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label className="text-[11px] text-white/50">🎯 نوع متیلاسیون</Label>
          <select value={methType} onChange={(e) => setMethType(e.target.value as any)}
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[12px] text-white/80">
            <option value="CpG">CpG (متیلاسیون سیتوزین)</option>
            <option value="CHG">CHG</option>
            <option value="CHH">CHH</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] text-white/50">📏 حداقل طول جزیره</Label>
          <Input type="number" value={minIslandLen} onChange={(e) => setMinIslandLen(Number(e.target.value) || 200)}
            className="text-[12px] border-white/[0.06] bg-white/[0.03] text-white/90" />
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] text-white/50">🧪 حداقل GC%</Label>
          <Input type="number" value={minGcPct} onChange={(e) => setMinGcPct(Number(e.target.value) || 50)}
            className="text-[12px] border-white/[0.06] bg-white/[0.03] text-white/90" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={analyze} className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-[12px] text-white hover:from-teal-600 hover:to-cyan-700">
          <Atom className="size-3.5" /> آنالیز Methylation
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setResult(null); setSeq(""); }} className="gap-1 text-[11px] text-white/30 hover:text-white/60">
          <RotateCcw className="size-3" /> Reset
        </Button>
        {result && (
          <Button variant="outline" size="sm" className="gap-2 border-white/[0.08] text-[11px]"
            onClick={() => {
              const rows: string[][] = [["موقعیت", "وضعیت"]];
              result.cpgPositions.forEach((p: number) => rows.push([String(p), "CpG"]));
              result.islands.forEach((island: any) => rows.push([`جزیره ${island.start}-${island.end}`, island.status]));
              downloadCsv("methylation_analysis.csv", rows);
            }}>
            <Download className="size-3" /> دانلود گزارش
          </Button>
        )}
      </div>

      {result && (
        <div className="space-y-5">
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "تعداد کل CpG", value: result.cpgCount, color: "teal" },
              { label: "چگالی CpG (هر kb)", value: result.density, color: "cyan" },
              { label: "نسبت Obs/Exp", value: result.obsExp, color: "indigo" },
              { label: "جزایر CpG", value: result.islandCount, color: "emerald" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border border-${s.color}-500/20 bg-${s.color}-500/5 p-4 text-center`}>
                <p className="text-2xl font-bold text-white/90">{s.value}</p>
                <p className="text-[10px] text-white/40 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Methylation level */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
            <p className="text-[12px] text-white/50">سطح متیلاسیون: <span className="font-semibold text-teal-300">{result.methylLevel}</span></p>
          </div>

          {/* CpG positions */}
          <div>
            <p className="text-[11px] text-white/40 mb-2">📍 موقعیت‌های CpG ({result.cpgCount} عدد)</p>
            <div className="flex flex-wrap gap-1.5">
              {result.cpgPositions.map((p: number) => (
                <Badge key={p} variant="outline" className="text-[9px] font-mono border-teal-500/30 text-teal-400">
                  موقعیت {p} - CG
                </Badge>
              ))}
            </div>
          </div>

          {/* CpG Islands */}
          {result.islands.length > 0 && (
            <div>
              <p className="text-[11px] text-white/40 mb-2">🏝️ جزایر CpG ({result.islands.length} عدد)</p>
              <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="px-3 py-2 text-right text-white/50">#</th>
                      <th className="px-3 py-2 text-right text-white/50">شروع</th>
                      <th className="px-3 py-2 text-right text-white/50">پایان</th>
                      <th className="px-3 py-2 text-right text-white/50">طول</th>
                      <th className="px-3 py-2 text-right text-white/50">CpG</th>
                      <th className="px-3 py-2 text-right text-white/50">GC%</th>
                      <th className="px-3 py-2 text-right text-white/50">Obs/Exp</th>
                      <th className="px-3 py-2 text-right text-white/50">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.islands.map((island: any, idx: number) => (
                      <tr key={idx} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-3 py-2 text-white/70">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono text-white/70">{island.start}</td>
                        <td className="px-3 py-2 font-mono text-white/70">{island.end}</td>
                        <td className="px-3 py-2 text-white/70">{island.length}</td>
                        <td className="px-3 py-2 text-white/70">{island.cpgCount}</td>
                        <td className="px-3 py-2 text-white/70">{island.gcPct.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-white/70">{island.obsExp.toFixed(2)}</td>
                        <td className="px-3 py-2 text-emerald-400">{island.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Colored sequence */}
          <div>
            <p className="text-[11px] text-white/40 mb-2">🧬 نمایش رنگی متیلاسیون در توالی</p>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 font-mono text-[11px] leading-relaxed text-white/60 space-y-0.5">
              {result.coloredSeq.map((line: any) => (
                <div key={line.pos} className="flex gap-3">
                  <span className="w-8 text-right text-white/30 shrink-0">{String(line.pos).padStart(3, " ")}:</span>
                  <span>{line.bases.split("").map((b: string, i: number) => {
                    const cpg = line.cpgs.find((c: any) => c.offset === i);
                    if (cpg) {
                      return <span key={i} className={cpg.methylated ? "text-rose-400 font-bold bg-rose-500/10 rounded" : "text-amber-400 font-bold bg-amber-500/10 rounded"}>{b}</span>;
                    }
                    return <span key={i}>{b}</span>;
                  })}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-2 text-[10px]">
              <span className="flex items-center gap-1"><span className="inline-block size-2 rounded bg-rose-400" /> CpG متیله شده</span>
              <span className="flex items-center gap-1"><span className="inline-block size-2 rounded bg-amber-400" /> CpG بدون متیلاسیون</span>
              <span className="flex items-center gap-1"><span className="inline-block size-2 rounded bg-white/30" /> سایر نوکلئوتیدها</span>
            </div>
          </div>

          {/* Methylation-sensitive enzymes */}
          <div>
            <p className="text-[11px] text-white/40 mb-2">✂️ آنزیم‌های حساس به متیلاسیون</p>
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-3 py-2 text-right text-white/50">آنزیم</th>
                    <th className="px-3 py-2 text-right text-white/50">جایگاه شناسایی</th>
                    <th className="px-3 py-2 text-right text-white/50">حساسیت</th>
                    <th className="px-3 py-2 text-right text-white/50">کاربرد</th>
                  </tr>
                </thead>
                <tbody>
                  {result.sensitiveEnzymes.map((e: Enzyme) => (
                    <tr key={e.name} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-3 py-2 font-mono font-bold text-teal-300">{e.name}</td>
                      <td className="px-3 py-2 font-mono text-white/70">{e.site}</td>
                      <td className="px-3 py-2 text-amber-400">حساس</td>
                      <td className="px-3 py-2 text-white/50">
                        {e.name === "HpaII" ? "تشخیص متیلاسیون CpG" :
                         e.name === "MspI" ? "کنترل مثبت" :
                         e.name === "BstUI" ? "تشخیص متیلاسیون CpG" :
                         e.name === "NotI" ? "جزایر CpG غنی" :
                         "تشخیص متیلاسیون"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <AiInterpretButton
            resultText={`DNA Methylation Analysis (${result.total}bp)\nCpG count: ${result.cpgCount}\nDensity: ${result.density}/kb\nObs/Exp: ${result.obsExp}\nMethylation level: ${result.methylLevel}\nCpG islands: ${result.islandCount}\n${result.islands.map((i: any) => `Island at ${i.start}-${i.end}: GC=${i.gcPct.toFixed(1)}%, Obs/Exp=${i.obsExp.toFixed(2)}`).join("\n")}`}
            toolName="آنالیز متیلاسیون DNA" />
        </div>
      )}
    </div>
  );
}
