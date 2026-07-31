/**
 * Celestial design system — time-of-day adaptive palettes.
 *
 * The signature idea of this app: the entire color world shifts with the active prayer
 * period, so users FEEL the time of day. Five palettes map to the five prayer windows:
 *
 *   Fajr   → pre-dawn indigo (deep night easing toward light)
 *   Sunrise→ dawn rose/gold
 *   Dhuhr  → midday sky blue, bright and open
 *   Asr    → warm amber, lengthening shadows
 *   Maghrib→ twilight purple/magenta, sunset
 *   Isha   → deep night navy, stars
 *
 * Each period defines a gradient (background sky), an accent, and text contrast rules.
 * A "neutral" palette is the fallback before Fajr or for screens that shouldn't shift.
 */

export interface PeriodPalette {
  /** Stable id for this period. */
  id: PeriodId;
  label: string;
  /** Background gradient stops (top → bottom), for the "sky". */
  sky: [string, string, string];
  /** Primary accent (countdown ring, active highlights). */
  accent: string;
  /** Soft accent tint for chips/pills. */
  accentSoft: string;
  /** Foreground text on the gradient (always high-contrast). */
  onSky: string;
  /** Muted text on the gradient. */
  onSkyMuted: string;
  /** Card surface (translucent glass over the gradient). */
  glassSurface: string;
  /** Card border. */
  glassBorder: string;
  /** Star/cloud particle tint for the sky decoration. */
  particle: string;
}

export type PeriodId =
  | "fajr"
  | "sunrise"
  | "dhuhr"
  | "asr"
  | "maghrib"
  | "isha"
  | "neutral";

export const PERIOD_PALETTES: Record<PeriodId, PeriodPalette> = {
  fajr: {
    id: "fajr",
    label: "Fajr",
    sky: ["#1a1140", "#2d1b5e", "#4a2c7a"],
    accent: "#a78bfa",
    accentSoft: "rgba(167,139,250,0.18)",
    onSky: "#f5f3ff",
    onSkyMuted: "#c4b8e0",
    glassSurface: "rgba(30,20,55,0.45)",
    glassBorder: "rgba(167,139,250,0.25)",
    particle: "rgba(255,255,255,0.7)",
  },
  sunrise: {
    id: "sunrise",
    label: "Sunrise",
    sky: ["#3d2a5e", "#a85c5e", "#f4a261"],
    accent: "#ffd166",
    accentSoft: "rgba(255,209,102,0.18)",
    onSky: "#fff8ee",
    onSkyMuted: "#f3d8b0",
    glassSurface: "rgba(70,40,60,0.4)",
    glassBorder: "rgba(255,209,102,0.3)",
    particle: "rgba(255,240,200,0.6)",
  },
  dhuhr: {
    id: "dhuhr",
    label: "Dhuhr",
    sky: ["#1e3a8a", "#2563eb", "#60a5fa"],
    accent: "#fbbf24",
    accentSoft: "rgba(251,191,36,0.18)",
    onSky: "#f0f7ff",
    onSkyMuted: "#bcd5f7",
    glassSurface: "rgba(20,50,110,0.4)",
    glassBorder: "rgba(96,165,250,0.3)",
    particle: "rgba(255,255,255,0.5)",
  },
  asr: {
    id: "asr",
    label: "Asr",
    sky: ["#3a2a12", "#8b5a2b", "#d4a44a"],
    accent: "#fb923c",
    accentSoft: "rgba(251,146,60,0.18)",
    onSky: "#fff7ed",
    onSkyMuted: "#e8c9a0",
    glassSurface: "rgba(60,42,18,0.42)",
    glassBorder: "rgba(251,146,60,0.3)",
    particle: "rgba(255,220,170,0.5)",
  },
  maghrib: {
    id: "maghrib",
    label: "Maghrib",
    sky: ["#2d1b3d", "#8b3a62", "#e63946"],
    accent: "#f472b6",
    accentSoft: "rgba(244,114,182,0.18)",
    onSky: "#fff0f6",
    onSkyMuted: "#e8b8cf",
    glassSurface: "rgba(55,25,50,0.45)",
    glassBorder: "rgba(244,114,182,0.3)",
    particle: "rgba(255,200,220,0.5)",
  },
  isha: {
    id: "isha",
    label: "Isha",
    sky: ["#0a0e27", "#111936", "#1a2150"],
    accent: "#818cf8",
    accentSoft: "rgba(129,140,248,0.18)",
    onSky: "#eef2ff",
    onSkyMuted: "#9aa5d8",
    glassSurface: "rgba(15,20,45,0.5)",
    glassBorder: "rgba(129,140,248,0.25)",
    particle: "rgba(255,255,255,0.8)",
  },
  neutral: {
    id: "neutral",
    label: "",
    sky: ["#0e1410", "#16241b", "#1f2e23"],
    accent: "#3ec97a",
    accentSoft: "rgba(62,201,122,0.16)",
    onSky: "#eaf2ec",
    onSkyMuted: "#9aa9a0",
    glassSurface: "rgba(25,33,27,0.45)",
    glassBorder: "rgba(62,201,122,0.22)",
    particle: "rgba(255,255,255,0.4)",
  },
};

/**
 * Resolve the active period palette from the current "minutes of day".
 * The period is the most recent prayer/sunrise window the day is currently in:
 *   < sunrise → fajr
 *   sunrise..dhuhr → sunrise
 *   dhuhr..asr → dhuhr
 *   asr..maghrib → asr
 *   maghrib..isha → maghrib
 *   >= isha → isha
 */
export function paletteForTime(
  minutesOfDay: number,
  times: {
    fajr: number;
    sunrise: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
  },
): PeriodPalette {
  const order: { key: PeriodId; at: number }[] = [
    { key: "isha", at: times.isha },
    { key: "maghrib", at: times.maghrib },
    { key: "asr", at: times.asr },
    { key: "dhuhr", at: times.dhuhr },
    { key: "sunrise", at: times.sunrise },
    { key: "fajr", at: times.fajr },
  ];
  for (const { key, at } of order) {
    // Isha can land just after midnight; treat anything >= isha (or after-midnight
    // before fajr) as isha period.
    if (key === "isha" && (minutesOfDay >= at || minutesOfDay < times.fajr)) {
      return PERIOD_PALETTES.isha;
    }
    if (minutesOfDay >= at) {
      return PERIOD_PALETTES[key];
    }
  }
  // Before Fajr (very late night) → Isha period.
  return PERIOD_PALETTES.isha;
}
