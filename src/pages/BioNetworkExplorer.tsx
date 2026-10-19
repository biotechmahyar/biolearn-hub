/**
 * Genova BioNetwork Explorer (spec §1–§9)
 * ─────────────────────────────────────────────────────────────────────────────
 * The interactive workspace of the virtual lab: smart biological search,
 * a real force-directed network built from live STRING / Reactome / KEGG /
 * UniProt / NCBI / Open Targets responses, filters, node & edge details,
 * real network metrics (degree, betweenness, components, shortest path,
 * shared neighbourhoods), Reactome pathway-enrichment analysis, and
 * save / restore / export of the built network.
 *
 * Nothing on this page is a static illustration: every node and edge comes
 * from the backend actions (bioNetworkActions.ts) and every statistic is
 * computed on those real edges (lib/bioNetworkGraph.ts).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  SPECIES_OPTIONS,
  SOURCE_LABELS,
  extractSymbolCandidates,
  type EntityCandidate,
  type GraphNode,
  type GraphSourceId,
  type NetworkGraph,
} from "@/convex/bioNetworkAdapters";
import {
  analyzeGraph,
  defaultFilters,
  filterGraph,
  graphToCSV,
  graphToJSON,
  shortestPath,
  sharedNeighborhood,
  type GraphFilters,
} from "@/lib/bioNetworkGraph";
import {
  ForceGraph,
  KIND_COLORS,
  type ForceGraphApi,
  type GraphLayout,
} from "@/components/lab/network/ForceGraph";
import { EDGE_KIND_LABELS, EntityDetailsPanel } from "@/components/lab/network/EntityDetailsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { faNum, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  FlaskConical,
  GitBranch,
  GitFork,
  Loader2,
  Network,
  Download,
  RotateCcw,
  Save,
  Search,
  Share2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

// ── static config ───────────────────────────────────────────────────────────

const DEFAULT_SOURCES: GraphSourceId[] = ["string", "reactome", "kegg", "uniprot", "ncbi"];
const ALL_TOGGLES: { id: GraphSourceId; label: string; note?: string }[] = [
  { id: "string", label: "STRING" },
  { id: "reactome", label: "Reactome" },
  { id: "kegg", label: "KEGG" },
  { id: "uniprot", label: "UniProt" },
  { id: "ncbi", label: "NCBI Gene" },
  { id: "opentargets", label: "Open Targets" },
  { id: "genecards", label: "GeneCards", note: "نیازمند مجوز" },
];

/** Everyday biology acronyms that are never gene symbols. */
const NOT_GENES = new Set(["DNA", "RNA", "MRNA", "TRNA", "PCR", "NGS", "ATP", "GTP", "AGO"]);

const EXAMPLES = [
  "ارتباط میان پروتئین‌های TP53 و BRCA1 چیست؟",
  "شبکه تعاملات پروتئین‌های مرتبط با سرطان پستان را نمایش بده.",
  "کدام ژن‌ها با بیماری لوسمی میلوئیدی حاد (AML) ارتباط دارند؟",
  "ارتباط میان EGFR و سرطان ریه را بررسی کن.",
  "مسیرهای زیستی مرتبط با AKT1 و MTOR را نمایش بده.",
  "چه ژن‌هایی میان دو بیماری یا دو مسیر زیستی مشترک هستند؟",
];

const EDGE_KIND_CHIPS = [
  "protein_interaction",
  "gene_pathway",
  "gene_disease",
  "pathway_hierarchy",
] as const;

const SAVE_KEY = "genova-bionetwork-save";

/**
 * Persian disease phrases → their English equivalents, because KEGG/Reactome
 * catalogue terms are English. Only listed terms are translated; anything
 * else is passed through untouched and reported honestly if unrecognized.
 */
const FA_TERMS: [string, string][] = [
  ["لوسمی میلوئیدی حاد", "acute myeloid leukemia"],
  ["لوسمی میلوئیدی", "acute myeloid leukemia"],
  ["سرطان پستان", "breast cancer"],
  ["سرطان سینه", "breast cancer"],
  ["سرطان ریه", "lung cancer"],
  ["سرطان مغز", "brain cancer"],
  ["سرطان پروستات", "prostate cancer"],
  ["سرطان روده", "colorectal cancer"],
  ["سرطان لوزالمعده", "pancreatic cancer"],
  ["سرطان معده", "gastric cancer"],
  ["سرطان خون", "leukemia"],
  ["تومور مغزی", "brain tumor"],
  ["بیماری آلزایمر", "Alzheimer disease"],
  ["پارکینسون", "Parkinson disease"],
  ["مقاومت آنتی‌بیوتیکی", "antibiotic resistance"],
  ["نارسایی قلبی", "heart failure"],
  ["لنفوم", "lymphoma"],
  ["لوسمی", "leukemia"],
  ["ملانوم", "melanoma"],
  ["آلزایمر", "Alzheimer"],
  ["دیابت", "diabetes mellitus"],
  ["سرطان", "cancer"],
];

/** Returns English disease phrases found in the text (order preserved). */
function translateDiseasePhrases(text: string): string[] {
  const out: string[] = [];
  for (const [fa, en] of FA_TERMS) {
    if (text.includes(fa) && !out.includes(en)) out.push(en);
  }
  return out.slice(0, 3);
}

function identifiersFrom(text: string): string[] {
  const syms = extractSymbolCandidates(text).filter((s) => !NOT_GENES.has(s));
  const diseases = translateDiseasePhrases(text);
  const ids = [...new Set([...syms, ...diseases])].slice(0, 8);
  if (ids.length) return ids;
  return [text.trim()].filter(Boolean).slice(0, 1);
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function mergeIntoGraph(
  base: NetworkGraph,
  add: Pick<NetworkGraph, "nodes" | "edges" | "statuses">,
): NetworkGraph {
  const byId = new Map<string, GraphNode>(base.nodes.map((n) => [n.id, { ...n, sources: [...n.sources] }]));
  for (const n of add.nodes) {
    const ex = byId.get(n.id);
    if (!ex) {
      byId.set(n.id, { ...n, sources: [...n.sources] });
      continue;
    }
    for (const s of n.sources) if (!ex.sources.includes(s)) ex.sources.push(s);
    if (!ex.description && n.description) ex.description = n.description;
    if (n.ids) ex.ids = { ...(ex.ids ?? {}), ...n.ids };
    if (n.extra) ex.extra = { ...(ex.extra ?? {}), ...n.extra };
    if (!ex.url && n.url) ex.url = n.url;
  }
  const nodes = [...byId.values()];
  const edges = [...base.edges];
  const eids = new Set(edges.map((e) => e.id));
  for (const e of add.edges) {
    if (eids.has(e.id) || !byId.has(e.source) || !byId.has(e.target)) continue;
    edges.push(e);
    eids.add(e.id);
  }
  const statuses = [...base.statuses];
  for (const s of add.statuses) {
    const i = statuses.findIndex((x) => x.source === s.source && x.message === s.message);
    if (i >= 0) statuses[i] = s;
    else statuses.push(s);
  }
  return { ...base, nodes, edges, statuses };
}

// ═══════════════════════════════════════════════════════════════════════════

export default function BioNetworkExplorer() {
  const searchAction = useAction(api.bioNetworkActions.searchEntities);
  const buildAction = useAction(api.bioNetworkActions.buildNetwork);
  const expandAction = useAction(api.bioNetworkActions.expandNode);
  const enrichAction = useAction(api.bioNetworkActions.enrichPathways);

  // ── search state ─────────────────────────────────────────────────────────
  const [rawQuery, setRawQuery] = useState("");
  const [suggestions, setSuggestions] = useState<EntityCandidate[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [seeds, setSeeds] = useState<EntityCandidate[]>([]);

  // ── build config ─────────────────────────────────────────────────────────
  const [sources, setSources] = useState<GraphSourceId[]>(DEFAULT_SOURCES);
  const [species, setSpecies] = useState(9606);
  const [confidence, setConfidence] = useState(40); // percent → 0–1
  const [levels, setLevels] = useState(1);

  // ── graph state ──────────────────────────────────────────────────────────
  const [graph, setGraph] = useState<NetworkGraph | null>(null);
  const [building, setBuilding] = useState(false);
  const [layout, setLayout] = useState<GraphLayout>("force");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);
  const [filters, setFilters] = useState<GraphFilters>(defaultFilters());
  const [netSearch, setNetSearch] = useState("");
  const [hiddenCount, setHiddenCount] = useState(0);

  // ── analysis state ───────────────────────────────────────────────────────
  const [pairA, setPairA] = useState<string>("");
  const [pairB, setPairB] = useState<string>("");
  const [pathIds, setPathIds] = useState<string[] | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [enrich, setEnrich] = useState<{
    pathways: {
      stId: string;
      name: string;
      pValue: number;
      fdr: number;
      found: number;
      total: number;
    }[];
    message?: string;
    at: number;
  } | null>(null);

  const graphApi = useRef<ForceGraphApi | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // read save slot once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) setSavedAt((JSON.parse(raw) as { savedAt?: number }).savedAt ?? null);
    } catch {
      /* ignore broken save */
    }
  }, []);

  // ── debounced entity search (spec §1) ────────────────────────────────────
  useEffect(() => {
    const q = rawQuery.trim();
    if (q.length < 2) {
      setSuggestions(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchAction({ query: q, species, sources });
        setSuggestions(res.candidates);
      } catch (e) {
        setSuggestions([]);
        const msg = e instanceof Error ? e.message : "";
        toast.error(`جست‌وجو ناموفق بود${msg ? `: ${msg}` : ""}`);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawQuery, species, sources.join(",")]);

  // ── derived graph views ──────────────────────────────────────────────────
  const analysis = useMemo(
    () => (graph ? analyzeGraph(graph.nodes, graph.edges) : null),
    [graph],
  );

  const effFilters = useMemo(
    () => ({ ...filters, minScore: confidence / 100 }),
    [filters, confidence],
  );

  const view = useMemo(
    () => (graph ? filterGraph(graph.nodes, graph.edges, effFilters) : { nodes: [], edges: [] }),
    [graph, effFilters],
  );

  const searchHits = useMemo(() => {
    const q = netSearch.trim().toLowerCase();
    if (!q || !graph) return null;
    const hits = new Set<string>();
    for (const n of graph.nodes) {
      if (n.label.toLowerCase().includes(q)) hits.add(n.id);
      const ids = Object.values(n.ids ?? {}).join(" ").toLowerCase();
      if (ids.includes(q)) hits.add(n.id);
    }
    return hits;
  }, [netSearch, graph]);

  // ── actions ──────────────────────────────────────────────────────────────
  const doBuild = useCallback(
    async (identifiers: string[], queryText: string) => {
      if (!identifiers.length) {
        toast.error("ابتدا یک ژن، پروتئین، بیماری یا پرسش علمی وارد کنید.");
        return;
      }
      setBuilding(true);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setPathIds(null);
      try {
        const g = await buildAction({
          identifiers,
          query: queryText,
          species,
          sources,
          requiredScore: confidence / 100,
          levels,
        });
        const failed = g.statuses.filter((s) => s.status === "failed");
        if (!g.nodes.length) {
          const reason =
            g.statuses.find((s) => s.message && (s.status === "failed" || s.status === "empty"))
              ?.message ?? "موجودیتی در منابع فعال پیدا نشد.";
          toast.error(`شبکه‌ای ساخته نشد: ${reason}`);
        } else {
          setGraph(g);
          toast.success(
            `شبکه ساخته شد: ${faNum(g.nodes.length)} گره و ${faNum(g.edges.length)} یال${g.meta.fromCache ? " (از کش سرور)" : ""}`,
          );
          setTimeout(() => graphApi.current?.fit(), 350);
        }
        for (const f of failed) {
          toast.warning(`${SOURCE_LABELS[f.source]}: ${f.message ?? "خطا"}`);
        }
      } catch (e) {
        toast.error(`ساخت شبکه ناموفق بود: ${e instanceof Error ? e.message : "خطای ناشناخته"}`);
      } finally {
        setBuilding(false);
      }
    },
    [buildAction, species, sources, confidence, levels],
  );

  const handleSearchSubmit = () => {
    const ids = seeds.length ? seeds.map((s) => s.label) : identifiersFrom(rawQuery);
    void doBuild(ids, rawQuery.trim() || ids.join(", "));
  };

  const handleExample = (text: string) => {
    setRawQuery(text);
    setSeeds([]);
    const ids = identifiersFrom(text);
    void doBuild(ids, text);
  };

  const toggleSource = (id: GraphSourceId) => {
    setSources((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) {
          toast.error("دست‌کم یک منبع داده باید فعال بماند.");
          return prev;
        }
        return prev.filter((s) => s !== id);
      }
      return [...prev, id];
    });
  };

  const handleExpand = async (node: GraphNode) => {
    if (!graph) return;
    setExpanding(true);
    try {
      const res = await expandAction({
        node: {
          id: node.id,
          label: node.label,
          kind: node.kind,
          ids: node.ids,
        },
        species,
        sources,
        requiredScore: confidence / 100,
        limit: 10,
      });
      if (!res.nodes.length && !res.edges.length) {
        const reason = res.statuses.find((s) => s.message)?.message ?? "چیز جدیدی پیدا نشد.";
        toast.info(reason);
      } else {
        setGraph((g) => (g ? mergeIntoGraph(g, res) : g));
        toast.success(`${faNum(res.nodes.length)} گره و ${faNum(res.edges.length)} یال جدید اضافه شد.`);
        setTimeout(() => graphApi.current?.fit(), 350);
      }
    } catch (e) {
      toast.error(`گسترش شبکه ناموفق بود: ${e instanceof Error ? e.message : "خطا"}`);
    } finally {
      setExpanding(false);
    }
  };

  const handleEnrich = async () => {
    if (!graph) return;
    const accs = [
      ...new Set(graph.nodes.map((n) => n.ids?.uniprot).filter((x): x is string => !!x)),
    ];
    const fallback = graph.nodes.filter((n) => n.kind === "gene").map((n) => n.label);
    const identifiers = accs.length >= 2 ? accs : fallback;
    if (identifiers.length < 2) {
      toast.error("برای تحلیل غنای مسیرها دست‌کم دو ژن/پروتئین در شبکه لازم است.");
      return;
    }
    setEnriching(true);
    try {
      const res = await enrichAction({ identifiers, limit: 30 });
      setEnrich({ pathways: res.pathways, message: res.message, at: Date.now() });
      if (res.pathways.length) {
        toast.success(`Reactome ${faNum(res.pathways.length)} مسیر غنی‌شده با FDR واقعی برگرداند.`);
      } else {
        toast.error(res.message ?? "نتیجه‌ای از تحلیل غنای مسیرها برنگشت.");
      }
    } catch (e) {
      toast.error(`تحلیل ناموفق بود: ${e instanceof Error ? e.message : "خطا"}`);
    } finally {
      setEnriching(false);
    }
  };

  const findRelation = () => {
    if (!graph || !pairA || !pairB || pairA === pairB) {
      toast.error("دو موجودیت متفاوت انتخاب کنید.");
      return;
    }
    const path = shortestPath(graph.edges, pairA, pairB);
    setPathIds(path);
    if (!path) toast.info("میان این دو گره در شبکهٔ فعلی مسیری وجود ندارد.");
  };

  const shared = useMemo(() => {
    if (!graph || !pairA || !pairB || pairA === pairB) return [];
    return sharedNeighborhood(graph.edges, [pairA, pairB]);
  }, [graph, pairA, pairB]);

  const labelOf = useCallback(
    (id: string) => graph?.nodes.find((n) => n.id === id)?.label ?? id,
    [graph],
  );

  // ── save / restore / export ──────────────────────────────────────────────
  const saveGraph = () => {
    if (!graph) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ savedAt: Date.now(), graph }));
      setSavedAt(Date.now());
      toast.success("شبکه در این مرورگر ذخیره شد.");
    } catch {
      toast.error("ذخیره‌سازی ممکن نشد (حافظهٔ مرورگر پر است).");
    }
  };

  const restoreGraph = () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        toast.info("هنوز شبکه‌ای ذخیره نشده است.");
        return;
      }
      const parsed = JSON.parse(raw) as { graph?: NetworkGraph };
      if (!parsed.graph?.nodes?.length) throw new Error("empty");
      setGraph(parsed.graph);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      toast.success(`شبکهٔ ذخیره‌شده بازیابی شد (${faNum(parsed.graph.nodes.length)} گره).`);
      setTimeout(() => graphApi.current?.fit(), 350);
    } catch {
      toast.error("دیتای ذخیره‌شده قابل بازیابی نیست.");
    }
  };

  const exportJSON = () => {
    if (!graph) return;
    downloadFile(
      `genova-bionetwork-${Date.now()}.json`,
      graphToJSON(graph, analysis ?? undefined),
      "application/json",
    );
    toast.success("خروجی JSON دانلود شد.");
  };

  const exportCSV = () => {
    if (!graph) return;
    downloadFile(`genova-bionetwork-${Date.now()}.csv`, graphToCSV(graph), "text/csv");
    toast.success("خروجی CSV دانلود شد.");
  };

  // ── render ───────────────────────────────────────────────────────────────
  const statuses = graph?.statuses ?? [];
  const score = confidence / 100;

  return (
    <div className="flex min-h-screen flex-col bg-[#eef5f2] text-slate-800" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-emerald-900/8 bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
          <Link
            to="/lab"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white transition-colors hover:bg-emerald-800"
            title="بازگشت به آزمایشگاه"
          >
            <FlaskConical className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-[14px] font-extrabold text-slate-900">
              🧬 Genova BioNetwork Explorer
            </h1>
            <p className="text-[10px] text-slate-400">
              کاوش شبکه‌های زیستی — ژن، پروتئین، بیماری و مسیر زیستی از منابع معتبر
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={restoreGraph}
              disabled={!graph && !savedAt}
              className="cursor-pointer gap-1.5 rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <Upload className="size-3.5" />
              بازیابی
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={saveGraph}
              disabled={!graph}
              className="cursor-pointer gap-1.5 rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <Save className="size-3.5" />
              ذخیره{savedAt ? " ✓" : ""}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportJSON}
              disabled={!graph}
              className="cursor-pointer gap-1.5 rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <Download className="size-3.5" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={!graph}
              className="cursor-pointer gap-1.5 rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <Share2 className="size-3.5" />
              CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-4 px-4 py-5 lg:px-6">
        {/* ── Search hero ─────────────────────────────────────────────────── */}
        <section className="rounded-3xl border border-emerald-900/5 bg-gradient-to-l from-emerald-700 to-teal-600 p-5 text-white shadow-lg shadow-emerald-900/10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">
                جست‌وجوی هوشمند زیستی
              </h2>
              <p className="mt-1 text-[11.5px] text-white/75">
                نام ژن، نماد، شناسهٔ استاندارد یا یک پرسش علمی وارد کنید — نتایج ازSTRING ·
                Reactome · KEGG · UniProt · NCBI Gene · Open Targets زنده بازیابی می‌شوند.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/70">
              <Sparkles className="size-3.5" />
              ژنوا هیچ داده‌ای را جعل نمی‌کند؛ منبع هر گره و یال مشخص است.
            </div>
          </div>

          <div className="relative mt-4">
            <div className="flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-sm">
              <Search className="mr-1 ml-2 size-4 shrink-0 text-slate-400" />
              <input
                value={rawQuery}
                onChange={(e) => setRawQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchSubmit();
                }}
                placeholder="مثال: TP53، ارتباط EGFR با سرطان ریه، مسیرهای AKT1 و MTOR…"
                className="w-full bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-300"
              />
              {searching && <Loader2 className="size-4 shrink-0 animate-spin text-emerald-600" />}
              {!searching && rawQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setRawQuery("");
                    setSuggestions(null);
                  }}
                  className="rounded-lg px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-50"
                >
                  پاک کردن
                </button>
              )}
              <Button
                onClick={handleSearchSubmit}
                disabled={building}
                className="mr-1 h-8 cursor-pointer gap-1.5 rounded-xl bg-emerald-700 px-4 text-white hover:bg-emerald-800"
              >
                {building ? <Loader2 className="size-3.5 animate-spin" /> : <Network className="size-3.5" />}
                ساخت شبکه
              </Button>
            </div>

            {/* suggestions dropdown */}
            {suggestions && suggestions.length > 0 && rawQuery.trim().length >= 2 && (
              <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-emerald-900/10 bg-white p-1.5 shadow-xl">
                {suggestions.map((c) => {
                  const active = seeds.some((s) => s.id === c.id && s.label === c.label);
                  return (
                    <button
                      key={`${c.source}-${c.id}-${c.label}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSeeds((prev) =>
                          prev.some((s) => s.id === c.id && s.label === c.label)
                            ? prev.filter((s) => !(s.id === c.id && s.label === c.label))
                            : [...prev, c],
                        );
                      }}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-right transition-colors",
                        active ? "bg-emerald-50" : "hover:bg-slate-50",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: KIND_COLORS[c.kind] ?? "#64748b" }}
                        />
                        <span className="truncate text-[12.5px] font-bold text-slate-800">
                          {c.label}
                        </span>
                        {c.description && (
                          <span className="hidden truncate text-[10.5px] text-slate-400 sm:inline">
                            {c.description.slice(0, 80)}
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-bold text-slate-500">
                          {c.kind === "gene"
                            ? "ژن"
                            : c.kind === "protein"
                              ? "پروتئین"
                              : c.kind === "disease"
                                ? "بیماری"
                                : c.kind === "pathway"
                                  ? "مسیر"
                                  : "دارو"}
                        </span>
                        <span className="text-[9.5px] font-bold text-emerald-700">
                          {SOURCE_LABELS[c.source]}
                        </span>
                        <span
                          className={cn(
                            "text-[11px] font-extrabold",
                            active ? "text-emerald-600" : "text-slate-300",
                          )}
                        >
                          {active ? "✓" : "+"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* selected seeds */}
          {seeds.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] font-bold text-white/70">موجودیت‌های انتخابی:</span>
              {seeds.map((s) => (
                <span
                  key={`${s.id}-${s.label}`}
                  className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white"
                >
                  {s.label}
                  <button
                    type="button"
                    className="cursor-pointer text-white/70 hover:text-white"
                    onClick={() => setSeeds((prev) => prev.filter((x) => x.id !== s.id || x.label !== s.label))}
                    title="حذف"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* example questions */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] font-bold text-white/70">نمونه پرسش‌ها:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => handleExample(ex)}
                className="cursor-pointer rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10.5px] text-white/85 transition-colors hover:bg-white/20"
              >
                {ex}
              </button>
            ))}
          </div>
        </section>

        {/* ── Controls ────────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-emerald-900/10 bg-white p-3.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            {/* sources */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="ml-1 text-[10.5px] font-extrabold text-slate-400">
                منابع داده:
              </span>
              {ALL_TOGGLES.map((s) => {
                const on = sources.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSource(s.id)}
                    title={s.note ?? SOURCE_LABELS[s.id]}
                    className={cn(
                      "cursor-pointer rounded-full border px-2.5 py-1 text-[10.5px] font-bold transition-colors",
                      on
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-200 bg-white text-slate-400 hover:border-slate-300",
                    )}
                  >
                    {s.label}
                    {s.note ? " ⚠" : ""}
                  </button>
                );
              })}
            </div>

            <Separator orientation="vertical" className="hidden h-8 md:block" />

            {/* species */}
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-extrabold text-slate-400">گونه:</span>
              <Select value={String(species)} onValueChange={(v) => setSpecies(Number(v))}>
                <SelectTrigger className="h-8 w-[168px] cursor-pointer rounded-full border-slate-200 text-[11.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPECIES_OPTIONS.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      <span dir="ltr">{s.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* levels */}
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-extrabold text-slate-400">
                سطوح ارتباطی:
              </span>
              <Select value={String(levels)} onValueChange={(v) => setLevels(Number(v))}>
                <SelectTrigger className="h-8 w-[128px] cursor-pointer rounded-full border-slate-200 text-[11.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">فقط دانه‌ها</SelectItem>
                  <SelectItem value="1">۱ سطح</SelectItem>
                  <SelectItem value="2">۲ سطح</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* confidence */}
            <div className="flex min-w-[210px] flex-1 items-center gap-2">
              <span className="shrink-0 text-[10.5px] font-extrabold text-slate-400">
                آستانهٔ اطمینان {score.toFixed(2)}:
              </span>
              <Slider
                value={[confidence]}
                min={15}
                max={95}
                step={5}
                onValueChange={(v) => setConfidence(v[0])}
                className="flex-1 cursor-pointer"
                aria-label="آستانهٔ اطمینان STRING"
              />
            </div>
          </div>

          {/* graph-only controls */}
          {graph && (
            <>
              <Separator className="my-3" />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
                {/* entity kinds */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="ml-1 text-[10.5px] font-extrabold text-slate-400">
                    نوع موجودیت:
                  </span>
                  {(["gene", "protein", "disease", "pathway", "drug"] as const).map((k) => {
                    const on = filters.kinds.has(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() =>
                          setFilters((f) => {
                            const kinds = new Set(f.kinds);
                            if (on) kinds.delete(k);
                            else kinds.add(k);
                            return { ...f, kinds };
                          })
                        }
                        className={cn(
                          "flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition-all",
                          on ? "text-white" : "bg-white text-slate-300 opacity-70",
                        )}
                        style={
                          on
                            ? { background: KIND_COLORS[k], borderColor: KIND_COLORS[k] }
                            : { borderColor: "#e2e8f0" }
                        }
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ background: on ? "#fff" : KIND_COLORS[k] }}
                        />
                        {k === "gene"
                          ? "ژن"
                          : k === "protein"
                            ? "پروتئین"
                            : k === "disease"
                              ? "بیماری"
                              : k === "pathway"
                                ? "مسیر"
                                : "دارو"}
                      </button>
                    );
                  })}
                </div>

                {/* edge kinds */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="ml-1 text-[10.5px] font-extrabold text-slate-400">
                    نوع ارتباط:
                  </span>
                  {EDGE_KIND_CHIPS.map((k) => {
                    const on = filters.edgeKinds.has(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() =>
                          setFilters((f) => {
                            const edgeKinds = new Set(f.edgeKinds);
                            if (on) edgeKinds.delete(k);
                            else edgeKinds.add(k);
                            return { ...f, edgeKinds };
                          })
                        }
                        className={cn(
                          "cursor-pointer rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors",
                          on
                            ? "border-teal-600 bg-teal-600 text-white"
                            : "border-slate-200 bg-white text-slate-300",
                        )}
                      >
                        {EDGE_KIND_LABELS[k]}
                      </button>
                    );
                  })}
                </div>

                {/* in-network search */}
                <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1">
                  <Search className="size-3.5 text-slate-400" />
                  <input
                    value={netSearch}
                    onChange={(e) => setNetSearch(e.target.value)}
                    placeholder="جست‌وجو در گره‌ها…"
                    className="w-36 bg-transparent text-[11.5px] outline-none placeholder:text-slate-300"
                  />
                  {netSearch && (
                    <button
                      type="button"
                      className="cursor-pointer text-slate-400 hover:text-slate-600"
                      onClick={() => setNetSearch("")}
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                {/* layout */}
                <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
                  {(
                    [
                      ["force", "نیرویی"],
                      ["circle", "دایره‌ای"],
                      ["radial", "شعاعی"],
                      ["grid", "شبکه‌ای"],
                    ] as [GraphLayout, string][]
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setLayout(id)}
                      className={cn(
                        "cursor-pointer rounded-full px-2.5 py-1 text-[10.5px] font-bold transition-colors",
                        layout === id
                          ? "bg-emerald-700 text-white"
                          : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* hide / reset */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!selectedNodeId}
                    onClick={() => {
                      if (!selectedNodeId) return;
                      setFilters((f) => {
                        const hidden = new Set(f.hiddenNodes);
                        hidden.add(selectedNodeId);
                        return { ...f, hiddenNodes: hidden };
                      });
                      setHiddenCount((c) => c + 1);
                      setSelectedNodeId(null);
                    }}
                    className="h-7 cursor-pointer rounded-full text-[10.5px]"
                  >
                    پنهان‌کردن گره انتخابی
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilters({ ...defaultFilters(), hiddenNodes: new Set() });
                      setNetSearch("");
                      setPathIds(null);
                      setHiddenCount(0);
                    }}
                    className="h-7 cursor-pointer gap-1 rounded-full text-[10.5px]"
                  >
                    <RotateCcw className="size-3" />
                    بازنشانی فیلترها
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ── Source statuses + stats ─────────────────────────────────────── */}
        {graph && (
          <section className="space-y-3">
            {/* real per-source status (spec §8) */}
            <div className="flex flex-wrap gap-1.5">
              {statuses.map((s, i) => (
                <span
                  key={`${s.source}-${i}`}
                  title={s.message ?? SOURCE_LABELS[s.source]}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold",
                    s.status === "ok" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                    s.status === "empty" && "border-slate-200 bg-white text-slate-400",
                    s.status === "failed" && "border-rose-200 bg-rose-50 text-rose-600",
                    s.status === "skipped" && "border-amber-200 bg-amber-50 text-amber-600",
                  )}
                >
                  {s.status === "ok" && <span className="size-1.5 rounded-full bg-emerald-500" />}
                  {s.status === "failed" && <AlertTriangle className="size-3" />}
                  {s.status === "skipped" && <span>⏳</span>}
                  {SOURCE_LABELS[s.source]}
                  {s.count != null && ` · ${faNum(s.count)}`}
                  {s.message ? ` — ${s.message.slice(0, 60)}` : ""}
                </span>
              ))}
              {graph.meta.fromCache && (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-600">
                  از کش سرور · {formatDateTime(graph.meta.builtAt)}
                </span>
              )}
            </div>

            {/* stats */}
            {analysis && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { icon: Network, label: "گره", value: faNum(analysis.nodeCount) },
                  { icon: Share2, label: "یال", value: faNum(analysis.edgeCount) },
                  { icon: GitFork, label: "مجموعه متصل", value: faNum(analysis.componentCount) },
                  {
                    icon: GitBranch,
                    label: "بزرگ‌ترین مجموعه",
                    value: faNum(analysis.largestComponent),
                  },
                  { icon: Activity, label: "تراکم", value: analysis.density.toFixed(3) },
                  { icon: Sparkles, label: "میانگین درجه", value: faNum(analysis.avgDegree) },
                ].map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-emerald-900/10 bg-white px-3 py-2.5"
                  >
                    <p className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <Icon className="size-3" /> {label}
                    </p>
                    <p className="mt-0.5 font-mono text-[16px] font-extrabold text-slate-800">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Workspace: graph + details ──────────────────────────────────── */}
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="h-[540px] lg:h-[660px]">
            {graph && analysis ? (
              <ForceGraph
                nodes={view.nodes}
                edges={view.edges}
                metrics={analysis.metrics}
                layout={layout}
                selectedNodeId={selectedNodeId}
                selectedEdgeId={selectedEdgeId}
                searchHits={searchHits}
                pathIds={pathIds}
                onSelectNode={setSelectedNodeId}
                onSelectEdge={setSelectedEdgeId}
                apiRef={graphApi}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-emerald-900/15 bg-white/70 p-6 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50">
                  <Network className="size-7 text-emerald-600" />
                </div>
                <p className="text-[13.5px] font-extrabold text-slate-700">
                  شبکه‌ای هنوز ساخته نشده است
                </p>
                <p className="max-w-md text-[11.5px] leading-6 text-slate-400">
                  یک ژن (مثل TP53)، یک پرسش علمی یا یکی از نمونه‌پرسش‌های بالا را وارد کنید تا
                  شبکهٔ ارتباطات زیستی از منابع واقعی ساخته شود.
                </p>
              </div>
            )}
          </div>

          <div className="h-[540px] lg:h-[660px]">
            {graph && analysis && (selectedNodeId || selectedEdgeId) ? (
              <EntityDetailsPanel
                graph={graph}
                analysis={analysis}
                selectedNodeId={selectedNodeId}
                selectedEdgeId={selectedEdgeId}
                expanding={expanding}
                onExpand={(n) => void handleExpand(n)}
                onSelectNode={setSelectedNodeId}
                onSelectEdge={setSelectedEdgeId}
                onClose={() => {
                  setSelectedNodeId(null);
                  setSelectedEdgeId(null);
                }}
              />
            ) : graph && analysis ? (
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-900/10 bg-white">
                <div className="border-b border-emerald-900/8 px-4 py-3">
                  <p className="text-[10px] font-bold text-slate-400">تحلیل شبکه</p>
                  <h3 className="text-[13.5px] font-extrabold text-slate-900">
                    گره‌های کلیدی و پل‌های ارتباطی
                  </h3>
                </div>
                <ScrollArea className="flex-1 px-4 py-3">
                  <p className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold text-emerald-700">
                    <Activity className="size-3.5" /> بیشترین ارتباط (Degree)
                  </p>
                  <div className="space-y-1">
                    {analysis.hubs.map((h, i) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setSelectedNodeId(h.id)}
                        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-right transition-colors hover:border-emerald-300 hover:bg-emerald-50/60"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="w-4 text-[10px] font-bold text-slate-300">
                            {faNum(i + 1)}
                          </span>
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: KIND_COLORS[h.kind] ?? "#64748b" }}
                          />
                          <span className="truncate text-[11.5px] font-bold text-slate-700">
                            {h.label}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-slate-400">
                          {faNum(h.degree)}° · {h.weightedDegree.toFixed(1)}w
                        </span>
                      </button>
                    ))}
                  </div>

                  <Separator className="my-3" />

                  <p className="mb-1.5 flex items-center gap-1 text-[11px] font-extrabold text-sky-700">
                    <GitBranch className="size-3.5" /> پل‌های شبکه (Betweenness)
                  </p>
                  <div className="space-y-1">
                    {analysis.bridges.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedNodeId(b.id)}
                        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-right transition-colors hover:border-sky-300 hover:bg-sky-50/60"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: KIND_COLORS[b.kind] ?? "#64748b" }}
                          />
                          <span className="truncate text-[11.5px] font-bold text-slate-700">
                            {b.label}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-slate-400">
                          {b.betweenness.toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>

                  <p className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] leading-5 text-slate-400">
                    برای دیدن جزئیات هر گره (شناسه‌ها، شاخص‌ها، ارتباطات و لینک منبع) روی آن در
                    شبکه کلیک کنید؛ با کلیک روی هر یال، شواهد پشتیبان و مقیاس امتیاز آن نمایش
                    داده می‌شود.
                  </p>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-900/15 bg-white/70 p-6 text-center">
                <Sparkles className="size-6 text-emerald-500" />
                <p className="text-[12px] font-bold text-slate-500">
                  پنل جزئیات پس از ساخت شبکه
                </p>
                <p className="text-[11px] text-slate-400">
                  آمار شبکه، گره‌های کلیدی و تحلیل‌ها اینجا نمایش داده می‌شوند.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Relation finder + enrichment ────────────────────────────────── */}
        {graph && (
          <div className="grid gap-3 md:grid-cols-2">
            {/* shortest path + shared neighbourhood */}
            <section className="rounded-2xl border border-emerald-900/10 bg-white p-4">
              <h3 className="text-[13px] font-extrabold text-slate-800">
                <GitFork className="mb-1 inline size-4 text-emerald-700" /> تحلیل رابطه میان دو
                موجودیت
              </h3>
              <p className="mt-1 text-[10.5px] text-slate-400">
                مسیر کوتاه‌ترین ارتباط (BFS روی یال‌های واقعی) و همسایه‌های مشترک.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select value={pairA} onValueChange={setPairA}>
                  <SelectTrigger className="h-8 w-[150px] cursor-pointer rounded-lg text-[11.5px]">
                    <SelectValue placeholder="موجودیت اول" />
                  </SelectTrigger>
                  <SelectContent>
                    {graph.nodes.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[11px] font-bold text-slate-300">←→</span>
                <Select value={pairB} onValueChange={setPairB}>
                  <SelectTrigger className="h-8 w-[150px] cursor-pointer rounded-lg text-[11.5px]">
                    <SelectValue placeholder="موجودیت دوم" />
                  </SelectTrigger>
                  <SelectContent>
                    {graph.nodes.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={findRelation}
                  className="h-8 cursor-pointer gap-1 rounded-full bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  بررسی رابطه
                </Button>
                {pathIds && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPathIds(null)}
                    className="h-8 cursor-pointer rounded-full text-[10.5px]"
                  >
                    پاک کردن مسیر
                  </Button>
                )}
              </div>

              {pathIds && (
                <div className="mt-3 rounded-xl border border-emerald-900/10 bg-emerald-50/50 p-2.5">
                  <p className="text-[10.5px] font-bold text-emerald-800">
                    {pathIds.length > 1
                      ? `مسیر ${faNum(pathIds.length - 1)} پله‌ای:`
                      : "این دو یکی هستند."}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {pathIds.map((id, i) => (
                      <span key={id} className="flex items-center gap-1">
                        {i > 0 && <span className="text-[10px] text-emerald-400">—</span>}
                        <button
                          type="button"
                          onClick={() => setSelectedNodeId(id)}
                          className="cursor-pointer rounded-full bg-white px-2 py-0.5 text-[10.5px] font-bold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
                        >
                          {labelOf(id)}
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {shared.length > 0 && (
                <div className="mt-2.5 rounded-xl border border-sky-100 bg-sky-50/60 p-2.5">
                  <p className="text-[10.5px] font-bold text-sky-800">
                    همسایه‌های مشترک ({faNum(shared.length)}):
                  </p>
                  <div className="mt-1.5 flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                    {shared.slice(0, 20).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedNodeId(s.id)}
                        className="cursor-pointer rounded-full bg-white px-2 py-0.5 text-[10.5px] font-bold text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100"
                      >
                        {labelOf(s.id)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Reactome enrichment */}
            <section className="rounded-2xl border border-emerald-900/10 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-[13px] font-extrabold text-slate-800">
                    <Sparkles className="mb-1 inline size-4 text-violet-600" /> Pathway Enrichment
                    Analysis
                  </h3>
                  <p className="mt-1 text-[10.5px] text-slate-400">
                    over-representation واقعی توسط Reactome AnalysisService (p-value و FDR از
                    خود Reactome).
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => void handleEnrich()}
                  disabled={enriching}
                  className="h-8 cursor-pointer gap-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700"
                >
                  {enriching ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  اجرای تحلیل
                </Button>
              </div>

              {enrich && (
                <div className="mt-3">
                  {enrich.message && !enrich.pathways.length && (
                    <p className="rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] text-rose-600">
                      {enrich.message}
                    </p>
                  )}
                  {enrich.pathways.length > 0 && (
                    <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
                      <table className="w-full text-right text-[11px]">
                        <thead className="sticky top-0 bg-slate-50 text-[10px] text-slate-400">
                          <tr>
                            <th className="px-2.5 py-1.5 font-bold">مسیر زیستی</th>
                            <th className="px-2 py-1.5 font-bold">FDR</th>
                            <th className="px-2 py-1.5 font-bold">p-value</th>
                            <th className="px-2 py-1.5 font-bold">یافت‌شده</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...enrich.pathways]
                            .sort((a, b) => a.fdr - b.fdr)
                            .slice(0, 20)
                            .map((p) => (
                              <tr key={p.stId} className="border-t border-slate-100">
                                <td className="px-2.5 py-1.5">
                                  <a
                                    href={`https://reactome.org/PathwayBrowser/#/${p.stId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold text-slate-700 hover:text-violet-700"
                                  >
                                    {p.name.length > 46 ? `${p.name.slice(0, 45)}…` : p.name}
                                  </a>
                                </td>
                                <td
                                  className="px-2 py-1.5 font-mono font-bold"
                                  style={{
                                    color: p.fdr < 0.05 ? "#059669" : p.fdr < 0.1 ? "#d97706" : "#94a3b8",
                                  }}
                                >
                                  {p.fdr.toExponential(1)}
                                </td>
                                <td className="px-2 py-1.5 font-mono text-slate-500">
                                  {p.pValue.toExponential(1)}
                                </td>
                                <td className="px-2 py-1.5 font-mono text-slate-500">
                                  {faNum(p.found)}/{faNum(p.total)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {!enrich && (
                <p className="mt-3 rounded-lg bg-slate-50 px-2.5 py-2 text-[10.5px] leading-5 text-slate-400">
                  پس از ساخت شبکه، این دکمه شناسه‌های استاندارد گره‌ها (UniProt/نماد ژن) را به
                  Reactome می‌فرستد و مسیرهای غنی‌شده را با آمار واقعی برمی‌گرداند.
                </p>
              )}
            </section>
          </div>
        )}

        {/* scientific-accuracy note (spec §8) */}
        <section className="rounded-2xl border border-emerald-900/10 bg-white/80 p-4">
          <p className="flex items-start gap-2 text-[11px] leading-6 text-slate-500">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <span>
              <b className="text-slate-700">دقت علمی:</b> امتیاز STRING اطمینان «ارتباط عملکردی»
              است نه لزوماً تعامل فیزیکی مستقیم؛ ارتباط ژن–بیماری به‌معنای اثبات علت و معلول نیست؛
              شواهد تجربی، پایگاه‌داده‌ای، پیش‌بینی‌شده و کاوش متنی در پنل هر یال از هم قابل
              تشخیص‌اند. اگر منبعی در دسترس نباشد، وضعیت واقعی آن همین‌جا نمایش داده می‌شود و
              هیچ داده‌ای جعل نمی‌شود. GeneCards بدون مجوز API غیرفعال است.
            </span>
          </p>
        </section>
      </main>

      {/* footer */}
      <footer className="mt-auto border-t border-emerald-900/8 bg-white/70 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 text-[10.5px] text-slate-400 lg:px-6">
          <span>
            Genova BioNetwork Explorer — منابع: STRING · Reactome · KEGG · UniProt · NCBI Gene ·
            Open Targets
          </span>
          <Link to="/lab" className="font-bold text-emerald-700 hover:text-emerald-800">
            بازگشت به آزمایشگاه مجازی ←
          </Link>
        </div>
      </footer>
    </div>
  );
}
