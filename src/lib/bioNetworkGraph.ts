/**
 * Genova BioNetwork Explorer — real graph analysis (pure, client-side).
 * ─────────────────────────────────────────────────────────────────────────────
 * All metrics are computed on the ACTUAL edges fetched from the sources —
 * nothing here invents or fakes a statistic:
 *
 *   Degree / Weighted Degree   sum of edges (weight = source confidence)
 *   Betweenness Centrality     Brandes' algorithm (unweighted, hop-based)
 *   Connected components       BFS labelling
 *   Shortest path              BFS between any two nodes
 *   Shared neighbourhood       common partners of two or three entities
 *   Density                    2E / N(N−1) on the undirected projection
 *
 * Directed edges (pathway containment, gene→protein) are treated as
 * undirected for connectivity metrics, which is the standard projection
 * used by network-analysis tools; direction is preserved for display.
 */
import type { GraphEdge, GraphNode, NetworkGraph } from "@/convex/bioNetworkAdapters";

export interface NodeMetrics {
  id: string;
  degree: number;
  weightedDegree: number;
  betweenness: number;
  component: number;
}

export interface GraphAnalysis {
  nodeCount: number;
  edgeCount: number;
  density: number;
  componentCount: number;
  largestComponent: number;
  isolateCount: number;
  /** mean degree — quick sanity figure for the stats bar. */
  avgDegree: number;
  metrics: Record<string, NodeMetrics>;
  /** top hubs by degree (then weighted degree). */
  hubs: { id: string; label: string; kind: string; degree: number; weightedDegree: number; betweenness: number }[];
  /** top nodes by betweenness (bridges of the network). */
  bridges: { id: string; label: string; kind: string; betweenness: number; degree: number }[];
}

function edgeWeight(e: GraphEdge): number {
  return typeof e.score === "number" && e.score > 0 ? e.score : 1;
}

/** Undirected adjacency (both directed and undirected edges projected). */
function adjacency(
  nodes: GraphNode[],
  edges: GraphEdge[],
): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    if (!adj.has(e.source) || !adj.has(e.target)) continue;
    adj.get(e.source)!.push(e.target);
    adj.get(e.target)!.push(e.source);
  }
  return adj;
}

/** Brandes' algorithm — betweenness centrality on the undirected projection. */
function betweenness(adj: Map<string, string[]>): Map<string, number> {
  const nodes = [...adj.keys()];
  const bc = new Map<string, number>(nodes.map((n) => [n, 0]));

  for (const s of nodes) {
    const stack: string[] = [];
    const pred = new Map<string, string[]>();
    const sigma = new Map<string, number>(nodes.map((n) => [n, 0]));
    const dist = new Map<string, number>(nodes.map((n) => [n, -1]));
    sigma.set(s, 1);
    dist.set(s, 0);

    const queue: string[] = [s];
    let qi = 0;
    while (qi < queue.length) {
      const v = queue[qi++];
      stack.push(v);
      for (const w of adj.get(v) ?? []) {
        const dw = dist.get(w)!;
        if (dw < 0) {
          dist.set(w, dist.get(v)! + 1);
          queue.push(w);
        }
        if (dist.get(w) === dist.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          const list = pred.get(w);
          if (list) list.push(v);
          else pred.set(w, [v]);
        }
      }
    }

    const delta = new Map<string, number>(nodes.map((n) => [n, 0]));
    while (stack.length) {
      const w = stack.pop()!;
      const sw = sigma.get(w)!;
      for (const v of pred.get(w) ?? []) {
        if (sw > 0) delta.set(v, delta.get(v)! + (sigma.get(v)! / sw) * (1 + delta.get(w)!));
      }
      if (w !== s) bc.set(w, bc.get(w)! + delta.get(w)!);
    }
  }

  // undirected projection → divide by 2 (Brandes, eq. (7))
  for (const [k, v] of bc) bc.set(k, v / 2);
  return bc;
}

/** Compute every metric the stats panel and node details need. */
export function analyzeGraph(nodes: GraphNode[], edges: GraphEdge[]): GraphAnalysis {
  const adj = adjacency(nodes, edges);
  const bc = betweenness(adj);

  // weighted degree
  const wDeg = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (const e of edges) {
    if (!wDeg.has(e.source) || !wDeg.has(e.target)) continue;
    const w = edgeWeight(e);
    wDeg.set(e.source, (wDeg.get(e.source) ?? 0) + w);
    wDeg.set(e.target, (wDeg.get(e.target) ?? 0) + w);
  }

  // connected components (BFS)
  const component = new Map<string, number>();
  let componentCount = 0;
  let largestComponent = 0;
  for (const n of nodes) {
    if (component.has(n.id)) continue;
    const idx = componentCount++;
    const queue = [n.id];
    component.set(n.id, idx);
    let size = 0;
    while (queue.length) {
      const v = queue.pop()!;
      size++;
      for (const w of adj.get(v) ?? []) {
        if (!component.has(w)) {
          component.set(w, idx);
          queue.push(w);
        }
      }
    }
    largestComponent = Math.max(largestComponent, size);
  }

  const metrics: Record<string, NodeMetrics> = {};
  let degreeSum = 0;
  let isolateCount = 0;
  for (const n of nodes) {
    const degree = (adj.get(n.id) ?? []).length;
    degreeSum += degree;
    if (degree === 0) isolateCount++;
    metrics[n.id] = {
      id: n.id,
      degree,
      weightedDegree: Math.round((wDeg.get(n.id) ?? 0) * 1000) / 1000,
      betweenness: Math.round((bc.get(n.id) ?? 0) * 1000) / 1000,
      component: component.get(n.id) ?? -1,
    };
  }

  const hubs = nodes
    .map((n) => ({
      id: n.id,
      label: n.label,
      kind: n.kind,
      degree: metrics[n.id].degree,
      weightedDegree: metrics[n.id].weightedDegree,
      betweenness: metrics[n.id].betweenness,
    }))
    .sort((a, b) => b.degree - a.degree || b.weightedDegree - a.weightedDegree)
    .slice(0, 10);

  const bridges = nodes
    .map((n) => ({
      id: n.id,
      label: n.label,
      kind: n.kind,
      betweenness: metrics[n.id].betweenness,
      degree: metrics[n.id].degree,
    }))
    .sort((a, b) => b.betweenness - a.betweenness)
    .slice(0, 8);

  const n = nodes.length;
  const density = n > 1 ? (2 * edges.length) / (n * (n - 1)) : 0;

  return {
    nodeCount: n,
    edgeCount: edges.length,
    density: Math.round(density * 10000) / 10000,
    componentCount,
    largestComponent,
    isolateCount,
    avgDegree: n > 0 ? Math.round(((2 * edges.length) / n) * 100) / 100 : 0,
    metrics,
    hubs,
    bridges,
  };
}

/** BFS shortest path (fewest hops) between two node ids. */
export function shortestPath(
  edges: GraphEdge[],
  from: string,
  to: string,
): string[] | null {
  if (from === to) return [from];
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    if (!adj.has(e.target)) adj.set(e.target, []);
    adj.get(e.source)!.push(e.target);
    adj.get(e.target)!.push(e.source);
  }
  const prev = new Map<string, string>();
  const seen = new Set<string>([from]);
  const queue = [from];
  let qi = 0;
  while (qi < queue.length) {
    const v = queue[qi++];
    for (const w of adj.get(v) ?? []) {
      if (seen.has(w)) continue;
      seen.add(w);
      prev.set(w, v);
      if (w === to) {
        const path = [to];
        let cur = to;
        while (prev.has(cur)) {
          cur = prev.get(cur)!;
          path.unshift(cur);
        }
        return path;
      }
      queue.push(w);
    }
  }
  return null;
}

/** Entities shared by two (or three) seeds — spec §4 «ارتباطات مشترک». */
export function sharedNeighborhood(
  edges: GraphEdge[],
  ids: string[],
): { id: string; from: string[] }[] {
  if (ids.length < 2) return [];
  const neighbours = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!neighbours.has(e.source)) neighbours.set(e.source, new Set());
    if (!neighbours.has(e.target)) neighbours.set(e.target, new Set());
    neighbours.get(e.source)!.add(e.target);
    neighbours.get(e.target)!.add(e.source);
  }
  const sets = ids.map((id) => neighbours.get(id) ?? new Set<string>());
  const candidates = new Set<string>();
  for (const s of sets) for (const id of s) candidates.add(id);

  const out: { id: string; from: string[] }[] = [];
  for (const cand of candidates) {
    if (ids.includes(cand)) continue;
    const from = ids.filter((_, i) => sets[i].has(cand));
    if (from.length >= 2) out.push({ id: cand, from });
  }
  return out.sort((a, b) => b.from.length - a.from.length);
}

// ═══════════════════════════════════════════════════════════════════════════
//  Filtering (spec §5)
// ═══════════════════════════════════════════════════════════════════════════

export interface GraphFilters {
  /** Visible entity kinds (gene / protein / disease / pathway / drug). */
  kinds: Set<string>;
  /** Visible edge source databases (string / reactome / kegg / opentargets…). */
  sources: Set<string>;
  /** Visible edge kinds (protein_interaction / gene_pathway / …). */
  edgeKinds: Set<string>;
  /** Evidence channels required on an edge (spec §5 «نوع شواهد»).
   *  Empty set = no evidence filter. Edges without an evidence breakdown
   *  (non-STRING relations) always pass — their type is already visible. */
  evidenceKinds: Set<string>;
  /** STRING / Open Targets confidence floor (0–1). Edges without a score pass. */
  minScore: number;
  /** Explicitly hidden node ids (and their edges). */
  hiddenNodes: Set<string>;
}

export function defaultFilters(): GraphFilters {
  return {
    kinds: new Set(["gene", "protein", "disease", "pathway", "drug"]),
    sources: new Set(["string", "reactome", "kegg", "uniprot", "ncbi", "opentargets"]),
    edgeKinds: new Set([
      "protein_interaction",
      "gene_pathway",
      "gene_disease",
      "gene_protein",
      "pathway_hierarchy",
    ]),
    evidenceKinds: new Set<string>(),
    minScore: 0,
    hiddenNodes: new Set(),
  };
}

export function filterGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  f: GraphFilters,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const visibleNodes = nodes.filter((n) => f.kinds.has(n.kind) && !f.hiddenNodes.has(n.id));
  const ids = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = edges.filter(
    (e) =>
      ids.has(e.source) &&
      ids.has(e.target) &&
      f.sources.has(e.sourceDb) &&
      f.edgeKinds.has(e.kind) &&
      (f.evidenceKinds.size === 0 ||
        !e.evidence?.length ||
        e.evidence.some((ev) => f.evidenceKinds.has(ev.kind))) &&
      (typeof e.score !== "number" || e.score >= f.minScore),
  );
  return { nodes: visibleNodes, edges: visibleEdges };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Export (spec §7 — save / restore / export)
// ═══════════════════════════════════════════════════════════════════════════

export function graphToJSON(graph: NetworkGraph, analysis?: GraphAnalysis): string {
  return JSON.stringify(
    {
      generator: "Genova BioNetwork Explorer",
      exportedAt: new Date().toISOString(),
      meta: graph.meta,
      statuses: graph.statuses,
      nodes: graph.nodes,
      edges: graph.edges,
      analysis: analysis
        ? {
            density: analysis.density,
            components: analysis.componentCount,
            avgDegree: analysis.avgDegree,
            metrics: analysis.metrics,
          }
        : undefined,
    },
    null,
    2,
  );
}

/** CSV with one row per edge (source/target ids, kind, db, score, note). */
export function graphToCSV(graph: NetworkGraph): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const head = [
    "source_id",
    "source_label",
    "target_id",
    "target_label",
    "edge_kind",
    "source_db",
    "directed",
    "score",
    "score_note",
    "label",
  ];
  const rows = graph.edges.map((e) =>
    [
      e.source,
      esc(byId.get(e.source)?.label ?? e.source),
      e.target,
      esc(byId.get(e.target)?.label ?? e.target),
      e.kind,
      e.sourceDb,
      String(e.directed),
      e.score != null ? String(e.score) : "",
      esc(e.scoreNote ?? ""),
      esc(e.label),
    ].join(","),
  );
  return [head.join(","), ...rows].join("\n");
}
