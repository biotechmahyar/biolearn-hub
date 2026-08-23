import { useEffect, useRef } from "react";

export type WbTool = "pen" | "highlighter" | "eraser";

export type WbStroke = {
  _id: string;
  tool: WbTool;
  color: string;
  size: number; // fraction of the canvas min dimension
  points: { x: number; y: number }[]; // normalized 0..1
};

export type WbDraft = Omit<WbStroke, "_id">;

interface Props {
  strokes: WbStroke[];
  bg: string;
  readOnly?: boolean;
  tool?: WbTool;
  color?: string;
  size?: number; // fraction of min dimension, e.g. 0.012
  onDraw?: (stroke: WbDraft) => void;
  className?: string;
  minHeight?: number;
  borderClass?: string;
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: { tool: WbTool; color: string; size: number; points: { x: number; y: number }[] },
  w: number,
  h: number,
) {
  if (stroke.points.length === 0) return;
  const min = Math.min(w, h);
  ctx.save();
  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "#000";
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(2, stroke.size * min);
  } else if (stroke.tool === "highlighter") {
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = 0.38;
    ctx.lineWidth = Math.max(3, stroke.size * min * 2.4);
  } else {
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(1.5, stroke.size * min);
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
  for (let i = 1; i < stroke.points.length; i++) {
    const p = stroke.points[i];
    // Midpoint smoothing so fast strokes don't look polygonal.
    const prev = stroke.points[i - 1];
    const mx = ((prev.x + p.x) / 2) * w;
    const my = ((prev.y + p.y) / 2) * h;
    ctx.quadraticCurveTo(prev.x * w, prev.y * h, mx, my);
  }
  ctx.lineTo(stroke.points[stroke.points.length - 1].x * w, stroke.points[stroke.points.length - 1].y * h);
  ctx.stroke();
  ctx.restore();
}

export function WhiteboardCanvas({
  strokes,
  bg,
  readOnly = false,
  tool = "pen",
  color = "#ffffff",
  size = 0.014,
  onDraw,
  className = "",
  minHeight = 280,
  borderClass = "border border-white/10",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draftRef = useRef<WbDraft | null>(null);
  const drawingRef = useRef(false);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;
  const bgRef = useRef(bg);
  bgRef.current = bg;
  const propsRef = useRef({ tool, color, size });
  propsRef.current = { tool, color, size };

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = bgRef.current;
    ctx.fillRect(0, 0, w, h);
    for (const s of strokesRef.current) drawStroke(ctx, s, w, h);
    if (draftRef.current) drawStroke(ctx, draftRef.current, w, h);
  }

  // Redraw whenever committed strokes or the background change.
  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes, bg]);

  // Resize handling (device-pixel-ratio aware); re-render strokes after resize.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toNormalized(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  }

  function handleDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (readOnly || !onDraw) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    draftRef.current = {
      tool: propsRef.current.tool,
      color: propsRef.current.color,
      size: propsRef.current.size,
      points: [toNormalized(e)],
    };
    redrawDraft();
  }

  function handleMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !draftRef.current) return;
    e.preventDefault();
    const p = toNormalized(e);
    const last = draftRef.current.points[draftRef.current.points.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.001 && Math.abs(last.y - p.y) < 0.001) return;
    draftRef.current.points.push(p);
    redrawDraft();
  }

  function handleUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !draftRef.current) return;
    e.preventDefault();
    drawingRef.current = false;
    const draft = draftRef.current;
    draftRef.current = null;
    if (draft.points.length > 0 && onDraw) {
      onDraw({ ...draft, points: draft.points });
    }
    redrawDraft();
  }

  function redrawDraft() {
    redraw();
  }

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full touch-none select-none rounded-lg ${borderClass} ${className}`}
      style={{ minHeight, cursor: readOnly ? "default" : "crosshair" }}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    />
  );
}
