import * as React from "react";
import { ScrollView, StyleSheet, View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { PrayerIcon, CrescentMark } from "@/components/icons";
import { useNextPrayer, localMinutesOfDay } from "@/hooks/use-prayer-data";
import { useTheme } from "@/hooks/use-theme";
import { useSettings } from "@/store/settings";
import { formatPrayerTime, formatCountdown, PRAYER_META, PRAYER_ORDER } from "@/engine";
import type { PrayerKey } from "@/engine";
import { accentForTime } from "@/theme/palettes";

export default function TodayScreen() {
  const colors = useTheme();
  const accent = colors.accent;
  const { now, next, today, city } = useNextPrayer(1000);
  const use24h = useSettings((s) => s.clock) === "24h";

  const nowMin = localMinutesOfDay(now);
  const t = today.times;
  const period = accentForTime(nowMin, {
    fajr: t.fajr.time,
    sunrise: t.sunrise ?? t.fajr.time + 90,
    dhuhr: t.dhuhr,
    asr: t.asr ?? t.maghrib,
    maghrib: t.maghrib,
    isha: t.isha.time,
  });

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

  const nextTime = timeFor(next.key);
  const prevKey = previousOf(next.key);
  const prevTime = timeFor(prevKey);
  // Progress across the current prayer window (prev → next).
  const windowLen = Math.max(1, (nextTime - prevTime + 1440) % 1440);
  const elapsed = (nowMin - prevTime + 1440) % 1440;
  const progress = Math.max(0.02, Math.min(0.98, elapsed / windowLen));

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <CrescentMark size={20} color={accent} />
              <Text style={[styles.kicker, { color: colors.textFaint }]}>
                PRAYER ESTONIA
              </Text>
            </View>
            <Text style={[styles.city, { color: colors.text }]}>{city.label}</Text>
            <Text style={[styles.date, { color: colors.textMuted }]}>
              {gregText} {hijriText ? `· ${hijriText}` : ""}
            </Text>
          </View>

          {/* Hero card */}
          <View style={[styles.hero, { backgroundColor: colors.card }, colors.shadow]}>
            <View style={[styles.heroGlow, { backgroundColor: period.tint }]} />
            <View style={styles.heroTop}>
              <Text style={[styles.heroLabel, { color: colors.textMuted }]}>
                NEXT PRAYER
              </Text>
              <View style={[styles.countdownChip, { backgroundColor: accent }]}>
                <Text style={[styles.countdownText, { color: colors.textInvert }]}>
                  {formatCountdown(next.minutesUntil)}
                </Text>
              </View>
            </View>

            <View style={styles.heroMain}>
              <PrayerIconFor k={next.key} accent={accent} />
              <Text style={[styles.heroName, { color: colors.text }]}>
                {PRAYER_META[next.key].label}
              </Text>
            </View>
            <Text style={[styles.heroTime, { color: colors.text }]}>
              {formatPrayerTime(((next.minutes % 1440) + 1440) % 1440, "round", use24h)}
            </Text>

            {/* Thin animated progress bar */}
            <View style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]}>
              <ProgressBar progress={progress} accent={accent} />
            </View>
            <Text style={[styles.progressHint, { color: colors.textFaint }]}>
              {period.label} period · {formatPrayerTime(prevTime % 1440, "round", use24h)} →{" "}
              {formatPrayerTime(nextTime % 1440, "round", use24h)}
            </Text>
          </View>

          {/* Timeline */}
          <View style={[styles.timelineCard, { backgroundColor: colors.card }, colors.shadow]}>
            {PRAYER_ORDER.map((key, i) => {
              const minutes = timeFor(key);
              const isPast = minutes < nowMin && !(key === "isha" && minutes < t.fajr.time && nowMin >= t.isha.time);
              const isNext = key === next.key;
              const Icon = PrayerIcon[key];
              const isPrayer = PRAYER_META[key].isPrayer;
              return (
                <View key={key} style={styles.timelineRow}>
                  {/* Time column */}
                  <Text
                    style={[
                      styles.timeCol,
                      { color: isNext ? accent : isPast ? colors.textFaint : colors.text },
                      isNext && { fontWeight: "800" },
                    ]}
                  >
                    {formatPrayerTime(minutes, "round", use24h)}
                  </Text>

                  {/* Timeline dot + connector */}
                  <View style={styles.dotCol}>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: isNext ? accent : isPast ? colors.textFaint : colors.border,
                          borderColor: isNext ? accent : colors.border,
                        },
                        !isPrayer && styles.dotSmall,
                      ]}
                    />
                    {i < PRAYER_ORDER.length - 1 && (
                      <View
                        style={[
                          styles.connector,
                          { backgroundColor: colors.border },
                        ]}
                      />
                    )}
                  </View>

                  {/* Name + icon */}
                  <View style={styles.nameCol}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Icon
                        size={18}
                        color={isNext ? accent : isPast ? colors.textFaint : colors.textMuted}
                      />
                      <Text
                        style={{
                          color: isNext ? colors.text : isPast ? colors.textFaint : colors.text,
                          fontSize: 16,
                          fontWeight: isNext ? "800" : isPrayer ? "600" : "500",
                        }}
                      >
                        {PRAYER_META[key].label}
                      </Text>
                    </View>
                    {isNext && (
                      <Text style={[styles.nextHint, { color: accent }]}>
                        UPCOMING
                      </Text>
                    )}
                    {key === "sunrise" && !isNext && (
                      <Text style={[styles.sunriseHint, { color: colors.textFaint }]}>
                        not a prayer
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Rule notes */}
          {(t.fajr.ruleType !== "angle" || t.isha.ruleType !== "angle") && (
            <View style={styles.notes}>
              {t.fajr.ruleType !== "angle" && (
                <Note colors={colors} accent={accent}>
                  Fajr uses the high-latitude night-portion rule today
                </Note>
              )}
              {t.isha.ruleType !== "angle" && (
                <Note colors={colors} accent={accent}>
                  Isha = Maghrib + {t.isha.minutesAfterMaghrib} min (summer rule)
                </Note>
              )}
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ---------------- sub-components ---------------- */

function PrayerIconFor({ k, accent }: { k: PrayerKey; accent: string }) {
  const Icon = PrayerIcon[k];
  return (
    <View style={{ marginRight: 2 }}>
      <Icon size={34} color={accent} />
    </View>
  );
}

function ProgressBar({ progress, accent }: { progress: number; accent: string }) {
  const barStyle = useAnimatedStyle(() => {
    const pct = Math.max(0, Math.min(1, progress)) * 100;
    return {
      width: withTiming(`${pct}%`, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      }),
    };
  });
  return (
    <Animated.View
      style={[{ height: 6, borderRadius: 3, backgroundColor: accent }, barStyle]}
    />
  );
}

function Note({
  colors,
  accent,
  children,
}: {
  colors: ReturnType<typeof useTheme>;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.note, { backgroundColor: colors.surfaceAlt }]}>
      <View style={[styles.noteDot, { backgroundColor: accent }]} />
      <Text style={[styles.noteText, { color: colors.textMuted }]}>{children}</Text>
    </View>
  );
}

/** The prayer that precedes the given one in the daily order. */
function previousOf(key: Exclude<PrayerKey, "sunrise">): Exclude<PrayerKey, "sunrise"> {
  const order: Exclude<PrayerKey, "sunrise">[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  const idx = order.indexOf(key as Exclude<PrayerKey, "sunrise">);
  return order[(idx - 1 + order.length) % order.length];
}

/* ---------------- styles ---------------- */

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  header: { alignItems: "center", gap: 2, marginBottom: 20 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  kicker: { fontSize: 10, fontWeight: "800", letterSpacing: 2.2 },
  city: { fontSize: 24, fontWeight: "800", letterSpacing: 0.2 },
  date: { fontSize: 13, fontWeight: "500", marginTop: 2 },

  hero: {
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 20,
  },
  heroGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 120 },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    alignSelf: "stretch",
  },
  heroLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.8 },
  countdownChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  countdownText: { fontSize: 13, fontWeight: "800", fontVariant: ["tabular-nums" as const] },
  heroMain: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18 },
  heroName: { fontSize: 22, fontWeight: "700", letterSpacing: 0.3 },
  heroTime: {
    fontSize: 56,
    fontWeight: "800",
    letterSpacing: -1,
    marginTop: 2,
    fontVariant: ["tabular-nums" as const],
  },
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    marginTop: 20,
    overflow: "hidden",
  },
  progressHint: { fontSize: 11, fontWeight: "600", marginTop: 8, letterSpacing: 0.3 },

  timelineCard: { borderRadius: 24, paddingVertical: 8, paddingHorizontal: 20 },
  timelineRow: { flexDirection: "row", alignItems: "center", minHeight: 64 },
  timeCol: {
    width: 86,
    fontSize: 15,
    fontWeight: "700",
    fontVariant: ["tabular-nums" as const],
  },
  dotCol: { width: 28, alignItems: "center", alignSelf: "stretch" },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginTop: 26,
  },
  dotSmall: { width: 8, height: 8, borderRadius: 4, borderWidth: 0, marginTop: 28 },
  connector: { width: 2, flex: 1, marginTop: 2 },
  nameCol: { flex: 1, justifyContent: "center", paddingVertical: 12 },
  nextHint: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginTop: 3, marginLeft: 28 },
  sunriseHint: { fontSize: 11, marginTop: 2, marginLeft: 28 },

  notes: { gap: 8, marginTop: 16 },
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noteDot: { width: 6, height: 6, borderRadius: 3 },
  noteText: { fontSize: 13, fontWeight: "500", flex: 1 },
});
