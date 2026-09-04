// Persian formatting + brand accent/icon helpers

export function faNum(n: number | string): string {
  return Number(n).toLocaleString("fa-IR");
}

/** Format a number with comma separators for price display (e.g. ۱,۲۳۴,۵۶۷) */
export function formatPriceNumber(n: number | string): string {
  return Number(n).toLocaleString("en-US");
}

/** Format price with comma separators + "تومان" */
export function formatPrice(toman: number): string {
  if (toman === 0) return "رایگان";
  return `${formatPriceNumber(toman)} تومان`;
}

/** Add platform commission (4%) and return total price */
export function addCommission(price: number): number {
  return Math.round(price * 1.04);
}

/** Format price with 4% commission included */
export function formatPriceWithCommission(price: number): string {
  if (price === 0) return "رایگان";
  const total = addCommission(price);
  return `${formatPriceNumber(total)} تومان`;
}

/** Format card number in groups of 4 (e.g. ۱۲۳۴ ۵۶۷۸ ۹۰۱۲ ۳۴۵۶) */
export function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  const groups = digits.match(/.{1,4}/g);
  return groups ? groups.join(" ") : digits;
}

export function formatDate(ts: number | string): string {
  const d = typeof ts === "string" ? new Date(ts) : new Date(ts);
  return d.toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format timestamp as short Jalali date (e.g. ۱۴۰۴/۰۶/۱۴) */
export function formatJalaliDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type AccentKey =
  | "teal"
  | "emerald"
  | "indigo"
  | "violet"
  | "amber"
  | "rose"
  | "sky"
  | "slate";

const ACCENT_MAP: Record<
  AccentKey,
  { grad: string; soft: string; text: string; ring: string; dot: string; chip: string }
> = {
  teal: {
    grad: "from-teal-500 via-teal-500 to-emerald-600",
    soft: "bg-teal-50 text-teal-800",
    text: "text-teal-700",
    ring: "ring-teal-500/20",
    dot: "bg-teal-500",
    chip: "bg-teal-50 text-teal-700 ring-teal-600/10",
  },
  emerald: {
    grad: "from-emerald-500 via-emerald-500 to-green-600",
    soft: "bg-emerald-50 text-emerald-800",
    text: "text-emerald-700",
    ring: "ring-emerald-500/20",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  },
  indigo: {
    grad: "from-indigo-500 via-indigo-500 to-blue-600",
    soft: "bg-indigo-50 text-indigo-800",
    text: "text-indigo-700",
    ring: "ring-indigo-500/20",
    dot: "bg-indigo-500",
    chip: "bg-indigo-50 text-indigo-700 ring-indigo-600/10",
  },
  violet: {
    grad: "from-violet-500 via-violet-500 to-purple-600",
    soft: "bg-violet-50 text-violet-800",
    text: "text-violet-700",
    ring: "ring-violet-500/20",
    dot: "bg-violet-500",
    chip: "bg-violet-50 text-violet-700 ring-violet-600/10",
  },
  amber: {
    grad: "from-amber-500 via-amber-500 to-orange-600",
    soft: "bg-amber-50 text-amber-800",
    text: "text-amber-700",
    ring: "ring-amber-500/20",
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 ring-amber-600/10",
  },
  rose: {
    grad: "from-rose-500 via-rose-500 to-pink-600",
    soft: "bg-rose-50 text-rose-800",
    text: "text-rose-700",
    ring: "ring-rose-500/20",
    dot: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 ring-rose-600/10",
  },
  sky: {
    grad: "from-sky-500 via-sky-500 to-cyan-600",
    soft: "bg-sky-50 text-sky-800",
    text: "text-sky-700",
    ring: "ring-sky-500/20",
    dot: "bg-sky-500",
    chip: "bg-sky-50 text-sky-700 ring-sky-600/10",
  },
  slate: {
    grad: "from-slate-500 via-slate-500 to-slate-700",
    soft: "bg-slate-100 text-slate-700",
    text: "text-slate-700",
    ring: "ring-slate-500/20",
    dot: "bg-slate-500",
    chip: "bg-slate-100 text-slate-700 ring-slate-600/10",
  },
};

export function accent(key?: string | null): (typeof ACCENT_MAP)["teal"] {
  return ACCENT_MAP[(key as AccentKey) ?? "teal"] ?? ACCENT_MAP.teal;
}

export const MODE_LABELS: Record<string, string> = {
  live: "کلاس زنده",
  recorded: "ضبط‌شده",
  hybrid: "ترکیبی",
};

export const BUNDLE_LABELS: Record<string, string> = {
  economy: "اقتصادی",
  basic: "پایه",
  plus: "پلاس",
  premium: "پرمیوم",
};

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  flashcards: "فلش‌کارت",
  guide: "کتابچهٔ چاپی",
  poster: "پوستر آموزشی",
};
