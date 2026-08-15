/**
 * Aurora design system — clean, modern, time-aware.
 *
 * Design principles:
 *  - Solid, elegant backgrounds (near-black / off-white). NO full-screen gradients —
 *    they wash out text and look muddy on device.
 *  - ONE accent color that subtly shifts with the active prayer period. This is the
 *    unique time-of-day idea, applied with restraint (accent + a faint tint only).
 *  - High, guaranteed contrast: text sits on solid surfaces, never on gradients.
 *  - Depth comes from soft shadows and surface elevation, not translucency.
 */

export interface PeriodAccent {
  id: PeriodId;
  label: string;
  /** The accent used for highlights, progress, and active states. */
  accent: string;
  /** A very faint tint of the accent for soft backgrounds (on dark: ~8%). */
  tint: string;
  /** On light surfaces, a slightly stronger tint (~12%). */
  tintStrong: string;
}

export type PeriodId =
  | "fajr"
  | "sunrise"
  | "dhuhr"
  | "asr"
  | "maghrib"
  | "isha"
  | "neutral";

export const PERIOD_ACCENTS: Record<PeriodId, PeriodAccent> = {
  fajr: { id: "fajr", label: "Fajr", accent: "#a78bfa", tint: "rgba(167,139,250,0.08)", tintStrong: "rgba(167,139,250,0.14)" },
  sunrise: { id: "sunrise", label: "Sunrise", accent: "#fbbf24", tint: "rgba(251,191,36,0.08)", tintStrong: "rgba(251,191,36,0.14)" },
  dhuhr: { id: "dhuhr", label: "Dhuhr", accent: "#60a5fa", tint: "rgba(96,165,250,0.08)", tintStrong: "rgba(96,165,250,0.14)" },
  asr: { id: "asr", label: "Asr", accent: "#fb923c", tint: "rgba(251,146,60,0.08)", tintStrong: "rgba(251,146,60,0.14)" },
  maghrib: { id: "maghrib", label: "Maghrib", accent: "#f472b6", tint: "rgba(244,114,182,0.08)", tintStrong: "rgba(244,114,182,0.14)" },
  isha: { id: "isha", label: "Isha", accent: "#818cf8", tint: "rgba(129,140,248,0.08)", tintStrong: "rgba(129,140,248,0.14)" },
  neutral: { id: "neutral", label: "", accent: "#3ec97a", tint: "rgba(62,201,122,0.08)", tintStrong: "rgba(62,201,122,0.14)" },
};

/** Resolve the active period accent from the current minutes-of-day + today's times. */
export function accentForTime(
  minutesOfDay: number,
  times: { fajr: number; sunrise: number; dhuhr: number; asr: number; maghrib: number; isha: number },
): PeriodAccent {
  const order: { key: PeriodId; at: number }[] = [
    { key: "isha", at: times.isha },
    { key: "maghrib", at: times.maghrib },
    { key: "asr", at: times.asr },
    { key: "dhuhr", at: times.dhuhr },
    { key: "sunrise", at: times.sunrise },
    { key: "fajr", at: times.fajr },
  ];
  for (const { key, at } of order) {
    if (key === "isha" && (minutesOfDay >= at || minutesOfDay < times.fajr)) {
      return PERIOD_ACCENTS.isha;
    }
    if (minutesOfDay >= at) return PERIOD_ACCENTS[key];
  }
  return PERIOD_ACCENTS.isha;
}
