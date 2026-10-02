/**
 * Genova Virtual Lab — Bioinformatics Workspace
 * ─────────────────────────────────────────────────────────────────────────────
 * A bright, emerald research console: navigation rail, command bar, gradient
 * lab hero with live counters, stat tiles and performance analytics. Every tool
 * of the previous lab is still one click away, and the lab assistant (same orb
 * as the admin panel) follows the visitor in a themed sheet.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDownAZ,
  Atom,
  BarChart3,
  Bell,
  Beaker,
  Boxes,
  Calculator,
  ChevronDown,
  CircleDot,
  Dna,
  Download,
  FileText,
  FlaskConical,
  GitCompare,
  GraduationCap,
  Home,
  Layers,
  Lock,
  Menu,
  Microscope,
  Pipette,
  PlayCircle,
  Rss,
  Search,
  SearchCode,
  Scissors,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Thermometer,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LabAssistant } from "@/components/lab/LabAssistant";
import { LabTools } from "@/components/lab/LabTools";
import {
  DnaAnalysisTool,
  RnaAnalysisTool,
  ProteinAnalysisTool,
  GcWindowTool,
  PatternSearchTool,
  NucleotideCounterTool,
} from "@/components/lab/BioAnalysisTools";
import {
  RestrictionMapperTool,
  EnzymeSearchTool,
  EnzymeCompatibilityTool,
  DnaMethylationTool,
} from "@/components/lab/RestrictionTools";
import {
  PrimerDesignTool,
  BlastSearchTool,
  TmCalculatorTool,
  DimerCheckerTool,
  MultiplexPrimerTool,
  RealTimePrimerTool,
} from "@/components/lab/PrimerTools";
import { faNum, formatJalaliDate } from "@/lib/format";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════
//  TOOL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

type ToolId =
  | "dna-analysis" | "rna-analysis" | "protein-analysis"
  | "gc-window" | "pattern-search" | "nucleotide-counter"
  | "calculators"
  | "primer-design" | "blast-search" | "tm-calculator" | "dimer-checker"
  | "multiplex" | "realtime"
  | "restriction-mapper" | "enzyme-search" | "enzyme-compat" | "methylation";

type ViewId = "overview" | ToolId;

interface ToolDef {
  id: ToolId;
  title: string;
  titleEn: string;
  description: string;
  icon: typeof Dna;
  component: React.ComponentType;
  group: "sequence" | "calc" | "primer" | "enzyme";
}

const TOOLS: ToolDef[] = [
  { id: "dna-analysis", title: "تحلیل DNA", titleEn: "DNA Analysis", description: "شمارش، GC%، Reverse Complement و ترجمه", icon: Dna, component: DnaAnalysisTool, group: "sequence" },
  { id: "rna-analysis", title: "تحلیل RNA", titleEn: "RNA Analysis", description: "شمارش، وزن مولکولی، cDNA و ساختار ثانویه", icon: Rss, component: RnaAnalysisTool, group: "sequence" },
  { id: "protein-analysis", title: "تحلیل پروتئین", titleEn: "Protein", description: "ترکیب اسید آمینه و خواص فیزیکوشیمیایی", icon: Atom, component: ProteinAnalysisTool, group: "sequence" },
  { id: "gc-window", title: "محاسبه GC%", titleEn: "GC Window", description: "درصد GC پنجره‌ای با تنظیم اندازه", icon: BarChart3, component: GcWindowTool, group: "sequence" },
  { id: "pattern-search", title: "جستجوی الگو", titleEn: "Pattern", description: "جستجوی الگو در توالی", icon: SearchCode, component: PatternSearchTool, group: "sequence" },
  { id: "nucleotide-counter", title: "شمارش نوکلئوتیدها", titleEn: "Counter", description: "شمارش و نمودار توزیع", icon: ArrowDownAZ, component: NucleotideCounterTool, group: "sequence" },
  { id: "calculators", title: "محاسبه‌گرها", titleEn: "Calculators", description: "رقت، غلظت، CFU، PCR و شبیه‌سازها", icon: Calculator, component: LabTools, group: "calc" },
  { id: "primer-design", title: "طراحی پرایمر", titleEn: "Primer Design", description: "طراحی Forward و Reverse", icon: Pipette, component: PrimerDesignTool, group: "primer" },
  { id: "blast-search", title: "BLAST Search", titleEn: "BLAST", description: "جستجوی توالی در دیتاست‌ها", icon: SearchCode, component: BlastSearchTool, group: "primer" },
  { id: "tm-calculator", title: "محاسبه Tm", titleEn: "Tm Calc", description: "دمای ذوب با ۴ روش", icon: Thermometer, component: TmCalculatorTool, group: "primer" },
  { id: "dimer-checker", title: "بررسی دیمر", titleEn: "Dimer Check", description: "تشخیص دیمر و Hairpin", icon: Zap, component: DimerCheckerTool, group: "primer" },
  { id: "multiplex", title: "پرایمر مولتیپلکس", titleEn: "Multiplex", description: "طراحی همزمان چند پرایمر", icon: Pipette, component: MultiplexPrimerTool, group: "primer" },
  { id: "realtime", title: "پرایمر qPCR", titleEn: "Real-Time", description: "طراحی پرایمر Real-Time PCR", icon: Thermometer, component: RealTimePrimerTool, group: "primer" },
  { id: "restriction-mapper", title: "Restriction Mapper", titleEn: "Restriction Map", description: "جستجوی جایگاه برش در توالی", icon: Scissors, component: RestrictionMapperTool, group: "enzyme" },
  { id: "enzyme-search", title: "جستجوی آنزیم", titleEn: "Enzyme Search", description: "۴ نوع جستجوی مختلف", icon: Search, component: EnzymeSearchTool, group: "enzyme" },
  { id: "enzyme-compat", title: "سازگاری آنزیم‌ها", titleEn: "Compatibility", description: "Compatible & Isoschizomers", icon: GitCompare, component: EnzymeCompatibilityTool, group: "enzyme" },
  { id: "methylation", title: "آنالیز متیلاسیون", titleEn: "Methylation", description: "شناسایی جزایر CpG", icon: Atom, component: DnaMethylationTool, group: "enzyme" },
];

const FUTURE_TOOLS = [
  { title: "ترجمهٔ ۶ فریم پروتئین (پیشرفته)", icon: Atom },
  { title: "ابزارهای تخصصی", icon: Zap },
  { title: "دیتاست بیوانفورماتیک", icon: Boxes },
];

const GROUPS = [
  { id: "sequence" as const, label: "تحلیل توالی", icon: Dna },
  { id: "calc" as const, label: "ابزارها و شبیه‌سازها", icon: Calculator },
  { id: "primer" as const, label: "ابزارهای پرایمر", icon: Pipette },
  { id: "enzyme" as const, label: "آنزیم‌های محدودکننده", icon: Scissors },
];

/** Rail items above the tool groups — the "workspace" level navigation. */
const RAIL_TOP = [
  { id: "overview" as const, label: "نمای کلی", icon: LayoutGridIcon },
  { id: "experiments" as const, label: "آزمایش‌ها", icon: FlaskConical },
  { id: "protocols" as const, label: "پروتکل‌ها", icon: FileText },
  { id: "equipment" as const, label: "تجهیزات", icon: Microscope },
  { id: "team" as const, label: "گروه پژوهشی", icon: Users },
  { id: "reports" as const, label: "گزارش‌ها", icon: TrendingUp },
  { id: "settings" as const, label: "تنظیمات", icon: ShieldCheck },
];

function LayoutGridIcon(props: React.ComponentProps<typeof Boxes>) {
  return <Layers {...props} />;
}

// ═══════════════════════════════════════════════════════════════════════════
//  STATIC DASHBOARD DATA (presentation only — tools stay the source of truth)
// ═══════════════════════════════════════════════════════════════════════════

type Trend = { value: string; positive?: boolean };

function StatTile({
  icon: Icon,
  value,
  label,
  trend,
  progress,
}: {
  icon: typeof Dna;
  value: string;
  label: string;
  trend?: Trend;
  progress?: number;
}) {
  return (
    <div className="rounded-2xl border border-emerald-900/5 bg-white p-4 shadow-[0_1px_2px_rgba(6,78,59,0.04),0_12px_28px_-20px_rgba(6,78,59,0.25)] transition-shadow hover:shadow-[0_1px_2px_rgba(6,78,59,0.06),0_18px_36px_-22px_rgba(6,78,59,0.35)]">
      <div className="flex items-start justify-between">
        <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <Icon className="size-4" />
        </span>
        {trend && (
          <span className={cn("text-[10.5px] font-semibold", trend.positive === false ? "text-rose-500" : "text-emerald-600")}>
            {trend.value}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-[11.5px] text-slate-500">{label}</p>
      {progress !== undefined && (
        <div className="mt-3 h-px w-full bg-emerald-600/25">
          <div className="h-px bg-emerald-500" style={{ width: `${Math.min(100, Math.max(4, progress))}%` }} />
        </div>
      )}
    </div>
  );
}

function GlassCard({
  icon: Icon,
  label,
  value,
  hint,
  className,
}: {
  icon: typeof Dna;
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/20 bg-white/12 px-3.5 py-2.5 text-white shadow-lg shadow-emerald-950/20 backdrop-blur-md",
        className,
      )}
    >
      <p className="flex items-center gap-1.5 text-[10px] font-medium text-white/70">
        <Icon className="size-3" />
        {label}
      </p>
      <p className="mt-1 text-lg font-extrabold leading-none">{value}</p>
      {hint && <p className="mt-1 text-[10px] text-white/60">{hint}</p>}
    </div>
  );
}

/** Decorative molecular constellation used behind the hero. */
function MoleculeField() {
  const nodes = [
    { x: 22, y: 30 }, { x: 48, y: 18 }, { x: 74, y: 34 }, { x: 34, y: 62 },
    { x: 66, y: 66 }, { x: 86, y: 52 }, { x: 12, y: 74 }, { x: 52, y: 84 },
  ];
  const links: [number, number][] = [[0, 1], [1, 2], [0, 3], [3, 4], [2, 5], [3, 6], [4, 7], [2, 4], [1, 3]];
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" preserveAspectRatio="none" aria-hidden>
      {links.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="0.35"
        />
      ))}
      {nodes.map((n, i) => (
        <motion.circle
          key={i}
          cx={n.x}
          cy={n.y}
          r={i % 3 === 0 ? 2.6 : 1.8}
          fill="rgba(255,255,255,0.55)"
          animate={{ opacity: [0.35, 0.85, 0.35] }}
          transition={{ duration: 4 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}

const WEEK_LABELS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

function greetingFor(hour: number) {
  if (hour < 12) return "صبح بخیر";
  if (hour < 17) return "ظهر بخیر";
  return "عصر بخیر";
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function VirtualLab() {
  const [view, setView] = useState<ViewId>("overview");
  const [railOpen, setRailOpen] = useState(false);
  const [toolSearch, setToolSearch] = useState("");
  const [track, setTrack] = useState<"all" | "genetics" | "protein" | "cellular">("all");

  // The lab canvas is light-only now, so the shared lab overrides stay on.
  useEffect(() => {
    document.documentElement.classList.add("lab-light");
    return () => document.documentElement.classList.remove("lab-light");
  }, []);

  // Single timestamp so the header date never changes between renders.
  const [now] = useState(() => Date.now());

  const experiments = useQuery(api.lab.listExperiments);
  const summary = useQuery(api.lab.myLabSummary);

  const currentTool = TOOLS.find((t) => t.id === view) ?? null;
  const ToolComponent = currentTool?.component;

  const filteredTools = useMemo(() => {
    if (!toolSearch.trim()) return TOOLS;
    const q = toolSearch.trim().toLowerCase();
    return TOOLS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.titleEn.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }, [toolSearch]);

  const filteredGroups = useMemo(() => {
    if (!toolSearch.trim()) return GROUPS;
    return GROUPS.filter((g) => filteredTools.some((t) => t.group === g.id));
  }, [toolSearch, filteredTools]);

  const select = useCallback((id: ViewId) => {
    setView(id);
    setRailOpen(false);
  }, []);

  // ── Live numbers ──────────────────────────────────────────────────────────
  const catalog = experiments?.length ?? TOOLS.length;
  const completed = summary?.completed ?? 0;
  const inProgress = summary?.inProgress ?? 0;
  const notes = summary?.notes ?? 0;
  const points = summary?.points ?? 0;
  const totalRuns = completed + inProgress;
  const accuracy = completed > 0 ? Math.min(99, 82 + Math.round((points / Math.max(completed, 1)) / 12)) : 0;

  const heroStats = useMemo(
    () => [
      { value: faNum(catalog), label: "پروتکل و ابزار فعال" },
      { value: faNum(totalRuns), label: "آزمایش در جریان" },
      { value: accuracy > 0 ? `${faNum(accuracy)}٪` : "—", label: "دقت ثبت‌شده" },
    ],
    [catalog, totalRuns, accuracy],
  );

  const tiles = useMemo(
    () => [
      { icon: FlaskConical, value: faNum(catalog), label: "پروتکل‌های کاتالوگ", trend: { value: "۱۲٪" } },
      { icon: TestTube2, value: faNum(totalRuns), label: "آزمایش‌های انجام‌شده", trend: { value: `${faNum(Math.max(1, Math.round(totalRuns / 3)))}٪` } },
      { icon: Beaker, value: faNum(notes), label: "یادداشت آزمایشگاه", trend: { value: `${faNum(Math.max(1, notes))} مورد` } },
      { icon: Activity, value: accuracy > 0 ? `${faNum(accuracy)}٪` : "—", label: "سلامت خط لوله‌ها", trend: { value: "+۰.۴٪" }, progress: accuracy || 62 },
      { icon: Dna, value: faNum(TOOLS.length), label: "ابزار تحلیل توالی", trend: { value: "۵.۲٪" }, progress: 87 },
      { icon: GraduationCap, value: faNum(points), label: "امتیاز علمی کسب‌شده", trend: { value: "+۰.۲٪" }, progress: 74 },
      { icon: CircleDot, value: faNum(summary?.catalogSize ?? catalog), label: "پروتکل‌های قابل اجرا", trend: { value: "+۲۸" }, progress: 68 },
      { icon: ShieldCheck, value: totalRuns > 0 ? "A+" : "—", label: "امتیاز پایبندی به پروتکل", trend: { value: "۱۰۰٪" }, progress: 92 },
    ],
    [catalog, totalRuns, notes, points, accuracy, summary?.catalogSize],
  );

  // ── Analytics series ──────────────────────────────────────────────────────
  const successSeries = useMemo(
    () =>
      WEEK_LABELS.map((day, i) => ({
        day,
        success: Math.max(24, Math.min(100, 68 + ((i * 7 + catalog) % 26))),
        target: 85,
      })),
    [catalog],
  );

  const outputSeries = useMemo(
    () => [
      { kind: "توالی", value: Math.max(6, Math.round(catalog * 0.8)) },
      { kind: "پرایمر", value: Math.max(4, Math.round(catalog * 0.5)) },
      { kind: "پروتئین", value: Math.max(3, Math.round(catalog * 0.35)) },
      { kind: "آنزیم", value: Math.max(3, Math.round(catalog * 0.3)) },
    ],
    [catalog],
  );

  const activitySeries = useMemo(
    () =>
      WEEK_LABELS.map((day, i) => ({
        day,
        runs: Math.max(0, totalRuns === 0 ? (i + 2) * 2 : Math.round(totalRuns / 3) + i * 2 + 4),
      })),
    [totalRuns],
  );

  const chartAccent =
    track === "genetics"
      ? "#059669"
      : track === "protein"
        ? "#0d9488"
        : track === "cellular"
          ? "#047857"
          : "#10b981";

  const trackNote =
    track === "all"
      ? "نمای کلی هوشمندی آزمایشگاه"
      : track === "genetics"
        ? "تحلیل توالی، PCR و ژنتیک"
        : track === "protein"
          ? "پروتئین، ساختار و فعالیت آنزیمی"
          : "همه‌گیری، انتقال پیام و تقسیم سلولی";

  const chartFrame = "rounded-2xl border border-emerald-900/5 bg-white p-4 shadow-[0_1px_2px_rgba(6,78,59,0.04),0_12px_28px_-20px_rgba(6,78,59,0.25)]";

  return (
    <div className="lab-app flex h-dvh overflow-hidden bg-[#eef5f2] text-slate-800">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 -left-24 size-[420px] rounded-full bg-emerald-200/40 blur-[140px]" />
        <div className="absolute -bottom-40 -right-20 size-[380px] rounded-full bg-teal-200/30 blur-[130px]" />
      </div>

      {/* ══ Navigation rail ═══════════════════════════════════════════════ */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-[264px] flex-col border-l border-emerald-900/8 bg-white/92 backdrop-blur-xl transition-transform duration-300 ease-out lg:static lg:translate-x-0",
          railOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center gap-2.5 border-b border-emerald-900/8 px-5 py-4">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-md shadow-emerald-900/20">
            <FlaskConical className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-extrabold text-slate-900">آزمایشگاه ژنوا</p>
            <p className="truncate text-[10px] text-slate-400">پژوهش هوشمند زیستی</p>
          </div>
          <button
            type="button"
            onClick={() => setRailOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700 lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Rail search */}
        <div className="px-4 pt-4">
          <label className="flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-slate-50/70 px-3 py-2 transition-colors focus-within:border-emerald-400 focus-within:bg-white">
            <Search className="size-3.5 shrink-0 text-slate-400" />
            <input
              value={toolSearch}
              onChange={(e) => setToolSearch(e.target.value)}
              placeholder="جستجوی ابزار، تحلیل، آنزیم..."
              className="w-full bg-transparent text-[12px] text-slate-700 outline-none placeholder:text-slate-400"
            />
            {toolSearch && (
              <button type="button" onClick={() => setToolSearch("")} className="text-slate-300 hover:text-slate-500">
                <X className="size-3" />
              </button>
            )}
          </label>
        </div>

        <nav className="lab-scrollbar flex-1 overflow-y-auto px-3 pb-4 pt-4">
          {/* Workspace level */}
          <ul className="mb-5 space-y-0.5">
            {RAIL_TOP.map((item) => {
              const Icon = item.icon;
              const isActive = view === item.id;
              const disabled = item.id !== "overview";
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && select(item.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-right text-[12.5px] font-medium transition-colors",
                      isActive
                        ? "bg-emerald-50 font-bold text-emerald-800"
                        : disabled
                          ? "text-slate-400 hover:text-slate-500"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                    )}
                  >
                    <Icon className={cn("size-4", isActive ? "text-emerald-600" : "text-slate-400")} />
                    <span className="truncate">{item.label}</span>
                    {disabled && <Lock className="mr-auto size-3 text-slate-300" />}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Tool groups */}
          {filteredGroups.map((group) => {
            const GroupIcon = group.icon;
            const groupTools = filteredTools.filter((t) => t.group === group.id);
            if (groupTools.length === 0) return null;
            return (
              <div key={group.id} className="mb-5">
                <p className="mb-1.5 flex items-center gap-1.5 px-3 text-[10px] font-bold tracking-wide text-slate-400">
                  <GroupIcon className="size-3" />
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {groupTools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = view === tool.id;
                    return (
                      <li key={tool.id}>
                        <button
                          type="button"
                          onClick={() => select(tool.id)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-right text-[12px] transition-colors",
                            isActive
                              ? "bg-emerald-600 font-semibold text-white shadow-sm shadow-emerald-900/15"
                              : "text-slate-500 hover:bg-emerald-50/70 hover:text-emerald-800",
                          )}
                        >
                          <Icon className={cn("size-4 shrink-0", isActive ? "text-white" : "text-slate-400")} />
                          <span className="truncate">{tool.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {/* Coming soon */}
          {!toolSearch.trim() && (
            <div className="mb-4">
              <p className="mb-1.5 px-3 text-[10px] font-bold tracking-wide text-slate-300">به‌زودی</p>
              <ul className="space-y-0.5">
                {FUTURE_TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <li
                      key={tool.title}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] text-slate-300"
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{tool.title}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {toolSearch.trim() && filteredTools.length === 0 && (
            <p className="px-3 py-6 text-center text-[11.5px] text-slate-400">ابزاری یافت نشد</p>
          )}
        </nav>

        <div className="border-t border-emerald-900/8 p-3">
          <div className="mb-2 rounded-xl bg-emerald-50/70 p-3">
            <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-800">
              <span>اعتبار پژوهش</span>
              <span className="font-mono">{faNum(12480)}</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-emerald-200/70">
              <div className="h-full w-[68%] rounded-full bg-emerald-600" />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>ذخیره‌سازی نمونه</span>
              <span>۲.۴ GB</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-emerald-200/70">
              <div className="h-full w-[42%] rounded-full bg-emerald-500" />
            </div>
            <Button
              size="sm"
              className="mt-3 h-8 w-full rounded-xl bg-emerald-700 text-[11.5px] text-white hover:bg-emerald-800"
            >
              ارتقا به حرفه‌ای
            </Button>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[11.5px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-emerald-700"
          >
            <Home className="size-3.5" />
            بازگشت به سایت اصلی
          </Link>
        </div>
      </aside>

      {railOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setRailOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ══ Main column ═══════════════════════════════════════════════════ */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Command bar */}
        <header className="flex shrink-0 items-center gap-2 border-b border-emerald-900/8 bg-white/85 px-3 py-2.5 backdrop-blur-xl sm:px-5">
          <button
            type="button"
            onClick={() => setRailOpen(true)}
            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700 lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
            <label className="flex w-full max-w-md items-center gap-2 rounded-xl border border-emerald-900/10 bg-slate-50/70 px-3 py-2 transition-colors focus-within:border-emerald-400 focus-within:bg-white">
              <Search className="size-3.5 shrink-0 text-slate-400" />
              <input
                value={toolSearch}
                onChange={(e) => setToolSearch(e.target.value)}
                placeholder="جستجوی ابزار، تحلیل، آنزیم..."
                className="w-full bg-transparent text-[12.5px] text-slate-700 outline-none placeholder:text-slate-400"
              />
              <kbd className="hidden shrink-0 rounded-md border border-emerald-900/10 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 lg:block">
                ⌘K
              </kbd>
            </label>
          </div>

          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-xl border border-emerald-900/10 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 transition-colors hover:border-emerald-300 sm:flex"
          >
            <FlaskConical className="size-3.5 text-emerald-600" />
            آزمایشگاه ژنوا — بیوانفورماتیک
            <ChevronDown className="size-3.5 text-slate-400" />
          </button>

          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-xl border border-emerald-900/10 bg-white px-3 py-2 text-[12px] font-medium text-slate-600 transition-colors hover:border-emerald-300 lg:flex"
          >
            <Activity className="size-3.5 text-slate-400" />
            {formatJalaliDate(now)}
          </button>

          <div className="flex flex-1 items-center justify-end gap-1.5 md:flex-none">
            <button
              type="button"
              title="اعلان‌ها"
              className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
            >
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-emerald-500" />
            </button>
            <button
              type="button"
              className="hidden items-center gap-1.5 rounded-xl border border-emerald-900/10 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 transition-colors hover:border-emerald-300 sm:flex"
            >
              <Download className="size-3.5 text-emerald-600" />
              خروجی گزارش
            </button>
            <div className="mr-1 flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-white py-1.5 pr-2 pl-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-bold text-white">
                م
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-[11.5px] font-bold text-slate-800">پژوهشگر ژنوا</span>
                <span className="block text-[10px] text-slate-400">تحلیل‌گر ارشد</span>
              </span>
              <ChevronDown className="size-3.5 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="lab-scrollbar flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {view === "overview" ? (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="mx-auto w-full max-w-[1180px] space-y-5 px-4 py-5 sm:px-6"
              >
                {/* ── Hero ─────────────────────────────────────────────── */}
                <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-l from-emerald-900 via-emerald-800 to-emerald-700 shadow-[0_24px_60px_-30px_rgba(4,47,46,0.7)]">
                  <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_85%_20%,rgba(16,185,129,0.35),transparent_60%)]" />
                    <MoleculeField />
                  </div>

                  <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr]">
                    <div>
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11.5px] font-medium text-white/90 backdrop-blur">
                        <span className="size-1.5 animate-pulse rounded-full bg-emerald-300" />
                        {greetingFor(new Date(now).getHours())}، پژوهشگر ژنوا
                      </span>

                      <h1 className="mt-4 text-[26px] leading-[1.25] font-black tracking-tight text-white sm:text-[34px]">
                        کشف‌های زیستی را
                        <br />
                        با هوش مصنوعی <span className="text-emerald-300">شتاب دهید</span>
                      </h1>

                      <p className="mt-3 max-w-md text-[12.5px] leading-7 text-white/70">
                        هر توالی را تحلیل کنید، پرایمر طراحی کنید و جایگاه آنزیم‌های محدودکننده را
                        پیدا کنید — همه در یک فضای کاری، با دستیار هوشمند همیشه همراه.
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2.5">
                        <Button
                          size="sm"
                          onClick={() => select("dna-analysis")}
                          className="h-10 gap-1.5 rounded-xl bg-white px-4 text-[12.5px] font-bold text-emerald-900 hover:bg-emerald-50"
                        >
                          <PlayCircle className="size-4" />
                          شروع آزمایش
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => select("primer-design")}
                          className="h-10 gap-1.5 rounded-xl border-white/25 bg-white/10 px-4 text-[12.5px] font-semibold text-white hover:bg-white/20"
                        >
                          <Sparkles className="size-4" />
                          تحلیل با هوش مصنوعی
                        </Button>
                      </div>

                      <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-white/12 pt-5">
                        {heroStats.map((s) => (
                          <div key={s.label}>
                            <p className="text-xl font-extrabold text-white">{s.value}</p>
                            <p className="mt-0.5 text-[11px] text-white/55">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Floating glass cards */}
                    <div className="relative hidden min-h-[220px] lg:block">
                      <div className="absolute right-0 top-0 w-[190px]">
                        <GlassCard
                          icon={Sparkles}
                          label="دقت تحلیل"
                          value={accuracy > 0 ? `${faNum(accuracy)}٪` : "—"}
                          hint="بهبود هفتگی"
                        />
                      </div>
                      <div className="absolute bottom-0 right-[210px] w-[178px]">
                        <GlassCard
                          icon={Activity}
                          label="خط لوله‌های فعال"
                          value={faNum(inProgress + 6)}
                          hint="همه سامانه‌ها فعال"
                        />
                      </div>
                      <div className="absolute bottom-0 right-0 w-[190px]">
                        <GlassCard
                          icon={TrendingUp}
                          label="کشف‌های امروز"
                          value={`+${faNum(Math.max(6, Math.round(totalRuns * 1.4)))}`}
                          hint="نسبت به دیروز"
                        />
                      </div>
                      <span className="absolute left-[42%] top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-400 text-[13px] font-black text-emerald-950 shadow-[0_0_0_10px_rgba(52,211,153,0.18)]">
                        AI
                      </span>
                    </div>
                  </div>
                </section>

                {/* ── Stat tiles ───────────────────────────────────────── */}
                <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {tiles.map((tile) => (
                    <StatTile
                      key={tile.label}
                      icon={tile.icon}
                      value={tile.value}
                      label={tile.label}
                      trend={tile.trend}
                      progress={tile.progress}
                    />
                  ))}
                </section>

                {/* ── Analytics ────────────────────────────────────────── */}
                <section>
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="text-[17px] font-extrabold tracking-tight text-slate-900">
                        تحلیل عملکرد آزمایشگاه
                      </h2>
                      <p className="mt-0.5 text-[11.5px] text-slate-500">{trackNote}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          { id: "all", label: "همه" },
                          { id: "genetics", label: "ژنتیک" },
                          { id: "protein", label: "پروتئین" },
                          { id: "cellular", label: "سلولی" },
                        ] as const
                      ).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTrack(t.id)}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors",
                            track === t.id
                              ? "bg-emerald-700 text-white shadow-sm"
                              : "bg-white text-slate-500 hover:bg-emerald-50 hover:text-emerald-700",
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className={chartFrame}>
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <p className="text-[12.5px] font-bold text-slate-800">نرخ موفقیت آزمایش</p>
                          <p className="text-[10.5px] text-slate-400">موفقیت در برابر هدف</p>
                        </div>
                        <span className="text-[10.5px] font-bold text-emerald-600">+۹۸٪</span>
                      </div>
                      <div className="h-[132px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={successSeries} margin={{ top: 6, right: 4, bottom: 0, left: -22 }}>
                            <defs>
                              <linearGradient id="labSuccess" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={chartAccent} stopOpacity={0.35} />
                                <stop offset="100%" stopColor={chartAccent} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#d6e8e0" vertical={false} />
                            <XAxis
                              dataKey="day"
                              tick={{ fontSize: 9, fill: "#94a3b8" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 9, fill: "#94a3b8" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <RTooltip
                              contentStyle={{
                                borderRadius: 12,
                                border: "1px solid #d6e8e0",
                                fontSize: 11,
                                direction: "rtl",
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="target"
                              stroke="#cbd5e1"
                              strokeDasharray="4 4"
                              fill="none"
                            />
                            <Area
                              type="monotone"
                              dataKey="success"
                              stroke={chartAccent}
                              strokeWidth={2}
                              fill="url(#labSuccess)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className={chartFrame}>
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <p className="text-[12.5px] font-bold text-slate-800">خروجی پژوهش</p>
                          <p className="text-[10.5px] text-slate-400">تفکیک‌شده بر اساس نوع تحلیل</p>
                        </div>
                        <span className="text-[10.5px] font-bold text-emerald-600">+۲۴٪</span>
                      </div>
                      <div className="h-[132px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={outputSeries} margin={{ top: 6, right: 4, bottom: 0, left: -22 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#d6e8e0" vertical={false} />
                            <XAxis
                              dataKey="kind"
                              tick={{ fontSize: 9, fill: "#94a3b8" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 9, fill: "#94a3b8" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <RTooltip
                              cursor={{ fill: "#ecfdf5" }}
                              contentStyle={{
                                borderRadius: 12,
                                border: "1px solid #d6e8e0",
                                fontSize: 11,
                                direction: "rtl",
                              }}
                            />
                            <Bar dataKey="value" fill={chartAccent} radius={[6, 6, 0, 0]} barSize={26} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className={chartFrame}>
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <p className="text-[12.5px] font-bold text-slate-800">زمان‌بندی کشف‌ها</p>
                          <p className="text-[10.5px] text-slate-400">تحلیل‌های ثبت‌شده در هفته</p>
                        </div>
                        <span className="text-[10.5px] font-bold text-emerald-600">
                          {faNum(activitySeries.reduce((a, b) => a + b.runs, 0))} این هفته
                        </span>
                      </div>
                      <div className="h-[132px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={activitySeries} margin={{ top: 6, right: 4, bottom: 0, left: -22 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#d6e8e0" vertical={false} />
                            <XAxis
                              dataKey="day"
                              tick={{ fontSize: 9, fill: "#94a3b8" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 9, fill: "#94a3b8" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <RTooltip
                              contentStyle={{
                                borderRadius: 12,
                                border: "1px solid #d6e8e0",
                                fontSize: 11,
                                direction: "rtl",
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="runs"
                              stroke={chartAccent}
                              strokeWidth={2}
                              dot={{ r: 2.5, fill: chartAccent, strokeWidth: 0 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            ) : (
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6"
              >
                {currentTool && ToolComponent && (
                  <>
                    <header className="mb-4 flex items-start gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600/10 text-emerald-700">
                        <currentTool.icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h1 className="text-[19px] font-extrabold tracking-tight text-slate-900">
                            {currentTool.title}
                          </h1>
                          <Badge
                            variant="outline"
                            className="rounded-full border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-700"
                          >
                            {currentTool.titleEn}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[12px] text-slate-500">{currentTool.description}</p>
                      </div>
                    </header>
                    <div className="rounded-[22px] border border-emerald-900/8 bg-white p-4 shadow-[0_1px_2px_rgba(6,78,59,0.04),0_16px_36px_-26px_rgba(6,78,59,0.35)] sm:p-5">
                      <ToolComponent />
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <LabAssistant tool={currentTool?.title} />
    </div>
  );
}
