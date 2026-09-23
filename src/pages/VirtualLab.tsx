/**
 * Genova Virtual Lab — Premium Bioinformatics Platform
 * ─────────────────────────────────────────────────────────────────────────────
 * A standalone full-screen application with premium SaaS-quality design.
 * Sophisticated visual identity, not generic dark theme.
 */
import { useCallback, useMemo, useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Atom,
  BarChart3,
  Calculator,
  ChevronLeft,
  Dna,
  FlaskConical,
  Scissors,
  GitCompare,
  Home,
  Lock,
  Pipette,
  SearchCode,
  Sparkles,
  Sun,
  Moon,
  TestTube2,
  Thermometer,
  Wrench,
  Search,
  Zap,
  Database,
  Menu,
  X,
  ArrowDownAZ,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
//  TOOL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

type ToolId =
  | "dna-analysis" | "rna-analysis" | "protein-analysis"
  | "gc-window" | "pattern-search" | "nucleotide-counter"
  | "calculators"
  | "primer-design" | "blast-search" | "tm-calculator" | "dimer-checker"
  | "multiplex" | "realtime"
  | "restriction-mapper" | "enzyme-search" | "enzyme-compat" | "methylation";

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
  { id: "rna-analysis", title: "تحلیل RNA", titleEn: "RNA Analysis", description: "شمارش، وزن مولکولی، cDNA و ساختار ثانویه", icon: Dna, component: RnaAnalysisTool, group: "sequence" },
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
  { title: "ترجمه ۶ فریم پروتئین (پیشرفته)", icon: Atom, color: "#f472b6" },
  { title: "ابزارهای تخصصی", icon: Zap, color: "#fb923c" },
  { title: "دیتاست بیوانفورماتیک", icon: Database, color: "#34d399" },
];

const GROUPS = [
  { id: "sequence" as const, label: "تحلیل توالی", accent: "from-indigo-500 to-violet-500" },
  { id: "calc" as const, label: "ابزارها و شبیه‌سازها", accent: "from-emerald-500 to-teal-500" },
  { id: "primer" as const, label: "ابزارهای پرایمر", accent: "from-cyan-500 to-blue-500" },
  { id: "enzyme" as const, label: "آنزیم‌های محدودکننده", accent: "from-rose-500 to-pink-500" },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function VirtualLab() {
  const [activeTool, setActiveTool] = useState<ToolId>("dna-analysis");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolSearch, setToolSearch] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("lab-theme") as "dark" | "light") || "dark"; } catch { return "dark"; }
  });

  useEffect(() => {
    localStorage.setItem("lab-theme", theme);
    document.documentElement.classList.toggle("lab-light", theme === "light");
  }, [theme]);

  const currentTool = TOOLS.find((t) => t.id === activeTool) ?? TOOLS[0];
  const ToolComponent = currentTool.component;
  const currentGroup = GROUPS.find((g) => g.id === currentTool.group);

  const filteredTools = useMemo(() => {
    if (!toolSearch.trim()) return TOOLS;
    const q = toolSearch.trim().toLowerCase();
    return TOOLS.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      t.titleEn.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  }, [toolSearch]);

  const filteredGroups = useMemo(() => {
    if (!toolSearch.trim()) return GROUPS;
    return GROUPS.filter((g) => filteredTools.some((t) => t.group === g.id));
  }, [toolSearch, filteredTools]);

  const filteredFutureTools = useMemo(() => {
    if (!toolSearch.trim()) return FUTURE_TOOLS;
    const q = toolSearch.trim().toLowerCase();
    return FUTURE_TOOLS.filter((t) => t.title.toLowerCase().includes(q));
  }, [toolSearch]);

  const selectTool = useCallback((id: ToolId) => {
    setActiveTool(id);
    setSidebarOpen(false);
  }, []);

  const isDark = theme === "dark";

  return (
    <div className={cn("lab-app flex h-screen overflow-hidden transition-colors duration-300", isDark ? "bg-[#060b18] text-white" : "bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 text-slate-800")}>
      {/* ── Ambient background ──────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {isDark ? (
          <>
            <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-600/[0.07] blur-[150px]" />
            <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-cyan-600/[0.05] blur-[120px]" />
            <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/[0.04] blur-[100px]" />
            <div className="absolute inset-0 opacity-[0.015]"
              style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
          </>
        ) : (
          <>
            <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-200/30 blur-[150px]" />
            <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-slate-200/40 blur-[120px]" />
            <div className="absolute inset-0 opacity-[0.03]"
              style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
          </>
        )}
      </div>

      {/* ── Sidebar (desktop) ───────────────────────────────────────────── */}
      <aside className={cn(
        "relative z-30 flex w-[280px] flex-col border-l transition-transform duration-300 ease-out",
        isDark ? "border-white/[0.04] bg-[#0a1020]/80" : "border-slate-200/60 bg-white/95 shadow-xl shadow-slate-200/30",
        "backdrop-blur-2xl",
        "fixed inset-y-0 right-0 xl:relative xl:translate-x-0",
        sidebarOpen ? "translate-x-0" : "translate-x-full",
      )}>
        {/* Logo */}          <div className={cn("relative px-5 py-5 border-b", isDark ? "border-white/[0.04]" : "border-slate-200/60")}>
          <div className="flex items-center gap-3">
            <div className="relative flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
              <FlaskConical className="size-5 text-white" />
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
            </div>
            <div>
              <h1 className={cn("text-[13px] font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-800")}>آزمایشگاه مجازی</h1>
              <p className={cn("text-[10px] font-medium tracking-wide", isDark ? "text-white/30" : "text-slate-400")}>GENOVA VIRTUAL LAB</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)}
            className={cn("absolute top-4 left-4 rounded-xl p-1.5 xl:hidden transition-colors", isDark ? "text-white/30 hover:bg-white/5 hover:text-white/60" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600")}>
            <X className="size-4" />
          </button>
        </div>

        {/* Search */}
        <div className={cn("px-4 pb-3 pt-2", isDark ? "" : "")}>
          <div className={cn(
            "relative flex items-center gap-2 rounded-xl border px-3 py-2 transition-all",
            isDark ? "border-white/[0.06] bg-white/[0.03] focus-within:border-indigo-500/40 focus-within:bg-white/[0.05]" : "border-slate-200 bg-white/60 focus-within:border-blue-400 focus-within:bg-white",
          )}>
            <Search className={cn("size-3.5 shrink-0", isDark ? "text-white/25" : "text-slate-400")} />
            <input
              type="text"
              placeholder="جستجوی ابزار..."
              value={toolSearch}
              onChange={(e) => setToolSearch(e.target.value)}
              className={cn(
                "w-full bg-transparent text-[11px] font-medium outline-none placeholder:text-[11px]",
                isDark ? "text-white placeholder:text-white/20" : "text-slate-700 placeholder:text-slate-400",
              )}
            />
            {toolSearch && (
              <button onClick={() => setToolSearch("")} className={cn("rounded-md p-0.5 transition-colors", isDark ? "text-white/20 hover:text-white/50" : "text-slate-300 hover:text-slate-500")}>
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 lab-scrollbar">
          {filteredGroups.map((group) => {
            const groupTools = filteredTools.filter((t) => t.group === group.id);
            if (groupTools.length === 0) return null;
            return (
              <div key={group.id} className="mb-5">
                <div className="px-5 mb-2">
                  <p className={cn("text-[10px] font-bold uppercase tracking-[0.15em]", isDark ? "text-white/20" : "text-slate-400")}>{group.label}</p>
                </div>
                <div className="space-y-0.5 px-3">
                  {groupTools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeTool === tool.id;
                    return (
                      <button key={tool.id} onClick={() => selectTool(tool.id)}
                        className={cn(
                          "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right transition-all duration-200",
                          isActive
                            ? (isDark ? "bg-white/[0.06] text-white" : "bg-blue-50 text-blue-700")
                            : (isDark ? "text-white/35 hover:bg-white/[0.03] hover:text-white/60" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"),
                        )}>
                        {isActive && (
                          <motion.div layoutId="sidebar-active"
                            className={cn("absolute inset-0 rounded-xl bg-gradient-to-l opacity-100", group.accent)}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }} />
                        )}
                        <span className={cn(
                          "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                          isActive ? (isDark ? "bg-white/10 text-white" : "bg-blue-100 text-blue-600") : (isDark ? "bg-white/[0.03] text-white/25 group-hover:text-white/40" : "bg-slate-100 text-slate-400 group-hover:text-slate-600"),
                        )}>
                          <Icon className="size-4" />
                        </span>
                        <div className="relative z-10 min-w-0 flex-1">
                          <p className={cn("text-[12px] font-semibold leading-tight", isActive ? (isDark ? "text-white" : "text-blue-700") : (isDark ? "" : "text-slate-700"))}>{tool.title}</p>
                          <p className={cn("mt-0.5 text-[9px] font-medium uppercase tracking-wider", isDark ? "text-white/20" : "text-slate-400")}>{tool.titleEn}</p>
                        </div>
                        {isActive && <span className={cn("relative z-10 size-1.5 rounded-full", isDark ? "bg-white/60" : "bg-blue-500")} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Coming Soon */}
          {filteredFutureTools.length > 0 && (
            <>
              <div className="px-5 mb-2">
                <p className={cn("text-[10px] font-bold uppercase tracking-[0.15em]", isDark ? "text-white/15" : "text-slate-300")}>به‌زودی</p>
              </div>
              <div className="space-y-0.5 px-3">
                {filteredFutureTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <div key={tool.title} className="flex items-center gap-3 rounded-xl px-3 py-2 opacity-25">
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", isDark ? "bg-white/[0.02]" : "bg-slate-100")}>
                    <Icon className="size-4" style={{ color: tool.color }} />
                  </span>
                  <p className={cn("text-[11px] font-medium", isDark ? "text-white/50" : "text-slate-400")}>{tool.title}</p>
                  <Lock className={cn("mr-auto size-3", isDark ? "text-white/15" : "text-slate-300")} />
                </div>
              );
            })}
              </div>
            </>
          )}
          {toolSearch && filteredTools.length === 0 && filteredFutureTools.length === 0 && (
            <div className="px-5 py-8 text-center">
              <Search className={cn("mx-auto mb-2 size-8", isDark ? "text-white/10" : "text-slate-300")} />
              <p className={cn("text-[11px] font-medium", isDark ? "text-white/20" : "text-slate-400")}>ابزاری یافت نشد</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cn("border-t p-3", isDark ? "border-white/[0.04]" : "border-slate-200/60")}>
          <Link to="/"
            className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[11px] font-medium transition-all",
              isDark ? "text-white/25 hover:bg-white/[0.03] hover:text-white/50" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600")}>
            <Home className="size-3.5" />
            بازگشت به سایت اصلی
          </Link>
        </div>
      </aside>

      {/* ── Mobile overlay ──────────────────────────────────────────────── */}
      {sidebarOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm xl:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className={cn("flex items-center gap-3 border-b px-4 py-3 backdrop-blur-xl xl:px-6",
          isDark ? "border-white/[0.04] bg-[#060b18]/60" : "border-slate-200/60 bg-white/70")}>
          <button onClick={() => setSidebarOpen(true)}
            className={cn("rounded-xl p-2 xl:hidden transition-colors", isDark ? "text-white/30 hover:bg-white/5 hover:text-white/60" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600")}>
            <Menu className="size-5" />
          </button>

          <Link to="/" className={cn("rounded-xl p-2 transition-colors", isDark ? "text-white/30 hover:bg-white/5 hover:text-white/60" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600")}>
            <Home className="size-4" />
          </Link>

          <div className={cn("flex items-center gap-2 text-[11px]", isDark ? "text-white/25" : "text-slate-400")}>
            <FlaskConical className="size-3" />
            <span className="font-medium">آزمایشگاه</span>
            <ChevronLeft className="size-3" />
            <span className={cn("font-semibold", isDark ? "text-white/60" : "text-slate-600")}>{currentTool.title}</span>
          </div>

          <div className="mr-auto flex items-center gap-2">
            <button onClick={() => setTheme(isDark ? "light" : "dark")}
              className={cn("flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-all",
                isDark
                  ? "bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/60"
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100")}>
              {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              {isDark ? "روشن" : "تاریک"}
            </button>
            <Badge variant="outline" className={cn("rounded-full text-[9px] font-medium",
              isDark ? "border-white/[0.06] bg-white/[0.02] text-white/30" : "border-slate-200 bg-white text-slate-500")}>
              <Sparkles className="mr-1 size-2.5" />
              {TOOLS.length} ابزار
            </Badge>
          </div>
        </header>

        {/* Tool content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={activeTool}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mx-auto max-w-5xl px-4 py-6 sm:px-6 xl:px-8">
              <ToolComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

    </div>
  );
}
