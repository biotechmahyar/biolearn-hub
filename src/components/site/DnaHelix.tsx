import { useEffect, useRef } from "react";

/**
 * Particle DNA helix for the auth brand panel.
 *
 * The reference look is a helix built out of thousands of tiny glowing dots
 * rather than solid strokes, so this is drawn on a canvas: every particle is
 * placed on one of the two sine strands (with a little band jitter so the
 * strand reads as a ribbon), rides upward at a constant speed, and twinkles.
 * Constant upward travel is what reads as a slow, endless rotation of the
 * helix — no visible loop point.
 */

type Particle = {
  band: 0 | 1;
  /** normalised start position along the visible strand */
  s0: number;
  jx: number;
  jy: number;
  r: number;
  tw: number;
  twSpeed: number;
  bright: boolean;
};

const PERIOD = 430; // px of one full turn
const PARTICLES = 900;
const RUNG_STEP = 30;

// Deterministic pseudo-random so the helix does not reshuffle on re-render.
function rand(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function makeDotSprite(color: string, soft: string) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, color);
  grad.addColorStop(0.25, color);
  grad.addColorStop(0.55, soft);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

export default function DnaHelix({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const spriteCool = makeDotSprite("rgba(186,242,255,0.95)", "rgba(56,189,248,0.35)");
    const spriteBright = makeDotSprite("rgba(240,253,255,1)", "rgba(125,211,252,0.45)");

    let w = 0;
    let h = 0;
    let amp = 140;
    let cx = 0;
    let particles: Particle[] = [];
    let bokeh: { x: number; y: number; r: number; a: number; d: number }[] = [];

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      cx = w / 2;
      amp = Math.min(Math.max(w * 0.3, 90), 200);

      particles = Array.from({ length: PARTICLES }, (_, i) => {
        const bright = rand(i, 7) > 0.84;
        return {
          band: rand(i, 1) > 0.5 ? 1 : 0,
          s0: rand(i, 2),
          jx: (rand(i, 3) - 0.5) * 20,
          jy: (rand(i, 4) - 0.5) * 12,
          r: (bright ? 1.5 : 0.7) + rand(i, 5) * (bright ? 2.1 : 1.5),
          tw: rand(i, 6) * Math.PI * 2,
          twSpeed: 0.5 + rand(i, 8) * 1.5,
          bright,
        };
      });

      bokeh = Array.from({ length: 16 }, (_, i) => ({
        x: rand(i, 21) * w,
        y: rand(i, 22) * h,
        r: 22 + rand(i, 23) * 46,
        a: 0.03 + rand(i, 24) * 0.05,
        d: 4 + rand(i, 25) * 9,
      }));
    };

    build();

    const ro = new ResizeObserver(build);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    let scroll = 0;
    const SPEED = 18; // px/s — a full turn takes ~24s, calm and continuous

    const strandX = (y: number, band: 0 | 1) => {
      const a = (y / PERIOD) * Math.PI * 2;
      return cx + (band === 0 ? 1 : -1) * amp * Math.sin(a);
    };

    const drawSprite = (sprite: HTMLCanvasElement, x: number, y: number, r: number, alpha: number) => {
      const s = r * 4.2;
      ctx!.globalAlpha = alpha;
      ctx!.drawImage(sprite, x - s / 2, y - s / 2, s, s);
    };

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!reduceMotion) scroll += dt * SPEED;
      const t = now / 1000;

      ctx!.clearRect(0, 0, w, h);

      // soft out-of-focus depth
      ctx!.globalAlpha = 1;
      for (const b of bokeh) {
        if (!reduceMotion) {
          b.y -= b.d * dt;
          if (b.y < -b.r) {
            b.y = h + b.r;
            b.x = rand(Math.floor(t), 31) * w;
          }
        }
        const g = ctx!.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, `rgba(94,234,212,${b.a})`);
        g.addColorStop(1, "rgba(94,234,212,0)");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      const span = h + PERIOD * 2;

      // base pairs — dotted connectors between the two strands
      const offset = scroll % RUNG_STEP;
      for (let y = -offset; y < h + RUNG_STEP; y += RUNG_STEP) {
        const x1 = strandX(y, 0);
        const x2 = strandX(y, 1);
        const spread = Math.abs(x1 - x2) / (amp * 2);
        const alpha = (0.1 + spread * 0.4) * (0.7 + 0.3 * Math.sin(t + y * 0.01));
        const steps = 7;
        for (let s = 1; s < steps; s++) {
          const px = x1 + ((x2 - x1) * s) / steps;
          const py = y + (rand(Math.round(y), s) - 0.5) * 3;
          drawSprite(spriteCool, px, py, 0.75, alpha * (1 - s / steps) + alpha * 0.25);
        }
        // a faint binary digit drifting with the helix
        if (Math.round(y / RUNG_STEP) % 7 === 0) {
          const mx = (x1 + x2) / 2 + (rand(Math.round(y), 41) - 0.5) * 40;
          ctx!.globalAlpha = 0.16;
          ctx!.fillStyle = "#7dd3fc";
          ctx!.font = "10px ui-monospace, monospace";
          ctx!.textAlign = "center";
          ctx!.fillText(rand(Math.round(y), 42) > 0.5 ? "0" : "1", mx, y + 3.5);
        }
      }

      // the two strands
      for (const p of particles) {
        const y = ((p.s0 * span + scroll) % span) - PERIOD;
        if (y < -30 || y > h + 30) continue;
        const x = strandX(y, p.band) + p.jx + Math.sin(t * 0.6 + p.tw) * 1.5;
        const py = y + p.jy;
        // fade in/out at the top and bottom edges so nothing pops
        const edge = Math.min(1, (py + 30) / 90, (h - py + 30) / 90);
        const twinkle = 0.55 + 0.45 * Math.sin(t * p.twSpeed + p.tw);
        const alpha = Math.max(0, edge * twinkle * (p.bright ? 0.95 : 0.62));
        drawSprite(p.bright ? spriteBright : spriteCool, x, py, p.r, alpha);
      }

      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        background:
          "radial-gradient(60% 45% at 50% 40%, rgba(14,116,144,0.20) 0%, rgba(2,12,20,0) 70%), radial-gradient(45% 35% at 55% 75%, rgba(30,64,110,0.22) 0%, rgba(2,12,20,0) 70%)",
      }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
