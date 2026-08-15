import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CrescentMark } from "@/components/icons";
import { useMonthTimetable, useResolvedCity } from "@/hooks/use-prayer-data";
import { useTheme } from "@/hooks/use-theme";
import { MONTHS, formatPrayerTimeCompact } from "@/engine";
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
/** Rounding mode per column — mirrors the website's table. */
const COL_ROUND: Record<string, "round" | "ceil"> = {
  fajr: "round",
  sunrise: "round",
  dhuhr: "ceil",
  asr: "ceil",
  maghrib: "ceil",
  isha: "ceil",
};

export default function MonthScreen() {
  const colors = useTheme();
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const { city } = useResolvedCity();
  const use24h = useSettings((s) => s.clock) === "24h";
  const { timetable, loading } = useMonthTimetable(year, month);
  const isCustom = useSettings((s) => s.location.mode === "custom");

  const todayDay =
    today.getFullYear() === year && today.getMonth() + 1 === month ? today.getDate() : -1;
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

  // --- Auto-scroll to today's row -------------------------------------------
  // Scrolls once per viewed month (not on every recompute/interaction). Y is the
  // table card's offset in the scroll content plus the row's offset in the card,
  // minus a top offset so the header stays visible above today's row.
  const scrollRef = useRef<ScrollView>(null);
  const tableYRef = useRef<number | null>(null);
  const todayYRef = useRef<number | null>(null);
  const autoScrolledFor = useRef<string | null>(null);
  const monthKey = `${year}-${month}`;

  const tryAutoScroll = () => {
    if (todayDay === -1) return;
    if (autoScrolledFor.current === monthKey) return;
    const tableY = tableYRef.current;
    const rowY = todayYRef.current;
    if (tableY == null || rowY == null) return;
    autoScrolledFor.current = monthKey;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, tableY + rowY - 130), animated: false });
    });
  };

  useEffect(() => {
    if (!loading && timetable) tryAutoScroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, timetable, monthKey]);

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
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
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
              {timetable?.hijriRange ? (
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

          {/* Fit-to-width table (no horizontal scrolling) */}
          <View
            style={[styles.tableCard, { backgroundColor: colors.card }, colors.shadow]}
            onLayout={(e) => {
              tableYRef.current = e.nativeEvent.layout.y;
              tryAutoScroll();
            }}
          >
            {/* Column header */}
            <View style={[styles.thead, { borderBottomColor: colors.border }]}>
              <View style={styles.dayHeadCol}>
                <Text style={[styles.hText, { color: colors.textFaint }]}>DAY</Text>
              </View>
              {PRAYER_COLS.map((c) => (
                <View key={c} style={styles.col}>
                  <Text style={[styles.hText, { color: colors.textFaint }]}>
                    {COL_LABELS[c].toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>

            {loading || !timetable ? (
              <TableSkeleton colors={colors} />
            ) : (
              timetable.rows.map((r) => {
                const isToday = Number(r.gregorianDay) === todayDay;
                return (
                  <View
                    key={r.gregorianDay}
                    onLayout={
                      isToday
                        ? (e) => {
                            todayYRef.current = e.nativeEvent.layout.y;
                            tryAutoScroll();
                          }
                        : undefined
                    }
                    style={[
                      styles.trow,
                      { borderBottomColor: colors.border },
                      isToday && { backgroundColor: colors.accentSoft },
                    ]}
                  >
                    {/* Day + weekday stacked (today gets a filled accent circle) */}
                    <View style={styles.dayCol}>
                      {isToday ? (
                        <View style={[styles.todayCircle, { backgroundColor: colors.accent }]}>
                          <Text style={[styles.todayCircleText, { color: colors.textInvert }]}>
                            {Number(r.gregorianDay)}
                          </Text>
                        </View>
                      ) : (
                        <Text style={[styles.dayNum, { color: colors.text }]}>
                          {Number(r.gregorianDay)}
                        </Text>
                      )}
                      <Text style={[styles.dayWd, { color: isToday ? colors.accent : colors.textFaint }]}>
                        {r.weekday.toUpperCase()}
                      </Text>
                    </View>

                    {PRAYER_COLS.map((c) => {
                      const extreme =
                        (c === "fajr" && r.fajrRuleType !== "angle") ||
                        (c === "isha" && r.ishaRuleType !== "angle");
                      // Recompute the compact form from the stored full time.
                      const compact = toCompact(r[c], COL_ROUND[c], use24h);
                      return (
                        <View key={c} style={styles.col}>
                          <Text
                            style={[
                              styles.cell,
                              {
                                color: extreme ? colors.warning : isToday ? colors.text : colors.text,
                                fontWeight: extreme ? "700" : "600",
                              },
                            ]}
                          >
                            {compact}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })
            )}
          </View>

          {/* Info */}
          {timetable && (
            <View style={[styles.infoCard, { backgroundColor: colors.card }, colors.shadow]}>
              <Text style={[styles.infoTitle, { color: colors.accent }]}>CALCULATION</Text>
              <Text style={[styles.infoBody, { color: colors.textMuted, marginTop: 8 }]}>
                {timetable.ruleSummary}
              </Text>
              {!isCustom && (
                <Text style={[styles.infoBody, { color: colors.textFaint, marginTop: 8 }]}>
                  Cities: Tallinn · Tartu · or use your GPS location
                </Text>
              )}
              {use24h ? null : (
                <Text style={[styles.infoBody, { color: colors.textFaint, marginTop: 8 }]}>
                  a = AM · p = PM
                </Text>
              )}
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** Convert a stored "10:41 PM" cell to the compact "10:41p" form. */
function toCompact(full: string, mode: "round" | "ceil", use24h: boolean): string {
  // Parse "hh:mm AM/PM" or "hh:mm" back to minutes, then re-render compactly.
  const m = full.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/);
  if (!m) return full;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (m[3] === "PM" && h !== 12) h += 12;
  if (m[3] === "AM" && h === 12) h = 0;
  const minutes = h * 60 + min;
  void mode;
  return formatPrayerTimeCompact(minutes, "round", use24h);
}

function TableSkeleton({ colors }: { colors: ReturnType<typeof useTheme> }) {
  const rows = Array.from({ length: 12 });
  return (
    <View>
      {rows.map((_, i) => (
        <View key={i} style={styles.skRow}>
          <View style={styles.skDayCol}>
            <View style={[styles.skBar, styles.skDay, { backgroundColor: colors.surfaceAlt }]} />
          </View>
          {PRAYER_COLS.map((c) => (
            <View key={c} style={styles.col}>
              <View
                style={[
                  styles.skBar,
                  styles.skCell,
                  { backgroundColor: colors.surfaceAlt, opacity: 1 - i * 0.05 },
                ]}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dayHeadCol: { width: 44, alignItems: "center" },
  col: { flex: 1, alignItems: "center" },
  hText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },

  trow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  dayCol: { width: 44, alignItems: "center", justifyContent: "center" },
  dayNum: { fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums" as const] },
  todayCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  todayCircleText: {
    fontSize: 13,
    fontWeight: "800",
    fontVariant: ["tabular-nums" as const],
  },
  dayWd: { fontSize: 8, fontWeight: "700", letterSpacing: 0.5, marginTop: 1 },
  cell: { fontSize: 12, fontWeight: "600", fontVariant: ["tabular-nums" as const] },

  skRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  skDayCol: { width: 44, alignItems: "center" },
  skBar: { borderRadius: 4 },
  skDay: { width: 24, height: 14 },
  skCell: { width: 34, height: 11 },

  infoCard: { borderRadius: 22, padding: 18, marginTop: 14 },
  infoTitle: { fontSize: 10, fontWeight: "800", letterSpacing: 1.8 },
  infoBody: { fontSize: 13, fontWeight: "500", lineHeight: 19 },
});
