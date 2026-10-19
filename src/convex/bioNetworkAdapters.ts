/**
 * Genova BioNetwork Explorer — data-source adapters (pure functions, no Convex deps).
 * ─────────────────────────────────────────────────────────────────────────────
 * Every node and edge returned by this module comes from a real, live request
 * to the source database named on the record. Nothing is synthesized:
 *
 *   STRING        protein functional associations + combined score (0–1)
 *   Reactome      pathways per UniProt protein, pathway containment, and
 *                 over-representation analysis (p-value + FDR)
 *   KEGG          gene → pathway / disease / drug links, disease text search
 *   UniProt       gene → protein accession, protein name, function comment
 *   NCBI Gene     official symbol, Entrez id, official full name + summary
 *   Open Targets  gene → disease association scores (best effort)
 *   GeneCards     NOT callable without a licence → reported as `skipped`
 *
 * A failing source never breaks a build: each source reports its own
 * SourceStatus with the real reason (spec §8 — no fabricated data).
 */

// ═══════════════════════════════════════════════════════════════════════════
//  UNIFIED GRAPH TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type EntityKind = "gene" | "protein" | "disease" | "pathway" | "drug";

export type GraphSourceId =
  | "string"
  | "reactome"
  | "kegg"
  | "uniprot"
  | "ncbi"
  | "opentargets"
  | "genecards";

export const SOURCE_LABELS: Record<GraphSourceId, string> = {
  string: "STRING",
  reactome: "Reactome",
  kegg: "KEGG",
  uniprot: "UniProt",
  ncbi: "NCBI Gene",
  opentargets: "Open Targets",
  genecards: "GeneCards",
};

/** Human-readable status shown in the UI, with the REAL reason on failure. */
export interface SourceStatus {
  source: GraphSourceId;
  status: "ok" | "empty" | "failed" | "skipped";
  message?: string;
  count?: number;
}

export interface GraphNode {
  id: string;
  label: string;
  kind: EntityKind;
  /** The source that introduced this node (shown as its primary badge). */
  source: GraphSourceId;
  /** Every source that contributed data to this node. */
  sources: GraphSourceId[];
  description?: string;
  organism?: string;
  /** Standard identifiers: symbol, entrez, uniprot, ensembl/protein (stringId), kegg… */
  ids?: Record<string, string>;
  /** Extra curated facts for the details panel (NCBI summary, UniProt function…). */
  extra?: Record<string, string>;
  /** Canonical link to the source-database record. */
  url?: string;
  /** True when the user searched for this entity directly (seed of the network). */
  isSeed?: boolean;
}

/** One channel of supporting evidence reported by the source (real sub-scores). */
export interface EdgeEvidence {
  /** e.g. experimental, database, coexpression, textmining, prediction… */
  kind: string;
  label: string;
  /** Sub-score exactly as reported by the source, 0–1 (STRING) when available. */
  score?: number;
}

export type EdgeKind =
  | "protein_interaction" // STRING — functional association at protein level
  | "gene_pathway" // KEGG / Reactome — member of pathway
  | "gene_disease" // KEGG / Open Targets — reported association (NOT causal)
  | "gene_protein" // directed: gene → the protein it encodes
  | "pathway_hierarchy"; // directed: child pathway → parent pathway

export interface GraphEdge {
  id: string;
  source: string; // node id
  target: string; // node id
  kind: EdgeKind;
  sourceDb: GraphSourceId;
  label: string;
  directed: boolean;
  /** Confidence exactly as defined by the source (STRING combined score 0–1). */
  score?: number;
  /** Explicit statement of what the score means (scale + caveats). */
  scoreNote?: string;
  evidence?: EdgeEvidence[];
  description?: string;
  citations?: string[];
}

export interface NetworkGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  statuses: SourceStatus[];
  meta: {
    query: string;
    species: number;
    speciesName: string;
    requestedSources: GraphSourceId[];
    requiredScore: number; // 0–1 (STRING threshold passed through)
    levels: number;
    builtAt: number;
    fromCache: boolean;
  };
}

export interface EntityCandidate {
  id: string;
  label: string;
  kind: EntityKind;
  source: GraphSourceId;
  description?: string;
  organism?: string;
  ids?: Record<string, string>;
  url?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export class SourceError extends Error {
  readonly source: GraphSourceId;
  readonly code: string;
  constructor(source: GraphSourceId, code: string, message: string) {
    super(message);
    this.name = "SourceError";
    this.source = source;
    this.code = code;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TIMEOUT_MS = 20_000;
const CALLER = "genova_bionetwork_explorer";

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson<T>(url: string, source: GraphSourceId, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    });
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    throw new SourceError(source, "network", `${SOURCE_LABELS[source]} در دسترس نیست: ${msg}`);
  }
  if (!res.ok) {
    throw new SourceError(source, `http_${res.status}`, `${SOURCE_LABELS[source]} HTTP ${res.status}`);
  }
  try {
    return (await res.json()) as T;
  } catch {
    throw new SourceError(source, "bad_json", `${SOURCE_LABELS[source]} پاسخ نامعتبر برگرداند`);
  }
}

async function fetchText(url: string, source: GraphSourceId): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    throw new SourceError(source, "network", `${SOURCE_LABELS[source]} در دسترس نیست: ${msg}`);
  }
  if (!res.ok) {
    throw new SourceError(source, `http_${res.status}`, `${SOURCE_LABELS[source]} HTTP ${res.status}`);
  }
  return await res.text();
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Species supported by the explorer (STRING taxonomy ids + KEGG prefixes). */
export const SPECIES: Record<number, { name: string; kegg: string }> = {
  9606: { name: "Homo sapiens", kegg: "hsa" },
  10090: { name: "Mus musculus", kegg: "mmu" },
  10116: { name: "Rattus norvegicus", kegg: "rno" },
  7227: { name: "Drosophila melanogaster", kegg: "dme" },
  7955: { name: "Danio rerio", kegg: "dre" },
};

export const SPECIES_OPTIONS = Object.entries(SPECIES).map(([id, s]) => ({
  id: Number(id),
  name: s.name,
  kegg: s.kegg,
}));

const SYMBOL_RE = /^[A-Z][A-Z0-9-]{1,11}$/;
const ACCESSION_RE = /^([OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2})$/;

/** Extract uppercase gene-symbol-like tokens from free text (incl. Persian). */
export function extractSymbolCandidates(text: string): string[] {
  const tokens = text.toUpperCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const out: string[] = [];
  for (const t of tokens) {
    // Require at least one digit or length ≥ 3 to drop everyday words like "DNA"→ keep DNA? DNA/RNA are not genes; STRING won't resolve them anyway.
    if (SYMBOL_RE.test(t) && !out.includes(t)) out.push(t);
  }
  return out.slice(0, 8);
}

export function looksLikeAccession(text: string): boolean {
  return ACCESSION_RE.test(text.trim().toUpperCase());
}

/**
 * STRING fuzzy-matches natural-language phrases to unrelated proteins (e.g.
 * "breast cancer" → BEX2 whose annotation mentions breast cancer). A
 * resolution is only trusted as an entity when the input looks like an
 * identifier or the returned name genuinely refers to the input; phrases are
 * left to the text-search sources (KEGG / Reactome) instead.
 */
export function phraseMatchesName(query: string, preferred: string): boolean {
  if (!query.includes(" ")) return true;
  if (looksLikeAccession(query)) return true;
  const qw = new Set(query.toUpperCase().split(/\s+/));
  return preferred.toUpperCase().split(/[\s_/-]+/).some((w) => qw.has(w));
}

// ═══════════════════════════════════════════════════════════════════════════
//  STRING — protein functional associations (no API key required)
// ═══════════════════════════════════════════════════════════════════════════

const STRING_BASE = "https://string-db.org/api/json";

export interface StringResolution {
  queryIndex: number;
  queryItem: string;
  stringId: string;
  ncbiTaxonId: number;
  taxonName: string;
  preferredName: string;
  annotation?: string;
}

/** Batch-resolve arbitrary identifiers to STRING protein ids. */
export async function stringGetIds(
  identifiers: string[],
  species: number,
): Promise<StringResolution[]> {
  if (identifiers.length === 0) return [];
  const url = new URL(`${STRING_BASE}/get_string_ids`);
  url.searchParams.set("identifiers", identifiers.join("\r"));
  url.searchParams.set("species", String(species));
  url.searchParams.set("limit", "1");
  url.searchParams.set("echo_query", "1");
  url.searchParams.set("caller_identity", CALLER);
  const rows = await fetchJson<StringResolution[]>(url.toString(), "string");
  return Array.isArray(rows) ? rows : [];
}

interface StringEdgeRow {
  stringId_A: string;
  stringId_B: string;
  preferredName_A: string;
  preferredName_B: string;
  score: number;
  nscore?: number;
  fscore?: number;
  pscore?: number;
  ascore?: number;
  escore?: number;
  dscore?: number;
  tscore?: number;
}

/** STRING evidence channels with their exact meaning (sub-scores are STRING's). */
function stringEvidence(row: StringEdgeRow): EdgeEvidence[] {
  const channels: [keyof StringEdgeRow, string, string][] = [
    ["escore", "experimental", "شواهد تجربی"],
    ["dscore", "database", "پایگاه‌داده‌های curated"],
    ["tscore", "textmining", "کاوش متنی"],
    ["ascore", "coexpression", "هم‌بیانی (چیدمان ژن آرایه‌ای)"],
    ["pscore", "prediction", "پیش‌بینی هم‌ریختی/چینش"],
    ["nscore", "neighborhood", "همسایگی ژنومی"],
    ["fscore", "fusion", "ادغام ژن‌ها"],
    ["pscore", "cooccurrence", "هم‌روی‌دادن ژن‌ها"],
  ];
  const seen = new Set<string>();
  const out: EdgeEvidence[] = [];
  for (const [key, kind, label] of channels) {
    const v = row[key] as number | undefined;
    if (typeof v === "number" && v > 0 && !seen.has(kind)) {
      seen.add(kind);
      out.push({ kind, label, score: v });
    }
  }
  return out;
}

/** First-shell interactions among the given proteins (STRING `network` endpoint). */
export async function stringNetwork(
  stringIds: string[],
  requiredScore: number,
): Promise<StringEdgeRow[]> {
  if (stringIds.length < 2) return [];
  const url = new URL(`${STRING_BASE}/network`);
  url.searchParams.set("identifiers", stringIds.join("\r"));
  url.searchParams.set("required_score", String(requiredScore));
  url.searchParams.set("caller_identity", CALLER);
  const rows = await fetchJson<StringEdgeRow[]>(url.toString(), "string");
  return Array.isArray(rows) ? rows : [];
}

/** Neighbours of one protein — used for network expansion levels. */
export async function stringPartners(
  stringId: string,
  requiredScore: number,
  limit: number,
): Promise<StringEdgeRow[]> {
  const url = new URL(`${STRING_BASE}/interaction_partners`);
  url.searchParams.set("identifiers", stringId);
  url.searchParams.set("required_score", String(requiredScore));
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 50)));
  url.searchParams.set("caller_identity", CALLER);
  const rows = await fetchJson<StringEdgeRow[]>(url.toString(), "string");
  return Array.isArray(rows) ? rows : [];
}

// ═══════════════════════════════════════════════════════════════════════════
//  Reactome — pathways, containment hierarchy, over-representation analysis
// ═══════════════════════════════════════════════════════════════════════════

const REACTOME_BASE = "https://reactome.org/ContentService";

interface ReactomeSearchEntry {
  stId: string;
  name: string;
  type: string;
  species?: string[];
  summation?: string;
}

/** Free-text pathway search (works for gene symbols and disease phrases).
 *  Reactome answers «no results» with HTTP 404 — that is an empty result. */
export async function reactomeSearchPathways(
  query: string,
  speciesName: string,
  limit: number,
): Promise<{ stId: string; name: string; description?: string }[]> {
  const url = new URL(`${REACTOME_BASE}/search/query`);
  url.searchParams.set("query", query);
  url.searchParams.set("types", "Pathway");
  url.searchParams.set("species", speciesName);
  url.searchParams.set("cluster", "true");
  let data: { results?: { entries?: ReactomeSearchEntry[] }[] };
  try {
    data = await fetchJson<{ results?: { entries?: ReactomeSearchEntry[] }[] }>(
      url.toString(),
      "reactome",
    );
  } catch (e) {
    if (e instanceof SourceError && e.code === "http_404") return [];
    throw e;
  }
  const out: { stId: string; name: string; description?: string }[] = [];
  for (const group of data.results ?? []) {
    for (const e of group.entries ?? []) {
      if (e.type !== "Pathway") continue;
      if (out.length >= limit) return out;
      out.push({
        stId: e.stId,
        name: stripHtml(e.name),
        description: e.summation ? stripHtml(e.summation).slice(0, 700) : undefined,
      });
    }
  }
  return out;
}

interface ReactomePathwayRow {
  stId: string;
  displayName: string;
  maxDepth?: number;
  isInDisease?: boolean;
  speciesName?: string;
}

/** Pathways a UniProt protein participates in (species-scoped).
 *  A 404 simply means Reactome has no record for this accession → empty. */
export async function reactomePathwaysForUniProt(
  accession: string,
  species: number,
  limit: number,
): Promise<{ stId: string; name: string; maxDepth?: number; inDisease?: boolean }[]> {
  const url = `${REACTOME_BASE}/data/mapping/UniProt/${encodeURIComponent(accession)}/pathways?species=${species}`;
  let rows: ReactomePathwayRow[];
  try {
    rows = await fetchJson<ReactomePathwayRow[]>(url, "reactome");
  } catch (e) {
    if (e instanceof SourceError && e.code === "http_404") return [];
    throw e;
  }
  return (Array.isArray(rows) ? rows : [])
    .slice()
    .sort((a, b) => (a.maxDepth ?? 99) - (b.maxDepth ?? 99))
    .slice(0, limit)
    .map((r) => ({
      stId: r.stId,
      name: r.displayName ?? r.stId,
      maxDepth: r.maxDepth,
      inDisease: r.isInDisease,
    }));
}

/** Direct child pathways of a Reactome pathway (containment hierarchy). */
export async function reactomeChildPathways(stId: string): Promise<string[]> {
  const url = `${REACTOME_BASE}/data/pathway/${encodeURIComponent(stId)}/containedEvents`;
  const rows = await fetchJson<
    { stId: string; schemaClass?: string; className?: string }[]
  >(url, "reactome");
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => r.schemaClass === "Pathway" || r.className === "Pathway")
    .map((r) => r.stId);
}

export interface EnrichmentPathway {
  stId: string;
  name: string;
  pValue: number;
  fdr: number;
  found: number;
  total: number;
  ratio: number;
  inDisease: boolean;
}

/**
 * Reactome over-representation analysis (real statistics from Reactome's
 * AnalysisService: p-value, FDR, entity counts — never computed locally).
 */
export async function reactomeEnrichment(
  identifiers: string[],
  limit: number,
): Promise<{
  pathways: EnrichmentPathway[];
  pathwaysFound: number;
  notFound: number;
}> {
  const url = new URL("https://reactome.org/AnalysisService/identifiers/projection");
  url.searchParams.set("pageSize", String(Math.min(Math.max(limit, 1), 100)));
  url.searchParams.set("page", "1");
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: identifiers.join("\n"),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    throw new SourceError(
      "reactome",
      "network",
      `Reactome در دسترس نیست: ${(err as Error)?.message ?? String(err)}`,
    );
  }
  if (!res.ok) {
    throw new SourceError("reactome", `http_${res.status}`, `Reactome AnalysisService HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    pathwaysFound?: number;
    identifiersNotFound?: number;
    pathways?: {
      stId: string;
      name: string;
      entities?: { pValue?: number; fdr?: number; found?: number; total?: number; ratio?: number };
      inDisease?: boolean;
    }[];
  };
  const pathways: EnrichmentPathway[] = (data.pathways ?? []).map((p) => ({
    stId: p.stId,
    name: p.name,
    pValue: p.entities?.pValue ?? 1,
    fdr: p.entities?.fdr ?? 1,
    found: p.entities?.found ?? 0,
    total: p.entities?.total ?? 0,
    ratio: p.entities?.ratio ?? 0,
    inDisease: p.inDisease ?? false,
  }));
  return {
    pathways,
    pathwaysFound: data.pathwaysFound ?? pathways.length,
    notFound: data.identifiersNotFound ?? 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  KEGG — pathways, diseases, drugs (REST API, no key)
// ═══════════════════════════════════════════════════════════════════════════

const KEGG_BASE = "https://rest.kegg.jp";

interface KeggLinkRow {
  from: string;
  to: string;
}

/** `rest.kegg.jp/link/<db>/<target>` → [{from,to}] (tab separated). */
export async function keggLink(db: string, target: string): Promise<KeggLinkRow[]> {
  const text = await fetchText(`${KEGG_BASE}/link/${db}/${encodeURIComponent(target)}`, "kegg");
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [from, to] = l.split("\t");
      return { from, to };
    })
    .filter((r) => r.from && r.to);
}

/** `rest.kegg.jp/find/<db>/<query>` → [{id,name}] */
export async function keggFind(
  db: string,
  query: string,
  limit = 8,
): Promise<{ id: string; name: string }[]> {
  const url = `${KEGG_BASE}/find/${db}/${encodeURIComponent(query)}`;
  const text = await fetchText(url, "kegg");
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, limit)
    .map((l) => {
      const idx = l.indexOf("\t");
      return { id: l.slice(0, idx), name: l.slice(idx + 1) };
    });
}

/**
 * KEGG gene names look like "TP53, P53, TRP53; description" (SYMBOL field) —
 * first comma-separated token, when it is a plausible symbol.
 */
function symbolOfKeggName(name: string): string | undefined {
  const first = name.split(/[;,]/)[0]?.trim().split(/\s+/)[0];
  if (!first || first.startsWith("(")) return undefined;
  return /^[A-Za-z][A-Za-z0-9.-]{1,15}$/.test(first) ? first : undefined;
}

/** Flat-file entry parser: KEY → value lines (NAME / DEFINITION / PATHWAY…). */
function parseKeggEntry(flat: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = flat.split("\n");
  let key = "";
  for (const line of lines) {
    if (/^\/\/\/$/.test(line)) break;
    const m = line.match(/^([A-Z]+)\s+(.*)$/);
    if (m) {
      key = m[1];
      out[key] = m[2];
    } else if (key) {
      out[key] = `${out[key]} ${line.trim()}`;
    }
  }
  return out;
}

/** Batch `get` (≤10 entries per call) → parsed records keyed by the
 *  REQUESTED id (KEGG's ENTRY field drops prefixes for genes/diseases/drugs,
 *  so keying by ENTRY would misalign lookups like `hsa:672` → `672`). */
export async function keggGetMany(ids: string[]): Promise<Record<string, Record<string, string>>> {
  const out: Record<string, Record<string, string>> = {};
  for (const part of chunk(ids.slice(0, 30), 10)) {
    const flat = await fetchText(`${KEGG_BASE}/get/${part.join("+")}`, "kegg");
    const blocks = flat
      .split("///")
      .map((b) => b.trim())
      .filter(Boolean);
    // KEGG returns blocks in the requested order.
    for (let i = 0; i < part.length; i++) {
      const block = blocks[i];
      if (!block) continue;
      out[part[i]] = parseKeggEntry(block);
    }
    await sleep(350); // be gentle with KEGG
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
//  UniProt — gene → protein accession, name and function comment
// ═══════════════════════════════════════════════════════════════════════════

export interface UniProtInfo {
  accession: string;
  entryId?: string;
  proteinName?: string;
  geneName?: string;
  organism?: string;
  function?: string;
}

function parseUniProtRow(row: {
  primaryAccession?: string;
  uniProtkbId?: string;
  proteinDescription?: {
    recommendedName?: { fullName?: { value?: string } };
    submissionNames?: { fullName?: { value?: string } }[];
  };
  genes?: { geneName?: { value?: string } }[];
  organism?: { scientificName?: string };
  comments?: { commentType?: string; texts?: { value?: string }[] }[];
}): UniProtInfo {
  const fn = (row.comments ?? [])
    .filter((c) => c.commentType === "FUNCTION")
    .flatMap((c) => (c.texts ?? []).map((t) => t.value ?? ""))
    .join(" ")
    .trim();
  return {
    accession: row.primaryAccession ?? "",
    entryId: row.uniProtkbId,
    proteinName:
      row.proteinDescription?.recommendedName?.fullName?.value ??
      row.proteinDescription?.submissionNames?.[0]?.fullName?.value,
    geneName: row.genes?.[0]?.geneName?.value,
    organism: row.organism?.scientificName,
    function: fn ? fn.slice(0, 800) : undefined,
  };
}

/** Find the reviewed UniProt entry for a gene symbol in a given organism. */
export async function uniprotForGene(symbol: string, species: number): Promise<UniProtInfo | null> {
  const url = new URL("https://rest.uniprot.org/uniprotkb/search");
  url.searchParams.set(
    "query",
    `(gene_exact:${symbol}) AND (organism_id:${species}) AND (reviewed:true)`,
  );
  url.searchParams.set("format", "json");
  url.searchParams.set(
    "fields",
    "accession,id,protein_name,gene_names,organism_name,cc_function",
  );
  url.searchParams.set("size", "1");
  const data = await fetchJson<{ results?: unknown[] }>(url.toString(), "uniprot");
  const first = data.results?.[0];
  if (!first) return null;
  return parseUniProtRow(first as Parameters<typeof parseUniProtRow>[0]);
}

/** Direct UniProt accession lookup (for protein-typed queries). */
export async function uniprotByAccession(accession: string): Promise<UniProtInfo | null> {
  const url = `https://rest.uniprot.org/uniprotkb/${encodeURIComponent(accession.toUpperCase())}?format=json`;
  const row = await fetchJson<Parameters<typeof parseUniProtRow>[0]>(url, "uniprot");
  return parseUniProtRow(row);
}

// ═══════════════════════════════════════════════════════════════════════════
//  NCBI Gene — official symbol, Entrez id, official name + summary
// ═══════════════════════════════════════════════════════════════════════════

const NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const NCBI_TOOL = "genova_bionetwork_explorer";

export interface NcbiGeneInfo {
  geneId: string;
  symbol?: string;
  name?: string; // official full name
  summary?: string;
  maplocation?: string;
  aliases?: string;
  chromosome?: string;
  organism?: string;
}

async function ncbiGet(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`${NCBI_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("tool", NCBI_TOOL);
  return await fetchJson<unknown>(url.toString(), "ncbi");
}

/** Resolve a gene symbol (in one organism) to its NCBI Gene record. */
export async function ncbiGeneForSymbol(
  symbol: string,
  speciesName: string,
): Promise<NcbiGeneInfo | null> {
  const term = `${symbol}[sym] AND "${speciesName}"[orgn]`;
  const search = (await ncbiGet("esearch.fcgi", {
    db: "gene",
    retmode: "json",
    retmax: "1",
    term,
  })) as { esearchresult?: { idlist?: string[] } };
  const id = search.esearchresult?.idlist?.[0];
  if (!id) return null;
  await sleep(400); // NCBI: ≤3 unauthenticated requests/second

  const summary = (await ncbiGet("esummary.fcgi", {
    db: "gene",
    retmode: "json",
    id,
  })) as { result?: Record<string, { name?: string; description?: string; summary?: string; maplocation?: string; otheraliases?: string; chromosome?: string; organism?: { scientificname?: string } }> };
  const rec = summary.result?.[id];
  if (!rec) return null;
  return {
    geneId: id,
    symbol: rec.name,
    name: rec.description,
    summary: rec.summary,
    maplocation: rec.maplocation,
    aliases: rec.otheraliases,
    chromosome: rec.chromosome,
    organism: rec.organism?.scientificname,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Open Targets — gene → disease association scores (best effort)
// ═══════════════════════════════════════════════════════════════════════════

const OT_URL = "https://api.platform.opentargets.io/api/v4/graphql";

async function otGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  return await fetchJson<T>(
    OT_URL,
    "opentargets",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    },
  );
}

/** Resolve a gene symbol to an Open Targets target (Ensembl gene id). */
export async function openTargetsResolveTarget(symbol: string): Promise<{
  ensemblId: string;
  symbol: string;
  name?: string;
} | null> {
  const data = await otGraphql<{
    search?: { hits?: { id: string; name?: string; entity?: string }[] };
  }>(
    `query($q: String!) {
      search(queryString: $q, entityNames: ["target"], paginate: { size: 5 }) {
        hits { id name entity }
      }
    }`,
    { q: symbol },
  );
  const hits = data.search?.hits ?? [];
  const exact = hits.find((h) => (h.name ?? "").toUpperCase() === symbol.toUpperCase()) ?? hits[0];
  if (!exact) return null;
  return { ensemblId: exact.id, symbol: exact.name ?? symbol, name: exact.name };
}

/** Top diseases associated with a target, with the real OT overall score. */
export async function openTargetsDiseases(
  ensemblId: string,
  limit: number,
): Promise<{ id: string; name: string; score: number }[]> {
  const data = await otGraphql<{
    target?: {
      associatedDiseases?: {
        count?: number;
        edges?: { score?: number; disease?: { id: string; name: string } }[];
      };
    };
  }>(
    `query($en: String!) {
      target(ensemblId: $en) {
        associatedDiseases(page: { size: ${Math.min(Math.max(limit, 1), 50)}, index: 0 }) {
          count
          edges { score disease { id name } }
        }
      }
    }`,
    { en: ensemblId },
  );
  return (data.target?.associatedDiseases?.edges ?? [])
    .filter((e) => e.disease)
    .map((e) => ({
      id: e.disease!.id,
      name: e.disease!.name,
      score: typeof e.score === "number" ? e.score : 0,
    }));
}

// ═══════════════════════════════════════════════════════════════════════════
//  GRAPH BUILDER — dedup + merge
// ═══════════════════════════════════════════════════════════════════════════

export class GraphBuilder {
  private nodes = new Map<string, GraphNode>();
  private edges = new Map<string, GraphEdge>();
  private maxNodes: number;
  private maxEdges: number;

  constructor(maxNodes = 80, maxEdges = 500) {
    this.maxNodes = maxNodes;
    this.maxEdges = maxEdges;
  }

  get nodeCount() {
    return this.nodes.size;
  }
  get edgeCount() {
    return this.edges.size;
  }
  hasNode(id: string) {
    return this.nodes.has(id);
  }
  hasEdge(id: string) {
    return this.edges.has(id);
  }
  nodeIds() {
    return [...this.nodes.keys()];
  }
  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  /** Add or merge a node. Returns false when the cap is reached. */
  addNode(node: GraphNode): boolean {
    const existing = this.nodes.get(node.id);
    if (existing) {
      for (const s of node.sources) if (!existing.sources.includes(s)) existing.sources.push(s);
      if (!existing.description && node.description) existing.description = node.description;
      if (node.ids) existing.ids = { ...(existing.ids ?? {}), ...node.ids };
      if (node.extra) existing.extra = { ...(existing.extra ?? {}), ...node.extra };
      if (!existing.url && node.url) existing.url = node.url;
      if (node.isSeed) existing.isSeed = true;
      return true;
    }
    if (this.nodes.size >= this.maxNodes) return false;
    this.nodes.set(node.id, { ...node, sources: [...node.sources] });
    return true;
  }

  /** Add an edge (both endpoints must exist). Duplicate ids merge scores. */
  addEdge(edge: GraphEdge): boolean {
    if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) return false;
    if (edge.source === edge.target) return false;
    const existing = this.edges.get(edge.id);
    if (existing) {
      if (existing.score == null && edge.score != null) {
        existing.score = edge.score;
        existing.evidence = edge.evidence ?? existing.evidence;
      }
      return true;
    }
    if (this.edges.size >= this.maxEdges) return false;
    this.edges.set(edge.id, edge);
    return true;
  }

  build(meta: NetworkGraph["meta"], statuses: SourceStatus[]): NetworkGraph {
    return { nodes: [...this.nodes.values()], edges: [...this.edges.values()], statuses, meta };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ENTITY SEARCH (spec §1) — symbols, ids and free-text questions
// ═══════════════════════════════════════════════════════════════════════════

export interface SearchParams {
  query: string;
  species: number;
  sources: GraphSourceId[];
  limit?: number;
}

/**
 * Multi-source entity resolution for the search bar. Returns candidates plus
 * one honest SourceStatus per source (ok / empty / failed / skipped).
 */
export async function searchEntities(params: SearchParams): Promise<{
  candidates: EntityCandidate[];
  statuses: SourceStatus[];
}> {
  const query = params.query.trim().slice(0, 200);
  const speciesName = SPECIES[params.species]?.name ?? "Homo sapiens";
  const sources = new Set(params.sources);
  const limit = params.limit ?? 12;
  const statuses: SourceStatus[] = [];
  const candidates: EntityCandidate[] = [];
  const seen = new Set<string>();

  const push = (c: EntityCandidate) => {
    const key = `${c.kind}:${c.label.toUpperCase()}`;
    if (seen.has(key) || candidates.length >= limit) return;
    seen.add(key);
    candidates.push(c);
  };

  const symbols = extractSymbolCandidates(query);
  if (looksLikeAccession(query)) symbols.unshift(query.toUpperCase());
  const uniqueSymbols = [...new Set(symbols)].slice(0, 5);

  // ── STRING (also the verifier for symbol-like tokens) ────────────────────
  if (sources.has("string")) {
    try {
      const rows = await stringGetIds(uniqueSymbols.length ? uniqueSymbols : [query], params.species);
      let count = 0;
      for (const r of rows) {
        if (!r.stringId) continue;
        if (!phraseMatchesName(r.queryItem ?? "", r.preferredName ?? "")) continue;
        push({
          id: r.stringId,
          label: r.preferredName || r.queryItem,
          kind: SYMBOL_RE.test(r.preferredName) ? "gene" : "protein",
          source: "string",
          description: r.annotation ? stripHtml(r.annotation).slice(0, 500) : undefined,
          organism: r.taxonName,
          ids: { stringId: r.stringId, query: r.queryItem },
          url: `https://string-db.org/network?identifiers=${encodeURIComponent(r.preferredName || r.queryItem)}&species=${params.species}`,
        });
        count++;
      }
      statuses.push({
        source: "string",
        status: count ? "ok" : "empty",
        message: count ? undefined : "STRING این عبارت را نشناخت",
        count,
      });
    } catch (e) {
      const err = e as SourceError;
      statuses.push({ source: "string", status: "failed", message: err.message });
    }
  }

  // ── NCBI Gene ────────────────────────────────────────────────────────────
  if (sources.has("ncbi")) {
    try {
      let count = 0;
      for (const symbol of uniqueSymbols.slice(0, 3)) {
        const g = await ncbiGeneForSymbol(symbol, speciesName);
        if (!g) continue;
        push({
          id: g.geneId,
          label: g.symbol ?? symbol,
          kind: "gene",
          source: "ncbi",
          description: g.summary ?? g.name,
          organism: g.organism ?? speciesName,
          ids: { entrez: g.geneId, symbol: g.symbol ?? symbol },
          url: `https://www.ncbi.nlm.nih.gov/gene/${g.geneId}`,
        });
        count++;
        await sleep(400);
      }
      statuses.push({
        source: "ncbi",
        status: count ? "ok" : uniqueSymbols.length ? "empty" : "skipped",
        message: count ? undefined : uniqueSymbols.length ? "ژنی در NCBI پیدا نشد" : "عبارت نماد ژن نیست",
        count,
      });
    } catch (e) {
      statuses.push({ source: "ncbi", status: "failed", message: (e as Error).message });
    }
  }

  // ── UniProt ──────────────────────────────────────────────────────────────
  if (sources.has("uniprot")) {
    try {
      let count = 0;
      if (looksLikeAccession(query)) {
        const p = await uniprotByAccession(query);
        if (p?.accession) {
          push({
            id: p.accession,
            label: p.geneName ?? p.entryId ?? p.accession,
            kind: "protein",
            source: "uniprot",
            description: p.proteinName,
            organism: p.organism,
            ids: { uniprot: p.accession },
            url: `https://www.uniprot.org/uniprotkb/${p.accession}/entry`,
          });
          count++;
        }
      } else {
        for (const symbol of uniqueSymbols.slice(0, 3)) {
          const p = await uniprotForGene(symbol, params.species);
          if (!p?.accession) continue;
          push({
            id: p.accession,
            label: p.geneName ?? symbol,
            kind: "gene",
            source: "uniprot",
            description: p.proteinName ?? p.function,
            organism: p.organism,
            ids: { uniprot: p.accession, symbol: p.geneName ?? symbol },
            url: `https://www.uniprot.org/uniprotkb/${p.accession}/entry`,
          });
          count++;
        }
      }
      statuses.push({
        source: "uniprot",
        status: count ? "ok" : "empty",
        message: count ? undefined : "پروتئینی در UniProt پیدا نشد",
        count,
      });
    } catch (e) {
      statuses.push({ source: "uniprot", status: "failed", message: (e as Error).message });
    }
  }

  // ── KEGG: disease / pathway text search ──────────────────────────────────
  if (sources.has("kegg")) {
    try {
      let count = 0;
      const diseases = await keggFind("disease", query, 4);
      for (const d of diseases) {
        push({
          id: d.id,
          label: d.name.split(" - ")[0],
          kind: "disease",
          source: "kegg",
          ids: { kegg: d.id },
          url: `https://www.kegg.jp/entry/${d.id}`,
        });
        count++;
      }
      const pathways = await keggFind("pathway", `${query} ${speciesName.split(" ")[0]}`, 4);
      for (const p of pathways) {
        push({
          id: p.id,
          label: p.name,
          kind: "pathway",
          source: "kegg",
          ids: { kegg: p.id },
          url: `https://www.kegg.jp/pathway/${p.id}`,
        });
        count++;
      }
      // Gene symbols as KEGG sees them (exact symbol preferred over prefixes).
      const geneHits = await keggFind("genes", query, 8);
      const symUpper = query.trim().toUpperCase();
      const ranked = [
        ...geneHits.filter((g) => symbolOfKeggName(g.name)?.toUpperCase() === symUpper),
        ...geneHits.filter((g) => symbolOfKeggName(g.name)?.toUpperCase() !== symUpper),
      ];
      for (const g of ranked.slice(0, 3)) {
        const sym = symbolOfKeggName(g.name) ?? g.id.split(":")[1];
        if (!sym) continue;
        push({
          id: g.id,
          label: sym,
          kind: "gene",
          source: "kegg",
          ids: { kegg: g.id, entrez: g.id.split(":")[1] ?? "" },
          url: `https://www.kegg.jp/entry/${g.id}`,
        });
        count++;
      }
      statuses.push({
        source: "kegg",
        status: count ? "ok" : "empty",
        message: count ? undefined : "بیماری/مسیر/ژنی با این عبارت در KEGG نیست",
        count,
      });
    } catch (e) {
      statuses.push({ source: "kegg", status: "failed", message: (e as Error).message });
    }
  }

  // ── Reactome: pathway text search ────────────────────────────────────────
  if (sources.has("reactome")) {
    try {
      const rows = await reactomeSearchPathways(query, speciesName, 4);
      for (const r of rows) {
        push({
          id: r.stId,
          label: r.name,
          kind: "pathway",
          source: "reactome",
          description: r.description,
          organism: speciesName,
          ids: { reactome: r.stId },
          url: `https://reactome.org/PathwayBrowser/#/${r.stId}`,
        });
      }
      statuses.push({
        source: "reactome",
        status: rows.length ? "ok" : "empty",
        message: rows.length ? undefined : "مسیری با این عبارت در Reactome نیست",
        count: rows.length,
      });
    } catch (e) {
      statuses.push({ source: "reactome", status: "failed", message: (e as Error).message });
    }
  }

  // ── Open Targets: gene → disease (best effort) ───────────────────────────
  if (sources.has("opentargets")) {
    try {
      const symbolsForOt = uniqueSymbols.slice(0, 2);
      if (!symbolsForOt.length) {
        statuses.push({
          source: "opentargets",
          status: "skipped",
          message: "عبارت، نماد ژن نیست — برای این منبع ژن وارد کنید",
        });
      } else {
        let count = 0;
        for (const symbol of symbolsForOt) {
          const t = await openTargetsResolveTarget(symbol);
          if (!t) continue;
          push({
            id: t.ensemblId,
            label: t.symbol,
            kind: "gene",
            source: "opentargets",
            ids: { ensembl: t.ensemblId, symbol: t.symbol },
            url: `https://platform.opentargets.org/target/${t.ensemblId}`,
          });
          count++;
        }
        statuses.push({
          source: "opentargets",
          status: count ? "ok" : "empty",
          message: count ? undefined : "ژنی در Open Targets پیدا نشد",
          count,
        });
      }
    } catch (e) {
      statuses.push({
        source: "opentargets",
        status: "failed",
        message: `دسترسی به Open Targets ممکن نشد: ${(e as Error).message}`,
      });
    }
  }

  // ── GeneCards: licence required — honest skip, never a fake result ───────
  if (sources.has("genecards")) {
    statuses.push({
      source: "genecards",
      status: "skipped",
      message: "GeneCards بدون مجوز API در دسترس نیست؛ نتیجه‌ای نمایش داده نمی‌شود.",
    });
  }

  return { candidates, statuses };
}

// ═══════════════════════════════════════════════════════════════════════════
//  NETWORK ASSEMBLY (spec §2–§4) — real edges only
// ═══════════════════════════════════════════════════════════════════════════

export interface BuildParams {
  /** Raw user inputs: gene symbols, accessions, disease phrases… */
  identifiers: string[];
  /** Original query text (kept for provenance / disease search). */
  query: string;
  species: number;
  sources: GraphSourceId[];
  /** STRING confidence threshold, 0–1 (0.4 = medium confidence). */
  requiredScore: number;
  /** Expansion levels: 0 = seeds only, 1 = STRING partners, 2 = second shell. */
  levels: number;
  maxNodes?: number;
}

const STRING_SCORE_NOTE =
  "combined score از STRING (مقیاس ۰–۱): اطمینان ارتباط عملکردی/تابعی؛ به‌تنهایی دلیل تعامل فیزیکی مستقیم نیست.";
const DISEASE_SCORE_NOTE =
  "ارتباط گزارش‌شده در منبع؛ به‌معنای اثبات رابطهٔ علت و معلول نیست.";

function geneNodeId(symbol: string) {
  return `gene:${symbol.toUpperCase()}`;
}
function proteinNodeId(acc: string) {
  return `protein:${acc.toUpperCase()}`;
}
function pathwayNodeId(stId: string) {
  return `pathway:${stId}`;
}
function diseaseNodeId(id: string) {
  return `disease:${id.replace(/^ds:/, "")}`;
}
function drugNodeId(id: string) {
  return `drug:${id.replace(/^dr:/, "")}`;
}

/**
 * Build a unified network from the enabled sources. Sources are independent:
 * one failing source is reported in `statuses` and the rest still build.
 */
export async function assembleNetwork(params: BuildParams): Promise<NetworkGraph> {
  const speciesName = SPECIES[params.species]?.name ?? "Homo sapiens";
  const sources = new Set(params.sources);
  const statuses: SourceStatus[] = [];
  const builder = new GraphBuilder(params.maxNodes ?? 80, 600);
  const levels = Math.min(Math.max(params.levels, 0), 2);

  const seeds = [...new Set(params.identifiers.map((s) => s.trim()).filter(Boolean))].slice(0, 12);
  const meta: NetworkGraph["meta"] = {
    query: params.query.slice(0, 300),
    species: params.species,
    speciesName,
    requestedSources: params.sources,
    requiredScore: params.requiredScore,
    levels,
    builtAt: Date.now(),
    fromCache: false,
  };

  if (!seeds.length) {
    statuses.push({ source: "string", status: "empty", message: "هیچ موجودیتی وارد نشده است" });
    return builder.build(meta, statuses);
  }

  // ── 0. STRING resolution — canonical ids for every seed ─────────────────
  let resolutions: StringResolution[] = [];
  if (sources.has("string")) {
    try {
      resolutions = await stringGetIds(seeds, params.species);
      const ok = resolutions.filter((r) => r.stringId).length;
      statuses.push({
        source: "string",
        status: ok ? "ok" : "empty",
        message: ok ? undefined : "STRING هیچ‌یک از عبارت‌ها را نشناخت",
        count: ok,
      });
    } catch (e) {
      statuses.push({ source: "string", status: "failed", message: (e as Error).message });
    }
  }

  // Which seeds remain unresolved (or were rejected as fuzzy matches)?
  // Natural-language phrases fall through to the text-search sources below.
  const acceptedResolutions = resolutions.filter((r) =>
    phraseMatchesName(r.queryItem ?? "", r.preferredName ?? ""),
  );
  const resolvedQueries = new Set(acceptedResolutions.map((r) => r.queryItem.toUpperCase()));
  const unresolvedSeeds = seeds.filter((s) => !resolvedQueries.has(s.toUpperCase()));
  const rawQuery = params.query.trim();
  /** Text queries fed to KEGG disease search + Reactome pathway search. */
  const textSeeds = [...new Set([...unresolvedSeeds, rawQuery])]
    .filter((q) => q.length >= 3 && q.length <= 200)
    .slice(0, 3);

  // ── Seeded nodes ────────────────────────────────────────────────────────
  // symbol → node id, stringId → node id, uniprot acc → node id
  const bySymbol = new Map<string, string>();
  const byStringId = new Map<string, string>();
  const byAccession = new Map<string, string>();
  const seedNodes: { nodeId: string; symbol?: string; accession?: string; stringId?: string }[] = [];

  for (const r of acceptedResolutions) {
    if (!r.stringId) continue;
    const label = r.preferredName || r.queryItem;
    const isGeneSymbol = SYMBOL_RE.test(label);
    const nodeId = isGeneSymbol ? geneNodeId(label) : proteinNodeId(r.stringId);
    const added = builder.addNode({
      id: nodeId,
      label,
      kind: isGeneSymbol ? "gene" : "protein",
      source: "string",
      sources: ["string"],
      description: r.annotation ? stripHtml(r.annotation).slice(0, 700) : undefined,
      organism: r.taxonName,
      ids: { stringId: r.stringId, query: r.queryItem },
      url: `https://string-db.org/network?identifiers=${encodeURIComponent(label)}&species=${r.ncbiTaxonId}`,
      isSeed: true,
    });
    if (!added) break;
    byStringId.set(r.stringId, nodeId);
    if (isGeneSymbol) bySymbol.set(label.toUpperCase(), nodeId);
    seedNodes.push({
      nodeId,
      symbol: isGeneSymbol ? label : undefined,
      stringId: r.stringId,
    });
  }

  // Seeds STRING could not resolve (e.g. disease phrases) — still create a
  // labelled node ONLY when another source recognizes them (below).
  const unresolvedNodeIds: { seed: string; nodeId: string }[] = [];

  // ── 1. UniProt (protein identity + function for gene seeds) ─────────────
  if (sources.has("uniprot")) {
    let count = 0;
    try {
      for (const s of seedNodes) {
        if (!s.symbol) continue;
        const p = await uniprotForGene(s.symbol, params.species);
        if (!p?.accession) continue;
        const nodeId = bySymbol.get(s.symbol.toUpperCase());
        if (!nodeId) continue;
        builder.addNode({
          id: nodeId,
          label: s.symbol,
          kind: "gene",
          source: "uniprot",
          sources: ["uniprot"],
          ids: { uniprot: p.accession },
          extra: {
            proteinName: p.proteinName ?? "",
            function: p.function ?? "",
          },
          url: `https://www.uniprot.org/uniprotkb/${p.accession}/entry`,
        });
        byAccession.set(p.accession.toUpperCase(), nodeId);
        s.accession = p.accession;
        count++;
      }
      // Standalone protein queries (accession typed directly).
      for (const seed of unresolvedSeeds) {
        if (!looksLikeAccession(seed)) continue;
        const p = await uniprotByAccession(seed);
        if (!p?.accession) continue;
        const nodeId = proteinNodeId(p.accession);
        builder.addNode({
          id: nodeId,
          label: p.geneName ?? p.entryId ?? p.accession,
          kind: "protein",
          source: "uniprot",
          sources: ["uniprot"],
          description: p.proteinName,
          organism: p.organism,
          ids: { uniprot: p.accession },
          extra: { function: p.function ?? "" },
          url: `https://www.uniprot.org/uniprotkb/${p.accession}/entry`,
          isSeed: true,
        });
        byAccession.set(p.accession.toUpperCase(), nodeId);
        unresolvedNodeIds.push({ seed, nodeId });
        count++;
      }
      statuses.push({
        source: "uniprot",
        status: count ? "ok" : unresolvedSeeds.length || seedNodes.length ? "empty" : "skipped",
        message: count ? undefined : "هیچ پروتئینی برای عبارت‌ها در UniProt پیدا نشد",
        count,
      });
    } catch (e) {
      statuses.push({ source: "uniprot", status: "failed", message: (e as Error).message });
    }
  }

  // ── 2. NCBI Gene (entrez id, official name, summary) ────────────────────
  if (sources.has("ncbi")) {
    let count = 0;
    try {
      for (const s of seedNodes) {
        if (!s.symbol) continue;
        const g = await ncbiGeneForSymbol(s.symbol, speciesName);
        await sleep(400);
        if (!g) continue;
        const nodeId = bySymbol.get(s.symbol.toUpperCase());
        if (!nodeId) continue;
        builder.addNode({
          id: nodeId,
          label: g.symbol ?? s.symbol,
          kind: "gene",
          source: "ncbi",
          sources: ["ncbi"],
          ids: { entrez: g.geneId },
          extra: {
            officialName: g.name ?? "",
            ncbiSummary: g.summary ?? "",
            mapLocation: g.maplocation ?? "",
            aliases: g.aliases ?? "",
            chromosome: g.chromosome ?? "",
          },
          url: `https://www.ncbi.nlm.nih.gov/gene/${g.geneId}`,
        });
        s.symbol = g.symbol ?? s.symbol;
        count++;
      }
      statuses.push({
        source: "ncbi",
        status: count ? "ok" : seedNodes.length ? "empty" : "skipped",
        message: count ? undefined : "ژنی در NCBI Gene پیدا نشد",
        count,
      });
    } catch (e) {
      statuses.push({ source: "ncbi", status: "failed", message: (e as Error).message });
    }
  }

  // ── 3. KEGG (pathways, diseases, drugs) ─────────────────────────────────
  if (sources.has("kegg")) {
    let count = 0;
    try {
      const keggPrefix = SPECIES[params.species]?.kegg;
      for (const s of seedNodes) {
        if (!s.symbol || !keggPrefix) continue;
        const seedNodeId = bySymbol.get(s.symbol.toUpperCase());
        if (!seedNodeId) continue;
        let entrez = builder.getNode(seedNodeId)?.ids?.entrez;
        if (!entrez) {
          // NCBI source may be off — resolve the Entrez id from KEGG directly.
          const hits = await keggFind("genes", s.symbol, 10).catch(() => []);
          const prefixHit =
            hits.find((h) => h.id.startsWith(`${keggPrefix}:`) && symbolOfKeggName(h.name) === s.symbol) ??
            hits.find((h) => h.id.startsWith(`${keggPrefix}:`));
          entrez = prefixHit?.id.split(":")[1];
          if (entrez) {
            builder.addNode({
              id: seedNodeId,
              label: s.symbol,
              kind: "gene",
              source: "kegg",
              sources: ["kegg"],
              ids: { entrez, kegg: `${keggPrefix}:${entrez}` },
            });
          }
        }
        const keggGene = entrez ? `${keggPrefix}:${entrez}` : null;
        if (!keggGene) continue;

        // Pathways
        const links = await keggLink("pathway", keggGene);
        const pathIds = links.map((l) => l.to.replace(/^path:/, "")).slice(0, 10);
        if (pathIds.length) {
          const entries = await keggGetMany(pathIds);
          for (const pid of pathIds) {
            const label = entries[pid]?.NAME ?? pid;
            const nodeId = pathwayNodeId(pid);
            if (!builder.addNode({
              id: nodeId,
              label,
              kind: "pathway",
              source: "kegg",
              sources: ["kegg"],
              organism: speciesName,
              ids: { kegg: pid },
              url: `https://www.kegg.jp/pathway/${pid}`,
            })) break;
            builder.addEdge({
              id: `kegg:${keggGene}->${pid}`,
              source: bySymbol.get(s.symbol.toUpperCase()) ?? "",
              target: nodeId,
              kind: "gene_pathway",
              sourceDb: "kegg",
              label: "عضو مسیر زیستی (KEGG)",
              directed: false,
              description: "عضویت ژن در مسیر زیستی ثبت‌شدهٔ KEGG",
            });
            count++;
          }
        }

        // Diseases
        const disLinks = await keggLink("disease", keggGene);
        const disIds = [...new Set(disLinks.map((l) => l.to.replace(/^ds:/, "")))].slice(0, 8);
        if (disIds.length) {
          const entries = await keggGetMany(disIds.map((d) => `ds:${d}`));
          for (const did of disIds) {
            const raw = entries[`ds:${did}`];
            const label = raw?.NAME?.split(";")[0]?.trim() ?? did;
            const nodeId = diseaseNodeId(did);
            if (!builder.addNode({
              id: nodeId,
              label,
              kind: "disease",
              source: "kegg",
              sources: ["kegg"],
              ids: { kegg: `ds:${did}` },
              extra: { definition: (raw?.DEFINITION ?? "").slice(0, 400) },
              url: `https://www.kegg.jp/entry/${did}`,
            })) break;
            builder.addEdge({
              id: `kegg:${keggGene}->ds:${did}`,
              source: bySymbol.get(s.symbol.toUpperCase()) ?? "",
              target: nodeId,
              kind: "gene_disease",
              sourceDb: "kegg",
              label: "ارتباط ژن–بیماری (KEGG)",
              directed: false,
              scoreNote: DISEASE_SCORE_NOTE,
              description: "ژن در پایگاه KEGG با این بیماری مرتبط ثبت شده است",
            });
            count++;
          }
        }

        // Drugs (real KEGG drug links)
        const drugLinks = await keggLink("drug", keggGene);
        const drugIds = [...new Set(drugLinks.map((l) => l.to.replace(/^dr:/, "")))].slice(0, 5);
        if (drugIds.length) {
          const entries = await keggGetMany(drugIds.map((d) => `dr:${d}`));
          for (const did of drugIds) {
            const raw = entries[`dr:${did}`];
            const label = raw?.NAME?.split(",")[0]?.trim() ?? did;
            const nodeId = drugNodeId(did);
            if (!builder.addNode({
              id: nodeId,
              label,
              kind: "drug",
              source: "kegg",
              sources: ["kegg"],
              ids: { kegg: `dr:${did}` },
              extra: { formula: raw?.FORMULA ?? "", indication: (raw?.INDICATION ?? "").slice(0, 300) },
              url: `https://www.kegg.jp/entry/${did}`,
            })) break;
            builder.addEdge({
              id: `kegg:${keggGene}->dr:${did}`,
              source: bySymbol.get(s.symbol.toUpperCase()) ?? "",
              target: nodeId,
              kind: "gene_disease",
              sourceDb: "kegg",
              label: "داروی مرتبط با ژن (KEGG)",
              directed: false,
              scoreNote: "فهرست داروهای مرتبط در KEGG؛ اثر دارو لزوماً مستقیم نیست",
            });
            count++;
          }
        }
      }

      // Disease-phrase / free-text seeds: which genes are linked to it?
      for (const seed of textSeeds) {
        const found = await keggFind("disease", seed, 3);
        if (!found.length) continue;
        const d = found[0];
        const did = d.id.replace(/^ds:/, "");
        const nodeId = diseaseNodeId(did);
        if (!builder.addNode({
          id: nodeId,
          label: d.name.split(" - ")[0],
          kind: "disease",
          source: "kegg",
          sources: ["kegg"],
          ids: { kegg: `ds:${did}` },
          url: `https://www.kegg.jp/entry/${did}`,
          isSeed: true,
        })) continue;
        unresolvedNodeIds.push({ seed, nodeId });
        count++;

        const geneLinks = await keggLink(`${keggPrefix ?? "hsa"}`, `ds:${did}`);
        const genes = geneLinks.slice(0, 12);
        if (genes.length) {
          const geneIds = genes.map((gl) => gl.to.replace(/^gene:/, ""));
          const geneEntries = await keggGetMany(geneIds);
          for (const kg of geneIds) {
            const rec = geneEntries[kg];
            const sym =
              (rec?.SYMBOL ? symbolOfKeggName(rec.SYMBOL) : undefined) ??
              (rec?.NAME ? symbolOfKeggName(rec.NAME) : undefined);
            if (!sym) continue;
            const gNodeId = geneNodeId(sym);
            if (!builder.addNode({
              id: gNodeId,
              label: sym,
              kind: "gene",
              source: "kegg",
              sources: ["kegg"],
              organism: speciesName,
              ids: { kegg: kg },
              url: `https://www.kegg.jp/entry/${kg}`,
            })) break;
            builder.addEdge({
              id: `kegg:${did}->${kg}`,
              source: nodeId,
              target: gNodeId,
              kind: "gene_disease",
              sourceDb: "kegg",
              label: "ژن مرتبط با بیماری (KEGG)",
              directed: false,
              scoreNote: DISEASE_SCORE_NOTE,
            });
            count++;
          }
        }
        break; // first recognized disease phrase only
      }

      statuses.push({
        source: "kegg",
        status: count ? "ok" : "empty",
        message: count ? undefined : "KEGG داده‌ای برای این عبارت‌ها نداشت",
        count,
      });
    } catch (e) {
      statuses.push({
        source: "kegg",
        status: count ? "ok" : "failed",
        message: count
          ? `برخی درخواست‌های KEGG ناموفق بود: ${(e as Error).message}`
          : (e as Error).message,
        count,
      });
    }
  }

  // ── 4. Reactome (pathways per protein + containment hierarchy) ──────────
  if (sources.has("reactome")) {
    let count = 0;
    try {
      // Pathways for seed proteins (UniProt acc obtained even if uniprot
      // source is off — Reactome maps by UniProt, this is a routing detail).
      const accessionOf = new Map<string, string>();
      const accForNode = (nodeId: string): string | undefined => {
        for (const [acc, id] of byAccession) if (id === nodeId) return acc;
        return undefined;
      };
      for (const s of seedNodes) {
        if (!s.symbol) continue;
        let acc = s.accession ?? accForNode(s.nodeId);
        if (!acc) {
          const p = await uniprotForGene(s.symbol, params.species).catch(() => null);
          acc = p?.accession;
          if (acc) {
            byAccession.set(acc.toUpperCase(), s.nodeId);
            s.accession = acc;
          }
        }
        if (acc) accessionOf.set(s.nodeId, acc);
      }
      const reactomePathwayIds: string[] = [];
      for (const [nodeId, acc] of accessionOf) {
        const rows = await reactomePathwaysForUniProt(acc, params.species, 8);
        for (const r of rows) {
          const pid = pathwayNodeId(r.stId);
          if (!builder.addNode({
            id: pid,
            label: r.name,
            kind: "pathway",
            source: "reactome",
            sources: ["reactome"],
            organism: speciesName,
            ids: { reactome: r.stId },
            extra: r.inDisease ? { inDisease: "yes" } : undefined,
            url: `https://reactome.org/PathwayBrowser/#/${r.stId}`,
          })) break;
          builder.addEdge({
            id: `reactome:${nodeId}->${r.stId}`,
            source: nodeId,
            target: pid,
            kind: "gene_pathway",
            sourceDb: "reactome",
            label: "عضو مسیر زیستی (Reactome)",
            directed: false,
            description: "پروتئین/ژن در مسیر Reactome ثبت شده است",
          });
          count++;
          if (!reactomePathwayIds.includes(r.stId) && reactomePathwayIds.length < 8)
            reactomePathwayIds.push(r.stId);
        }
      }

      // Pathway / disease text search (whatever the user typed).
      if (textSeeds.length) {
        for (const seed of textSeeds.slice(0, 2)) {
          const rows = await reactomeSearchPathways(seed, speciesName, 4);
          for (const r of rows) {
            const pid = pathwayNodeId(r.stId);
            if (!builder.addNode({
              id: pid,
              label: r.name,
              kind: "pathway",
              source: "reactome",
              sources: ["reactome"],
              description: r.description,
              organism: speciesName,
              ids: { reactome: r.stId },
              url: `https://reactome.org/PathwayBrowser/#/${r.stId}`,
              isSeed: true,
            })) continue;
            count++;
            unresolvedNodeIds.push({ seed, nodeId: pid });
            if (!reactomePathwayIds.includes(r.stId) && reactomePathwayIds.length < 8)
              reactomePathwayIds.push(r.stId);
          }
        }
      }

      // Containment hierarchy among pathways already in the network.
      for (const stId of reactomePathwayIds) {
        const children = await reactomeChildPathways(stId).catch(() => [] as string[]);
        for (const child of children) {
          const cid = pathwayNodeId(child);
          if (!builder.hasNode(cid)) continue;
          builder.addEdge({
            id: `reactome:${cid}->${stId}`,
            source: cid,
            target: pathwayNodeId(stId),
            kind: "pathway_hierarchy",
            sourceDb: "reactome",
            label: "جزئی از مسیر والد (Reactome)",
            directed: true,
            description: "سلسله‌مراتب نگهداری مسیرها در Reactome",
          });
        }
      }

      statuses.push({
        source: "reactome",
        status: count ? "ok" : "empty",
        message: count ? undefined : "Reactome مسیری برای این موجودیت‌ها نیافت",
        count,
      });
    } catch (e) {
      // Partial success is still a success — report the real failure alongside.
      statuses.push({
        source: "reactome",
        status: count ? "ok" : "failed",
        message: count
          ? `برخی درخواست‌های Reactome ناموفق بود: ${(e as Error).message}`
          : (e as Error).message,
        count,
      });
    }
  }

  // ── 5. STRING interactions (+ expansion levels) ─────────────────────────
  if (sources.has("string")) {
    let count = 0;
    try {
      const seedStringIds = [...byStringId.keys()];
      const addStringEdge = (row: StringEdgeRow) => {
        const a = byStringId.get(row.stringId_A) ?? bySymbol.get(row.preferredName_A.toUpperCase());
        const b = byStringId.get(row.stringId_B) ?? bySymbol.get(row.preferredName_B.toUpperCase());
        let src = a;
        let tgt = b;
        if (!src || !tgt) {
          // Partner outside the seed set — create its node (gene if symbol-like).
          if (!src) src = ensureStringNode(row.stringId_A, row.preferredName_A);
          if (!tgt) tgt = ensureStringNode(row.stringId_B, row.preferredName_B);
        }
        if (!src || !tgt) return false;
        const added = builder.addEdge({
          id: `string:${row.stringId_A}->${row.stringId_B}`,
          source: src,
          target: tgt,
          kind: "protein_interaction",
          sourceDb: "string",
          label: "ارتباط عملکردی پروتئین‌ها (STRING)",
          directed: false,
          score: row.score,
          scoreNote: STRING_SCORE_NOTE,
          evidence: stringEvidence(row),
        });
        if (added) count++;
        return added;
      };

      const ensureStringNode = (stringId: string, preferredName: string): string | undefined => {
        const existing = byStringId.get(stringId) ?? bySymbol.get(preferredName.toUpperCase());
        if (existing) return existing;
        const isGene = SYMBOL_RE.test(preferredName);
        const id = isGene ? geneNodeId(preferredName) : proteinNodeId(stringId);
        const ok = builder.addNode({
          id,
          label: preferredName || stringId,
          kind: isGene ? "gene" : "protein",
          source: "string",
          sources: ["string"],
          organism: speciesName,
          ids: { stringId },
          url: `https://string-db.org/network?identifiers=${encodeURIComponent(preferredName)}&species=${params.species}`,
        });
        if (!ok) return undefined;
        byStringId.set(stringId, id);
        if (isGene) bySymbol.set(preferredName.toUpperCase(), id);
        return id;
      };

      // Level 0 — interactions among the seeds
      if (seedStringIds.length >= 2) {
        const rows = await stringNetwork(seedStringIds, params.requiredScore);
        for (const row of rows) {
          if (!addStringEdge(row)) break;
        }
      }

      // Level 1 — partners of each seed
      if (levels >= 1) {
        for (const sid of seedStringIds.slice(0, 6)) {
          if (builder.nodeCount >= (params.maxNodes ?? 80)) break;
          const rows = await stringPartners(sid, params.requiredScore, 12);
          for (const row of rows) {
            if (!addStringEdge(row)) break;
          }
        }
      }

      // Level 2 — partners of the first shell (capped)
      if (levels >= 2) {
        const firstShell = [...byStringId.keys()].filter((id) => !seedStringIds.includes(id));
        for (const sid of firstShell.slice(0, 8)) {
          if (builder.nodeCount >= (params.maxNodes ?? 80)) break;
          const rows = await stringPartners(sid, params.requiredScore, 8);
          for (const row of rows) {
            if (!addStringEdge(row)) break;
          }
        }
      }

      // STRING nodes still in the graph without annotation — try UniProt name
      statuses.push({
        source: "string",
        status: count ? "ok" : seedStringIds.length ? "empty" : "skipped",
        message: count
          ? undefined
          : seedStringIds.length >= 2
            ? `با آستانهٔ اطمینان ${params.requiredScore.toFixed(2)} ارتباطی پیدا نشد؛ آستانه را پایین بیاورید`
            : "برای تعامل پروتئینی دست‌کم دو ژن وارد کنید",
        count,
      });
    } catch (e) {
      statuses.push({ source: "string", status: "failed", message: (e as Error).message });
    }
  }

  // ── 6. Open Targets (gene → disease with real scores) ───────────────────
  if (sources.has("opentargets")) {
    let count = 0;
    try {
      for (const s of seedNodes.slice(0, 4)) {
        if (!s.symbol) continue;
        const nodeId = bySymbol.get(s.symbol.toUpperCase());
        if (!nodeId) continue;
        const t = await openTargetsResolveTarget(s.symbol);
        if (!t) continue;
        const diseases = await openTargetsDiseases(t.ensemblId, 8);
        builder.addNode({
          id: nodeId,
          label: s.symbol,
          kind: "gene",
          source: "opentargets",
          sources: ["opentargets"],
          ids: { ensembl: t.ensemblId },
        });
        for (const d of diseases) {
          const did = diseaseNodeId(d.id);
          if (!builder.addNode({
            id: did,
            label: d.name,
            kind: "disease",
            source: "opentargets",
            sources: ["opentargets"],
            ids: { ensemblDisease: d.id },
            url: `https://platform.opentargets.org/disease/${d.id}`,
          })) break;
          builder.addEdge({
            id: `ot:${t.ensemblId}->${d.id}`,
            source: nodeId,
            target: did,
            kind: "gene_disease",
            sourceDb: "opentargets",
            label: "ارتباط ژن–بیماری (Open Targets)",
            directed: false,
            score: d.score,
            scoreNote: `overall association score از Open Targets (${d.score.toFixed(3)})؛ ${DISEASE_SCORE_NOTE}`,
          });
          count++;
        }
      }
      statuses.push({
        source: "opentargets",
        status: count ? "ok" : "empty",
        message: count ? undefined : "Open Targets ارتباطی برنگرداند",
        count,
      });
    } catch (e) {
      statuses.push({
        source: "opentargets",
        status: "failed",
        message: `دسترسی به Open Targets ممکن نشد: ${(e as Error).message}`,
      });
    }
  }

  // ── 7. GeneCards — licence required ─────────────────────────────────────
  if (sources.has("genecards")) {
    statuses.push({
      source: "genecards",
      status: "skipped",
      message: "GeneCards بدون مجوز API در دسترس نیست؛ داده‌ای بدون مجوز نمایش داده نمی‌شود.",
    });
  }

  // Drop nodes the user typed that NO source recognized (never fabricate).
  for (const seed of unresolvedSeeds) {
    const known = unresolvedNodeIds.find((u) => u.seed === seed);
    if (!known) {
      statuses.push({
        source: "string",
        status: "empty",
        message: `«${seed}» در هیچ منبع فعالی شناسایی نشد`,
      });
    }
  }

  return builder.build(meta, statuses);
}

// ═══════════════════════════════════════════════════════════════════════════
//  NODE EXPANSION (spec §2 — grow the network from any node)
// ═══════════════════════════════════════════════════════════════════════════

export interface ExpandParams {
  /** Existing node the user clicked. */
  node: { id: string; label: string; kind: EntityKind; ids?: Record<string, string> };
  species: number;
  sources: GraphSourceId[];
  requiredScore: number;
  limit?: number;
}

/**
 * Fetch the next shell around ONE node: STRING interaction partners,
 * KEGG/Reactome pathways, diseases — whichever sources are enabled.
 */
export async function expandNode(params: ExpandParams): Promise<{
  nodes: GraphNode[];
  edges: GraphEdge[];
  statuses: SourceStatus[];
}> {
  const speciesName = SPECIES[params.species]?.name ?? "Homo sapiens";
  const sources = new Set(params.sources);
  const statuses: SourceStatus[] = [];
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const limit = params.limit ?? 10;
  const { node } = params;

  const pushNode = (n: GraphNode) => {
    if (!nodes.some((x) => x.id === n.id)) nodes.push(n);
  };
  const pushEdge = (e: GraphEdge) => {
    if (e.source !== e.target && !edges.some((x) => x.id === e.id)) edges.push(e);
  };

  // ── STRING partners ─────────────────────────────────────────────────────
  if (sources.has("string")) {
    try {
      const stringId =
        node.ids?.stringId ??
        (await stringGetIds([node.label], params.species).then((r) => r[0]?.stringId).catch(() => undefined));
      if (stringId) {
        const rows = await stringPartners(stringId, params.requiredScore, limit);
        for (const row of rows) {
          const isGene = SYMBOL_RE.test(row.preferredName_B);
          const partnerId = isGene
            ? geneNodeId(row.preferredName_B)
            : proteinNodeId(row.stringId_B);
          pushNode({
            id: partnerId,
            label: row.preferredName_B,
            kind: isGene ? "gene" : "protein",
            source: "string",
            sources: ["string"],
            organism: speciesName,
            ids: { stringId: row.stringId_B },
            url: `https://string-db.org/network?identifiers=${encodeURIComponent(row.preferredName_B)}&species=${params.species}`,
          });
          pushEdge({
            id: `string:${stringId}->${row.stringId_B}`,
            source: node.id,
            target: partnerId,
            kind: "protein_interaction",
            sourceDb: "string",
            label: "ارتباط عملکردی پروتئین‌ها (STRING)",
            directed: false,
            score: row.score,
            scoreNote: STRING_SCORE_NOTE,
            evidence: stringEvidence(row),
          });
        }
        statuses.push({
          source: "string",
          status: rows.length ? "ok" : "empty",
          message: rows.length ? undefined : "همسایهٔ جدیدی با این آستانه پیدا نشد",
          count: rows.length,
        });
      } else {
        statuses.push({ source: "string", status: "empty", message: "شناسهٔ STRING برای این گره نیست" });
      }
    } catch (e) {
      statuses.push({ source: "string", status: "failed", message: (e as Error).message });
    }
  }

  // ── KEGG pathways / diseases for a gene node ────────────────────────────
  if (sources.has("kegg") && node.kind === "gene") {
    try {
      const prefix = SPECIES[params.species]?.kegg;
      const entrez = node.ids?.entrez;
      let count = 0;
      if (prefix && entrez) {
        const keggGene = `${prefix}:${entrez}`;
        const links = await keggLink("pathway", keggGene);
        const pathIds = links.map((l) => l.to.replace(/^path:/, "")).slice(0, limit);
        const entries = await keggGetMany(pathIds);
        for (const pid of pathIds) {
          const id = pathwayNodeId(pid);
          pushNode({
            id,
            label: entries[pid]?.NAME ?? pid,
            kind: "pathway",
            source: "kegg",
            sources: ["kegg"],
            organism: speciesName,
            ids: { kegg: pid },
            url: `https://www.kegg.jp/pathway/${pid}`,
          });
          pushEdge({
            id: `kegg:${keggGene}->${pid}`,
            source: node.id,
            target: id,
            kind: "gene_pathway",
            sourceDb: "kegg",
            label: "عضو مسیر زیستی (KEGG)",
            directed: false,
          });
          count++;
        }
        const disLinks = await keggLink("disease", keggGene);
        const disIds = [...new Set(disLinks.map((l) => l.to.replace(/^ds:/, "")))].slice(0, 6);
        const disEntries = await keggGetMany(disIds.map((d) => `ds:${d}`));
        for (const did of disIds) {
          const id = diseaseNodeId(did);
          pushNode({
            id,
            label: disEntries[`ds:${did}`]?.NAME?.split(";")[0]?.trim() ?? did,
            kind: "disease",
            source: "kegg",
            sources: ["kegg"],
            ids: { kegg: `ds:${did}` },
            url: `https://www.kegg.jp/entry/${did}`,
          });
          pushEdge({
            id: `kegg:${keggGene}->ds:${did}`,
            source: node.id,
            target: id,
            kind: "gene_disease",
            sourceDb: "kegg",
            label: "ارتباط ژن–بیماری (KEGG)",
            directed: false,
            scoreNote: DISEASE_SCORE_NOTE,
          });
          count++;
        }
      }
      statuses.push({
        source: "kegg",
        status: count ? "ok" : "empty",
        message: count ? undefined : "entrez id (از NCBI) برای این ژن ثبت نشده است",
        count,
      });
    } catch (e) {
      statuses.push({ source: "kegg", status: "failed", message: (e as Error).message });
    }
  }

  // ── Reactome pathways for a protein-carrying node ───────────────────────
  if (sources.has("reactome") && (node.kind === "gene" || node.kind === "protein")) {
    try {
      const acc = node.ids?.uniprot;
      let count = 0;
      if (acc) {
        const rows = await reactomePathwaysForUniProt(acc, params.species, limit);
        for (const r of rows) {
          const id = pathwayNodeId(r.stId);
          pushNode({
            id,
            label: r.name,
            kind: "pathway",
            source: "reactome",
            sources: ["reactome"],
            organism: speciesName,
            ids: { reactome: r.stId },
            url: `https://reactome.org/PathwayBrowser/#/${r.stId}`,
          });
          pushEdge({
            id: `reactome:${node.id}->${r.stId}`,
            source: node.id,
            target: id,
            kind: "gene_pathway",
            sourceDb: "reactome",
            label: "عضو مسیر زیستی (Reactome)",
            directed: false,
          });
          count++;
        }
      }
      statuses.push({
        source: "reactome",
        status: count ? "ok" : "empty",
        message: count ? undefined : "شناسهٔ UniProt برای این گره ثبت نشده است",
        count,
      });
    } catch (e) {
      statuses.push({ source: "reactome", status: "failed", message: (e as Error).message });
    }
  }

  // ── Open Targets diseases ───────────────────────────────────────────────
  if (sources.has("opentargets") && node.kind === "gene") {
    try {
      let count = 0;
      const t = await openTargetsResolveTarget(node.label);
      if (t) {
        const diseases = await openTargetsDiseases(t.ensemblId, limit);
        for (const d of diseases) {
          const id = diseaseNodeId(d.id);
          pushNode({
            id,
            label: d.name,
            kind: "disease",
            source: "opentargets",
            sources: ["opentargets"],
            ids: { ensemblDisease: d.id },
            url: `https://platform.opentargets.org/disease/${d.id}`,
          });
          pushEdge({
            id: `ot:${t.ensemblId}->${d.id}`,
            source: node.id,
            target: id,
            kind: "gene_disease",
            sourceDb: "opentargets",
            label: "ارتباط ژن–بیماری (Open Targets)",
            directed: false,
            score: d.score,
            scoreNote: `overall association score از Open Targets (${d.score.toFixed(3)})؛ ${DISEASE_SCORE_NOTE}`,
          });
          count++;
        }
      }
      statuses.push({
        source: "opentargets",
        status: count ? "ok" : "empty",
        message: count ? undefined : "ارتباطی پیدا نشد",
        count,
      });
    } catch (e) {
      statuses.push({
        source: "opentargets",
        status: "failed",
        message: `دسترسی به Open Targets ممکن نشد: ${(e as Error).message}`,
      });
    }
  }

  if (sources.has("genecards")) {
    statuses.push({
      source: "genecards",
      status: "skipped",
      message: "GeneCards بدون مجوز API در دسترس نیست.",
    });
  }

  return { nodes, edges, statuses };
}
