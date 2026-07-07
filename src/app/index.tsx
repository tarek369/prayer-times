import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, Screen, T } from "@/components/primitives";
import { useNextPrayer } from "@/hooks/use-prayer-data";
import { useTheme } from "@/hooks/use-theme";
import { formatPrayerTime, formatCountdown, PRAYER_META, PRAYER_ORDER } from "@/engine";
import type { PrayerKey } from "@/engine";

export default function TodayScreen() {
  const { now, next, today, city } = useNextPrayer(1000);
  const colors = useTheme();

  const hijriText = today.hijri
    ? `${today.hijri.day} ${today.hijri.month} ${today.hijri.year} AH`
    : "";
  const gregText = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const nextLabel = PRAYER_META[next.key].label;
  const nextTimeStr = formatPrayerTime(next.minutes % 1440, "round", false);

  function rowStyle(key: PrayerKey) {
    const isNext = key === next.key;
    return isNext ? { backgroundColor: colors.prayerActiveBg } : null;
  }

  function renderRow(key: PrayerKey) {
    const meta = PRAYER_META[key];
    const t = today.times;
    let minutes: number | null = null;
    switch (key) {
      case "fajr": minutes = t.fajr.time; break;
      case "sunrise": minutes = t.sunrise; break;
      case "dhuhr": minutes = t.dhuhr; break;
      case "asr": minutes = t.asr; break;
      case "maghrib": minutes = t.maghrib; break;
      case "isha": minutes = t.isha.time; break;
    }
    const isNext = key === next.key;
    return (
      <View key={key} style={[styles.row, rowStyle(key)]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isNext && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />}
          <T variant="body" color={isNext ? colors.accent : colors.text}>
            {meta.label}
          </T>
        </View>
        <T variant="mono" color={isNext ? colors.accent : colors.text}>
          {formatPrayerTime(minutes, "round", false)}
        </T>
      </View>
    );
  }

  return (
    <Screen>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <T variant="section">Prayer Estonia</T>
            <T variant="title">{city.label}</T>
            <T variant="caption">{gregText}</T>
            {hijriText ? <T variant="caption" color={colors.accent}>{hijriText}</T> : null}
          </View>

          {/* Hero countdown */}
          <Card style={styles.hero}>
            <T variant="section" align="center">Next prayer</T>
            <T variant="monoHero" align="center" style={{ marginVertical: 8 }}>{nextLabel}</T>
            <T variant="monoLarge" align="center">{nextTimeStr}</T>
            <View style={[styles.pill, { backgroundColor: colors.accentSoft, marginTop: 12 }]}>
              <T variant="body" color={colors.accent}>in {formatCountdown(next.minutesUntil)}</T>
            </View>
          </Card>

          {/* Rule badges */}
          {(today.times.fajr.ruleType !== "angle" || today.times.isha.ruleType !== "angle") && (
            <View style={styles.badges}>
              {today.times.fajr.ruleType !== "angle" && (
                <View style={[styles.pill, { backgroundColor: colors.accentSoft }]}>
                  <T variant="caption" color={colors.accent}>Fajr: high-latitude rule</T>
                </View>
              )}
              {today.times.isha.ruleType !== "angle" && (
                <View style={[styles.pill, { backgroundColor: colors.accentSoft }]}>
                  <T variant="caption" color={colors.accent}>
                    Isha: Maghrib + {today.times.isha.minutesAfterMaghrib} min
                  </T>
                </View>
              )}
            </View>
          )}

          {/* Prayer list */}
          <Card style={styles.listCard}>
            {PRAYER_ORDER.map((key) => renderRow(key))}
          </Card>

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    alignItems: "center",
    gap: 4,
    paddingTop: 8,
    paddingBottom: 4,
  },
  hero: {
    alignItems: "center",
    paddingVertical: 24,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  listCard: {
    padding: 0,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
