/**
 * Build the widget data snapshot from current settings + engine output.
 * Pure function so it can be unit-tested independently of the widget renderer.
 *
 * Computes both the NEXT upcoming prayer (with countdown) and the ACTIVE prayer
 * (the most recent one that has begun — "stay in time" behavior), so the compact
 * widget can keep showing the current prayer once it starts.
 */

import { useSettings, resolveCity } from "@/store/settings";
import {
  getTimesForDay,
  getNextPrayer,
  calculatePrayerTimes,
  formatPrayerTime,
  formatCountdown,
  PRAYER_META,
} from "@/engine";
import type { PrayerKey } from "@/engine";
import { localMinutesOfDay } from "@/hooks/use-prayer-data";
import type { WidgetData } from "./types";

interface PrayerEntry {
  key: Exclude<PrayerKey, "sunrise">;
  label: string;
  minutes: number;
}

/** All prayers for today (sunrise excluded — it's not a prayer). */
function prayerEntries(times: ReturnType<typeof getTimesForDay>["times"]): PrayerEntry[] {
  return [
    { key: "fajr", label: PRAYER_META.fajr.label, minutes: times.fajr.time },
    { key: "dhuhr", label: PRAYER_META.dhuhr.label, minutes: times.dhuhr },
    { key: "asr", label: PRAYER_META.asr.label, minutes: times.asr ?? times.maghrib },
    { key: "maghrib", label: PRAYER_META.maghrib.label, minutes: times.maghrib },
    { key: "isha", label: PRAYER_META.isha.label, minutes: times.isha.time },
  ];
}

export function buildWidgetData(now: Date = new Date()): WidgetData {
  const state = useSettings.getState();
  const city = resolveCity(state.location);
  const use24h = state.clock === "24h";

  const day = getTimesForDay(now.getFullYear(), now.getMonth() + 1, now.getDate(), city, state.method, state.ishaMonthRules);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowTimes = calculatePrayerTimes(
    tomorrow.getFullYear(),
    tomorrow.getMonth() + 1,
    tomorrow.getDate(),
    city,
    { method: state.method, ishaMonthRules: state.ishaMonthRules },
  );

  const nowMinutes = localMinutesOfDay(now);
  const next = getNextPrayer(day.times, nowMinutes, tomorrowTimes.fajr.time + 1440);
  const entries = prayerEntries(day.times);

  // The active prayer is the most recent one whose time has passed today.
  // (If none have passed yet today — before Fajr — the active is yesterday's Isha,
  //  shown as a sensible fallback.)
  const passedToday = entries.filter((e) => e.minutes <= nowMinutes);
  const active = passedToday.length
    ? passedToday[passedToday.length - 1]
    : { key: "isha" as const, label: PRAYER_META.isha.label, minutes: entries[4].minutes };

  const activeElapsedMin = Math.max(0, Math.round(nowMinutes - active.minutes));

  // Build the display rows (all five prayers + sunrise), marking next & active.
  const withSunrise = [
    { key: "fajr", label: PRAYER_META.fajr.label, minutes: day.times.fajr.time, display: true },
    { key: "sunrise", label: PRAYER_META.sunrise.label, minutes: day.times.sunrise ?? 0, display: true },
    { key: "dhuhr", label: PRAYER_META.dhuhr.label, minutes: day.times.dhuhr, display: true },
    { key: "asr", label: PRAYER_META.asr.label, minutes: day.times.asr ?? day.times.maghrib, display: true },
    { key: "maghrib", label: PRAYER_META.maghrib.label, minutes: day.times.maghrib, display: true },
    { key: "isha", label: PRAYER_META.isha.label, minutes: day.times.isha.time, display: true },
  ];

  const prayers = withSunrise.map((p) => ({
    label: p.label,
    time: formatPrayerTime(p.minutes, "round", use24h),
    isNext: p.key === next.key,
    isActive: p.key === active.key,
  }));

  const hijriText = day.hijri ? `${day.hijri.day} ${day.hijri.month}` : "";
  const gregText = now.toLocaleDateString(undefined, { day: "numeric", month: "short" });

  return {
    cityLabel: city.label,
    hijri: hijriText,
    gregorian: gregText,
    nextLabel: PRAYER_META[next.key].label,
    nextTime: formatPrayerTime(next.minutes % 1440, "round", use24h),
    countdown: formatCountdown(next.minutesUntil),
    activeLabel: active.label,
    activeTime: formatPrayerTime(active.minutes % 1440, "round", use24h),
    activeElapsed: formatCountdown(activeElapsedMin),
    prayers,
  };
}
