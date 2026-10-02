/**
 * Genova Virtual Lab — simulation profile (Phase E)
 * ─────────────────────────────────────────────────────────────────────────────
 * Until now the fly viewer ran on a fixed set of constants, so what you saw on
 * screen ignored everything you had configured. This module makes the
 * simulation *actually consume* the real data you recorded, without ever
 * pretending the result is biology.
 *
 * The separation this file exists to enforce:
 *
 *   REAL INPUT   numbers read verbatim from the Virtual Fly Brain and stored
 *                with a timestamp (Phase D observations) — e.g. the number of
 *                synaptic weights VFB reports for the chosen target.
 *
 *   MODEL MAPPING  how Genova turns that number into a movement gain. These
 *                constants are hand-picked. There is no published calibration
 *                behind them and none is claimed.
 *
 *   OUTPUT      movement on a canvas. Always badged SIMULATION.
 *
 * Only *behaviour-relevant* readouts are allowed to influence movement:
 * connectivity evidence for the target. Ontology counts (synonyms, images,
 * descendants) are real but they say nothing about motor output, so using them
 * as a drive would be nonsense dressed up as science. When no such readout
 * exists the profile falls back to the plain defaults and says so.
 */
import type { BehaviorStimulus, NeuralDrive } from "./engine";

export type ParamOrigin = "real" | "model";

export interface ProfileParameter {
  key: string;
  label: string;
  value: number;
  origin: ParamOrigin;
  /** Present when `origin === "real"`. */
  source?: {
    vfbId: string;
    source: string;
    accessedAt: number;
    /** Which measurement of the stored observation this came from. */
    measuredAs: string;
  };
  /** Present when `origin === "model"`. */
  note?: string;
}

export interface SimulationProfile {
  id: string;
  label: string;
  version: string;
  /** Always null: no published model backs this mapping. */
  biologicalBasis: null;
  /**
   * Multipliers handed to the engine. `1` means "exactly the default model",
   * so a profile built from nothing behaves identically to Phase B.
   */
  scales: {
    driveGain: number;
    turnRate: number;
    respondGain: number;
  };
  parameters: ProfileParameter[];
  /** Short Persian explanation shown under the panel. */
  basis: string;
  /** True when at least one real measurement drove the scales. */
  anchored: boolean;
}

/** One real measurement as stored by Phase D. */
export interface RealMeasurement {
  key: string;
  label: string;
  value: number;
  entityId: string;
  source: string;
  accessedAt: number;
}

export interface ProfileInput {
  /** The fly's brain anchor, shown as context. */
  anchor?: { vfbId: string; label: string } | null;
  /** The experiment's neural target, shown as context. */
  target?: { vfbId: string; label: string } | null;
  /** Real VFB measurements recorded under this experiment. */
  real: RealMeasurement[];
}

/** The stored-observation shape Phase D produces (subset we care about). */
export interface StoredObservation {
  evidence?: {
    entityId: string;
    source: string;
    accessedAt: number;
    measurements: { key: string; label: string; value: number }[];
  } | null;
}

/**
 * Flatten stored observations into the latest value seen per measurement key.
 * Later observations win, because a newer readout supersedes an older one for
 * the same quantity — and the access time travels with the value.
 */
export function toRealMeasurements(observations: StoredObservation[]): RealMeasurement[] {
  const latest = new Map<string, RealMeasurement>();
  for (const obs of observations) {
    const evidence = obs.evidence;
    if (!evidence) continue;
    for (const m of evidence.measurements) {
      if (!Number.isFinite(m.value)) continue;
      latest.set(m.key, {
        key: m.key,
        label: m.label,
        value: m.value,
        entityId: evidence.entityId,
        source: evidence.source,
        accessedAt: evidence.accessedAt,
      });
    }
  }
  return [...latest.values()];
}

// ── Model constants (declared, not calibrated) ─────────────────────────────

/**
 * Reference window for "how much synaptic weight counts as a lot". These two
 * numbers are Genova's own choice to make the slider meaningful; they are not
 * thresholds from any dataset.
 */
const WEIGHT_LOW = 100;
const WEIGHT_HIGH = 100_000;
const WEIGHT_SPAN = Math.log10(WEIGHT_HIGH) - Math.log10(WEIGHT_LOW);

/** Upper bound on how much a real readout may change the model. */
const MAX_DRIVE_SCALE = 1.6;
const MIN_DRIVE_SCALE = 0.7;

/** A readout has to be at least this many edges to count as motor evidence. */
const MIN_EDGES = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normaliseLog(value: number): number {
  if (!Number.isFinite(value) || value <= WEIGHT_LOW) return 0;
  const n = (Math.log10(value) - Math.log10(WEIGHT_LOW)) / WEIGHT_SPAN;
  return clamp(n, 0, 1);
}

/** The identity profile: exactly the Phase B model, no real input used. */
export function defaultProfile(): SimulationProfile {
  return {
    id: "default-v1",
    label: "مدل پیش‌فرض (بدون دادهٔ عصبی)",
    version: "1.0.0",
    biologicalBasis: null,
    scales: { driveGain: 1, turnRate: 1, respondGain: 1 },
    parameters: [],
    basis: "هیچ خوانش عصبی برای این هدف ثبت نشده است؛ مگس با همان ثابت‌های پیش‌فرض مدل اجرا می‌شود.",
    anchored: false,
  };
}

/**
 * Build the profile for one experiment.
 *
 * Deterministic: the same real measurements always give the same scales, so a
 * run stays reproducible and reportable.
 */
export function buildProfile(input: ProfileInput): SimulationProfile {
  const parameters: ProfileParameter[] = [];
  const edges = input.real.find((m) => m.key === "connections");
  const weights = input.real.find((m) => m.key === "synapseWeightSum");

  const usableEdges = edges && Number.isFinite(edges.value) && edges.value >= MIN_EDGES ? edges : null;

  if (usableEdges) {
    parameters.push({
      key: "connections",
      label: "یال‌های اتصال گزارش‌شده توسط VFB",
      value: usableEdges.value,
      origin: "real",
      source: {
        vfbId: usableEdges.entityId,
        source: usableEdges.source,
        accessedAt: usableEdges.accessedAt,
        measuredAs: usableEdges.label,
      },
    });
  }

  if (weights && Number.isFinite(weights.value) && weights.value > 0) {
    parameters.push({
      key: "synapseWeightSum",
      label: "مجموع وزن سیناپسی (همان‌طور که VFB گزارش کرد)",
      value: weights.value,
      origin: "real",
      source: {
        vfbId: weights.entityId,
        source: weights.source,
        accessedAt: weights.accessedAt,
        measuredAs: weights.label,
      },
    });
  }

  // No connectivity readout ⇒ no behavioural claim can be made from it.
  if (!usableEdges) {
    return {
      ...defaultProfile(),
      basis:
        input.target === null
          ? "این آزمایش هدف عصبی ندارد، پس هیچ دادهٔ عصبی برای تغذیهٔ مدل وجود ندارد."
          : "برای این هدف هیچ «خوانش اتصال» ثبت نشده است. یک خوانش VFB بگیرید تا شبیه‌سازی واقعاً از دادهٔ شما تغذیه شود.",
    };
  }

  // ── MODEL MAPPING ────────────────────────────────────────────────────────
  // More reported synaptic weight ⇒ higher drive gain. The shape of this
  // curve (log10, the reference window, the caps) is entirely Genova's.
  const norm = weights ? normaliseLog(weights.value) : 0.5;
  const driveGain = clamp(MIN_DRIVE_SCALE + (MAX_DRIVE_SCALE - MIN_DRIVE_SCALE) * norm, MIN_DRIVE_SCALE, MAX_DRIVE_SCALE);
  // Well-connected targets are modelled as turning more readily, with a much
  // smaller effect than the drive change.
  const turnRate = clamp(0.85 + 0.4 * norm, 0.85, 1.25);

  parameters.push(
    {
      key: "driveGain",
      label: "بهرهٔ سرعت راه‌رفتن",
      value: Number(driveGain.toFixed(3)),
      origin: "model",
      note: `نگاشت لگاریتمی وزن سیناپسی به سرعت؛ بازهٔ مرجع ${WEIGHT_LOW} تا ${WEIGHT_HIGH}. ثابت دستی ژنوا، بدون کالیبراسیون زیستی.`,
    },
    {
      key: "turnRate",
      label: "ضریب نرخ چرخش",
      value: Number(turnRate.toFixed(3)),
      origin: "model",
      note: "اثر درجه‌دوم روی نرخ چرخش؛ همان مرجعٔ بالا. ثابت دستی ژنوا.",
    },
  );

  return {
    id: "anchored-v1",
    label: "مدل لنگرگاه‌دار (بر پایهٔ خوانش VFB)",
    version: "1.0.0",
    biologicalBasis: null,
    scales: { driveGain, turnRate, respondGain: 1 },
    parameters,
    basis:
      "بهرهٔ حرکت از عدد واقعی VFB گرفته شده است؛ اینکه آن عدد چقدر به سرعت تبدیل شود، یک مدل دستی ژنوا با بازهٔ اعلام‌شده است و کالیبراسیون زیستی ندارد.",
    anchored: true,
  };
}

/** Apply a profile to a stimulus drive, producing the engine's drive. */
export function scaleDrive(drive: NeuralDrive, profile: SimulationProfile): NeuralDrive {
  return {
    driveGain: drive.driveGain * profile.scales.driveGain,
    turnBoost: drive.turnBoost * profile.scales.turnRate,
    respondProbability: drive.respondProbability * profile.scales.respondGain,
  };
}

/** Fold the stimulus into the scales so the UI can preview one number. */
export function previewEffectiveGain(
  stimulus: BehaviorStimulus,
  baseDrive: NeuralDrive,
  profile: SimulationProfile,
): number {
  const scaled = scaleDrive(baseDrive, profile);
  return Number((scaled.driveGain * scaled.turnBoost).toFixed(3));
}