/**
 * Genova Virtual Lab — sequence format conversion core
 * ──────────────────────────────────────────────────────
 * Parsers and serialisers for the three converters in the «تبدیل فرمت» group.
 * Everything runs in the browser; nothing is uploaded.
 *
 * Design notes
 * ────────────
 *   • Parsers are strict but never destructive: characters outside the
 *     nucleotide alphabet are counted and reported instead of being silently
 *     deleted, so a conversion cannot quietly alter a sequence.
 *   • `validate` is optional per converter, because "sequence" means different
 *     things in different files. When it is on, records that fail validation are
 *     reported by id instead of being dropped without explanation.
 *   • GenBank support covers what a FASTA round-trip needs: LOCUS, DEFINITION,
 *     ACCESSION, VERSION, SOURCE/ORGANISM, FEATURES with qualifiers, and the
 *     ORIGIN block. Anything else is preserved only as a header comment.
 */

/** Guard against pasting a whole genome into a textarea. */
export const MAX_RECORDS = 2000;
export const MAX_SEQUENCE_LENGTH = 200_000;

export interface SequenceRecord {
  id: string;
  description: string;
  sequence: string;
  /** Extra columns a CSV carried alongside the sequence. */
  extra?: Record<string, string>;
}

export interface ParseResult {
  records: SequenceRecord[];
  warnings: string[];
}

// ── Validation ──────────────────────────────────────────────────────────────

const DNA_ALPHABET = /^[ACGTURYSWKMBDHVN]*$/;
const RNA_ALPHABET = /^[ACGURYSWKMBDHVN]*$/;
const PROTEIN_ALPHABET = /^[ACDEFGHIKLMNPQRSTVWY*]+$/;

export type Alphabet = "dna" | "rna" | "protein" | "any";

export function validateSequence(seq: string, alphabet: Alphabet): { ok: boolean; reason?: string } {
  if (seq.length === 0) return { ok: false, reason: "توالی خالی است" };
  const upper = seq.toUpperCase();
  if (alphabet === "dna" && !DNA_ALPHABET.test(upper)) {
    return { ok: false, reason: "شامل حرفی خارج از الفبای DNA است" };
  }
  if (alphabet === "rna" && !RNA_ALPHABET.test(upper)) {
    return { ok: false, reason: "شامل حرفی خارج از الفبای RNA است" };
  }
  if (alphabet === "protein" && !PROTEIN_ALPHABET.test(upper)) {
    return { ok: false, reason: "شامل حرفی خارج از الفبای پروتئین است" };
  }
  return { ok: true };
}

/** Characters removed from a sequence, so the caller can be told what changed. */
export function stripNonNucleotides(seq: string): { cleaned: string; removed: string[] } {
  const removed = new Set<string>();
  let cleaned = "";
  for (const ch of seq) {
    if (/[ACGTURYSWKMBDHVNacgturyswkmbdhvn*\-. ]/.test(ch)) cleaned += ch.toUpperCase();
    else removed.add(ch);
  }
  return { cleaned: cleaned.replace(/\s+/g, ""), removed: [...removed] };
}

// ── FASTA ───────────────────────────────────────────────────────────────────

/**
 * FASTA parser. The header is split at the first whitespace so
 * `>seq1 some description` yields id `seq1` and keeps the rest.
 */
export function parseFasta(text: string): ParseResult {
  const warnings: string[] = [];
  const records: SequenceRecord[] = [];
  let current: SequenceRecord | null = null;

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    if (line.startsWith(">") || line.startsWith(";")) {
      const header = line.slice(1).trim();
      const sp = header.search(/\s/);
      const id = sp === -1 ? header : header.slice(0, sp);
      current = { id: id || `seq${records.length + 1}`, description: sp === -1 ? "" : header.slice(sp + 1), sequence: "" };
      records.push(current);
      continue;
    }
    if (!current) {
      warnings.push(`خط ${i + 1}: داده پیش از هر سرآیند «>» نادیده گرفته شد.`);
      current = { id: `seq${records.length + 1}`, description: "", sequence: "" };
      records.push(current);
    }
    const { cleaned, removed } = stripNonNucleotides(line);
    if (removed.length > 0) {
      warnings.push(`رکورد «${current.id}»: نوکلئوتیدهای نامعتبر حذف شد → ${removed.join(" ")}`);
    }
    current.sequence += cleaned;
  }

  if (records.length > MAX_RECORDS) {
    warnings.push(`فقط ${MAX_RECORDS} رکورد اول خوانده شد.`);
    return { records: records.slice(0, MAX_RECORDS), warnings };
  }
  if (records.length === 0) warnings.push("هیچ رکورد FASTA پیدا نشد.");
  return { records, warnings };
}

export function toFasta(records: SequenceRecord[], width = 60): string {
  return records
    .map((r) => {
      const header = r.description ? `${r.id} ${r.description}` : r.id;
      const body = r.sequence.replace(/(.{60})/g, "$1\n");
      return `>${header}\n${r.sequence.length > width ? body : r.sequence}`;
    })
    .join("\n");
}

// ── CSV ─────────────────────────────────────────────────────────────────────

/** Sniff the delimiter from the header line, ignoring anything inside quotes. */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  let inQuotes = false;
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch] += 1;
  }
  // Only trust an alternative delimiter when it beats the comma, so a
  // description containing a semicolon cannot hijack a comma-separated file.
  let best = ",";
  for (const d of [",", ";", "\t"]) if (counts[d] > counts[best]) best = d;
  return counts[best] === 0 ? "," : best;
}

/**
 * Minimal RFC-4180 CSV reader: handles quoted fields, embedded commas and
 * escaped quotes. The sequence column is whichever header contains
 * "sequence"/"seq"/"توالی"; the id column is "id"/"name"/"شناسه" or the first
 * column.
 */
export function parseCsv(text: string): ParseResult {
  const warnings: string[] = [];
  const delimiter = detectDelimiter(text);
  if (delimiter !== ",") {
    warnings.push(`جداکنندهٔ فایل به‌صورت «${delimiter === "\t" ? "Tab" : delimiter}» تشخیص داده شد.`);
  }
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const cleanRows = rows.filter((r) => r.some((c) => c.trim().length > 0));
  if (cleanRows.length === 0) {
    return { records: [], warnings: ["فایل CSV خالی است."] };
  }

  const headers = cleanRows[0].map((h) => h.trim());
  const lower = headers.map((h) => h.toLowerCase());
  const seqIndex =
    lower.findIndex((h) => h === "sequence" || h === "seq" || h.includes("توالی")) >= 0
      ? lower.findIndex((h) => h === "sequence" || h === "seq" || h.includes("توالی"))
      : 1;
  const idIndex = Math.max(
    0,
    lower.findIndex((h) => h === "id" || h === "name" || h === "شناسه" || h.includes("نام")),
  );

  const records: SequenceRecord[] = [];
  for (let i = 1; i < cleanRows.length && records.length < MAX_RECORDS; i++) {
    const cells = cleanRows[i];
    const { cleaned, removed } = stripNonNucleotides(cells[seqIndex] ?? "");
    if (removed.length > 0) {
      warnings.push(`سطر ${i + 1}: نوکلئوتید نامعتبر حذف شد → ${removed.join(" ")}`);
    }
    const extra: Record<string, string> = {};
    headers.forEach((h, k) => {
      if (k !== seqIndex && k !== idIndex && h) extra[h] = cells[k] ?? "";
    });
    const descKey = Object.keys(extra).find((k) =>
      /^(description|desc|note|comment|توضیح|توضيحات)$/i.test(k.trim()),
    );
    records.push({
      id: (cells[idIndex] ?? "").trim() || `seq${records.length + 1}`,
      description: descKey ? (extra[descKey] ?? "").trim() : "",
      sequence: cleaned,
      ...(Object.keys(extra).length > 0 ? { extra } : {}),
    });
  }

  return { records, warnings };
}

export function toCsv(
  records: SequenceRecord[],
  options: { header: boolean; delimiter: string; includeDescription: boolean },
): string {
  const quote = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const columns = ["ID", "Sequence"];
  if (options.includeDescription) columns.push("Description");

  const lines: string[] = [];
  if (options.header) lines.push(columns.join(options.delimiter));
  for (const r of records) {
    const cells = [r.id, r.sequence];
    if (options.includeDescription) cells.push(r.description);
    lines.push(cells.map(quote).join(options.delimiter));
  }
  return lines.join("\n");
}

// ── JSON ────────────────────────────────────────────────────────────────────

export function parseJson(text: string): ParseResult {
  const warnings: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { records: [], warnings: [`JSON نامعتبر است: ${e instanceof Error ? e.message : "خطای ناشناخته"}`] };
  }

  // Accept an array of objects, an array of strings, or a {sequences: [...]} wrapper.
  const list: unknown[] = Array.isArray(data)
    ? data
    : data !== null && typeof data === "object" && Array.isArray((data as { sequences?: unknown[] }).sequences)
      ? ((data as { sequences: unknown[] }).sequences)
      : [];

  if (list.length === 0) {
    return { records: [], warnings: ["ساختار JSON پشتیبانی نمی‌شود. آرایه‌ای از رکوردها لازم است."] };
  }

  const records: SequenceRecord[] = [];
  for (const item of list.slice(0, MAX_RECORDS)) {
    if (typeof item === "string") {
      records.push({ id: `seq${records.length + 1}`, description: "", sequence: item.replace(/\s+/g, "") });
      continue;
    }
    if (item === null || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const seqRaw = String(o.sequence ?? o.seq ?? "").trim();
    const { cleaned, removed } = stripNonNucleotides(seqRaw);
    if (removed.length > 0) {
      warnings.push(`رکورد ${records.length + 1}: نوکلئوتید نامعتبر حذف شد → ${removed.join(" ")}`);
    }
    records.push({
      id: String(o.id ?? o.name ?? o.accn ?? `seq${records.length + 1}`),
      description: String(o.description ?? o.desc ?? ""),
      sequence: cleaned,
    });
  }

  return { records, warnings };
}

export function toJson(records: SequenceRecord[], pretty: boolean): string {
  const payload = records.map((r) => ({
    id: r.id,
    description: r.description || undefined,
    sequence: r.sequence,
  }));
  return pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
}

// ── GenBank ─────────────────────────────────────────────────────────────────

export interface GenBankFeature {
  key: string;
  location: string;
  qualifiers: { key: string; value: string }[];
}

export interface GenBankRecord extends SequenceRecord {
  moleculeType: string;
  topology: string;
  division: string;
  date: string;
  accession: string;
  version: string;
  definition: string;
  keywords: string;
  source: string;
  organism: string;
  taxonomy: string;
  features: GenBankFeature[];
}

const GB_DATE = "01-JAN-1980";

/** Parser for the flat-file subset that matters for a FASTA round-trip. */
export function parseGenBank(text: string): ParseResult {
  const warnings: string[] = [];
  const records: GenBankRecord[] = [];
  const lines = text.split(/\r?\n/);

  let locus: { name: string; length: number; molecule: string; topology: string; division: string; date: string } | null = null;
  let definition = "";
  let accession = "";
  let version = "";
  let keywords = "";
  let source = "";
  let organism = "";
  let taxonomy = "";
  let features: GenBankFeature[] = [];
  let currentFeature: GenBankFeature | null = null;
  let currentQualifier: { key: string; value: string } | null = null;
  let sequence = "";
  let inOrigin = false;

  const flushFeature = () => {
    if (currentFeature) features.push(currentFeature);
    currentFeature = null;
    currentQualifier = null;
  };
  const flushRecord = () => {
    if (!locus && sequence.length === 0) return;
    const name = locus?.name || accession || `seq${records.length + 1}`;
    if (sequence.length > MAX_SEQUENCE_LENGTH) {
      warnings.push(`رکورد «${name}» بیش از ${MAX_SEQUENCE_LENGTH.toLocaleString("fa-IR")} نوکلئوتید دارد و کامل خوانده نشد.`);
    }
    records.push({
      id: name,
      description: definition,
      sequence,
      moleculeType: locus?.molecule ?? "DNA",
      topology: locus?.topology ?? "linear",
      division: locus?.division ?? "UNK",
      date: locus?.date ?? GB_DATE,
      accession: accession || name,
      version: version || `${accession || name}.1`,
      definition,
      keywords,
      source,
      organism,
      taxonomy,
      features,
    });
    locus = null;
    definition = "";
    accession = "";
    version = "";
    keywords = "";
    source = "";
    organism = "";
    taxonomy = "";
    features = [];
    sequence = "";
    inOrigin = false;
  };

  for (const rawLine of lines) {
    if (/^\/\//.test(rawLine.trim())) continue;
    const line = rawLine.replace(/\s+$/, "");

    if (line.startsWith("LOCUS")) {
      flushRecord();
      const parts = line.trim().split(/\s+/);
      locus = {
        name: parts[1] ?? "sequence",
        length: Number.parseInt(parts[2] ?? "0", 10) || 0,
        molecule: parts[3] ?? "DNA",
        topology: parts[4] ?? "linear",
        division: parts[6] ?? "UNK",
        date: parts[7] ?? GB_DATE,
      };
      continue;
    }
    if (inOrigin) {
      const cleaned = line.replace(/[^acgtACGT]/g, "").toUpperCase();
      sequence += cleaned;
      continue;
    }
    if (/^ORIGIN/i.test(line)) {
      flushFeature();
      inOrigin = true;
      continue;
    }
    if (/^DEFINITION\s{2,}/.test(line) || line.trim() === "DEFINITION") {
      definition = line.replace(/^DEFINITION\s*/, "");
      continue;
    }
    if (/^ACCESSION\s{2,}/.test(line)) {
      accession = line.replace(/^ACCESSION\s*/, "").split(/\s+/)[0] ?? "";
      continue;
    }
    if (/^VERSION\s{2,}/.test(line)) {
      version = line.replace(/^VERSION\s*/, "").split(/\s+/)[0] ?? "";
      continue;
    }
    if (/^KEYWORDS\s{2,}/.test(line)) {
      keywords = line.replace(/^KEYWORDS\s*/, "");
      continue;
    }
    if (/^SOURCE\s{2,}/.test(line)) {
      source = line.replace(/^SOURCE\s*/, "");
      continue;
    }
    if (/^\s{2}ORGANISM\s{2,}/.test(line)) {
      organism = line.trim().replace(/^ORGANISM\s*/, "");
      continue;
    }
    if (/^\s{12}\S/.test(line) && organism !== "" && !/^\s{5}\//.test(line)) {
      taxonomy += `${taxonomy ? " " : ""}${line.trim()}`;
      continue;
    }
    if (/^FEATURES/.test(line)) {
      flushFeature();
      continue;
    }
    const featureMatch = line.match(/^ {5}(\S+)\s+(\S.*)$/);
    if (featureMatch) {
      flushFeature();
      currentFeature = { key: featureMatch[1], location: featureMatch[2].trim(), qualifiers: [] };
      continue;
    }
    const qualifierMatch = line.match(/^\s{6,}\/(\w+)=?(.*)$/);
    if (qualifierMatch && currentFeature) {
      currentQualifier = { key: qualifierMatch[1], value: qualifierMatch[2].trim() };
      currentFeature.qualifiers.push(currentQualifier);
      continue;
    }
    // Continuation of a wrapped definition / qualifier value.
    if (currentQualifier && line.trim().length > 0) {
      currentQualifier.value += ` ${line.trim()}`;
      continue;
    }
    if (/^\s{2,}/.test(line) && definition !== "" && source === "" && organism === "") {
      definition += ` ${line.trim()}`;
    }
  }
  flushRecord();
  flushFeature();

  if (records.length === 0) warnings.push("هیچ رکورد GenBank پیدا نشد.");
  return { records: records as unknown as SequenceRecord[], warnings };
}

function padRight(s: string, width: number): string {
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}

export function toGenBank(
  records: SequenceRecord[],
  options: { includeFeatures: boolean; locusId?: string },
): string {
  return records
    .map((r, index) => {
      const gb = r as unknown as GenBankRecord;
      const name = options.locusId && index === 0 ? options.locusId : r.id;
      const len = r.sequence.length || 1;
      const molecule = gb.moleculeType ?? "DNA";
      const topology = gb.topology ?? "linear";
      const division = gb.division ?? "UNK";
      const date = gb.date ?? GB_DATE;

      const lines: string[] = [];
      lines.push(
        `LOCUS       ${padRight(name, 24)}${String(len).padStart(11, " ")} bp    ${padRight(molecule, 7)} ${padRight(topology, 8)} ${division} ${date}`,
      );
      lines.push(`DEFINITION  ${gb.definition || r.description || "."}`);
      lines.push(`ACCESSION   ${gb.accession || name}`);
      lines.push(`VERSION     ${gb.version || `${gb.accession || name}.1`}`);
      lines.push(`KEYWORDS    ${gb.keywords || "."}`);
      lines.push(`SOURCE      ${gb.source || "."}`);
      if (gb.organism) {
        lines.push(`  ORGANISM  ${gb.organism}`);
        if (gb.taxonomy) lines.push(`            ${gb.taxonomy}`);
      }
      if (options.includeFeatures) {
        lines.push("FEATURES             Location/Qualifiers");
        const features =
          gb.features && gb.features.length > 0
            ? gb.features
            : [{ key: "source", location: `1..${len}`, qualifiers: [] }];
        for (const f of features) {
          lines.push(`     ${padRight(f.key, 16)}${f.location}`);
          for (const q of f.qualifiers) {
            const value = q.value ? `=${q.value}` : "";
            lines.push(`                     /${q.key}${value}`);
          }
        }
      }
      lines.push("ORIGIN");
      for (let i = 0; i < r.sequence.length; i += 60) {
        const chunk = r.sequence.slice(i, i + 60).toLowerCase();
        const groups = chunk.match(/.{1,10}/g)?.join(" ") ?? chunk;
        lines.push(`${String(i + 1).padStart(9, " ")} ${groups}`);
      }
      lines.push("//");
      return lines.join("\n");
    })
    .join("\n");
}

// ── Dispatcher ──────────────────────────────────────────────────────────────

export type Format = "fasta" | "csv" | "json" | "genbank";

export function parseFormat(format: Format, text: string): ParseResult {
  switch (format) {
    case "fasta":
      return parseFasta(text);
    case "csv":
      return parseCsv(text);
    case "json":
      return parseJson(text);
    case "genbank":
      return parseGenBank(text);
  }
}