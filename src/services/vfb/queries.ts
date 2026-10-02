/**
 * Virtual Fly Brain — query layer.
 * ─────────────────────────────────────────────────────────────────────────────
 * One function per supported VFBquery endpoint. Each takes plain arguments,
 * calls the client, and returns a normalised model. No component ever touches
 * the raw API shape, and nothing is fabricated: if VFB omits a field, the
 * normalised model simply does not contain it.
 */
import {
  VFB_ENDPOINTS,
  assertVFBId,
  assertVFBTerm,
  clampInt,
  extractVFBThumbnail,
  splitVFBCategories,
  stripVFBLink,
  vfbFetch,
  VFBApiError,
} from "./client";
import type {
  VFBCandidate,
  VFBConnectivity,
  VFBConnectivityEdge,
  VFBConnectomeDataset,
  VFBCrossRef,
  VFBEntitySummary,
  VFBHierarchy,
  VFBHierarchyNode,
  VFBImage,
  VFBPublication,
  VFBQueryColumn,
  VFBQueryResult,
  VFBQueryRow,
  VFBResolveResult,
  VFBSynonym,
  VFBTermInfo,
} from "./types";

const PAGE_SIZE = 20;

/** Turn VFB's facet list into something we can put in a badge. */
function guessEntityType(facets: string[]): string | null {
  const preferred = [
    "Anatomy",
    "Neuron",
    "Class",
    "Gene",
    "Feature",
    "Dataset",
    "Synaptic_neuropil",
    "Individual",
  ];
  return preferred.find((p) => facets.includes(p)) ?? facets[0] ?? null;
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * VFB answers `200 null` for an id it does not know (e.g. `get_term_info`), so a
 * null body is a legitimate response, not a crash. Every wrapper normalises the
 * payload through this guard before reading a property.
 */
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

// ── 1. Search ───────────────────────────────────────────────────────────────

interface RawSearchRow {
  label?: string;
  original_label?: string;
  short_form?: string;
  id?: string;
  iri?: string;
  facets_annotation?: unknown;
  unique_facets?: unknown;
  description?: string;
}

interface RawSearchResponse {
  rows?: RawSearchRow[];
  count?: number;
  distinct_terms?: number;
  solr_num_found?: number;
  rows_fetched?: number;
}

/** Normalise the rows; VFB returns them with `(ID)` appended to the label. */
export function normaliseSearchRow(row: RawSearchRow): VFBEntitySummary | null {
  const id = (row.short_form ?? "").trim();
  const rawLabel = (row.label ?? "").trim();
  const label = stripVFBLink(row.original_label ?? rawLabel) || rawLabel;
  if (!id && !rawLabel) return null;
  const facets = [
    ...new Set([
      ...toArray<string>(row.unique_facets),
      ...toArray<string>(row.facets_annotation),
    ]),
  ];
  return {
    id,
    iri: typeof row.iri === "string" ? row.iri : row.id,
    label: label || id,
    rawLabel,
    facets,
    entityType: guessEntityType(facets),
    description: typeof row.description === "string" ? row.description : undefined,
  };
}

export async function searchVFB(
  params: { query: string; limit?: number; offset?: number; signal?: AbortSignal },
): Promise<{ rows: VFBEntitySummary[]; total: number }> {
  const query = assertVFBTerm(params.query);
  const limit = clampInt(params.limit ?? PAGE_SIZE, 1, 50);
  const offset = clampInt(params.offset ?? 0, 0, 10_000);

  const raw = await vfbFetch<RawSearchResponse>(
    VFB_ENDPOINTS.search,
    { query, limit, offset },
    { signal: params.signal, cacheKey: `search:${query}:${limit}:${offset}` },
  );

  const rows = toArray<RawSearchRow>(asRecord(raw).rows)
    .map(normaliseSearchRow)
    .filter((r): r is VFBEntitySummary => r !== null);

  // VFB reports several counts; prefer the most specific one available.
  const body = asRecord(raw);
  const total = (body.count as number) ?? (body.solr_num_found as number) ?? (body.distinct_terms as number) ?? rows.length;
  return { rows, total: Number.isFinite(total) ? total : rows.length };
}

// ── 2. Term info ────────────────────────────────────────────────────────────

interface RawTermInfo {
  Name?: string;
  Id?: string;
  SuperTypes?: unknown;
  Meta?: Record<string, string>;
  Tags?: unknown;
  Queries?: unknown;
  RelatedTools?: unknown;
  Images?: unknown;
  Licenses?: unknown;
  Publications?: unknown;
  Synonyms?: unknown;
  Examples?: unknown;
  Xrefs?: unknown;
}

function normaliseSynonyms(raw: unknown): VFBSynonym[] {
  return toArray<Record<string, unknown>>(raw)
    .map((s) => ({
      label: stripVFBLink(s.label),
      scope: typeof s.scope === "string" ? s.scope : undefined,
      type: typeof s.type === "string" ? s.type : undefined,
      publication: typeof s.publication === "string" ? s.publication : undefined,
    }))
    .filter((s) => s.label.length > 0);
}

function normalisePublications(raw: unknown): VFBPublication[] {
  return toArray<Record<string, unknown>>(raw)
    .map((p) => ({
      title: stripVFBLink(p.title),
      shortForm: typeof p.short_form === "string" ? p.short_form : undefined,
      microref: typeof p.microref === "string" ? p.microref : undefined,
      refs: toArray<string>(p.refs),
    }))
    .filter((p) => p.title.length > 0);
}

function normaliseXrefs(raw: unknown): VFBCrossRef[] {
  return toArray<Record<string, unknown>>(raw)
    .map((x) => ({
      // `get_term_info` returns only `label` + `accession`; `/xref` adds db codes.
      db: String(x.db ?? x.site_id ?? x.label ?? "unknown"),
      dbLabel: typeof x.db_label === "string" ? x.db_label : undefined,
      accession: x.accession !== undefined ? String(x.accession) : undefined,
      id: typeof x.id === "string" ? x.id : undefined,
      label: typeof x.label === "string" ? stripVFBLink(x.label) : undefined,
      link: typeof x.link === "string" ? x.link : undefined,
      isDataSource: typeof x.is_data_source === "boolean" ? x.is_data_source : undefined,
    }))
    .filter((x) => x.db !== "unknown");
}

export async function getVFBTermInfo(
  params: { id: string; signal?: AbortSignal },
): Promise<VFBTermInfo> {
  const id = assertVFBId(params.id);
  const raw = await vfbFetch<RawTermInfo>(
    VFB_ENDPOINTS.termInfo,
    { id },
    { signal: params.signal, cacheKey: `term:${id}` },
  );

  const body = asRecord(raw) as RawTermInfo;
  const meta = (body.Meta ?? {}) as Record<string, string>;
  const name = typeof body.Name === "string" ? body.Name.trim() : "";
  const found = Boolean(name || body.Id);

  return {
    id: typeof body.Id === "string" && body.Id ? body.Id : id,
    name: name || meta.Name?.replace(/^\[(.+)\]\((.+)\)$/, "$1") || id,
    description: typeof meta.Description === "string" ? meta.Description : undefined,
    comment: typeof meta.Comment === "string" ? meta.Comment : undefined,
    types: typeof meta.Types === "string" ? meta.Types : undefined,
    relationships: typeof meta.Relationships === "string" ? meta.Relationships : undefined,
    superTypes: toArray<string>(body.SuperTypes),
    tags: toArray<string>(body.Tags),
    synonyms: normaliseSynonyms(body.Synonyms),
    publications: normalisePublications(body.Publications),
    crossRefs: normaliseXrefs(body.Xrefs),
    namedQueries: toArray<Record<string, unknown>>(body.Queries).map((q) => ({
      query: String(q.query ?? ""),
      label: typeof q.label === "string" ? q.label : undefined,
      function: typeof q.function === "string" ? q.function : undefined,
      previewCount: toArray<Record<string, unknown>>(
        (q.preview_results as Record<string, unknown> | undefined)?.rows,
      ).length,
    })).filter((q) => q.query.length > 0),
    relatedTools: toArray<Record<string, unknown>>(body.RelatedTools).map((t) => ({
      tool: String(t.tool ?? ""),
      label: typeof t.label === "string" ? t.label : undefined,
      defaultArgs: (t.default_args ?? undefined) as Record<string, string | number> | undefined,
    })).filter((t) => t.tool.length > 0),
    licenses: (body.Licenses ?? {}) as Record<string, unknown>,
    examples: (body.Examples ?? {}) as Record<string, unknown>,
    found,
  };
}

// ── 3. Hierarchy ────────────────────────────────────────────────────────────

interface RawHierarchyNode {
  id?: string;
  label?: string;
}

function normaliseNode(raw: RawHierarchyNode): VFBHierarchyNode | null {
  const id = (raw.id ?? "").trim();
  const label = stripVFBLink(raw.label) || id;
  if (!id && !label) return null;
  return { id, label };
}

/**
 * One level of the ontology only (`max_depth = 1`): ancestors + direct
 * descendants. We never walk the whole tree.
 */
export async function getVFBHierarchy(
  params: { id: string; maxDepth?: number; relationship?: string; signal?: AbortSignal },
): Promise<VFBHierarchy> {
  const id = assertVFBId(params.id);
  const maxDepth = clampInt(params.maxDepth ?? 1, 1, 2);

  const raw = await vfbFetch<{
    id?: string;
    label?: string;
    relationship?: string;
    ancestors?: RawHierarchyNode[];
    descendants?: RawHierarchyNode[];
    display?: string;
  }>(
    VFB_ENDPOINTS.hierarchy,
    { id, max_depth: maxDepth },
    { signal: params.signal, cacheKey: `hier:${id}:${maxDepth}` },
  );

  const body = asRecord(raw);
  return {
    id: typeof body.id === "string" ? body.id : id,
    label: stripVFBLink(body.label) || id,
    relationship: typeof body.relationship === "string" ? body.relationship : "part_of",
    ancestors: toArray<RawHierarchyNode>(body.ancestors).map(normaliseNode).filter((n): n is VFBHierarchyNode => n !== null),
    descendants: toArray<RawHierarchyNode>(body.descendants).map(normaliseNode).filter((n): n is VFBHierarchyNode => n !== null),
    display: typeof body.display === "string" ? body.display : undefined,
  };
}

// ── 4. Named queries (`/run_query`) ─────────────────────────────────────────

interface RawRunQuery {
  headers?: Record<string, { title?: string; type?: string; order?: number }>;
  rows?: Record<string, unknown>[];
  count?: number;
}

/** Run any named query VFB advertises for this term (images, neurons, …). */
export async function runVFBQuery(params: {
  id: string;
  queryType: string;
  offset?: number;
  limit?: number;
  signal?: AbortSignal;
}): Promise<VFBQueryResult> {
  const id = assertVFBId(params.id);
  const queryType = (params.queryType ?? "").trim();
  if (!queryType || !/^[A-Za-z0-9_]{1,80}$/.test(queryType)) {
    throw new VFBApiError("validation", "Invalid query type.");
  }
  const limit = clampInt(params.limit ?? PAGE_SIZE, 1, 50);
  const offset = clampInt(params.offset ?? 0, 0, 10_000);

  try {
    const raw = await vfbFetch<RawRunQuery>(
      VFB_ENDPOINTS.runQuery,
      { id, query_type: queryType, offset, limit },
      { signal: params.signal, cacheKey: `runq:${id}:${queryType}:${limit}:${offset}` },
    );
    const body = asRecord(raw);
    // `headers` is keyed by the row field name; the title is only a label.
    const columns: VFBQueryColumn[] = Object.entries(
      (body.headers ?? {}) as Record<string, { title?: string; type?: string; order?: number }>,
    )
      .map(([key, h]) => ({ key, title: h?.title, type: h?.type, order: h?.order }))
      // VFB marks its own "add to basket" column as `selection_id`; not data.
      .filter((c) => c.type !== "selection_id")
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return {
      columns,
      rows: toArray<Record<string, unknown>>(body.rows),
      total: Number.isFinite(body.count) ? Number(body.count) : 0,
      availableTypes: [],
    };
  } catch (error) {
    // VFB reports an unknown query type either as `{ error, available: [...] }`
    // or as HTTP 400. Both mean "this term has no such named query" — surface it
    // as an empty result so the UI can say so instead of showing a hard failure.
    if (error instanceof VFBApiError && (error.kind === "api" || error.status === 400)) {
      return { columns: [], rows: [], total: 0, error: error.message, availableTypes: [] };
    }
    throw error;
  }
}

/** `ListAllAvailableImages` normalised into displayable image records. */
export async function getVFBImages(params: {
  id: string;
  queryType?: string;
  offset?: number;
  limit?: number;
  signal?: AbortSignal;
}): Promise<{ images: VFBImage[]; total: number; raw: VFBQueryResult }> {
  const result = await runVFBQuery({
    id: params.id,
    queryType: params.queryType ?? "ListAllAvailableImages",
    offset: params.offset,
    limit: params.limit,
    signal: params.signal,
  });

  const images: VFBImage[] = result.rows.map((row) => ({
    id: String(row.id ?? ""),
    label: stripVFBLink(row.label) || String(row.id ?? ""),
    thumbnailUrl: extractVFBThumbnail(row.thumbnail),
    parent: stripVFBLink(row.parent) || undefined,
    template: stripVFBLink(row.template) || undefined,
    dataset: stripVFBLink(row.dataset) || undefined,
    license: stripVFBLink(row.license) || undefined,
    source: stripVFBLink(row.source) || undefined,
    tags: splitVFBCategories(row.tags),
  }));

  return { images, total: result.total, raw: result };
}

/** Generic row listing used for neuron / expression named queries. */
export function toDisplayRows(rows: VFBQueryRow[]): VFBQueryRow[] {
  return rows.map((row) => ({
    ...row,
    label: stripVFBLink(row.label) || undefined,
  }));
}

// ── 5. Connectivity ─────────────────────────────────────────────────────────

interface RawConnectivityEdge extends Record<string, unknown> {
  weight?: number | string;
}

/**
 * Query connectivity between two neuron types.
 * NOTE: these edges are evidence reported by VFB for a specific
 * reconstruction/connectome — never an absolute biological claim.
 */
export async function getVFBConnectivity(params: {
  upstreamType: string;
  downstreamType: string;
  signal?: AbortSignal;
}): Promise<VFBConnectivity> {
  const upstreamType = assertVFBTerm(params.upstreamType);
  const downstreamType = assertVFBTerm(params.downstreamType);

  const raw = await vfbFetch<{
    connections?: RawConnectivityEdge[];
    count?: number;
    warnings?: unknown;
    resolved?: Record<string, { query?: string; id?: string; label?: string }>;
    excluded_dbs?: unknown;
  }>(
    VFB_ENDPOINTS.connectivity,
    { upstream_type: upstreamType, downstream_type: downstreamType },
    {
      signal: params.signal,
      cacheKey: `conn:${upstreamType.toLowerCase()}:${downstreamType.toLowerCase()}`,
    },
  );

  const body = asRecord(raw);
  const connections: VFBConnectivityEdge[] = toArray<RawConnectivityEdge>(body.connections).map((c) => ({
    upstreamClass: typeof c.upstream_class === "string" ? c.upstream_class : undefined,
    upstreamClassId: typeof c.upstream_class_id === "string" ? c.upstream_class_id : undefined,
    upstreamNeuronId: typeof c.upstream_neuron_id === "string" ? c.upstream_neuron_id : undefined,
    upstreamNeuronName: typeof c.upstream_neuron_name === "string" ? c.upstream_neuron_name : undefined,
    downstreamClass: typeof c.downstream_class === "string" ? c.downstream_class : undefined,
    downstreamClassId: typeof c.downstream_class_id === "string" ? c.downstream_class_id : undefined,
    downstreamNeuronId: typeof c.downstream_neuron_id === "string" ? c.downstream_neuron_id : undefined,
    downstreamNeuronName: typeof c.downstream_neuron_name === "string" ? c.downstream_neuron_name : undefined,
    weight: typeof c.weight === "string" ? Number(c.weight) : c.weight,
    upstreamDataSource: typeof c.up_data_source === "string" ? c.up_data_source : undefined,
    upstreamAccession: c.up_accession !== undefined ? String(c.up_accession) : undefined,
    downstreamDataSource: typeof c.down_data_source === "string" ? c.down_data_source : undefined,
    downstreamAccession: c.down_accession !== undefined ? String(c.down_accession) : undefined,
  }));

  return {
    connections,
    count: Number.isFinite(body.count) ? Number(body.count) : connections.length,
    warnings: toArray<string>(body.warnings),
    resolved: (body.resolved ?? {}) as VFBConnectivity["resolved"],
    excludedDbs: toArray<string>(body.excluded_dbs),
  };
}

// ── 6. Connectome datasets ──────────────────────────────────────────────────

export async function getVFBConnectomeDatasets(params?: {
  signal?: AbortSignal;
}): Promise<VFBConnectomeDataset[]> {
  const raw = await vfbFetch<Record<string, unknown>[]>(
    VFB_ENDPOINTS.datasets,
    undefined,
    { signal: params?.signal, cacheKey: "datasets" },
  );
  if (!Array.isArray(raw)) return [];
  return raw
    .map((d) => ({
      label: stripVFBLink(d.label) || String(d.symbol ?? "dataset"),
      symbol: typeof d.symbol === "string" ? d.symbol : undefined,
      shortForm: typeof d.short_form === "string" ? d.short_form : undefined,
    }))
    .filter((d) => d.label.length > 0);
}

// ── 7. Cross references ─────────────────────────────────────────────────────

interface RawXrefRow {
  id?: string;
  label?: string;
  db?: string;
  db_label?: string;
  site_id?: string;
  accession?: string;
  is_data_source?: boolean;
  link?: string;
}

export async function getVFBXrefs(params: {
  id: string;
  signal?: AbortSignal;
}): Promise<VFBCrossRef[]> {
  const id = assertVFBId(params.id);
  const raw = await vfbFetch<{ rows?: RawXrefRow[] }>(
    VFB_ENDPOINTS.xref,
    { id },
    { signal: params.signal, cacheKey: `xref:${id}` },
  );
  return toArray<RawXrefRow>(asRecord(raw).rows)
    .map((x) => ({
      db: String(x.db ?? x.site_id ?? "unknown"),
      dbLabel: typeof x.db_label === "string" ? x.db_label : undefined,
      accession: x.accession !== undefined ? String(x.accession) : undefined,
      id: typeof x.id === "string" ? x.id : undefined,
      label: typeof x.label === "string" ? stripVFBLink(x.label) : undefined,
      link: typeof x.link === "string" ? x.link : undefined,
      isDataSource: typeof x.is_data_source === "boolean" ? x.is_data_source : undefined,
    }))
    .filter((x) => x.db !== "unknown");
}

// ── 8. Entity / gene resolution ─────────────────────────────────────────────

/**
 * Resolve a name such as `dpp` to VFB entities. Results are *candidates*:
 * an ambiguous match is never presented as a confirmed gene.
 */
export async function resolveVFBEntity(params: {
  query: string;
  signal?: AbortSignal;
}): Promise<VFBResolveResult> {
  const query = assertVFBTerm(params.query);
  const raw = await vfbFetch<{ match_type?: string; results?: unknown }>(
    VFB_ENDPOINTS.resolve,
    { query },
    { signal: params.signal, cacheKey: `resolve:${query}` },
  );

  const body = asRecord(raw);
  const candidates: VFBCandidate[] = toArray<Record<string, unknown>>(body.results).map((r) => ({
    name: stripVFBLink(r.name) || query,
    uniquename: typeof r.uniquename === "string" ? r.uniquename : undefined,
    type: typeof r.type === "string" ? r.type : undefined,
    matchedSynonym:
      typeof r.matched_synonym === "string" && r.matched_synonym ? r.matched_synonym : null,
  }));

  return { matchType: typeof body.match_type === "string" ? body.match_type : undefined, candidates };
}
