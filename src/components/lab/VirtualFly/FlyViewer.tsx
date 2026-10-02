/**
 * Genova Virtual Lab — Fly Viewer
 * ─────────────────────────────────────────────────────────────────────────────
 * A light 2D/2.5D stage where the student's virtual fly moves around a dish.
 *
 * READ THIS BEFORE CHANGING ANY NUMBER HERE
 * ───────────────────────────────────────────
 * Every trajectory on this canvas comes from `SimpleLocomotionEngine`, a
 * hand-tuned random-walk. It is **not** a model of a real Drosophila nervous
 * system, it is not calibrated against any published kinematic or
 * electrophysiological dataset, and `biologicalBasis` is `null` by design so the
 * UI can never present it as biology. The panel is permanently labelled
 * SIMULATION and every readout is labelled "computed by Genova".
 *
 * Rendering is a single `requestAnimationFrame` loop writing straight to a
 * canvas; React state is only refreshed a few times per second for the
 * telemetry panel, so the frame rate does not depend on the React tree.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gauge, Pause, Play, RotateCcw, SlidersHorizontal, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { faNum, formatJalaliDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CONTEXT,
  MODE_LABEL,
  STIMULUS_LABEL,
  SimpleLocomotionEngine,
  createRng,
  type BehaviorEvent,
  type BehaviorState,
  type SimulationContext,
  type StimulusKind,
} from "@/services/behavior/engine";
import { defaultProfile, type SimulationProfile } from "@/services/behavior/profile";
import { DataKindBadge } from "./dataKind";
import type { FlyRow } from "./types";

const SPEEDS = [0.5, 1, 2, 4] as const;
const TRAIL_MAX = 140;
const EVENT_MAX = 6;
/** Telemetry is pushed into React ~5×/s; the canvas itself runs at 60fps. */
const TELEMETRY_MS = 200;

type Camera = "top" | "side";

interface Telemetry {
  t: number;
  x: number;
  y: number;
  headingDeg: number;
  speed: number;
  mode: BehaviorState["mode"];
  distance: number;
}

const ZERO_TELEMETRY: Telemetry = {
  t: 0,
  x: 0.5,
  y: 0.5,
  headingDeg: 0,
  speed: 0,
  mode: "walk",
  distance: 0,
};

// ── Canvas painting (no React involved) ─────────────────────────────────────

function paintFly(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  heading: number,
  flap: number,
  size: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(heading);

  // Wings (drawn first so they sit behind the body).
  ctx.fillStyle = "rgba(226, 232, 240, 0.75)";
  const flapSpread = 0.55 + 0.45 * Math.abs(Math.sin(flap));
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.rotate(side * (0.5 + flapSpread * 0.6));
    ctx.beginPath();
    ctx.ellipse(size * 0.15, side * size * 0.75, size * 0.95, size * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Legs.
  ctx.strokeStyle = "rgba(15, 23, 42, 0.55)";
  ctx.lineWidth = Math.max(1, size * 0.07);
  for (let i = -1; i <= 1; i++) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(i * size * 0.22, side * size * 0.22);
      ctx.lineTo(i * size * 0.3, side * size * 0.62);
      ctx.stroke();
    }
  }

  // Body + head.
  ctx.fillStyle = "#1f2937";
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.85, size * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(size * 0.72, 0, size * 0.33, 0, Math.PI * 2);
  ctx.fill();

  // Red eyes — the one recognisable feature of the animal.
  ctx.fillStyle = "#dc2626";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(size * 0.8, side * size * 0.17, size * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawArena(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  camera: Camera,
  trail: { x: number; y: number }[],
  state: BehaviorState,
  seed: number,
) {
  ctx.clearRect(0, 0, w, h);

  if (camera === "top") {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h));
    grad.addColorStop(0, "#f8fafc");
    grad.addColorStop(1, "#e2e8f0");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // A few landmarks so "explore" has something to explore around.
    ctx.fillStyle = "rgba(148, 163, 184, 0.35)";
    for (let i = 0; i < 5; i++) {
      const a = ((seed % 97) / 97) * Math.PI * 2 + (i * Math.PI * 2) / 5;
      const r = Math.min(w, h) * (0.24 + ((i * 37) % 11) / 100);
      ctx.beginPath();
      ctx.arc(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r, Math.min(w, h) * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(100, 116, 139, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();

    // Trail.
    if (trail.length > 1) {
      ctx.strokeStyle = "rgba(5, 150, 105, 0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      trail.forEach((p, i) => {
        const px = p.x * w;
        const py = p.y * h;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    paintFly(ctx, state.x * w, state.y * h, state.heading, state.t * 22, Math.max(9, Math.min(w, h) * 0.07));
    return;
  }

  // Side profile: x is horizontal, y becomes height above the substrate.
  const floor = h - Math.max(18, h * 0.12);
  const sky = ctx.createLinearGradient(0, 0, 0, floor);
  sky.addColorStop(0, "#f8fafc");
  sky.addColorStop(1, "#ecfdf5");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, floor);
  ctx.fillStyle = "#d6d3d1";
  ctx.fillRect(0, floor, w, h - floor);
  ctx.strokeStyle = "rgba(120, 113, 108, 0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, floor);
  ctx.lineTo(w, floor);
  ctx.stroke();

  if (trail.length > 1) {
    ctx.strokeStyle = "rgba(5, 150, 105, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    trail.forEach((p, i) => {
      const px = p.x * w;
      const py = floor - Math.sin(p.y * Math.PI) * floor * 0.35;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  const height = Math.sin(state.y * Math.PI) * floor * 0.35;
  paintFly(ctx, state.x * w, floor - height, 0, state.t * (state.speed > 0 ? 40 : 6), Math.max(10, h * 0.08));
}

// ── Model provenance ────────────────────────────────────────────────────────

/**
 * Shows, parameter by parameter, whether a value came from the Virtual Fly
 * Brain or from a hand-picked Genova constant. Without this panel an anchored
 * simulation would look exactly as trustworthy as the un-anchored one.
 */
function ModelProvenancePanel({ profile }: { profile?: SimulationProfile }) {
  const active = profile ?? defaultProfile();

  return (
    <div className="rounded-xl border border-emerald-900/5 bg-white px-3 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
          <SlidersHorizontal className="size-3.5 text-emerald-600" />
          ورودی‌های همین اجرا
        </p>
        <span
          dir="ltr"
          className="rounded-md bg-slate-50 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-500"
        >
          {active.id} / v{active.version}
        </span>
      </div>

      {active.parameters.length === 0 ? (
        <p className="text-[10.5px] leading-5 text-slate-500">{active.basis}</p>
      ) : (
        <ul className="space-y-1.5">
          {active.parameters.map((p) => (
            <li
              key={p.key}
              className="rounded-lg bg-slate-50 px-2.5 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[11px] text-slate-600">{p.label}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <DataKindBadge kind={p.origin === "real" ? "real" : "simulation"} />
                  <span dir="ltr" className="font-mono text-[11px] font-bold text-slate-700">
                    {p.value}
                  </span>
                </span>
              </div>
              {p.source && (
                <p className="mt-1 text-[9.5px] leading-4 text-slate-500">
                  <span dir="ltr" className="font-mono">{p.source.vfbId}</span> ·{" "}
                  <span dir="ltr">{p.source.source}</span> · خوانش{" "}
                  {formatJalaliDate(p.source.accessedAt)}
                </p>
              )}
              {p.note && <p className="mt-1 text-[9.5px] leading-4 text-slate-500">{p.note}</p>}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-[10px] leading-5 text-slate-500">{active.basis}</p>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export function FlyViewer({
  fly,
  stimulus,
  locked,
  profile,
}: {
  fly: FlyRow;
  /** When set, the stimulus comes from an experiment and the controls lock. */
  stimulus?: { kind: StimulusKind; intensity: number };
  locked?: boolean;
  /**
   * Phase E: multipliers derived from the experiment's real VFB readouts.
   * Omitted ⇒ the plain Phase B model, unchanged.
   */
  profile?: SimulationProfile;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<BehaviorState>(SimpleLocomotionEngine.initialState());
  const rngRef = useRef<() => number>(createRng(1));
  const seedRef = useRef(1);
  const [seed, setSeed] = useState(1);
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const runningRef = useRef(false);
  const speedRef = useRef(1);
  const cameraRef = useRef<Camera>("top");
  const stimRef = useRef<{ kind: StimulusKind; intensity: number }>({ kind: "none", intensity: 0.5 });

  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [camera, setCamera] = useState<Camera>("top");
  const [stimulusKind, setStimulusKind] = useState<StimulusKind>("none");
  const [intensity, setIntensity] = useState(0.5);
  const [telemetry, setTelemetry] = useState<Telemetry>(ZERO_TELEMETRY);
  const [events, setEvents] = useState<BehaviorEvent[]>([]);

  // Control values live in refs so the animation loop never restarts when the
  // student nudges a slider.
  const syncControls = useCallback((next: Partial<{
    speed: number; camera: Camera; stimulus: StimulusKind; intensity: number;
  }>) => {
    if (next.speed !== undefined) speedRef.current = next.speed;
    if (next.camera !== undefined) cameraRef.current = next.camera;
    if (next.stimulus !== undefined) stimRef.current = { ...stimRef.current, kind: next.stimulus };
    if (next.intensity !== undefined) stimRef.current = { ...stimRef.current, intensity: next.intensity };
  }, []);

  const setAll = useCallback((next: Partial<{
    speed: number; camera: Camera; stimulus: StimulusKind; intensity: number;
  }>) => {
    if (next.speed !== undefined) setSpeed(next.speed);
    if (next.camera !== undefined) setCamera(next.camera);
    if (next.stimulus !== undefined) setStimulusKind(next.stimulus);
    if (next.intensity !== undefined) setIntensity(next.intensity);
    syncControls(next);
  }, [syncControls]);

  // Experiment-driven stimulus: when an experiment is running, the experiment
  // owns the stimulus. The display value is derived during render (no state
  // mirroring, no ref writes during render) and the animation loop's ref is
  // synced from the prop inside an effect.
  const effKind = stimulus ? stimulus.kind : stimulusKind;
  const effIntensity = stimulus ? stimulus.intensity : intensity;
  useEffect(() => {
    if (stimulus) stimRef.current = { kind: stimulus.kind, intensity: stimulus.intensity };
  }, [stimulus]);

  // The animation loop is mounted once and reads the scales through this ref,
  // so changing the profile never restarts the loop mid-run.
  const contextRef = useRef<SimulationContext>(DEFAULT_CONTEXT);
  const context = useMemo<SimulationContext>(
    () =>
      profile
        ? {
            driveGain: profile.scales.driveGain,
            turnRate: profile.scales.turnRate,
            respondGain: profile.scales.respondGain,
          }
        : DEFAULT_CONTEXT,
    [profile],
  );
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const reset = useCallback(() => {
    const next = (seedRef.current % 9999) + 1;
    seedRef.current = next;
    setSeed(next);
    stateRef.current = SimpleLocomotionEngine.initialState();
    rngRef.current = createRng(next);
    trailRef.current = [];
    setTelemetry(ZERO_TELEMETRY);
    setEvents([]);
  }, []);

  // The single animation loop.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let lastTelemetry = 0;

    const loop = (now: number) => {
      const dtRaw = (now - last) / 1000;
      last = now;

      if (runningRef.current) {
        const dt = Math.min(dtRaw, 0.1) * speedRef.current;
        const step = SimpleLocomotionEngine.step(
            stateRef.current,
            stimRef.current,
            dt,
            rngRef.current,
            contextRef.current,
          );
        stateRef.current = step.state;
        trailRef.current.push({ x: step.state.x, y: step.state.y });
        if (trailRef.current.length > TRAIL_MAX) trailRef.current.shift();
        if (step.event) {
          setEvents((prev) => [step.event as BehaviorEvent, ...prev].slice(0, EVENT_MAX));
        }
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
          }
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawArena(ctx, w, h, cameraRef.current, trailRef.current, stateRef.current, seedRef.current);
        }
      }

      if (now - lastTelemetry > TELEMETRY_MS) {
        lastTelemetry = now;
        const s = stateRef.current;
        setTelemetry({
          t: s.t,
          x: s.x,
          y: s.y,
          headingDeg: ((((s.heading * 180) / Math.PI) % 360) + 360) % 360,
          speed: s.speed,
          mode: s.mode,
          distance: s.distance,
        });
      }

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);

    // Pause while the tab is hidden — no point burning CPU on a background tab.
    const onVisibility = () => {
      if (document.hidden) runningRef.current = false;
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const toggleRun = useCallback(() => {
    runningRef.current = !runningRef.current;
    setRunning(runningRef.current);
  }, []);

  const readouts: { label: string; value: string; ltr?: boolean }[] = [
    { label: "زمان شبیه‌سازی", value: `${faNum(telemetry.t.toFixed(1))} ثانیه`, ltr: true },
    { label: "حالت رفتاری", value: MODE_LABEL[telemetry.mode] },
    { label: "سرعت", value: `${faNum(telemetry.speed.toFixed(3))} واحد/ثانیه`, ltr: true },
    { label: "زاویهٔ جهت", value: `${faNum(Math.round(telemetry.headingDeg))}°`, ltr: true },
    { label: "موقعیت", value: `${telemetry.x.toFixed(2)} / ${telemetry.y.toFixed(2)}`, ltr: true },
    { label: "مسافت پیموده", value: `${telemetry.distance.toFixed(2)} واحد`, ltr: true },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-slate-700">
          <Gauge className="size-3.5 text-emerald-600" />
          مشاهدهٔ مگس — رفتار شبیه‌سازی‌شده
        </p>
        <DataKindBadge kind="simulation" />
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-[10.5px] leading-5 text-amber-800">
        <strong>Simulated behavior.</strong> این حرکت خروجی یک مدل محاسباتی ساده در ژنوا است (
        <span dir="ltr" className="font-mono">{SimpleLocomotionEngine.id}</span> /
        <span dir="ltr" className="font-mono">v{SimpleLocomotionEngine.version}</span>)، نه رفتار ثبت‌شدهٔ یک مگس
        واقعی و نه دادهٔ تجربی. حرکت فقط یک خروجی بصری است و هیچ عددی از آن به‌عنوان نتیجه استخراج نمی‌شود.
      </p>

      {/* Phase E — what actually feeds the model, and what does not. */}
      <ModelProvenancePanel profile={profile} />

      {/* Stage */}
      <div className="overflow-hidden rounded-2xl border border-emerald-900/5 bg-white">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`نمای شبیه‌سازی‌شده از ${fly.name}`}
          className="h-[240px] w-full sm:h-[300px]"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-900/5 px-3 py-2">
          <p className="text-[10px] text-slate-400">
            seed ={" "}
            <span dir="ltr" className="font-mono text-slate-500">
              {seed}
            </span>{" "}
            · همان seed همان مسیر را بازپخش می‌کند
          </p>
          <div className="flex gap-1">
            {(["top", "side"] as Camera[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAll({ camera: c })}
                className={cn(
                  "rounded-lg px-2 py-1 text-[10.5px] font-semibold transition-colors",
                  camera === c ? "bg-emerald-700 text-white" : "bg-slate-50 text-slate-600 hover:bg-emerald-50",
                )}
              >
                {c === "top" ? "نمای بالا" : "نمای جانبی"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          onClick={toggleRun}
          className="h-9 gap-1.5 rounded-xl bg-emerald-700 px-3 text-[12px] text-white hover:bg-emerald-800"
        >
          {running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          {running ? "توقف" : "اجرا"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={reset}
          className="h-9 gap-1.5 rounded-xl border-emerald-900/10 bg-white text-[12px] text-slate-700 hover:border-emerald-300"
        >
          <RotateCcw className="size-3.5" />
          بازنشانی
        </Button>
        <div className="flex items-center gap-1 rounded-xl bg-slate-50 px-2 py-1">
          <span className="text-[10.5px] text-slate-500">سرعت</span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setAll({ speed: s })}
              className={cn(
                "rounded-md px-2 py-0.5 font-mono text-[10.5px] transition-colors",
                speed === s ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-emerald-50",
              )}
            >
              ×{s}
            </button>
          ))}
        </div>
      </div>

      {/* Stimulus */}
      <div className="rounded-xl border border-emerald-900/5 bg-slate-50 px-3 py-3">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
          <Zap className="size-3.5 text-amber-500" />
          محرک
        </p>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(STIMULUS_LABEL) as StimulusKind[]).map((k) => (
            <button
              key={k}
              type="button"
              disabled={locked}
              onClick={() => setAll({ stimulus: k })}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                effKind === k
                  ? "bg-emerald-700 text-white"
                  : "bg-white text-slate-600 ring-1 ring-emerald-900/10 hover:bg-emerald-50",
              )}
            >
              {STIMULUS_LABEL[k]}
            </button>
          ))}
        </div>
        <label className="mt-2.5 flex items-center gap-2">
          <span className="text-[10.5px] text-slate-500">شدت</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={effIntensity}
            disabled={locked}
            onChange={(e) => setAll({ intensity: Number(e.target.value) })}
            className="h-1.5 flex-1 accent-emerald-700 disabled:opacity-60"
            aria-label="شدت محرک"
          />
          <span dir="ltr" className="w-9 text-left font-mono text-[10.5px] text-slate-600">
            {effIntensity.toFixed(2)}
          </span>
        </label>
        {locked && (
          <p className="mt-2 rounded-lg bg-white px-2.5 py-1.5 text-[10.5px] leading-5 text-slate-500 ring-1 ring-emerald-900/10">
            محرک توسط آزمایش تعیین شده است. برای تغییر، مقادیر آزمایش را ویرایش کنید تا اعمال شود.
          </p>
        )}
        <p className="mt-1.5 text-[10px] leading-5 text-slate-500">
          نگاشت «محرک → درایو عصبی → حرکت» در این نسخه یک تقریب heuristics است و بر پایهٔ هیچ دادهٔ عصبی
          کالیبره نشده است.
        </p>
      </div>

      {/* Telemetry */}
      <div className="rounded-xl border border-emerald-900/5 bg-white px-3 py-3">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
          <Sparkles className="size-3.5 text-emerald-600" />
          خروجی محاسباتی ژنوا
        </p>
        <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {readouts.map((r) => (
            <div key={r.label} className="rounded-lg bg-slate-50 px-2.5 py-1.5">
              <dt className="text-[10px] text-slate-500">{r.label}</dt>
              <dd dir={r.ltr ? "ltr" : undefined} className="mt-0.5 text-left text-[11.5px] font-semibold text-slate-700">
                {r.value}
              </dd>
            </div>
          ))}
        </dl>

        {events.length > 0 && (
          <div className="mt-2">
            <p className="mb-1 text-[10px] font-semibold text-slate-500">رویدادهای شبیه‌سازی</p>
            <ul className="space-y-0.5">
              {events.map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex items-baseline gap-2 text-[10.5px] text-slate-600">
                  <span dir="ltr" className="font-mono text-slate-400">
                    {e.at.toFixed(1)}s
                  </span>
                  <span>{e.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default FlyViewer;
