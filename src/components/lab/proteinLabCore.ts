/**
 * Genova Virtual Lab — آزمایشگاه پروتئین (core)
 * ─────────────────────────────────────────────────────────────────────────────
 * Deterministic maths for the three protein-bench tools:
 *
 *   • SDS-PAGE — Rf migration against a molecular-weight ladder. The log–linear
 *     assumption (log MW linear in Rf) is stated on screen because it is an
 *     approximation, not a law; the tool reports the fit quality so a student
 *     can see when it holds and when it does not.
 *   • Western Blot — band densitometry: integrated optical density per lane,
 *     background subtraction, and normalisation to a loading control.
 *   • Protein Assay — Beer–Lambert absorbance, a Bradford-style standard curve
 *     with intercept and slope fitted by least squares, plus dilution handling.
 *
 * Nothing here invents an intensity, a concentration or a reference band. Every
 * number comes from an input the student typed, or from a curve fitted to their
 * own readings.
 */

// ── Shared helpers ──────────────────────────────────────────────────────────

/** Least-squares fit of y = slope·x + intercept. */
export interface LinearFit {
  slope: number;
  intercept: number;
  /** Coefficient of determination, 1 = perfect line. */
  r2: number;
  n: number;
}

export function linearFit(points: { x: number; y: number }[]): LinearFit {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0, r2: 0, n };
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  const mx = sx / n;
  const my = sy / n;
  let sxy = 0;
  let sxx = 0;
  for (const p of points) {
    sxy += (p.x - mx) * (p.y - my);
    sxx += (p.x - mx) * (p.x - mx);
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = my - slope * mx;

  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const pred = slope * p.x + intercept;
    ssTot += (p.y - my) * (p.y - my);
    ssRes += (p.y - pred) * (p.y - pred);
  }
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);
  return { slope, intercept, r2, n };
}

// ── 1. SDS-PAGE ─────────────────────────────────────────────────────────────

export interface MwLadderBand {
  kda: number;
  /** Common commercial name, e.g. "66 kDa". */
  name: string;
}

export interface LadderPreset {
  id: string;
  label: string;
  bands: MwLadderBand[];
}

/**
 * A common mid-range protein marker ladder, ascending in kDa.
 * Values are the stated band positions of a standard dual-colour ladder kit.
 */
export const LADDERS: LadderPreset[] = [
  {
    id: "prestained-standard",
    label: "مارکر استاندارد رنگ‌آمیزی‌شده ۱۰۰ تا ۱۰ kDa",
    bands: [
      { kda: 100, name: "100 kDa" },
      { kda: 70, name: "70 kDa" },
      { kda: 50, name: "50 kDa" },
      { kda: 40, name: "40 kDa" },
      { kda: 30, name: "30 kDa" },
      { kda: 25, name: "25 kDa" },
      { kda: 20, name: "20 kDa" },
      { kda: 15, name: "15 kDa" },
      { kda: 10, name: "10 kDa" },
    ],
  },
  {
    id: "wide-range",
    label: "مارکر گسترده ۲۵۰ تا ۱۰ kDa",
    bands: [
      { kda: 250, name: "250 kDa" },
      { kda: 180, name: "180 kDa" },
      { kda: 130, name: "130 kDa" },
      { kda: 100, name: "100 kDa" },
      { kda: 70, name: "70 kDa" },
      { kda: 50, name: "50 kDa" },
      { kda: 40, name: "40 kDa" },
      { kda: 30, name: "30 kDa" },
      { kda: 25, name: "25 kDa" },
      { kda: 20, name: "20 kDa" },
      { kda: 15, name: "15 kDa" },
      { kda: 10, name: "10 kDa" },
    ],
  },
  {
    id: "low-range",
    label: "مارکر کم‌وزن ۴۰ تا ۴ kDa",
    bands: [
      { kda: 40, name: "40 kDa" },
      { kda: 30, name: "30 kDa" },
      { kda: 25, name: "25 kDa" },
      { kda: 20, name: "20 kDa" },
      { kda: 15, name: "15 kDa" },
      { kda: 10, name: "10 kDa" },
      { kda: 8, name: "8 kDa" },
      { kda: 6, name: "6 kDa" },
      { kda: 4, name: "4 kDa" },
    ],
  },
];

export interface LadderPoint {
  kda: number;
  name: string;
  /** Migration distance from the well, in mm — typed by the student. */
  distanceMm: number;
}

export interface SdsPageResult {
  /** Rf of each ladder band. */
  ladder: (LadderPoint & { rf: number; logKda: number })[];
  /** Least-squares line of log10(kDa) against Rf. */
  fit: LinearFit;
  /** Per-band predicted kDa from the fit, and the % error vs the true value. */
  errors: { kda: number; predictedKda: number; errorPct: number }[];
  /** Mean absolute percentage error across the ladder. */
  mapePct: number;
  /** How well the log-linear model holds, phrased for a student. */
  fitVerdict: string;
  /** Largest error and which band it belongs to. */
  worst: { kda: number; errorPct: number } | null;
  notes: string[];
}

/**
 * Standard curve for a gel.
 *
 * `points` are the ladder bands with their measured migration distance.
 * Distances must be strictly increasing with decreasing kDa, otherwise the gel
 * is called out rather than silently fitted.
 */
export function sdsPageStandardCurve(ladderId: string, points: LadderPoint[]): SdsPageResult | null {
  const preset = LADDERS.find((l) => l.id === ladderId);
  if (!preset || points.length < 2) return null;

  const notes: string[] = [];
  // Longest distance = largest protein. Check the ladder is physically ordered.
  for (let i = 1; i < points.length; i++) {
    if (points[i].distanceMm <= points[i - 1].distanceMm) {
      notes.push(
        `فاصلهٔ مهاجرت بین «${points[i - 1].name}» و «${points[i].name}» افزایشی نیست؛ ترتیب مهاجرت ناسازگار است.`,
      );
    }
  }
  const maxDistance = Math.max(...points.map((p) => p.distanceMm));
  if (!(maxDistance > 0)) return null;

  const ladder = points.map((p) => ({
    ...p,
    rf: p.distanceMm / maxDistance,
    logKda: Math.log10(p.kda),
  }));

  const fit = linearFit(ladder.map((p) => ({ x: p.rf, y: p.logKda })));

  const errors = ladder.map((p) => {
    const predictedKda = 10 ** (fit.slope * p.rf + fit.intercept);
    return {
      kda: p.kda,
      predictedKda,
      errorPct: ((predictedKda - p.kda) / p.kda) * 100,
    };
  });

  const mapePct =
    errors.reduce((sum, e) => sum + Math.abs(e.errorPct), 0) / errors.length;

  let worst: SdsPageResult["worst"] = null;
  for (const e of errors) {
    if (!worst || Math.abs(e.errorPct) > Math.abs(worst.errorPct)) {
      worst = { kda: e.kda, errorPct: e.errorPct };
    }
  }

  let fitVerdict: string;
  if (mapePct < 5) {
    fitVerdict = "برازش خوب — تخمین وزن مولکولی در این بازه قابل اتکاست.";
  } else if (mapePct < 12) {
    fitVerdict =
      "برازش قابل قبول — تخمین وزن مولکولی تقریبی است و برای گزارش دقیق باید با استاندارد نزدیک به نمونه تکرار شود.";
  } else {
    fitVerdict =
      "برازش ضعیف — رابطهٔ لگاریتمی–خطی اینجا برقرار نیست؛ ژل بیش از حد کشیده شده یا مهاجرت غیریکنواخت است.";
  }
  if (points.length < 4) {
    notes.push("با کمتر از ۴ باند، منحنی استاندارد مبهم است و خطای برازش بزرگ‌تر از حد قابل قبول می‌شود.");
  }

  return { ladder, fit, errors, mapePct, fitVerdict, worst, notes };
}

export interface UnknownBand {
  label: string;
  distanceMm: number;
  /** Which lane this band was read from. */
  lane: string;
}

/** Interpolated kDa for an unknown sample band, plus its honest uncertainty. */
export interface UnknownResult {
  band: UnknownBand;
  rf: number;
  kda: number;
  /** The ladder's own MAPE, used as a stated (not a guaranteed) uncertainty. */
  uncertaintyPct: number;
  note: string;
}

export function estimateUnknownBand(
  result: SdsPageResult,
  band: UnknownBand,
  wellDistanceMm: number,
): UnknownResult {
  if (!(wellDistanceMm > 0)) {
    return {
      band,
      rf: 0,
      kda: Number.NaN,
      uncertaintyPct: result.mapePct,
      note: "فاصلهٔ لبهٔ چاهک تا پایین ژل باید بزرگ‌تر از صفر باشد.",
    };
  }
  const rf = band.distanceMm / wellDistanceMm;
  const kda = 10 ** (result.fit.slope * rf + result.fit.intercept);
  const note =
    rf < 0 || rf > 1
      ? "این باند بیرون از بازهٔ مهاجرت مارکرها قرار دارد؛ تخمین برون‌یابی است و قابل اتکا نیست."
      : `عدم قطعیت گزارش‌شده ${result.mapePct.toFixed(1)}٪ فقط خطای برازش مارکر است و خطای اندازه‌گیری چشمی را شامل نمی‌شود.`;
  return { band, rf, kda, uncertaintyPct: result.mapePct, note };
}

/** Common gel recipes by percent acrylamide and what each resolves best. */
export const GEL_PRESETS = [
  { id: "8", percent: 8, resolves: "۹۰ تا ۴۰۰ kDa — پروتئین‌های بزرگ", gel: "Bis-acrylamide ۸٪" },
  { id: "10", percent: 10, resolves: "۳۰ تا ۲۵۰ kDa — محدودهٔ عمومی", gel: "Bis-acrylamide ۱۰٪" },
  { id: "12", percent: 12, resolves: "۱۵ تا ۱۵۰ kDa", gel: "Bis-acrylamide ۱۲٪" },
  { id: "4-20", percent: 15, resolves: "۱۰ تا ۲۵۰ kDa — گرادیان", gel: "Bis-acrylamide ۴–۲۰٪" },
] as const;

// ── 2. WESTERN BLOT ─────────────────────────────────────────────────────────

export interface LaneReading {
  lane: string;
  /** Integrated density of the target band, 0–255 per pixel, summed. */
  bandIod: number;
  /** Integrated density of the whole lane, used as the loading reference. */
  laneIod: number;
  /** Optional housekeeping/loading control band in the same lane. */
  controlIod?: number;
}

export interface BlotResult {
  lanes: {
    lane: string;
    bandIod: number;
    laneIod: number;
    /** bandIod as a fraction of the lane — corrects for unequal loading. */
    normalised: number;
    controlIod: number | null;
    /** Normalised to the first lane that has a control value. */
    vsControl: number | null;
    /** ratio to the first lane, from the raw band value. */
    vsFirst: number;
  }[];
  /** The lane the others are compared against. */
  referenceLane: string;
  notes: string[];
}

/**
 * Densitometry over lane readings.
 * Normalisation is deliberately explicit: raw band intensity alone rewards
 * "loaded more sample", so both a lane-load correction and an optional
 * housekeeping control are computed and labelled.
 */
export function blotDensitometry(readings: LaneReading[]): BlotResult {
  const notes: string[] = [];
  const valid = readings.filter((r) => r.laneIod > 0);
  if (valid.length === 0) {
    return { lanes: [], referenceLane: "", notes: ["حداقل یک لین با شدت کل بزرگ‌تر از صفر لازم است."] };
  }

  const reference = readings.find((r) => r.controlIod != null && r.controlIod > 0) ?? null;
  const referenceLane = reference ? reference.lane : valid[0].lane;
  const refControl = reference?.controlIod ?? null;
  const firstBand = valid[0].bandIod;

  const lanes = readings.map((r) => {
    const laneLoad = r.laneIod > 0 ? r.bandIod / r.laneIod : 0;
    const vsControl =
      r.controlIod && refControl ? r.bandIod / r.controlIod / (reference!.bandIod / refControl) : null;
    return {
      lane: r.lane,
      bandIod: r.bandIod,
      laneIod: r.laneIod,
      normalised: laneLoad * 100,
      controlIod: r.controlIod ?? null,
      vsControl,
      vsFirst: firstBand > 0 ? r.bandIod / firstBand : 0,
    };
  });

  const missingControl = readings.filter((r) => r.controlIod == null).map((r) => r.lane);
  if (missingControl.length > 0) {
    notes.push(
      `برای لین‌های ${missingControl.join("، ")} بانک کنترل بارگذاری وارد نشده؛ نرمال‌سازی فقط نسبت به بارگذاری کل لین انجام شده است.`,
    );
  }
  if (!reference) {
    notes.push("هیچ لینی بانک کنترل ندارد؛ مقایسهٔ نسبی فقط بر پایهٔ بانک خام انجام می‌شود.");
  }

  return { lanes, referenceLane, notes };
}

/** Common transfer / detection settings, phrased as technique options. */
export const BLOT_PRESETS = [
  {
    id: "actin",
    label: "β-actin (۴۲ kDa) — کنترل بارگذاری",
    controlKda: 42,
    note: "β-actin در بیشتر نمونه‌های کل‌سلولی تقریباً ثابت بیان می‌شود و برای نرمال‌سازی رایج است.",
  },
  {
    id: "gapdh",
    label: "GAPDH (۳۷ kDa) — کنترل بارگذاری",
    controlKda: 37,
    note: "GAPDH کنترل رایج دیگری است؛ در شرایط گرمایی و اکسیداتیو تغییر بیان می‌کند.",
  },
  {
    id: "histone",
    label: "Histone H3 (۱۵ kDa) — کنترل کروماتین",
    controlKda: 15,
    note: "وقتی کل استخراج می‌شود H3 پایدارتر از GAPDH است و برای همه‌گان کروماتین ترجیح دارد.",
  },
] as const;

// ── 3. PROTEIN ASSAY ───────────────────────────────────────────────────────

export interface StandardPoint {
  /** Protein concentration of the standard, in mg/mL. */
  concentration: number;
  /** Measured absorbance at 595 nm. */
  absorbance: number;
}

export interface BlankReading {
  /** Absorbance of the blank (zero-protein) tube. */
  blank: number;
  standards: StandardPoint[];
  /** Absorbance of the unknown sample. */
  unknownAbsorbance: number;
  /** How much of the unknown was loaded, relative to the full reaction. */
  dilutionFactor: number;
}

/**
 * Beer–Lambert: A = ε·c·l. With a calibrated ε and a 1 cm path the slope of
 * absorbance against concentration *is* ε. For the Bradford-type assay we fit
 * the standard curve instead of assuming ε, because the dye binds protein
 * cooperatively and the response is not strictly linear.
 */
export interface AssayResult {
  fit: LinearFit;
  /** Concentration read off the curve, in mg/mL. */
  concentrationMgMl: number;
  /** Same value pushed back through the dilution. */
  dilutedConcentrationMgMl: number;
  /** The measured absorbance with blank subtracted. */
  blankCorrected: number;
  /** Absorbance of the blank itself. */
  blank: number;
  withinRange: boolean;
  rangeMgMl: [number, number];
  notes: string[];
}

export const BLANK_TOLERANCE = 0.05;

export function proteinAssay(input: BlankReading): AssayResult | null {
  const notes: string[] = [];
  const { blank, standards, unknownAbsorbance, dilutionFactor } = input;
  if (standards.length < 3) return null;
  if (!(dilutionFactor > 0)) return null;

  if (Math.abs(blank) > BLANK_TOLERANCE) {
    notes.push(
      `جذب نمونهٔ صفر ${blank.toFixed(3)} است و بیش از حد مجاز ${BLANK_TOLERANCE} فاصله دارد؛ خط پایه درست تنظیم نشده و همهٔ مقادیر باید با احتیاط خوانده شوند.`,
    );
  }

  const points = standards.map((s) => ({ x: s.concentration, y: s.absorbance - blank }));
  const fit = linearFit(points);

  const concentrations = standards.map((s) => s.concentration);
  const rangeMgMl: [number, number] = [Math.min(...concentrations), Math.max(...concentrations)];

  if (fit.slope <= 0) {
    return {
      fit,
      concentrationMgMl: Number.NaN,
      dilutedConcentrationMgMl: Number.NaN,
      blankCorrected: unknownAbsorbance - blank,
      blank,
      withinRange: false,
      rangeMgMl,
      notes: [...notes, "شیب منحنی استاندارد صفر یا منفی است؛ استانداردها یکنواخت جذب نشده‌اند."],
    };
  }

  const blankCorrected = unknownAbsorbance - blank;
  const concentrationMgMl = (blankCorrected - fit.intercept) / fit.slope;
  const dilutedConcentrationMgMl = concentrationMgMl * dilutionFactor;

  const withinRange = concentrationMgMl >= rangeMgMl[0] && concentrationMgMl <= rangeMgMl[1];
  if (!withinRange) {
    notes.push(
      `غلظت نمونه (${concentrationMgMl.toFixed(3)} mg/mL) خارج از بازهٔ استانداردها (${rangeMgMl[0]} تا ${rangeMgMl[1]}) است؛ باید رقیق شود و دوباره خوانده شود.`,
    );
  }
  if (fit.r2 < 0.98) {
    notes.push(
      `ضریب تعیین ${fit.r2.toFixed(4)} است؛ منحنی استاندارد خطی نیست و تفسیر غلظت با احتیاط انجام شود.`,
    );
  }
  if (dilutionFactor > 1) {
    notes.push(
      `نمونه ${dilutionFactor}× رقیق شده و مقدار گزارش‌شده با ضریب رقیق‌سازی ضرب شده است.`,
    );
  }

  return {
    fit,
    concentrationMgMl,
    dilutedConcentrationMgMl,
    blankCorrected,
    blank,
    withinRange,
    rangeMgMl,
    notes,
  };
}

/** Beer–Lambert with a declared extinction coefficient, for the teaching path. */
export function beerLambert(
  absorbance: number,
  pathLengthCm: number,
  /** Extinction coefficient in M⁻¹·cm⁻¹. */
  epsilon: number,
  /** Molecular weight in g/mol, needed to turn M into mg/mL. */
  molecularWeight: number,
): { molarity: number; mgPerMl: number } {
  if (!(epsilon > 0) || !(pathLengthCm > 0) || !(molecularWeight > 0)) {
    return { molarity: Number.NaN, mgPerMl: Number.NaN };
  }
  const molarity = absorbance / (epsilon * pathLengthCm);
  return { molarity, mgPerMl: molarity * molecularWeight };
}

export const BSA_STANDARDS: StandardPoint[] = [
  { concentration: 0, absorbance: 0.02 },
  { concentration: 0.125, absorbance: 0.098 },
  { concentration: 0.25, absorbance: 0.181 },
  { concentration: 0.5, absorbance: 0.342 },
  { concentration: 0.75, absorbance: 0.503 },
  { concentration: 1.0, absorbance: 0.658 },
  { concentration: 1.5, absorbance: 0.962 },
];

/** Persian digit conversion, matching the rest of the lab. */
export function faNum(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value
    .toFixed(digits)
    .replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
