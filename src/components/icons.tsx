/**
 * Bespoke SVG prayer icons — hand-tuned line art unique to Prayer Estonia.
 * Each icon is a small, recognizable celestial motif drawn with strokes (not fills)
 * so they read cleanly at small sizes and tint to any color.
 */

import * as React from "react";
import Svg, { Path, Circle, Line, G, Rect, Polygon } from "react-native-svg";
import type { PrayerKey } from "@/engine";

const SIZE = 24;

function withSize(children: React.ReactNode) {
  return (props: { size?: number; color: string }) => {
    const s = props.size ?? SIZE;
    return (
      <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <G stroke={props.color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          {children}
        </G>
      </Svg>
    );
  };
}

/** Fajr — a crescent dipping below the horizon line (dawn approaching). */
export const FajrIcon = withSize(
  <>
    <Path d="M4 17h16" />
    <Path d="M9.5 17a4.5 4.5 0 1 0 0-9 3.5 3.5 0 0 1 0 9z" fillOpacity={0.0} />
    <Path d="M9.5 8a3.5 3.5 0 0 0 0 9 4.5 4.5 0 1 1 0-9z" />
    <Path d="M7 13.5h.5" />
  </>,
);

/** Sunrise — sun rising over the horizon with rays. */
export const SunriseIcon = withSize(
  <>
    <Path d="M4 18h16" />
    <Path d="M2 22h20" opacity={0.5} />
    <Circle cx={12} cy={15} r={3.2} />
    <Path d="M12 8.5v1.5M6.5 11l1 1M17.5 11l-1 1M3.5 15h1.5M19 15h1.5" />
  </>,
);

/** Dhuhr — midday sun at its peak (full sun with concentric warmth). */
export const DhuhrIcon = withSize(
  <>
    <Circle cx={12} cy={12} r={4} />
    <Path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
  </>,
);

/** Asr — sun past its peak, with a lengthening shadow (the defining feature of Asr). */
export const AsrIcon = withSize(
  <>
    <Circle cx={9} cy={9} r={3} />
    <Path d="M9 12v6" />
    <Path d="M9 18h9" />
    <Path d="M9 14l9 4" opacity={0.55} />
  </>,
);

/** Maghrib — sun touching the horizon at sunset. */
export const MaghribIcon = withSize(
  <>
    <Path d="M3 16h18" />
    <Path d="M1 20h22" opacity={0.5} />
    <Path d="M7 16a5 5 0 0 1 10 0" />
    <Path d="M12 5v3M5.5 8.5l1 1M18.5 8.5l-1 1" />
  </>,
);

/** Isha — three stars in the deep night sky. */
export const IshaIcon = withSize(
  <>
    <Path d="M8 6l.7 1.8L10.5 8.5 8.7 9.2 8 11l-.7-1.8L5.5 8.5 7.3 7.8z" />
    <Path d="M16 10l.6 1.6L18 12.2l-1.4.6L16 14.4l-.6-1.6L14 12.2l1.4-.6z" opacity={0.85} />
    <Path d="M11 15l.5 1.3L12.8 16.8 11.5 17.3 11 18.6l-.5-1.3L9.2 16.8l1.3-.5z" opacity={0.7} />
  </>,
);

/** Map a prayer key to its icon component. */
export const PrayerIcon: Record<PrayerKey, React.FC<{ size?: number; color: string }>> = {
  fajr: FajrIcon,
  sunrise: SunriseIcon,
  dhuhr: DhuhrIcon,
  asr: AsrIcon,
  maghrib: MaghribIcon,
  isha: IshaIcon,
};

/** A small crescent + star — the app's brand mark (used in headers). */
export const CrescentMark = ({ size = 28, color }: { size?: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14.5 4a8 8 0 1 0 0 16 6.5 6.5 0 0 1 0-16z" fill={color} opacity={0.9} />
    <Path d="M17.5 6.5l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5z" fill={color} />
  </Svg>
);

/** A kaaba-like cube — used sparingly for the location/Mecca bearing context. */
export const KaabaMark = ({ size = 24, color }: { size?: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <G stroke={color} strokeWidth={1.6} strokeLinejoin="round">
      <Polygon points="12,3 21,7.5 12,12 3,7.5" />
      <Path d="M3 7.5v9L12 21M21 7.5v9L12 21M12 12v9" />
      <Path d="M5.5 9l6.5 3.5L18.5 9" opacity={0.5} />
    </G>
  </Svg>
);
