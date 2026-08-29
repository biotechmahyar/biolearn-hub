/**
 * Gregorian ↔ Solar Hijri (Jalali) conversion utilities.
 * Based on the standard astronomical algorithm.
 */

const JALALI_EPOCH = 1948321; // Number of days from Gregorian epoch to 1 Farvardin 1 Jalali

function gregorianToJulianDay(y: number, m: number, d: number): number {
  const gy = y + (m > 2 ? 0 : -1);
  const gm = m > 2 ? m - 1 : m + 9;
  const gy2 = Math.floor(gy / 100);
  return (
    Math.floor((1461 * gy) / 4) +
    Math.floor((367 * (gm - 1)) / 12) -
    Math.floor((3 * Math.floor((gy + 1 - gy2) / 100)) / 4) +
    d -
    1 -
    1721119 +
    gy2 * -37
  );
}

function julianDayToGregorian(jd: number): [number, number, number] {
  const j = jd + 1402;
  const k = Math.floor((j - 1) / 1461);
  const l = j - 1461 * k;
  const n = Math.floor((l - 1) / 365) - Math.floor(l / 1461);
  const i = l - 365 * n + 30;
  const year = 4 * k + n + (i > 385 ? 1 : 0);
  const x = Math.floor((i - 1) / 31);
  const day = i - 30 * x - (x > 4 ? 1 : 0);
  const month = x - 1;
  return [year, month, day];
}

function julianDayToJalali(jd: number): [number, number, number] {
  const j = jd - JALALI_EPOCH;
  const k = Math.floor(j / 1029983);
  const rem = j % 1029983;
  const n =
    rem === 1029982
      ? 2824
      : Math.floor((100 * rem + 10646) / 366243);
  const r = rem - Math.floor((366 * n + 1029) / 366);
  const year = n * 2820 + k * 2821 + r + 1;
  let month: number;
  let day: number;
  if (r < 186) {
    month = Math.floor((r - 1) / 31) + 1;
    day = r - 31 * (month - 1);
  } else {
    month = Math.floor((r - 187) / 30) + 7;
    day = r - 186 - 30 * (month - 7);
  }
  return [year, month, day];
}

function jalaliToJulianDay(jy: number, jm: number, jd: number): number {
  const jy1 = jy - 474;
  const jp = jy1 + 474;
  const k = jp * 1029983;
  const r = jp % 2820;
  const days =
    366 * jp +
    Math.floor((36525 * r) / 1029983) +
    Math.floor(((r * 2820 + 2819) * 97) / 1029983) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186) -
    1 +
    JALALI_EPOCH;
  return days;
}

/** Convert Gregorian date to Jalali. Returns [year, month, day] */
export function gregorianToJalali(
  gy: number,
  gm: number,
  gd: number,
): [number, number, number] {
  return julianDayToJalali(gregorianToJulianDay(gy, gm, gd));
}

/** Convert Jalali date to Gregorian. Returns [year, month, day] */
export function jalaliToGregorian(
  jy: number,
  jm: number,
  jd: number,
): [number, number, number] {
  return julianDayToGregorian(jalaliToJulianDay(jy, jm, jd));
}

/** Parse ISO date string (YYYY-MM-DD) to [year, month, day] */
export function parseISODate(
  iso: string,
): [number, number, number] | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return [+m[1], +m[2], +m[3]];
}

/** Format ISO date string to Jalali display string: ۱۴۰۳/۰۵/۱۵ */
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
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  // Esfand: 29 normally, 30 in leap years
  const g = jalaliToGregorian(jy, 12, 1);
  const g2 = jalaliToGregorian(jy, 12, 29);
  const n = gregorianToJulianDay(g2[0], g2[1], g2[2]) - gregorianToJulianDay(g[0], g[1], g[2]);
  return n < 29 ? 29 : 30;
}

/** Is a given Jalali year a leap year? */
export function isJalaliLeapYear(jy: number): boolean {
  return jalaliMonthDays(jy, 12) === 30;
}

/** Return today's Jalali date as ISO string */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Convert today to Jalali year, month, day */
export function todayJalali(): [number, number, number] {
  const now = new Date();
  return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Persian digits */
export function toPersianDigits(s: string | number): string {
  return String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
}
