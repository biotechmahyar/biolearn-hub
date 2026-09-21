/**
 * Genova Virtual Lab — Standalone Bioinformatics Platform
 * ─────────────────────────────────────────────────────────────────────────────
 * A full-screen standalone application with its own design system.
 * Separate from the main Genova site layout — like Admin or Instructor Studio.
 */
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Atom,
  BarChart3,
  Beaker,
  Calculator,
  ChevronLeft,
  Dna,
  ExternalLink,
  FlaskConical,
  FileSearch,
  GitCompare,
  Home,
  Lock,
  Microscope,
  Pipette,
  SearchCode,
  Settings2,
  Shield,
  Sparkles,
  TestTube2,
  Wrench,
  Database,
  Menu,
  X,
  ArrowDownAZ,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LabTools } from "@/components/lab/LabTools";
import {
  DnaAnalysisTool,
  RnaAnalysisTool,
  ProteinAnalysisTool,
  GcWindowTool,
  PatternSearchTool,
  NucleotideCounterTool,
} from "@/components/lab/BioAnalysisTools";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
//  TOOL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

type ToolId =
  | "dna-analysis"
  | "rna-analysis"
  | "protein-analysis"
  | "gc-window"
  | "pattern-search"
  | "nucleotide-counter"
  | "calculators";

interface ToolDef {
  id: ToolId;
  title: string;
  titleEn: string;
  description: string;
  icon: typeof Dna;
  component: React.ComponentType;
  group: "sequence" | "calc";
}

const TOOLS: ToolDef[] = [
  { id: "dna-analysis", title: "تحلیل DNA", titleEn: "DNA Analysis", description: "شمارش نوکلئوتیدها، درصد GC، Reverse Complement و ترجمه پروتئین", icon: Dna, component: DnaAnalysisTool, group: "sequence" },
  { id: "rna-analysis", title: "تحلیل RNA", titleEn: "RNA Analysis", description: "شمارش، وزن مولکولی، cDNA، ترجمه و ساختار ثانویه", icon: Dna, component: RnaAnalysisTool, group: "sequence" },
  { id: "protein-analysis", title: "تحلیل پروتئین", titleEn: "Protein Analysis", description: "ترکیب اسید آمینه، خواص فیزیکوشیمیایی و نمودارها", icon: Atom, component: ProteinAnalysisTool, group: "sequence" },
  { id: "gc-window", title: "محاسبه GC%", titleEn: "GC% Window", description: "درصد GC پنجره‌ای با تنظیم اندازه پنجره", icon: BarChart3, component: GcWindowTool, group: "sequence" },
  { id: "pattern-search", title: "جستجوی الگو", titleEn: "Pattern Search", description: "جستجوی الگو در توالی با حساسیت دلخواه", icon: SearchCode, component: PatternSearchTool, group: "sequence" },
  { id: "nucleotide-counter", title: "شمارش نوکلئوتیدها", titleEn: "Nucleotide Counter", description: "شمارش و نمودار توزیع نوکلئوتیدها", icon: ArrowDownAZ, component: NucleotideCounterTool, group: "sequence" },
  { id: "calculators", title: "محاسبه‌گرها", titleEn: "Calculators", description: "رقت، غلظت مولی، CFU، مستر‌میکس PCR و شبیه‌سازها", icon: Calculator, component: LabTools, group: "calc" },
];

const FUTURE_TOOLS = [
  { title: "ابزارهای پرایمر", icon: Pipette, color: "text-cyan-400" },
  { title: "آنزیم‌های محدودکننده", icon: Shield, color: "text-rose-400" },
  { title: "ORF و ترجمه", icon: FileSearch, color: "text-indigo-400" },
  { title: "همترازی توالی", icon: GitCompare, color: "text-teal-400" },
  { title: "تبدیل فرمت", icon: FileSearch, color: "text-orange-400" },
  { title: "شبیه‌سازی PCR", icon: TestTube2, color: "text-purple-400" },
  { title: "ابزارهای عمومی", icon: Wrench, color: "text-slate-400" },
  { title: "ابزارهای تخصصی", icon: Atom, color: "text-pink-400" },
  { title: "دیتاست بیوانفورماتیک", icon: Database, color: "text-emerald-400" },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function VirtualLab() {
  const { isAuthenticated } = useAuth();
  const [activeTool, setActiveTool] = useState<ToolId>("dna-analysis");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentTool = TOOLS.find((t) => t.id === activeTool) ?? TOOLS[0];
  const ToolComponent = currentTool.component;

  const selectTool = useCallback((id: ToolId) => {
    setActiveTool(id);
    setSidebarOpen(false);
  }, []);

  return (
    <div className="lab-dark flex h-screen overflow-hidden bg-[#0a0a1a]">
      {/* ── Ambient background effects ──────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-violet-600/8 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-purple-600/6 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-600/5 blur-[80px]" />
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "relative z-30 flex w-72 flex-col border-l border-violet-500/10 bg-[#0d0d20]/95 backdrop-blur-xl transition-transform duration-300",
          "fixed inset-y-0 right-0 lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center gap-3 border-b border-violet-500/10 px-4 py-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 shadow-lg shadow-violet-500/20">
            <FlaskConical className="size-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-black text-white">آزمایشگاه مجازی</h1>
            <p className="text-[10px] text-violet-300/60">Genova Virtual Lab</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 text-violet-300/60 hover:bg-violet-500/10 lg:hidden">
            <X className="size-4" />
          </button>
        </div>

        {/* Sidebar nav */}
        <ScrollArea className="flex-1 py-3">
          {/* Sequence Analysis Group */}
          <div className="px-3 mb-1">
            <p className="px-2 text-[9px] font-bold uppercase tracking-widest text-violet-400/50">
              تحلیل توالی
            </p>
          </div>
          {TOOLS.filter((t) => t.group === "sequence").map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => selectTool(tool.id)}
                className={cn(
                  "mx-2 mb-0.5 flex w-[calc(100%-16px)] items-center gap-3 rounded-xl px-3 py-2.5 text-right transition-all",
                  isActive
                    ? "bg-gradient-to-l from-violet-600/20 to-purple-600/10 text-white shadow-sm shadow-violet-500/10"
                    : "text-violet-200/50 hover:bg-violet-500/5 hover:text-violet-200/80",
                )}
              >
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", isActive ? "bg-violet-600/30 text-violet-300" : "bg-violet-500/5 text-violet-400/40")}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-tight">{tool.title}</p>
                  <p className="mt-0.5 text-[10px] text-violet-300/40 truncate">{tool.titleEn}</p>
                </div>
                {isActive && <span className="size-1.5 rounded-full bg-violet-400" />}
              </button>
            );
          })}

          {/* Calculators Group */}
          <div className="px-3 mt-4 mb-1">
            <p className="px-2 text-[9px] font-bold uppercase tracking-widest text-violet-400/50">
              ابزارها و شبیه‌سازها
            </p>
          </div>
          {TOOLS.filter((t) => t.group === "calc").map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => selectTool(tool.id)}
                className={cn(
                  "mx-2 mb-0.5 flex w-[calc(100%-16px)] items-center gap-3 rounded-xl px-3 py-2.5 text-right transition-all",
                  isActive
                    ? "bg-gradient-to-l from-emerald-600/20 to-teal-600/10 text-white shadow-sm shadow-emerald-500/10"
                    : "text-violet-200/50 hover:bg-violet-500/5 hover:text-violet-200/80",
                )}
              >
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", isActive ? "bg-emerald-600/30 text-emerald-300" : "bg-violet-500/5 text-violet-400/40")}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold leading-tight">{tool.title}</p>
                  <p className="mt-0.5 text-[10px] text-violet-300/40 truncate">{tool.titleEn}</p>
                </div>
                {isActive && <span className="size-1.5 rounded-full bg-emerald-400" />}
              </button>
            );
          })}

          {/* Future Tools */}
          <div className="px-3 mt-4 mb-1">
            <p className="px-2 text-[9px] font-bold uppercase tracking-widest text-violet-400/50">
              به‌زودی
            </p>
          </div>
          {FUTURE_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <div key={tool.title} className="mx-2 mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2 text-right opacity-40">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/5">
                  <Icon className={cn("size-4", tool.color)} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold leading-tight text-violet-200/60">{tool.title}</p>
                </div>
                <Lock className="size-3 text-violet-400/30" />
              </div>
            );
          })}
        </ScrollArea>

        {/* Sidebar footer */}
        <div className="border-t border-violet-500/10 p-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] text-violet-300/50 transition-colors hover:bg-violet-500/5 hover:text-violet-200/80"
          >
            <Home className="size-3.5" />
            بازگشت به سایت اصلی
          </Link>
        </div>
      </aside>

      {/* ── Mobile overlay ────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-violet-500/10 bg-[#0a0a1a]/80 px-4 py-3 backdrop-blur-xl">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-violet-300/60 hover:bg-violet-500/10 lg:hidden">
            <Menu className="size-5" />
          </button>

          <div className="flex items-center gap-2 text-[11px] text-violet-300/40">
            <FlaskConical className="size-3.5" />
            <span>آزمایشگاه مجازی</span>
            <ChevronLeft className="size-3" />
            <span className="text-violet-200/80">{currentTool.title}</span>
          </div>

          <div className="mr-auto flex items-center gap-2">
            <Badge variant="outline" className="rounded-full border-violet-500/20 text-[9px] text-violet-300/60">
              <Sparkles className="mr-1 size-2.5" />
              {TOOLS.length} ابزار فعال
            </Badge>
          </div>
        </header>

        {/* Tool content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTool}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8"
            >
              <ToolComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
