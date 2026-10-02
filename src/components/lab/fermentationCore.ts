/**
 * Genova Virtual Lab — آزمایشگاه تخمیر (core)
 * ─────────────────────────────────────────────────────────────────────────────
 * Fits the student's own time-series and reports the standard kinetic
 * parameters. Everything is deterministic: same numbers in, same numbers out,
 * so two students get the same answer for the same data.
 *
 * The two growth models used are the classical ones:
 *   • Logistic  — dX/dt = µmax·X·(1 − X/Xmax), integrates to
 *                  X(t) = Xmax / (1 + ((Xmax−X0)/X0)·e^(−µmax·t))
 *   • Gompertz   — dX/dt = µmax·X·ln(Xmax/X), integrates to
 *                  X(t) = Xmax·exp(−e^(−µmax·(t−lag)))
 *
 * Both are *models fitted to observations*, never a simulation presented as a
 * measurement. Fitted curves are labelled as fits, and goodness-of-fit is always
 * shown so a poor fit is visible instead of hidden behind a nice parameter.
 */

// ── Curve fitting ───────────────────────────────────────────────────────────

export interface GrowthPoint {
  /** Hours from inoculation. */
  t: number;
  /** Observed biomass — OD600 or g/L, whichever the user labels it. */
  x: number;
}

export type GrowthModel = "logistic" | "gompertz";

export const MODEL_LABELS: Record<GrowthModel, string> = {
  logistic: "لجستیک",
  gompertz: "گامپرتز",
};

export interface GrowthFit {
  model: GrowthModel;
  /** Parameters, in the sense of the equation for each model. */
  X0: number;
  Xmax: number;
  /** Maximum specific growth rate, per hour. */
  muMax: number;
  /** Lag time in hours. 0 for the logistic fit, as the model has none. */
  lag: number;
  r2: number;
  rmse: number;
  /** The fitted curve, one point per observed time. */
  curve: { t: number; predicted: number }[];
  /** Observed points, kept for plotting alongside the fit. */
  points: GrowthPoint[];
  /** Doubling time from µmax, 0 when µmax is not positive. */
  doublingTimeH: number;
  /** Highest observed point. */
  maxObserved: number;
  /** Time at which the fit first crosses half of Xmax. */
  tAtHalfMax: number;
  warnings: string[];
}

function rSquared(points: GrowthPoint[], predicted: (t: number) => number) {
  const ys = points.map((p) => p.x);
  const mean = ys.reduce((s, y) => s + y, 0) / ys.length;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const pred = predicted(p.t);
    ssTot += (p.x - mean) * (p.x - mean);
    ssRes += (p.x - pred) * (p.x - pred);
  }
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);
  const rmse = Math.sqrt(ssRes / points.length);
  return { r2, rmse };
}

/**
 * Least-squares regression of {x,y} pairs, used to linearise both models.
 */
function regress(lin: { x: number; y: number }[]) {
  const n = lin.length;
  let sx = 0;
  let sy = 0;
  for (const l of lin) {
    sx += l.x;
    sy += l.y;
  }
  const mx = sx / n;
  const my = sy / n;
  let sxy = 0;
  let sxx = 0;
  for (const l of lin) {
    sxy += (l.x - mx) * (l.y - my);
    sxx += (l.x - mx) * (l.x - mx);
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

/**
 * Candidate multipliers for Xmax, scanned coarse then refined.
 *
 * A series that approaches its asymptote can have maxObserved within a fraction
 * of a percent of the true Xmax, so the scan has to start essentially at 1.0 —
 * starting at 1.02 would skip straight past the correct value and pin Xmax to
 * the top of the series instead. Two passes keep this cheap.
 */
function xmaxCandidates(maxObserved: number): number[] {
  const out: number[] = [];
  for (let f = 1.0005; f <= 6.0; f *= 1.01) out.push(f);
  // Refine just above 1, where the asymptote-sensitive fits live.
  for (let f = 1.0005; f <= 1.2; f += 0.0005) out.push(f);
  return out.map((f) => maxObserved * f);
}

/**
 * Refine (Xmax, slope, intercept) by coordinate descent on the SSE of the curve.
 *
 * The linearised form only gives a starting guess: it assumes the logit (or the
 * log-log) relation is exactly straight, which it is not near saturation, where
 * ln ln(Xmax/X) → −∞. A short coordinate search on the actual curve error
 * removes that bias and is still fully deterministic.
 */
function refineParams(
  sorted: GrowthPoint[],
  start: { Xmax: number; slope: number; intercept: number },
  shape: (Xmax: number, slope: number, intercept: number, t: number) => number,
): { Xmax: number; slope: number; intercept: number } {
  let { Xmax, slope, intercept } = start;

  const sse = (m: number, s: number, c: number) => {
    let sum = 0;
    for (const p of sorted) {
      const v = shape(m, s, c, p.t);
      if (!Number.isFinite(v)) return Number.POSITIVE_INFINITY;
      const d = p.x - v;
      sum += d * d;
    }
    return sum;
  };

  let best = sse(Xmax, slope, intercept);
  const steps = [
    { m: Xmax * 0.02, s: Math.abs(slope) * 0.05 + 0.005, c: 0.2 },
    { m: Xmax * 0.005, s: Math.abs(slope) * 0.01 + 0.001, c: 0.05 },
    { m: Xmax * 0.001, s: Math.abs(slope) * 0.002 + 0.0002, c: 0.01 },
  ];

  for (const st of steps) {
    for (let pass = 0; pass < 80; pass++) {
      let improved = false;
      const trials: [number, number, number][] = [
        [Xmax + st.m, slope, intercept],
        [Xmax - st.m, slope, intercept],
        [Xmax, slope + st.s, intercept],
        [Xmax, slope - st.s, intercept],
        [Xmax, slope, intercept + st.c],
        [Xmax, slope, intercept - st.c],
      ];
      for (const [m, s, c] of trials) {
        if (!(m > 0)) continue;
        const e = sse(m, s, c);
        if (e < best - 1e-15) {
          best = e;
          Xmax = m;
          slope = s;
          intercept = c;
          improved = true;
        }
      }
      if (!improved) break;
    }
  }
  return { Xmax, slope, intercept };
}

/** Bisection for the first time a monotonic fit crosses a target level. */
function firstCrossing(predict: (t: number) => number, target: number, tMax: number): number {
  if (predict(0) >= target) return 0;
  if (predict(tMax) < target) return Number.NaN;
  let lo = 0;
  let hi = tMax;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (predict(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Three-parameter logistic fit.
 *
 * The model linearises exactly:
 *   ratio = X/Xmax = 1 / (1 + A·e^(−µt)),  A = (Xmax−X0)/X0
 *   ⇒ ln(ratio / (1 − ratio)) = µ·t − ln(A)
 * so the regression slope *is* µmax.
 *
 * Xmax is found by scanning above the observed maximum. Only points below the
 * saturation threshold are used for the linearised regression: near X/Xmax → 1
 * the logit diverges, and a single such point would otherwise dominate the fit.
 * The chosen candidate is then scored on the *curve* against every observation.
 */
export function fitLogistic(points: GrowthPoint[]): GrowthFit | null {
  const sorted = [...points].sort((a, b) => a.t - b.t);
  if (sorted.length < 3) return null;
  const xs = sorted.map((p) => p.x);
  if (xs.some((x) => x <= 0)) return null;

  const maxObserved = Math.max(...xs);
  const tMax = Math.max(...sorted.map((p) => p.t));
  if (!(tMax > 0)) return null;

  /** Highest X/Xmax still trusted for the linearised regression. */
  const SATURATION = 0.9;

  const warnings: string[] = [];
  let best: { Xmax: number; slope: number; intercept: number; r2: number; rmse: number } | null = null;

  for (const Xmax of xmaxCandidates(maxObserved)) {
    const lin: { x: number; y: number }[] = [];
    for (const p of sorted) {
      const ratio = p.x / Xmax;
      if (ratio <= 0 || ratio > SATURATION) continue;
      lin.push({ x: p.t, y: Math.log(ratio / (1 - ratio)) });
    }
    if (lin.length < 3) continue;
    const reg = regress(lin);
    if (!reg) continue;
    const shape = (m: number, s: number, c: number, t: number) =>
      m / (1 + Math.exp(-(s * t + c)));
    const refined = refineParams(sorted, { Xmax, slope: reg.slope, intercept: reg.intercept }, shape);
    const { r2, rmse } = rSquared(sorted, (t) => shape(refined.Xmax, refined.slope, refined.intercept, t));
    if (!Number.isFinite(r2)) continue;
    if (!best || r2 > best.r2) {
      best = { Xmax: refined.Xmax, slope: refined.slope, intercept: refined.intercept, r2, rmse };
    }
  }

  if (!best) return null;
  const muMax = best.slope;
  const predicted = (t: number) => best!.Xmax / (1 + Math.exp(-(best!.slope * t + best!.intercept)));
  const X0 = predicted(0);

  const curve = sorted.map((p) => ({ t: p.t, predicted: predicted(p.t) }));
  const tAtHalfMax = firstCrossing(predicted, best.Xmax / 2, tMax);

  if (muMax <= 0) warnings.push("µmax منفی برآورد شده؛ سری داده روند نزولی دارد و با مدل رشد سازگار نیست.");
  if (sorted.length < 5) warnings.push("با کمتر از ۵ نقطه، پارامترهای برازش به‌شدت به نویز داده حساس‌اند.");
  if (best.r2 < 0.9) warnings.push("برازش ضعیف است؛ این سری با مدل لجستیک توصیف مناسبی ندارد.");
  if (best.Xmax < maxObserved * 1.05) {
    warnings.push("Xmax بسیار نزدیک به بیشترین مقدار مشاهده‌شده است؛ فاز سکون در داده دیده نمی‌شود و Xmax برآورد قابل اتکایی نیست.");
  }

  return {
    model: "logistic",
    X0,
    Xmax: best.Xmax,
    muMax,
    lag: 0,
    r2: best.r2,
    rmse: best.rmse,
    curve,
    points: sorted,
    doublingTimeH: muMax > 0 ? Math.log(2) / muMax : 0,
    maxObserved,
    tAtHalfMax,
    warnings,
  };
}

/**
 * Three-parameter Gompertz fit.
 *
 * The model linearises exactly:
 *   X = Xmax·exp(−exp(−µ·(t − t₀)))  ⇒  ln ln(Xmax/X) = −µ·t + µ·t₀
 * so the regression slope is −µmax and the intercept gives µ·t₀.
 *
 * Lag is the classic Gompertz lag: the time at which the tangent drawn at the
 * point of maximum growth rate back-intercepts X = X0. It is reported with that
 * definition on screen rather than being a bare number.
 *
 * As with the logistic, points in saturation are excluded from the linearised
 * regression but included when scoring the candidate curve.
 */
export function fitGompertz(points: GrowthPoint[]): GrowthFit | null {
  const sorted = [...points].sort((a, b) => a.t - b.t);
  if (sorted.length < 3) return null;
  const xs = sorted.map((p) => p.x);
  if (xs.some((x) => x <= 0)) return null;

  const maxObserved = Math.max(...xs);
  const tMax = Math.max(...sorted.map((p) => p.t));
  if (!(tMax > 0)) return null;

  /** Highest X/Xmax still trusted for the linearised regression. */
  const SATURATION = 0.9;

  const warnings: string[] = [];
  let best: { Xmax: number; slope: number; intercept: number; r2: number; rmse: number } | null = null;

  for (const Xmax of xmaxCandidates(maxObserved)) {
    const lin: { x: number; y: number }[] = [];
    for (const p of sorted) {
      if (p.x >= Xmax) continue;
      const ratio = p.x / Xmax;
      if (ratio > SATURATION) continue;
      const inner = Math.log(Xmax / p.x);
      if (!(inner > 0)) continue;
      lin.push({ x: p.t, y: Math.log(inner) });
    }
    if (lin.length < 3) continue;
    const reg = regress(lin);
    if (!reg) continue;
    const shape = (m: number, s: number, c: number, t: number) =>
      m * Math.exp(-Math.exp(s * t + c));
    const refined = refineParams(sorted, { Xmax, slope: reg.slope, intercept: reg.intercept }, shape);
    const { r2, rmse } = rSquared(sorted, (t) => shape(refined.Xmax, refined.slope, refined.intercept, t));
    if (!Number.isFinite(r2)) continue;
    if (!best || r2 > best.r2) {
      best = { Xmax: refined.Xmax, slope: refined.slope, intercept: refined.intercept, r2, rmse };
    }
  }

  if (!best) return null;
  const muMax = -best.slope;
  const predicted = (t: number) =>
    best!.Xmax * Math.exp(-Math.exp(best!.slope * t + best!.intercept));
  const X0 = predicted(0);

  const curve = sorted.map((p) => ({ t: p.t, predicted: predicted(p.t) }));

  // Time of maximum growth rate, t₀ = intercept / µ.
  const t0 = muMax > 0 ? best.intercept / muMax : 0;
  // Gompertz lag: back-intercept of the tangent at t₀ down to X0.
  // Tangent at t₀ passes through Xmax/e with slope µ·Xmax/e.
  const lag = muMax > 0 ? t0 + (Math.E * X0 - best.Xmax) / (muMax * best.Xmax) : 0;

  const tAtHalfMax = firstCrossing(predicted, best.Xmax / 2, tMax);

  if (muMax <= 0) warnings.push("µmax منفی برآورد شده؛ سری داده با مدل رشد سازگار نیست.");
  if (sorted.length < 5) warnings.push("با کمتر از ۵ نقطه، پارامترهای برازش به‌شدت به نویز داده حساس‌اند.");
  if (best.r2 < 0.9) warnings.push("برازش ضعیف است؛ این سری با مدل گامپرتز توصیف مناسبی ندارد.");
  if (best.Xmax < maxObserved * 1.05) {
    warnings.push("Xmax بسیار نزدیک به بیشترین مقدار مشاهده‌شده است؛ فاز سکون در داده دیده نمی‌شود.");
  }
  if (lag < 0) {
    warnings.push("lag منفی به‌دست آمد؛ فاز تأخیری در این داده دیده نمی‌شود.");
  }

  return {
    model: "gompertz",
    X0,
    Xmax: best.Xmax,
    muMax,
    lag: Math.max(0, lag),
    r2: best.r2,
    rmse: best.rmse,
    curve,
    points: sorted,
    doublingTimeH: muMax > 0 ? Math.log(2) / muMax : 0,
    maxObserved,
    tAtHalfMax,
    warnings,
  };
}

export function fitGrowth(points: GrowthPoint[], model: GrowthModel): GrowthFit | null {
  return model === "logistic" ? fitLogistic(points) : fitGompertz(points);
}

/** Fits both models so the student can see which one the data actually prefers. */
export function compareModels(points: GrowthPoint[]): Record<GrowthModel, GrowthFit | null> {
  return { logistic: fitLogistic(points), gompertz: fitGompertz(points) };
}

// ── Growth and production metrics ───────────────────────────────────────────

export interface ProductPoint {
  t: number;
  /** Metabolite or product titre in the unit the user declares, e.g. g/L. */
  p: number;
}

export interface FermentationMetrics {
  /** Final titre from the observed series. */
  finalProduct: number;
  /** Peak observed titre and when it happened. */
  peakProduct: number;
  peakTime: number;
  /** Volumetric productivity, g/L/h. */
  qP: number;
  /** Maximum observed specific growth rate from consecutive points, 1/h. */
  observedMuMax: number;
  /** Specific productivity at the time of peak product, g/g/h. */
  specificProductivity: number;
  /** Biomass at the time of peak product. */
  biomassAtPeak: number;
  /** Product per biomass formed, g/g — only if a usable Xmax exists. */
  yieldOnBiomass: number | null;
  /** Growth-coupled share of product: qP / (µmax·Xmax). */
  growthAssociated: number | null;
  warnings: string[];
}

/**
 * Derived production metrics from an observed growth + product series.
 * qP is the slope from origin to the peak, which is the conventional definition
 * of volumetric productivity, and it is stated as such.
 */
export function fermentationMetrics(
  growth: GrowthPoint[],
  product: ProductPoint[],
  fit: GrowthFit | null,
  /** Conversion factor if P and X are in different units. */
  unitRatio = 1,
): FermentationMetrics | null {
  const warnings: string[] = [];
  const g = [...growth].sort((a, b) => a.t - b.t);
  const pr = [...product].sort((a, b) => a.t - b.t);
  if (g.length < 2 || pr.length === 0) return null;

  let peak = pr[0];
  for (const p of pr) if (p.p > peak.p) peak = p;

  const finalProduct = pr[pr.length - 1].p;

  // qP: slope from (0,0) to the peak.
  const qP = peak.t > 0 ? peak.p / peak.t : 0;

  // Observed mu max from consecutive intervals.
  let observedMuMax = 0;
  for (let i = 1; i < g.length; i++) {
    const dt = g[i].t - g[i - 1].t;
    if (dt <= 0) continue;
    if (g[i - 1].x <= 0) continue;
    const mu = (Math.log(g[i].x) - Math.log(g[i - 1].x)) / dt;
    if (mu > observedMuMax) observedMuMax = mu;
  }

  const biomassAtPeak = nearestBiomass(g, peak.t);

  // Specific productivity qx = (dP/dt) / X, evaluated at the peak interval.
  let specificProductivity = 0;
  {
    const before = [...pr].reverse().find((p) => p.t <= peak.t && p.t < peak.t);
    if (before && biomassAtPeak > 0) {
      const dt = peak.t - before.t;
      if (dt > 0) specificProductivity = ((peak.p - before.p) / dt / biomassAtPeak) * unitRatio;
    }
  }

  let yieldOnBiomass: number | null = null;
  if (fit && fit.Xmax > 0) {
    yieldOnBiomass = peak.p / (fit.Xmax - fit.X0) * unitRatio;
  } else {
    warnings.push("Xmax قابل اتکایی برآورد نشد؛ بازده بر پایهٔ زیست‌توده گزارش نشد.");
  }

  let growthAssociated: number | null = null;
  if (fit && fit.muMax > 0 && fit.Xmax > 0) {
    growthAssociated = qP / (fit.muMax * fit.Xmax);
  } else {
    warnings.push("تقسیم تولید به بخش وابسته به رشد ممکن نشد چون µmax یا Xmax برآورد نشد.");
  }

  const lastT = g[g.length - 1].t;
  if (lastT > 0 && peak.t < lastT * 0.8) {
    warnings.push(
      "بیشترین تیتر پیش از پایان سری رخ داده؛ ادامهٔ تخمیر می‌تواند بازده را بالا ببرد یا محصول را تجزیه کند — به سلول زنده و شرایط بستگی دارد.",
    );
  }
  if (finalProduct < peak.p * 0.95) {
    warnings.push("تیتر پایانی کمتر از بیشترین مقدار است؛ افت تیتر معمولاً یعنی محصول مصرف یا تجزیه شده است.");
  }
  if (observedMuMax <= 0) {
    warnings.push("µmax مشاهده‌شده صفر یا منفی است؛ دادهٔ رشد یکنواخت یا نزولی است.");
  }

  return {
    finalProduct,
    peakProduct: peak.p,
    peakTime: peak.t,
    qP,
    observedMuMax,
    specificProductivity,
    biomassAtPeak,
    yieldOnBiomass,
    growthAssociated,
    warnings,
  };
}



/** Nearest observed biomass to a time point, by absolute distance. */
function nearestBiomass(growth: GrowthPoint[], t: number): number {
  if (growth.length === 0) return 0;
  let bestPoint = growth[0];
  let bestDist = Math.abs(growth[0].t - t);
  for (const p of growth) {
    const d = Math.abs(p.t - t);
    if (d < bestDist) {
      bestDist = d;
      bestPoint = p;
    }
  }
  return bestPoint.x;
}

// ── Substrate and yield ─────────────────────────────────────────────────────

export interface SubstrateSeries {
  /** Substrate at inoculation, g/L. */
  initial: number;
  /** Substrate at the end of the run, g/L. */
  final: number;
}

export interface YieldResult {
  /** Biomass yield on substrate, g biomass per g substrate consumed. */
  YxS: number;
  /** Product yield on substrate, g product per g substrate consumed. */
  YpS: number;
  substrateConsumed: number;
  /** Fraction of substrate consumed, 0–1. */
  fractionConsumed: number;
  /** Substrate still left, g/L. */
  residual: number;
  warnings: string[];
}

/**
 * Yields from the measured drop in substrate plus the biomass and product
 * endpoints. Uses observed endpoints only — no theoretical yield is assumed, so
 * a YpS above what the stoichiometry allows is a red flag the user can see
 * rather than a number this tool quietly passes along.
 */
export function substrateYields(
  substrate: SubstrateSeries,
  finalBiomass: number,
  initialBiomass: number,
  finalProduct: number,
): YieldResult | null {
  const warnings: string[] = [];
  const s0 = substrate.initial;
  const s1 = substrate.final;
  if (!(s0 > 0) || s1 < 0) return null;

  const consumed = s0 - s1;
  if (!(consumed > 0)) {
    return {
      YxS: Number.NaN,
      YpS: Number.NaN,
      substrateConsumed: consumed,
      fractionConsumed: 0,
      residual: s1,
      warnings: ["هیچ ساب‌استراتی مصرف نشده است؛ بازده قابل محاسبه نیست."],
    };
  }

  const biomassFormed = finalBiomass - initialBiomass;
  if (biomassFormed <= 0) {
    warnings.push("زیست‌تودهٔ خالص افزایشی نشان نداد؛ بازده زیست‌توده بر ساب‌استرات قابل گزارش نیست.");
  }
  if (s1 / s0 > 0.15) {
    warnings.push(
      `بیش از ۱۵٪ ساب‌استرات باقی مانده است؛ تخمیر کامل نشده و بازده گزارش‌شده کمتر از ظرفیت واقعی است.`,
    );
  }

  return {
    YxS: biomassFormed > 0 ? biomassFormed / consumed : Number.NaN,
    YpS: finalProduct / consumed,
    substrateConsumed: consumed,
    fractionConsumed: consumed / s0,
    residual: s1,
    warnings,
  };
}

/** Persian digit conversion, matching the rest of the lab. */
export function faNum(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value
    .toFixed(digits)
    .replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}