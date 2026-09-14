import { useMemo, useEffect, useRef } from "react";
import { useParams, Link, useLocation } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Blocks,
  BookOpen,
  FileText,
  LayoutDashboard,
  Lock,
  ShoppingBag,
  Star,
  Calendar,
  AlertTriangle,
  Dna,
  Microscope,
  Zap,
  Brain,
  Heart,
  Leaf,
  Atom,
  TreePine,
  Shield,
  Cpu,
  Fish,
  Terminal,
  FileText as FileTextIcon,
  Network,
} from "lucide-react";

// ── Theme Helpers ──────────────────────────────────────────────────────────

type Theme = Record<string, string> | null | undefined;

function t(theme: Theme, key: string, fallback: string) {
  return (theme as Record<string, string>)?.[key] ?? fallback;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Demo Banner ────────────────────────────────────────────────────────────

function DemoBanner({ demoName }: { demoName: string }) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Blocks className="size-4 text-amber-500" />
        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
          DEMO PREVIEW — {demoName}
        </span>
        <Badge
          variant="outline"
          className="border-amber-500/30 text-[9px] text-amber-600 dark:text-amber-400"
        >
          فقط نمایش
        </Badge>
      </div>
      <Button
        asChild
        size="sm"
        variant="outline"
        className="h-6 gap-1 text-[10px]"
      >
        <Link to="/admin">
          <LayoutDashboard className="size-3" />
          بازگشت به پنل مدیریت
        </Link>
      </Button>
    </div>
  );
}

// ── Biology Animation Components ───────────────────────────────────────────

function DnaHelix({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
      <svg viewBox="0 0 200 600" className="absolute -left-20 h-full w-40 animate-[spin_20s_linear_infinite]">
        {[...Array(15)].map((_, i) => (
          <g key={i}>
            <circle cx={100 + Math.sin(i * 0.8) * 40} cy={i * 40 + 20} r={6} fill={color} opacity={0.6 + Math.sin(i) * 0.3}>
              <animate attributeName="r" values="4;8;4" dur={`${2 + i * 0.2}s`} repeatCount="indefinite" />
            </circle>
            <line x1={100 + Math.sin(i * 0.8) * 40} y1={i * 40 + 20} x2={100 - Math.sin(i * 0.8) * 40} y2={i * 40 + 20} stroke={color} strokeWidth={1.5} opacity={0.4} />
            <circle cx={100 - Math.sin(i * 0.8) * 40} cy={i * 40 + 20} r={6} fill={color} opacity={0.4 + Math.cos(i) * 0.3}>
              <animate attributeName="r" values="6;3;6" dur={`${2 + i * 0.2}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
      </svg>
      <svg viewBox="0 0 200 600" className="absolute -right-20 h-full w-40 animate-[spin_25s_linear_infinite_reverse]">
        {[...Array(15)].map((_, i) => (
          <g key={i}>
            <circle cx={100 + Math.cos(i * 0.8) * 40} cy={i * 40 + 20} r={5} fill={color} opacity={0.5}>
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur={`${1.5 + i * 0.15}s`} repeatCount="indefinite" />
            </circle>
            <line x1={100 + Math.cos(i * 0.8) * 40} y1={i * 40 + 20} x2={100 - Math.cos(i * 0.8) * 40} y2={i * 40 + 20} stroke={color} strokeWidth={1} opacity={0.3} />
          </g>
        ))}
      </svg>
    </div>
  );
}

function PetriDish({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-15">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-pulse rounded-full"
          style={{
            width: `${20 + Math.random() * 60}px`,
            height: `${20 + Math.random() * 60}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: color,
            opacity: 0.1 + Math.random() * 0.2,
            animation: `pulse ${2 + Math.random() * 3}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
            borderRadius: "50%",
          }}
        />
      ))}
      {/* Petri dish circles */}
      <svg viewBox="0 0 400 400" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30">
        <circle cx={200} cy={200} r={150} fill="none" stroke={color} strokeWidth={2} strokeDasharray="8 4">
          <animateTransform attributeName="transform" type="rotate" from="0 200 200" to="360 200 200" dur="30s" repeatCount="indefinite" />
        </circle>
        <circle cx={200} cy={200} r={120} fill="none" stroke={color} strokeWidth={1} strokeDasharray="4 8" opacity={0.5}>
          <animateTransform attributeName="transform" type="rotate" from="360 200 200" to="0 200 200" dur="25s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

function BioLuminescence({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${3 + Math.random() * 6}px`,
            height: `${3 + Math.random() * 6}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: color,
            opacity: 0,
            boxShadow: `0 0 ${8 + Math.random() * 15}px ${color}`,
            animation: `glow-float ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  );
}

function NeuralPulse({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
      <svg viewBox="0 0 800 600" className="h-full w-full">
        {/* Neural connections */}
        {[...Array(12)].map((_, i) => {
          const x1 = Math.random() * 800;
          const y1 = Math.random() * 600;
          const x2 = Math.random() * 800;
          const y2 = Math.random() * 600;
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={0.5} opacity={0.3} />
              <circle cx={x1} cy={y1} r={3} fill={color} opacity={0.6}>
                <animate attributeName="r" values="2;5;2" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
              </circle>
              <circle cx={x2} cy={y2} r={3} fill={color} opacity={0.4}>
                <animate attributeName="r" values="3;1;3" dur={`${1.8 + i * 0.3}s`} repeatCount="indefinite" />
              </circle>
              {/* Pulse traveling along the line */}
              <circle r={2} fill={color} opacity={0.8}>
                <animateMotion dur={`${2 + i * 0.5}s`} repeatCount="indefinite">
                  <mpath href={`#path-${i}`} />
                </animateMotion>
              </circle>
              <path id={`path-${i}`} d={`M${x1},${y1} L${x2},${y2}`} fill="none" />
            </g>
          );
        })}
        {/* Neuron cell bodies */}
        {[...Array(8)].map((_, i) => (
          <circle
            key={`n-${i}`}
            cx={100 + Math.random() * 600}
            cy={80 + Math.random() * 440}
            r={8}
            fill={color}
            opacity={0.5}
          >
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
    </div>
  );
}

function CellDivision({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-15">
      <svg viewBox="0 0 400 400" className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2">
        {/* Parent cell */}
        <ellipse cx={200} cy={200} rx={80} ry={80} fill="none" stroke={color} strokeWidth={2}>
          <animate attributeName="rx" values="80;80;40;40;80" dur="6s" repeatCount="indefinite" />
          <animate attributeName="ry" values="80;90;100;90;80" dur="6s" repeatCount="indefinite" />
        </ellipse>
        {/* Chromosomes */}
        {[...Array(4)].map((_, i) => (
          <line
            key={i}
            x1={190 + i * 5}
            y1={185}
            x2={190 + i * 5}
            y2={215}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          >
            <animate
              attributeName="x1"
              values={`${190 + i * 5};${185 + i * 10};${180 + i * 15};${185 + i * 10};${190 + i * 5}`}
              dur="6s"
              repeatCount="indefinite"
            />
          </line>
        ))}
        {/* Division pinching */}
        <line x1={200} y1={120} x2={200} y2={280} stroke={color} strokeWidth={1} strokeDasharray="4 4" opacity={0.4}>
          <animate attributeName="opacity" values="0;0.6;0" dur="6s" repeatCount="indefinite" />
        </line>
      </svg>
    </div>
  );
}

function EvolutionTree({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-15">
      <svg viewBox="0 0 400 600" className="absolute right-0 h-full w-1/2">
        {/* Tree trunk */}
        <path d="M200 600 Q200 400 180 300 Q170 250 150 200 Q140 170 130 140" fill="none" stroke={color} strokeWidth={3} opacity={0.4}>
          <animate attributeName="d" values="M200 600 Q200 400 180 300 Q170 250 150 200 Q140 170 130 140;M200 600 Q195 400 175 300 Q165 250 145 200 Q135 170 125 140;M200 600 Q200 400 180 300 Q170 250 150 200 Q140 170 130 140" dur="8s" repeatCount="indefinite" />
        </path>
        {/* Branches */}
        <path d="M180 300 Q130 280 90 250" fill="none" stroke={color} strokeWidth={2} opacity={0.3}>
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur="4s" repeatCount="indefinite" />
        </path>
        <path d="M175 280 Q220 250 260 230" fill="none" stroke={color} strokeWidth={2} opacity={0.3}>
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3.5s" repeatCount="indefinite" />
        </path>
        <path d="M160 230 Q120 200 80 180" fill="none" stroke={color} strokeWidth={1.5} opacity={0.25} />
        <path d="M150 210 Q180 180 220 160" fill="none" stroke={color} strokeWidth={1.5} opacity={0.25} />
        {/* Leaf nodes */}
        {[
          [90, 250], [260, 230], [80, 180], [220, 160], [130, 140],
          [100, 150], [250, 180], [170, 120],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={4} fill={color} opacity={0.4}>
            <animate attributeName="r" values="3;6;3" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
    </div>
  );
}

function Molecular({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-15">
      <svg viewBox="0 0 600 600" className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2">
        {/* Hexagonal molecular rings */}
        {[...Array(6)].map((_, ring) => {
          const cx = 300 + Math.cos((ring * Math.PI) / 3) * 120;
          const cy = 300 + Math.sin((ring * Math.PI) / 3) * 120;
          const points = [...Array(6)]
            .map((_, i) => {
              const angle = (i * Math.PI * 2) / 6 - Math.PI / 6;
              return `${cx + Math.cos(angle) * 30},${cy + Math.sin(angle) * 30}`;
            })
            .join(" ");
          return (
            <g key={ring}>
              <polygon points={points} fill="none" stroke={color} strokeWidth={1.5} opacity={0.4}>
                <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur={`${15 + ring * 2}s`} repeatCount="indefinite" />
              </polygon>
              <circle cx={cx} cy={cy} r={5} fill={color} opacity={0.6}>
                <animate attributeName="r" values="3;7;3" dur={`${2 + ring * 0.5}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}
        {/* Bonds connecting rings */}
        {[...Array(6)].map((_, i) => {
          const x1 = 300 + Math.cos((i * Math.PI) / 3) * 120;
          const y1 = 300 + Math.sin((i * Math.PI) / 3) * 120;
          const x2 = 300 + Math.cos(((i + 1) * Math.PI) / 3) * 120;
          const y2 = 300 + Math.sin(((i + 1) * Math.PI) / 3) * 120;
          return (
            <line key={`b-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1} opacity={0.25} />
          );
        })}
      </svg>
    </div>
  );
}

function EcoFlow({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-15">
      {/* Flowing particles like water/nutrients */}
      {[...Array(25)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            left: `${Math.random() * 100}%`,
            backgroundColor: color,
            animation: `flow-down ${4 + Math.random() * 3}s linear infinite`,
            animationDelay: `${Math.random() * 4}s`,
          }}
        />
      ))}
      {/* Leaf veins */}
      <svg viewBox="0 0 300 300" className="absolute -left-10 top-10 h-60 w-60 opacity-30">
        <path d="M150 280 Q150 200 140 150 Q135 120 130 90 Q128 70 125 50" fill="none" stroke={color} strokeWidth={2}>
          <animate attributeName="opacity" values="0.2;0.5;0.2" dur="4s" repeatCount="indefinite" />
        </path>
        {[60, 90, 120, 150, 180, 210].map((y, i) => (
          <path key={i} d={`M${145 - i * 2} ${y} Q${120 - i * 5} ${y - 10} ${100 - i * 8} ${y - 15}`} fill="none" stroke={color} strokeWidth={1} opacity={0.3} />
        ))}
      </svg>
    </div>
  );
}

function ImmuneBattle({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-15">
      <svg viewBox="0 0 800 600" className="h-full w-full">
        {/* Antibodies (Y shapes) */}
        {[...Array(6)].map((_, i) => {
          const x = 100 + Math.random() * 600;
          const y = 100 + Math.random() * 400;
          return (
            <g key={i} transform={`translate(${x},${y})`}>
              <line x1={0} y1={0} x2={0} y2={20} stroke={color} strokeWidth={2} />
              <line x1={0} y1={0} x2={-10} y2={-12} stroke={color} strokeWidth={2} />
              <line x1={0} y1={0} x2={10} y2={-12} stroke={color} strokeWidth={2} />
              <animateTransform attributeName="transform" type="translate" values={`${x},${y};${x + 10},${y - 5};${x},${y}`} dur={`${3 + i}s`} repeatCount="indefinite" />
            </g>
          );
        })}
        {/* Pathogen particles (spiky) */}
        {[...Array(4)].map((_, i) => {
          const cx = 200 + Math.random() * 400;
          const cy = 150 + Math.random() * 300;
          return (
            <g key={`p-${i}`}>
              <circle cx={cx} cy={cy} r={10} fill="none" stroke={color} strokeWidth={1.5}>
                <animate attributeName="r" values="8;12;8" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
              </circle>
              {[...Array(8)].map((_, s) => {
                const angle = (s * Math.PI * 2) / 8;
                return (
                  <line
                    key={s}
                    x1={cx + Math.cos(angle) * 10}
                    y1={cy + Math.sin(angle) * 10}
                    x2={cx + Math.cos(angle) * 18}
                    y2={cy + Math.sin(angle) * 18}
                    stroke={color}
                    strokeWidth={1}
                    opacity={0.5}
                  >
                    <animate attributeName="x2" values={`${cx + Math.cos(angle) * 14};${cx + Math.cos(angle) * 20};${cx + Math.cos(angle) * 14}`} dur={`${1.5 + i * 0.3}s`} repeatCount="indefinite" />
                    <animate attributeName="y2" values={`${cy + Math.sin(angle) * 14};${cy + Math.sin(angle) * 20};${cy + Math.sin(angle) * 14}`} dur={`${1.5 + i * 0.3}s`} repeatCount="indefinite" />
                  </line>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function CyberGlitch({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
      {/* Scan lines */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute h-px w-full"
          style={{
            top: `${10 + i * 12}%`,
            backgroundColor: color,
            opacity: 0.3,
            animation: `scan-line ${3 + i * 0.5}s linear infinite`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}
      {/* Glitch blocks */}
      {[...Array(5)].map((_, i) => (
        <div
          key={`g-${i}`}
          className="absolute"
          style={{
            width: `${50 + Math.random() * 150}px`,
            height: `${2 + Math.random() * 4}px`,
            left: `${Math.random() * 80}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: color,
            opacity: 0.15,
            animation: `glitch-flash ${1 + Math.random() * 2}s steps(2) infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
      {/* Binary/hex data streams */}
      <div className="absolute left-4 top-0 font-mono text-[10px] leading-4 opacity-20" style={{ color }}>
        {[...Array(30)].map((_, i) => (
          <div key={i}>
            {[...Array(20)].map((_, j) => (
              <span key={j} className="inline-block animate-pulse" style={{ animationDelay: `${(i + j) * 0.1}s` }}>
                {["A", "T", "C", "G", "0", "1"][Math.floor(Math.random() * 6)]}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function OceanWaves({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
      <svg viewBox="0 0 1200 400" className="absolute bottom-0 w-full">
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M0 ${200 + i * 40} Q300 ${170 + i * 40} 600 ${200 + i * 40} Q900 ${230 + i * 40} 1200 ${200 + i * 40} V400 H0 Z`}
            fill={color}
            opacity={0.1 - i * 0.025}
          >
            <animate
              attributeName="d"
              values={`M0 ${200 + i * 40} Q300 ${170 + i * 40} 600 ${200 + i * 40} Q900 ${230 + i * 40} 1200 ${200 + i * 40} V400 H0 Z;M0 ${200 + i * 40} Q300 ${230 + i * 40} 600 ${200 + i * 40} Q900 ${170 + i * 40} 1200 ${200 + i * 40} V400 H0 Z;M0 ${200 + i * 40} Q300 ${170 + i * 40} 600 ${200 + i * 40} Q900 ${230 + i * 40} 1200 ${200 + i * 40} V400 H0 Z`}
              dur={`${5 + i}s`}
              repeatCount="indefinite"
            />
          </path>
        ))}
        {/* Bubbles */}
        {[...Array(12)].map((_, i) => (
          <circle
            key={`b-${i}`}
            cx={100 + Math.random() * 1000}
            cy={350}
            r={2 + Math.random() * 4}
            fill="none"
            stroke={color}
            strokeWidth={1}
            opacity={0.3}
          >
            <animate attributeName="cy" values="400;50" dur={`${4 + Math.random() * 4}s`} repeatCount="indefinite" begin={`${Math.random() * 3}s`} />
            <animate attributeName="opacity" values="0.3;0.1;0" dur={`${4 + Math.random() * 4}s`} repeatCount="indefinite" begin={`${Math.random() * 3}s`} />
          </circle>
        ))}
      </svg>
    </div>
  );
}

function CodeRain({ color }: { color: string }) {
  const bases = ["A", "T", "C", "G", "U", "0", "1"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(20)].map((_, col) => (
        <div
          key={col}
          className="absolute top-0 font-mono text-xs leading-5"
          style={{
            left: `${col * 5}%`,
            color,
            opacity: 0.2 + Math.random() * 0.15,
            animation: `code-fall ${4 + Math.random() * 4}s linear infinite`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        >
          {[...Array(40)].map((_, row) => (
            <div
              key={row}
              className="animate-pulse"
              style={{
                animationDelay: `${(col + row) * 0.05}s`,
                opacity: 0.3 + Math.random() * 0.7,
              }}
            >
              {bases[Math.floor(Math.random() * bases.length)]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PaperReveal({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-10">
      {/* Grid lines like graph paper */}
      <div
        className="h-full w-full"
        style={{
          backgroundImage: `linear-gradient(${color}15 1px, transparent 1px), linear-gradient(90deg, ${color}15 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          animation: "paper-shift 20s linear infinite",
        }}
      />
      {/* DNA motif watermark */}
      <svg viewBox="0 0 200 200" className="absolute right-10 top-10 h-40 w-40 opacity-30">
        <circle cx={100} cy={100} r={80} fill="none" stroke={color} strokeWidth={0.5} />
        <circle cx={100} cy={100} r={60} fill="none" stroke={color} strokeWidth={0.5} />
        <line x1={20} y1={100} x2={180} y2={100} stroke={color} strokeWidth={0.5} />
        <line x1={100} y1={20} x2={100} y2={180} stroke={color} strokeWidth={0.5} />
      </svg>
    </div>
  );
}

function MyceliumNetwork({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-15">
      <svg viewBox="0 0 800 600" className="h-full w-full">
        {/* Mycelium threads */}
        {[...Array(20)].map((_, i) => {
          const startX = Math.random() * 800;
          const startY = Math.random() * 600;
          const midX = startX + (Math.random() - 0.5) * 200;
          const midY = startY + (Math.random() - 0.5) * 200;
          const endX = midX + (Math.random() - 0.5) * 150;
          const endY = midY + (Math.random() - 0.5) * 150;
          return (
            <path
              key={i}
              d={`M${startX},${startY} Q${midX},${midY} ${endX},${endY}`}
              fill="none"
              stroke={color}
              strokeWidth={0.8}
              opacity={0.3}
            >
              <animate attributeName="opacity" values="0.1;0.4;0.1" dur={`${3 + i * 0.3}s`} repeatCount="indefinite" />
            </path>
          );
        })}
        {/* Node points */}
        {[...Array(12)].map((_, i) => (
          <circle
            key={`n-${i}`}
            cx={80 + Math.random() * 640}
            cy={60 + Math.random() * 480}
            r={3}
            fill={color}
            opacity={0.4}
          >
            <animate attributeName="r" values="2;5;2" dur={`${2 + i * 0.2}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
    </div>
  );
}

/** Map animation name to its component */
function DemoAnimation({ animation, color }: { animation: string; color: string }) {
  switch (animation) {
    case "dna-helix":
      return <DnaHelix color={color} />;
    case "petri-dish":
      return <PetriDish color={color} />;
    case "bioluminescence":
      return <BioLuminescence color={color} />;
    case "neural-pulse":
      return <NeuralPulse color={color} />;
    case "cell-division":
      return <CellDivision color={color} />;
    case "evolution-tree":
      return <EvolutionTree color={color} />;
    case "molecular":
      return <Molecular color={color} />;
    case "eco-flow":
      return <EcoFlow color={color} />;
    case "immune-battle":
      return <ImmuneBattle color={color} />;
    case "cyber-glitch":
      return <CyberGlitch color={color} />;
    case "ocean-waves":
      return <OceanWaves color={color} />;
    case "code-rain":
      return <CodeRain color={color} />;
    case "paper-reveal":
      return <PaperReveal color={color} />;
    case "mycelium":
      return <MyceliumNetwork color={color} />;
    default:
      return <DnaHelix color={color} />;
  }
}

// Inject global keyframes for animations
const ANIMATION_CSS = `
@keyframes glow-float {
  0%, 100% { opacity: 0; transform: translateY(0) scale(1); }
  50% { opacity: 0.8; transform: translateY(-30px) scale(1.3); }
}
@keyframes scan-line {
  0% { transform: translateX(-100%); opacity: 0; }
  10% { opacity: 0.4; }
  90% { opacity: 0.4; }
  100% { transform: translateX(100vw); opacity: 0; }
}
@keyframes glitch-flash {
  0%, 40% { opacity: 0; }
  50% { opacity: 0.2; transform: translateX(2px); }
  60% { opacity: 0; }
  70% { opacity: 0.15; transform: translateX(-3px); }
  80%, 100% { opacity: 0; }
}
@keyframes code-fall {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}
@keyframes flow-down {
  0% { transform: translateY(-20px); opacity: 0; }
  10% { opacity: 0.6; }
  90% { opacity: 0.6; }
  100% { transform: translateY(100vh); opacity: 0; }
}
@keyframes paper-shift {
  0% { transform: translate(0, 0); }
  100% { transform: translate(40px, 40px); }
}
`;

// ── Navigation ─────────────────────────────────────────────────────────────

function DemoNav({
  slug,
  theme: th,
}: {
  slug: string;
  theme: Theme;
}) {
  const primary = t(th, "primary", "#14b8a6");
  const surface = t(th, "surface", "#111827");
  const text = t(th, "text", "#f9fafb");

  const navItems = [
    { label: "خانه", path: `/demo/${slug}` },
    { label: "دوره‌ها", path: `/demo/${slug}/courses` },
    { label: "مقالات", path: `/demo/${slug}/articles` },
    { label: "کارگاه‌ها", path: `/demo/${slug}/workshops` },
    { label: "محصولات", path: `/demo/${slug}/products` },
    { label: "مدرسان", path: `/demo/${slug}/instructors` },
    { label: "دیکشنری", path: `/demo/${slug}/dictionary` },
  ];

  return (
    <nav
      className="flex items-center gap-4 border-b px-6 py-3"
      style={{ backgroundColor: surface, borderColor: `${primary}20`, color: text }}
    >
      <Link to={`/demo/${slug}`} className="flex items-center gap-2 text-sm font-extrabold" style={{ color: primary }}>
        <Blocks className="size-4" />
        Genova Demo
      </Link>
      <div className="mr-auto flex gap-1 overflow-x-auto">
        {navItems.map((item) => (
          <Link key={item.path} to={item.path} className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors hover:bg-white/10">
            {item.label}
          </Link>
        ))}
      </div>
      <Link to={`/demo/${slug}/auth`} className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: primary }}>
        ورود
      </Link>
    </nav>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────

function DemoFooter({ slug, theme: th }: { slug: string; theme: Theme }) {
  const primary = t(th, "primary", "#14b8a6");
  const bg = t(th, "background", "#0b1120");
  const muted = t(th, "textMuted", "#9ca3af");

  return (
    <footer className="border-t px-6 py-8 text-center" style={{ backgroundColor: bg, borderColor: `${primary}20`, color: muted }}>
      <p className="text-xs">این یک نسخه آزمایشی (Demo) از سایت Genova است.</p>
      <p className="mt-1 text-[10px] opacity-50">DEMO PREVIEW • {slug}</p>
    </footer>
  );
}

// ── Themed Shell ───────────────────────────────────────────────────────────

function DemoShell({
  demo,
  children,
}: {
  demo: { name: string; slug: string; theme: Theme };
  children: React.ReactNode;
}) {
  const th = demo.theme;
  const bg = t(th, "background", "#0b1120");
  const surface = t(th, "surface", "#111827");
  const text = t(th, "text", "#f9fafb");
  const muted = t(th, "textMuted", "#9ca3af");
  const primary = t(th, "primary", "#14b8a6");
  const animation = t(th, "animation", "dna-helix");

  return (
    <div className="min-h-screen font-[Vazirmatn,system-ui,sans-serif]" style={{ backgroundColor: bg, color: text }}>
      <style>{ANIMATION_CSS}</style>
      <DemoBanner demoName={demo.name} />
      <DemoNav slug={demo.slug} theme={th} />
      <main className="relative">
        <DemoAnimation animation={animation} color={primary} />
        {children}
      </main>
      <DemoFooter slug={demo.slug} theme={th} />
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({ title, theme: th }: { title: string; theme: Theme }) {
  const primary = t(th, "primary", "#14b8a6");
  return (
    <div className="mb-6 text-center">
      <h2 className="text-lg font-extrabold">{title}</h2>
      <div className="mx-auto mt-2 h-1 w-16 rounded-full" style={{ backgroundColor: primary }} />
    </div>
  );
}

// ── Demo Page: Home ────────────────────────────────────────────────────────

function DemoHome({ demo }: { demo: { slug: string; theme: Theme; name: string } }) {
  const th = demo.theme;
  const categories = useQuery(api.content.listCategories);
  const courses = useQuery(api.content.listCourses, {});
  const articles = useQuery(api.content.listArticles, {});
  const workshops = useQuery(api.content.listWorkshops);

  const primary = t(th, "primary", "#14b8a6");
  const secondary = t(th, "secondary", "#0ea5e9");
  const surface = t(th, "surface", "#111827");
  const heroGradient = t(th, "heroGradient", "");
  const borderRadius = t(th, "borderRadius", "0.75rem");

  return (
    <div className="space-y-20 px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero */}
      <section
        className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl p-12 text-center sm:p-16"
        style={{ background: heroGradient || `linear-gradient(135deg, ${primary}15, ${secondary}10)` }}
      >
        <DemoAnimation animation={t(th, "animation", "dna-helix")} color={primary} />
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
            پلتفرم تخصصی علوم زیستی
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            Genova — اکوسیستم آموزشی برای دانشجویان علوم زیستی
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button className="gap-2 text-white" style={{ backgroundColor: primary, borderRadius }} asChild>
              <Link to={`/demo/${demo.slug}/courses`}>
                <BookOpen className="size-4" />
                مشاهده دوره‌ها
              </Link>
            </Button>
            <Button variant="outline" style={{ borderRadius }} asChild>
              <Link to={`/demo/${demo.slug}/auth`}>
                <Lock className="size-4 ml-1.5" />
                شروع یادگیری
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="mx-auto max-w-6xl">
          <SectionHeader title="دسته‌بندی‌های آموزشی" theme={th} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.slice(0, 8).map((cat: any) => (
              <Card key={cat._id} className="transition-all hover:scale-[1.02] hover:shadow-lg" style={{ backgroundColor: surface, borderColor: `${primary}20`, borderRadius }}>
                <CardContent className="flex flex-col items-center gap-2 py-5 text-center">
                  <span className="text-2xl">🧬</span>
                  <span className="text-xs font-bold">{cat.name}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Popular Courses */}
      {courses && courses.length > 0 && (
        <section className="mx-auto max-w-6xl">
          <SectionHeader title="دوره‌های محبوب" theme={th} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 6).map((c: any) => (
              <Link key={c._id} to={`/demo/${demo.slug}/courses/${c.slug}`}>
                <Card className="transition-all hover:scale-[1.01] hover:shadow-xl" style={{ backgroundColor: surface, borderColor: `${primary}20`, borderRadius }}>
                  <div className="h-24 w-full" style={{ background: `linear-gradient(135deg, ${primary}30, ${secondary}30)`, borderRadius: `${borderRadius} ${borderRadius} 0 0` }} />
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm">{c.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{c.summary}</p>
                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-amber-400"><Star className="size-3" /> {c.rating}</span>
                      <span className="text-muted-foreground">{c.studentsCount} دانشجو</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Articles */}
      {articles && articles.length > 0 && (
        <section className="mx-auto max-w-6xl">
          <SectionHeader title="مقالات رایگان" theme={th} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.slice(0, 3).map((a: any) => (
              <Link key={a._id} to={`/demo/${demo.slug}/articles/${a.slug}`}>
                <Card className="transition-all hover:scale-[1.01] hover:shadow-lg" style={{ backgroundColor: surface, borderColor: `${primary}20`, borderRadius }}>
                  <CardContent className="py-4">
                    <h3 className="text-sm font-bold">{a.title}</h3>
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{a.excerpt}</p>
                    <p className="mt-2 text-[10px] text-muted-foreground">{a.readTime} دقیقه مطالعه</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Workshops */}
      {workshops && workshops.length > 0 && (
        <section className="mx-auto max-w-6xl">
          <SectionHeader title="کارگاه‌ها" theme={th} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workshops.slice(0, 3).map((w: any) => (
              <Card key={w._id} className="transition-all hover:shadow-md" style={{ backgroundColor: surface, borderColor: `${primary}20`, borderRadius }}>
                <CardContent className="py-4">
                  <h3 className="text-sm font-bold">{w.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{w.topic}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-muted-foreground"><Calendar className="size-3" /> {w.date}</span>
                    <span className="font-bold" style={{ color: primary }}>{w.free ? "رایگان" : `${w.price?.toLocaleString("fa-IR")} تومان`}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Sub-page: Courses ──────────────────────────────────────────────────────

function DemoCourses({ demo }: { demo: { slug: string; theme: Theme } }) {
  const th = demo.theme;
  const courses = useQuery(api.content.listCourses, {});
  const primary = t(th, "primary", "#14b8a6");
  const secondary = t(th, "secondary", "#0ea5e9");
  const surface = t(th, "surface", "#111827");
  const borderRadius = t(th, "borderRadius", "0.75rem");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-extrabold">تمام دوره‌ها</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses?.map((c: any) => (
          <Link key={c._id} to={`/demo/${demo.slug}/courses/${c.slug}`}>
            <Card className="transition-all hover:scale-[1.01] hover:shadow-xl" style={{ backgroundColor: surface, borderColor: `${primary}20`, borderRadius }}>
              <div className="h-20 w-full" style={{ background: `linear-gradient(135deg, ${primary}30, ${secondary}30)`, borderRadius: `${borderRadius} ${borderRadius} 0 0` }} />
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">{c.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-2 text-xs text-muted-foreground">{c.summary}</p>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-amber-400"><Star className="size-3" /> {c.rating}</span>
                  <span className="font-bold" style={{ color: primary }}>{c.price > 0 ? `${c.price.toLocaleString("fa-IR")} تومان` : "رایگان"}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Sub-page: Course Detail ────────────────────────────────────────────────

function DemoCourseDetail({ demo, courseSlug }: { demo: { slug: string; theme: Theme }; courseSlug: string }) {
  const th = demo.theme;
  const courses = useQuery(api.content.listCourses, {});
  const primary = t(th, "primary", "#14b8a6");
  const secondary = t(th, "secondary", "#0ea5e9");
  const surface = t(th, "surface", "#111827");
  const borderRadius = t(th, "borderRadius", "0.75rem");
  const course = courses?.find((c: any) => c.slug === courseSlug);

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <BookOpen className="mb-4 size-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">دوره یافت نشد</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link to={`/demo/${demo.slug}/courses`} className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowRight className="size-3" /> بازگشت به دوره‌ها
      </Link>
      <div className="h-40 w-full" style={{ background: `linear-gradient(135deg, ${primary}30, ${secondary}30)`, borderRadius }} />
      <h1 className="mt-4 text-xl font-extrabold">{course.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{course.summary}</p>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Star className="size-3 text-amber-400" /> {course.rating}</span>
        <span>{course.studentsCount} دانشجو</span>
        <span>{course.durationText}</span>
      </div>
      {course.syllabus && course.syllabus.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-bold">سرفصل‌ها</h3>
          <div className="space-y-2">
            {course.syllabus.map((s: any, i: number) => (
              <div key={s.id || i} className="flex items-center gap-3 rounded-lg border p-3 text-xs" style={{ borderColor: `${primary}20`, backgroundColor: surface }}>
                <span className="flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: primary }}>{i + 1}</span>
                <span className="flex-1">{s.title}</span>
                <span className="text-muted-foreground">{s.durationMin} دقیقه</span>
                {s.free && <Badge variant="outline" className="text-[9px]">رایگان</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-page: Articles ─────────────────────────────────────────────────────

function DemoArticles({ demo }: { demo: { slug: string; theme: Theme } }) {
  const th = demo.theme;
  const articles = useQuery(api.content.listArticles, {});
  const primary = t(th, "primary", "#14b8a6");
  const surface = t(th, "surface", "#111827");
  const borderRadius = t(th, "borderRadius", "0.75rem");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-extrabold">مقالات رایگان</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles?.map((a: any) => (
          <Link key={a._id} to={`/demo/${demo.slug}/articles/${a.slug}`}>
            <Card className="transition-all hover:scale-[1.01] hover:shadow-lg" style={{ backgroundColor: surface, borderColor: `${primary}20`, borderRadius }}>
              <CardContent className="py-4">
                <Badge variant="outline" className="mb-2 text-[9px]">{a.category}</Badge>
                <h3 className="text-sm font-bold">{a.title}</h3>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{a.excerpt}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">{a.readTime} دقیقه</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Sub-page: Article Detail ───────────────────────────────────────────────

function DemoArticleDetail({ demo, articleSlug }: { demo: { slug: string; theme: Theme }; articleSlug: string }) {
  const th = demo.theme;
  const articles = useQuery(api.content.listArticles, {});
  const primary = t(th, "primary", "#14b8a6");
  const article = articles?.find((a: any) => a.slug === articleSlug);

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <FileText className="mb-4 size-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">مقاله یافت نشد</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link to={`/demo/${demo.slug}/articles`} className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowRight className="size-3" /> بازگشت به مقالات
      </Link>
      <h1 className="text-xl font-extrabold">{article.title}</h1>
      {article.subtitle && <p className="mt-2 text-sm text-muted-foreground">{article.subtitle}</p>}
      <div className="mt-4 flex gap-3 text-xs text-muted-foreground">
        <span>{article.authorName}</span>
        <span>{article.readTime} دقیقه مطالعه</span>
      </div>
      <div className="mt-6 max-w-none text-sm leading-7" style={{ color: "inherit" }} dangerouslySetInnerHTML={{ __html: article.body }} />
    </div>
  );
}

// ── Sub-page: Workshops ────────────────────────────────────────────────────

function DemoWorkshops({ demo }: { demo: { slug: string; theme: Theme } }) {
  const th = demo.theme;
  const workshops = useQuery(api.content.listWorkshops);
  const primary = t(th, "primary", "#14b8a6");
  const surface = t(th, "surface", "#111827");
  const borderRadius = t(th, "borderRadius", "0.75rem");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-extrabold">کارگاه‌ها</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workshops?.map((w: any) => (
          <Card key={w._id} className="transition-all hover:shadow-md" style={{ backgroundColor: surface, borderColor: `${primary}20`, borderRadius }}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm">{w.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{w.topic}</p>
              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 text-muted-foreground"><Calendar className="size-3" /> {w.date}</span>
                <span className="font-bold" style={{ color: primary }}>{w.free ? "رایگان" : `${w.price?.toLocaleString("fa-IR")} تومان`}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Sub-page: Products ─────────────────────────────────────────────────────

function DemoProducts({ demo }: { demo: { slug: string; theme: Theme } }) {
  const th = demo.theme;
  const products = useQuery(api.content.listProducts, {});
  const primary = t(th, "primary", "#14b8a6");
  const surface = t(th, "surface", "#111827");
  const borderRadius = t(th, "borderRadius", "0.75rem");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-extrabold">محصولات آموزشی</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products?.map((p: any) => (
          <Card key={p._id} className="transition-all hover:shadow-md" style={{ backgroundColor: surface, borderColor: `${primary}20`, borderRadius }}>
            <CardContent className="py-4">
              <Badge variant="outline" className="mb-2 text-[9px]">{p.type}</Badge>
              <h3 className="text-sm font-bold">{p.title}</h3>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
              <p className="mt-3 text-xs font-bold" style={{ color: primary }}>{p.price?.toLocaleString("fa-IR")} تومان</p>
            </CardContent>
          </Card>
        ))}
        {products && products.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
            <ShoppingBag className="mx-auto mb-4 size-12 text-muted-foreground/30" />
            هنوز محصولی اضافه نشده
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-page: Instructors ──────────────────────────────────────────────────

function DemoInstructors({ demo }: { demo: { slug: string; theme: Theme } }) {
  const th = demo.theme;
  const instructors = useQuery(api.content.listInstructors);
  const primary = t(th, "primary", "#14b8a6");
  const surface = t(th, "surface", "#111827");
  const borderRadius = t(th, "borderRadius", "0.75rem");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-extrabold">مدرسان</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {instructors?.map((i: any) => (
          <Card key={i._id} className="transition-all hover:shadow-md" style={{ backgroundColor: surface, borderColor: `${primary}20`, borderRadius }}>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex size-12 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: primary }}>
                {i.name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-sm font-bold">{i.name}</h3>
                <p className="text-xs text-muted-foreground">{i.title}</p>
                {i.specialties?.length > 0 && (
                  <p className="mt-1 text-[10px] text-muted-foreground">{i.specialties.slice(0, 3).join(" • ")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Sub-page: Dictionary ───────────────────────────────────────────────────

function DemoDictionary({ demo }: { demo: { slug: string; theme: Theme } }) {
  const th = demo.theme;
  const terms = useQuery(api.content.searchDictionary, {});
  const primary = t(th, "primary", "#14b8a6");
  const surface = t(th, "surface", "#111827");
  const borderRadius = t(th, "borderRadius", "0.75rem");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-extrabold">دیکشنری تخصصی</h1>
      <div className="space-y-3">
        {terms?.slice(0, 20).map((t: any) => (
          <Card key={t._id} style={{ backgroundColor: surface, borderColor: `${primary}20`, borderRadius }}>
            <CardContent className="py-3">
              <div className="flex items-baseline gap-2">
                <h3 className="text-sm font-bold" dir="ltr">{t.term}</h3>
                <span className="text-xs text-muted-foreground">{t.fullName}</span>
              </div>
              <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
                <span>گرم: {t.gramStatus}</span>
                <span>شکل: {t.shape}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Sub-page: Auth (demo/mock) ─────────────────────────────────────────────

function DemoAuth({ demo }: { demo: { slug: string; theme: Theme } }) {
  const th = demo.theme;
  const primary = t(th, "primary", "#14b8a6");
  const surface = t(th, "surface", "#111827");
  const borderRadius = t(th, "borderRadius", "0.75rem");

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md" style={{ backgroundColor: surface, borderColor: `${primary}20`, borderRadius }}>
        <CardHeader className="text-center">
          <CardTitle className="text-lg font-extrabold">ورود به Genova</CardTitle>
          <p className="text-xs text-muted-foreground">این صفحه فقط نمایشی است. عملیات احراز هویت انجام نمی‌شود.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center text-xs text-amber-600 dark:text-amber-400">
            <Lock className="mx-auto mb-1 size-4" />
            حالت Demo — فقط ظاهر صفحه
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">ایمیل</label>
            <div className="flex h-10 w-full items-center rounded-lg border bg-white/5 px-3 text-sm text-muted-foreground" style={{ borderColor: `${primary}30`, borderRadius }}>
              demo@example.com
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">رمز عبور</label>
            <div className="flex h-10 w-full items-center rounded-lg border bg-white/5 px-3 text-sm text-muted-foreground" style={{ borderColor: `${primary}30`, borderRadius }}>
              ••••••••
            </div>
          </div>
          <button className="flex w-full items-center justify-center gap-2 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: primary, borderRadius }} type="button">
            <Lock className="size-4" /> ورود (Demo)
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Sub-page: 404 ──────────────────────────────────────────────────────────

function DemoNotFound({ demo }: { demo: { slug: string } }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="mb-4 size-16 text-muted-foreground/20" />
      <h1 className="text-4xl font-extrabold">۴۰۴</h1>
      <p className="mt-2 text-sm text-muted-foreground">صفحه مورد نظر یافت نشد</p>
      <Button asChild variant="outline" className="mt-6">
        <Link to={`/demo/${demo.slug}`}>بازگشت به صفحه اصلی دمو</Link>
      </Button>
    </div>
  );
}

// ── Main Router ────────────────────────────────────────────────────────────

export default function DemoPreview() {
  const { demoSlug, "*": subPath } = useParams();
  const demo = useQuery(api.siteDemos.getBySlug, demoSlug ? { slug: demoSlug } : "skip");

  if (demo === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <Blocks className="mx-auto mb-4 size-12 text-muted-foreground/30" />
          <p className="text-sm font-bold">دمو یافت نشد</p>
          <p className="mt-1 text-xs text-muted-foreground">Slug: /{demoSlug}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/">بازگشت به سایت</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (demo === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const th = demo.theme as Theme;
  const segments = (subPath ?? "").split("/").filter(Boolean);
  const mainSection = segments[0] ?? "home";
  const subParam = segments[1] ?? null;

  const renderPage = () => {
    switch (mainSection) {
      case "home":
      case "":
        return <DemoHome demo={{ ...demo, theme: th }} />;
      case "auth":
        return <DemoAuth demo={{ ...demo, theme: th }} />;
      case "courses":
        return subParam ? <DemoCourseDetail demo={{ ...demo, theme: th }} courseSlug={subParam} /> : <DemoCourses demo={{ ...demo, theme: th }} />;
      case "articles":
        return subParam ? <DemoArticleDetail demo={{ ...demo, theme: th }} articleSlug={subParam} /> : <DemoArticles demo={{ ...demo, theme: th }} />;
      case "workshops":
        return <DemoWorkshops demo={{ ...demo, theme: th }} />;
      case "products":
        return <DemoProducts demo={{ ...demo, theme: th }} />;
      case "instructors":
        return <DemoInstructors demo={{ ...demo, theme: th }} />;
      case "dictionary":
        return <DemoDictionary demo={{ ...demo, theme: th }} />;
      default:
        return <DemoNotFound demo={demo} />;
    }
  };

  return (
    <>
      <head>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
        <title>DEMO: {demo.name}</title>
      </head>
      <DemoShell demo={{ ...demo, theme: th }}>{renderPage()}</DemoShell>
    </>
  );
}
