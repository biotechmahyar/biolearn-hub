/**
 * Genova BioNetwork Explorer — interactive force-directed graph (SVG, no deps).
 * ─────────────────────────────────────────────────────────────────────────────
 * Real interactions, not a static picture:
 *   • zoom (wheel) and pan (drag background) with cursor-anchored zoom
 *   • drag individual nodes (they stay where you put them)
 *   • click a node → details panel; click an edge → evidence panel
 *   • switch layouts: force · circle · radial · grid
 *   • edge width follows the source confidence (STRING combined score)
 *   • directed edges (containment / encodes) render with arrows
 *   • search-hit and shortest-path highlighting
 *
 * Physics: repulsion + springs + gravity with velocity damping and alpha
 * decay — a standard Fruchterman–Reingold style simulation, re-heated on
 * interaction. Nodes are drawn as colour-coded pills by entity type.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { GraphEdge, GraphNode } from "@/convex/bioNetworkAdapters";
import type { NodeMetrics } from "@/lib/bioNetworkGraph";
import { Maximize2, Minus, Plus } from "lucide-react";

export type GraphLayout = "force" | "circle" | "radial" | "grid";

export interface ForceGraphApi {
  fit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface SimNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
}

export const KIND_COLORS: Record<string, string> = {
  gene: "#059669", // emerald
  protein: "#7c3aed", // violet
  disease: "#e11d48", // rose
  pathway: "#0284c7", // sky
  drug: "#d97706", // amber
};

export const SOURCE_EDGE_COLORS: Record<string, string> = {
  string: "#0d9488",
  reactome: "#2563eb",
  kegg: "#7c3aed",
  opentargets: "#db2777",
  uniprot: "#64748b",
  ncbi: "#475569",
  genecards: "#94a3b8",
};

export const KIND_LABELS: Record<string, string> = {
  gene: "ژن",
  protein: "پروتئین",
  disease: "بیماری",
  pathway: "مسیر زیستی",
  drug: "دارو",
};

const SPRING_LEN = 110;
const REPULSION = 5200;
const GRAVITY = 0.045;
const DAMPING = 0.86;

function labelWidth(label: string): number {
  // rough pill width for bold 10.5px text (Latin + Persian mixed)
  const visual = [...label].reduce((acc, ch) => acc + (ch.charCodeAt(0) > 0x0600 ? 8 : 6.1), 0);
  return Math.max(46, Math.min(190, visual + 16));
}

interface ForceGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metrics: Record<string, NodeMetrics>;
  layout: GraphLayout;
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
  /** ids matched by the in-network search (others dim) */
  searchHits?: Set<string> | null;
  /** ordered ids of a highlighted shortest path */
  pathIds?: string[] | null;
  onSelectNode?: (id: string | null) => void;
  onSelectEdge?: (id: string | null) => void;
  apiRef?: { current: ForceGraphApi | null };
}

export function ForceGraph({
  nodes,
  edges,
  metrics,
  layout,
  selectedNodeId,
  selectedEdgeId,
  searchHits,
  pathIds,
  onSelectNode,
  onSelectEdge,
  apiRef,
}: ForceGraphProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simRef = useRef(new Map<string, SimNode>());
  const alphaRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null);
  const panRef = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null);
  const [, tick] = useReducer((x: number) => x + 1, 0);

  const [size, setSize] = useState({ w: 900, h: 620 });
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);

  const nodeIds = useMemo(() => nodes.map((n) => n.id).join("|"), [nodes]);
  const pathSet = useMemo(() => new Set(pathIds ?? []), [pathIds]);

  // ── container size ──────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth || 900, h: el.clientHeight || 620 });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── node membership: keep old positions, seed new ones ──────────────────
  useEffect(() => {
    const sim = simRef.current;
    const cx = size.w / 2;
    const cy = size.h / 2;
    let i = 0;
    for (const n of nodes) {
      if (sim.has(n.id)) continue;
      const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
      const radius = 140 + (i % 5) * 34;
      sim.set(n.id, {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      });
      i++;
    }
    for (const id of [...sim.keys()]) {
      if (!nodes.some((n) => n.id === id)) sim.delete(id);
    }
    alphaRef.current = 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeIds, size.w, size.h]);

  // ── deterministic layouts ───────────────────────────────────────────────
  useEffect(() => {
    const sim = simRef.current;
    if (layout === "force") {
      alphaRef.current = 1;
      return;
    }
    const ids = nodes.map((n) => n.id);
    const cx = size.w / 2;
    const cy = size.h / 2;
    ids.forEach((id, i) => {
      const s = sim.get(id);
      if (!s) return;
      const t = ids.length <= 1 ? 0 : i / ids.length;
      if (layout === "circle") {
        const r = Math.min(cx, cy) - 70;
        s.x = cx + Math.cos(t * Math.PI * 2 - Math.PI / 2) * r;
        s.y = cy + Math.sin(t * Math.PI * 2 - Math.PI / 2) * r;
      } else if (layout === "radial") {
        // rings by entity kind: genes in the centre, then proteins, pathways…
        const order = ["gene", "protein", "pathway", "disease", "drug"];
        const ringOf = (kind: string) => {
          const i = order.indexOf(kind);
          return i < 0 ? order.length : i;
        };
        const ring = ringOf(nodes[i].kind);
        const r = 95 + ring * 88;
        const members = ids.filter((x) => ringOf(nodes[ids.indexOf(x)].kind) === ring);
        const idxInRing = members.indexOf(id);
        const stepAngle = (Math.PI * 2) / Math.max(members.length, 1);
        s.x = cx + Math.cos(idxInRing * stepAngle - Math.PI / 2) * r;
        s.y = cy + Math.sin(idxInRing * stepAngle - Math.PI / 2) * r;
      } else {
        // grid
        const cols = Math.ceil(Math.sqrt(ids.length));
        s.x = 70 + (i % cols) * ((size.w - 140) / Math.max(cols - 1, 1));
        s.y = 70 + Math.floor(i / cols) * ((size.h - 140) / Math.max(Math.ceil(ids.length / cols) - 1, 1));
      }
      s.vx = 0;
      s.vy = 0;
      s.fx = null;
      s.fy = null;
    });
    alphaRef.current = 0; // static layout — no simulation needed
    tick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, nodeIds, size.w, size.h]);

  // ── physics loop ────────────────────────────────────────────────────────
  const step = useCallback(() => {
    const sim = simRef.current;
    const list = [...sim.entries()];
    const alpha = alphaRef.current;
    if (layout === "force" && alpha > 0.02) {
      // repulsion
      for (let i = 0; i < list.length; i++) {
        const [idA, a] = list[i];
        void idA;
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j][1];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) {
            dx = (Math.random() - 0.5) * 2;
            dy = (Math.random() - 0.5) * 2;
            d2 = 4;
          }
          const d = Math.sqrt(d2);
          const force = (REPULSION * alpha) / d2;
          const fx = (dx / d) * force;
          const fy = (dy / d) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }
      // springs
      for (const e of edges) {
        const a = sim.get(e.source);
        const b = sim.get(e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const f = ((d - SPRING_LEN) * 0.014) * alpha;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
      // gravity + integrate
      const cx = size.w / 2;
      const cy = size.h / 2;
      for (const [, s] of list) {
        s.vx += (cx - s.x) * GRAVITY * alpha;
        s.vy += (cy - s.y) * GRAVITY * alpha;
        s.vx *= DAMPING;
        s.vy *= DAMPING;
        if (s.fx != null) {
          s.x = s.fx;
          s.vx = 0;
        } else {
          s.x += s.vx;
        }
        if (s.fy != null) {
          s.y = s.fy;
          s.vy = 0;
        } else {
          s.y += s.vy;
        }
      }
      alphaRef.current = alpha * 0.988; // decay to rest (reheated on interaction)
    }
    // Only re-render while something is actually moving — the idle frames
    // below are near-free no-ops.
    if (alphaRef.current > 0.02 || dragRef.current || panRef.current) tick();
    rafRef.current = requestAnimationFrame(step);
  }, [layout, edges, size.w, size.h]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [step]);

  // ── coordinate helpers ──────────────────────────────────────────────────
  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - view.x) / view.k,
        y: (clientY - rect.top - view.y) / view.k,
      };
    },
    [view],
  );

  // ── cursor-anchored wheel zoom (non-passive listener) ───────────────────
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const rect = svg.getBoundingClientRect();
      const px = ev.clientX - rect.left;
      const py = ev.clientY - rect.top;
      setView((v) => {
        const factor = Math.exp(-ev.deltaY * 0.0016);
        const k = Math.min(3.5, Math.max(0.18, v.k * factor));
        const ratio = k / v.k;
        return { k, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio };
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  // ── imperative API (fit / zoom buttons) ─────────────────────────────────
  const fit = useCallback(() => {
    const sim = simRef.current;
    const list = [...sim.values()];
    if (!list.length) return;
    const minX = Math.min(...list.map((s) => s.x));
    const maxX = Math.max(...list.map((s) => s.x));
    const minY = Math.min(...list.map((s) => s.y));
    const maxY = Math.max(...list.map((s) => s.y));
    const bw = Math.max(maxX - minX, 80);
    const bh = Math.max(maxY - minY, 80);
    const k = Math.min(2, Math.min((size.w - 90) / bw, (size.h - 90) / bh));
    setView({
      k,
      x: size.w / 2 - ((minX + maxX) / 2) * k,
      y: size.h / 2 - ((minY + maxY) / 2) * k,
    });
  }, [size]);

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      fit,
      zoomIn: () => setView((v) => ({ ...v, k: Math.min(3.5, v.k * 1.25) })),
      zoomOut: () => setView((v) => ({ ...v, k: Math.max(0.18, v.k / 1.25) })),
    };
  }, [apiRef, fit]);

  // ── pointer interactions ────────────────────────────────────────────────
  const onNodePointerDown = (ev: ReactPointerEvent, id: string) => {
    ev.stopPropagation();
    (ev.target as Element).setPointerCapture?.(ev.pointerId);
    const s = simRef.current.get(id);
    if (!s) return;
    const p = toWorld(ev.clientX, ev.clientY);
    s.fx = p.x;
    s.fy = p.y;
    dragRef.current = { id, moved: false };
    alphaRef.current = Math.max(alphaRef.current, 0.7);
  };

  const onPointerMove = (ev: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (drag) {
      const s = simRef.current.get(drag.id);
      if (s) {
        const p = toWorld(ev.clientX, ev.clientY);
        const dist = Math.abs(p.x - (s.fx ?? p.x)) + Math.abs(p.y - (s.fy ?? p.y));
        if (dist > 3) drag.moved = true;
        s.fx = p.x;
        s.fy = p.y;
        alphaRef.current = Math.max(alphaRef.current, 0.6);
      }
      return;
    }
    const pan = panRef.current;
    if (pan) {
      pan.moved = true;
      setView((v) => ({ ...v, x: pan.ox + (ev.clientX - pan.x), y: pan.oy + (ev.clientY - pan.y) }));
    }
  };

  const endDrag = () => {
    const drag = dragRef.current;
    if (drag) {
      const s = simRef.current.get(drag.id);
      if (s) {
        if (drag.moved) {
          // keep the node where the user dropped it
          s.fx = s.fx;
          s.fy = s.fy;
          setTimeout(() => {
            s.fx = null;
            s.fy = null;
            alphaRef.current = Math.max(alphaRef.current, 0.45);
          }, 50);
        } else {
          s.fx = null;
          s.fy = null;
          onSelectNode?.(drag.id === selectedNodeId ? null : drag.id);
          onSelectEdge?.(null);
        }
      }
    }
    dragRef.current = null;
    panRef.current = null;
  };

  const onBackgroundPointerDown = (ev: ReactPointerEvent) => {
    panRef.current = { x: ev.clientX, y: ev.clientY, ox: view.x, oy: view.y, moved: false };
    onSelectNode?.(null);
    onSelectEdge?.(null);
  };

  // ── derived render data ─────────────────────────────────────────────────
  const neighbourIds = useMemo(() => {
    if (!selectedNodeId) return null;
    const set = new Set<string>([selectedNodeId]);
    for (const e of edges) {
      if (e.source === selectedNodeId) set.add(e.target);
      if (e.target === selectedNodeId) set.add(e.source);
    }
    return set;
  }, [selectedNodeId, edges]);

  const dimForSearch = (searchHits?.size ?? 0) > 0;
  const pathEdgeSet = useMemo(() => {
    if (!pathIds || pathIds.length < 2) return new Set<string>();
    const set = new Set<string>();
    for (let i = 0; i < pathIds.length - 1; i++) {
      const a = pathIds[i];
      const b = pathIds[i + 1];
      for (const e of edges) {
        if ((e.source === a && e.target === b) || (e.source === b && e.target === a)) set.add(e.id);
      }
    }
    return set;
  }, [pathIds, edges]);

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden rounded-2xl border border-emerald-900/10 bg-white">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="block touch-none select-none"
        style={{ cursor: panRef.current ? "grabbing" : "grab" }}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        <defs>
          <marker
            id="bn-arrow"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L8,4 L0,8 z" fill="#64748b" />
          </marker>
          <pattern id="bn-grid" width="26" height="26" patternUnits="userSpaceOnUse">
            <path d="M26 0H0V26" fill="none" stroke="#0f172a" strokeOpacity="0.045" />
          </pattern>
        </defs>

        <rect x={0} y={0} width="100%" height="100%" fill="url(#bn-grid)" />

        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {/* edges */}
          {edges.map((e) => {
            const a = simRef.current.get(e.source);
            const b = simRef.current.get(e.target);
            if (!a || !b) return null;
            const isSel = e.id === selectedEdgeId;
            const inPath = pathEdgeSet.has(e.id);
            const color = SOURCE_EDGE_COLORS[e.sourceDb] ?? "#94a3b8";
            const width = (e.score != null ? 1 + e.score * 2.4 : 1.6) * (isSel || inPath ? 2 : 1);
            const touchesSel = !!selectedNodeId && (e.source === selectedNodeId || e.target === selectedNodeId);
            const opacity = selectedNodeId && !touchesSel ? 0.13 : isSel || inPath ? 1 : 0.55;
            return (
              <g key={e.id}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={isSel || inPath ? color : "#475569"}
                  strokeOpacity={opacity}
                  strokeWidth={width}
                  strokeLinecap="round"
                  markerEnd={e.directed ? "url(#bn-arrow)" : undefined}
                />
                {/* generous invisible hit area */}
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="transparent"
                  strokeWidth={12}
                  style={{ cursor: "pointer" }}
                  onPointerDown={(ev) => ev.stopPropagation()}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onSelectEdge?.(e.id === selectedEdgeId ? null : e.id);
                    onSelectNode?.(null);
                  }}
                >
                  <title>
                    {e.label}
                    {e.score != null ? ` — ${e.score.toFixed(3)}` : ""}
                  </title>
                </line>
              </g>
            );
          })}

          {/* nodes */}
          {nodes.map((n) => {
            const s = simRef.current.get(n.id);
            if (!s) return null;
            const color = KIND_COLORS[n.kind] ?? "#64748b";
            const w = labelWidth(n.label);
            const isSelected = n.id === selectedNodeId;
            const isHover = n.id === hoverId;
            const inPath = pathSet.has(n.id);
            const isHit = !dimForSearch || (searchHits?.has(n.id) ?? false);
            const neighbour = !neighbourIds || neighbourIds.has(n.id);
            const opacity = isHit && neighbour ? 1 : 0.18;
            const deg = metrics[n.id]?.degree ?? 0;
            const badge = deg > 0 ? String(deg) : "";

            return (
              <g
                key={n.id}
                transform={`translate(${s.x},${s.y})`}
                style={{ cursor: "pointer", opacity, transition: "opacity .18s" }}
                onPointerDown={(ev) => onNodePointerDown(ev, n.id)}
                onPointerEnter={() => setHoverId(n.id)}
                onPointerLeave={() => setHoverId((h) => (h === n.id ? null : h))}
              >
                <title>
                  {`${n.label} (${KIND_LABELS[n.kind] ?? n.kind})${deg ? ` — ${deg} ارتباط` : ""}`}
                </title>
                {/* soft halo for selected / on-path nodes */}
                {(isSelected || inPath || isHover) && (
                  <rect
                    x={-w / 2 - 4}
                    y={-14}
                    width={w + 8}
                    height={28}
                    rx={14}
                    fill={color}
                    opacity={0.14}
                  />
                )}
                <rect
                  x={-w / 2}
                  y={-10}
                  width={w}
                  height={20}
                  rx={10}
                  fill={isSelected ? color : "#ffffff"}
                  stroke={color}
                  strokeWidth={isSelected ? 2.2 : isHover || inPath ? 2 : 1.4}
                />
                <text
                  y={3.6}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontWeight={700}
                  fill={isSelected ? "#ffffff" : "#0f172a"}
                  style={{ pointerEvents: "none" }}
                >
                  {n.label.length > 26 ? `${n.label.slice(0, 25)}…` : n.label}
                </text>
                {badge && (
                  <circle cx={w / 2} cy={-9} r={7.5} fill={color} opacity={isSelected ? 1 : 0.92} />
                )}
                {badge && (
                  <text
                    x={w / 2}
                    y={-6.4}
                    textAnchor="middle"
                    fontSize={8}
                    fontWeight={800}
                    fill="#ffffff"
                    style={{ pointerEvents: "none" }}
                  >
                    {badge}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* zoom controls */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1.5">
        {[
          { icon: Plus, label: "بزرگ‌نمایی", act: () => setView((v) => ({ ...v, k: Math.min(3.5, v.k * 1.25) })) },
          { icon: Minus, label: "کوچک‌نمایی", act: () => setView((v) => ({ ...v, k: Math.max(0.18, v.k / 1.25) })) },
          { icon: Maximize2, label: "قاب‌گیری شبکه", act: fit },
        ].map(({ icon: Icon, label, act }) => (
          <button
            key={label}
            type="button"
            title={label}
            onClick={act}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-emerald-900/10 bg-white/95 text-slate-500 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-700"
          >
            <Icon className="size-3.5" />
          </button>
        ))}
      </div>

      {/* legend */}
      <div className="absolute bottom-3 right-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-emerald-900/10 bg-white/95 px-3 py-2 text-[10px] font-semibold text-slate-500">
        {Object.entries(KIND_LABELS).map(([kind, label]) => (
          <span key={kind} className="inline-flex items-center gap-1">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ background: KIND_COLORS[kind] }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
