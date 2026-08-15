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

/**
 * Monthly timetable for a given (year, month).
 *
 * Computing a full month is expensive (31 days × the astronomical engine ≈ 1s of JS),
 * so it is (a) cached in memory per settings/month key and (b) computed OFF the render
 * path — switching to the Month tab mounts instantly and shows a skeleton until the
 * table is ready. Cached months render with zero delay.
 */
const monthCache = new Map<string, MonthTimetable>();

export function useMonthTimetable(
  year: number,
  month: number,
): { timetable: MonthTimetable | null; loading: boolean } {
  const location = useSettings((s) => s.location);
  const method = useSettings((s) => s.method);
  const ishaMonthRules = useSettings((s) => s.ishaMonthRules);
  const clock = useSettings((s) => s.clock);
  const city = useMemo(() => resolveCity(location), [location]);

  const key = `${city.key}|${city.latitude},${city.longitude}|${city.timeZone}|${JSON.stringify(method)}|${JSON.stringify(ishaMonthRules)}|${clock}|${year}-${month}`;

  const [entry, setEntry] = useState<{ key: string; timetable: MonthTimetable | null }>(() => ({
    key,
    timetable: monthCache.get(key) ?? null,
  }));

  useEffect(() => {
    if (entry.key === key && entry.timetable) return;

    const cached = monthCache.get(key);
    if (cached) {
      setEntry({ key, timetable: cached });
      return;
    }

    // Not cached: show skeleton, compute off the render path.
    setEntry({ key, timetable: null });
    let cancelled = false;
    const id = setTimeout(() => {
      const tt = getMonthTimetable(year, month, city, method, ishaMonthRules, clock === "24h");
      if (cancelled) return;
      if (monthCache.size > 24) monthCache.clear();
      monthCache.set(key, tt);
      setEntry({ key, timetable: tt });
    }, 30);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, year, month, city, method, ishaMonthRules, clock]);

  const current = entry.key === key;
  return {
    timetable: current ? entry.timetable : null,
    loading: !current || !entry.timetable,
  };
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

  // Tomorrow's Fajr only changes with the date/settings — compute it once per day,
  // NOT on every 1s tick (it runs the full astronomical engine).
  const tomorrowFajr = useMemo(() => {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const location = resolveCity(useSettings.getState().location);
    const method = useSettings.getState().method;
    const ishaMonthRules = useSettings.getState().ishaMonthRules;
    return calculatePrayerTimes(
      tomorrow.getFullYear(),
      tomorrow.getMonth() + 1,
      tomorrow.getDate(),
      location,
      { method, ishaMonthRules },
    ).fajr.time;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, city]);

  const next = useMemo(() => {
    const nowMinutes = localMinutesOfDay(now);
    return getNextPrayer(today.times, nowMinutes, tomorrowFajr + 1440);
  }, [now, today, tomorrowFajr]);

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
