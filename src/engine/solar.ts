/**
 * Solar/astronomical primitives, ported bit-for-bit from the eestiislamikeskus.org
 * app.js engine. These compute solar declination, equation of time, solar elevation,
 * solar noon, the asr shadow altitude, and the times (as local "minutes of day")
 * at which the sun crosses a given altitude.
 *
 * Time representation is identical to app.js: `localMinute` is minutes after local
 * midnight (0..1440) of the given civil date, and altitude/declination are in degrees.
 */

import {
  RAD,
  DEG,
  MINUTES_PER_DAY,
  ROOT_SEARCH_STEP_MINUTES,
} from "./config";
import type { City } from "./config";

/* ------------------------------------------------------------------ */
/* Julian day & solar coordinates (NOAA-style)                         */
/* ------------------------------------------------------------------ */

export function getJulianDay(date: Date): number {
  let year = date.getUTCFullYear();
  let month = date.getUTCMonth() + 1;
  const day =
    date.getUTCDate() +
    (date.getUTCHours() +
      date.getUTCMinutes() / 60 +
      date.getUTCSeconds() / 3600 +
      date.getUTCMilliseconds() / 3600000) /
      24;

  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);

  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    b -
    1524.5
  );
}

interface SolarCoordinates {
  declination: number;
  equationOfTime: number;
}

export function getSolarCoordinates(julianDay: number): SolarCoordinates {
  const t = (julianDay - 2451545.0) / 36525;
  const geometricMeanLongitude = normalizeDegrees(
    280.46646 + t * (36000.76983 + t * 0.0003032),
  );
  const geometricMeanAnomaly = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

  const meanAnomalyRad = geometricMeanAnomaly * RAD;
  const equationOfCenter =
    Math.sin(meanAnomalyRad) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * meanAnomalyRad) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * meanAnomalyRad) * 0.000289;

  const trueLongitude = geometricMeanLongitude + equationOfCenter;
  const omega = 125.04 - 1934.136 * t;
  const apparentLongitude = trueLongitude - 0.00569 - 0.00478 * Math.sin(omega * RAD);

  const meanObliquitySeconds = 21.448 - t * (46.8150 + t * (0.00059 - t * 0.001813));
  const meanObliquity = 23 + (26 + meanObliquitySeconds / 60) / 60;
  const correctedObliquity = meanObliquity + 0.00256 * Math.cos(omega * RAD);

  const declination =
    Math.asin(Math.sin(correctedObliquity * RAD) * Math.sin(apparentLongitude * RAD)) * DEG;

  const y = Math.tan((correctedObliquity * RAD) / 2) ** 2;
  const equationOfTime =
    4 *
      (y * Math.sin(2 * geometricMeanLongitude * RAD) -
        2 * eccentricity * Math.sin(meanAnomalyRad) +
        4 * eccentricity * y * Math.sin(meanAnomalyRad) * Math.cos(2 * geometricMeanLongitude * RAD) -
        0.5 * y * y * Math.sin(4 * geometricMeanLongitude * RAD) -
        1.25 * eccentricity * eccentricity * Math.sin(2 * meanAnomalyRad)) *
      DEG;

  return { declination, equationOfTime };
}

/* ------------------------------------------------------------------ */
/* Solar elevation & solar noon                                        */
/* ------------------------------------------------------------------ */

interface SolarCoordinatesAtLocalMinute {
  declination: number;
  equationOfTime: number;
  utcMinutes: number;
}

export function solarCoordinatesAtLocalMinute(
  year: number,
  month: number,
  day: number,
  localMinute: number,
  city: City,
): SolarCoordinatesAtLocalMinute {
  const localCivilMillis = Date.UTC(year, month - 1, day, 0, 0, 0) + localMinute * 60 * 1000;
  const localCivilDate = new Date(localCivilMillis);
  const localYear = localCivilDate.getUTCFullYear();
  const localMonth = localCivilDate.getUTCMonth() + 1;
  const localDay = localCivilDate.getUTCDate();
  const minuteOfDay =
    localCivilDate.getUTCHours() * 60 +
    localCivilDate.getUTCMinutes() +
    localCivilDate.getUTCSeconds() / 60 +
    localCivilDate.getUTCMilliseconds() / 60000;

  const utcMillis = utcMillisFromZonedLocal(localYear, localMonth, localDay, minuteOfDay, city.timeZone);
  const date = new Date(utcMillis);
  const julianDay = getJulianDay(date);
  const { declination, equationOfTime } = getSolarCoordinates(julianDay);

  const utcMinutes =
    date.getUTCHours() * 60 +
    date.getUTCMinutes() +
    date.getUTCSeconds() / 60 +
    date.getUTCMilliseconds() / 60000;

  return { declination, equationOfTime, utcMinutes };
}

export function solarElevation(
  year: number,
  month: number,
  day: number,
  localMinute: number,
  city: City,
): number {
  const { declination, equationOfTime, utcMinutes } = solarCoordinatesAtLocalMinute(
    year,
    month,
    day,
    localMinute,
    city,
  );

  const trueSolarTime = normalizeMinutesFloat(utcMinutes + equationOfTime + 4 * city.longitude);
  let hourAngle = trueSolarTime / 4 - 180;
  if (hourAngle < -180) hourAngle += 360;

  const latitudeRad = city.latitude * RAD;
  const declinationRad = declination * RAD;
  const hourAngleRad = hourAngle * RAD;

  return (
    Math.asin(
      Math.sin(latitudeRad) * Math.sin(declinationRad) +
        Math.cos(latitudeRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad),
    ) * DEG
  );
}

function trueSolarTimeDifference(
  year: number,
  month: number,
  day: number,
  localMinute: number,
  city: City,
): number {
  const { equationOfTime, utcMinutes } = solarCoordinatesAtLocalMinute(year, month, day, localMinute, city);
  const trueSolarTime = normalizeMinutesFloat(utcMinutes + equationOfTime + 4 * city.longitude);
  return circularDifference(trueSolarTime, 720);
}

export function solarNoon(year: number, month: number, day: number, city: City): number {
  let low = 600;
  let high = 900;
  let lowValue = trueSolarTimeDifference(year, month, day, low, city);

  for (let i = 0; i < 45; i += 1) {
    const middle = (low + high) / 2;
    const middleValue = trueSolarTimeDifference(year, month, day, middle, city);

    if (middleValue >= 0 === lowValue >= 0) {
      low = middle;
      lowValue = middleValue;
    } else {
      high = middle;
    }
  }

  return (low + high) / 2;
}

export function asrSolarAltitude(
  year: number,
  month: number,
  day: number,
  city: City,
  shadowFactor: number,
): number {
  const noon = solarNoon(year, month, day, city);
  const { declination } = solarCoordinatesAtLocalMinute(year, month, day, noon, city);
  const difference = Math.abs((city.latitude - declination) * RAD);
  return Math.atan(1 / (shadowFactor + Math.tan(difference))) * DEG;
}

/* ------------------------------------------------------------------ */
/* Altitude-crossing root finding (bisection refinement)               */
/* ------------------------------------------------------------------ */

export function timeAtSolarAltitude(
  year: number,
  month: number,
  day: number,
  city: City,
  altitude: number,
  partOfDay: "morning" | "afternoon",
): number | null {
  const roots = findAltitudeCrossingsInWindow(year, month, day, city, altitude, 0, MINUTES_PER_DAY);
  if (!roots.length) return null;

  const noon = solarNoon(year, month, day, city);

  if (partOfDay === "morning") {
    const morningRoots = roots.filter((root) => root < noon);
    return morningRoots.length ? morningRoots[morningRoots.length - 1] : null;
  }

  const afternoonRoots = roots.filter((root) => root > noon);
  return afternoonRoots.length ? afternoonRoots[0] : null;
}

export function firstAltitudeCrossingInWindow(
  year: number,
  month: number,
  day: number,
  city: City,
  altitude: number,
  startMinute: number,
  endMinute: number,
): number | null {
  const roots = findAltitudeCrossingsInWindow(year, month, day, city, altitude, startMinute, endMinute);
  return roots.find((root) => root > startMinute + 0.01) ?? null;
}

function findAltitudeCrossingsInWindow(
  year: number,
  month: number,
  day: number,
  city: City,
  altitude: number,
  startMinute: number,
  endMinute: number,
): number[] {
  const roots: number[] = [];
  const step = ROOT_SEARCH_STEP_MINUTES;
  let previousTime = startMinute;
  let previousValue = solarElevation(year, month, day, previousTime, city) - altitude;

  for (let time = startMinute + step; time <= endMinute + 0.0001; time += step) {
    const currentTime = Math.min(time, endMinute);
    const currentValue = solarElevation(year, month, day, currentTime, city) - altitude;
    const crosses =
      previousValue === 0 ||
      currentValue === 0 ||
      (previousValue < 0 && currentValue > 0) ||
      (previousValue > 0 && currentValue < 0);

    if (crosses) {
      const root = refineAltitudeRoot(year, month, day, city, altitude, previousTime, currentTime, previousValue);
      if (root >= startMinute - 0.001 && root <= endMinute + 0.001 && !isDuplicateRoot(roots, root)) {
        roots.push(root);
      }
    }

    if (currentTime >= endMinute) break;
    previousTime = currentTime;
    previousValue = currentValue;
  }

  return roots;
}

function refineAltitudeRoot(
  year: number,
  month: number,
  day: number,
  city: City,
  altitude: number,
  low: number,
  high: number,
  lowValue: number,
): number {
  if (Math.abs(lowValue) < 1e-10) return low;

  let left = low;
  let right = high;
  let leftValue = lowValue;

  for (let i = 0; i < 45; i += 1) {
    const middle = (left + right) / 2;
    const middleValue = solarElevation(year, month, day, middle, city) - altitude;

    if (Math.abs(middleValue) < 1e-10) return middle;

    if ((middleValue >= 0) === (leftValue >= 0)) {
      left = middle;
      leftValue = middleValue;
    } else {
      right = middle;
    }
  }

  return (left + right) / 2;
}

function isDuplicateRoot(roots: number[], root: number): boolean {
  return roots.some((existing) => Math.abs(existing - root) < 1);
}

/* ------------------------------------------------------------------ */
/* Timezone helpers                                                    */
/* ------------------------------------------------------------------ */

const TIME_ZONE_PART_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

export function utcMillisFromZonedLocal(
  year: number,
  month: number,
  day: number,
  minuteOfDay: number,
  timeZone: string,
): number {
  const localCivilMillis = Date.UTC(year, month - 1, day, 0, 0, 0) + minuteOfDay * 60 * 1000;
  const fallbackOffsetMinutes = fallbackUtcOffsetMinutesAtLocalMinute(year, month, day, minuteOfDay, timeZone);
  let utcMillis = localCivilMillis - fallbackOffsetMinutes * 60 * 1000;

  for (let i = 0; i < 5; i += 1) {
    const offsetMinutes = timeZoneOffsetMinutesAtUtc(utcMillis, timeZone);
    if (!Number.isFinite(offsetMinutes)) break;

    const nextUtcMillis = localCivilMillis - offsetMinutes * 60 * 1000;
    if (Math.abs(nextUtcMillis - utcMillis) < 1) return nextUtcMillis;
    utcMillis = nextUtcMillis;
  }

  return utcMillis;
}

function timeZoneOffsetMinutesAtUtc(utcMillis: number, timeZone: string): number {
  try {
    let formatter = TIME_ZONE_PART_FORMATTERS.get(timeZone);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      TIME_ZONE_PART_FORMATTERS.set(timeZone, formatter);
    }

    const parts = formatter.formatToParts(new Date(utcMillis));
    const values: Record<string, number> = {};
    parts.forEach((part) => {
      if (part.type !== "literal") values[part.type] = Number(part.value);
    });

    if (![values.year, values.month, values.day, values.hour, values.minute, values.second].every(Number.isFinite)) {
      return NaN;
    }

    const zonedMillisAsUtc = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second,
    );

    const utcMillisRoundedToSecond = Math.floor(utcMillis / 1000) * 1000;
    return Math.round((zonedMillisAsUtc - utcMillisRoundedToSecond) / 60000);
  } catch {
    return NaN;
  }
}

function fallbackUtcOffsetMinutesAtLocalMinute(
  year: number,
  month: number,
  day: number,
  minuteOfDay: number,
  timeZone: string,
): number {
  if (timeZone === "Europe/Tallinn") {
    return estoniaUtcOffsetHoursAtLocalMinute(year, month, day, minuteOfDay) * 60;
  }
  return 0;
}

/** EEA/EET rule for Estonia (DST last Sun of March → last Sun of October). */
function estoniaUtcOffsetHoursAtLocalMinute(year: number, month: number, day: number, minuteOfDay: number): number {
  const marchSwitch = lastSundayOfMonth(year, 3);
  const octoberSwitch = lastSundayOfMonth(year, 10);

  if (month > 3 && month < 10) return 3;
  if (month < 3 || month > 10) return 2;

  if (month === 3) {
    if (day < marchSwitch) return 2;
    if (day > marchSwitch) return 3;
    return minuteOfDay >= 180 ? 3 : 2;
  }

  if (day < octoberSwitch) return 3;
  if (day > octoberSwitch) return 2;
  return minuteOfDay >= 240 ? 2 : 3;
}

function lastSundayOfMonth(year: number, month: number): number {
  const lastDay = daysInMonth(year, month);
  const weekday = new Date(Date.UTC(year, month - 1, lastDay)).getUTCDay();
  return lastDay - weekday;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(year: number, month: number, day: number, amount: number): { year: number; month: number; day: number } {
  const date = new Date(Date.UTC(year, month - 1, day + amount, 12));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/* ------------------------------------------------------------------ */
/* Small math helpers shared across the engine                         */
/* ------------------------------------------------------------------ */

export function minutesForward(start: number, end: number): number {
  let diff = end - start;
  while (diff <= 0) diff += MINUTES_PER_DAY;
  return diff;
}

export function normalizeMinutes(value: number): number {
  return ((Math.round(value) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export function normalizeMinutesFloat(value: number): number {
  return ((value % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

export function circularDifference(value: number, target: number): number {
  return ((value - target + MINUTES_PER_DAY / 2) % MINUTES_PER_DAY) - MINUTES_PER_DAY / 2;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
