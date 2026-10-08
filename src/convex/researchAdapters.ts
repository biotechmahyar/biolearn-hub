/**
 * Research source adapters + enrichment (pure functions, no Convex deps).
 *
 * Architecture (so new sources can be added without rewrites):
 *   fetch<Source>Articles()      → raw records from the external API
 *   normalize<Source>Article()   → one NormalizedPaper per record
 *   classifyTopics()             → canonical Genova research topics
 *   buildGenovaSummary()         → extractive summary + key findings
 *
 * Genova is a discovery gateway, NOT a publisher: adapters fetch metadata and
 * abstracts only (never full copyrighted text) and always produce an official
 * `sourceUrl` that sends the reader to the original publisher.
 */

export type SourceId = "pubmed" | "pmc" | "elsevier";

/** Canonical research topics (spec §12). */
export const RESEARCH_TOPICS = [
  "Genetics",
  "Genomics",
  "NGS",
  "Cancer",
  "Microbiology",
  "Antibiotic Resistance",
  "CRISPR",
  "Bioinformatics",
  "Molecular Biology",
  "Cell Biology",
  "Immunology",
  "Virology",
  "Biotechnology",
] as const;

export const ARTICLE_TYPES = [
  "Research Article",
  "Review",
  "Systematic Review",
  "Meta-analysis",
  "Methods",
  "Clinical Study",
  "Case Report",
  "Data Article",
] as const;

export const SOURCE_LABELS: Record<SourceId, string> = {
  pubmed: "PubMed",
  pmc: "PMC",
  elsevier: "ScienceDirect",
};

/** Shared normalized shape handed to the Convex ingestion mutation. */
export interface NormalizedPaper {
  title: string;
  normalizedTitle: string;
  authors?: string;
  journal?: string;
  publisher?: string;
  articleType?: string;
  publicationDate?: number;
  doi?: string;
  pmid?: string;
  pmcid?: string;
  isOpenAccess?: boolean;
  license?: string;
  abstract?: string;
  genovaSummary?: string;
  keyFindings?: string[];
  topics?: string[];
  keywords?: string[];
  source: SourceId;
  sourceId?: string;
  sourceUrl?: string;
  citationCount?: number;
  imageUrl?: string;
  imageLicense?: string;
}

export class AdapterError extends Error {
  readonly source: SourceId;
  readonly code: string;

  constructor(source: SourceId, code: string, message: string) {
    super(message);
    this.name = "AdapterError";
    this.source = source;
    this.code = code;
  }
}

// ── Shared helpers ──────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

/** "2026-03-14" | "2026 Mar 14" | "2026" → epoch ms (UTC), else undefined. */
function parseDate(raw?: string | null): number | undefined {
  if (!raw) return undefined;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return Date.UTC(+iso[1], +iso[2] - 1, +iso[3]);
  const ymd = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
  if (ymd) return Date.UTC(+ymd[1], +ymd[2] - 1, +ymd[3]);
  const ym = raw.match(/^(\d{4})\s+([A-Za-z]{3})/);
  if (ym) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const mi = months.indexOf(ym[2]);
    if (mi >= 0) return Date.UTC(+ym[1], mi, 1);
  }
  const y = raw.match(/^(\d{4})/);
  if (y) return Date.UTC(+y[1], 0, 1);
  return undefined;
}

function doiUrl(doi?: string): string | undefined {
  return doi ? `https://doi.org/${doi.trim()}` : undefined;
}

// ── Topic classification (deterministic keyword rules) ──────────────────────

const TOPIC_RULES: { topic: string; patterns: RegExp[] }[] = [
  { topic: "Antibiotic Resistance", patterns: [/antibiotic[- ]resistan/i, /antimicrobial[- ]resistan/i, /drug[- ]resistan/i, /mdr\b/, /xdr\b/] },
  { topic: "CRISPR", patterns: [/crispr/i, /cas9/i, /cas12/i, /cas13/i, /base editing/i, /prime editing/i] },
  { topic: "NGS", patterns: [/next[- ]generation sequenc/i, /\bngs\b/i, /whole[- ]genome sequenc/i, /rnaseq\b/i, /rna[- ]seq/i, /metagenom/i, /llumina sequenc/i] },
  { topic: "Cancer", patterns: [/cancer/i, /carcinoma/i, /tumor/i, /tumour/i, /oncolog/i, /leukemi/i, /lymphoma/i, /metastas/i, /melanoma/i] },
  { topic: "Virology", patterns: [/virus/i, /viral/i, /virome/i, /sars[- ]?cov/i, /\bhiv\b/i, /influenza/i, /coronavirus/i, /bacteriophage/i] },
  { topic: "Immunology", patterns: [/immun/i, /antibod/i, /antigen/i, /cytokine/i, /vaccin/i, /t[- ]cell/i, /b[- ]cell/i, /innate immunity/i] },
  { topic: "Microbiology", patterns: [/bacteri/i, /microb/i, /fungi\b/i, /yeast\b/i, /prokaryot/i, /culture[- ]depend/i, /biofilm/i] },
  { topic: "Genomics", patterns: [/genom/i, /whole[- ]genome/i, /pangenom/i, /annotat/i] },
  { topic: "Genetics", patterns: [/geneti/i, /inherit/i, /chromosom/i, /polymorph/i, /heritab/i, /twin study/i] },
  { topic: "Bioinformatics", patterns: [/bioinformatic/i, /algorith/i, /machine learning/i, /deep learning/i, /database\b/i, /pipeline\b/i, /sequence align/i, /structural model/i] },
  { topic: "Molecular Biology", patterns: [/molecular/i, /transcript/i, /translation\b/i, /gene expression/i, /promoter/i, /splic/i, /plasmid/i, /clon(ing|e)\b/i] },
  { topic: "Cell Biology", patterns: [/cell\b/i, /cellular/i, /organel/i, /mitosis/i, /apoptosis/i, /migration/i, /signalling\b/i, /signaling\b/i] },
  { topic: "Biotechnology", patterns: [/biotechnolog/i, /ferment/i, /recombinant/i, /enzyme engineer/i, /metabolic engineer/i, /synthetic biology/i] },
];

/** Map free text → canonical topic slugs (max 6). */
export function classifyTopics(...texts: (string | undefined | null)[]): string[] {
  const hay = texts.filter(Boolean).join(" \n ");
  if (!hay.trim()) return [];
  const out: string[] = [];
  for (const rule of TOPIC_RULES) {
    if (rule.patterns.some((p) => p.test(hay))) {
      out.push(rule.topic);
      if (out.length >= 6) break;
    }
  }
  return out;
}

// ── Genova Summary (extractive, traceable to the abstract) ──────────────────

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

const AIM_CUES = /\b(aim|objective|purpose|we sought|we investigated|we evaluated|we assessed|we examined|this study|here we|background)\b/i;
const METHOD_CUES = /\b(method|we used|we performed|we analyzed|we analysed|we conducted|sequencing|assay|model|cohort|trial|randomi[sz]ed|via|using)\b/i;
const RESULT_CUES = /\b(result|we found|we show|we identified|revealed|showed|demonstrated|significantly|associated with|higher|lower|increased|decreased)\b/i;
const IMPACT_CUES = /\b(suggest|indicate|imply|may |could |potential|importance|provides|supports|strategy|framework)\b/i;

/**
 * Deterministic extractive summary + key findings built ONLY from the
 * abstract and metadata. Never invents claims; when the abstract is too
 * short it says so explicitly (spec §17).
 */
export function buildGenovaSummary(meta: {
  title: string;
  abstract?: string | undefined;
  journal?: string | undefined;
  publicationDate?: number | undefined;
}): { genovaSummary?: string; keyFindings: string[] } {
  const abstract = (meta.abstract ?? "").trim();
  const year = meta.publicationDate
    ? new Date(meta.publicationDate).getUTCFullYear()
    : null;

  if (abstract.length < 120) {
    return {
      genovaSummary:
        "چکیدهٔ کافی برای تولید خلاصه در دسترس نیست. برای درک مقاله، منبع اصلی را مطالعه کنید.",
      keyFindings: [
        `مقاله با عنوان «${meta.title}»${meta.journal ? ` در ${meta.journal}` : ""}${year ? ` (${year})` : ""} ثبت شده است.`,
        "منبع اصلی مقاله و چکیدهٔ کامل را از لینک رسمی بخوانید.",
      ],
    };
  }

  const sentences = splitSentences(abstract);
  const pick = (cue: RegExp, used: Set<number>): string | null => {
    for (let i = 0; i < sentences.length; i++) {
      if (!used.has(i) && cue.test(sentences[i])) {
        used.add(i);
        return sentences[i];
      }
    }
    return null;
  };
  const used = new Set<number>();

  const aim = pick(AIM_CUES, used) ?? sentences.find((_, i) => !used.has(i) && (used.add(i), true)) ?? null;
  const method = pick(METHOD_CUES, used);
  const result = pick(RESULT_CUES, used);
  const impact = pick(IMPACT_CUES, used) ?? [...sentences].reverse().find((_, i) => {
    const idx = sentences.length - 1 - i;
    if (used.has(idx)) return false;
    used.add(idx);
    return true;
  }) ?? null;

  const keyFindings: string[] = [];
  if (aim) keyFindings.push(`هدف مطالعه: ${aim}`);
  if (method) keyFindings.push(`روش اصلی: ${method}`);
  if (result) keyFindings.push(`مهم‌ترین یافته: ${result}`);
  if (impact) keyFindings.push(`اهمیت احتمالی: ${impact}`);
  while (keyFindings.length < 2 && sentences.length > keyFindings.length) {
    const extra = sentences[keyFindings.length + 1];
    if (!extra) break;
    keyFindings.push(extra);
  }

  const summarySentences = [aim, result, impact].filter(Boolean) as string[];
  const genovaSummary = summarySentences
    .slice(0, 3)
    .join(" ")
    .slice(0, 900);

  return { genovaSummary: genovaSummary || undefined, keyFindings: keyFindings.slice(0, 5) };
}

// ── PubMed adapter (NCBI E-utilities, no API key required) ──────────────────

const NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const NCBI_TOOL = "genova_research_library";

async function ncbiGet(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`${NCBI_BASE}/${path}`);
  for (const [k, val] of Object.entries(params)) url.searchParams.set(k, val);
  url.searchParams.set("tool", NCBI_TOOL);

  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch (err) {
    throw new AdapterError("pubmed", "network", `PubMed unreachable: ${(err as Error).message}`);
  }
  if (!res.ok) {
    throw new AdapterError("pubmed", `http_${res.status}`, `PubMed returned HTTP ${res.status}`);
  }
  return await res.json();
}

interface PubmedSummary {
  uid?: string;
  title?: string;
  sortpubdate?: string;
  pubdate?: string;
  source?: string;
  authors?: { name?: string }[];
  articleids?: { idtype?: string; value?: string }[];
  fulljournalname?: string;
  elocationid?: string;
}

/**
 * Fetch recent PubMed records for a free-text query.
 * Metadata + abstract via esearch → esummary → efetch (XML abstracts).
 */
export async function fetchPubMedArticles(
  query: string,
  limit: number,
): Promise<NormalizedPaper[]> {
  const search = (await ncbiGet("esearch.fcgi", {
    db: "pubmed",
    retmode: "json",
    retmax: String(Math.min(limit, 40)),
    sort: "date",
    term: query,
  })) as { esearchresult?: { idlist?: string[] } };

  const ids = search.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];
  await sleep(400); // NCBI rate limit: ≤3 req/s unauthenticated

  const summary = (await ncbiGet("esummary.fcgi", {
    db: "pubmed",
    retmode: "json",
    id: ids.join(","),
  })) as { result?: Record<string, PubmarySummaryAlias> };
  await sleep(400);

  const abstracts = await fetchPubmedAbstracts(ids).catch(() => new Map<string, string>());

  const out: NormalizedPaper[] = [];
  for (const pmid of ids) {
    const rec = summary.result?.[pmid];
    if (!rec || !rec.title || rec.title === "No items found.") continue;
    const paper = normalizePubMedArticle(pmid, rec, abstracts.get(pmid));
    if (paper) out.push(paper);
  }
  return out;
}

type PubmarySummaryAlias = PubmedSummary;

async function fetchPubmedAbstracts(ids: string[]): Promise<Map<string, string>> {
  const url = new URL(`${NCBI_BASE}/efetch.fcgi`);
  url.searchParams.set("db", "pubmed");
  url.searchParams.set("retmode", "xml");
  url.searchParams.set("id", ids.join(","));
  url.searchParams.set("tool", NCBI_TOOL);
  const res = await fetch(url);
  if (!res.ok) return new Map();
  const xml = await res.text();
  const map = new Map<string, string>();
  const articles = xml.split("<PubmedArticle>");
  for (const chunk of articles.slice(1)) {
    const pmid = chunk.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1];
    if (!pmid) continue;
    const abstractParts = [...chunk.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)];
    const text = abstractParts
      .map((m) => stripXml(m[1]))
      .join(" ")
      .trim();
    if (text) map.set(pmid, text.slice(0, 12000));
  }
  return map;
}

function stripXml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePubMedArticle(
  pmid: string,
  rec: PubmedSummary,
  abstract?: string,
): NormalizedPaper | null {
  const title = stripXml(rec.title ?? "").trim();
  if (!title) return null;

  const doi = rec.articleids?.find((a) => a.idtype === "doi")?.value?.trim();
  const pmcid = rec.articleids?.find((a) => a.idtype === "pmc")?.value?.trim();
  const journal = rec.fulljournalname || rec.source || undefined;
  const authors = (rec.authors ?? [])
    .map((a) => a.name?.trim())
    .filter(Boolean)
    .join("; ")
    .slice(0, 500) || undefined;
  const publicationDate = parseDate(rec.sortpubdate || rec.pubdate);
  const keywords = extractKeywords(title, abstract);
  const enriched = buildGenovaSummary({ title, abstract, journal, publicationDate });

  return {
    title,
    normalizedTitle: normalizeTitle(title),
    authors,
    journal,
    articleType: "Research Article",
    publicationDate,
    doi,
    pmid,
    pmcid,
    isOpenAccess: !!pmcid,
    license: pmcid ? "Free full text available via PMC" : undefined,
    abstract,
    ...enriched,
    topics: classifyTopics(title, abstract, keywords.join(" "), journal),
    keywords,
    source: "pubmed",
    sourceId: pmid,
    sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
  };
}

function extractKeywords(...texts: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const t of texts) {
    if (!t) continue;
    for (const m of t.matchAll(/["“]([^"”]{3,40})["”]/g)) {
      seen.add(m[1].trim());
      if (seen.size >= 12) break;
    }
  }
  return [...seen];
}

// ── PMC adapter (PubMed Central via E-utilities, open-access focus) ─────────

export async function fetchPMCArticles(
  query: string,
  limit: number,
): Promise<NormalizedPaper[]> {
  const search = (await ncbiGet("esearch.fcgi", {
    db: "pmc",
    retmode: "json",
    retmax: String(Math.min(limit, 30)),
    sort: "date",
    term: `${query} AND open access[filter]`,
  })) as { esearchresult?: { idlist?: string[] } };

  const ids = search.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];
  await sleep(400);

  const summary = (await ncbiGet("esummary.fcgi", {
    db: "pmc",
    retmode: "json",
    id: ids.join(","),
  })) as { result?: Record<string, PmcSummary> };

  const out: NormalizedPaper[] = [];
  for (const pmcidNum of ids) {
    const rec = summary.result?.[pmcidNum];
    if (!rec || !rec.title || rec.title === "No items found.") continue;
    const paper = normalizePMCArticle(pmcidNum, rec);
    if (paper) out.push(paper);
  }
  return out;
}

interface PmcSummary {
  title?: string;
  sortpubdate?: string;
  pubdate?: string;
  source?: string;
  authors?: { name?: string }[];
  articleids?: { idtype?: string; value?: string }[];
}

export function normalizePMCArticle(pmcidNum: string, rec: PmcSummary): NormalizedPaper | null {
  const pmcid = rec.articleids?.find((a) => a.idtype === "pmc")?.value?.trim()
    ?? `PMC${pmcidNum}`;
  const pmid = rec.articleids?.find((a) => a.idtype === "pubmed")?.value?.trim();
  const doi = rec.articleids?.find((a) => a.idtype === "doi")?.value?.trim();
  const title = stripXml(rec.title ?? "").trim();
  if (!title) return null;

  const journal = rec.source || undefined;
  const authors = (rec.authors ?? [])
    .map((a) => a.name?.trim())
    .filter(Boolean)
    .join("; ")
    .slice(0, 500) || undefined;
  const publicationDate = parseDate(rec.sortpubdate || rec.pubdate);
  const enriched = buildGenovaSummary({ title, journal, publicationDate });

  return {
    title,
    normalizedTitle: normalizeTitle(title),
    authors,
    journal,
    articleType: "Research Article",
    publicationDate,
    doi,
    pmid,
    pmcid,
    isOpenAccess: true,
    license: "Open Access (PubMed Central)",
    // Abstracts are fetched lazily on the detail page from the publisher;
    // PMC summaries here stay metadata-only to keep sync light.
    ...enriched,
    topics: classifyTopics(title, journal),
    keywords: [],
    source: "pmc",
    sourceId: pmcid,
    sourceUrl: `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/`,
  };
}

// ── Elsevier / ScienceDirect adapter (requires ELSEVIER_API_KEY) ────────────

const ELSEVIER_SEARCH = "https://api.elsevier.com/content/search/scopus";

export async function fetchElsevierArticles(
  query: string,
  limit: number,
  apiKey: string,
): Promise<NormalizedPaper[]> {
  if (!apiKey || !apiKey.trim()) {
    throw new AdapterError(
      "elsevier",
      "missing_api_key",
      "ELSEVIER_API_KEY is not configured — ScienceDirect sync skipped.",
    );
  }

  const url = new URL(ELSEVIER_SEARCH);
  url.searchParams.set("query", `all("${query.replace(/"/g, "")}")`);
  url.searchParams.set("count", String(Math.min(limit, 25)));
  url.searchParams.set("sort", "-coverDate");
  url.searchParams.set("view", "COMPLETE");

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "X-ELS-APIKey": apiKey.trim(),
        Accept: "application/json",
      },
    });
  } catch (err) {
    throw new AdapterError("elsevier", "network", `Elsevier unreachable: ${(err as Error).message}`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new AdapterError("elsevier", "auth", "Elsevier rejected the API key.");
  }
  if (res.status === 429) {
    throw new AdapterError("elsevier", "rate_limited", "Elsevier rate limit reached.");
  }
  if (!res.ok) {
    throw new AdapterError("elsevier", `http_${res.status}`, `Elsevier returned HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    "search-results"?: {
      entry?: ElsevierEntry[];
    };
  };
  const entries = data["search-results"]?.entry ?? [];
  const out: NormalizedPaper[] = [];
  for (const entry of entries) {
    const paper = normalizeElsevierArticle(entry);
    if (paper) out.push(paper);
  }
  return out;
}

interface ElsevierEntry {
  "dc:identifier"?: string;
  "dc:title"?: string;
  "dc:creator"?: string;
  "dc:description"?: string;
  "prism:publicationName"?: string;
  "prism:doi"?: string;
  "prism:coverDate"?: string;
  "prism:url"?: string;
  "prism:issn"?: string;
  "openaccess"?: string;
  "citedby-count"?: string;
}

export function normalizeElsevierArticle(entry: ElsevierEntry): NormalizedPaper | null {
  const title = stripXml(entry["dc:title"] ?? "").trim();
  if (!title) return null;

  const doi = entry["prism:doi"]?.trim();
  const scopusId = entry["dc:identifier"]?.replace(/^SCOPUS_ID:/, "");
  const abstractRaw = entry["dc:description"]
    ? stripXml(entry["dc:description"]).trim()
    : undefined;
  const abstract = abstractRaw && abstractRaw.length > 40 ? abstractRaw.slice(0, 12000) : undefined;
  const publicationDate = parseDate(entry["prism:coverDate"]);
  const journal = entry["prism:publicationName"]?.trim();
  const isOpenAccess = entry["openaccess"] === "true" || entry["openaccess"] === "1";
  const enriched = buildGenovaSummary({ title, abstract, journal, publicationDate });

  return {
    title,
    normalizedTitle: normalizeTitle(title),
    authors: entry["dc:creator"]?.trim().slice(0, 500) || undefined,
    journal,
    publisher: "Elsevier",
    articleType: "Research Article",
    publicationDate,
    doi,
    isOpenAccess,
    license: isOpenAccess ? "Open Access (Elsevier)" : undefined,
    abstract,
    ...enriched,
    topics: classifyTopics(title, abstract, journal),
    keywords: [],
    citationCount: entry["citedby-count"] ? Number(entry["citedby-count"]) || undefined : undefined,
    source: "elsevier",
    sourceId: scopusId || doi,
    // Always send the reader to the official page: DOI resolver first,
    // Scopus record as a fallback.
    sourceUrl: doiUrl(doi) ?? entry["prism:url"] ?? undefined,
  };
}
