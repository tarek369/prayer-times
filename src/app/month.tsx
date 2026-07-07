import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, Screen, T } from "@/components/primitives";
import { useMonthTimetable } from "@/hooks/use-prayer-data";
import { useResolvedCity } from "@/hooks/use-prayer-data";
import { useTheme } from "@/hooks/use-theme";
import { MONTHS, CITIES } from "@/engine";
import { useSettings } from "@/store/settings";

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
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1..12
  const { city } = useResolvedCity();
  const timetable = useMonthTimetable(year, month);
  const colors = useTheme();

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
    <Screen>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={styles.header}>
          <T variant="section">Monthly Timetable</T>
          <T variant="title" align="center" style={{ marginTop: 2 }}>{city.label}</T>

          {/* Month navigation */}
          <View style={[styles.navRow, { borderColor: colors.border }]}>
            <Pressable onPress={prevMonth} hitSlop={12} style={styles.navBtn}>
              <T variant="mono" color={colors.accent}>‹</T>
            </Pressable>
            <Pressable onPress={jumpToday} hitSlop={8}>
              <T variant="body" color={colors.accent}>{MONTHS[month - 1]} {year}</T>
            </Pressable>
            <Pressable onPress={nextMonth} hitSlop={12} style={styles.navBtn}>
              <T variant="mono" color={colors.accent}>›</T>
            </Pressable>
          </View>

          {timetable.hijriRange ? (
            <T variant="caption" align="center">{timetable.hijriRange} AH</T>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 8, flex: 1 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: "100%" }}>
              <View style={{ height: 40 }}>
                <ScrollView>
                  {/* Header row */}
                  <View style={[styles.thead, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                    <T variant="caption" style={styles.cellDayHead}>Day</T>
                    <T variant="caption" style={styles.cellWdHead}>·</T>
                    {PRAYER_COLS.map((c) => (
                      <T key={c} variant="caption" style={styles.cellHead}>{COL_LABELS[c]}</T>
                    ))}
                  </View>

                  {timetable.rows.map((r, i) => {
                    const isToday = Number(r.gregorianDay) === todayDay;
                    const alt = i % 2 === 1;
                    return (
                      <View
                        key={r.gregorianDay}
                        style={[
                          styles.trow,
                          { backgroundColor: isToday ? colors.highlight : alt ? colors.surfaceAlt : colors.surface, borderColor: colors.border },
                        ]}
                      >
                        <T variant="mono" style={styles.cellDay}>{r.gregorianDay}</T>
                        <T variant="caption" style={styles.cellWd}>{r.weekday}</T>
                        {PRAYER_COLS.map((c) => {
                          const val = r[c];
                          const extreme = (c === "fajr" && r.fajrRuleType !== "angle") || (c === "isha" && r.ishaRuleType !== "angle");
                          return (
                            <T
                              key={c}
                              variant="mono"
                              style={styles.cell}
                              color={extreme ? colors.warning : colors.text}
                            >
                              {val}
                            </T>
                          );
                        })}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </ScrollView>
        </View>

        <Card style={{ margin: 12 }}>
          <T variant="section">How these times are calculated</T>
          <T variant="caption" style={{ marginTop: 6 }}>{timetable.ruleSummary}</T>
          {!isCustom && (
            <T variant="caption" style={{ marginTop: 6, color: colors.textMuted }}>
              Other cities: {Object.values(CITIES).map((c) => c.label).join(", ")}.
            </T>
          )}
        </Card>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  navBtn: {
    paddingHorizontal: 4,
  },
  thead: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  trow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cellDayHead: { width: 44, paddingLeft: 10, fontWeight: "700" },
  cellWdHead: { width: 36 },
  cellHead: { width: 74, fontWeight: "700" },
  cellDay: { width: 44, paddingLeft: 10, fontSize: 14 },
  cellWd: { width: 36, fontSize: 11 },
  cell: { width: 74, fontSize: 14 },
});
