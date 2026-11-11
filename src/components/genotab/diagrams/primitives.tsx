/**
 * ژن‌آموز — shared SVG primitives.
 * All Genotab diagrams are original vector drawings (no third-party images), so
 * nothing here needs an external licence. Labels are Persian; scientific terms
 * stay in Latin script where that is the standard.
 */
import type { ReactNode } from "react";

export const COLORS = {
  green: "#047857",
  greenSoft: "#d1fae5",
  teal: "#0d9488",
  charcoal: "#0f172a",
  slate: "#64748b",
  blue: "#0369a1",
  blueSoft: "#e0f2fe",
  amber: "#b45309",
  amberSoft: "#fef3c7",
  rose: "#be123c",
  roseSoft: "#ffe4e6",
  violet: "#6d28d9",
  violetSoft: "#ede9fe",
};

export function Frame({
  children,
  viewBox,
  className,
}: {
  children: ReactNode;
  viewBox: string;
  className?: string;
}) {
  return (
    <svg
      viewBox={viewBox}
      role="img"
      className={className ?? "h-full w-full"}
      style={{ direction: "ltr" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

export function Label({
  x,
  y,
  children,
  size = 9,
  fill = COLORS.charcoal,
  anchor = "middle",
  weight = 700,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  weight?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fill={fill}
      fontWeight={weight}
      textAnchor={anchor}
      style={{ direction: "rtl", fontFamily: "inherit" }}
    >
      {children}
    </text>
  );
}

/** A labelled part with a connector line from the label to the structure. */
export function Callout({
  x,
  y,
  toX,
  toY,
  children,
  color = COLORS.slate,
  anchor = "middle",
}: {
  x: number;
  y: number;
  toX: number;
  toY: number;
  children: ReactNode;
  color?: string;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <g>
      <line x1={x} y1={y + 3} x2={toX} y2={toY} stroke={color} strokeWidth={0.6} strokeDasharray="2 2" />
      <circle cx={toX} cy={toY} r={1.4} fill={color} />
      <Label x={x} y={y} size={8} fill={color} anchor={anchor}>
        {children}
      </Label>
    </g>
  );
}

export function Arrow({
  x1,
  y1,
  x2,
  y2,
  color = COLORS.slate,
  width = 1,
  dashed = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  width?: number;
  dashed?: boolean;
}) {
  const id = `arrow-${x1}-${y1}-${x2}-${y2}-${color.replace("#", "")}`;
  return (
    <g>
      <defs>
        <marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={width}
        markerEnd={`url(#${id})`}
        strokeDasharray={dashed ? "3 2" : undefined}
      />
    </g>
  );
}

export function Box({
  x,
  y,
  w,
  h,
  fill = "#ffffff",
  stroke = COLORS.slate,
  rx = 3,
  label,
  size = 8,
  textFill = COLORS.charcoal,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  stroke?: string;
  rx?: number;
  label?: string;
  size?: number;
  textFill?: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={stroke} strokeWidth={0.8} />
      {label ? (
        <Label x={x + w / 2} y={y + h / 2 + size / 3} size={size} fill={textFill}>
          {label}
        </Label>
      ) : null}
    </g>
  );
}
