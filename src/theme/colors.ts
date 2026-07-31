/**
 * Theme colors. These now map the celestial design system (see palettes.ts) onto the
 * flat ThemeColors shape that the older primitives/components consume. The "neutral"
 * celestial palette is used as the base; light/dark is honored for components that
 * still key off the old light/dark distinction.
 */

import { PERIOD_PALETTES } from "./palettes";

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

export const accent = "#3ec97a";

// The celestial neutral palette drives the base look for non-time-aware screens.
const N = PERIOD_PALETTES.neutral;

export const light: ThemeColors = {
  bg: N.sky[0],
  surface: N.glassSurface,
  surfaceAlt: "rgba(255,255,255,0.05)",
  card: N.glassSurface,
  text: N.onSky,
  textMuted: N.onSkyMuted,
  textInvert: N.sky[0],
  border: N.glassBorder,
  accent: N.accent,
  accentSoft: N.accentSoft,
  danger: "#f87171",
  warning: "#fbbf24",
  highlight: N.accentSoft,
  headerText: N.onSky,
  prayerActiveBg: N.accentSoft,
};

export const dark: ThemeColors = {
  ...light,
};
