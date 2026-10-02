/**
 * Genova Virtual Lab — protein & codon core
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure, dependency-free sequence logic behind the four protein/codon tools.
 * Everything here runs in the browser; nothing is sent to a server.
 *
 * Scientific integrity
 * ────────────────────
 * Only two kinds of fact are encoded in this file:
 *
 *   1. The standard genetic code. It is a definition, not a measurement, and is
 *      the only codon→amino-acid mapping used anywhere in these tools.
 *
 *   2. Approximate genome GC levels for the four host organisms, used *only* as
 *      a target the back-translation steers towards.
 *
 * What is deliberately NOT here: a codon usage frequency table. The tool never
 * claims a codon is "preferred" or "rare" for a host, because no frequency
 * database is bundled. Where a real usage table would normally be required, the
 * output says so in plain words instead of inventing a number.
 */
export const STOP_CODONS = new Set(["TAA", "TAG", "TGA"]);

/** Alternative prokaryotic start codons, used only when explicitly enabled. */
export const ALT_START_CODONS = new Set(["GTG", "TTG"]);

/** Standard genetic code (NCBI translation table 1), DNA alphabet. */
export const CODON_TO_AA: Record<string, string> = {
  TTT: "F", TTC: "F", TTA: "L", TTG: "L",
  CTT: "L", CTC: "L", CTA: "L", CTG: "L",
  ATT: "I", ATC: "I", ATA: "I", ATG: "M",
  GTT: "V", GTC: "V", GTA: "V", GTG: "V",
  TCT: "S", TCC: "S", TCA: "S", TCG: "S",
  CCT: "P", CCC: "P", CCA: "P", CCG: "P",
  ACT: "T", ACC: "T", ACA: "T", ACG: "T",
  GCT: "A", GCC: "A", GCA: "A", GCG: "A",
  TAT: "Y", TAC: "Y", TAA: "*", TAG: "*",
  CAT: "H", CAC: "H", CAA: "Q", CAG: "Q",
  AAT: "N", AAC: "N", AAA: "K", AAG: "K",
  GAT: "D", GAC: "D", GAA: "E", GAG: "E",
  TGT: "C", TGC: "C", TGA: "*", TGG: "W",
  CGT: "R", CGC: "R", CGA: "R", CGG: "R",
  AGT: "S", AGC: "S", AGA: "R", AGG: "R",
  GGT: "G", GGC: "G", GGA: "G", GGG: "G",
};

/** Reverse of CODON_TO_AA, sorted so output is deterministic. */
export const AA_TO_CODONS: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const codon of Object.keys(CODON_TO_AA).sort()) {
    const aa = CODON_TO_AA[codon];
    (map[aa] ??= []).push(codon);
  }
  return map;
})();

export const AA_NAME: Record<string, string> = {
  A: "آلانین", R: "آرژینین", N: "آسپاراژین", D: "آسپارتیک اسید",
  C: "سیستئین", E: "گلوتامیک اسید", Q: "گلوتامین", G: "گلیسین",
  H: "هیستیدین", I: "ایزولوسین", L: "لوسین", K: "لیزین",
  M: "متیونین", F: "فنیل‌آلانین", P: "پرولین", S: "سرین",
  T: "ترئونین", W: "تریپتوفان", Y: "تیروزین", V: "والین",
  "*": "پایان (stop)",
};

export const AA_THREE: Record<string, string> = {
  A: "Ala", R: "Arg", N: "Asn", D: "Asp", C: "Cys",
  E: "Glu", Q: "Gln", G: "Gly", H: "His", I: "Ile",
  L: "Leu", K: "Lys", M: "Met", F: "Phe", P: "Pro",
  S: "Ser", T: "Thr", W: "Trp", Y: "Tyr", V: "Val",
  "*": "Stop",
};

/** Aromatic residues: Phe, Tyr, Trp (histidine excluded — it is basic). */
export const AROMATIC_AA = new Set(["F", "Y", "W"]);

export const CHARGED_AA = new Set(["D", "E", "K", "R", "H"]);

// ── Sequence helpers ────────────────────────────────────────────────────────

export function cleanDna(raw: string): string {
  return raw.toUpperCase().replace(/[^ATGC]/g, "");
}

export function cleanProtein(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z*]/g, "");
}

export function reverseComplement(seq: string): string {
  const comp: Record<string, string> = { A: "T", T: "A", G: "C", C: "G" };
  let out = "";
  for (let i = seq.length - 1; i >= 0; i--) out += comp[seq[i]] ?? "N";
  return out;
}

export function gcPercent(seq: string): number {
  if (seq.length === 0) return 0;
  const gc = seq.replace(/[^GC]/g, "").length;
  return (gc / seq.length) * 100;
}

export function gcOf(codon: string): number {
  return gcPercent(codon);
}

/** Wrap a sequence at `width` for readable FASTA output. */
export function fastaWrap(seq: string, width = 60): string {
  const lines: string[] = [];
  for (let i = 0; i < seq.length; i += width) lines.push(seq.slice(i, i + width));
  return lines.join("\n");
}

// ── 1. ORF finder ───────────────────────────────────────────────────────────

export interface Orf {
  id: string;
  strand: "+" | "-";
  /** 1-based reading frame on the strand that was scanned. */
  frame: 1 | 2 | 3;
  /** 1-based inclusive coordinates on the scanned strand. */
  start: number;
  end: number;
  startCodon: string;
  stopCodon: string | null;
  ntLength: number;
  aaLength: number;
  protein: string;
  dna: string;
  /** False when the sequence ran out before a stop codon appeared. */
  complete: boolean;
}

export interface OrfOptions {
  /** Minimum protein length in amino acids. */
  minAa: number;
  /** Also accept GTG / TTG as start codons. */
  allowAltStarts: boolean;
  /** Scan the reverse complement as well. */
  bothStrands: boolean;
}

export const DEFAULT_ORF_OPTIONS: OrfOptions = {
  minAa: 30,
  allowAltStarts: false,
  bothStrands: true,
};

/**
 * Find every open reading frame, on both strands when asked.
 *
 * The rule is textbook: inside one reading frame, the first start codon after a
 * stop codon opens an ORF; the next in-frame stop closes it. An ORF that runs off
 * the end of the sequence is still reported, flagged `complete: false`.
 */
export function findOrfs(dna: string, options: OrfOptions): Orf[] {
  const found: Orf[] = [];
  const strands: ("+" | "-")[] = options.bothStrands ? ["+", "-"] : ["+"];

  for (const strand of strands) {
    const seq = strand === "+" ? dna : reverseComplement(dna);
    for (let frame = 0; frame < 3; frame++) {
      let openStart = -1;
      let openCodon = "";
      for (let i = frame; i + 2 < seq.length; i += 3) {
        const codon = seq.slice(i, i + 3);
        const isStart =
          codon === "ATG" || (options.allowAltStarts && ALT_START_CODONS.has(codon));
        const isStop = STOP_CODONS.has(codon);

        if (isStart && openStart === -1) {
          openStart = i;
          openCodon = codon;
        }
        if (isStop && openStart !== -1) {
          found.push(
            buildOrf(seq, strand, (frame + 1) as 1 | 2 | 3, openStart, i + 3, openCodon, codon, true),
          );
          openStart = -1;
          openCodon = "";
        }
      }
      if (openStart !== -1) {
        const end = seq.length - ((seq.length - openStart) % 3);
        found.push(
          buildOrf(seq, strand, (frame + 1) as 1 | 2 | 3, openStart, Math.min(end, seq.length), openCodon, null, false),
        );
      }
    }
  }

  return found
    .filter((o) => o.aaLength >= options.minAa)
    .sort((a, b) => b.aaLength - a.aaLength);
}

function buildOrf(
  seq: string,
  strand: "+" | "-",
  frame: 1 | 2 | 3,
  startIndex: number,
  endIndex: number,
  startCodon: string,
  stopCodon: string | null,
  complete: boolean,
): Orf {
  const dna = seq.slice(startIndex, endIndex);
  const protein = translateFrame(dna, 0, stopCodon !== null);
  return {
    id: `${strand}${frame}:${startIndex + 1}-${endIndex}`,
    strand,
    frame,
    start: startIndex + 1,
    end: endIndex,
    startCodon,
    stopCodon,
    ntLength: dna.length,
    aaLength: protein.length,
    protein,
    dna,
    complete,
  };
}

/**
 * Translate one frame, optionally stopping before the terminator.
 * Unknown characters become `X` rather than being silently dropped, so a
 * translation can never be shorter than the sequence implies.
 */
export function translateFrame(seq: string, offset: number, stopAtStop = true): string {
  let out = "";
  for (let i = offset; i + 2 < seq.length; i += 3) {
    const codon = seq.slice(i, i + 3);
    const aa = CODON_TO_AA[codon] ?? "X";
    if (aa === "*") {
      if (stopAtStop) break;
      continue;
    }
    out += aa;
  }
  return out;
}

// ── 2. Translation ──────────────────────────────────────────────────────────

export interface CodonRow {
  position: number;
  /** 1-based position of the codon on the scanned strand. */
  start: number;
  codon: string;
  aa: string;
  aaName: string;
  three: string;
}

export interface TranslationResult {
  protein: string;
  rows: CodonRow[];
  /** Codon index where translation stopped, or null if it never stopped. */
  stoppedAt: number | null;
  /** Codons after the stop that were not translated. */
  trailingNt: number;
  frame: 1 | 2 | 3;
  strand: "+" | "-";
}

export function translate(dna: string, frame: 1 | 2 | 3, strand: "+" | "-"): TranslationResult {
  const seq = strand === "+" ? dna : reverseComplement(dna);
  const offset = frame - 1;
  const rows: CodonRow[] = [];
  let protein = "";
  let stoppedAt: number | null = null;

  for (let i = offset; i + 2 < seq.length; i += 3) {
    const codon = seq.slice(i, i + 3);
    const aa = CODON_TO_AA[codon] ?? "X";
    if (aa === "*") {
      stoppedAt = rows.length;
      break;
    }
    rows.push({
      position: rows.length + 1,
      start: i + 1,
      codon,
      aa,
      aaName: AA_NAME[aa] ?? "—",
      three: AA_THREE[aa] ?? "Xaa",
    });
    protein += aa;
  }

  const consumed = offset + rows.length * 3 + (stoppedAt !== null ? 3 : 0);
  return {
    protein,
    rows,
    stoppedAt,
    trailingNt: Math.max(0, seq.length - consumed),
    frame,
    strand,
  };
}

// ── 3. Codon analysis ───────────────────────────────────────────────────────

export interface CodonStat {
  codon: string;
  aa: string;
  aaName: string;
  three: string;
  count: number;
  /** count / totalCodons, 0…1. */
  frequency: number;
  /** GC of this codon in 0…1. */
  gc: number;
}

export interface CodonAnalysis {
  codons: CodonStat[];
  totalCodons: number;
  distinctUsed: number;
  /** Synonymous codons available for the amino acids present, minus those used. */
  unusedSynonymous: number;
  gc1: number;
  gc2: number;
  gc3: number;
  gcOverall: number;
  cpgCount: number;
  /** Observed/expected CpG ratio — a computed statistic, not a claim. */
  cpgRatio: number;
  longestHomopolymer: number;
  longestHomopolymerBase: string;
  /** Amino acids whose synonymous codons were all but one used. */
  degenerateAminoAcids: { aa: string; name: string; used: number; total: number }[];
}

/**
 * Describe the codon composition of a reading frame.
 *
 * Every number is counted from the sequence the student pasted. Nothing is
 * compared against a reference organism, because no reference table is bundled.
 */
export function analyseCodons(dna: string, frame: 1 | 2 | 3): CodonAnalysis {
  const seq = dna.slice(frame - 1);
  const counts = new Map<string, number>();
  let total = 0;

  for (let i = 0; i + 2 < seq.length; i += 3) {
    const codon = seq.slice(i, i + 3);
    counts.set(codon, (counts.get(codon) ?? 0) + 1);
    total += 1;
  }

  const codons: CodonStat[] = [...counts.entries()]
    .map(([codon, count]) => {
      const aa = CODON_TO_AA[codon] ?? "X";
      return {
        codon,
        aa,
        aaName: AA_NAME[aa] ?? "نامشخص",
        three: AA_THREE[aa] ?? "Xaa",
        count,
        frequency: total > 0 ? count / total : 0,
        gc: gcOf(codon) / 100,
      };
    })
    .sort((a, b) => b.count - a.count || a.codon.localeCompare(b.codon));

  const positionGc = (position: 1 | 2 | 3): number => {
    const slice = seq.slice(position - 1).replace(/[^GC]/g, "").length;
    const usable = seq.slice(position - 1).length;
    return usable === 0 ? 0 : (slice / usable) * 100;
  };

  const cpgCount = (seq.match(/CG/g) ?? []).length;
  const cCount = (seq.match(/C/g) ?? []).length;
  const gCount = (seq.match(/G/g) ?? []).length;
  const cpgRatio =
    cCount > 0 && gCount > 0 ? cpgCount / ((cCount / seq.length) * (gCount / seq.length)) : 0;

  // Longest run of one identical base.
  let best = 1;
  let bestBase = seq[0] ?? "";
  let run = 1;
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] === seq[i - 1]) {
      run += 1;
      if (run > best) {
        best = run;
        bestBase = seq[i];
      }
    } else {
      run = 1;
    }
  }

  const usedAas = new Set(codons.map((c) => c.aa));
  let unusedSynonymous = 0;
  const degenerateAminoAcids: CodonAnalysis["degenerateAminoAcids"] = [];
  for (const aa of usedAas) {
    const options = AA_TO_CODONS[aa] ?? [];
    const used = codons.filter((c) => c.aa === aa).length;
    unusedSynonymous += options.length - used;
    if (options.length >= 4 && used === 1) {
      degenerateAminoAcids.push({ aa, name: AA_NAME[aa] ?? aa, used, total: options.length });
    }
  }
  degenerateAminoAcids.sort((a, b) => a.aa.localeCompare(b.aa));

  return {
    codons,
    totalCodons: total,
    distinctUsed: codons.length,
    unusedSynonymous,
    gc1: positionGc(1),
    gc2: positionGc(2),
    gc3: positionGc(3),
    gcOverall: gcPercent(seq),
    cpgCount,
    cpgRatio,
    longestHomopolymer: seq.length === 0 ? 0 : best,
    longestHomopolymerBase: bestBase,
    degenerateAminoAcids,
  };
}

// ── 4. Back-translation ─────────────────────────────────────────────────────

export type HostId = "ecoli" | "yeast" | "drosophila" | "human";

export interface Host {
  id: HostId;
  label: string;
  latin: string;
  /** Approximate genome GC level (%) — a target, not a preference table. */
  gcTarget: number;
}

/**
 * Genome GC levels are textbook values for these organisms and are used only as
 * a target the codon choice steers towards.
 */
export const HOSTS: Host[] = [
  { id: "ecoli", label: "E. coli (باکتری)", latin: "Escherichia coli", gcTarget: 50.8 },
  { id: "yeast", label: "مخمر مخمر (S. cerevisiae)", latin: "Saccharomyces cerevisiae", gcTarget: 38.3 },
  { id: "drosophila", label: "مگس سرکه (D. melanogaster)", latin: "Drosophila melanogaster", gcTarget: 43.0 },
  { id: "human", label: "انسان (H. sapiens)", latin: "Homo sapiens", gcTarget: 41.0 },
];

export function hostById(id: HostId): Host {
  return HOSTS.find((h) => h.id === id) ?? HOSTS[0];
}

/** Maximum identical codon repeats allowed before the next synonym is used. */
const MAX_CODON_REPEAT = 3;

export interface BackTranslationResult {
  dna: string;
  protein: string;
  gcOverall: number;
  gc1: number;
  gc2: number;
  gc3: number;
  /** One row per residue: which codon was chosen and what else was available. */
  choices: {
    position: number;
    aa: string;
    aaName: string;
    codon: string;
    alternatives: number;
    gc3: number;
  }[];
  /** Positions where a synonym had to be used to break a repeat run. */
  repeatBreaks: number;
  host: Host;
  hasStop: boolean;
  cpgCount: number;
}

export interface BackTranslationOptions {
  host: HostId;
  /** Append a terminator codon. */
  addStopCodon: boolean;
  /** Force the first residue to ATG. */
  forceStartMet: boolean;
}

/**
 * Protein → DNA.
 *
 * The codon for each residue is the synonym whose GC content keeps the running
 * sequence closest to the host's genome GC target, with ties broken towards the
 * GC-ending synonym and then alphabetically. A synonym is also chosen whenever
 * the previous codon would repeat more than `MAX_CODON_REPEAT` times in a row.
 *
 * This is a **GC-targeting heuristic**, not codon optimisation against a usage
 * table. It produces a sequence that encodes exactly the input protein, and the
 * UI says so.
 */
export function backTranslate(
  proteinInput: string,
  options: BackTranslationOptions,
): BackTranslationResult {
  const host = hostById(options.host);
  const protein = cleanProtein(proteinInput).replace(/\*/g, "");
  const target = host.gcTarget / 100;

  const codons: string[] = [];
  const choices: BackTranslationResult["choices"] = [];
  let gcSoFar = 0;
  let repeatBreaks = 0;

  for (let i = 0; i < protein.length; i++) {
    const aa = protein[i];
    const synonyms = AA_TO_CODONS[aa];

    if (!synonyms || synonyms.length === 0) {
      // Unknown residue: keep the frame, mark it, and continue.
      codons.push("NNN");
      continue;
    }
    if (i === 0 && options.forceStartMet && aa !== "M") {
      // Prepend a Met instead of silently rewriting the user's sequence.
      codons.push("ATG");
      gcSoFar += 1;
      choices.push({
        position: 0,
        aa: "M",
        aaName: AA_NAME.M,
        codon: "ATG",
        alternatives: AA_TO_CODONS.M.length,
        gc3: gcOf("ATG") / 100,
      });
    }

    const repeated = codons.length > 0 && codons[codons.length - 1] === synonyms[0];
    const runLength = countTrailingRepeat(codons, synonyms[0]);

    const scored = synonyms
      .map((codon) => {
        const gc = gcOf(codon) / 100;
        const nextGc = (gcSoFar + gc) / (codons.length + 1);
        const distance = Math.abs(nextGc - target);
        // Prefer a GC-ending synonym when two are otherwise tied.
        const tieBreak = gc >= 0.5 ? -0.001 : 0;
        return { codon, score: distance + tieBreak, gc };
      })
      .sort((a, b) => a.score - b.score || a.codon.localeCompare(b.codon));

    let chosen = scored[0];
    if (repeated && runLength >= MAX_CODON_REPEAT && scored.length > 1) {
      chosen = scored[1];
      repeatBreaks += 1;
    }

    codons.push(chosen.codon);
    gcSoFar += chosen.gc;
    choices.push({
      position: choices.length,
      aa,
      aaName: AA_NAME[aa] ?? "نامشخص",
      codon: chosen.codon,
      alternatives: synonyms.length,
      gc3: chosen.gc,
    });
  }

  if (options.addStopCodon) codons.push("TAA");
  const dna = codons.join("");

  const positionGc = (position: 1 | 2 | 3): number => {
    const slice = dna.slice(position - 1).replace(/[^GC]/g, "").length;
    const usable = dna.slice(position - 1).length;
    return usable === 0 ? 0 : (slice / usable) * 100;
  };

  return {
    dna,
    protein,
    gcOverall: gcPercent(dna),
    gc1: positionGc(1),
    gc2: positionGc(2),
    gc3: positionGc(3),
    choices,
    repeatBreaks,
    host,
    hasStop: options.addStopCodon,
    cpgCount: (dna.match(/CG/g) ?? []).length,
  };
}

function countTrailingRepeat(codons: string[], codon: string): number {
  let n = 0;
  for (let i = codons.length - 1; i >= 0 && codons[i] === codon; i--) n += 1;
  return n;
}

// ── Protein composition (shared with the codon table view) ─────────────────

export interface ProteinComposition {
  length: number;
  counts: { aa: string; name: string; three: string; count: number; percent: number }[];
  chargedPercent: number;
  aromaticPercent: number;
  /** Kyte–Doolittle hydropathy, computed from the input sequence. */
  gravy: number;
}

const KD_HYDROPATHY: Record<string, number> = {
  A: 1.8, R: -4.5, N: -3.5, D: -3.5, C: 2.5,
  E: -3.5, Q: -3.5, G: -0.4, H: -3.2, I: 4.5,
  L: 3.8, K: -3.9, M: 1.9, F: 2.8, P: -1.6,
  S: -0.8, T: -0.7, W: -0.9, Y: -1.3, V: 4.2,
};

export function proteinComposition(proteinInput: string): ProteinComposition {
  const protein = cleanProtein(proteinInput).replace(/\*/g, "");
  const counts = new Map<string, number>();
  let hydropathy = 0;
  let charged = 0;
  let aromatic = 0;

  for (const aa of protein) {
    counts.set(aa, (counts.get(aa) ?? 0) + 1);
    hydropathy += KD_HYDROPATHY[aa] ?? 0;
    if (CHARGED_AA.has(aa)) charged += 1;
    if (AROMATIC_AA.has(aa)) aromatic += 1;
  }

  return {
    length: protein.length,
    counts: [...counts.entries()]
      .map(([aa, count]) => ({
        aa,
        name: AA_NAME[aa] ?? aa,
        three: AA_THREE[aa] ?? "Xaa",
        count,
        percent: protein.length === 0 ? 0 : (count / protein.length) * 100,
      }))
      .sort((a, b) => b.count - a.count || a.aa.localeCompare(b.aa)),
    chargedPercent: protein.length === 0 ? 0 : (charged / protein.length) * 100,
    aromaticPercent: protein.length === 0 ? 0 : (aromatic / protein.length) * 100,
    gravy: protein.length === 0 ? 0 : hydropathy / protein.length,
  };
}