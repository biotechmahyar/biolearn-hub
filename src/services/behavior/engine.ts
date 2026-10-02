/**
 * Genova Virtual Lab — behaviour simulation engine
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the *abstraction* the Drosophila lab is built around:
 *
 *     Stimulus ──► neural drive ──► behavioural state ──► movement
 *
 * Everything a fly does on screen is produced here, and **every number in this
 * file is a hand-picked UI parameter, not a measurement**. Nothing here is
 * calibrated against electrophysiology, connectomics or published kinematic
 * data, and the engine deliberately reports `biologicalBasis = null` so the UI
 * is forced to label the output SIMULATED rather than experimental.
 *
 * The point of the interface is replaceability: a future `NeuralCircuitModel`
 * or `PhysiologicalModel` implements the same three members and the viewer, the
 * experiment workspace and the report generator keep working unchanged.
 */

/** Stimuli a student can apply to the fly. */
export type StimulusKind = "none" | "light" | "odor" | "temperature" | "mechanical";

export interface BehaviorStimulus {
  kind: StimulusKind;
  /** 0…1 — a UI slider, explicitly not a calibrated physical intensity. */
  intensity: number;
}

/** Observable behavioural modes rendered on screen. */
export type BehaviorMode = "walk" | "stop" | "turn" | "explore" | "respond";

export const STIMULUS_LABEL: Record<StimulusKind, string> = {
  none: "بدون محرک",
  light: "نور",
  odor: "بو",
  temperature: "دما",
  mechanical: "مکانیکی",
};

export const MODE_LABEL: Record<BehaviorMode, string> = {
  walk: "راه رفتن",
  stop: "ایستادن",
  turn: "چرخش",
  explore: "کاوش محیط",
  respond: "پاسخ به محرک",
};

/**
 * Arena coordinates are normalised (0…1 on both axes) so the viewer can scale
 * the same simulation to any canvas size — including a phone.
 */
export interface BehaviorState {
  /** Simulated seconds since reset. */
  t: number;
  x: number;
  y: number;
  /** Radians, 0 = +x axis. */
  heading: number;
  /** Arena units per simulated second. */
  speed: number;
  mode: BehaviorMode;
  /** Total path length in arena units. */
  distance: number;
  /** Seconds left in the current mode. */
  modeFor: number;
  /** Direction the fly is currently biased towards while exploring. */
  exploreTarget: number;
}

export interface BehaviorEvent {
  /** Simulated time of the event. */
  at: number;
  kind: "mode" | "stimulus" | "boundary";
  message: string;
}

export interface BehaviorStep {
  state: BehaviorState;
  event?: BehaviorEvent;
}

/**
 * Optional multipliers handed to the engine. Produced by
 * `buildProfile()` in `profile.ts` from real Virtual Fly Brain readouts.
 * Omitting it (or passing `undefined`) reproduces the plain model exactly,
 * which is why the default keeps every Phase B behaviour test valid.
 */
export interface SimulationContext {
  driveGain: number;
  turnRate: number;
  respondGain: number;
}

export const DEFAULT_CONTEXT: SimulationContext = {
  driveGain: 1,
  turnRate: 1,
  respondGain: 1,
};

/**
 * The contract every future model implements. Keep it small on purpose: the UI
 * only needs to advance a state, and the experiment/report layers only need a
 * human-readable provenance string.
 */
export interface BehaviorEngine {
  readonly id: string;
  readonly label: string;
  readonly version: string;
  /** A citation when the model *is* grounded in published work, else null. */
  readonly biologicalBasis: string | null;
  initialState(): BehaviorState;
  step(
    state: BehaviorState,
    stimulus: BehaviorStimulus,
    dt: number,
    rng: () => number,
    context?: SimulationContext,
  ): BehaviorStep;
}

// ── Tunables (all arbitrary) ────────────────────────────────────────────────

const WALK_SPEED = 0.055;
const STOP_MIN = 0.4;
const STOP_MAX = 1.6;
const TURN_MIN = 0.25;
const TURN_MAX = 0.9;
const EXPLORE_MIN = 1.5;
const EXPLORE_MAX = 4;
const RESPOND_MIN = 0.5;
const RESPOND_MAX = 1.8;
const WALK_NOISE = 0.5;
const EXPLORE_NOISE = 1.6;
const TURN_RATE = 1.9;
const MARGIN = 0.08;
/** How strongly a stimulus raises the chance of switching into `respond`. */
const RESPOND_GAIN = 0.9;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Uniform value in [min, max) from the supplied generator. */
function between(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/**
 * Heuristic stimulus → "neural drive". This mirrors the shape of the pipeline
 * the lab wants (stimulus → drive → movement) without pretending to model real
 * Drosophila neurons: the mapping is a monotonic function of slider intensity.
 */
export interface NeuralDrive {
  /** Multiplier applied to walking speed. */
  driveGain: number;
  /** Extra turn rate (rad/s) added while responding. */
  turnBoost: number;
  /** Probability per second of entering the `respond` mode. */
  respondProbability: number;
}

export function deriveDrive(stimulus: BehaviorStimulus): NeuralDrive {
  const i = clamp(stimulus.intensity, 0, 1);
  switch (stimulus.kind) {
    case "light":
      // Phototaxis bias is modelled only as "orientation changes".
      return { driveGain: 1 + 0.15 * i, turnBoost: 1.1 * i, respondProbability: RESPOND_GAIN * i };
    case "odor":
      // Odours are modelled as a directional bias plus a burst of walking.
      return { driveGain: 1 + 0.35 * i, turnBoost: 1.6 * i, respondProbability: RESPOND_GAIN * i };
    case "temperature":
      // Heat is modelled as increased turning and brief stops.
      return { driveGain: 1 - 0.2 * i, turnBoost: 2.2 * i, respondProbability: RESPOND_GAIN * i };
    case "mechanical":
      // A touch is modelled as an immediate stop, then re-orientation.
      return { driveGain: 0.15, turnBoost: 2.6 * i, respondProbability: 1.6 * i };
    case "none":
    default:
      return { driveGain: 1, turnBoost: 0, respondProbability: 0 };
  }
}

function pickMode(mode: BehaviorMode, rng: () => number): { mode: BehaviorMode; for: number } {
  const r = rng();
  switch (mode) {
    case "walk":
      if (r < 0.32) return { mode: "stop", for: between(rng, STOP_MIN, STOP_MAX) };
      if (r < 0.52) return { mode: "turn", for: between(rng, TURN_MIN, TURN_MAX) };
      if (r < 0.68) return { mode: "explore", for: between(rng, EXPLORE_MIN, EXPLORE_MAX) };
      return { mode: "walk", for: between(rng, 0.8, 2.6) };
    case "stop":
      return r < 0.55
        ? { mode: "walk", for: between(rng, 0.8, 2.6) }
        : { mode: "explore", for: between(rng, EXPLORE_MIN, EXPLORE_MAX) };
    case "turn":
      return r < 0.6
        ? { mode: "walk", for: between(rng, 0.8, 2.6) }
        : { mode: "explore", for: between(rng, EXPLORE_MIN, EXPLORE_MAX) };
    case "explore":
      return r < 0.45
        ? { mode: "walk", for: between(rng, 0.8, 2.6) }
        : { mode: "stop", for: between(rng, STOP_MIN, STOP_MAX) };
    case "respond":
    default:
      return { mode: "walk", for: between(rng, 0.8, 2.6) };
  }
}

/**
 * Version 1 model: a transparent random-walk with stimulus-elicited
 * re-orientation. Deliberately simple so a student can read the rule and argue
 * with it — which is the point of a teaching lab.
 */
export const SimpleLocomotionEngine: BehaviorEngine = {
  id: "simple-locomotion-v1",
  label: "مدل راه‌رفتن ساده (نسخهٔ ۱)",
  version: "1.0.0",
  biologicalBasis: null,

  initialState(): BehaviorState {
    return {
      t: 0,
      x: 0.5,
      y: 0.5,
      heading: 0,
      speed: 0,
      mode: "walk",
      distance: 0,
      modeFor: 1.5,
      exploreTarget: 0,
    };
  },

  step(state, stimulus, dt, rng, context): BehaviorStep {
    const step = Math.min(dt, 0.05); // never integrate a huge frame
    const ctx = context ?? DEFAULT_CONTEXT;
    const baseDrive = deriveDrive(stimulus);
    // A profile scales the drive; with the default context this is identical to
    // `baseDrive`, so behaviour without an anchor is unchanged.
    const drive: NeuralDrive = {
      driveGain: baseDrive.driveGain * ctx.driveGain,
      turnBoost: baseDrive.turnBoost * ctx.turnRate,
      respondProbability: baseDrive.respondProbability * ctx.respondGain,
    };
    let { x, y, heading, mode, modeFor, exploreTarget, speed } = state;
    const t = state.t + step;
    let event: BehaviorEvent | undefined;
    let distance = state.distance;

    // 1. Stimulus → respond (probability per second, bounded by the step).
    if (drive.respondProbability > 0 && rng() < drive.respondProbability * step) {
      mode = "respond";
      modeFor = between(rng, RESPOND_MIN, RESPOND_MAX);
      heading += between(rng, -1, 1) * (0.6 + drive.turnBoost);
      event = {
        at: t,
        kind: "stimulus",
        message: `پاسخ به محرک «${STIMULUS_LABEL[stimulus.kind]}» با شدت ${Math.round(
          clamp(stimulus.intensity, 0, 1) * 100,
        )}٪`,
      };
    }

    // 2. Mode timer.
    modeFor -= step;
    if (modeFor <= 0) {
      const next = pickMode(mode, rng);
      if (next.mode !== mode) {
        event = event ?? { at: t, kind: "mode", message: `تغییر رفتار: ${MODE_LABEL[next.mode]}` };
      }
      mode = next.mode;
      modeFor = next.for;
      if (mode === "explore") exploreTarget = heading + between(rng, -2, 2);
    }

    // 3. Rotation.
    if (mode === "turn") {
      const sign = rng() < 0.5 ? -1 : 1;
      heading += sign * TURN_RATE * ctx.turnRate * step;
    } else if (mode === "respond") {
      heading += (rng() - 0.5) * (drive.turnBoost + 0.6) * step * 2;
    } else if (mode === "explore") {
      // Steer back towards the drifting exploration target.
      let diff = exploreTarget - heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      heading += diff * step * 1.4 + (rng() - 0.5) * EXPLORE_NOISE * step;
    } else if (mode === "walk") {
      heading += (rng() - 0.5) * WALK_NOISE * step;
    }

    // 4. Forward motion.
    speed = mode === "stop" ? 0 : WALK_SPEED * drive.driveGain * (mode === "explore" ? 0.8 : 1);
    const nx = x + Math.cos(heading) * speed * step;
    const ny = y + Math.sin(heading) * speed * step;

    // 5. Arena boundary → turn back instead of leaving the dish.
    if (nx < MARGIN || nx > 1 - MARGIN || ny < MARGIN || ny > 1 - MARGIN) {
      heading += Math.PI * between(rng, 0.55, 0.95);
      event = event ?? { at: t, kind: "boundary", message: "برخورد با لبهٔ محیط — تغییر جهت" };
      x = clamp(nx, MARGIN, 1 - MARGIN);
      y = clamp(ny, MARGIN, 1 - MARGIN);
    } else {
      distance += Math.hypot(nx - x, ny - y);
      x = nx;
      y = ny;
    }

    return {
      state: { t, x, y, heading, speed, mode, distance, modeFor, exploreTarget },
      ...(event ? { event } : {}),
    };
  },
};

/**
 * Seeded generator (mulberry32) so a run is reproducible: the same seed always
 * replays the same trajectory, which is what makes a simulation reportable.
 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
