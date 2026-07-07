/**
 * Prayer-time calculation core, ported bit-for-bit from the eestiislamikeskus.org app.js.
 *
 * Times are returned as "minutes of day" (0..1440) in local civil time, exactly as in
 * app.js. This module owns Fajr and Isha (with the high-latitude guards, night-portion
 * fallbacks, and safety caps); sunrise/dhuhr/asr/maghrib are computed directly from the
 * solar primitives.
 */

import type { City, MethodConfig, IshaMonthRule } from "./config";
import { DEFAULT_ISHA_MONTH_RULES, DEFAULT_METHOD, MINUTES_PER_DAY } from "./config";
import {
  timeAtSolarAltitude,
  solarNoon,
  asrSolarAltitude,
  firstAltitudeCrossingInWindow,
  addDays,
  minutesForward,
  clamp,
} from "./solar";

export type FajrRuleType = "angle" | "guard" | "nightPortion" | "fallback" | "safety" | string;
export type IshaRuleType = "angle" | "fallback" | "monthFixed" | "safetyCap" | string;

export interface FajrResult {
  time: number;
  rule: string;
  ruleType: FajrRuleType;
}

export interface IshaResult {
  time: number;
  rule: string;
  ruleType: IshaRuleType;
  minutesAfterMaghrib: number;
}

export interface PrayerTimes {
  fajr: FajrResult;
  sunrise: number | null;
  dhuhr: number;
  asr: number | null;
  maghrib: number;
  isha: IshaResult;
}

export interface CalculateOptions {
  method?: MethodConfig;
  ishaMonthRules?: Record<number, IshaMonthRule>;
}

/* ------------------------------------------------------------------ */
/* Entry point: all five prayers for a given date                      */
/* ------------------------------------------------------------------ */

export function calculatePrayerTimes(
  year: number,
  month: number,
  day: number,
  city: City,
  options: CalculateOptions = {},
): PrayerTimes {
  const method = options.method ?? DEFAULT_METHOD;
  const ishaMonthRules = options.ishaMonthRules ?? DEFAULT_ISHA_MONTH_RULES;

  const sunrise = timeAtSolarAltitude(year, month, day, city, method.sunriseSunsetAltitude, "morning");
  const sunset = timeAtSolarAltitude(year, month, day, city, method.sunriseSunsetAltitude, "afternoon");
  const dhuhr = solarNoon(year, month, day, city) + method.dhuhrOffsetMinutes;
  const asrAltitude = asrSolarAltitude(year, month, day, city, method.asrShadowFactor);
  const asr = timeAtSolarAltitude(year, month, day, city, asrAltitude, "afternoon");
  const maghrib = (sunset ?? 0) + method.maghribOffsetMinutes;
  const fajr = calculateFajr(year, month, day, city, sunrise ?? 0, method);
  const isha = calculateIsha(year, month, day, city, maghrib, { method, ishaMonthRules });

  return { fajr, sunrise, dhuhr, asr, maghrib, isha };
}

/* ------------------------------------------------------------------ */
/* Fajr                                                                */
/* ------------------------------------------------------------------ */

export function calculateFajr(
  year: number,
  month: number,
  day: number,
  city: City,
  sunrise: number,
  method: MethodConfig = DEFAULT_METHOD,
): FajrResult {
  const rawFajr = calculateFajrCore(year, month, day, city, sunrise, method);
  const previousDate = addDays(year, month, day, -1);
  const previousSunset = timeAtSolarAltitude(
    previousDate.year,
    previousDate.month,
    previousDate.day,
    city,
    method.sunriseSunsetAltitude,
    "afternoon",
  );

  if (previousSunset === null || sunrise === null) return rawFajr;

  const previousMaghrib = previousSunset + method.maghribOffsetMinutes;
  const previousIsha = calculateIsha(previousDate.year, previousDate.month, previousDate.day, city, previousMaghrib, {
    method,
    skipNextFajrSafety: true,
  });
  const previousIshaRelativeToToday = previousIsha.time - MINUTES_PER_DAY;
  const earliestAllowedFajr = previousIshaRelativeToToday + method.minGapMinutesBetweenIshaAndFajr;

  if (rawFajr.time < earliestAllowedFajr && earliestAllowedFajr < sunrise) {
    return {
      time: earliestAllowedFajr,
      rule: `${rawFajr.rule}; moved later to keep at least ${method.minGapMinutesBetweenIshaAndFajr} minutes after the previous Isha`,
      ruleType: rawFajr.ruleType === "angle" ? "safety" : `${rawFajr.ruleType}+safety`,
    };
  }

  return rawFajr;
}

function calculateFajrCore(
  year: number,
  month: number,
  day: number,
  city: City,
  sunrise: number,
  method: MethodConfig,
): FajrResult {
  const angleFajr = timeAtSolarAltitude(year, month, day, city, -method.fajrAngle, "morning");
  const guard = calculateFajrNightPortionGuard(year, month, day, city, sunrise, angleFajr === null, method);

  if (angleFajr !== null && sunrise !== null && angleFajr < sunrise) {
    if (guard && angleFajr < guard.time) {
      return {
        time: guard.time,
        rule: `High-latitude Fajr guard: 15° is earlier than the ${method.fajrAngle}/${method.highLatitudeDivisor} night portion, so Fajr = sunrise − ${formatDuration(guard.fajrPortion)}`,
        ruleType: "guard",
      };
    }

    return {
      time: angleFajr,
      rule: `Sun angle ${method.fajrAngle}°`,
      ruleType: "angle",
    };
  }

  if (guard) {
    return {
      time: guard.time,
      rule: `High-latitude Fajr: the sun does not reach ${method.fajrAngle}°, so Fajr = sunrise − ${formatDuration(guard.fajrPortion)} (${method.fajrAngle}/${method.highLatitudeDivisor} of the night)`,
      ruleType: "nightPortion",
    };
  }

  return {
    time: sunrise - 90,
    rule: "Fallback Fajr: sunrise minus 90 minutes because the previous night length could not be measured",
    ruleType: "fallback",
  };
}

interface FajrGuard {
  time: number;
  nightLength: number;
  fajrPortion: number;
  rawFajrPortion: number;
}

function calculateFajrNightPortionGuard(
  year: number,
  month: number,
  day: number,
  city: City,
  sunrise: number,
  applyBounds: boolean,
  method: MethodConfig,
): FajrGuard | null {
  const previousDate = addDays(year, month, day, -1);
  const previousSunset = timeAtSolarAltitude(
    previousDate.year,
    previousDate.month,
    previousDate.day,
    city,
    method.sunriseSunsetAltitude,
    "afternoon",
  );

  if (previousSunset === null || sunrise === null) return null;

  const previousMaghrib = previousSunset + method.maghribOffsetMinutes;
  const nightLength = minutesForward(previousMaghrib, sunrise);
  const rawFajrPortion = (nightLength * method.fajrAngle) / method.highLatitudeDivisor;
  let fajrPortion = rawFajrPortion;

  if (applyBounds) {
    const maxPortion = Math.min(method.fajrExtremeMaxMinutesBeforeSunrise, Math.max(1, nightLength - 1));
    const minPortion = Math.min(method.fajrExtremeMinMinutesBeforeSunrise, maxPortion);
    fajrPortion = clamp(rawFajrPortion, minPortion, maxPortion);
  }

  return {
    time: sunrise - fajrPortion,
    nightLength,
    fajrPortion,
    rawFajrPortion,
  };
}

/* ------------------------------------------------------------------ */
/* Isha                                                                */
/* ------------------------------------------------------------------ */

interface IshaOptions extends CalculateOptions {
  skipNextFajrSafety?: boolean;
}

export function calculateIsha(
  year: number,
  month: number,
  day: number,
  city: City,
  maghrib: number,
  options: IshaOptions = {},
): IshaResult {
  const method = options.method ?? DEFAULT_METHOD;
  const ishaMonthRules = options.ishaMonthRules ?? DEFAULT_ISHA_MONTH_RULES;
  const monthRule = getIshaMonthRule(month, ishaMonthRules);
  const fixedIsha = maghrib + monthRule.fallbackMinutes;
  let time = fixedIsha;
  let rule = `Monthly high-latitude rule: Isha = Maghrib + ${monthRule.fallbackMinutes} minutes`;
  let ruleType: IshaRuleType = monthRule.mode === "fixedAfterMaghrib" ? "monthFixed" : "fallback";

  if (monthRule.mode === "anglePreferred") {
    const angleResult = calculateIshaAngleResult(year, month, day, city, maghrib, method);
    const extremeByAngle = angleResult.time === null;
    const extremeByNight =
      angleResult.nightLength !== null && angleResult.nightLength < method.ishaExtremeNightThresholdMinutes;
    const extremeByLateAngle =
      angleResult.minutesAfterMaghrib !== null && angleResult.minutesAfterMaghrib > monthRule.maxAngleMinutes;

    if (!extremeByAngle && !extremeByNight && !extremeByLateAngle) {
      time = angleResult.time as number;
      rule = `Sun angle ${method.ishaAngle}°`;
      ruleType = "angle";
    } else {
      const reason = extremeByAngle
        ? `the sun does not reach ${method.ishaAngle}° before the next sunrise`
        : extremeByNight
          ? `the night is shorter than ${method.ishaExtremeNightThresholdMinutes} minutes`
          : `the ${method.ishaAngle}° time is ${Math.round(angleResult.minutesAfterMaghrib as number)} minutes after Maghrib`;
      rule = `High-latitude Isha fallback: ${reason}, so Isha = Maghrib + ${monthRule.fallbackMinutes} minutes`;
      ruleType = "fallback";
    }
  }

  if (!options.skipNextFajrSafety) {
    const capped = capIshaBeforeNextFajr(year, month, day, city, time, maghrib, method);
    if (capped.wasCapped) {
      return {
        time: capped.time,
        rule: `${rule}; safety cap keeps Isha at least ${method.minGapMinutesBetweenIshaAndFajr} minutes before next Fajr`,
        ruleType: "safetyCap",
        minutesAfterMaghrib: Math.round(capped.time - maghrib),
      };
    }
  }

  return {
    time,
    rule,
    ruleType,
    minutesAfterMaghrib: Math.round(time - maghrib),
  };
}

interface IshaAngleResult {
  time: number | null;
  minutesAfterMaghrib: number | null;
  nightLength: number | null;
}

function calculateIshaAngleResult(
  year: number,
  month: number,
  day: number,
  city: City,
  maghrib: number,
  method: MethodConfig,
): IshaAngleResult {
  const nextDate = addDays(year, month, day, 1);
  const nextSunrise = timeAtSolarAltitude(
    nextDate.year,
    nextDate.month,
    nextDate.day,
    city,
    method.sunriseSunsetAltitude,
    "morning",
  );

  const searchEnd = nextSunrise === null ? MINUTES_PER_DAY * 2 : nextSunrise + MINUTES_PER_DAY;
  const angleIsha = firstAltitudeCrossingInWindow(year, month, day, city, -method.ishaAngle, maghrib, searchEnd);

  return {
    time: angleIsha,
    minutesAfterMaghrib: angleIsha === null ? null : angleIsha - maghrib,
    nightLength: nextSunrise === null ? null : nextSunrise + MINUTES_PER_DAY - maghrib,
  };
}

function capIshaBeforeNextFajr(
  year: number,
  month: number,
  day: number,
  city: City,
  ishaTime: number,
  maghrib: number,
  method: MethodConfig,
): { time: number; wasCapped: boolean } {
  const nextDate = addDays(year, month, day, 1);
  const nextSunrise = timeAtSolarAltitude(
    nextDate.year,
    nextDate.month,
    nextDate.day,
    city,
    method.sunriseSunsetAltitude,
    "morning",
  );

  if (nextSunrise === null) return { time: ishaTime, wasCapped: false };

  const nextFajr = calculateFajrCore(nextDate.year, nextDate.month, nextDate.day, city, nextSunrise, method);
  const nextFajrRelativeToToday = MINUTES_PER_DAY + nextFajr.time;
  const latestAllowedIsha = nextFajrRelativeToToday - method.minGapMinutesBetweenIshaAndFajr;

  if (ishaTime > latestAllowedIsha && latestAllowedIsha > maghrib) {
    return { time: latestAllowedIsha, wasCapped: true };
  }

  return { time: ishaTime, wasCapped: false };
}

export function getIshaMonthRule(
  month: number,
  ishaMonthRules: Record<number, IshaMonthRule> = DEFAULT_ISHA_MONTH_RULES,
): IshaMonthRule {
  return (
    ishaMonthRules[month] || {
      mode: "fixedAfterMaghrib",
      fallbackMinutes: DEFAULT_METHOD.defaultExtremeIshaMinutes,
      maxAngleMinutes: 0,
      label: `Maghrib + ${DEFAULT_METHOD.defaultExtremeIshaMinutes} minutes`,
    }
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} minutes`;
  const hours = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}
