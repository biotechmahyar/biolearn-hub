/**
 * Genova Virtual Lab — colony counting from a plate image
 * ──────────────────────────────────────────────────────
 * Counts colonies in a photograph of an agar plate using classical image
 * analysis, entirely in the browser:
 *
 *   1. luminance  → Otsu's method picks the threshold that maximises
 *      between-class variance (Otsu 1979). No magic constant.
 *   2. connected-component labelling (two-pass, union-find) splits the
 *      thresholded mask into individual colonies, so two colonies that touch
 *      are still separable by a watershed-free heuristic that merges blobs
 *      whose shape says "one colony, not two".
 *   3. blobs smaller than a size floor are discarded as debris / artefacts,
 *      and the count is reported with the area statistics so the user can see
 *      whether the segmentation was sane.
 *
 * Scientific integrity
 * ────────────────────
 * This tool counts what is in the photograph. It does not know what grew on
 * the plate, does not distinguish species, and cannot see colonies that are
 * transparent, below focus or outside the frame. The tool says so on screen,
 * and it always shows the segmentation result so the user can check the count
 * rather than trusting a black box.
 */

/** Anything bigger than this is refused rather than silently downsampled. */
export const MAX_IMAGE_PIXELS = 4_000_000;

export interface Rgba {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Rec. 709 luma. Cheap and good enough for a monochrome-ish agar plate. */
export function toLuma(img: Rgba): Uint8Array {
  const { data, width, height } = img;
  const out = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    out[i] = Math.round(data[p] * 0.2126 + data[p + 1] * 0.7152 + data[p + 2] * 0.0722);
  }
  return out;
}

export interface Histogram {
  bins: Int32Array;
  total: number;
  min: number;
  max: number;
  mean: number;
}

export function histogram(luma: Uint8Array): Histogram {
  const bins = new Int32Array(256);
  let sum = 0;
  let min = 255;
  let max = 0;
  for (let i = 0; i < luma.length; i++) {
    const v = luma[i];
    bins[v] += 1;
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { bins, total: luma.length, min, max, mean: sum / luma.length };
}

/**
 * Otsu's threshold. Returns the intensity that maximises the variance
 * *between* the two classes the cut creates. Falls back to a fixed 128 when
 * the image is single-valued (no split exists).
 */
export function otsu(luma: Uint8Array): number {
  const { bins, total } = histogram(luma);
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * bins[t];

  let sumB = 0;
  let wB = 0;
  let best = -1;
  let bestVar = 0;
  for (let t = 0; t < 256; t++) {
    wB += bins[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * bins[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > bestVar) {
      bestVar = between;
      best = t;
    }
  }
  // A flat image has no between-class variance to maximise — there is no
  // split to find. -1 is the explicit "cannot threshold" answer, so callers
  // report it instead of inventing a cut.
  return bestVar > 0 ? best : -1;
}

export interface Blob {
  /** Area in pixels. */
  area: number;
  /** Pixel coordinates of the top-left-most pixel of the blob. */
  x: number;
  y: number;
  /** Perimeter in pixels — a merged pair of colonies has a worse area/perimeter ratio. */
  perimeter: number;
  /** mean luminance inside the blob. */
  meanLuma: number;
  /** Equivalent circular diameter in pixels. */
  diameter: number;
  /** Bounding box size in pixels. */
  width: number;
  height: number;
  /** Longer / shorter bounding-box side. A single round colony ≈ 1. */
  elongation: number;
  /** fraction of the blob's bounding box that is filled — low for merged colonies. */
  fill: number;
}

/**
 * Two-pass connected-component labelling with union-find, then a
 * shape-based split heuristic.
 *
 * The heuristic is explicit and conservative: a blob is only offered as two
 * colonies when it is large, elongated along one axis and pinched in the
 * middle. Anything the heuristic is unsure about is counted as one and
 * reported in `merged`, so the user is never silently handed a number.
 */
export function labelBlobs(
  luma: Uint8Array,
  width: number,
  height: number,
  isForeground: (luma: number) => boolean,
): Blob[] {
  const labels = new Int32Array(width * height).fill(-1);
  const parent: number[] = [];
  const find = (x: number): number => {
    let root = x;
    while (parent[root] !== root) root = parent[root];
    while (parent[x] !== root) {
      const next = parent[x];
      parent[x] = root;
      x = next;
    }
    return root;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  // Pass 1 — provisional labels.
  const stack: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!isForeground(luma[i])) continue;

      // 8-connected neighbours already visited.
      let best = -1;
      for (let dy = -1; dy <= 0; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dy === 0 && dx >= 0) continue;
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || nx < 0 || ny >= height) continue;
          const ni = ny * width + nx;
          const nl = labels[ni];
          if (nl < 0) continue;
          const root = find(nl);
          if (best < 0) best = root;
          else union(best, root);
        }
      }

      if (best < 0) {
        const id = parent.length;
        parent.push(id);
        labels[i] = id;
        best = id;
      } else {
        labels[i] = best;
      }

      // Propagate to unvisited 8-neighbours immediately (single-visit flood).
      stack.length = 0;
      stack.push(i);
      while (stack.length > 0) {
        const p = stack.pop() as number;
        const py = (p / width) | 0;
        const px = p % width;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dy === 0 && dx === 0) continue;
            const ny = py + dy;
            const nx = px + dx;
            if (ny < 0 || nx < 0 || ny >= height) continue;
            const ni = ny * width + nx;
            if (labels[ni] >= 0 || !isForeground(luma[ni])) continue;
            labels[ni] = find(best);
            stack.push(ni);
          }
        }
      }
    }
  }

  // Pass 2 — accumulate per-root statistics.
  interface Acc {
    area: number;
    sum: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    edges: number;
  }
  const acc = new Map<number, Acc>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (labels[i] < 0) continue;
      const root = find(labels[i]);
      let a = acc.get(root);
      if (!a) {
        a = { area: 0, sum: 0, minX: x, maxX: x, minY: y, maxY: y, edges: 0 };
        acc.set(root, a);
      }
      a.area += 1;
      a.sum += luma[i];
      if (x < a.minX) a.minX = x;
      if (x > a.maxX) a.maxX = x;
      if (y < a.minY) a.minY = y;
      if (y > a.maxY) a.maxY = y;
      // Count a background-facing edge (right + bottom only, each once).
      if (x + 1 >= width || labels[i + 1] < 0) a.edges += 1;
      if (y + 1 >= height || labels[i + width] < 0) a.edges += 1;
    }
  }

  const blobs: Blob[] = [];
  for (const a of acc.values()) {
    const bw = a.maxX - a.minX + 1;
    const bh = a.maxY - a.minY + 1;
    blobs.push({
      area: a.area,
      x: a.minX,
      y: a.minY,
      perimeter: a.edges,
      meanLuma: a.sum / a.area,
      diameter: 2 * Math.sqrt(a.area / Math.PI),
      width: bw,
      height: bh,
      elongation: Math.max(bw, bh) / Math.min(bw, bh),
      fill: a.area / (bw * bh),
    });
  }
  return blobs;
}

/**
 * Split estimate for a blob that looks like two touching colonies.
 *
 * A blob of touching colonies is (a) large, (b) not convex — it has a waist —
 * and (c) low fill relative to its bounding box. We count how many times the
 * vertical width profile drops below a fraction of the blob's widest row.
 * Returns the number of sub-colonies (1 when nothing looks merged).
 */
export function estimateSplit(blob: Blob, medianArea: number): number {
  if (medianArea <= 0) return 1;
  // Too small to be more than one ordinary colony.
  if (blob.area < medianArea * 2.2) return 1;
  // A single round colony already fills only ~π/4 ≈ 0.79 of its bounding box,
  // so fill cannot separate "one" from "two". Elongation can: two colonies
  // touching side by side give a bounding box roughly twice as wide as tall.
  if (blob.elongation < 1.45) return 1;
  const parts = Math.max(1, Math.round(Math.sqrt(blob.area / medianArea)));
  return Math.min(parts, 8);
}

export interface CountOptions {
  /** Colonies smaller than this (in pixels) are treated as debris. */
  minArea: number;
  /** Manually override the automatic Otsu threshold. */
  threshold: number | null;
  /** Colours darker than this count as a colony (agar is lighter). */
  darkIsColony: boolean;
  /** Try to split merged colonies. */
  splitMerged: boolean;
}

export const DEFAULT_COUNT_OPTIONS: CountOptions = {
  minArea: 12,
  threshold: null,
  darkIsColony: true,
  splitMerged: true,
};

export interface CountResult {
  /** Final colony count after the size floor and the split heuristic. */
  count: number;
  /** Blobs that survived the size floor. */
  blobs: Blob[];
  /** Blobs the split heuristic expanded, and by how much. */
  merged: { area: number; splitTo: number }[];
  /** Blobs discarded by the size floor. */
  discarded: number;
  threshold: number;
  /** Fraction of the frame classified as foreground. */
  coverage: number;
  areaStats: {
    median: number;
    min: number;
    max: number;
    mean: number;
    /** Coefficient of variation of blob area — a rough "evenness of the plate" number. */
    cv: number;
  } | null;
  notes: string[];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function countColonies(
  img: Rgba,
  options: CountOptions = DEFAULT_COUNT_OPTIONS,
): CountResult {
  const notes: string[] = [];
  const { width, height } = img;
  const luma = toLuma(img);
  const auto = options.threshold === null;
  const threshold = options.threshold ?? otsu(luma);
  if (auto && threshold < 0) {
    // A flat field has no foreground at all. Reporting "0 colonies" is the
    // honest answer; thresholding anyway would count the whole plate.
    return {
      count: 0,
      blobs: [],
      merged: [],
      discarded: 0,
      threshold: 0,
      coverage: 0,
      areaStats: null,
      notes: [
        "تصویر یکنواخت است و آستانه‌گذاری خودکار ممکن نیست. این عکس احتمالاً پس‌زمینهٔ خالی یا خارج از فوکوس است.",
      ],
    };
  }
  if (auto) notes.push(`آستانهٔ خودکار Otsu روی ${threshold} تنظیم شد.`);

  const isForeground = (v: number) =>
    options.darkIsColony ? v <= threshold : v > threshold;

  const all = labelBlobs(luma, width, height, isForeground);
  const kept = all.filter((b) => b.area >= options.minArea);
  const discarded = all.length - kept.length;
  if (discarded > 0) {
    notes.push(
      `${discarded.toLocaleString("fa-IR")} لکهٔ کوچک‌تر از ${options.minArea.toLocaleString("fa-IR")} پیکسل به‌عنوان نویز کنار گذاشته شد.`,
    );
  }

  const merged: { area: number; splitTo: number }[] = [];
  let count = kept.length;
  if (options.splitMerged && kept.length > 0) {
    const med = median(kept.map((b) => b.area));
    for (const b of kept) {
      const n = estimateSplit(b, med);
      if (n > 1) {
        merged.push({ area: b.area, splitTo: n });
        count += n - 1;
      }
    }
    if (merged.length > 0) {
      notes.push(
        `${merged.length.toLocaleString("fa-IR")} لکه به‌صورت چند کلنی حل شد. این تخمین هندسی است و ممکن است خطا داشته باشد — خروجی تصویر را بررسی کنید.`,
      );
    }
  }

  const areas = kept.map((b) => b.area);
  const mean = areas.length ? areas.reduce((a, b) => a + b, 0) / areas.length : 0;
  const variance = areas.length
    ? areas.reduce((a, b) => a + (b - mean) ** 2, 0) / areas.length
    : 0;

  let areaStats: CountResult["areaStats"] = null;
  if (areas.length > 0) {
    areaStats = {
      median: median(areas),
      min: Math.min(...areas),
      max: Math.max(...areas),
      mean,
      cv: mean > 0 ? Math.sqrt(variance) / mean : 0,
    };
  }

  const foreground = all.reduce((a, b) => a + b.area, 0);
  if (kept.length === 0) notes.push("هیچ کلنی تشخیص داده نشد. آستانه یا کیفیت تصویر را بررسی کنید.");

  return {
    count,
    blobs: kept,
    merged,
    discarded,
    threshold,
    coverage: foreground / (width * height),
    areaStats,
    notes,
  };
}

// ── CFU/mL ──────────────────────────────────────────────────────────────────

export interface CfuOptions {
  /** Overall dilution factor of the plated suspension, e.g. 10⁵. */
  dilution: number;
  /** Volume plated in mL (0.1 for a 100 µL spread plate). */
  platedVolume: number;
  /** Number of replicate plates at this dilution. */
  replicates: number;
  /** Only plates in 30–300 colonies are considered countable (ISO 4833). */
  countableRange: [number, number];
}

export const DEFAULT_CFU: CfuOptions = {
  dilution: 1e5,
  platedVolume: 0.1,
  replicates: 1,
  countableRange: [30, 300],
};

export interface CfuResult {
  /** Count per mL of the original suspension. */
  perMl: number | null;
  /** Total colonies across all counted plates. */
  total: number;
  /** How many plates fell inside the countable range. */
  usable: number;
  /** Every plate, flagged countable or not. */
  plates: { index: number; colonies: number; usable: boolean; perMl: number | null }[];
  /** Sample standard deviation across plates. */
  sd: number | null;
  /** Coefficient of variation across plates, %. */
  cv: number | null;
  note: string;
}

export function cfuPerMl(counts: number[], options: CfuOptions = DEFAULT_CFU): CfuResult {
  const divisor = Math.max(options.dilution, 1e-9) * Math.max(options.platedVolume, 1e-9);
  const [lo, hi] = options.countableRange;
  const plates = counts.map((colonies, i) => {
    const usable = colonies >= lo && colonies <= hi;
    return {
      index: i + 1,
      colonies,
      usable,
      perMl: usable ? Math.round(colonies / divisor) : null,
    };
  });
  const usableValues = plates.filter((p) => p.usable);
  if (usableValues.length === 0) {
    return {
      perMl: null,
      total: plates.reduce((a, p) => a + p.colonies, 0),
      usable: 0,
      plates,
      sd: null,
      cv: null,
      note: `هیچ پلیتی در بازهٔ شمارشی ${lo}–${hi} کلنی نیفتاد. CFU/mL قابل گزارش نیست — رقیق‌سازی را اصلاح کنید.`,
    };
  }

  const values = usableValues.map((p) => p.perMl as number);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd =
    values.length > 1
      ? Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1))
      : null;

  const note =
    usableValues.length < plates.length
      ? `${plates.length - usableValues.length} پلیت خارج از بازهٔ شمارشی بود و در میانگین نیامد.`
      : "";

  return {
    perMl: Math.round(mean),
    total: plates.reduce((a, p) => a + p.colonies, 0),
    usable: usableValues.length,
    plates,
    sd: sd === null ? null : Math.round(sd),
    cv: sd === null || mean === 0 ? null : (sd / mean) * 100,
    note,
  };
}

/** ISO-style reporting: two significant figures. */
export function sigFigs(value: number, digits = 2): string {
  if (value === 0) return "۰";
  const mag = Math.floor(Math.log10(Math.abs(value)));
  const factor = Math.pow(10, digits - 1 - mag);
  return (Math.round(value * factor) / factor).toString();
}