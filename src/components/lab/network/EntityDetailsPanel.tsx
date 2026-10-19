/**
 * BioNetwork Explorer — details panel for the selected node or edge (spec §6).
 * Shows identity, standard ids, real source links, network metrics, incident
 * connections — or, for an edge: relation, direction, confidence with its
 * exact scale, and the supporting evidence channels reported by the source.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/format";
import type { GraphEdge, GraphNode, NetworkGraph } from "@/convex/bioNetworkAdapters";
import { SOURCE_LABELS } from "@/convex/bioNetworkAdapters";
import type { GraphAnalysis } from "@/lib/bioNetworkGraph";
import {
  KIND_COLORS,
  KIND_LABELS,
  SOURCE_EDGE_COLORS,
} from "@/components/lab/network/ForceGraph";
import {
  Activity,
  ArrowLeftRight,
  ExternalLink,
  GitBranch,
  Network,
  Target,
  X,
} from "lucide-react";

export const EDGE_KIND_LABELS: Record<string, string> = {
  protein_interaction: "ارتباط عملکردی پروتئین‌ها",
  gene_pathway: "عضویت در مسیر زیستی",
  gene_disease: "ارتباط ژن–بیماری",
  gene_protein: "رمزگذاری پروتئین",
  pathway_hierarchy: "سلسله‌مراتب مسیرها",
};

const ID_LABELS: Record<string, string> = {
  symbol: "نماد ژن",
  entrez: "Entrez (NCBI)",
  uniprot: "UniProt",
  stringId: "STRING",
  kegg: "KEGG",
  ensembl: "Ensembl",
  query: "عبارت ورودی",
  ensemblDisease: "شناسهٔ بیماری",
  officialName: "نام رسمی",
};

function sourceLink(kind: string, value: string): string | null {
  switch (kind) {
    case "entrez":
      return `https://www.ncbi.nlm.nih.gov/gene/${value}`;
    case "uniprot":
      return `https://www.uniprot.org/uniprotkb/${value}/entry`;
    case "stringId":
      return `https://string-db.org/network?identifiers=${encodeURIComponent(value)}`;
    case "kegg":
      return `https://www.kegg.jp/entry/${value}`;
    case "ensembl":
      return `https://platform.opentargets.org/target/${value}`;
    default:
      return null;
  }
}

interface Props {
  graph: NetworkGraph;
  analysis: GraphAnalysis;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  expanding: boolean;
  onExpand: (node: GraphNode) => void;
  onSelectNode: (id: string) => void;
  onSelectEdge: (id: string) => void;
  onClose: () => void;
}

export function EntityDetailsPanel({
  graph,
  analysis,
  selectedNodeId,
  selectedEdgeId,
  expanding,
  onExpand,
  onSelectNode,
  onSelectEdge,
  onClose,
}: Props) {
  const node = selectedNodeId ? graph.nodes.find((n) => n.id === selectedNodeId) : null;
  const edge = selectedEdgeId ? graph.edges.find((e) => e.id === selectedEdgeId) : null;
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  if (!node && !edge) return null;

  // ── EDGE view ────────────────────────────────────────────────────────────
  if (edge && !node) {
    const a = byId.get(edge.source);
    const b = byId.get(edge.target);
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-900/10 bg-white">
        <div className="flex items-start justify-between gap-2 border-b border-emerald-900/8 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400">جزئیات ارتباط</p>
            <h3 className="mt-0.5 text-[13.5px] font-extrabold leading-6 text-slate-900">
              {edge.label}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
            title="بستن"
          >
            <X className="size-4" />
          </button>
        </div>

        <ScrollArea className="flex-1 px-4 py-3">
          <div className="space-y-3">
            {/* endpoints */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[a, b].map(
                (n, i) =>
                  n && (
                    <button
                      key={n.id + i}
                      type="button"
                      onClick={() => onSelectNode(n.id)}
                      className="cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors"
                      style={{
                        borderColor: KIND_COLORS[n.kind],
                        color: KIND_COLORS[n.kind],
                      }}
                    >
                      {n.label}
                      {i === 0 ? " ←→ " : ""}
                    </button>
                  ),
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge
                className="bg-slate-100 text-slate-600"
                style={{ background: `${SOURCE_EDGE_COLORS[edge.sourceDb]}1a` }}
              >
                <span style={{ color: SOURCE_EDGE_COLORS[edge.sourceDb] }}>
                  {SOURCE_LABELS[edge.sourceDb]}
                </span>
              </Badge>
              <Badge variant="outline" className="text-[10px] text-slate-500">
                {EDGE_KIND_LABELS[edge.kind] ?? edge.kind}
              </Badge>
              <Badge variant="outline" className="text-[10px] text-slate-500">
                {edge.directed ? "جهت‌دار ⟶" : "بدون جهت"}
              </Badge>
            </div>

            {/* confidence */}
            {edge.score != null && (
              <div className="rounded-xl border border-emerald-900/8 bg-emerald-50/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800">امتیاز اطمینان</span>
                  <span className="font-mono text-[13px] font-extrabold text-emerald-700">
                    {edge.score.toFixed(3)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-emerald-600"
                    style={{ width: `${Math.round(edge.score * 100)}%` }}
                  />
                </div>
                {edge.scoreNote && (
                  <p className="mt-2 text-[10.5px] leading-5 text-emerald-900/70">{edge.scoreNote}</p>
                )}
              </div>
            )}

            {/* evidence channels */}
            {(edge.evidence?.length ?? 0) > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-extrabold text-slate-700">شواهد پشتیبان</p>
                <div className="space-y-1.5">
                  {edge.evidence!.map((ev) => (
                    <div key={ev.kind} className="rounded-lg border border-slate-200 px-2.5 py-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700">{ev.label}</span>
                        <span className="font-mono font-bold text-slate-500">
                          {ev.score != null ? ev.score.toFixed(3) : "—"}
                        </span>
                      </div>
                      {ev.score != null && (
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.round(ev.score * 100)}%`,
                              background: SOURCE_EDGE_COLORS[edge.sourceDb] ?? "#64748b",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {edge.description && (
              <p className="text-[11.5px] leading-6 text-slate-600">{edge.description}</p>
            )}
            {(edge.citations?.length ?? 0) > 0 && (
              <p className="text-[10.5px] text-slate-400">
                استنادها: {edge.citations!.join("، ")}
              </p>
            )}

            <p className="rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] leading-5 text-slate-400">
              این ارتباط عیناً از {SOURCE_LABELS[edge.sourceDb]} بازیابی شده و بدون ویرایش نمایش
              داده می‌شود.
            </p>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // ── NODE view ────────────────────────────────────────────────────────────
  if (!node) return null;
  const m = analysis.metrics[node.id];
  const incident = graph.edges.filter((e) => e.source === node.id || e.target === node.id);
  const color = KIND_COLORS[node.kind] ?? "#64748b";
  const extraEntries = Object.entries(node.extra ?? {}).filter(([, v]) => v.trim());

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-900/10 bg-white">
      <div className="flex items-start justify-between gap-2 border-b border-emerald-900/8 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: color }} />
            <span className="text-[10px] font-bold" style={{ color }}>
              {KIND_LABELS[node.kind] ?? node.kind}
            </span>
            {node.isSeed && (
              <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                موجودیت جست‌وجوشده
              </span>
            )}
          </div>
          <h3 className="mt-1 truncate text-[15px] font-extrabold tracking-tight text-slate-900">
            {node.label}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
          title="بستن"
        >
          <X className="size-4" />
        </button>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3">
          {/* source badges */}
          <div className="flex flex-wrap gap-1.5">
            {node.sources.map((s) => (
              <span
                key={s}
                className="rounded-full px-2 py-0.5 text-[9.5px] font-bold"
                style={{
                  background: `${SOURCE_EDGE_COLORS[s] ?? "#64748b"}14`,
                  color: SOURCE_EDGE_COLORS[s] ?? "#64748b",
                }}
              >
                {SOURCE_LABELS[s]}
              </span>
            ))}
          </div>

          {node.description && (
            <p className="text-[11.5px] leading-6 text-slate-600">{node.description}</p>
          )}

          {/* curated facts */}
          {extraEntries.length > 0 && (
            <div className="space-y-1.5">
              {extraEntries.map(([k, v]) => (
                <div key={k} className="rounded-lg border border-slate-200 px-2.5 py-1.5">
                  <p className="text-[9.5px] font-bold text-slate-400">
                    {k === "proteinName"
                      ? "پروتئین حاصل"
                      : k === "function"
                        ? "عملکرد (UniProt)"
                        : k === "ncbiSummary"
                          ? "خلاصهٔ رسمی NCBI"
                          : k === "officialName"
                            ? "نام رسمی ژن"
                            : k === "mapLocation"
                              ? "موقعیت کروموزومی"
                              : k === "aliases"
                                ? "نام‌های دیگر"
                                : k === "chromosome"
                                  ? "کروموزوم"
                                  : k === "formula"
                                    ? "فرمول"
                                    : k === "indication"
                                      ? "کاربرد درمانی"
                                      : k === "definition"
                                        ? "تعریف"
                                        : k === "inDisease"
                                          ? "مرتبط با بیماری (Reactome)"
                                          : k}
                  </p>
                  <p className="mt-0.5 line-clamp-4 text-[11px] leading-5 text-slate-700">{v}</p>
                </div>
              ))}
            </div>
          )}

          {/* standard ids */}
          {node.ids && Object.keys(node.ids).length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-extrabold text-slate-700">شناسه‌های استاندارد</p>
              <div className="space-y-1">
                {Object.entries(node.ids)
                  .filter(([k]) => k !== "query")
                  .map(([k, v]) => {
                    const link = sourceLink(k, v);
                    return (
                      <div
                        key={k}
                        className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5"
                      >
                        <span className="text-[10px] font-bold text-slate-400">
                          {ID_LABELS[k] ?? k}
                        </span>
                        <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                          <span dir="ltr">{v}</span>
                          {link && (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 transition-colors hover:text-emerald-800"
                              title="بازکردن رکورد در منبع"
                            >
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* metrics */}
          {m && (
            <div>
              <p className="mb-1.5 text-[11px] font-extrabold text-slate-700">شاخص‌های شبکه</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { icon: Network, label: "Degree", value: faNum(m.degree) },
                  { icon: Activity, label: "Weighted Degree", value: faNum(m.weightedDegree) },
                  { icon: GitBranch, label: "Betweenness", value: faNum(m.betweenness) },
                  { icon: Target, label: "مجموعه متصل", value: faNum(m.component + 1) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-lg border border-slate-200 px-2.5 py-1.5">
                    <p className="flex items-center gap-1 text-[9.5px] font-bold text-slate-400">
                      <Icon className="size-3" /> {label}
                    </p>
                    <p className="mt-0.5 font-mono text-[13px] font-extrabold text-slate-800">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* expand */}
          <Button
            size="sm"
            onClick={() => onExpand(node)}
            disabled={expanding}
            className="w-full cursor-pointer gap-1.5 rounded-full bg-emerald-700 text-white hover:bg-emerald-800"
          >
            {expanding ? (
              <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <ArrowLeftRight className="size-3.5" />
            )}
            افزودن ارتباطات جدید به شبکه
          </Button>

          <Separator />

          {/* incident connections */}
          <div>
            <p className="mb-1.5 text-[11px] font-extrabold text-slate-700">
              ارتباطات قابل مشاهده ({faNum(incident.length)})
            </p>
            <div className="space-y-1">
              {incident.slice(0, 14).map((e) => {
                const otherId = e.source === node.id ? e.target : e.source;
                const other = byId.get(otherId);
                if (!other) return null;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onSelectEdge(e.id)}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-right transition-colors hover:border-emerald-300 hover:bg-emerald-50/50",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: KIND_COLORS[other.kind] ?? "#64748b" }}
                      />
                      <span className="truncate text-[11px] font-bold text-slate-700">
                        {other.label}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className="text-[9.5px] text-slate-400">
                        {EDGE_KIND_LABELS[e.kind] ?? e.kind}
                      </span>
                      {e.score != null && (
                        <span className="rounded bg-slate-100 px-1 font-mono text-[9.5px] font-bold text-slate-500">
                          {e.score.toFixed(2)}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
              {incident.length > 14 && (
                <p className="pt-0.5 text-[10px] text-slate-400">
                  و {faNum(incident.length - 14)} ارتباط دیگر…
                </p>
              )}
              {incident.length === 0 && (
                <p className="rounded-lg bg-slate-50 px-2.5 py-2 text-[10.5px] text-slate-400">
                  برای این گره ارتباطی در شبکه فعلی نیست — با دکمهٔ بالا آن را گسترش دهید.
                </p>
              )}
            </div>
          </div>

          {node.url && (
            <a
              href={node.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-emerald-200 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
            >
              <ExternalLink className="size-3.5" />
              مشاهدهٔ رکورد اصلی در منبع
            </a>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
