/**
 * Live elapsed-time timer for a class room.
 * Accepts a `startMs` (epoch ms) and ticks every second while `running` is true.
 */
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function ClassTimer({
  startMs,
  running = true,
}: {
  startMs?: number;
  running?: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startMs || !running) {
      setElapsed(0);
      return;
    }
    // Compute immediately so the first render is correct
    setElapsed(Date.now() - startMs);
    const id = setInterval(() => setElapsed(Date.now() - startMs), 1000);
    return () => clearInterval(id);
  }, [startMs, running]);

  if (!startMs) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 font-mono text-xs text-slate-300 ring-1 ring-white/10">
      <Clock className="size-3 text-slate-400" />
      {formatElapsed(elapsed)}
    </span>
  );
}
