/**
 * Default prayer-time configuration for the app.
 *
 * The defaults mirror the configuration published by eestiislamikeskus.org
 * (Tallinn / Tartu, Estonia): a custom high-latitude method using 15° angles
 * for Fajr and Isha with a night-portion guard, and per-month Isha rules
 * where the summer months use "Isha = Maghrib + 90 minutes".
 *
 * Everything here is overridable by the user in Settings.
 */

export interface City {
  /** Storage/UI key, e.g. "tallinn". */
  key: string;
  /** Human-readable label. */
  label: string;
  /** Label used on posters / printed timetables. */
  posterLabel: string;
  latitude: number;
  longitude: number;
  /** IANA timezone identifier, e.g. "Europe/Tallinn". */
  timeZone: string;
}

export const CITIES: Record<string, City> = {
  tallinn: {
    key: "tallinn",
    label: "Tallinn, Estonia",
    posterLabel: "Tallinn, Estonia",
    latitude: 59.437,
    longitude: 24.7536,
    timeZone: "Europe/Tallinn",
  },
  tartu: {
    key: "tartu",
    label: "Tartu, Estonia",
    posterLabel: "Tartu, Estonia",
    latitude: 58.378,
    longitude: 26.729,
    timeZone: "Europe/Tallinn",
  },
};

export const DEFAULT_CITY_KEY = "tallinn";

/**
 * Calculation method constants. Identical values to METHOD in app.js.
 */
export interface MethodConfig {
  fajrAngle: number;
  ishaAngle: number;
  /** Standard (Shafi) = 1, Hanafi = 2. */
  asrShadowFactor: number;
  /** Solar altitude for sunrise/sunset (-0.833° accounts for refraction + semidiameter). */
  sunriseSunsetAltitude: number;
  dhuhrOffsetMinutes: number;
  maghribOffsetMinutes: number;
  /** Divisor for the high-latitude night-portion guard (angle/divisor of the night). */
  highLatitudeDivisor: number;
  fajrExtremeMinMinutesBeforeSunrise: number;
  fajrExtremeMaxMinutesBeforeSunrise: number;
  /** Minimum gap kept between consecutive Isha and Fajr. */
  minGapMinutesBetweenIshaAndFajr: number;
  /** Night shorter than this (minutes) is treated as "extreme" for Isha. */
  ishaExtremeNightThresholdMinutes: number;
  defaultExtremeIshaMinutes: number;
}

export const DEFAULT_METHOD: MethodConfig = {
  fajrAngle: 15,
  ishaAngle: 15,
  asrShadowFactor: 1,
  sunriseSunsetAltitude: -0.833,
  dhuhrOffsetMinutes: 0,
  maghribOffsetMinutes: 0,
  highLatitudeDivisor: 60,
  fajrExtremeMinMinutesBeforeSunrise: 45,
  fajrExtremeMaxMinutesBeforeSunrise: 120,
  minGapMinutesBetweenIshaAndFajr: 30,
  ishaExtremeNightThresholdMinutes: 520,
  defaultExtremeIshaMinutes: 90,
};

export type IshaMode = "anglePreferred" | "fixedAfterMaghrib";

export interface IshaMonthRule {
  mode: IshaMode;
  /** Minutes after Maghrib used by the fallback / fixed rule. */
  fallbackMinutes: number;
  /** If the 15° angle time is more than this many minutes after Maghrib, treat as extreme (0 disables). */
  maxAngleMinutes: number;
  label: string;
}

/**
 * Automatic Isha rules by month, copied verbatim (semantically) from app.js.
 *
 * - May to August: approved high-latitude rule, Isha = Maghrib + 90 minutes.
 * - Other months: 15° angle when valid; otherwise the Maghrib-plus fallback.
 *
 * Indexed 1..12 (1 = January).
 */
export const DEFAULT_ISHA_MONTH_RULES: Record<number, IshaMonthRule> = {
  1: { mode: "anglePreferred", fallbackMinutes: 90, maxAngleMinutes: 240, label: "15° angle, with fallback only if extreme" },
  2: { mode: "anglePreferred", fallbackMinutes: 90, maxAngleMinutes: 240, label: "15° angle, with fallback only if extreme" },
  3: { mode: "anglePreferred", fallbackMinutes: 90, maxAngleMinutes: 220, label: "15° angle, with fallback only if extreme" },
  4: { mode: "anglePreferred", fallbackMinutes: 90, maxAngleMinutes: 180, label: "spring transition: 15° angle unless extreme" },
  5: { mode: "fixedAfterMaghrib", fallbackMinutes: 90, maxAngleMinutes: 0, label: "summer high-latitude: Maghrib + 90 minutes" },
  6: { mode: "fixedAfterMaghrib", fallbackMinutes: 90, maxAngleMinutes: 0, label: "summer high-latitude: Maghrib + 90 minutes" },
  7: { mode: "fixedAfterMaghrib", fallbackMinutes: 90, maxAngleMinutes: 0, label: "summer high-latitude: Maghrib + 90 minutes" },
  8: { mode: "fixedAfterMaghrib", fallbackMinutes: 90, maxAngleMinutes: 0, label: "summer high-latitude: Maghrib + 90 minutes" },
  9: { mode: "anglePreferred", fallbackMinutes: 90, maxAngleMinutes: 180, label: "autumn transition: 15° angle unless extreme" },
  10: { mode: "anglePreferred", fallbackMinutes: 90, maxAngleMinutes: 220, label: "15° angle, with fallback only if extreme" },
  11: { mode: "anglePreferred", fallbackMinutes: 90, maxAngleMinutes: 240, label: "15° angle, with fallback only if extreme" },
  12: { mode: "anglePreferred", fallbackMinutes: 90, maxAngleMinutes: 240, label: "15° angle, with fallback only if extreme" },
};

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const RAD = Math.PI / 180;
export const DEG = 180 / Math.PI;
export const MINUTES_PER_DAY = 1440;
export const ROOT_SEARCH_STEP_MINUTES = 5;
