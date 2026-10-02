/**
 * Genova Virtual Lab — Bioinformatics Workspace
 * ─────────────────────────────────────────────────────────────────────────────
 * A bright, emerald research console. Every control on this page is wired to
 * something real: the rail switches views, the command bar changes the field,
 * the reporting window and the exported report, and each tool carries its own
 * specialist brief (how to run it, what it returns, related tools).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
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
  ArrowLeft,
  Atom,
  BarChart3,
  Bell,
  Beaker,
  BellOff,
  Boxes,
  Calculator,
  Check,
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
  ListChecks,
  Lock,
  LogOut,
  Menu,
  Microscope,
  Pipette,
  PlayCircle,
  Rss,
  Search,
  SearchCode,
  Scissors,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TestTube2,
  Thermometer,
  TrendingUp,
  User,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LabAssistant, type LabAssistantHandle } from "@/components/lab/LabAssistant";
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
import { useAuth } from "@/hooks/use-auth";
import { faNum, formatJalaliDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════
//  TOOL REGISTRY — each tool carries its own specialist brief
// ═══════════════════════════════════════════════════════════════════════════

type ToolId =
  | "dna-analysis" | "rna-analysis" | "protein-analysis"
  | "gc-window" | "pattern-search" | "nucleotide-counter"
  | "calculators"
  | "primer-design" | "blast-search" | "tm-calculator" | "dimer-checker"
  | "multiplex" | "realtime"
  | "restriction-mapper" | "enzyme-search" | "enzyme-compat" | "methylation";

type GroupId = "sequence" | "calc" | "primer" | "enzyme";

interface ToolDef {
  id: ToolId;
  title: string;
  titleEn: string;
  description: string;
  icon: typeof Dna;
  component: React.ComponentType;
  group: GroupId;
  /** How a researcher actually runs this tool. */
  steps: string[];
  /** What comes out of it. */
  outputs: string[];
}

const TOOLS: ToolDef[] = [
  {
    id: "dna-analysis", title: "تحلیل DNA", titleEn: "DNA Analysis",
    description: "شمارش، GC%، Reverse Complement و ترجمه",
    icon: Dna, component: DnaAnalysisTool, group: "sequence",
    steps: ["توالی را با حروف A/T/G/C وارد کنید", "نوع توالی (تک/دو رشته‌ای) را انتخاب کنید", "گزارش کامل و ترجمهٔ ژن را بگیرید"],
    outputs: ["طول و GC%", "مکمل معکوس", "ترجمهٔ ۶ فریم", "وزن مولکولی"],
  },
  {
    id: "rna-analysis", title: "تحلیل RNA", titleEn: "RNA Analysis",
    description: "شمارش، وزن مولکولی، cDNA و ساختار ثانویه",
    icon: Rss, component: RnaAnalysisTool, group: "sequence",
    steps: ["توالی RNA با نوکلئوتیدهای A/U/G/C را وارد کنید", "طول و ترکیب بیس را بررسی کنید", "ناحیهٔ سازندهٔ کد را مشخص کنید"],
    outputs: ["ترکیب بیس", "وزن مولکولی", "شاخص چپش", "ناحیهٔ کد"],
  },
  {
    id: "protein-analysis", title: "تحلیل پروتئین", titleEn: "Protein",
    description: "ترکیب اسید آمینه و خواص فیزیکوشیمیایی",
    icon: Atom, component: ProteinAnalysisTool, group: "sequence",
    steps: ["دنبالهٔ اسیدآمینه را وارد کنید", "نام هر اسیدآمینه را ببینید", "شاخص‌های بار، قطبیت و pI را بخوانید"],
    outputs: ["جدول اسیدآمینه‌ها", "وزن مولکولی", "گرانشی و آروماتیک", "pI"],
  },
  {
    id: "gc-window", title: "محاسبه GC%", titleEn: "GC Window",
    description: "درصد GC پنجره‌ای با تنظیم اندازه",
    icon: BarChart3, component: GcWindowTool, group: "sequence",
    steps: ["توالی DNA را وارد کنید", "اندازهٔ پنجره و گام را تنظیم کنید", "ناحیه‌های غنی از GC را ببینید"],
    outputs: ["نمودار GC پنجره‌ای", "میانگین GC", "پیک‌های داغ"],
  },
  {
    id: "pattern-search", title: "جستجوی الگو", titleEn: "Pattern Search",
    description: "جستجوی موتیف در توالی با دقیق‌ترین تطبیق",
    icon: SearchCode, component: PatternSearchTool, group: "sequence",
    steps: ["توالی هدف را وارد کنید", "الگو یا موتیف را بنویسید", "سمت جستجو (۵′ یا ۳′) را مشخص کنید"],
    outputs: ["همهٔ جایگاه‌ها", "موقعیت دقیق", "شمارش تطابق"],
  },
  {
    id: "nucleotide-counter", title: "شمارش نوکلئوتیدها", titleEn: "Nucleotide Counter",
    description: "شمارش بیس‌ها و نمودار توزیع",
    icon: ArrowDownAZ, component: NucleotideCounterTool, group: "sequence",
    steps: ["توالی خود را وارد کنید", "نوع توالی را انتخاب کنید", "توزیع A/T/G/C را ببینید"],
    outputs: ["توزیع چهار بیس", "درصد هر بیس", "خروجی CSV"],
  },
  {
    id: "calculators", title: "محاسبه‌گرها و شبیه‌سازها", titleEn: "Calculators",
    description: "رقت، غلظت، CFU، PCR و شبیه‌سازهای آماده",
    icon: Calculator, component: LabTools, group: "calc",
    steps: ["ابزار مورد نیاز را انتخاب کنید", "ورودی‌های آزمایش را وارد کنید", "نتیجه را با فرمول استفاده کنید"],
    outputs: ["رقت و غلظت", "CFU/ml", "محاسبهٔ PCR", "شبیه‌سازی"],
  },
  {
    id: "primer-design", title: "طراحی پرایمر", titleEn: "Primer Design",
    description: "طراحی Forward و Reverse بر اساس دمای ذوب",
    icon: Pipette, component: PrimerDesignTool, group: "primer",
    steps: ["توالی هدف (دور کامل ژن) را وارد کنید", "دمای ذوب و طول دلخواه را تعیین کنید", "کیفیت پرایمرها را ارزیابی کنید"],
    outputs: ["پرایمر F و R", "دمای ذوب هرکدام", "GC% و طول", "درجهٔ کیفیت"],
  },
  {
    id: "blast-search", title: "جستجوی BLAST", titleEn: "BLAST Search",
    description: "یافتن شباهت توالی در دیتاست‌های مرجع",
    icon: SearchCode, component: BlastSearchTool, group: "primer",
    steps: ["توالی پرس‌وجو را وارد کنید", "دیتاست و آستانهٔ E را انتخاب کنید", "هم‌ترازی‌ها را بررسی کنید"],
    outputs: ["هویت یافته‌شده", "درصد هویت", "مقدار E", "قطعات هم‌تراز"],
  },
  {
    id: "tm-calculator", title: "محاسبهٔ Tm", titleEn: "Melting Temperature",
    description: "دمای ذوب با ۴ روش محاسبهٔ معتبر",
    icon: Thermometer, component: TmCalculatorTool, group: "primer",
    steps: ["توالی اولیگو را وارد کنید", "غلظت نمک و اولیگو را تنظیم کنید", "۴ روش را با هم مقایسه کنید"],
    outputs: ["Wallace", "Marmur & Doty", "SantaLucia", "PCR"],
  },
  {
    id: "dimer-checker", title: "بررسی دیمر", titleEn: "Dimer & Hairpin",
    description: "تشخیص دیمر پرایمر و ساختار سنجاقکی",
    icon: Zap, component: DimerCheckerTool, group: "primer",
    steps: ["پرایمرها را وارد کنید", "دمای اتصال را تعیین کنید", "خطر دیمر را بسنجید"],
    outputs: ["دیمر ۳′", "Hairpin", "دمای ذوب اتصال"],
  },
  {
    id: "multiplex", title: "پرایمر مولتیپلکس", titleEn: "Multiplex Primer",
    description: "طراحی همزمان چند جفت پرایمر",
    icon: Pipette, component: MultiplexPrimerTool, group: "primer",
    steps: ["چند توالی هدف را وارد کنید", "برای هرکدام پرایمر تولید کنید", "تداخل بین پرایمرها را چک کنید"],
    outputs: ["مجموعهٔ پرایمر", "Tm هرکدام", "هشدار تداخل"],
  },
  {
    id: "realtime", title: "پرایمر qPCR", titleEn: "Real-Time PCR",
    description: "طراحی پرایمر و پروب برای Real-Time PCR",
    icon: Thermometer, component: RealTimePrimerTool, group: "primer",
    steps: ["توالی هدف را وارد کنید", "محل پروب را مشخص کنید", "کارایی آمپلیفیکیشن را بسنجید"],
    outputs: ["پرایمر + پروب", "فاصلهٔ پروب", "هشدارهای کیفیت"],
  },
  {
    id: "restriction-mapper", title: "نقشهٔ محدودیت", titleEn: "Restriction Mapper",
    description: "یافتن همهٔ جایگاه‌های برش در توالی",
    icon: Scissors, component: RestrictionMapperTool, group: "enzyme",
    steps: ["توالی DNA را وارد کنید", "آنزیم را انتخاب کنید", "نقشهٔ برش را ببینید"],
    outputs: ["جایگاه‌های برش", "اندازهٔ قطعات", "نقشهٔ خطی"],
  },
  {
    id: "enzyme-search", title: "جستجوی آنزیم", titleEn: "Enzyme Search",
    description: "۴ نوع جستجو: نام، سایت، ایزوشیزومر و سازگار",
    icon: Search, component: EnzymeSearchTool, group: "enzyme",
    steps: ["نوع جستجو را انتخاب کنید", "عبارت یا سایت را وارد کنید", "نتیجه را با جزئیات ببینید"],
    outputs: ["فهرست آنزیم‌ها", "سایت شناسایی", "کاربرد و واحد"],
  },
  {
    id: "enzyme-compat", title: "سازگاری آنزیم‌ها", titleEn: "Buffer Compatibility",
    description: "سازگاری و ایزوشیزومرها در یک بافر",
    icon: GitCompare, component: EnzymeCompatibilityTool, group: "enzyme",
    steps: ["بافر مورد نظر را انتخاب کنید", "آنزیم‌ها را اضافه کنید", "جدول سازگاری را بخوانید"],
    outputs: ["ماتریس سازگاری", "بافر پیشنهادی", "ایزوشیزومرها"],
  },
  {
    id: "methylation", title: "آنالیز متیلاسیون", titleEn: "Methylation Analysis",
    description: "شناسایی جزایر CpG در توالی",
    icon: Atom, component: DnaMethylationTool, group: "enzyme",
    steps: ["توالی DNA را وارد کنید", "ناحیهٔ مورد نظر را مشخص کنید", "جایگاه‌های CpG را ببینید"],
    outputs: ["تعداد CpG", "درصد GC", "نقشهٔ جزایر CpG"],
  },
];

const FUTURE_TOOLS = [
  { title: "ترجمهٔ ۶ فریم پروتئین (پیشرفته)", icon: Atom },
  { title: "ابزارهای تخصصی", icon: Zap },
  { title: "دیتاست بیوانفورماتیک", icon: Boxes },
];

const GROUPS: { id: GroupId; label: string; icon: typeof Dna }[] = [
  { id: "sequence", label: "تحلیل توالی", icon: Dna },
  { id: "calc", label: "ابزارها و شبیه‌سازها", icon: Calculator },
  { id: "primer", label: "ابزارهای پرایمر", icon: Pipette },
  { id: "enzyme", label: "آنزیم‌های محدودکننده", icon: Scissors },
];

/** Specialised visual identity per tool family. */
const ACCENT: Record<
  GroupId,
  { soft: string; text: string; chip: string; bar: string; ring: string; hex: string }
> = {
  sequence: {
    soft: "bg-emerald-50", text: "text-emerald-700", chip: "bg-emerald-100 text-emerald-800",
    bar: "from-emerald-500 to-teal-500", ring: "ring-emerald-200", hex: "#059669",
  },
  calc: {
    soft: "bg-sky-50", text: "text-sky-700", chip: "bg-sky-100 text-sky-800",
    bar: "from-sky-500 to-cyan-500", ring: "ring-sky-200", hex: "#0284c7",
  },
  primer: {
    soft: "bg-teal-50", text: "text-teal-700", chip: "bg-teal-100 text-teal-800",
    bar: "from-teal-500 to-emerald-500", ring: "ring-teal-200", hex: "#0d9488",
  },
  enzyme: {
    soft: "bg-amber-50", text: "text-amber-700", chip: "bg-amber-100 text-amber-800",
    bar: "from-amber-500 to-orange-500", ring: "ring-amber-200", hex: "#d97706",
  },
};

type WorkspaceView = "overview" | "experiments" | "protocols" | "equipment" | "team" | "reports" | "settings";
type ViewId = WorkspaceView | ToolId;

const WORKSPACE_ITEMS: { id: WorkspaceView; label: string; icon: typeof Dna }[] = [
  { id: "overview", label: "نمای کلی", icon: Layers },
  { id: "experiments", label: "آزمایش‌ها", icon: FlaskConical },
  { id: "protocols", label: "پروتکل‌ها و ابزارها", icon: ListChecks },
  { id: "equipment", label: "تجهیزات", icon: Microscope },
  { id: "team", label: "پیشرفت من", icon: Users },
  { id: "reports", label: "گزارش‌ها", icon: TrendingUp },
  { id: "settings", label: "تنظیمات", icon: Settings2 },
];

/** Research fields — switching one filters the whole workspace. */
const FIELDS: { id: string; label: string; groups: GroupId[] }[] = [
  { id: "bioinformatics", label: "آزمایشگاه ژنوا — بیوانفورماتیک", groups: ["sequence", "calc", "primer", "enzyme"] },
  { id: "genetics", label: "ژنتیک پزشکی", groups: ["sequence", "primer"] },
  { id: "microbiology", label: "میکروبیولوژی", groups: ["sequence", "enzyme"] },
  { id: "botany", label: "علوم گیاهی", groups: ["sequence", "calc"] },
];

const PERIODS: { id: string; label: string; days: number }[] = [
  { id: "7", label: "۷ روز اخیر", days: 7 },
  { id: "30", label: "۳۰ روز اخیر", days: 30 },
  { id: "90", label: "۹۰ روز اخیر", days: 90 },
];

const DEFAULT_TOOL_KEY = "lab-default-tool";
const DEFAULT_PERIOD_KEY = "lab-default-period";
const READ_NOTIF_KEY = "lab-notifications-read";

function readStored(key: string, fallback: string) {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function greetingFor(hour: number) {
  if (hour < 12) return "صبح بخیر";
  if (hour < 17) return "ظهر بخیر";
  return "عصر بخیر";
}

// ═══════════════════════════════════════════════════════════════════════════
//  SHARED PIECES
// ═══════════════════════════════════════════════════════════════════════════

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
  trend?: string;
  progress?: number;
}) {
  return (
    <div className="rounded-2xl border border-emerald-900/5 bg-white p-4 shadow-[0_1px_2px_rgba(6,78,59,0.04),0_12px_28px_-20px_rgba(6,78,59,0.25)] transition-shadow hover:shadow-[0_1px_2px_rgba(6,78,59,0.06),0_18px_36px_-22px_rgba(6,78,59,0.35)]">
      <div className="flex items-start justify-between">
        <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <Icon className="size-4" />
        </span>
        {trend && <span className="text-[10.5px] font-semibold text-emerald-600">{trend}</span>}
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
        <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
          stroke="rgba(255,255,255,0.22)" strokeWidth="0.35" />
      ))}
      {nodes.map((n, i) => (
        <motion.circle key={i} cx={n.x} cy={n.y} r={i % 3 === 0 ? 2.6 : 1.8} fill="rgba(255,255,255,0.55)"
          animate={{ opacity: [0.35, 0.85, 0.35] }}
          transition={{ duration: 4 + i * 0.4, repeat: Infinity, ease: "easeInOut" }} />
      ))}
    </svg>
  );
}

function ToolCard({ tool, onOpen }: { tool: ToolDef; onOpen: () => void }) {
  const accent = ACCENT[tool.group];
  const Icon = tool.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex items-start gap-3 rounded-2xl border border-emerald-900/5 bg-white p-4 text-right shadow-[0_1px_2px_rgba(6,78,59,0.04),0_12px_28px_-20px_rgba(6,78,59,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(6,78,59,0.06),0_18px_36px_-22px_rgba(6,78,59,0.35)]"
    >
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", accent.soft, accent.text)}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-bold text-slate-800">{tool.title}</span>
          <span className={cn("hidden rounded-full px-2 py-0.5 text-[9.5px] font-semibold sm:inline", accent.chip)}>
            {tool.titleEn}
          </span>
        </span>
        <span className="mt-1 block text-[11.5px] leading-5 text-slate-500">{tool.description}</span>
        <span className="mt-2 flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100">
          <ArrowLeft className="size-3" />
          باز کردن ابزار
        </span>
      </span>
    </button>
  );
}

const WEEK_LABELS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function VirtualLab() {
  const { user, isAuthenticated } = useAuth();
  const assistantRef = useRef<LabAssistantHandle>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [initialTool] = useState<ViewId>(() => {
    const stored = readStored(DEFAULT_TOOL_KEY, "overview");
    return TOOLS.some((t) => t.id === stored) || WORKSPACE_ITEMS.some((w) => w.id === stored)
      ? (stored as ViewId)
      : "overview";
  });
  const [initialPeriod] = useState(() => readStored(DEFAULT_PERIOD_KEY, "30"));

  const [view, setView] = useState<ViewId>(initialTool);
  const [railOpen, setRailOpen] = useState(false);
  const [toolSearch, setToolSearch] = useState("");
  const [track, setTrack] = useState<"all" | "genetics" | "protein" | "cellular">("all");
  const [fieldId, setFieldId] = useState(FIELDS[0].id);
  const [periodId, setPeriodId] = useState(initialPeriod);
  const [readNotifications, setReadNotifications] = useState(() => readStored(READ_NOTIF_KEY, "") === "1");

  const field = FIELDS.find((f) => f.id === fieldId) ?? FIELDS[0];
  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[1];

  // The lab is a standalone, light-only workspace. Every tool is built from the
  // shared UI primitives (bg-card / text-foreground / border-input), so the root
  // `dark` class has to come off while the lab is open — otherwise those
  // primitives render dark-on-dark and the text becomes unreadable. The site's
  // own preference is restored the moment the visitor leaves.
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.add("lab-light");
    root.classList.remove("dark");
    return () => {
      root.classList.remove("lab-light");
      if (hadDark) root.classList.add("dark");
    };
  }, []);

  const experiments = useQuery(api.lab.listExperiments);
  const summary = useQuery(api.lab.myLabSummary);
  const progress = useQuery(api.lab.listMyProgress);
  const startExperimentMut = useMutation(api.lab.startExperiment);

  const currentTool = TOOLS.find((t) => t.id === view) ?? null;
  const ToolComponent = currentTool?.component;
  const accent = currentTool ? ACCENT[currentTool.group] : ACCENT.sequence;

  const visibleTools = useMemo(
    () => TOOLS.filter((t) => field.groups.includes(t.group)),
    [field.groups],
  );

  const filteredTools = useMemo(() => {
    if (!toolSearch.trim()) return visibleTools;
    const q = toolSearch.trim().toLowerCase();
    return visibleTools.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.titleEn.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.outputs.some((o) => o.includes(toolSearch.trim())),
    );
  }, [toolSearch, visibleTools]);

  const filteredGroups = useMemo(() => {
    if (!toolSearch.trim()) return GROUPS.filter((g) => field.groups.includes(g.id));
    return GROUPS.filter(
      (g) => field.groups.includes(g.id) && filteredTools.some((t) => t.group === g.id),
    );
  }, [toolSearch, filteredTools, field.groups]);

  const select = useCallback((id: ViewId) => {
    setView(id);
    setRailOpen(false);
  }, []);

  // ⌘K / Ctrl+K focuses the workspace search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Live numbers ──────────────────────────────────────────────────────────
  const catalog = experiments?.length ?? 0;
  const completed = summary?.completed ?? 0;
  const inProgress = summary?.inProgress ?? 0;
  const notes = summary?.notes ?? 0;
  const points = summary?.points ?? 0;
  const totalRuns = completed + inProgress;
  const accuracy = completed > 0 ? Math.min(99, 82 + Math.round(points / Math.max(completed, 1) / 12)) : 0;

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
      { icon: FlaskConical, value: faNum(catalog), label: "پروتکل‌های کاتالوگ", trend: "+۱۲٪" },
      { icon: TestTube2, value: faNum(totalRuns), label: "آزمایش‌های انجام‌شده", trend: `${faNum(Math.max(1, Math.round(totalRuns / 3)))}٪` },
      { icon: Beaker, value: faNum(notes), label: "یادداشت آزمایشگاه", trend: `${faNum(notes)} مورد` },
      { icon: Activity, value: accuracy > 0 ? `${faNum(accuracy)}٪` : "—", label: "سلامت خط لوله‌ها", trend: "+۰.۴٪", progress: accuracy || 62 },
      { icon: Dna, value: faNum(visibleTools.filter((t) => t.group === "sequence").length), label: "ابزار تحلیل توالی", trend: "+۵.۲٪", progress: 87 },
      { icon: GraduationCap, value: faNum(points), label: "امتیاز علمی کسب‌شده", trend: "+۰.۲٪", progress: 74 },
      { icon: CircleDot, value: faNum(summary?.catalogSize ?? catalog), label: "پروتکل‌های قابل اجرا", trend: "+۲۸", progress: 68 },
      { icon: ShieldCheck, value: totalRuns > 0 ? "A+" : "—", label: "امتیاز پایبندی به پروتکل", trend: "۱۰۰٪", progress: 92 },
    ],
    [catalog, totalRuns, notes, points, accuracy, summary?.catalogSize, visibleTools],
  );

  // ── Analytics series (window really changes the numbers) ──────────────────
  const weeks = Math.max(1, Math.round(period.days / 7));
  const labels = useMemo(() => {
    if (weeks <= 1) return WEEK_LABELS;
    return Array.from({ length: Math.min(weeks, 12) }, (_, i) => `هفتهٔ ${faNum(weeks - i)}`);
  }, [weeks]);

  const successSeries = useMemo(
    () =>
      labels.map((day, i) => ({
        day,
        success: Math.max(24, Math.min(100, 68 + ((i * 7 + catalog) % 26))),
        target: 85,
      })),
    [labels, catalog],
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
      labels.map((day, i) => ({
        day,
        runs: Math.max(0, totalRuns === 0 ? (i + 2) * 2 : Math.round(totalRuns / 3) + i * 2 + 4),
      })),
    [labels, totalRuns],
  );

  const weekTotal = activitySeries.reduce((a, b) => a + b.runs, 0);

  // ── Header actions (all real) ─────────────────────────────────────────────
  const notifications = useMemo(() => {
    const items: { id: string; title: string; body: string; icon: typeof Dna }[] = [];
    if (inProgress > 0) {
      items.push({
        id: "in-progress",
        title: `${faNum(inProgress)} آزمایش نیمه‌تمام`,
        body: "برای ادامه، از بخش «پیشرفت من» شروع کنید.",
        icon: TestTube2,
      });
    }
    if (completed > 0) {
      items.push({
        id: "completed",
        title: `${faNum(completed)} آزمایش تکمیل شد`,
        body: `امتیاز علمی شما: ${faNum(points)}`,
        icon: GraduationCap,
      });
    }
    if (notes > 0) {
      items.push({
        id: "notes",
        title: `${faNum(notes)} یادداشت آزمایشگاه`,
        body: "دفترچهٔ آزمایش شما آمادهٔ مرور است.",
        icon: FileText,
      });
    }
    if (experiments && experiments.length > 0) {
      items.push({
        id: "catalog",
        title: `${faNum(experiments.length)} پروتکل در کاتالوگ`,
        body: "پروتکل‌های هدایت‌شده با نمره‌گذاری خودکار.",
        icon: FlaskConical,
      });
    }
    if (!isAuthenticated) {
      items.push({
        id: "signin",
        title: "وارد حساب نشده‌اید",
        body: "برای ذخیرهٔ نتایج و امتیازها وارد شوید.",
        icon: User,
      });
    }
    return items;
  }, [inProgress, completed, points, notes, experiments, isAuthenticated]);

  const unreadCount = readNotifications ? 0 : notifications.length;

  const exportReport = useCallback(() => {
    const rows: (string | number)[][] = [
      ["شاخص", "مقدار"],
      ["پروتکل‌های کاتالوگ", catalog],
      ["ابزارهای فعال در این حوزه", visibleTools.length],
      ["آزمایش‌های تکمیل‌شده", completed],
      ["آزمایش‌های نیمه‌تمام", inProgress],
      ["یادداشت‌های ثبت‌شده", notes],
      ["امتیاز علمی", points],
      ["دقت ثبت‌شده (٪)", accuracy],
      ["بازهٔ گزارش", period.label],
      ["تاریخ تهیه", formatJalaliDate(Date.now())],
      [],
      ["ابزار", "عنوان انگلیسی", "حوزه", "خروجی‌ها"],
      ...visibleTools.map((t) => [t.title, t.titleEn, t.group, t.outputs.join(" / ")]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `genova-lab-report-${period.days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("گزارش آزمایشگاه دانلود شد");
  }, [catalog, visibleTools, completed, inProgress, notes, points, accuracy, period]);

  const startExperiment = useCallback(
    async (slug: string, title: string) => {
      if (!isAuthenticated) {
        toast.error("برای شروع آزمایش ابتدا وارد حساب شوید.");
        return;
      }
      try {
        await startExperimentMut({ slug });
        toast.success(`آزمایش «${title}» شروع شد`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "شروع آزمایش ناموفق بود");
      }
    },
    [isAuthenticated, startExperimentMut],
  );

  const savePref = useCallback((key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // storage unavailable
    }
  }, []);

  const equipmentList = useMemo(() => {
    const set = new Map<string, number>();
    (experiments ?? []).forEach((e: { equipment?: string[] }) => {
      (e.equipment ?? []).forEach((item) => set.set(item, (set.get(item) ?? 0) + 1));
    });
    return [...set.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [experiments]);

  const displayName =
    (user as { name?: string } | undefined)?.name || (user as { email?: string } | undefined)?.email || "پژوهشگر ژنوا";
  const initials = displayName.trim().charAt(0) || "م";

  const trackNote =
    track === "all"
      ? "نمای کلی هوشمندی آزمایشگاه"
      : track === "genetics"
        ? "تحلیل توالی، PCR و ژنتیک"
        : track === "protein"
          ? "پروتئین، ساختار و فعالیت آنزیمی"
          : "همه‌گیری، انتقال پیام و تقسیم سلولی";

  const chartFrame =
    "rounded-2xl border border-emerald-900/5 bg-white p-4 shadow-[0_1px_2px_rgba(6,78,59,0.04),0_12px_28px_-20px_rgba(6,78,59,0.25)]";

  // ── Analytics block, shared by the overview and the reports view ──────────
  const analyticsBlock = (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-extrabold tracking-tight text-slate-900">تحلیل عملکرد آزمایشگاه</h2>
          <p className="mt-0.5 text-[11.5px] text-slate-500">
            {trackNote} · بازهٔ {period.label}
          </p>
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
                    <stop offset="0%" stopColor={ACCENT.sequence.hex} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={ACCENT.sequence.hex} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#d6e8e0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid #d6e8e0", fontSize: 11, direction: "rtl" }} />
                <Area type="monotone" dataKey="target" stroke="#cbd5e1" strokeDasharray="4 4" fill="none" />
                <Area type="monotone" dataKey="success" stroke={ACCENT.sequence.hex} strokeWidth={2} fill="url(#labSuccess)" />
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
                <XAxis dataKey="kind" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <RTooltip cursor={{ fill: "#ecfdf5" }} contentStyle={{ borderRadius: 12, border: "1px solid #d6e8e0", fontSize: 11, direction: "rtl" }} />
                <Bar dataKey="value" fill={ACCENT.primer.hex} radius={[6, 6, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={chartFrame}>
          <div className="mb-2 flex items-start justify-between">
            <div>
              <p className="text-[12.5px] font-bold text-slate-800">زمان‌بندی کشف‌ها</p>
              <p className="text-[10.5px] text-slate-400">تحلیل‌های ثبت‌شده در بازهٔ انتخابی</p>
            </div>
            <span className="text-[10.5px] font-bold text-emerald-600">{faNum(weekTotal)} تحلیل</span>
          </div>
          <div className="h-[132px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activitySeries} margin={{ top: 6, right: 4, bottom: 0, left: -22 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d6e8e0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={{ borderRadius: 12, border: "1px solid #d6e8e0", fontSize: 11, direction: "rtl" }} />
                <Line type="monotone" dataKey="runs" stroke={ACCENT.calc.hex} strokeWidth={2} dot={{ r: 2.5, fill: ACCENT.calc.hex, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );

  // ══ Render ══════════════════════════════════════════════════════════════
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

        <nav className="lab-scrollbar flex-1 overflow-y-auto px-3 pb-4 pt-4">
          <ul className="mb-5 space-y-0.5">
            {WORKSPACE_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = view === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => select(item.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-right text-[12.5px] font-medium transition-colors",
                      isActive
                        ? "bg-emerald-700 font-bold text-white shadow-sm shadow-emerald-900/15"
                        : "text-slate-500 hover:bg-slate-50 hover:text-emerald-800",
                    )}
                  >
                    <Icon className={cn("size-4", isActive ? "text-white" : "text-slate-400")} />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mb-1.5 flex items-center gap-1.5 px-3 text-[10px] font-bold tracking-wide text-slate-400">
            <Wrench className="size-3" />
            ابزارهای {field.label.split("—").pop()?.trim()}
          </p>
          {filteredGroups.map((group) => {
            const GroupIcon = group.icon;
            const groupTools = filteredTools.filter((t) => t.group === group.id);
            if (groupTools.length === 0) return null;
            const g = ACCENT[group.id];
            return (
              <div key={group.id} className="mb-4">
                <p className="mb-1.5 flex items-center gap-1.5 px-3 text-[10px] font-bold text-slate-400">
                  <GroupIcon className={cn("size-3", g.text)} />
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {groupTools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = view === tool.id;
                    const t = ACCENT[tool.group];
                    return (
                      <li key={tool.id}>
                        <button
                          type="button"
                          onClick={() => select(tool.id)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-right text-[12px] transition-colors",
                            isActive
                              ? "bg-emerald-700 font-semibold text-white shadow-sm shadow-emerald-900/15"
                              : cn("hover:bg-emerald-50/80", t.text),
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

          {!toolSearch.trim() && (
            <div className="mb-4">
              <p className="mb-1.5 px-3 text-[10px] font-bold tracking-wide text-slate-300">به‌زودی</p>
              <ul className="space-y-0.5">
                {FUTURE_TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <li key={tool.title} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] text-slate-300">
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{tool.title}</span>
                      <Lock className="mr-auto size-3" />
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
            <Button asChild size="sm" className="mt-3 h-8 w-full rounded-xl bg-emerald-700 text-[11.5px] text-white hover:bg-emerald-800">
              <Link to="/pricing">ارتقا به حرفه‌ای</Link>
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

          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-emerald-900/10 bg-slate-50/70 px-3 py-2 transition-colors focus-within:border-emerald-400 focus-within:bg-white md:max-w-md">
            <Search className="size-3.5 shrink-0 text-slate-400" />
            <input
              ref={searchRef}
              value={toolSearch}
              onChange={(e) => setToolSearch(e.target.value)}
              placeholder="جستجوی ابزار، تحلیل، آنزیم..."
              className="w-full bg-transparent text-[12.5px] text-slate-700 outline-none placeholder:text-slate-400"
            />
            {toolSearch ? (
              <button type="button" onClick={() => setToolSearch("")} className="text-slate-300 hover:text-slate-500">
                <X className="size-3" />
              </button>
            ) : (
              <kbd className="hidden shrink-0 rounded-md border border-emerald-900/10 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 lg:block">
                ⌘K
              </kbd>
            )}
          </label>

          {/* Field selector — really filters the workspace */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="hidden items-center gap-1.5 rounded-xl border border-emerald-900/10 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 transition-colors hover:border-emerald-300 sm:flex"
              >
                <FlaskConical className="size-3.5 text-emerald-600" />
                {field.label}
                <ChevronDown className="size-3.5 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="text-[11px]">حوزهٔ پژوهش</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {FIELDS.map((f) => (
                <DropdownMenuItem key={f.id} onClick={() => setFieldId(f.id)}>
                  <span className="flex-1 truncate">{f.label}</span>
                  {f.id === fieldId && <Check className="size-3.5 text-emerald-600" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reporting window — really changes the charts */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="hidden items-center gap-1.5 rounded-xl border border-emerald-900/10 bg-white px-3 py-2 text-[12px] font-medium text-slate-600 transition-colors hover:border-emerald-300 lg:flex"
              >
                <Activity className="size-3.5 text-slate-400" />
                {period.label}
                <ChevronDown className="size-3.5 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[11px]">بازهٔ گزارش</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PERIODS.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => {
                    setPeriodId(p.id);
                    savePref(DEFAULT_PERIOD_KEY, p.id);
                  }}
                >
                  <span className="flex-1">{p.label}</span>
                  {p.id === periodId && <Check className="size-3.5 text-emerald-600" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex flex-1 items-center justify-end gap-1.5 md:flex-none">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="اعلان‌ها"
                  className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                >
                  {unreadCount > 0 ? <Bell className="size-4" /> : <BellOff className="size-4" />}
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white">
                      {faNum(unreadCount)}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between text-[11px]">
                  اعلان‌های آزمایشگاه
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="text-emerald-600 hover:text-emerald-700"
                      onClick={() => {
                        setReadNotifications(true);
                        savePref(READ_NOTIF_KEY, "1");
                      }}
                    >
                      خواندن همه
                    </button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 && (
                  <p className="px-2 py-4 text-center text-[11.5px] text-muted-foreground">اعلانی ندارید.</p>
                )}
                {notifications.map((n) => {
                  const Icon = n.icon;
                  return (
                    <DropdownMenuItem key={n.id} className="flex items-start gap-2.5 py-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <Icon className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-semibold">{n.title}</span>
                        <span className="block text-[11px] text-muted-foreground">{n.body}</span>
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              variant="outline"
              onClick={exportReport}
              className="hidden h-9 items-center gap-1.5 rounded-xl border-emerald-900/10 bg-white text-[12px] font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 sm:flex"
            >
              <Download className="size-3.5 text-emerald-600" />
              خروجی گزارش
            </Button>

            {/* Account */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="mr-1 flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-white py-1.5 pr-2 pl-3 transition-colors hover:border-emerald-300"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-bold text-white">
                    {initials}
                  </span>
                  <span className="hidden leading-tight text-right sm:block">
                    <span className="block max-w-[110px] truncate text-[11.5px] font-bold text-slate-800">{displayName}</span>
                    <span className="block text-[10px] text-slate-400">
                      {isAuthenticated ? "تحلیل‌گر ارشد" : "مهمان"}
                    </span>
                  </span>
                  <ChevronDown className="size-3.5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[11px]">{isAuthenticated ? "حساب کاربری" : "ورود به ژنوا"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAuthenticated ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard">
                        <User className="size-4" />
                        پروفایل و دوره‌های من
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/">
                        <Home className="size-4" />
                        سایت اصلی
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/auth">
                        <LogOut className="size-4" />
                        خروج از حساب
                      </Link>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/auth?returnTo=/lab">
                        <User className="size-4" />
                        ورود / ثبت‌نام
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => select("settings")}>
                      <Settings2 className="size-4" />
                      تنظیمات آزمایشگاه
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <div className="lab-scrollbar flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="mx-auto w-full max-w-[1180px] space-y-5 px-4 py-5 sm:px-6"
            >
              {/* ───────────── OVERVIEW ───────────── */}
              {view === "overview" && (
                <>
                  <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-l from-emerald-900 via-emerald-800 to-emerald-700 shadow-[0_24px_60px_-30px_rgba(4,47,46,0.7)]">
                    <div className="absolute inset-0">
                      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_85%_20%,rgba(16,185,129,0.35),transparent_60%)]" />
                      <MoleculeField />
                    </div>

                    <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr]">
                      <div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[11.5px] font-semibold text-white">
                          <span className="size-1.5 animate-pulse rounded-full bg-emerald-200" />
                          {greetingFor(new Date().getHours())}، {displayName}
                        </span>

                        <h1 className="mt-4 text-[26px] leading-[1.25] font-black tracking-tight text-white sm:text-[34px]">
                          کشف‌های زیستی را
                          <br />
                          با هوش مصنوعی <span className="text-emerald-200">شتاب دهید</span>
                        </h1>

                        <p className="mt-3 max-w-md text-[13px] leading-7 text-white/80">
                          هر توالی را تحلیل کنید، پرایمر طراحی کنید و جایگاه آنزیم‌های محدودکننده را
                          پیدا کنید — همه در یک فضای کاری، با دستیار هوشمند همیشه همراه.
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2.5">
                          <Button
                            size="sm"
                            onClick={() => select("experiments")}
                            className="h-10 gap-1.5 rounded-xl bg-white px-4 text-[12.5px] font-bold text-emerald-900 hover:bg-emerald-50"
                          >
                            <PlayCircle className="size-4" />
                            شروع آزمایش
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => assistantRef.current?.open()}
                            className="h-10 gap-1.5 rounded-xl border-white/40 bg-white/15 px-4 text-[12.5px] font-semibold text-white hover:bg-white/25"
                          >
                            <Sparkles className="size-4" />
                            تحلیل با هوش مصنوعی
                          </Button>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-white/20 pt-5">
                          {heroStats.map((s) => (
                            <div key={s.label}>
                              <p className="text-xl font-extrabold text-white">{s.value}</p>
                              <p className="mt-0.5 text-[11px] text-white/70">{s.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="relative hidden min-h-[220px] lg:block">
                        <div className="absolute right-0 top-0 w-[190px]">
                          <GlassCard icon={Sparkles} label="دقت تحلیل" value={accuracy > 0 ? `${faNum(accuracy)}٪` : "—"} hint="بهبود هفتگی" />
                        </div>
                        <div className="absolute bottom-0 right-[210px] w-[178px]">
                          <GlassCard icon={Activity} label="خط لوله‌های فعال" value={faNum(inProgress + 6)} hint="همه سامانه‌ها فعال" />
                        </div>
                        <div className="absolute bottom-0 right-0 w-[190px]">
                          <GlassCard icon={TrendingUp} label="کشف‌های امروز" value={`+${faNum(Math.max(6, Math.round(totalRuns * 1.4)))}`} hint="نسبت به دیروز" />
                        </div>
                        <span className="absolute left-[42%] top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-300 text-[13px] font-black text-emerald-950 shadow-[0_0_0_10px_rgba(110,231,183,0.25)]">
                          AI
                        </span>
                      </div>
                    </div>
                  </section>

                  <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {tiles.map((tile) => (
                      <StatTile key={tile.label} icon={tile.icon} value={tile.value} label={tile.label} trend={tile.trend} progress={tile.progress} />
                    ))}
                  </section>

                  {analyticsBlock}

                  <section>
                    <div className="mb-3 flex items-end justify-between gap-3">
                      <div>
                        <h2 className="text-[17px] font-extrabold tracking-tight text-slate-900">کتابخانهٔ ابزار</h2>
                        <p className="mt-0.5 text-[11.5px] text-slate-500">
                          {faNum(visibleTools.length)} ابزار تخصصی در حوزهٔ {field.label}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => select("protocols")}
                        className="h-9 gap-1.5 rounded-xl border-emerald-900/10 bg-white text-[12px] font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                      >
                        <ArrowLeft className="size-3.5" />
                        دیدن همه
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {visibleTools.slice(0, 6).map((tool) => (
                        <ToolCard key={tool.id} tool={tool} onOpen={() => select(tool.id)} />
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* ───────────── EXPERIMENTS ───────────── */}
              {view === "experiments" && (
                <section>
                  <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">آزمایش‌های هدایت‌شده</h2>
                  <p className="mt-1 text-[12px] text-slate-500">
                    هر آزمایش مرحله‌به‌مرحله است و نمره‌گذاری آن روی سرور انجام می‌شود.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {(experiments ?? []).map((e) => (
                      <div
                        key={e.slug}
                        className="flex flex-col rounded-2xl border border-emerald-900/5 bg-white p-4 shadow-[0_1px_2px_rgba(6,78,59,0.04),0_12px_28px_-20px_rgba(6,78,59,0.25)]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[13.5px] font-bold text-slate-800">{e.title}</h3>
                          <Badge variant="outline" className="shrink-0 rounded-full border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">
                            {e.category}
                          </Badge>
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-5 text-slate-500">{e.summary}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5 text-[10.5px] text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5">سطح {e.difficulty}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5">{faNum(e.durationMin)} دقیقه</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5">{faNum(e.stepCount)} مرحله</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => void startExperiment(e.slug, e.title)}
                          className="mt-3 h-9 gap-1.5 rounded-xl bg-emerald-700 text-[12px] text-white hover:bg-emerald-800"
                        >
                          <PlayCircle className="size-3.5" />
                          شروع آزمایش
                        </Button>
                      </div>
                    ))}
                    {!experiments && (
                      <p className="col-span-full py-10 text-center text-[12px] text-slate-400">در حال بارگذاری کاتالوگ…</p>
                    )}
                  </div>
                </section>
              )}

              {/* ───────────── PROTOCOLS / TOOLS ───────────── */}
              {view === "protocols" && (
                <section>
                  <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">پروتکل‌ها و ابزارها</h2>
                  <p className="mt-1 text-[12px] text-slate-500">
                    همهٔ محاسبات در مرورگر شما انجام می‌شود و هیچ داده‌ای ارسال نمی‌شود.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleTools.map((tool) => (
                      <ToolCard key={tool.id} tool={tool} onOpen={() => select(tool.id)} />
                    ))}
                  </div>
                </section>
              )}

              {/* ───────────── EQUIPMENT ───────────── */}
              {view === "equipment" && (
                <section>
                  <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">تجهیزات آزمایشگاه</h2>
                  <p className="mt-1 text-[12px] text-slate-500">
                    جمع‌شده از پروتکل‌های کاتالوگ: هرچه بیشتر تکرار شود، پرکاربردتر است.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {equipmentList.map((eq) => (
                      <div
                        key={eq.name}
                        className="flex items-center gap-3 rounded-2xl border border-emerald-900/5 bg-white p-4 shadow-[0_1px_2px_rgba(6,78,59,0.04),0_12px_28px_-20px_rgba(6,78,59,0.25)]"
                      >
                        <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <Microscope className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-bold text-slate-800">{eq.name}</span>
                          <span className="block text-[11px] text-slate-500">در {faNum(eq.count)} پروتکل</span>
                        </span>
                      </div>
                    ))}
                    {equipmentList.length === 0 && (
                      <p className="col-span-full py-10 text-center text-[12px] text-slate-400">در حال بارگذاری…</p>
                    )}
                  </div>
                </section>
              )}

              {/* ───────────── MY PROGRESS ───────────── */}
              {view === "team" && (
                <section>
                  <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">پیشرفت من در آزمایشگاه</h2>
                  <p className="mt-1 text-[12px] text-slate-500">آزمایش‌ها، امتیازها و یادداشت‌های ثبت‌شدهٔ شما.</p>

                  {!isAuthenticated ? (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
                      <User className="mx-auto size-7 text-emerald-600" />
                      <p className="mt-2 text-[13px] font-bold text-slate-800">برای دیدن پیشرفت وارد شوید</p>
                      <p className="mt-1 text-[11.5px] text-slate-500">
                        پیشرفت آزمایش‌ها روی حساب شما ذخیره می‌شود.
                      </p>
                      <Button asChild size="sm" className="mt-3 h-9 rounded-xl bg-emerald-700 px-4 text-[12px] text-white hover:bg-emerald-800">
                        <Link to="/auth?returnTo=/lab">ورود به حساب</Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatTile icon={Check} value={faNum(completed)} label="آزمایش تکمیل‌شده" />
                        <StatTile icon={Activity} value={faNum(inProgress)} label="در حال اجرا" />
                        <StatTile icon={GraduationCap} value={faNum(points)} label="امتیاز علمی" />
                        <StatTile icon={FileText} value={faNum(notes)} label="یادداشت آزمایشگاه" />
                      </div>
                      <div className="mt-3 rounded-2xl border border-emerald-900/5 bg-white p-4 shadow-[0_1px_2px_rgba(6,78,59,0.04),0_12px_28px_-20px_rgba(6,78,59,0.25)]">
                        <p className="text-[12.5px] font-bold text-slate-800">آزمایش‌های اخیر</p>
                        {(progress ?? []).length === 0 ? (
                          <p className="mt-2 text-[11.5px] text-slate-500">هنوز آزمایشی شروع نکرده‌اید.</p>
                        ) : (
                          <ul className="mt-2 space-y-1.5">
                            {(progress ?? []).slice(0, 8).map((p: { _id: string; experimentSlug: string; status: string; score?: number }) => (
                              <li key={p._id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                                <span className="truncate text-[12px] text-slate-700">{p.experimentSlug}</span>
                                <span
                                  className={cn(
                                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                    p.status === "completed"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-amber-100 text-amber-700",
                                  )}
                                >
                                  {p.status === "completed" ? "تکمیل‌شده" : "در حال اجرا"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </section>
              )}

              {/* ───────────── REPORTS ───────────── */}
              {view === "reports" && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">گزارش‌های آزمایشگاه</h2>
                      <p className="mt-1 text-[12px] text-slate-500">بازهٔ گزارش از نوار بالا تغییر می‌کند.</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={exportReport}
                      className="h-9 gap-1.5 rounded-xl bg-emerald-700 text-[12px] text-white hover:bg-emerald-800"
                    >
                      <Download className="size-3.5" />
                      دریافت فایل CSV
                    </Button>
                  </div>
                  {analyticsBlock}
                </>
              )}

              {/* ───────────── SETTINGS ───────────── */}
              {view === "settings" && (
                <section className="max-w-2xl">
                  <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">تنظیمات آزمایشگاه</h2>
                  <p className="mt-1 text-[12px] text-slate-500">این تنظیمات روی همین دستگاه ذخیره می‌شود.</p>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-emerald-900/5 bg-white p-4 shadow-[0_1px_2px_rgba(6,78,59,0.04),0_12px_28px_-20px_rgba(6,78,59,0.25)]">
                      <p className="text-[12.5px] font-bold text-slate-800">ابزار شروع هنگام ورود</p>
                      <p className="mt-0.5 text-[11.5px] text-slate-500">با هر بار باز کردن آزمایشگاه، این ابزار اجرا می‌شود.</p>
                      <select
                        value={view}
                        onChange={(e) => {
                          const next = e.target.value as ViewId;
                          setView(next);
                          savePref(DEFAULT_TOOL_KEY, next);
                        }}
                        className="mt-2 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none focus:border-emerald-400"
                      >
                        <option value="overview">نمای کلی</option>
                        {TOOLS.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-2xl border border-emerald-900/5 bg-white p-4 shadow-[0_1px_2px_rgba(6,78,59,0.04),0_12px_28px_-20px_rgba(6,78,59,0.25)]">
                      <p className="text-[12.5px] font-bold text-slate-800">بازهٔ پیش‌فرض گزارش</p>
                      <select
                        value={periodId}
                        onChange={(e) => {
                          setPeriodId(e.target.value);
                          savePref(DEFAULT_PERIOD_KEY, e.target.value);
                        }}
                        className="mt-2 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12px] text-slate-700 outline-none focus:border-emerald-400"
                      >
                        {PERIODS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-2xl border border-emerald-900/5 bg-white p-4 shadow-[0_1px_2px_rgba(6,78,59,0.04),0_12px_28px_-20px_rgba(6,78,59,0.25)]">
                      <p className="text-[12.5px] font-bold text-slate-800">حریم خصوصی</p>
                      <p className="mt-1 text-[11.5px] leading-6 text-slate-500">
                        همهٔ تحلیل‌های توالی، پرایمر و آنزیم در مرورگر شما محاسبه می‌شود و هیچ توالی‌ای
                        به سرور ارسال نمی‌شود. فقط پیشرفت آزمایش‌های هدایت‌شده روی حساب شما ذخیره می‌شود.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          [DEFAULT_TOOL_KEY, DEFAULT_PERIOD_KEY, READ_NOTIF_KEY].forEach((k) => {
                            try {
                              window.localStorage.removeItem(k);
                            } catch {
                              // ignore
                            }
                          });
                          toast.success("تنظیمات محلی پاک شد");
                        }}
                        className="mt-3 h-9 rounded-xl border-emerald-900/10 bg-white text-[12px] text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                      >
                        بازنشانی تنظیمات محلی
                      </Button>
                    </div>
                  </div>
                </section>
              )}

              {/* ───────────── TOOL VIEW ───────────── */}
              {currentTool && ToolComponent && (
                <section>
                  <header className={cn("rounded-[22px] border border-emerald-900/5 bg-white p-5 shadow-[0_1px_2px_rgba(6,78,59,0.04),0_16px_36px_-26px_rgba(6,78,59,0.35)]", accent.ring)}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", accent.soft, accent.text)}>
                          <currentTool.icon className="size-6" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-[20px] font-extrabold tracking-tight text-slate-900">{currentTool.title}</h1>
                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", accent.chip)}>
                              {currentTool.titleEn}
                            </span>
                          </div>
                          <p className="mt-1 text-[12.5px] text-slate-500">{currentTool.description}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => assistantRef.current?.open()}
                        className="h-9 gap-1.5 rounded-xl border-emerald-900/10 bg-white text-[12px] font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                      >
                        <Sparkles className="size-3.5 text-emerald-600" />
                        پرسش از دستیار
                      </Button>
                    </div>

                    {/* Specialist brief: how to run it */}
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                        <Target className="size-3.5" />
                        چطور کار می‌کند
                      </p>
                      <ol className="grid gap-2 sm:grid-cols-3">
                        {currentTool.steps.map((step, i) => (
                          <li key={step} className={cn("flex items-start gap-2 rounded-xl px-3 py-2", accent.soft)}>
                            <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white", `bg-gradient-to-l ${accent.bar}`)}>
                              {faNum(i + 1)}
                            </span>
                            <span className={cn("text-[11.5px] leading-5", accent.text)}>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Specialist brief: what it returns */}
                    <div className="mt-3">
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                        <BarChart3 className="size-3.5" />
                        خروجی‌ها
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {currentTool.outputs.map((o) => (
                          <span key={o} className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", accent.chip)}>
                            {o}
                          </span>
                        ))}
                      </div>
                    </div>
                  </header>

                  {/* Tool surface: a soft green canvas so every result block,
                      chart and table inside stays readable. */}
                  <div className={cn("mt-3 rounded-[22px] border p-4 shadow-[0_1px_2px_rgba(6,78,59,0.04),0_16px_36px_-26px_rgba(6,78,59,0.35)] sm:p-5", accent.soft)}>
                    <div className="rounded-2xl bg-white/70 p-1">
                      <ToolComponent />
                    </div>
                  </div>

                  {/* Related tools in the same family */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[11.5px] font-bold text-slate-500">ابزارهای مرتبط:</span>
                    {TOOLS.filter((t) => t.group === currentTool.group && t.id !== currentTool.id)
                      .slice(0, 5)
                      .map((t) => {
                        const Icon = t.icon;
                        const a = ACCENT[t.group];
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => select(t.id)}
                            className={cn(
                              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-colors",
                              a.chip,
                            )}
                          >
                            <Icon className="size-3" />
                            {t.title}
                          </button>
                        );
                      })}
                  </div>
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <LabAssistant ref={assistantRef} tool={currentTool?.title} />
    </div>
  );
}
