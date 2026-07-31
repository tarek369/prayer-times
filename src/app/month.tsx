import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { GlassCard } from "@/components/glass-card";
import { CrescentMark } from "@/components/icons";
import { useMonthTimetable, useResolvedCity } from "@/hooks/use-prayer-data";
import { MONTHS, CITIES } from "@/engine";
import { useSettings } from "@/store/settings";
import { PERIOD_PALETTES } from "@/theme/palettes";

const PRAYER_COLS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
const COL_LABELS: Record<string, string> = {
  fajr: "Fajr",
  sunrise: "Sun",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Magh",
  isha: "Isha",
};

export default function MonthScreen() {
  const palette = PERIOD_PALETTES.neutral;
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const { city } = useResolvedCity();
  const timetable = useMonthTimetable(year, month);
  const isCustom = useSettings((s) => s.location.mode === "custom");

  const todayDay = today.getFullYear() === year && today.getMonth() + 1 === month ? today.getDate() : -1;

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  }
  function jumpToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.sky[0] }}>
      <LinearGradient colors={palette.sky} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <CrescentMark size={16} color={palette.accent} />
              <Text style={[styles.kicker, { color: palette.onSkyMuted }]}>MONTHLY TIMETABLE</Text>
            </View>
            <Text style={[styles.city, { color: palette.onSky }]}>{city.label}</Text>

            <View style={[styles.navRow, { borderColor: palette.glassBorder }]}>
              <Pressable onPress={prevMonth} hitSlop={12}>
                <Text style={[styles.navArrow, { color: palette.accent }]}>‹</Text>
              </Pressable>
              <Pressable onPress={jumpToday} hitSlop={8}>
                <Text style={[styles.navTitle, { color: palette.accent }]}>
                  {MONTHS[month - 1]} {year}
                </Text>
              </Pressable>
              <Pressable onPress={nextMonth} hitSlop={12}>
                <Text style={[styles.navArrow, { color: palette.accent }]}>›</Text>
              </Pressable>
            </View>

            {timetable.hijriRange ? (
              <Text style={[styles.hijri, { color: palette.onSkyMuted }]}>{timetable.hijriRange} AH</Text>
            ) : null}
          </View>

          {/* Timetable card */}
          <GlassCard palette={palette} style={{ marginTop: 16, padding: 0 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 420 }}>
                {/* Header row */}
                <View style={[styles.thead, { borderBottomColor: palette.glassBorder }]}>
                  <Text style={[styles.cellDayHead, { color: palette.onSkyMuted }]}>Day</Text>
                  <Text style={[styles.cellWdHead, { color: palette.onSkyMuted }]}>·</Text>
                  {PRAYER_COLS.map((c) => (
                    <Text key={c} style={[styles.cellHead, { color: palette.onSkyMuted }]}>
                      {COL_LABELS[c]}
                    </Text>
                  ))}
                </View>

                {timetable.rows.map((r, i) => {
                  const isToday = Number(r.gregorianDay) === todayDay;
                  return (
                    <View
                      key={r.gregorianDay}
                      style={[
                        styles.trow,
                        {
                          backgroundColor: isToday ? palette.accentSoft : "transparent",
                          borderBottomColor: palette.glassBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.cellDay,
                          { color: isToday ? palette.accent : palette.onSky },
                        ]}
                      >
                        {r.gregorianDay}
                      </Text>
                      <Text style={[styles.cellWd, { color: palette.onSkyMuted }]}>{r.weekday}</Text>
                      {PRAYER_COLS.map((c) => {
                        const val = r[c];
                        const extreme =
                          (c === "fajr" && r.fajrRuleType !== "angle") ||
                          (c === "isha" && r.ishaRuleType !== "angle");
                        return (
                          <Text
                            key={c}
                            style={[
                              styles.cell,
                              {
                                color: extreme ? palette.accent : palette.onSky,
                                fontWeight: extreme ? "700" : "600",
                              },
                            ]}
                          >
                            {val}
                          </Text>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </GlassCard>

          {/* Rule summary */}
          <GlassCard palette={palette} style={{ marginTop: 16, padding: 16 }}>
            <Text style={[styles.ruleTitle, { color: palette.accent }]}>HOW THESE TIMES ARE CALCULATED</Text>
            <Text style={[styles.ruleBody, { color: palette.onSkyMuted, marginTop: 8 }]}>
              {timetable.ruleSummary}
            </Text>
            {!isCustom && (
              <Text style={[styles.ruleBody, { color: palette.onSkyMuted, marginTop: 8 }]}>
                Cities: {Object.values(CITIES).map((c) => c.label).join(", ")}.
              </Text>
            )}
          </GlassCard>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  header: { alignItems: "center", gap: 6, paddingTop: 12 },
  kicker: { fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  city: { fontSize: 24, fontWeight: "800", marginTop: 4 },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  navArrow: { fontSize: 22, fontWeight: "800", paddingHorizontal: 6 },
  navTitle: { fontSize: 16, fontWeight: "700" },
  hijri: { fontSize: 13, fontWeight: "600" },
  thead: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  trow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cellDayHead: { width: 44, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  cellWdHead: { width: 34, fontSize: 11, fontWeight: "700" },
  cellHead: { width: 72, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  cellDay: { width: 44, fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums" as const] },
  cellWd: { width: 34, fontSize: 11 },
  cell: { width: 72, fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums" as const] },
  ruleTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  ruleBody: { fontSize: 13, fontWeight: "500", lineHeight: 19 },
});
