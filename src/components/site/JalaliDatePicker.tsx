import { useState, useRef, useEffect } from "react";
import {
  gregorianToJalali,
  jalaliToGregorian,
  isJalaliLeapYear,
  todayJalali,
  toPersianDigits,
  dayOfWeek,
} from "@/lib/jalali";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر",
  "مرداد", "شهریور", "مهر", "آبان",
  "آذر", "دی", "بهمن", "اسفند",
];

interface JalaliDatePickerProps {
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  className?: string;
}

export function JalaliDatePicker({
  value,
  onChange,
  placeholder = "انتخاب تاریخ",
  className,
}: JalaliDatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const parsed = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const [gy, gm, gd] = parsed ? [+parsed[1], +parsed[2], +parsed[3]] : [0, 0, 0];
  const [jy, jm, jd] = parsed
    ? gregorianToJalali(gy, gm, gd)
    : todayJalali();

  const [selYear, setSelYear] = useState(jy);
  const [selMonth, setSelMonth] = useState(jm);

  useEffect(() => {
    if (parsed) {
      const [sj, sm] = gregorianToJalali(gy, gm, gd);
      setSelYear(sj);
      setSelMonth(sm);
    }
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const maxDays = selMonth <= 6 ? 31 : selMonth <= 11 ? 30 : isJalaliLeapYear(selYear) ? 30 : 29;

  const selectDay = (day: number) => {
    const [gy2, gm2, gd2] = jalaliToGregorian(selYear, selMonth, day);
    onChange(`${gy2}-${String(gm2).padStart(2, "0")}-${String(gd2).padStart(2, "0")}`);
    setOpen(false);
  };

  const baseYear = todayJalali()[0];
  const years = Array.from({ length: 21 }, (_, i) => baseYear - 10 + i);

  // First day of month: dayOfWeek returns 0=Sat,1=Sun,...,6=Fri
  // Grid header: ش(Sat) ی(Sun) د(Mon) س(Tue) چ(Wed) پ(Thu) ج(Fri)
  const [fg, fm, fd] = jalaliToGregorian(selYear, selMonth, 1);
  const firstDayOffset = dayOfWeek(fg, fm, fd);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-right transition-colors",
          "hover:border-primary/50 focus:border-primary focus:outline-none",
          !value && "text-muted-foreground",
        )}
      >
        <Calendar className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-left" dir="rtl">
          {value
            ? toPersianDigits(`${selYear}/${String(selMonth).padStart(2, "0")}/${String(jd).padStart(2, "0")}`)
            : placeholder}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-border bg-card p-3 shadow-xl" dir="rtl">
          <div className="flex items-center gap-2 mb-3">
            <select
              value={selYear}
              onChange={(e) => setSelYear(+e.target.value)}
              className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>{toPersianDigits(y)}</option>
              ))}
            </select>
            <select
              value={selMonth}
              onChange={(e) => setSelMonth(+e.target.value)}
              className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
            >
              {JALALI_MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => {
                if (selMonth === 1) { setSelMonth(12); setSelYear((y) => y - 1); }
                else setSelMonth((m) => m - 1);
              }}
              className="rounded-md p-1 hover:bg-accent"
            >
              <ChevronRight className="size-4" />
            </button>
            <span className="text-sm font-bold text-foreground">
              {JALALI_MONTHS[selMonth - 1]} {toPersianDigits(selYear)}
            </span>
            <button
              type="button"
              onClick={() => {
                if (selMonth === 12) { setSelMonth(1); setSelYear((y) => y + 1); }
                else setSelMonth((m) => m + 1);
              }}
              className="rounded-md p-1 hover:bg-accent"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((d) => (
              <div key={d} className="py-1 text-center text-[11px] font-medium text-muted-foreground">{d}</div>
            ))}
            {Array.from({ length: firstDayOffset }, (_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: maxDays }, (_, i) => i + 1).map((day) => {
              const isSelected = parsed && selYear === jy && selMonth === jm && day === jd;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg text-sm transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold"
                      : "hover:bg-accent text-foreground",
                  )}
                >
                  {toPersianDigits(day)}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              const [ty, tm, td] = todayJalali();
              setSelYear(ty);
              setSelMonth(tm);
              const [gy2, gm2, gd2] = jalaliToGregorian(ty, tm, td);
              onChange(`${gy2}-${String(gm2).padStart(2, "0")}-${String(gd2).padStart(2, "0")}`);
              setOpen(false);
            }}
            className="mt-2 w-full rounded-lg border border-border py-1.5 text-xs text-muted-foreground hover:bg-accent"
          >
            امروز
          </button>
        </div>
      )}
    </div>
  );
}
