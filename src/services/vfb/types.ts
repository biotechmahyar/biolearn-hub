/**
 * Virtual Fly Brain (VFB) — normalised frontend models.
 * ─────────────────────────────────────────────────────────────────────────────
 * The VFBquery API returns slightly different shapes per endpoint and even per
 * row inside a single response. These types describe what the UI is allowed to
 * rely on; everything optional is genuinely optional because the source may not
 * provide it. Nothing here is invented — every field maps to a returned value.
 */

/** A single search hit (FBbt class, neuron, gene, dataset, …). */
export interface VFBEntitySummary {
  /** Short form when available (e.g. `FBbt_00003748`, `FBgn0000490`). */
  id: string;
  /** Full IRI as returned by the API (kept for provenance, not for display). */
  iri?: string;
  /** Cleaned label without the trailing `(ID)` the API appends. */
  label: string;
  /** Label exactly as returned (may contain the `(ID)` suffix). */
  rawLabel: string;
  /** Facet annotations such as `Anatomy`, `Neuron`, `Gene`, `hasScRNAseq`. */
  facets: string[];
  /** Best-guess entity type derived from facets, or null when unknown. */
  entityType: string | null;
  /** A short description when the search row carries one. */
  description?: string;
}

export interface VFBSynonym {
  label: string;
  scope?: string;
  type?: string;
  publication?: string;
}

export interface VFBPublication {
  title: string;
  shortForm?: string;
  microref?: string;
  /** External reference URLs exactly as returned by VFB. */
  refs: string[];
}

export interface VFBCrossRef {
  /** Database code as returned (e.g. `InsectBrainDB`). */
  db: string;
  dbLabel?: string;
  accession?: string;
  id?: string;
  label?: string;
  /** Link only when VFB returned one — never constructed by us. */
  link?: string;
  isDataSource?: boolean;
}

export interface VFBNamedQuery {
  query: string;
  label?: string;
  function?: string;
  /** Preview rows VFB already embedded in the term info response. */
  previewCount: number;
}

export interface VFBRelatedTool {
  tool: string;
  label?: string;
  defaultArgs?: Record<string, string | number>;
}

/** Images returned by `ListAllAvailableImages` (parsed from VFB markdown). */
export interface VFBImage {
  id: string;
  label: string;
  /** Source URL served by VFB — we link to it, we never mirror it. */
  thumbnailUrl?: string;
  parent?: string;
  template?: string;
  dataset?: string;
  /** License string exactly as returned (never invented). */
  license?: string;
  source?: string;
  tags?: string[];
}

/** One row of a VFB named query (`/run_query`). */
export interface VFBQueryRow {
  id?: string;
  label?: string;
  [key: string]: unknown;
}

export interface VFBQueryColumn {
  /** Row field name as returned by VFB (this is the lookup key). */
  key: string;
  title?: string;
  type?: string;
  order?: number;
}

export interface VFBQueryResult {
  columns: VFBQueryColumn[];
  rows: VFBQueryRow[];
  total: number;
  /** Present when VFB reports an unknown query type. */
  error?: string;
  availableTypes: string[];
}

export interface VFBNamedQueryResult {
  headers: Record<string, { title?: string; type?: string; order?: number }>;
  rows: Record<string, unknown>[];
  count: number;
}

/** `get_term_info` normalised. */
export interface VFBTermInfo {
  id: string;
  name: string;
  description?: string;
  comment?: string;
  /** Markdown-ish `Types` field returned by VFB (kept verbatim). */
  types?: string;
  /** `Relationships` field returned by VFB (kept verbatim). */
  relationships?: string;
  superTypes: string[];
  tags: string[];
  synonyms: VFBSynonym[];
  publications: VFBPublication[];
  crossRefs: VFBCrossRef[];
  namedQueries: VFBNamedQuery[];
  relatedTools: VFBRelatedTool[];
  /** Present only when VFB returns something. */
  licenses: Record<string, unknown>;
  examples: Record<string, unknown>;
  /** False when VFB has no usable record for the requested id. */
  found: boolean;
}

export interface VFBHierarchyNode {
  id: string;
  label: string;
}

export interface VFBHierarchy {
  id: string;
  label: string;
  relationship: string;
  ancestors: VFBHierarchyNode[];
  descendants: VFBHierarchyNode[];
  display?: string;
}

/** One connectivity edge. Always evidence from a specific reconstruction. */
export interface VFBConnectivityEdge {
  upstreamClass?: string;
  upstreamClassId?: string;
  upstreamNeuronId?: string;
  upstreamNeuronName?: string;
  downstreamClass?: string;
  downstreamClassId?: string;
  downstreamNeuronId?: string;
  downstreamNeuronName?: string;
  /** Synapse weight as reported by VFB for this edge. */
  weight?: number;
  /** Dataset/version identifiers exactly as returned (e.g. `flywire783`). */
  upstreamDataSource?: string;
  upstreamAccession?: string;
  downstreamDataSource?: string;
  downstreamAccession?: string;
}

export interface VFBConnectivity {
  connections: VFBConnectivityEdge[];
  count: number;
  /** VFB's own resolution notes (e.g. a name was auto-matched). */
  warnings: string[];
  /** Which VFB neuron type each query string resolved to. */
  resolved: Record<string, { query?: string; id?: string; label?: string }>;
  /** Datasets VFB excluded from this query. */
  excludedDbs: string[];
}

export interface VFBConnectomeDataset {
  label: string;
  symbol?: string;
  shortForm?: string;
}

export interface VFBCandidate {
  name: string;
  uniquename?: string;
  type?: string;
  matchedSynonym?: string | null;
}

export interface VFBResolveResult {
  matchType?: string;
  candidates: VFBCandidate[];
}

// ── Errors ──────────────────────────────────────────────────────────────────

export type VFBErrorKind =
  | "network"
  | "timeout"
  | "aborted"
  | "http"
  | "malformed"
  | "api"
  | "validation";

export interface VFBApiErrorShape {
  kind: VFBErrorKind;
  message: string;
  status?: number;
}

export const VFB_SOURCE = {
  name: "Virtual Fly Brain",
  site: "https://www.virtualflybrain.org/",
  api: "https://v3-cached.virtualflybrain.org/",
  docs: "https://v2a.virtualflybrain.org/docs/apis/vfbquery/",
} as const;
