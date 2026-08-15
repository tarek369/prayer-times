/**
 * Clean modern theme — dark-first with a light variant.
 * Solid surfaces, guaranteed contrast, depth via soft shadows.
 * The time-adaptive accent is applied at the component level via accentForTime().
 */

import { PERIOD_ACCENTS } from "./palettes";

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  text: string;
  textMuted: string;
  textFaint: string;
  textInvert: string;
  border: string;
  accent: string;
  accentSoft: string;
  danger: string;
  warning: string;
  highlight: string;
  headerText: string;
  prayerActiveBg: string;
  /** Soft shadow for elevated cards. */
  shadow: { shadowColor: string; shadowOpacity: number; shadowRadius: number; elevation: number };
}

const N = PERIOD_ACCENTS.neutral;

export const dark: ThemeColors = {
  bg: "#0B0F14",
  surface: "#131A22",
  surfaceAlt: "#18212B",
  card: "#151D26",
  text: "#F2F5F8",
  textMuted: "#8E9BA8",
  textFaint: "#5A6672",
  textInvert: "#0B0F14",
  border: "#1F2A35",
  accent: N.accent,
  accentSoft: N.tintStrong,
  danger: "#F87171",
  warning: "#FBBF24",
  highlight: N.tintStrong,
  headerText: "#F2F5F8",
  prayerActiveBg: N.tintStrong,
  shadow: { shadowColor: "#000000", shadowOpacity: 0.35, shadowRadius: 16, elevation: 6 },
};

export const light: ThemeColors = {
  bg: "#F6F7F9",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF1F4",
  card: "#FFFFFF",
  text: "#0E1620",
  textMuted: "#5C6B7A",
  textFaint: "#9AA7B4",
  textInvert: "#FFFFFF",
  border: "#E5E9EE",
  accent: "#1F8A4C",
  accentSoft: "rgba(31,138,76,0.10)",
  danger: "#DC2626",
  warning: "#B45309",
  highlight: "rgba(31,138,76,0.10)",
  headerText: "#0E1620",
  prayerActiveBg: "rgba(31,138,76,0.10)",
  shadow: { shadowColor: "#0E1620", shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
};

export const accent = N.accent;
