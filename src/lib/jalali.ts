/**
 * Gregorian ↔ Solar Hijri (Jalali) conversion utilities.
 * Uses the well-tested `jalaali-js` library under the hood.
 */
import * as jalaali from "jalaali-js";

/** Convert Gregorian date to Jalali. Returns [year, month, day] */
export function gregorianToJalali(
  gy: number,
  gm: number,
  gd: number,
): [number, number, number] {
  const j = jalaali.toJalaali(gy, gm, gd);
  return [j.jy, j.jm, j.jd];
}

/** Convert Jalali date to Gregorian. Returns [year, month, day] */
export function jalaliToGregorian(
  jy: number,
  jm: number,
  jd: number,
): [number, number, number] {
  const g = jalaali.toGregorian(jy, jm, jd);
  return [g.gy, g.gm, g.gd];
}

/** Parse ISO date string (YYYY-MM-DD) to [year, month, day] */
export function parseISODate(
  iso: string,
): [number, number, number] | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return [+m[1], +m[2], +m[3]];
}

/** Format ISO date string to Jalali display: ۱۴۰۳/۰۵/۱۵ */
export function formatJalaliDate(iso: string): string {
  const parsed = parseISODate(iso);
  if (!parsed) return iso;
  const [jy, jm, jd] = gregorianToJalali(...parsed);
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
}

/** Format Jalali date as readable Persian string: ۱۵ مرداد ۱۴۰۳ */
export function jalaliToPersianString(iso: string): string {
  const parsed = parseISODate(iso);
  if (!parsed) return iso;
  const [jy, jm, jd] = gregorianToJalali(...parsed);
  const months = [
    "فروردین", "اردیبهشت", "خرداد", "تیر",
    "مرداد", "شهریور", "مهر", "آبان",
    "آذر", "دی", "بهمن", "اسفند",
  ];
  return `${jd} ${months[jm - 1]} ${jy}`;
}

/** Days in a given Jalali month */
export function jalaliMonthDays(jy: number, jm: number): number {
  return jalaali.jalaaliMonthLength(jy, jm);
}

/** Is a given Jalali year a leap year? */
export function isJalaliLeapYear(jy: number): boolean {
  return jalaali.isLeapJalaaliYear(jy);
}

/** Day of week for a Gregorian date (0=Sat, 1=Sun, ..., 6=Fri — Persian week) */
export function dayOfWeek(gy: number, gm: number, gd: number): number {
  const jsDay = new Date(gy, gm - 1, gd).getDay(); // 0=Sun
  return (jsDay + 1) % 7; // 0=Sat
}

/** Return today's Jalali date */
export function todayJalali(): [number, number, number] {
  const now = new Date();
  return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Convert today to ISO string */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Persian digits */
export function toPersianDigits(s: string | number): string {
  return String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
}
