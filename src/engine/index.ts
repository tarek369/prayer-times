/**
 * Public engine API. Wraps the lower-level modules into the shapes the UI uses:
 * per-day times, a monthly timetable row set, and a next-prayer countdown helper.
 */

import type { City, MethodConfig, IshaMonthRule } from "./config";
import { DEFAULT_METHOD, DEFAULT_ISHA_MONTH_RULES, MONTHS } from "./config";
import {
  calculatePrayerTimes,
  getIshaMonthRule,
  type CalculateOptions,
  type PrayerTimes,
} from "./prayer";
import { getHijriDate, formatHijriRange, type HijriDate } from "./hijri";
import { formatPrayerTime, getWeekday, type RoundingMode } from "./format";
import { daysInMonth } from "./solar";

export type { City, MethodConfig, IshaMonthRule, IshaMode } from "./config";
export type { PrayerTimes, FajrResult, IshaResult } from "./prayer";
export type { HijriDate } from "./hijri";
export { calculatePrayerTimes } from "./prayer";
export { getIshaMonthRule } from "./prayer";
export { getHijriDate, formatHijriRange } from "./hijri";
export { formatPrayerTime, getWeekday, formatCountdown, slugify } from "./format";
export { CITIES, DEFAULT_CITY_KEY, DEFAULT_METHOD, DEFAULT_ISHA_MONTH_RULES, MONTHS, WEEKDAYS } from "./config";

export interface PrayerDay {
  year: number;
  month: number;
  day: number;
  times: PrayerTimes;
  hijri: HijriDate | null;
}

export type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

/** Display metadata for the five daily prayers + sunrise. */
export const PRAYER_META: Record<PrayerKey, { label: string; isPrayer: boolean }> = {
  fajr: { label: "Fajr", isPrayer: true },
  sunrise: { label: "Sunrise", isPrayer: false },
  dhuhr: { label: "Dhuhr", isPrayer: true },
  asr: { label: "Asr", isPrayer: true },
  maghrib: { label: "Maghrib", isPrayer: true },
  isha: { label: "Isha", isPrayer: true },
};

export const PRAYER_ORDER: PrayerKey[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

export function getOptionsFromMethod(
  method?: MethodConfig,
  ishaMonthRules?: Record<number, IshaMonthRule>,
): CalculateOptions {
  const options: CalculateOptions = {};
  if (method) options.method = method;
  if (ishaMonthRules) options.ishaMonthRules = ishaMonthRules;
  return options;
}

/** Prayer times for a single day, with Hijri date attached. */
export function getTimesForDay(
  year: number,
  month: number,
  day: number,
  city: City,
  method: MethodConfig = DEFAULT_METHOD,
  ishaMonthRules: Record<number, IshaMonthRule> = DEFAULT_ISHA_MONTH_RULES,
): PrayerDay {
  const times = calculatePrayerTimes(year, month, day, city, getOptionsFromMethod(method, ishaMonthRules));
  const hijri = getHijriDate(year, month, day, city.timeZone);
  return { year, month, day, times, hijri };
}

export interface TimetableRow {
  gregorianDay: string;
  gregorianMonth: string;
  hijriDay: string;
  hijriMonth: string;
  hijriYear: string;
  weekday: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  fajrRule: string;
  fajrRuleType: string;
  ishaRule: string;
  ishaRuleType: string;
  ishaMinutesAfterMaghrib: number;
}

export interface MonthTimetable {
  city: City;
  year: number;
  month: number;
  rows: TimetableRow[];
  hijriRange: string;
  ruleSummary: string;
}

/** Build the full monthly timetable (mirrors renderTimetable in app.js, minus the DOM). */
export function getMonthTimetable(
  year: number,
  month: number,
  city: City,
  method: MethodConfig = DEFAULT_METHOD,
  ishaMonthRules: Record<number, IshaMonthRule> = DEFAULT_ISHA_MONTH_RULES,
  use24h = false,
): MonthTimetable {
  const days = daysInMonth(year, month);
  const ishaMonthRule = getIshaMonthRule(month, ishaMonthRules);
  const rows: TimetableRow[] = [];

  let firstHijri: HijriDate | null = null;
  let lastHijri: HijriDate | null = null;

  for (let day = 1; day <= days; day += 1) {
    const times = calculatePrayerTimes(year, month, day, city, getOptionsFromMethod(method, ishaMonthRules));
    const hijri = getHijriDate(year, month, day, city.timeZone);
    if (day === 1) firstHijri = hijri;
    if (day === days) lastHijri = hijri;

    rows.push({
      gregorianDay: String(day).padStart(2, "0"),
      gregorianMonth: MONTHS[month - 1],
      hijriDay: hijri?.day || "",
      hijriMonth: hijri?.month || "Hijri",
      hijriYear: hijri?.year || "",
      weekday: getWeekday(year, month, day),
      fajr: formatPrayerTime(times.fajr.time, "round", use24h),
      sunrise: formatPrayerTime(times.sunrise, "round", use24h),
      dhuhr: formatPrayerTime(times.dhuhr, "ceil", use24h),
      asr: formatPrayerTime(times.asr, "ceil", use24h),
      maghrib: formatPrayerTime(times.maghrib, "ceil", use24h),
      isha: formatPrayerTime(times.isha.time, "ceil", use24h),
      fajrRule: times.fajr.rule,
      fajrRuleType: times.fajr.ruleType,
      ishaRule: times.isha.rule,
      ishaRuleType: times.isha.ruleType,
      ishaMinutesAfterMaghrib: times.isha.minutesAfterMaghrib,
    });
  }

  return {
    city,
    year,
    month,
    rows,
    hijriRange: formatHijriRange(firstHijri, lastHijri),
    ruleSummary: buildRuleSummary(rows, ishaMonthRule, month),
  };
}

function buildRuleSummary(rows: TimetableRow[], monthRule: IshaMonthRule, month: number): string {
  const fajrExtremeDays = rows.filter((row) => row.fajrRuleType !== "angle").length;
  const ishaAngleDays = rows.filter((row) => row.ishaRuleType === "angle").length;
  const ishaFixedDays = rows.length - ishaAngleDays;
  const monthName = MONTHS[month - 1];

  const fajrText = fajrExtremeDays
    ? `Fajr uses the 15° angle when possible and the high-latitude night-portion guard on ${fajrExtremeDays} day${fajrExtremeDays === 1 ? "" : "s"}.`
    : `Fajr uses the 15° angle for all days in ${monthName}.`;

  const ishaText =
    monthRule.mode === "fixedAfterMaghrib"
      ? `Isha is automatically set to Maghrib + ${monthRule.fallbackMinutes} minutes for ${monthName}.`
      : `Isha uses the 15° angle on ${ishaAngleDays} day${ishaAngleDays === 1 ? "" : "s"}${ishaFixedDays ? ` and Maghrib + ${monthRule.fallbackMinutes} minutes on ${ishaFixedDays} high-latitude day${ishaFixedDays === 1 ? "" : "s"}` : ""}.`;

  return `${fajrText} ${ishaText}`;
}

/* ------------------------------------------------------------------ */
/* Next-prayer countdown                                               */
/* ------------------------------------------------------------------ */

export interface NextPrayer {
  /** The prayer that is upcoming (never "sunrise"). */
  key: Exclude<PrayerKey, "sunrise">;
  /** "Minutes of day" of the upcoming prayer, local civil time. */
  minutes: number;
  /** Minutes from `nowMinutes` until the prayer. */
  minutesUntil: number;
  /** Prayer that is currently active (the most recent one before now). */
  previousKey: Exclude<PrayerKey, "sunrise">;
}

const PRAYER_KEYS_ONLY = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

/**
 * Given today's computed times and the current "minutes of day", return the next
 * upcoming prayer. Handles day rollover: if today's Isha has passed, the next
 * prayer is tomorrow's Fajr (caller may pass `tomorrowFajr` to compute its time).
 */
export function getNextPrayer(
  times: PrayerTimes,
  nowMinutes: number,
  tomorrowFajr?: number,
): NextPrayer {
  const entries: { key: Exclude<PrayerKey, "sunrise">; minutes: number }[] = [
    { key: "fajr", minutes: times.fajr.time },
    { key: "dhuhr", minutes: times.dhuhr },
    { key: "asr", minutes: times.asr ?? times.maghrib },
    { key: "maghrib", minutes: times.maghrib },
    { key: "isha", minutes: times.isha.time },
  ];

  for (let i = 0; i < entries.length; i += 1) {
    if (entries[i].minutes > nowMinutes) {
      return {
        key: entries[i].key,
        minutes: entries[i].minutes,
        minutesUntil: entries[i].minutes - nowMinutes,
        previousKey: (i === 0 ? "isha" : entries[i - 1].key),
      };
    }
  }

  // All of today's prayers have passed → next is tomorrow's Fajr.
  const nextFajr = tomorrowFajr ?? times.fajr.time + 1440;
  return {
    key: "fajr",
    minutes: nextFajr,
    minutesUntil: nextFajr - nowMinutes,
    previousKey: "isha",
  };
}

/** Convenience: which prayer keys should be considered "now active" lookup. */
export function isPrayerKey(key: PrayerKey): key is Exclude<PrayerKey, "sunrise"> {
  return (PRAYER_KEYS_ONLY as readonly string[]).includes(key);
}
