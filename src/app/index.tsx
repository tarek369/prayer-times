import * as React from "react";
import { ScrollView, StyleSheet, View, Platform, Dimensions, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { CountdownRing } from "@/components/countdown-ring";
import { SkyArc, computeArcPositions } from "@/components/sky-arc";
import { PrayerIcon, CrescentMark } from "@/components/icons";
import { useNextPrayer, localMinutesOfDay } from "@/hooks/use-prayer-data";
import { useSettings } from "@/store/settings";
import { formatPrayerTime, PRAYER_META, PRAYER_ORDER } from "@/engine";
import type { PrayerKey } from "@/engine";
import type { PeriodPalette } from "@/theme/palettes";
import { paletteForTime } from "@/theme/palettes";

const { width: SCREEN_W } = Dimensions.get("window");

export default function TodayScreen() {
  const { now, next, today, city } = useNextPrayer(1000);
  const clock = useSettings((s) => s.clock);
  const use24h = clock === "24h";

  const nowMin = localMinutesOfDay(now);
  const t = today.times;
  const palette = paletteForTime(nowMin, {
    fajr: t.fajr.time,
    sunrise: t.sunrise ?? t.fajr.time + 90,
    dhuhr: t.dhuhr,
    asr: t.asr ?? t.maghrib,
    maghrib: t.maghrib,
    isha: t.isha.time,
  });

  const progress = computeRingProgress(next, nowMin);

  const arc = computeArcPositions({
    fajr: t.fajr.time,
    sunrise: t.sunrise ?? t.fajr.time + 90,
    dhuhr: t.dhuhr,
    asr: t.asr ?? t.maghrib,
    maghrib: t.maghrib,
    isha: t.isha.time,
  });
  const nowPos = arc.nowPosFn(nowMin);

  const hijriText = today.hijri
    ? `${today.hijri.day} ${today.hijri.month} ${today.hijri.year} AH`
    : "";
  const gregText = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  function timeFor(key: PrayerKey): number {
    switch (key) {
      case "fajr": return t.fajr.time;
      case "sunrise": return t.sunrise ?? 0;
      case "dhuhr": return t.dhuhr;
      case "asr": return t.asr ?? t.maghrib;
      case "maghrib": return t.maghrib;
      case "isha": return t.isha.time;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.sky[0] }}>
      <LinearGradient
        colors={palette.sky}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {(palette.id === "isha" || palette.id === "fajr") && (
        <StarField color={palette.particle} />
      )}

      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <CrescentMark size={18} color={palette.accent} />
              <Text style={[styles.kicker, { color: palette.onSkyMuted }]}>PRAYER ESTONIA</Text>
            </View>
            <Text style={[styles.city, { color: palette.onSky }]}>{city.label}</Text>
            <Text style={[styles.date, { color: palette.onSkyMuted }]}>{gregText}</Text>
            {hijriText ? (
              <Text style={[styles.hijri, { color: palette.accent }]}>{hijriText}</Text>
            ) : null}
          </View>

          {/* Hero countdown ring */}
          <View style={{ alignItems: "center", marginVertical: 20 }}>
            <CountdownRing
              progress={progress}
              nextKey={next.key}
              nextMinutes={next.minutes}
              minutesUntil={next.minutesUntil}
              palette={palette}
              use24h={use24h}
            />
          </View>

          {/* Sky arc */}
          <GlassCard palette={palette} style={styles.arcCard}>
            <SkyArc
              positions={arc.positions}
              nowPos={nowPos}
              nextKey={next.key}
              palette={palette}
            />
            <View style={[styles.arcLegend, { borderTopColor: palette.glassBorder }]}>
              <Text style={[styles.arcLegendText, { color: palette.onSkyMuted }]}>
                The sun's path today
              </Text>
            </View>
          </GlassCard>

          {/* Prayer list */}
          <GlassCard palette={palette} style={styles.listCard}>
            {PRAYER_ORDER.map((key) => {
              const isNext = key === next.key;
              const Icon = PrayerIcon[key];
              const minutes = timeFor(key);
              return (
                <View
                  key={key}
                  style={[styles.row, isNext && { backgroundColor: palette.accentSoft }]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
                    <View style={{ width: 28, alignItems: "center" }}>
                      <Icon size={22} color={isNext ? palette.accent : palette.onSkyMuted} />
                    </View>
                    <View>
                      <Text
                        style={{
                          color: isNext ? palette.onSky : palette.onSkyMuted,
                          fontSize: 15,
                          fontWeight: isNext ? "700" : "600",
                        }}
                      >
                        {PRAYER_META[key].label}
                      </Text>
                      {isNext && (
                        <Text style={{ color: palette.accent, fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>
                          UPCOMING
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text
                    style={{
                      color: isNext ? palette.accent : palette.onSky,
                      fontSize: 17,
                      fontWeight: isNext ? "800" : "700",
                      fontVariant: ["tabular-nums" as const],
                    }}
                  >
                    {formatPrayerTime(minutes, "round", use24h)}
                  </Text>
                </View>
              );
            })}
          </GlassCard>

          {/* Rule badges */}
          {(today.times.fajr.ruleType !== "angle" || today.times.isha.ruleType !== "angle") && (
            <View style={styles.badges}>
              {today.times.fajr.ruleType !== "angle" && (
                <Chip palette={palette}>Fajr: high-latitude rule</Chip>
              )}
              {today.times.isha.ruleType !== "angle" && (
                <Chip palette={palette}>Isha: Maghrib + {today.times.isha.minutesAfterMaghrib} min</Chip>
              )}
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ---------- helpers & sub-components ---------- */

function computeRingProgress(
  next: { minutes: number; minutesUntil: number },
  nowMin: number,
): number {
  const nextStart = next.minutes;
  const prevStart = Math.max(0, nextStart - next.minutesUntil - 1);
  const windowLen = Math.max(1, nextStart - prevStart);
  const elapsed = nowMin - prevStart;
  return Math.max(0.02, Math.min(0.98, elapsed / windowLen));
}

function GlassCard({ palette, style, children }: { palette: PeriodPalette; style?: any; children: React.ReactNode }) {
  return (
    <View
      style={[
        {
          backgroundColor: palette.glassSurface,
          borderColor: palette.glassBorder,
          borderWidth: 1,
          borderRadius: 24,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function Chip({ palette, children }: { palette: PeriodPalette; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: palette.accentSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
      <Text style={{ color: palette.accent, fontSize: 12, fontWeight: "700" }}>{children}</Text>
    </View>
  );
}

function StarField({ color }: { color: string }) {
  const stars = React.useMemo(() => {
    const rng = mulberry32(42);
    return Array.from({ length: 40 }, () => ({
      x: rng() * SCREEN_W,
      y: rng() * 320,
      r: rng() * 1.3 + 0.4,
      o: rng() * 0.6 + 0.2,
    }));
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: s.x,
            top: s.y,
            width: s.r * 2,
            height: s.r * 2,
            borderRadius: s.r,
            backgroundColor: color,
            opacity: s.o,
          }}
        />
      ))}
    </View>
  );
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { alignItems: "center", gap: 3 },
  kicker: { fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  city: { fontSize: 26, fontWeight: "800", marginTop: 6 },
  date: { fontSize: 14, fontWeight: "500" },
  hijri: { fontSize: 13, fontWeight: "700" },
  arcCard: { marginTop: 16, paddingVertical: 14, paddingHorizontal: 8 },
  arcLegend: { borderTopWidth: 1, marginTop: 4, paddingTop: 8, paddingHorizontal: 12 },
  arcLegendText: { fontSize: 11, fontWeight: "500", textAlign: "center" },
  listCard: { marginTop: 16 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16, justifyContent: "center" },
});
