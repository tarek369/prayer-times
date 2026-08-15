/**
 * Resolve the active theme with the LIVE time-of-day accent.
 *
 * The accent (and its soft tint) shifts with the current prayer period — the same
 * idea the Today screen introduced, now applied globally so the tab bar, Month
 * screen, and every shared component change color together as the day progresses.
 *
 * Implementation notes:
 *  - Prayer times for "today" are computed once per (date + settings) and cached at
 *    module level, so any number of components calling useTheme() share one engine run.
 *  - The period is resolved from the current wall-clock at each render (cheap); no
 *    ticking interval — screens re-render on navigation/interaction often enough.
 *  - Period accents are tuned for dark surfaces. On light theme the accent is
 *    darkened ~20% to keep contrast on white.
 */

import { useColorScheme } from "@/hooks/use-color-scheme";
import { light, dark, type ThemeColors } from "@/theme";
import { accentForTime, type PeriodAccent } from "@/theme/palettes";
import { useSettings, resolveCity } from "@/store/settings";
import { calculatePrayerTimes } from "@/engine";

interface DayTimes {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

const dayTimesCache = new Map<string, DayTimes>();

function todayTimes(): { times: DayTimes; period: PeriodAccent } {
  const state = useSettings.getState();
  const city = resolveCity(state.location);
  const now = new Date();
  const key = `${city.key}|${city.latitude},${city.longitude}|${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}|${JSON.stringify(state.method)}|${JSON.stringify(state.ishaMonthRules)}`;

  let times = dayTimesCache.get(key);
  if (!times) {
    const t = calculatePrayerTimes(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
      city,
      { method: state.method, ishaMonthRules: state.ishaMonthRules },
    );
    times = {
      fajr: t.fajr.time,
      sunrise: t.sunrise ?? t.fajr.time + 90,
      dhuhr: t.dhuhr,
      asr: t.asr ?? t.maghrib,
      maghrib: t.maghrib,
      isha: t.isha.time,
    };
    if (dayTimesCache.size > 8) dayTimesCache.clear();
    dayTimesCache.set(key, times);
  }

  const minutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  return { times, period: accentForTime(minutes, times) };
}

/** Darken a #rrggbb color by a fraction (for light-surface contrast). */
function darken(hex: string, fraction: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - fraction));
  const g = Math.round(((n >> 8) & 255) * (1 - fraction));
  const b = Math.round((n & 255) * (1 - fraction));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function useTheme(): ThemeColors & { isDark: boolean; period: PeriodAccent } {
  const mode = useSettings((s) => s.theme);
  const system = useColorScheme();
  // Subscribe to the inputs that invalidate the cached day-times (via re-render).
  useSettings((s) => s.location);
  useSettings((s) => s.method);
  useSettings((s) => s.ishaMonthRules);

  const isDark = mode === "dark" || (mode === "system" && system === "dark");
  const { period } = todayTimes();

  const accentColor = isDark ? period.accent : darken(period.accent, 0.2);
  const soft = isDark ? period.tintStrong : period.tint;

  const base = isDark ? dark : light;
  return {
    ...base,
    isDark,
    period,
    accent: accentColor,
    accentSoft: soft,
    highlight: soft,
    prayerActiveBg: soft,
  };
}
