/**
 * Genova Virtual Lab — «آزمایشگاه مجازی ژنوا»
 * ─────────────────────────────────────────────────────────────────────────────
 * A section-based hub page for the virtual lab.
 * Each section contains tools, and each tool has its own view.
 * Students with access can run experiments, use bioinformatics tools,
 * calculators, and simulators.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Atom,
  ArrowRight,
  BarChart3,
  Beaker,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Database,
  Dna,
  FlaskConical,
  FileSearch,
  Gamepad2,
  GitCompare,
  Lock,
  Microscope,
  NotebookPen,
  Pipette,
  RotateCcw,
  SearchCode,
  Settings2,
  Shield,
  Sparkles,
  Syringe,
  TestTube2,
  Trash2,
  Trophy,
  Wrench,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
import { faNum, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_LABELS: Record<string, string> = {
  microbiology: "میکروب‌شناسی",
  biotechnology: "بیوتکنولوژی",
  molecular: "مولکولی",
  analytical: "تحلیلی",
};

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "مقدماتی",
  2: "میانی",
  3: "پیشرفته",
};

const CATEGORY_ICONS: Record<string, typeof Beaker> = {
  microbiology: Microscope,
  biotechnology: FlaskConical,
  molecular: Atom,
  analytical: Beaker,
};

// ── Tool types ──────────────────────────────────────────────────────────────

type ToolId =
  | "dna-analysis"
  | "rna-analysis"
  | "protein-analysis"
  | "gc-window"
  | "pattern-search"
  | "nucleotide-counter"
  | "calculators"
  | "experiments"
  | "notebook";

type SectionId =
  | "sequence-analysis"
  | "calculators-sim"
  | "experiments"
  | "primer-tools"
  | "restriction-enzymes"
  | "orf-translation"
  | "alignment"
  | "format-conversion"
  | "pcr-simulation"
  | "general-tools"
  | "specialized-tools"
  | "bio-dataset"
  | "notebook";

interface ToolDef {
  id: ToolId;
  title: string;
  description: string;
  icon: typeof Dna;
  color: string;
  component?: React.ComponentType;
  badge?: string;
  locked?: boolean;
}

interface SectionDef {
  id: SectionId;
  title: string;
  description: string;
  icon: typeof Dna;
  color: string;
  tools: ToolDef[];
}

const SECTIONS: SectionDef[] = [
  {
    id: "sequence-analysis",
    title: "ابزارهای تحلیل توالی",
    description: "تحلیل DNA، RNA و پروتئین با محاسبات دقیق بیوانفورماتیکی",
    icon: Dna,
    color: "violet",
    tools: [
      { id: "dna-analysis", title: "تحلیل DNA", description: "شمارش نوکلئوتیدها، درصد GC، Reverse Complement و ترجمه پروتئین", icon: Dna, color: "violet", component: DnaAnalysisTool },
      { id: "rna-analysis", title: "تحلیل RNA", description: "شمارش، وزن مولکولی، cDNA معادل، ترجمه و ساختار ثانویه", icon: Dna, color: "violet", component: RnaAnalysisTool },
      { id: "protein-analysis", title: "تحلیل پروتئین", description: "ترکیب اسید آمینه، خواص فیزیکوشیمیایی و نمودارها", icon: Atom, color: "violet", component: ProteinAnalysisTool },
      { id: "gc-window", title: "محاسبه GC%", description: "درصد GC پنجره‌ای با قابلیت تنظیم اندازه پنجره", icon: BarChart3, color: "violet", component: GcWindowTool },
      { id: "pattern-search", title: "جستجوی الگو", description: "جستجوی الگو در توالی با حساسیت دلخواه", icon: SearchCode, color: "violet", component: PatternSearchTool },
      { id: "nucleotide-counter", title: "شمارش نوکلئوتیدها", description: "شمارش و نمودار توزیع نوکلئوتیدها و اسیدهای آمینه", icon: BarChart3, color: "violet", component: NucleotideCounterTool },
    ],
  },
  {
    id: "calculators-sim",
    title: "ابزارهای محاسباتی و شبیه‌سازها",
    description: "ماشین‌حساب‌های دقیق و شبیه‌سازهای تعاملی آزمایشگاهی",
    icon: Calculator,
    color: "emerald",
    tools: [
      { id: "calculators", title: "محاسبه‌گرها و شبیه‌سازها", description: "رقت، غلظت مولی، سری رقت، CFU، مستر‌میکس PCR، ژل و میکروسکوپ", icon: Calculator, color: "emerald", component: LabTools },
    ],
  },
  {
    id: "experiments",
    title: "پروتکل‌های آزمایش",
    description: "آزمایش‌های گام‌به‌گام با تصحیح خودکار و امتیازدهی",
    icon: FlaskConical,
    color: "amber",
    tools: [
      { id: "experiments", title: "پروتکل‌ها", description: "آزمایش‌های آماده با مراحل تعاملی و امتیازدهی", icon: FlaskConical, color: "amber", badge: "پروتکل آماده" },
    ],
  },
  {
    id: "primer-tools",
    title: "🧰 ابزارهای پرایمر",
    description: "طراحی، تحلیل و بهینه‌سازی پرایمر برای PCR",
    icon: Pipette,
    color: "cyan",
    tools: [
      { id: "dna-analysis" as ToolId, title: "طراحی پرایمر", description: "به‌زودی", icon: Pipette, color: "cyan", locked: true },
    ],
  },
  {
    id: "restriction-enzymes",
    title: "🧬 آنزیم‌های محدودکننده",
    description: "جستجوی سایت‌های برش و تحلیل نقشه آنزیمی",
    icon: Shield,
    color: "rose",
    tools: [
      { id: "dna-analysis" as ToolId, title: "نقشه آنزیمی", description: "به‌زودی", icon: Shield, color: "rose", locked: true },
    ],
  },
  {
    id: "orf-translation",
    title: "🔍 ORF و ترجمه",
    description: "پیدا کردن Open Reading Frames و ترجمه به پروتئین",
    icon: FileSearch,
    color: "indigo",
    tools: [
      { id: "dna-analysis" as ToolId, title: "جستجوی ORF", description: "به‌زودی", icon: FileSearch, color: "indigo", locked: true },
    ],
  },
  {
    id: "alignment",
    title: "🔄 همترازی توالی",
    description: "همترازی دو یا چند توالی (Pairwise & Multiple)",
    icon: GitCompare,
    color: "teal",
    tools: [
      { id: "dna-analysis" as ToolId, title: "همترازی", description: "به‌زودی", icon: GitCompare, color: "teal", locked: true },
    ],
  },
  {
    id: "format-conversion",
    title: "📄 تبدیل فرمت",
    description: "تبدیل بین فرمت‌های FASTA، GenBank، CSV و...",
    icon: FileSearch,
    color: "orange",
    tools: [
      { id: "dna-analysis" as ToolId, title: "تبدیل فرمت", description: "به‌زودی", icon: FileSearch, color: "orange", locked: true },
    ],
  },
  {
    id: "pcr-simulation",
    title: "🧪 شبیه‌سازی PCR",
    description: "شبیه‌سازی چرخه PCR با تنظیمات دمایی دلخواه",
    icon: TestTube2,
    color: "purple",
    tools: [
      { id: "dna-analysis" as ToolId, title: "شبیه‌ساز PCR", description: "به‌زودی", icon: TestTube2, color: "purple", locked: true },
    ],
  },
  {
    id: "general-tools",
    title: "⚙️ ابزارهای عمومی",
    description: "ابزارهای کاربردی روزمره بیوانفورماتیک",
    icon: Wrench,
    color: "slate",
    tools: [
      { id: "dna-analysis" as ToolId, title: "ابزارهای عمومی", description: "به‌زودی", icon: Wrench, color: "slate", locked: true },
    ],
  },
  {
    id: "specialized-tools",
    title: "🧬 ابزارهای تخصصی",
    description: "ابزارهای پیشرفته برای تحلیل‌های تخصصی‌تر",
    icon: Atom,
    color: "pink",
    tools: [
      { id: "dna-analysis" as ToolId, title: "ابزارهای تخصصی", description: "به‌زودی", icon: Atom, color: "pink", locked: true },
    ],
  },
  {
    id: "bio-dataset",
    title: "🗂️ دیتاست بیوانفورماتیک",
    description: "مدیریت فایل‌های FASTA، GenBank، CSV و...",
    icon: Database,
    color: "emerald",
    tools: [
      { id: "dna-analysis" as ToolId, title: "مدیریت دیتاست", description: "به‌زودی", icon: Database, color: "emerald", locked: true },
    ],
  },
];

const COLOR_MAP: Record<string, string> = {
  violet: "border-violet-500/30 bg-violet-500/5 hover:border-violet-400/60",
  emerald: "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-400/60",
  amber: "border-amber-500/30 bg-amber-500/5 hover:border-amber-400/60",
  cyan: "border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-400/60",
  rose: "border-rose-500/30 bg-rose-500/5 hover:border-rose-400/60",
  indigo: "border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-400/60",
  teal: "border-teal-500/30 bg-teal-500/5 hover:border-teal-400/60",
  orange: "border-orange-500/30 bg-orange-500/5 hover:border-orange-400/60",
  purple: "border-purple-500/30 bg-purple-500/5 hover:border-purple-400/60",
  slate: "border-slate-500/30 bg-slate-500/5 hover:border-slate-400/60",
  pink: "border-pink-500/30 bg-pink-500/5 hover:border-pink-400/60",
};

const ICON_COLOR_MAP: Record<string, string> = {
  violet: "text-violet-500",
  emerald: "text-emerald-500",
  amber: "text-amber-500",
  cyan: "text-cyan-500",
  rose: "text-rose-500",
  indigo: "text-indigo-500",
  teal: "text-teal-500",
  orange: "text-orange-500",
  purple: "text-purple-500",
  slate: "text-slate-500",
  pink: "text-pink-500",
};



// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

type View =
  | { type: "hub" }
  | { type: "tool"; toolId: ToolId; sectionId: SectionId };

export default function VirtualLab() {
  const { user, isAuthenticated } = useAuth();
  const experiments = useQuery(api.lab.listExperiments);
  const progress = useQuery(api.lab.listMyProgress, isAuthenticated ? {} : "skip");
  const summary = useQuery(api.lab.myLabSummary, isAuthenticated ? {} : "skip");

  const [view, setView] = useState<View>({ type: "hub" });
  const [filter, setFilter] = useState<string>("all");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const bySlug = useMemo(() => {
    const map = new Map<string, ProgressRow>();
    for (const row of (progress ?? []) as ProgressRow[]) map.set(row.experimentSlug, row);
    return map;
  }, [progress]);

  const visibleExperiments = (experiments ?? []).filter(
    (experiment) => filter === "all" || experiment.category === filter,
  );

  const activeExperiment = (experiments ?? []).find((experiment) => experiment.slug === activeSlug) ?? null;

  // ── Tool resolver ─────────────────────────────────────────────────────────

  const activeToolDef = view.type === "tool"
    ? SECTIONS.flatMap((s) => s.tools).find((t) => t.id === view.toolId && t.component)
    : null;
  const ActiveToolComponent = activeToolDef?.component;

  return (
    <PublicLayout>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-violet-500/20 bg-gradient-to-br from-violet-950 via-slate-950 to-slate-900">
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.35),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.25),transparent_40%)]" />
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {[...Array(14)].map((_, index) => (
            <motion.span
              key={index}
              className="absolute rounded-full bg-violet-300/40"
              style={{ left: `${6 + index * 6.6}%`, top: `${20 + (index % 5) * 14}%` }}
              animate={{ y: [0, -18, 0], opacity: [0.25, 0.7, 0.25] }}
              transition={{ duration: 6 + (index % 4), repeat: Infinity, delay: index * 0.25 }}
            >
              <span className="block size-1.5" />
            </motion.span>
          ))}
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <Badge className="mb-4 rounded-full border-violet-400/40 bg-violet-500/15 text-violet-200">
              <FlaskConical className="mr-1 size-3.5" />
              Genova Virtual Lab
            </Badge>
            <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">
              آزمایشگاه مجازی ژنوا
            </h1>
            <p className="mt-4 text-sm leading-7 text-violet-100/85 sm:text-base">
              هر کاری که در آزمایشگاه واقعی انجام می‌دهی، اینجا هم می‌توانی تمرین کنی: ابزارهای
              بیوانفورماتیک، پروتکل‌های گام‌به‌گام با تصحیح خودکار، ماشین‌حساب‌های دقیق،
              شبیه‌سازها و دفتر آزمایشگاه آنلاین.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                asChild
                className="bg-violet-600 hover:bg-violet-700"
                onClick={() => setView({ type: "hub" })}
              >
                <a href="#sections">
                  <Beaker className="mr-1.5 size-4" />
                  مشاهده ابزارها
                </a>
              </Button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "پروتکل آماده", value: faNum(experiments?.length ?? 0) },
                { label: "امتیاز آزمایشگاهی", value: faNum(summary?.points ?? 0) },
                { label: "آزمایش تکمیل‌شده", value: faNum(summary?.completed ?? 0) },
                { label: "ابزار بیوانفورماتیک", value: "۶" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-violet-400/25 bg-white/5 px-3 py-3 backdrop-blur"
                >
                  <p className="text-xl font-black text-white">{stat.value}</p>
                  <p className="mt-0.5 text-[11px] text-violet-200/80">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Tool View (inline) ─────────────────────────────────────────────── */}
      {view.type === "tool" && ActiveToolComponent ? (
        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 gap-1 text-muted-foreground"
            onClick={() => setView({ type: "hub" })}
          >
            <ArrowRight className="size-4" />
            بازگشت به آزمایشگاه
          </Button>
          <ActiveToolComponent />
        </section>
      ) : null}

      {/* ── Experiment Runner (inline) ─────────────────────────────────────── */}
      {view.type === "hub" && activeExperiment ? (
        <section className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
          <ExperimentRunner
            experiment={activeExperiment}
            progress={bySlug.get(activeExperiment.slug) as ProgressRow | undefined}
            isAuthenticated={isAuthenticated}
            onBack={() => setActiveSlug(null)}
          />
        </section>
      ) : null}

      {/* ── Hub Sections ──────────────────────────────────────────────────── */}
      {view.type === "hub" && !activeExperiment ? (
        <section id="sections" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="space-y-10">
            {SECTIONS.map((section) => {
              const SectionIcon = section.icon;
              const isExperimentSection = section.id === "experiments";
              const isCalcSection = section.id === "calculators-sim";
              const isLocked = section.tools.some((t) => t.locked);

              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                >
                  {/* Section header */}
                  <div className="mb-4 flex items-center gap-3">
                    <span className={cn("flex size-9 items-center justify-center rounded-xl bg-muted/60", ICON_COLOR_MAP[section.color])}>
                      <SectionIcon className="size-5" />
                    </span>
                    <div>
                      <h2 className="text-base font-black">{section.title}</h2>
                      <p className="text-[11px] text-muted-foreground">{section.description}</p>
                    </div>
                    {isLocked && (
                      <Badge variant="outline" className="mr-auto rounded-full text-[10px]">
                        <Lock className="mr-1 size-3" />
                        به‌زودی
                      </Badge>
                    )}
                  </div>

                  {/* Tool cards or experiment list */}
                  {isExperimentSection ? (
                    <ExperimentSection
                      experiments={visibleExperiments}
                      bySlug={bySlug}
                      filter={filter}
                      setFilter={setFilter}
                      onSelect={(slug) => setActiveSlug(slug)}
                      isAuthenticated={isAuthenticated}
                    />
                  ) : isCalcSection ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {section.tools.map((tool) => {
                        const ToolIcon = tool.icon;
                        return (
                          <Card
                            key={tool.id}
                            className={cn(
                              "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg",
                              COLOR_MAP[tool.color],
                            )}
                            onClick={() => !tool.locked && tool.component && setView({ type: "tool", toolId: tool.id, sectionId: section.id })}
                          >
                            <CardContent className="flex items-center gap-4 p-5">
                              <span className={cn("flex size-10 items-center justify-center rounded-xl bg-background/60", ICON_COLOR_MAP[tool.color])}>
                                <ToolIcon className="size-5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-bold">{tool.title}</h3>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">{tool.description}</p>
                              </div>
                              {tool.locked ? (
                                <Lock className="size-4 text-muted-foreground" />
                              ) : (
                                <ArrowRight className="size-4 text-muted-foreground" />
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {section.tools.map((tool) => {
                        const ToolIcon = tool.icon;
                        return (
                          <Card
                            key={`${section.id}-${tool.id}`}
                            className={cn(
                              "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg",
                              tool.locked ? "border-dashed border-border opacity-60" : COLOR_MAP[tool.color],
                            )}
                            onClick={() => !tool.locked && tool.component && setView({ type: "tool", toolId: tool.id, sectionId: section.id })}
                          >
                            <CardContent className="flex items-center gap-3 p-4">
                              <span className={cn("flex size-9 items-center justify-center rounded-xl bg-background/60", ICON_COLOR_MAP[tool.color])}>
                                <ToolIcon className="size-4.5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-xs font-bold">{tool.title}</h3>
                                <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{tool.description}</p>
                              </div>
                              {tool.locked ? (
                                <Lock className="size-3.5 text-muted-foreground" />
                              ) : (
                                <ArrowRight className="size-3.5 text-muted-foreground" />
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>
      ) : null}
    </PublicLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPERIMENT SECTION
// ═══════════════════════════════════════════════════════════════════════════════

type Experiment = {
  slug: string;
  title: string;
  category: string;
  difficulty: number;
  durationMin: number;
  summary: string;
  equipment: string[];
  stepCount: number;
  totalPoints: number;
  steps: {
    title: string;
    detail: string;
    check?: { question: string; options: string[] };
  }[];
};

type ProgressRow = {
  experimentSlug: string;
  status: string;
  stepsDone: number[];
  score?: number;
};

function ExperimentSection({
  experiments,
  bySlug,
  filter,
  setFilter,
  onSelect,
  isAuthenticated,
}: {
  experiments: Experiment[];
  bySlug: Map<string, ProgressRow>;
  filter: string;
  setFilter: (f: string) => void;
  onSelect: (slug: string) => void;
  isAuthenticated: boolean;
}) {
  return (
    <div className="space-y-4">
      {!isAuthenticated && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>برای ثبت پیشرفت و امتیاز لازم است وارد حساب ژنوا شوی.</span>
            <Button asChild size="sm" className="bg-violet-600 hover:bg-violet-700">
              <Link to="/auth?returnTo=/lab">ورود به حساب</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "همه" },
          ...Object.entries(CATEGORY_LABELS).map(([id, label]) => ({ id, label })),
        ].map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={filter === item.id ? "default" : "outline"}
            onClick={() => setFilter(item.id)}
            className={cn(filter === item.id && "bg-violet-600 hover:bg-violet-700")}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {experiments.map((experiment, index) => {
          const Icon = CATEGORY_ICONS[experiment.category] ?? Beaker;
          const row = bySlug.get(experiment.slug);
          const done = row?.stepsDone.length ?? 0;
          const percent = Math.round((done / experiment.stepCount) * 100);
          return (
            <motion.div
              key={experiment.slug}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.04 }}
            >
              <Card
                className="h-full cursor-pointer transition-all hover:-translate-y-0.5 hover:border-amber-400/60 hover:shadow-lg"
                onClick={() => onSelect(experiment.slug)}
              >
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold leading-6">{experiment.title}</h3>
                        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{experiment.summary}</p>
                      </div>
                    </div>
                    {row?.status === "completed" ? (
                      <Badge className="shrink-0 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="mr-1 size-3" />
                        تمام
                      </Badge>
                    ) : done > 0 ? (
                      <Badge variant="secondary" className="shrink-0 rounded-full text-[10px]">{faNum(percent)}٪</Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="rounded-full">{CATEGORY_LABELS[experiment.category]}</Badge>
                    <Badge variant="outline" className="rounded-full">{DIFFICULTY_LABELS[experiment.difficulty]}</Badge>
                    <span>{faNum(experiment.durationMin)} دقیقه</span>
                    <span>·</span>
                    <span>{faNum(experiment.stepCount)} مرحله</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Trophy className="size-3" />
                      {faNum(experiment.totalPoints)} امتیاز
                    </span>
                  </div>

                  {done > 0 ? <Progress value={percent} className="h-1.5" /> : null}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPERIMENT RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

function ExperimentRunner({
  experiment,
  progress,
  isAuthenticated,
  onBack,
}: {
  experiment: Experiment;
  progress?: ProgressRow;
  isAuthenticated: boolean;
  onBack: () => void;
}) {
  const startExperiment = useMutation(api.lab.startExperiment);
  const recordStep = useMutation(api.lab.recordStep);
  const resetExperiment = useMutation(api.lab.resetExperiment);

  const [choice, setChoice] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const done = progress?.stepsDone ?? [];
  const nextIndex = done.length;
  const finished = progress?.status === "completed";
  const step = experiment.steps[nextIndex];

  const submit = async () => {
    if (!isAuthenticated) {
      toast.error("برای ثبت مرحله ابتدا وارد حساب شوید.");
      return;
    }
    if (!step) return;
    if (step.check && choice === null) {
      toast.error("پاسخ این مرحله را انتخاب کن.");
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      if (done.length === 0) await startExperiment({ slug: experiment.slug });
      const result = (await recordStep({
        slug: experiment.slug,
        stepIndex: nextIndex,
        choice: choice ?? undefined,
      })) as {
        ok: boolean;
        correct: boolean;
        expected: number | null;
        earned?: number;
        finished?: boolean;
      };

      if (!result.correct) {
        setFeedback({
          ok: false,
          message: `پاسخ درست نبود. گزینه صحیح: ${faNum((result.expected ?? 0) + 1)} — دوباره تلاش کن.`,
        });
        setChoice(null);
      } else {
        setFeedback({
          ok: true,
          message: result.finished
            ? `آزمایش کامل شد! ${faNum(result.earned ?? 0)} امتیاز گرفتی 🎉`
            : `مرحله ثبت شد (+${faNum(result.earned ?? 0)} امتیاز)`,
        });
        setChoice(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در ثبت مرحله");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-amber-500/30">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowRight className="size-4" />
            </Button>
            <div>
              <h3 className="text-base font-bold">{experiment.title}</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                تجهیزات: {experiment.equipment.join(" · ")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full text-[10px]">
              {faNum(done.length)} از {faNum(experiment.stepCount)} مرحله
            </Badge>
            {done.length > 0 && isAuthenticated ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await resetExperiment({ slug: experiment.slug });
                  setFeedback(null);
                  setChoice(null);
                }}
              >
                <RotateCcw className="mr-1 size-3.5" />
                شروع از اول
              </Button>
            ) : null}
          </div>
        </div>

        <Progress value={(done.length / experiment.stepCount) * 100} className="h-1.5" />

        <ol className="space-y-2">
          {experiment.steps.map((item, index) => {
            const isDone = done.includes(index);
            const isCurrent = index === nextIndex && !finished;
            return (
              <li
                key={item.title}
                className={cn(
                  "rounded-2xl border px-4 py-3",
                  isDone ? "border-emerald-500/30 bg-emerald-500/5"
                    : isCurrent ? "border-amber-500/50 bg-amber-500/5"
                    : "border-border opacity-70",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      isDone ? "bg-emerald-500 text-white"
                        : isCurrent ? "bg-amber-500 text-white"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isDone ? "✓" : faNum(index + 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold">{item.title}</p>
                    <p className="mt-1 text-[11px] leading-6 text-muted-foreground">{item.detail}</p>

                    {isCurrent && item.check ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          {item.check.question}
                        </p>
                        {item.check.options.map((option, optionIndex) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setChoice(optionIndex)}
                            className={cn(
                              "flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-right text-[11px] leading-5 transition-colors",
                              choice === optionIndex ? "border-amber-500 bg-amber-500/10" : "hover:bg-muted/50",
                            )}
                          >
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold">
                              {faNum(optionIndex + 1)}
                            </span>
                            <span className="flex-1">{option}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {isCurrent ? (
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={busy}
                          className="bg-amber-600 hover:bg-amber-700"
                          onClick={submit}
                        >
                          {busy ? "در حال ثبت…" : "ثبت مرحله"}
                        </Button>
                        {!isAuthenticated && (
                          <span className="text-[11px] text-muted-foreground">
                            برای ثبت، ابتدا وارد حساب شو.
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {finished && (
          <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300">
            این پروتکل را با موفقیت به پایان رساندی — {faNum(progress?.score ?? 0)} امتیاز ثبت شده است.
          </div>
        )}

        {feedback && (
          <div
            className={cn(
              "rounded-2xl px-4 py-3 text-xs",
              feedback.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
            )}
          >
            {feedback.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
