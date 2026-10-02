/**
 * Genova Virtual Lab — pairwise alignment core
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure sequence-alignment logic for the two tools in the «همترازی» group.
 * Everything runs in the browser.
 *
 * Scientific integrity
 * ────────────────────
 * The substitution scores are **not** biology — they are a declared scoring
 * scheme chosen by the user (defaults: match +2, mismatch −1, gap −2). A real
 * alignment pipeline uses a matrix such as BLOSUM62 or a nucleotide matrix
 * derived from observed substitutions, and this file does not bundle one. The
 * tools therefore print the exact scores that produced every number.
 *
 * "Similarity" is reported separately from "identity" on purpose:
 *   identity  → the two positions hold the *same* unambiguous base;
 *   positives → the two positions are compatible under the IUPAC ambiguity
 *               codes (e.g. `A` vs `M` which means A or C).
 * Collapsing those two numbers into one is the most common way a similarity
 * score gets misreported, so they stay apart all the way to the UI.
 */

/** IUPAC nucleotide ambiguity codes → the concrete bases they can stand for. */
export const IUPAC_DNA: Record<string, string> = {
  A: "A", T: "T", U: "T", G: "G", C: "C",
  R: "AG", Y: "CT", S: "CG", W: "AT", K: "GT", M: "AC",
  B: "CGT", D: "AGT", H: "ACT", V: "ACG", N: "ACGT",
};

export const IUPAC_RNA: Record<string, string> = {
  A: "A", U: "U", T: "T", G: "G", C: "C",
  R: "AG", Y: "CU", S: "CG", W: "AU", K: "GU", M: "AC",
  B: "CGU", D: "AGU", H: "ACU", V: "ACG", N: "ACGU",
};

/** Positions in which two bases are the same substitution class. */
export const TRANSITIONS = new Set(["AG", "GA", "CT", "TC", "AU", "UA"]);

/** True when the two IUPAC codes share at least one concrete base. */
export function isPositive(a: string, b: string, alphabet: "dna" | "rna"): boolean {
  const table = alphabet === "rna" ? IUPAC_RNA : IUPAC_DNA;
  const setA = table[a.toUpperCase()];
  const setB = table[b.toUpperCase()];
  if (!setA || !setB) return false;
  for (const x of setA) if (setB.includes(x)) return true;
  return false;
}

/** True when the code stands for exactly one concrete base (no ambiguity). */
function isSingleBase(code: string): boolean {
  return /^[ACGTU]$/.test(code.toUpperCase());
}

/** True only when both codes stand for exactly one and the same base. */
export function isIdentical(a: string, b: string): boolean {
  const x = a.toUpperCase();
  const y = b.toUpperCase();
  return x === y && /^[ACGTU]$/.test(x);
}

/**
 * True when the pair is a *substitution* inside the same class
 * (purine↔purine or pyrimidine↔pyrimidine), e.g. A→G. Ambiguity codes are
 * excluded: `M` (A or C) spans both classes, so calling it a transition or a
 * transversion would be an invented claim.
 */
export function isTransition(a: string, b: string, alphabet: "dna" | "rna"): boolean {
  const t = alphabet === "rna" ? IUPAC_RNA : IUPAC_DNA;
  const x = t[a.toUpperCase()];
  const y = t[b.toUpperCase()];
  if (!x || !y || x.length !== 1 || y.length !== 1) return false;
  if (x === y) return false;
  return TRANSITIONS.has(x + y);
}

export function cleanAlignmentSequence(raw: string, alphabet: "dna" | "rna"): string {
  const allowed = alphabet === "rna" ? /[ACGURYSWKMBDHVNTU-]/g : /[ACGTYRYSWKMBDHVN-]/g;
  return raw.toUpperCase().replace(/[^A-Z]/g, "").replace(allowed, "").replace(/-/g, "-");
}

// ── Scoring ─────────────────────────────────────────────────────────────────

export interface ScoreScheme {
  match: number;
  mismatch: number;
  gap: number;
  /**
   * When true, an IUPAC-compatible but non-identical pair scores 0 instead of
   * the mismatch penalty. This models "substitutions are tolerated", not a
   * biological claim about which substitutions are acceptable.
   */
  allowAmbiguity: boolean;
}

export const DEFAULT_SCORES: ScoreScheme = {
  match: 2,
  mismatch: -1,
  gap: -2,
  allowAmbiguity: true,
};

export type AlignMethod = "global" | "local";

export const METHOD_LABEL: Record<AlignMethod, string> = {
  global: "سراسری (Needleman–Wunsch)",
  local: "محلی (Smith–Waterman)",
};

export const METHOD_HINT: Record<AlignMethod, string> = {
  global:
    "کل دو توالی از ابتدا تا انتها همتراز می‌شوند؛ برای دو ژن هم‌طول یا هم‌خانواده مناسب است.",
  local:
    "بهترین بخش هم‌تراز را پیدا می‌کند و بقیهٔ توالی را نادیده می‌گیرد؛ برای یافتن موتیف یا ناحیهٔ محافظت‌شده مناسب است.",
};

/** Score one aligned pair. Exported so the report and the DP agree exactly. */
export function pairScore(
  x: string,
  y: string,
  scores: ScoreScheme,
  alphabet: "dna" | "rna",
): number {
  if (x === "-" || y === "-") return scores.gap;
  if (isIdentical(x, y)) return scores.match;
  if (scores.allowAmbiguity && isPositive(x, y, alphabet)) return 0;
  return scores.mismatch;
}

export interface AlignmentResult {
  /** Aligned sequence A, gaps shown as `-`. */
  alignedA: string;
  alignedB: string;
  /** Middle ruler line (`|`, `:`, space). */
  ruler: string;
  score: number;
  /** Number of alignment columns. */
  columns: number;
  /** 1-based position of the first aligned column in the *original* A. */
  startA: number;
  endA: number;
  startB: number;
  endB: number;
  method: AlignMethod;
  scores: ScoreScheme;
}

/** Guard so a 10 kb × 10 kb paste cannot lock the browser up. */
export const MAX_ALIGNMENT_LENGTH = 3000;

/**
 * Needleman–Wunsch (global) and Smith–Waterman (local) with linear gap cost.
 *
 * Traceback is stored as direction bytes rather than full score matrices of
 * objects, which keeps a 3000×3000 cell affordable in the browser.
 */
export function align(
  a: string,
  b: string,
  method: AlignMethod,
  scores: ScoreScheme = DEFAULT_SCORES,
  alphabet: "dna" | "rna" = "dna",
): AlignmentResult {
  const n = a.length;
  const m = b.length;

  // Score matrix and traceback directions.
  const score = new Float64Array((n + 1) * (m + 1));
  const trace = new Uint8Array((n + 1) * (m + 1)); // 1=diag 2=up 3=left
  const width = m + 1;
  const at = (i: number, j: number) => i * width + j;

  for (let i = 1; i <= n; i++) {
    score[at(i, 0)] = method === "global" ? scores.gap * i : 0;
    trace[at(i, 0)] = 2;
  }
  for (let j = 1; j <= m; j++) {
    score[at(0, j)] = method === "global" ? scores.gap * j : 0;
    trace[at(0, j)] = 3;
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag = score[at(i - 1, j - 1)] + pairScore(a[i - 1], b[j - 1], scores, alphabet);
      const up = score[at(i - 1, j)] + scores.gap;
      const left = score[at(i, j - 1)] + scores.gap;
      const best = Math.max(diag, up, left);
      score[at(i, j)] = best;
      trace[at(i, j)] = best === diag ? 1 : best === up ? 2 : 3;
    }
  }

  let i = n;
  let j = m;
  let startA = 1;
  let startB = 1;
  if (method === "local") {
    // Find the maximum-score cell for the traceback start.
    let best = 0;
    for (let x = 1; x <= n; x++) {
      for (let y = 1; y <= m; y++) {
        if (score[at(x, y)] > best) {
          best = score[at(x, y)];
          i = x;
          j = y;
        }
      }
    }
    startA = i;
    startB = j;
  }

  const outA: string[] = [];
  const outB: string[] = [];
  let endA = startA;
  let endB = startB;

  while (i > 0 && j > 0) {
    const dir = trace[at(i, j)];
    if (dir === 1) {
      outA.push(a[i - 1]);
      outB.push(b[j - 1]);
      endA = i;
      endB = j;
      i -= 1;
      j -= 1;
    } else if (dir === 2) {
      outA.push(a[i - 1]);
      outB.push("-");
      endA = i;
      i -= 1;
    } else {
      outA.push("-");
      outB.push(b[j - 1]);
      endB = j;
      j -= 1;
    }
  }
  if (method === "global") {
    while (i > 0) {
      outA.push(a[i - 1]);
      outB.push("-");
      i -= 1;
    }
    while (j > 0) {
      outA.push("-");
      outB.push(b[j - 1]);
      j -= 1;
    }
  }

  outA.reverse();
  outB.reverse();
  const alignedA = outA.join("");
  const alignedB = outB.join("");

  let ruler = "";
  for (let k = 0; k < alignedA.length; k++) {
    const x = alignedA[k];
    const y = alignedB[k];
    if (x === "-") ruler += " ";
    else if (y === "-") ruler += " ";
    else if (x === y) ruler += "|";
    else if (isPositive(x, y, "dna") || isPositive(x, y, "rna")) ruler += ":";
    else ruler += " ";
  }

  return {
    alignedA,
    alignedB,
    ruler,
    score: score[at(method === "local" ? endA : n, method === "local" ? endB : m)],
    columns: alignedA.length,
    startA,
    endA,
    startB,
    endB,
    method,
    scores,
  };
}

// ── Similarity statistics ───────────────────────────────────────────────────

export interface SimilarityStats {
  /** Alignment columns, including gap columns. */
  columns: number;
  identical: number;
  positives: number;
  mismatches: number;
  gaps: number;
  gapPositions: number;
  transitions: number;
  transversions: number;
  /** identical / columns. */
  identity: number;
  /** (identical + positives) / columns. */
  similarity: number;
  /** identical / (columns - gaps). */
  identityNoGaps: number;
  longestRun: number;
  alphabet: "dna" | "rna";
  method: AlignMethod;
  scores: ScoreScheme;
  methodLabel: string;
}

export function similarityStats(
  alignedA: string,
  alignedB: string,
  alphabet: "dna" | "rna",
  method: AlignMethod,
  scores: ScoreScheme,
): SimilarityStats {
  let identical = 0;
  let positives = 0;
  let mismatches = 0;
  let gaps = 0;
  let gapPositions = 0;
  let transitions = 0;
  let transversions = 0;
  let longestRun = 0;
  let run = 0;

  const columns = Math.max(alignedA.length, alignedB.length);
  for (let k = 0; k < columns; k++) {
    const x = alignedA[k] ?? "-";
    const y = alignedB[k] ?? "-";
    if (x === "-" || y === "-") {
      gaps += 1;
      if (x === "-" && y === "-") gapPositions += 1;
      run = 0;
      continue;
    }
    if (isIdentical(x, y)) {
      identical += 1;
      run += 1;
      if (run > longestRun) longestRun = run;
    } else if (isPositive(x, y, alphabet)) {
      positives += 1;
      run = 0;
    } else {
      mismatches += 1;
      run = 0;
    }
    // Transitions / transversions are counted only over columns where both
    // sides are a single unambiguous base and the two differ — the only case
    // where the substitution class is defined.
    if (!isIdentical(x, y) && isTransition(x, y, alphabet)) transitions += 1;
    else if (!isIdentical(x, y) && isSingleBase(x) && isSingleBase(y)) transversions += 1;
  }

  const noGaps = columns - gaps;
  return {
    columns,
    identical,
    positives,
    mismatches,
    gaps,
    gapPositions,
    transitions,
    transversions,
    identity: columns > 0 ? identical / columns : 0,
    similarity: columns > 0 ? (identical + positives) / columns : 0,
    identityNoGaps: noGaps > 0 ? identical / noGaps : 0,
    longestRun,
    alphabet,
    method,
    scores,
    methodLabel: METHOD_LABEL[method],
  };
}

/** Both methods, so the tool can show the side-by-side comparison. */
export function compareMethods(
  a: string,
  b: string,
  alphabet: "dna" | "rna",
  scores: ScoreScheme,
): Record<AlignMethod, { result: AlignmentResult; stats: SimilarityStats }> {
  const global = align(a, b, "global", scores, alphabet);
  const local = align(a, b, "local", scores, alphabet);
  return {
    global: { result: global, stats: similarityStats(global.alignedA, global.alignedB, alphabet, "global", scores) },
    local: { result: local, stats: similarityStats(local.alignedA, local.alignedB, alphabet, "local", scores) },
  };
}

/** Reverse complement — handy when the user wants to try the other strand. */
export function complement(seq: string, alphabet: "dna" | "rna"): string {
  const table = alphabet === "rna" ? IUPAC_RNA : IUPAC_DNA;
  const pairs: Record<string, string> = {
    A: "T", T: "A", U: "A", G: "C", C: "G",
    R: "Y", Y: "R", S: "S", W: "W", K: "M", M: "K",
    B: "V", V: "B", D: "H", H: "D", N: "N",
  };
  let out = "";
  for (let i = seq.length - 1; i >= 0; i--) {
    const ch = seq[i].toUpperCase();
    if (!table[ch]) continue;
    out += alphabet === "rna" && ch === "T" ? "A" : pairs[ch] ?? ch;
  }
  return out;
}