/**
 * App theme. Accent green mirrors the Estonian Islamic Centre branding.
 * Supports light/dark; system preference is the default.
 */

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  text: string;
  textMuted: string;
  textInvert: string;
  border: string;
  accent: string;
  accentSoft: string;
  danger: string;
  warning: string;
  highlight: string;
  headerText: string;
  prayerActiveBg: string;
}

export const accent = "#1f8a4c";

export const light: ThemeColors = {
  bg: "#f6f7f5",
  surface: "#ffffff",
  surfaceAlt: "#f0f2ef",
  card: "#ffffff",
  text: "#14241b",
  textMuted: "#5b6b62",
  textInvert: "#ffffff",
  border: "#e2e6e1",
  accent,
  accentSoft: "#e4f3ea",
  danger: "#c0392b",
  warning: "#b9770e",
  highlight: "#fff7d6",
  headerText: "#0f1a14",
  prayerActiveBg: "#e4f3ea",
};

export const dark: ThemeColors = {
  bg: "#0e1410",
  surface: "#161e18",
  surfaceAlt: "#1c261f",
  card: "#19211b",
  text: "#eaf2ec",
  textMuted: "#9aa9a0",
  textInvert: "#0e1410",
  border: "#26302a",
  accent: "#3ec97a",
  accentSoft: "#16331f",
  danger: "#e57373",
  warning: "#e0a33b",
  highlight: "#3a3117",
  headerText: "#eaf2ec",
  prayerActiveBg: "#16331f",
};
