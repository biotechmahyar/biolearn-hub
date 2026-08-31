/** Convert numbers to Persian digits */
export function faNum(n: string | number): string {
  if (typeof n === "string") return n.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
  return faNum(String(n));
}

/** Format price in Toman */
export function formatPrice(n: number): string {
  return new Intl.NumberFormat("fa-IR").format(n) + " تومان";
}

/** Format date to Persian */
export function formatDate(ts: number | string): string {
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  return d.toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
}

/** Color accents for cards */
export function accent(name: string | undefined | null) {
  const key = name ?? "default";
  const map: Record<string, { chip: string; grad: string }> = {
    teal: { chip: "bg-teal-500/10 text-teal-700 ring-teal-500/30", grad: "from-teal-500 to-teal-700" },
    emerald: { chip: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30", grad: "from-emerald-500 to-emerald-700" },
    cyan: { chip: "bg-cyan-500/10 text-cyan-700 ring-cyan-500/30", grad: "from-cyan-500 to-cyan-700" },
    blue: { chip: "bg-blue-500/10 text-blue-700 ring-blue-500/30", grad: "from-blue-500 to-blue-700" },
    purple: { chip: "bg-purple-500/10 text-purple-700 ring-purple-500/30", grad: "from-purple-500 to-purple-700" },
    amber: { chip: "bg-amber-500/10 text-amber-700 ring-amber-500/30", grad: "from-amber-500 to-amber-700" },
    default: { chip: "bg-slate-500/10 text-slate-700 ring-slate-500/30", grad: "from-slate-500 to-slate-700" },
  };
  return map[key] ?? map.default;
}

export const BUNDLE_LABELS: Record<string, string> = {
  economy: "اقتصادی", basic: "پایه", plus: "پلاس", premium: "پرمیوم",
};
export const MODE_LABELS: Record<string, string> = {
  live: "زنده", recorded: "ضبط‌شده", hybrid: "ترکیبی",
};
export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  flashcards: "فلش‌کارت", guide: "راهنما", poster: "پوستر",
};
