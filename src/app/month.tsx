import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CrescentMark } from "@/components/icons";
import { useMonthTimetable, useResolvedCity } from "@/hooks/use-prayer-data";
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
  const colors = useTheme();
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const { city } = useResolvedCity();
  const timetable = useMonthTimetable(year, month);
  const isCustom = useSettings((s) => s.location.mode === "custom");

  const todayDay =
    today.getFullYear() === year && today.getMonth() + 1 === month ? today.getDate() : -1;

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

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <CrescentMark size={18} color={colors.accent} />
              <Text style={[styles.kicker, { color: colors.textFaint }]}>TIMETABLE</Text>
            </View>
            <Text style={[styles.city, { color: colors.text }]}>{city.label}</Text>
          </View>

          {/* Month switcher */}
          <View style={[styles.switcher, { backgroundColor: colors.card }, colors.shadow]}>
            <Pressable
              onPress={prevMonth}
              hitSlop={12}
              style={[styles.switchBtn, { backgroundColor: colors.surfaceAlt }]}
            >
              <Text style={[styles.switchArrow, { color: colors.text }]}>‹</Text>
            </Pressable>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={[styles.monthTitle, { color: colors.text }]}>
                {MONTHS[month - 1]} {year}
              </Text>
              {timetable.hijriRange ? (
                <Text style={[styles.hijri, { color: colors.textFaint }]}>
                  {timetable.hijriRange} AH
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={nextMonth}
              hitSlop={12}
              style={[styles.switchBtn, { backgroundColor: colors.surfaceAlt }]}
            >
              <Text style={[styles.switchArrow, { color: colors.text }]}>›</Text>
            </Pressable>
          </View>

          {!isCurrentMonth && (
            <Pressable onPress={jumpToday} style={{ alignSelf: "center", marginBottom: 12 }}>
              <Text style={[styles.todayLink, { color: colors.accent }]}>Jump to today</Text>
            </Pressable>
          )}

          {/* Table */}
          <View style={[styles.tableCard, { backgroundColor: colors.card }, colors.shadow]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 430 }}>
                {/* Header */}
                <View style={[styles.thead, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.hCell, styles.hDay, { color: colors.textFaint }]}>DAY</Text>
                  {PRAYER_COLS.map((c) => (
                    <Text key={c} style={[styles.hCell, { color: colors.textFaint }]}>
                      {COL_LABELS[c].toUpperCase()}
                    </Text>
                  ))}
                </View>

                {timetable.rows.map((r) => {
                  const isToday = Number(r.gregorianDay) === todayDay;
                  return (
                    <View
                      key={r.gregorianDay}
                      style={[
                        styles.trow,
                        { borderBottomColor: colors.border },
                        isToday && { backgroundColor: colors.accentSoft },
                      ]}
                    >
                      <Text
                        style={[
                          styles.cellDay,
                          { color: isToday ? colors.accent : colors.text },
                        ]}
                      >
                        {r.gregorianDay}
                      </Text>
                      <Text style={[styles.cellWd, { color: colors.textFaint }]}>
                        {r.weekday.slice(0, 2)}
                      </Text>
                      {PRAYER_COLS.map((c) => {
                        const extreme =
                          (c === "fajr" && r.fajrRuleType !== "angle") ||
                          (c === "isha" && r.ishaRuleType !== "angle");
                        return (
                          <Text
                            key={c}
                            style={[
                              styles.cell,
                              {
                                color: extreme ? colors.warning : colors.text,
                                fontWeight: extreme ? "700" : "600",
                              },
                            ]}
                          >
                            {r[c]}
                          </Text>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Info */}
          <View style={[styles.infoCard, { backgroundColor: colors.card }, colors.shadow]}>
            <Text style={[styles.infoTitle, { color: colors.accent }]}>CALCULATION</Text>
            <Text style={[styles.infoBody, { color: colors.textMuted, marginTop: 8 }]}>
              {timetable.ruleSummary}
            </Text>
            {!isCustom && (
              <Text style={[styles.infoBody, { color: colors.textFaint, marginTop: 8 }]}>
                {Object.values(CITIES).map((c) => c.label).join(" · ")}
              </Text>
            )}
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  header: { alignItems: "center", marginBottom: 16 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  kicker: { fontSize: 10, fontWeight: "800", letterSpacing: 2.2 },
  city: { fontSize: 22, fontWeight: "800" },

  switcher: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 8,
    marginBottom: 14,
  },
  switchBtn: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  switchArrow: { fontSize: 20, fontWeight: "800" },
  monthTitle: { fontSize: 17, fontWeight: "800" },
  hijri: { fontSize: 11, fontWeight: "600", marginTop: 1 },
  todayLink: { fontSize: 13, fontWeight: "700" },

  tableCard: { borderRadius: 22, overflow: "hidden" },
  thead: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  hCell: { width: 70, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  hDay: { width: 34 },
  trow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cellDay: { width: 34, fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums" as const] },
  cellWd: { width: 24, fontSize: 10, fontWeight: "600", marginRight: 12 },
  cell: { width: 70, fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums" as const] },

  infoCard: { borderRadius: 22, padding: 18, marginTop: 16 },
  infoTitle: { fontSize: 10, fontWeight: "800", letterSpacing: 1.8 },
  infoBody: { fontSize: 13, fontWeight: "500", lineHeight: 19 },
});
