/**
 * Shared prayer-time data hooks. These read the settings store and produce
 * the engine outputs the UI consumes (today's times, next prayer, monthly table).
 *
 * The countdown ticks every second so the "next prayer in Xh Ym" display stays live.
 */

import { useMemo, useEffect, useState, useCallback } from "react";

import {
  getTimesForDay,
  getMonthTimetable,
  getNextPrayer,
  calculatePrayerTimes,
  type City,
  type MonthTimetable,
  type PrayerDay,
  type NextPrayer,
} from "@/engine";
import { useSettings, resolveCity } from "@/store/settings";

/** "Minutes of day" for the given date in its local timezone. */
export function localMinutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

/** Today's prayer times, recomputed when settings or date change. */
export function useToday(now: Date = new Date()): { day: PrayerDay; city: City } {
  const location = useSettings((s) => s.location);
  const method = useSettings((s) => s.method);
  const ishaMonthRules = useSettings((s) => s.ishaMonthRules);
  const city = useMemo(() => resolveCity(location), [location]);

  return useMemo(() => {
    const day = getTimesForDay(now.getFullYear(), now.getMonth() + 1, now.getDate(), city, method, ishaMonthRules);
    return { day, city };
  }, [city, method, ishaMonthRules, now.getFullYear(), now.getMonth() + 1, now.getDate()]);
}

/** Monthly timetable for a given (year, month), recomputed on settings change. */
export function useMonthTimetable(year: number, month: number): MonthTimetable {
  const location = useSettings((s) => s.location);
  const method = useSettings((s) => s.method);
  const ishaMonthRules = useSettings((s) => s.ishaMonthRules);
  const clock = useSettings((s) => s.clock);
  const city = useMemo(() => resolveCity(location), [location]);

  return useMemo(
    () => getMonthTimetable(year, month, city, method, ishaMonthRules, clock === "24h"),
    [city, method, ishaMonthRules, clock, year, month],
  );
}

/** Live next-prayer countdown. Re-renders every `intervalMs` (default 1s). */
export function useNextPrayer(intervalMs = 1000): {
  now: Date;
  next: NextPrayer;
  today: PrayerDay;
  city: City;
} {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  const { day: today, city } = useToday(now);

  const next = useMemo(() => {
    const nowMinutes = localMinutesOfDay(now);
    // Pre-compute tomorrow's Fajr for day-rollover handling.
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const location = resolveCity(useSettings.getState().location);
    const method = useSettings.getState().method;
    const ishaMonthRules = useSettings.getState().ishaMonthRules;
    const tomorrowTimes = calculatePrayerTimes(
      tomorrow.getFullYear(),
      tomorrow.getMonth() + 1,
      tomorrow.getDate(),
      location,
      { method, ishaMonthRules },
    );
    return getNextPrayer(today.times, nowMinutes, tomorrowTimes.fajr.time + 1440);
  }, [now, today]);

  return { now, next, today, city };
}

/** Resolved city + clock format, for screens that don't need live data. */
export function useResolvedCity(): { city: City; use24h: boolean } {
  const location = useSettings((s) => s.location);
  const clock = useSettings((s) => s.clock);
  const city = useMemo(() => resolveCity(location), [location]);
  return { city, use24h: clock === "24h" };
}

/** Memoized list of (key, label, formattedTime) for the five prayers + sunrise. */
export function usePrayerList() {
  const { now } = useNextPrayer();
  const { day } = useToday(now);
  const clock = useSettings((s) => s.clock);

  return useCallback(() => {
    const use24h = clock === "24h";
    return day;
  }, [day, clock])();
}
