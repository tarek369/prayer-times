/**
 * SkyArc — a decorative arc representing the sun's journey across the sky.
 *
 * A semicircle spans the top of the card. A dot (the sun) sits along the arc at the
 * current position in the day, and small markers indicate where each prayer falls along
 * the arc (left = dawn/Fajr, apex = noon/Dhuhr, right = sunset/Maghrib). This gives an
 * intuitive, glanceable "where are we in the day" that no typical prayer app shows.
 *
 * The horizontal position of a prayer is derived from its time mapped onto the day arc
 * (Fajr→far left, Isha→far right), independent of the exact angles.
 */

import * as React from "react";
import { View } from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";

import type { PeriodPalette } from "@/theme/palettes";
import type { PrayerKey } from "@/engine";
import { PrayerIcon } from "./icons";

interface SunPosition {
  key: PrayerKey;
  /** 0..1 position along the arc (left → right). */
  pos: number;
}

interface Props {
  /** Positions of the prayers + sunrise along the arc (0..1). */
  positions: SunPosition[];
  /** Current sun position 0..1. */
  nowPos: number;
  /** Which prayer is next. */
  nextKey: PrayerKey;
  palette: PeriodPalette;
}

const W = 320;
const H = 120;
const CX = W / 2;
const CY = H - 16; // center of the arc circle, near the bottom
const AR = W / 2 - 24; // arc radius

/** Map a 0..1 position to x,y on the upper semicircle. */
function pointOnArc(pos: number): { x: number; y: number } {
  // pos 0 → angle π (left), pos 1 → angle 0 (right), pos 0.5 → top (π/2... but we want top).
  // Use angle = π - pos*π so pos 0 → π (left edge), pos 0.5 → π/2 (apex/top), pos 1 → 0 (right).
  const angle = Math.PI - pos * Math.PI;
  return { x: CX + AR * Math.cos(angle), y: CY - AR * Math.sin(angle) };
}

export function SkyArc({ positions, nowPos, nextKey, palette }: Props) {
  const sun = pointOnArc(Math.max(0, Math.min(1, nowPos)));
  const startPoint = pointOnArc(0);
  const endPoint = pointOnArc(1);

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="arc-grad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={palette.accent} stopOpacity={0.9} />
            <Stop offset="0.5" stopColor={palette.onSky} stopOpacity={0.6} />
            <Stop offset="1" stopColor={palette.accent} stopOpacity={0.9} />
          </LinearGradient>
        </Defs>

        {/* The arc path (upper semicircle) */}
        <Path
          d={`M ${startPoint.x} ${startPoint.y} A ${AR} ${AR} 0 0 1 ${endPoint.x} ${endPoint.y}`}
          stroke="url(#arc-grad)"
          strokeWidth={2}
          fill="none"
          strokeDasharray="2 5"
          opacity={0.7}
        />
        {/* Horizon line */}
        <Path
          d={`M 16 ${CY} H ${W - 16}`}
          stroke={palette.glassBorder}
          strokeWidth={1}
          opacity={0.6}
        />

        {/* Prayer markers along the arc */}
        {positions.map((p) => {
          const pt = pointOnArc(p.pos);
          const isNext = p.key === nextKey;
          return (
            <Circle
              key={p.key}
              cx={pt.x}
              cy={pt.y}
              r={isNext ? 5 : 3}
              fill={isNext ? palette.accent : palette.onSkyMuted}
              opacity={isNext ? 1 : 0.7}
            />
          );
        })}

        {/* The sun/moon — current position */}
        <Circle cx={sun.x} cy={sun.y} r={9} fill={palette.accent} opacity={0.25} />
        <Circle cx={sun.x} cy={sun.y} r={5.5} fill={palette.accent} />
      </Svg>
    </View>
  );
}

/**
 * Map each prayer/sunrise time to a 0..1 position along the arc.
 * Uses Fajr as the left anchor (pos 0) and Isha as the right anchor (pos 1); other
 * prayers interpolate between them. Before Fajr / after Isha the sun clamps to the ends.
 */
export function computeArcPositions(times: {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}): { positions: SunPosition[]; nowPosFn: (nowMinutes: number) => number } {
  const start = times.fajr;
  const end = Math.max(times.isha, times.fajr + 1);
  const span = end - start;

  const keys: PrayerKey[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
  const positions: SunPosition[] = keys.map((k) => ({
    key: k,
    pos: Math.max(0, Math.min(1, ((times[k] - start) % 1440) / span)),
  }));

  return {
    positions,
    nowPosFn: (nowMinutes: number) => {
      const rel = ((nowMinutes - start) % 1440) / span;
      return Math.max(0, Math.min(1, rel));
    },
  };
}
