import { useMemo } from "react";
import { motion } from "framer-motion";

/**
 * Slowly rotating DNA double helix, drawn as SVG.
 *
 * One sine period is drawn as a group and repeated; the whole group is then
 * translated by exactly one period on a linear loop, so the motion is seamless
 * and reads as a gentle, endless rotation rather than a looping GIF.
 */
const PERIOD = 260; // px of one full turn
const AMPLITUDE = 52; // px of horizontal swing
const CX = 110; // centre line
const REPEATS = 4; // periods drawn to cover the viewport height
const STEP = 12; // sampling resolution of the strand curve

function point(y: number, phase: number) {
  return CX + AMPLITUDE * Math.sin(((y / PERIOD) * Math.PI * 2) + phase);
}

function strandPath(phase: number) {
  const pts: string[] = [];
  for (let y = 0; y <= PERIOD + STEP; y += STEP) {
    pts.push(`${point(y, phase).toFixed(2)},${y}`);
  }
  return `M ${pts.join(" L ")}`;
}

export default function DnaHelix({ className }: { className?: string }) {
  // Two anti-phase strands.
  const pathA = useMemo(() => strandPath(0), []);
  const pathB = useMemo(() => strandPath(Math.PI), []);

  // Base pairs (the "rungs"): spacing is even, the gap between the strands is
  // what makes the twist visible.
  const rungs = useMemo(() => {
    const out: { y: number; x1: number; x2: number }[] = [];
    for (let y = 0; y <= PERIOD; y += 22) {
      out.push({ y, x1: point(y, 0), x2: point(y, Math.PI) });
    }
    return out;
  }, []);

  return (
    <div className={className} aria-hidden="true">
      <svg
        viewBox={`0 0 220 ${PERIOD * REPEATS}`}
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="dnaA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5eead4" />
            <stop offset="50%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
          <linearGradient id="dnaB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a7f3d0" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id="dnaGlow" x="-40%" y="-10%" width="180%" height="120%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* The looped group: identical copies so the -PERIOD translation loops. */}
        <motion.g
          animate={{ y: [0, -PERIOD] }}
          transition={{ duration: 11, repeat: Infinity, ease: "linear" }}
          filter="url(#dnaGlow)"
        >
          {Array.from({ length: REPEATS + 1 }, (_, i) => (
            <g key={i} transform={`translate(0 ${i * PERIOD})`}>
              {/* base pairs */}
              {rungs.map((r, j) => {
                const spread = Math.abs(r.x1 - r.x2) / (AMPLITUDE * 2);
                return (
                  <line
                    key={j}
                    x1={r.x1}
                    y1={r.y}
                    x2={r.x2}
                    y2={r.y}
                    stroke="#99f6e4"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    opacity={0.15 + spread * 0.5}
                  />
                );
              })}
              <path d={pathA} fill="none" stroke="url(#dnaA)" strokeWidth={5} strokeLinecap="round" />
              <path d={pathB} fill="none" stroke="url(#dnaB)" strokeWidth={5} strokeLinecap="round" />
              {/* nodes riding on the strands */}
              {rungs.map((r, j) =>
                j % 2 === 0 ? (
                  <g key={`n${j}`}>
                    <circle cx={r.x1} cy={r.y} r={3.4} fill="#ccfbf1" opacity={0.85} />
                    <circle cx={r.x2} cy={r.y} r={3.4} fill="#d1fae5" opacity={0.85} />
                  </g>
                ) : null,
              )}
            </g>
          ))}
        </motion.g>

        {/* Drifting particles for depth */}
        {[
          { x: 34, y: 120, d: 26, delay: 0 },
          { x: 186, y: 240, d: 32, delay: 3 },
          { x: 70, y: 400, d: 22, delay: 6 },
          { x: 160, y: 520, d: 30, delay: 1.5 },
          { x: 48, y: 660, d: 24, delay: 8 },
          { x: 178, y: 760, d: 28, delay: 4.5 },
        ].map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={1.8}
            fill="#ccfbf1"
            animate={{ y: [p.y, p.y - 90], opacity: [0, 0.7, 0] }}
            transition={{ duration: p.d, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </svg>
    </div>
  );
}
