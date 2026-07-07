/**
 * Time-formatting helpers, ported from app.js. `formatPrayerTime` keeps the same
 * ceil/floor/round rounding modes so the displayed times match the website exactly.
 */

import { WEEKDAYS } from "./config";
import { normalizeMinutes } from "./solar";

export type RoundingMode = "round" | "ceil" | "floor";

/**
 * Format a "minutes of day" value as a 12-hour clock string ("07:42 AM").
 * Supports 24-hour output via `use24h`.
 */
export function formatPrayerTime(minutes: number | null, mode: RoundingMode = "round", use24h = false): string {
  if (minutes === null || Number.isNaN(minutes)) return "--";

  let rounded: number;
  if (mode === "ceil") rounded = Math.ceil(minutes - 0.000001);
  else if (mode === "floor") rounded = Math.floor(minutes + 0.000001);
  else rounded = Math.round(minutes);

  const normalized = normalizeMinutes(rounded);
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;

  if (use24h) {
    return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const suffix = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function getWeekday(year: number, month: number, day: number): string {
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Human-friendly countdown, e.g. "2h 13m". */
export function formatCountdown(totalMinutes: number): string {
  const rounded = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  if (hours <= 0) return `${minutes}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}
