/**
 * CountdownRing — the signature hero element.
 *
 * A large circular SVG ring whose arc fills toward the next prayer, with the next
 * prayer's time + a live "in Xh Ym" countdown in the center, and the prayer's icon.
 * The arc progress is the fraction of the current prayer window that has elapsed.
 *
 * The arc uses a conic-like sweep rendered as a stroked circle with strokeDasharray,
 * animated smoothly with react-native-reanimated.
 */

import * as React from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { PrayerIcon } from "./icons";
import { formatPrayerTime, formatCountdown } from "@/engine";
import type { PrayerKey } from "@/engine";
import type { PeriodPalette } from "@/theme/palettes";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 280;
const STROKE = 14;
const R = (SIZE - STROKE) / 2 - 8;
const CIRCUMFERENCE = 2 * Math.PI * R;

interface Props {
  /** 0..1 — fraction of the current prayer window elapsed (drives the arc fill). */
  progress: number;
  nextKey: PrayerKey;
  nextMinutes: number;
  minutesUntil: number;
  palette: PeriodPalette;
  use24h: boolean;
}

export function CountdownRing({
  progress,
  nextKey,
  nextMinutes,
  minutesUntil,
  palette,
  use24h,
}: Props) {
  // Animated target for the dash offset.
  const target = useDerivedValue(() => progress, [progress]);
  const animatedProps = useAnimatedProps(() => {
    const p = Math.max(0, Math.min(1, target.value));
    return {
      strokeDasharray: `${CIRCUMFERENCE}`,
      strokeDashoffset: withTiming(CIRCUMFERENCE * (1 - p), {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      }),
    };
  });

  const Icon = PrayerIcon[nextKey];

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Defs>
          <LinearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.accent} />
            <Stop offset="1" stopColor={palette.onSky} />
          </LinearGradient>
        </Defs>

        {/* Track */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={palette.glassBorder}
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke="url(#ring-grad)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          rotation={-90}
          originX={SIZE / 2}
          originY={SIZE / 2}
          animatedProps={animatedProps}
        />
        {/* Tick marks at 12/3/6/9 — subtle celestial dial feel */}
        {tickMarks()}
      </Svg>

      {/* Center content */}
      <View
        style={{
          position: "absolute",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 36,
        }}
      >
        <View style={{ marginBottom: 8 }}>
          <Icon size={30} color={palette.accent} />
        </View>
        <Animated.Text
          style={{
            color: palette.onSky,
            fontSize: 30,
            fontWeight: "800",
            letterSpacing: 0.5,
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatPrayerTime(((nextMinutes % 1440) + 1440) % 1440, "round", use24h)}
        </Animated.Text>
        <Animated.Text
          style={{
            color: palette.onSkyMuted,
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            marginTop: 2,
          }}
        >
          {labelFor(nextKey)}
        </Animated.Text>
        <Animated.Text
          style={{
            color: palette.accent,
            fontSize: 15,
            fontWeight: "700",
            marginTop: 8,
            fontVariant: ["tabular-nums"],
          }}
        >
          in {formatCountdown(minutesUntil)}
        </Animated.Text>
      </View>
    </View>
  );

  function tickMarks() {
    const marks = [];
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
      const inner = R + STROKE / 2 + 4;
      const outer = inner + (i % 3 === 0 ? 6 : 3);
      const x1 = SIZE / 2 + inner * Math.cos(angle);
      const y1 = SIZE / 2 + inner * Math.sin(angle);
      const x2 = SIZE / 2 + outer * Math.cos(angle);
      const y2 = SIZE / 2 + outer * Math.sin(angle);
      marks.push(
        <Animated.Text key={i} style={{ display: "none" }} />,
      );
      marks.push(
        // Render tick as a thin line via a tiny rotated rect approximation: use Path.
        <Circle
          key={`t-${i}`}
          cx={x2}
          cy={y2}
          r={i % 3 === 0 ? 1.6 : 1}
          fill={i % 3 === 0 ? palette.accent : palette.glassBorder}
        />,
      );
    }
    return marks;
  }
}

function labelFor(key: PrayerKey): string {
  return key === "sunrise" ? "SUNRISE" : `NEXT: ${key.toUpperCase()}`;
}
