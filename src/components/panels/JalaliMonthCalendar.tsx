import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  gregorianToJalali,
  isJalaliLeapYear,
  jalaliToGregorian,
  todayISO,
  toPersianDigits,
} from "@/lib/jalali";
import { cn } from "@/lib/utils";

const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const WEEK_HEADS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

function monthDays(jy: number, jm: number) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

function toIso(jy: number, jm: number, jd: number) {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

/**
 * Jalali (شمسی) month grid used by the desk pages. Matches the rest of Genova's
 * calendar behaviour: Persian digits, Saturday-first week, and ISO dates on the
 * wire so the existing queries keep working.
 */
export default function JalaliMonthCalendar({
  selected,
  onSelect,
  markers = [],
  className,
}: {
  /** ISO date (YYYY-MM-DD) currently highlighted. */
  selected?: string | null;
  onSelect?: (iso: string) => void;
  /** ISO dates that should get a dot under them. */
  markers?: string[];
  className?: string;
}) {
  const today = todayISO();
  const todayParts = useMemo(() => {
    const [jy, jm] = gregorianToJalali(
      Number(today.slice(0, 4)),
      Number(today.slice(5, 7)),
      Number(today.slice(8, 10)),
    );
    return { jy, jm };
  }, [today]);

  const [cursor, setCursor] = useState({ jy: todayParts.jy, jm: todayParts.jm });

  const markerSet = useMemo(() => new Set(markers), [markers]);

  const cells = useMemo(() => {
    const out: { iso: string; jd: number; inMonth: boolean }[] = [];
    const firstIso = toIso(cursor.jy, cursor.jm, 1);
    const [fgy, fgm, fgd] = [
      Number(firstIso.slice(0, 4)),
      Number(firstIso.slice(5, 7)),
      Number(firstIso.slice(8, 10)),
    ];
    const firstWeekday = (new Date(fgy, fgm - 1, fgd).getDay() + 1) % 7;
    // Six weeks keeps the grid height stable month to month.
    for (let i = 0; i < 42; i++) {
      const offset = i - firstWeekday;
      let jy = cursor.jy;
      let jm = cursor.jm;
      let jd = 1 + offset;
      let inMonth = true;
      const total = monthDays(jy, jm);
      if (jd < 1) {
        jm -= 1;
        if (jm < 1) {
          jm = 12;
          jy -= 1;
        }
        jd = monthDays(jy, jm) + jd;
        inMonth = false;
      } else if (jd > total) {
        jd -= total;
        jm += 1;
        if (jm > 12) {
          jm = 1;
          jy += 1;
        }
        inMonth = false;
      }
      out.push({ iso: toIso(jy, jm, jd), jd, inMonth });
    }
    return out;
  }, [cursor]);

  const shift = (delta: number) => {
    let jm = cursor.jm + delta;
    let jy = cursor.jy;
    if (jm > 12) {
      jm = 1;
      jy += 1;
    }
    if (jm < 1) {
      jm = 12;
      jy -= 1;
    }
    setCursor({ jy, jm });
  };

  return (
    <div className={cn("select-none", className)}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="ماه قبل"
        >
          <ChevronRight className="size-4" />
        </button>
        <p className="text-[13px] font-extrabold">
          {JALALI_MONTHS[cursor.jm - 1]} {toPersianDigits(cursor.jy)}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="ماه بعد"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEK_HEADS.map((w) => (
          <span key={w} className="py-1 text-[10px] font-semibold text-muted-foreground">
            {w}
          </span>
        ))}
        {cells.map((cell) => {
          const isToday = cell.iso === today;
          const isSelected = selected === cell.iso;
          const hasMark = markerSet.has(cell.iso);
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onSelect?.(cell.iso)}
              className={cn(
                "relative flex h-8 items-center justify-center rounded-lg text-[11.5px] font-medium transition-colors",
                !cell.inMonth && "text-muted-foreground/40",
                !isSelected && !isToday && onSelect && "hover:bg-muted",
                isToday && !isSelected && "bg-primary/10 text-primary",
                isSelected && "bg-primary text-primary-foreground",
              )}
            >
              {toPersianDigits(cell.jd)}
              {hasMark && !isSelected && (
                <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}