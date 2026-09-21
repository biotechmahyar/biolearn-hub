/**
 * Genova Virtual Lab — Premium Bioinformatics Platform
 * ─────────────────────────────────────────────────────────────────────────────
 * A standalone full-screen application with premium SaaS-quality design.
 * Sophisticated visual identity, not generic dark theme.
 */
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Atom,
  BarChart3,
  Calculator,
  ChevronLeft,
  Dna,
  FlaskConical,
  FileSearch,
  GitCompare,
  Home,
  Lock,
  Pipette,
  SearchCode,
  Shield,
  Sparkles,
  TestTube2,
  Thermometer,
  Wrench,
  Zap,
  Database,
  Menu,
  X,
  ArrowDownAZ,
  Beaker,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  | "multiplex" | "realtime";

interface ToolDef {
  id: ToolId;
  title: string;
  titleEn: string;
  description: string;
  icon: typeof Dna;
  component: React.ComponentType;
  group: "sequence" | "calc" | "primer";
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
];

const FUTURE_TOOLS = [
  { title: "آنزیم‌های محدودکننده", icon: Shield, color: "#f43f5e" },
  { title: "ORF و ترجمه", icon: FileSearch, color: "#818cf8" },
  { title: "همترازی توالی", icon: GitCompare, color: "#2dd4bf" },
  { title: "تبدیل فرمت", icon: FileSearch, color: "#fb923c" },
  { title: "شبیه‌سازی PCR", icon: TestTube2, color: "#a78bfa" },
  { title: "ابزارهای عمومی", icon: Wrench, color: "#94a3b8" },
  { title: "ابزارهای تخصصی", icon: Atom, color: "#f472b6" },
  { title: "دیتاست بیوانفورماتیک", icon: Database, color: "#34d399" },
];

const GROUPS = [
  { id: "sequence" as const, label: "تحلیل توالی", accent: "from-indigo-500 to-violet-500" },
  { id: "calc" as const, label: "ابزارها و شبیه‌سازها", accent: "from-emerald-500 to-teal-500" },
  { id: "primer" as const, label: "ابزارهای پرایمر", accent: "from-cyan-500 to-blue-500" },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function VirtualLab() {
  const [activeTool, setActiveTool] = useState<ToolId>("dna-analysis");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState<"home" | "tools" | "primer">("tools");

  const currentTool = TOOLS.find((t) => t.id === activeTool) ?? TOOLS[0];
  const ToolComponent = currentTool.component;
  const currentGroup = GROUPS.find((g) => g.id === currentTool.group);

  const selectTool = useCallback((id: ToolId) => {
    setActiveTool(id);
    setSidebarOpen(false);
    setMobileNav("tools");
  }, []);

  return (
    <div className="lab-app flex h-screen overflow-hidden bg-[#060b18] text-white">
      {/* ── Ambient background ──────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-600/[0.07] blur-[150px]" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-cyan-600/[0.05] blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/[0.04] blur-[100px]" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* ── Sidebar (desktop) ───────────────────────────────────────────── */}
      <aside className={cn(
        "relative z-30 flex w-[280px] flex-col border-l border-white/[0.04] transition-transform duration-300 ease-out",
        "bg-[#0a1020]/80 backdrop-blur-2xl",
        "fixed inset-y-0 right-0 xl:relative xl:translate-x-0",
        sidebarOpen ? "translate-x-0" : "translate-x-full",
      )}>
        {/* Logo */}
        <div className="relative px-5 py-5 border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="relative flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
              <FlaskConical className="size-5 text-white" />
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
            </div>
            <div>
              <h1 className="text-[13px] font-extrabold tracking-tight text-white">آزمایشگاه مجازی</h1>
              <p className="text-[10px] font-medium text-white/30 tracking-wide">GENOVA VIRTUAL LAB</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)}
            className="absolute top-4 left-4 rounded-xl p-1.5 text-white/30 hover:bg-white/5 hover:text-white/60 xl:hidden transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          {GROUPS.map((group) => {
            const groupTools = TOOLS.filter((t) => t.group === group.id);
            return (
              <div key={group.id} className="mb-5">
                <div className="px-5 mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/20">{group.label}</p>
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
                            ? "bg-white/[0.06] text-white"
                            : "text-white/35 hover:bg-white/[0.03] hover:text-white/60",
                        )}>
                        {isActive && (
                          <motion.div layoutId="sidebar-active"
                            className={cn("absolute inset-0 rounded-xl bg-gradient-to-l opacity-100", group.accent)}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }} />
                        )}
                        <span className={cn(
                          "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                          isActive ? "bg-white/10 text-white" : "bg-white/[0.03] text-white/25 group-hover:text-white/40",
                        )}>
                          <Icon className="size-4" />
                        </span>
                        <div className="relative z-10 min-w-0 flex-1">
                          <p className={cn("text-[12px] font-semibold leading-tight", isActive ? "text-white" : "")}>{tool.title}</p>
                          <p className="mt-0.5 text-[9px] font-medium text-white/20 uppercase tracking-wider">{tool.titleEn}</p>
                        </div>
                        {isActive && <span className="relative z-10 size-1.5 rounded-full bg-white/60" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Coming Soon */}
          <div className="px-5 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/15">به‌زودی</p>
          </div>
          <div className="space-y-0.5 px-3">
            {FUTURE_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <div key={tool.title} className="flex items-center gap-3 rounded-xl px-3 py-2 opacity-25">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.02]">
                    <Icon className="size-4" style={{ color: tool.color }} />
                  </span>
                  <p className="text-[11px] font-medium text-white/50">{tool.title}</p>
                  <Lock className="mr-auto size-3 text-white/15" />
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-white/[0.04] p-3">
          <Link to="/"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[11px] font-medium text-white/25 transition-all hover:bg-white/[0.03] hover:text-white/50">
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
        <header className="flex items-center gap-3 border-b border-white/[0.04] bg-[#060b18]/60 px-4 py-3 backdrop-blur-xl xl:px-6">
          <button onClick={() => setSidebarOpen(true)}
            className="rounded-xl p-2 text-white/30 hover:bg-white/5 hover:text-white/60 xl:hidden transition-colors">
            <Menu className="size-5" />
          </button>

          <div className="flex items-center gap-2 text-[11px] text-white/25">
            <FlaskConical className="size-3" />
            <span className="font-medium">آزمایشگاه</span>
            <ChevronLeft className="size-3 text-white/15" />
            <span className="font-semibold text-white/60">{currentTool.title}</span>
          </div>

          <div className="mr-auto flex items-center gap-2">
            <Badge variant="outline" className="rounded-full border-white/[0.06] bg-white/[0.02] text-[9px] font-medium text-white/30">
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

      {/* ── Mobile bottom nav ───────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.06] bg-[#0a1020]/95 backdrop-blur-2xl xl:hidden safe-area-bottom">
        <div className="flex items-stretch">
          {[
            { id: "home" as const, icon: Home, label: "خانه", action: () => { selectTool("dna-analysis"); } },
            { id: "tools" as const, icon: Beaker, label: "تحلیل", action: () => { selectTool("dna-analysis"); } },
            { id: "primer" as const, icon: Pipette, label: "پرایمر", action: () => { selectTool("primer-design"); } },
          ].map((item) => {
            const Icon = item.icon;
            const active = mobileNav === item.id || (item.id === "tools" && currentTool.group === "sequence") || (item.id === "primer" && currentTool.group === "primer");
            return (
              <button key={item.id} onClick={item.action}
                className={cn("flex flex-1 flex-col items-center gap-1 py-3 transition-colors",
                  active ? "text-white" : "text-white/25")}>
                <Icon className="size-5" />
                <span className="text-[9px] font-bold">{item.label}</span>
                {active && <span className="size-1 rounded-full bg-white/60 -mt-0.5" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
