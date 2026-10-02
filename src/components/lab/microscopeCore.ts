/**
 * Genova Virtual Lab — میکروسکوپ مجازی (core)
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure, deterministic optics. No image is ever "analysed" here: the tool draws
 * a schematic field of view from these numbers, and every number it shows is
 * computed from a formula that is printed on screen.
 *
 * Honesty rules this file follows:
 *   • Resolution uses the Abbe diffraction limit d = λ / (2·NA) at a declared
 *     wavelength (550 nm, green, where the eye is most sensitive). It is the
 *     *theoretical* limit of a perfect aberration-free objective, not what a
 *     real stained slide resolves.
 *   • Magnification is objective × ocular. "Useful magnification" has a ceiling
 *     of roughly 1000 × NA, above which the eye resolves no extra detail and
 *     only empty magnification is added.
 *   • Field of view D = field number / magnification, with the standard 20 mm
 *     field number that most 10× oculars are designed around.
 *   • Specimens are hand-drawn schematic cartoons with declared sizes. They are
 *     a teaching model, not microscopy data and not any real patient slide.
 */

// ── Optics constants ────────────────────────────────────────────────────────

/** Green light — the wavelength the eye is most sensitive to. */
export const LAMBDA_NM = 550;

/** Standard field number of a 10× ocular with an 18 mm eyepiece. */
export const STANDARD_FIELD_NUMBER_MM = 20;

/** Above this multiple of NA the eye gains no resolvable detail. */
export const USEFUL_MAGNIFICATION_FACTOR = 1000;

/** Below this multiple of NA the eye cannot make out the image at all. */
export const EMPTY_MAGNIFICATION_FACTOR = 500;

export interface ObjectiveDef {
  id: string;
  /** Nominal magnification, e.g. 40. */
  mag: number;
  /** Numerical aperture, e.g. 0.65. */
  na: number;
  /** Immersion medium, if any. */
  medium: "dry" | "oil" | "water";
  /** Working distance in mm — oil objectives work very close to the coverslip. */
  workingDistanceMm: number;
  label: string;
}

/**
 * Typical dry/oil objective NA values. These follow the usual manufacturer
 * ranges: NA rises with magnification and then plateaus, which is exactly why
 * a 100× oil objective resolves barely more than a 60× oil objective.
 */
export const OBJECTIVES: ObjectiveDef[] = [
  { id: "4x", mag: 4, na: 0.1, medium: "dry", workingDistanceMm: 18.0, label: "4× / 0.10 — اسکن" },
  { id: "10x", mag: 10, na: 0.25, medium: "dry", workingDistanceMm: 6.5, label: "10× / 0.25 — یافت" },
  { id: "20x", mag: 20, na: 0.4, medium: "dry", workingDistanceMm: 3.1, label: "20× / 0.40 — General" },
  { id: "40x", mag: 40, na: 0.65, medium: "dry", workingDistanceMm: 1.6, label: "40× / 0.65 — High dry" },
  { id: "40x-oil", mag: 40, na: 1.3, medium: "oil", workingDistanceMm: 0.2, label: "40× / 1.30 Oil" },
  { id: "100x-oil", mag: 100, na: 1.4, medium: "oil", workingDistanceMm: 0.2, label: "100× / 1.40 Oil" },
];

export const OCULARS: { id: string; mag: number; label: string }[] = [
  { id: "10x", mag: 10, label: "10× (فیلد ۲۰ میلی‌متر)" },
  { id: "15x", mag: 15, label: "15× (فیلد ۱۳٫۳ میلی‌متر)" },
  { id: "20x", mag: 20, label: "20× (فیلد ۱۰ میلی‌متر)" },
];

export interface OpticsResult {
  objective: ObjectiveDef;
  ocularMag: number;
  totalMag: number;
  /** Abbe limit in µm at 550 nm. */
  resolutionUm: number;
  /** Shortest distance two points can be told apart, in nm. */
  resolutionNm: number;
  /** Field of view diameter in µm for this objective+ocular pair. */
  fieldOfViewUm: number;
  /** Field of view in mm, for the µm → mm display. */
  fieldOfViewMm: number;
  /** Lower bound of useful magnification. */
  minUsefulMag: number;
  /** Upper bound of useful magnification. */
  maxUsefulMag: number;
  /** True when totalMag sits inside the useful window. */
  inUsefulRange: boolean;
  /** How many resolved points fit across the field of view. */
  resolvedPointsAcross: number;
  /** Working distance converted to µm. */
  workingDistanceUm: number;
}

/** Abbe diffraction limit: d = λ / (2·NA), with λ in nm. Returns µm. */
export function abbeLimitUm(na: number, lambdaNm: number = LAMBDA_NM): number {
  if (!(na > 0)) return Number.NaN;
  return lambdaNm / (2 * na) / 1000;
}

/** Field of view diameter: D = field number / total magnification. */
export function fieldOfViewUm(
  totalMag: number,
  fieldNumberMm: number = STANDARD_FIELD_NUMBER_MM,
): number {
  if (!(totalMag > 0)) return Number.NaN;
  return (fieldNumberMm / totalMag) * 1000;
}

/**
 * Full optics readout for an objective + ocular pair.
 * Returns null when the ids are unknown.
 */
export function computeOptics(
  objectiveId: string,
  ocularId: string,
  fieldNumberMm: number = STANDARD_FIELD_NUMBER_MM,
): OpticsResult | null {
  const objective = OBJECTIVES.find((o) => o.id === objectiveId);
  const ocular = OCULARS.find((o) => o.id === ocularId);
  if (!objective || !ocular) return null;

  const totalMag = objective.mag * ocular.mag;
  const resolutionUm = abbeLimitUm(objective.na);
  const fovUm = fieldOfViewUm(totalMag, fieldNumberMm);
  const minUsefulMag = EMPTY_MAGNIFICATION_FACTOR * objective.na;
  const maxUsefulMag = USEFUL_MAGNIFICATION_FACTOR * objective.na;

  return {
    objective,
    ocularMag: ocular.mag,
    totalMag,
    resolutionUm,
    resolutionNm: resolutionUm * 1000,
    fieldOfViewUm: fovUm,
    fieldOfViewMm: fovUm / 1000,
    workingDistanceUm: objective.workingDistanceMm * 1000,
    minUsefulMag,
    maxUsefulMag,
    inUsefulRange: totalMag >= minUsefulMag && totalMag <= maxUsefulMag,
    resolvedPointsAcross: fovUm / resolutionUm,
  };
}

/**
 * How many pixels the field of view is divided into at a given screen diameter.
 * The tool uses this to make the schematic grid honest: the cell count drawn is
 * derived from the real field of view, not chosen to look busy.
 */
export function gridCount(fovUm: number, cellSizeUm: number): number {
  if (!(fovUm > 0) || !(cellSizeUm > 0)) return 0;
  return Math.max(1, Math.floor(fovUm / cellSizeUm));
}

// ── Specimens ───────────────────────────────────────────────────────────────

export type SpecimenKind = "cell" | "bacteria" | "tissue";

/** One schematic element drawn in the field. */
export interface SpecimenPart {
  /** Position in the field, 0–1. */
  x: number;
  y: number;
  /** Radius as a fraction of the field radius. */
  r: number;
  /** Aspect for elongated elements (bacteria rods), 1 = round. */
  aspect: number;
  /** Rotation in degrees, for rod-shaped bacteria. */
  rotation: number;
  /** Nucleus/nucleoid body, drawn inside the cell. */
  inner?: { r: number; dx: number; dy: number };
  /** Extra small dots — chloroplasts, granules, spores. */
  granules?: { x: number; y: number; r: number }[];
}

export interface Specimen {
  id: string;
  kind: SpecimenKind;
  label: string;
  /** Typical size in µm, used for the scale bar and the "is it resolvable" check. */
  typicalSizeUm: number;
  /** Size range across the population drawn. */
  sizeRangeUm: [number, number];
  /** Which objective the specimen is normally taught at. */
  recommendedObjective: string;
  /** Staining / contrast, phrased as a technique, not a claim about a sample. */
  stain: string;
  /** Honest description of what the cartoon shows. */
  description: string;
  parts: SpecimenPart[];
}

/**
 * Deterministic pseudo-random so the same specimen always draws identically —
 * a specimen that redraws differently on every render cannot be measured.
 */
function makeRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildParts(seed: number, count: number, radius: number, aspect: number, granular: boolean) {
  const rand = makeRandom(seed);
  const parts: SpecimenPart[] = [];
  for (let i = 0; i < count; i++) {
    // Rejection-free polar placement on an annulus so bodies do not stack.
    const angle = rand() * Math.PI * 2;
    const dist = 0.12 + Math.sqrt(rand()) * 0.78;
    const jitter = 0.85 + rand() * 0.3;
    const p: SpecimenPart = {
      x: 0.5 + Math.cos(angle) * dist * 0.92,
      y: 0.5 + Math.sin(angle) * dist * 0.92,
      r: radius * jitter,
      aspect,
      rotation: angle * (180 / Math.PI),
    };
    if (!granular) {
      p.inner = { r: radius * 0.42, dx: 0, dy: 0 };
    } else {
      const granules: { x: number; y: number; r: number }[] = [];
      const gCount = 2 + Math.floor(rand() * 3);
      for (let g = 0; g < gCount; g++) {
        const ga = rand() * Math.PI * 2;
        const gd = rand() * radius * 0.65;
        granules.push({
          x: Math.cos(ga) * gd,
          y: Math.sin(ga) * gd,
          r: radius * (0.1 + rand() * 0.12),
        });
      }
      p.granules = granules;
    }
    parts.push(p);
  }
  return parts;
}

export const SPECIMENS: Specimen[] = [
  {
    id: "onion-epidermis",
    kind: "cell",
    label: "پیاز — اپیدرم پیاز",
    typicalSizeUm: 200,
    sizeRangeUm: [150, 300],
    recommendedObjective: "10x",
    stain: "محلول Lugol ژوگه‌ای — کروماتین و دیوارهٔ سلولی تیره می‌شوند",
    description:
      "سلول‌های نباتی چندضلعی با دیوارهٔ ضخیم و یک هسته در هر سلول. اندازهٔ حدودی ۱۵۰ تا ۳۰۰ میکرومتر — با عدسی ۴× کل میدان دیده می‌شود و با ۱۰× یک شبکهٔ منظم سلولی.",
    parts: buildParts(1207, 34, 0.085, 1, false),
  },
  {
    id: "human-buccal",
    kind: "cell",
    label: "انسان — سلول گونه (buccal)",
    typicalSizeUm: 55,
    sizeRangeUm: [45, 70],
    recommendedObjective: "40x",
    stain: "مِتیل‌گلید — هستهٔ تیره، سیتوپلاسم روشن",
    description:
      "سلول‌های سنگ‌فرشی مسطح با هستهٔ بیضی و سیتوپلاسم دانه‌دار. ۴۵ تا ۷۰ میکرومتر؛ در ۴۰× تقریباً ۵ تا ۶ سلول در عرض میدان جا می‌شود.",
    parts: buildParts(4409, 15, 0.13, 1, false),
  },
  {
    id: "onion-root-tip",
    kind: "tissue",
    label: "گیاه — نوک ریشهٔ پیاز (میتوز)",
    typicalSizeUm: 12,
    sizeRangeUm: [8, 18],
    recommendedObjective: "40x",
    stain: "کارمین اچرید — کروماتین فشرده در کروموزوم‌های تیره",
    description:
      "بافت مریستمی با سلول‌های کشیده و هسته‌های تیرهٔ متراکم. ۸ تا ۱۸ میکرومتر. چیدمان منظم هسته‌ها نشانهٔ تقسیم سلولی فعال است.",
    parts: buildParts(8821, 44, 0.062, 1, false),
  },
  {
    id: "cocci",
    kind: "bacteria",
    label: "باکتری — کوکوس (استافیلوکوک)",
    typicalSizeUm: 1.0,
    sizeRangeUm: [0.8, 1.4],
    recommendedObjective: "100x-oil",
    stain: "گریمر — سلول‌ها بنفش، پس‌زمینهٔ سلولی سبز کم‌رنگ",
    description:
      "کوکوس‌های گرد به قطر حدود ۱ میکرومتر که در خوشه‌های نامنظم دیده می‌شوند. بدون رنگ‌آمیزی اصلاً دیده نمی‌شوند؛ با ۱۰۰× روغنی قابل تشخیص‌اند.",
    parts: buildParts(3313, 60, 0.045, 1, true),
  },
  {
    id: "bacilli",
    kind: "bacteria",
    label: "باکتری — باسیل (روده‌ای)",
    typicalSizeUm: 2.5,
    sizeRangeUm: [1.8, 3.5],
    recommendedObjective: "100x-oil",
    stain: "گریمر — باسیل‌های بنفش با انتهای گرد",
    description:
      "میله‌های کشیده به طول ۲ تا ۳٫۵ میکرومتر. طول از حد آبه (حدود ۰٫۲ میکرومتر) بزرگ‌تر است، پس قابل تفکیک است؛ اما عرضش به حد تفکیک نزدیک می‌شود و جزئیات داخلی دیده نمی‌شود.",
    parts: buildParts(9977, 34, 0.05, 3.1, false),
  },
  {
    id: "epithelial-tissue",
    kind: "tissue",
    label: "بافت — پوشش سنگ‌فرشی ساده",
    typicalSizeUm: 25,
    sizeRangeUm: [20, 35],
    recommendedObjective: "40x",
    stain: "H&E — هسته بنفش-آبی، سیتوپلاسم صورتی",
    description:
      "سلول‌های چندلایهٔ فشرده روی هم با هستهٔ بیضی. ۲۰ تا ۳۵ میکرومتر. چیدمان منظم هسته‌ها و نبود فضای بین سلولی، بافت پیوسته را نشان می‌دهد.",
    parts: buildParts(5561, 38, 0.058, 1, false),
  },
  {
    id: "smooth-muscle",
    kind: "tissue",
    label: "بافت — ماهیچهٔ صاف (روده)",
    typicalSizeUm: 6,
    sizeRangeUm: [4, 10],
    recommendedObjective: "40x",
    stain: "H&E — سیتوپلاسم اسیدوفیلیک صورتی، هستهٔ کشیده",
    description:
      "الیاف کشیده و موازی با هستهٔ دراز و وسط‌قرارگرفته. ۴ تا ۱۰ میکرومتر. نبود نوارهای عرضی، آن را از ماهیچهٔ اسکلتی جدا می‌کند.",
    parts: buildParts(2207, 40, 0.052, 3.4, false),
  },
  {
    id: "adipose",
    kind: "tissue",
    label: "بافت — بافت چربی",
    typicalSizeUm: 90,
    sizeRangeUm: [60, 140],
    recommendedObjective: "10x",
    stain: "H&E — حفرهٔ خالی با حاشیهٔ نازک سیتوپلاسم",
    description:
      "سلول‌های بزرگ با یک قطرهٔ چربی که در آماده‌سازی حل شده و جای خالی گذاشته است. ۶۰ تا ۱۴۰ میکرومتر؛ الگوی بافتی شاخص آن «شبکه‌ای با حفره» است.",
    parts: buildParts(7703, 20, 0.1, 1, false),
  },
];

export function specimenById(id: string): Specimen | null {
  return SPECIMENS.find((s) => s.id === id) ?? null;
}

// ── Measurement ─────────────────────────────────────────────────────────────

export interface Measurement {
  id: string;
  label: string;
  /** Measured length in µm — the tool asks the student for this. */
  valueUm: number;
  hint: string;
}

/**
 * Ground-truth measurement for a specimen. The value is the specimen's declared
 * typical size, so a ruler dragged over the drawn object is compared against a
 * number that the tool actually published — never a number invented afterwards.
 */
export function groundTruth(specimen: Specimen): Measurement {
  if (specimen.kind === "bacteria") {
    const rod = specimen.parts.some((p) => p.aspect > 1.5);
    return {
      id: "length",
      label: rod ? "طول بدنه" : "قطر بدنه",
      valueUm: specimen.typicalSizeUm,
      hint: rod
        ? "در باسیل، طول انتها به انتها اندازه‌گیری می‌شود."
        : "در کوکوس، اندازه‌گیری روی قطر انجام می‌شود نه روی طول کشیده.",
    };
  }
  return {
    id: "diameter",
    label: "قطر یا عرض سلول",
    valueUm: specimen.typicalSizeUm,
    hint: "دو لبهٔ مقابل هم را روی خط‌کش میکروسکوپ اندازه بگیرید.",
  };
}

/**
 * Is a feature of this size resolvable at the current optics?
 * This is the teaching point of the whole tool: below the Abbe limit the feature
 * cannot be seen no matter how hard you try.
 */
export interface ResolutionCheck {
  featureUm: number;
  resolvable: boolean;
  /** How many resolution units the feature spans. 1.0 = exactly at the limit. */
  multiples: number;
  verdict: "resolvable" | "marginal" | "below-limit";
  message: string;
}

export function checkResolution(featureUm: number, optics: OpticsResult): ResolutionCheck {
  const multiples = featureUm / optics.resolutionUm;
  let verdict: ResolutionCheck["verdict"];
  let message: string;
  if (multiples < 1) {
    verdict = "below-limit";
    message = `این ساختار از حد تفکیک ${optics.resolutionUm.toFixed(2)} میکرومتر کوچک‌تر است (${multiples.toFixed(2)}× حد). با هیچ بزرگ‌نماییِ این عدسی دیده نمی‌شود.`;
  } else if (multiples < 2) {
    verdict = "marginal";
    message = `این ساختار فقط ${multiples.toFixed(2)}× حد تفکیک است؛ مرزی دیده می‌شود و جزئیاتش قابل اتکا نیست.`;
  } else {
    verdict = "resolvable";
    message = `این ساختار ${multiples.toFixed(2)}× حد تفکیک است؛ با فاصلهٔ گذار ${Math.floor(multiples)} برابر، قابل تفکیک است.`;
  }
  return { featureUm, resolvable: multiples >= 1, multiples, verdict, message };
}

/** Persian digit conversion, matching the rest of the lab. */
export function faNum(value: number, digits = 0): string {
  return value
    .toFixed(digits)
    .replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
