/**
 * Bespoke SVG icon set for Prayer Estonia — clean line-art, tuned for small sizes.
 * Prayer icons use stroke-based celestial motifs; tab icons are minimal outlines.
 */

import * as React from "react";
import { type ColorValue } from "react-native";
import Svg, { Path, Circle, G, Polygon, Rect } from "react-native-svg";
import type { PrayerKey } from "@/engine";

function withStroke(children: React.ReactNode, width = 1.7) {
  return ({ size = 24, color }: { size?: number; color: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </G>
    </Svg>
  );
}

/* ---------------- Prayer icons ---------------- */

/** Fajr — crescent moon over the horizon (pre-dawn). */
export const FajrIcon = withStroke(
  <>
    <Path d="M4 17.5h16" />
    <Path d="M10 17.5a4.2 4.2 0 1 0 0-8.4 3.3 3.3 0 0 1 0 8.4z" />
    <Path d="M7.2 13.3h.01" strokeWidth={2.2} />
  </>,
);

/** Sunrise — half sun with rays rising from the horizon. */
export const SunriseIcon = withStroke(
  <>
    <Path d="M4 17.5h16" />
    <Circle cx={12} cy={14.5} r={3} />
    <Path d="M12 7.5v1.6M6.8 10.2l1.1 1.1M17.2 10.2l-1.1 1.1M4 14.5h1.6M18.4 14.5H20" />
  </>,
);

/** Dhuhr — full midday sun. */
export const DhuhrIcon = withStroke(
  <>
    <Circle cx={12} cy={12} r={3.8} />
    <Path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6" />
  </>,
);

/** Asr — sun past noon casting a shadow (Asr is defined by shadow length). */
export const AsrIcon = withStroke(
  <>
    <Circle cx={8.5} cy={8.5} r={2.8} />
    <Path d="M8.5 11.3V18" />
    <Path d="M8.5 18h9.5" />
    <Path d="M8.5 14.5l9.5 3.5" opacity={0.5} />
  </>,
);

/** Maghrib — sun touching the horizon at sunset. */
export const MaghribIcon = withStroke(
  <>
    <Path d="M3 16h18" />
    <Path d="M1.5 19.5h21" opacity={0.45} />
    <Path d="M7.5 16a4.5 4.5 0 0 1 9 0" />
    <Path d="M12 6.5v2.2M6.2 9.2l1 1M17.8 9.2l-1 1" />
  </>,
);

/** Isha — three stars in the night sky. */
export const IshaIcon = withStroke(
  <>
    <Path d="M8 5.5l.75 2L10.7 8.2l-1.95.7-.75 2-.75-2-1.95-.7 1.95-.7z" />
    <Path d="M16.2 9.7l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" />
    <Path d="M11 14.8l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" opacity={0.7} />
  </>,
  1.4,
);

export const PrayerIcon: Record<PrayerKey, React.FC<{ size?: number; color: string }>> = {
  fajr: FajrIcon,
  sunrise: SunriseIcon,
  dhuhr: DhuhrIcon,
  asr: AsrIcon,
  maghrib: MaghribIcon,
  isha: IshaIcon,
};

/* ---------------- Brand + tab icons ---------------- */

/** Crescent + star brand mark. */
export const CrescentMark = ({ size = 24, color }: { size?: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14.5 4a8 8 0 1 0 0 16 6.5 6.5 0 0 1 0-16z"
      fill={color}
      opacity={0.92}
    />
    <Path d="M17.6 6.6l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" fill={color} />
  </Svg>
);

/** Tab: Today — the crescent brand. */
export const TabTodayIcon = ({ size = 24, color }: { size?: number; color: ColorValue | string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 4.5a7.5 7.5 0 1 0 0 15 6 6 0 0 1 0-15z" stroke={String(color)} strokeWidth={1.8} strokeLinejoin="round" />
    <Path d="M16.8 7l.4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4z" fill={color} />
  </Svg>
);

/** Tab: Month — a clean calendar. */
export const TabMonthIcon = ({ size = 24, color }: { size?: number; color: ColorValue | string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <G stroke={color} strokeWidth={1.8} strokeLinecap="round">
      <Rect x="4" y="5.5" width="16" height="15" rx="3" />
      <Path d="M4 10.5h16M8.5 3.5v3.4M15.5 3.5v3.4" />
      <Path d="M8 14h1.6M11.2 14h1.6M14.4 14H16M8 17h1.6M11.2 17h1.6" opacity={0.55} strokeWidth={1.5} />
    </G>
  </Svg>
);

/** Tab: Settings — clean sliders (modern take on "settings"). */
export const TabSettingsIcon = ({ size = 24, color }: { size?: number; color: ColorValue | string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <G stroke={color} strokeWidth={1.8} strokeLinecap="round">
      <Path d="M4 7.5h10M18 7.5h2M4 16.5h2M10 16.5h10" />
      <Circle cx={16} cy={7.5} r={2.2} />
      <Circle cx={8} cy={16.5} r={2.2} />
    </G>
  </Svg>
);

/** Kaaba-like cube (reserved for future Qibla/location context). */
export const KaabaMark = ({ size = 24, color }: { size?: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <G stroke={color} strokeWidth={1.6} strokeLinejoin="round">
      <Polygon points="12,3 21,7.5 12,12 3,7.5" />
      <Path d="M3 7.5v9L12 21M21 7.5v9L12 21M12 12v9" />
    </G>
  </Svg>
);
