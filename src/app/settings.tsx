import { useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

import { CrescentMark, PrayerIcon, TabSettingsIcon } from "@/components/icons";
import { useTheme } from "@/hooks/use-theme";
import { useToday } from "@/hooks/use-prayer-data";
import { CITIES, MONTHS } from "@/engine";
import type { IshaMode, PrayerKey } from "@/engine";
import { useSettings } from "@/store/settings";
import { requestNotificationPermission, reschedulePrayerNotifications } from "@/notifications/scheduler";
import { updateNextPrayerWidget } from "@/widgets/widgetTask";
import { publishWidgetSnapshot } from "@/widgets/sharedDefaults";
import { accentForTime } from "@/theme/palettes";

const PRAYER_KEYS: Exclude<PrayerKey, "sunrise">[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export default function SettingsScreen() {
  const colors = useTheme();
  const s = useSettings();
  const { day } = useToday();
  const t = day.times;

  // Same time-adaptive accent as the home screen, so Settings feels part of the app.
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const period = accentForTime(nowMin, {
    fajr: t.fajr.time,
    sunrise: t.sunrise ?? t.fajr.time + 90,
    dhuhr: t.dhuhr,
    asr: t.asr ?? t.maghrib,
    maghrib: t.maghrib,
    isha: t.isha.time,
  });

  // Reschedule notifications + refresh widgets whenever settings that affect them change.
  useEffect(() => {
    reschedulePrayerNotifications(30).catch(() => {});
    updateNextPrayerWidget().catch(() => {});
    publishWidgetSnapshot().catch(() => {});
  }, [s.location, s.method, s.ishaMonthRules, s.notifications, s.clock]);

  const [reminderText, setReminderText] = useState(String(s.notifications.reminderMinutesBefore));
  useEffect(() => setReminderText(String(s.notifications.reminderMinutesBefore)), [s.notifications.reminderMinutesBefore]);

  async function onUseLocation() {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Location denied", "Allow location access to use prayer times for your GPS position.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Tallinn";
      s.useCustomLocation({
        label: "My location",
        latitude: Number(pos.coords.latitude.toFixed(4)),
        longitude: Number(pos.coords.longitude.toFixed(4)),
        timeZone: tz,
      });
    } catch {
      Alert.alert("Location error", "Could not get your current location.");
    }
  }

  async function onEnableNotifications(value: boolean) {
    if (value) {
      const ok = await requestNotificationPermission();
      if (!ok) {
        Alert.alert("Notifications blocked", "Enable notifications in Settings to receive prayer reminders.", [
          { text: "Open Settings", onPress: () => Linking.openSettings() },
          { text: "Cancel", style: "cancel" },
        ]);
        return;
      }
    }
    s.setNotifications({ enabled: value });
  }

  const switchTrack = { false: colors.surfaceAlt, true: period.accent };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header — matches the home screen */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <CrescentMark size={20} color={period.accent} />
              <Text style={[styles.kicker, { color: colors.textFaint }]}>PRAYER ESTONIA</Text>
            </View>
            <View style={styles.headerTitleRow}>
              <TabSettingsIcon size={22} color={period.accent} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
            </View>
          </View>

          {/* Location */}
          <SectionLabel colors={colors}>Location</SectionLabel>
          <View style={[styles.card, { backgroundColor: colors.card }, colors.shadow]}>
            {Object.values(CITIES).map((c, i) => {
              const active = s.location.mode === "preset" && s.location.presetKey === c.key;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => s.usePresetCity(c.key)}
                  style={({ pressed }) => [
                    styles.selectRow,
                    i > 0 && styles.rowBorder,
                    pressed && { opacity: 0.6 },
                    active && { backgroundColor: colors.accentSoft },
                  ]}
                >
                  <Text style={[styles.rowTitle, { color: active ? period.accent : colors.text }]}>
                    {c.label}
                  </Text>
                  {active && <Check color={period.accent} />}
                </Pressable>
              );
            })}
            <View style={styles.rowBorder} />
            <Pressable
              onPress={onUseLocation}
              style={({ pressed }) => [styles.selectRow, pressed && { opacity: 0.6 }]}
            >
              <Text
                style={[
                  styles.rowTitle,
                  { color: s.location.mode === "custom" ? period.accent : colors.text },
                ]}
              >
                {s.location.mode === "custom" ? s.location.label : "Use my location"}
              </Text>
              {s.location.mode === "custom" && <Check color={period.accent} />}
            </Pressable>
            {s.location.mode === "custom" && s.location.latitude && (
              <Text style={[styles.coords, { color: colors.textFaint }]}>
                {s.location.latitude.toFixed(4)}, {s.location.longitude?.toFixed(4)} · {s.location.timeZone}
              </Text>
            )}
          </View>

          {/* Notifications */}
          <SectionLabel colors={colors}>Notifications</SectionLabel>
          <View style={[styles.card, { backgroundColor: colors.card }, colors.shadow]}>
            <Row colors={colors} label="Prayer notifications" first>
              <Switch
                value={s.notifications.enabled}
                onValueChange={onEnableNotifications}
                trackColor={switchTrack}
                thumbColor="#ffffff"
              />
            </Row>
            {s.notifications.enabled && (
              <>
                {PRAYER_KEYS.map((p) => {
                  const Icon = PrayerIcon[p];
                  return (
                    <Row
                      key={p}
                      colors={colors}
                      label={p.charAt(0).toUpperCase() + p.slice(1)}
                      icon={<Icon size={18} color={colors.textMuted} />}
                    >
                      <Switch
                        value={s.notifications.prayers[p]}
                        onValueChange={(v) =>
                          s.setNotifications({ prayers: { ...s.notifications.prayers, [p]: v } })
                        }
                        trackColor={switchTrack}
                        thumbColor="#ffffff"
                      />
                    </Row>
                  );
                })}
                <Row colors={colors} label="Reminder before">
                  <InlineNumberInput
                    value={reminderText}
                    suffix="min"
                    onEnd={(text) => {
                      const n = Math.max(0, Math.min(120, Number(text) || 0));
                      setReminderText(String(n));
                      s.setNotifications({ reminderMinutesBefore: n });
                    }}
                  />
                </Row>
                <Row colors={colors} label="Sound" last>
                  <Switch
                    value={s.notifications.sound}
                    onValueChange={(v) => s.setNotifications({ sound: v })}
                    trackColor={switchTrack}
                    thumbColor="#ffffff"
                  />
                </Row>
              </>
            )}
          </View>

          {/* Auto-silence (Android only) */}
          {Platform.OS === "android" && (
            <>
              <SectionLabel colors={colors}>Auto-silence at prayer</SectionLabel>
              <View style={[styles.card, { backgroundColor: colors.card }, colors.shadow]}>
                <Row colors={colors} label="Silence ringer at adhan" first>
                  <Switch
                    value={s.silence.enabled}
                    onValueChange={async (v) => {
                      if (v) {
                        await Notifications.requestPermissionsAsync();
                        const ok = await maybeOpenDndAccess();
                        if (!ok) {
                          Alert.alert(
                            "Permission needed",
                            "To silence the ringer, grant Do-Not-Disturb access to the app in system settings.",
                            [
                              { text: "Open Settings", onPress: () => Linking.openSettings() },
                              { text: "Cancel", style: "cancel" },
                            ],
                          );
                          return;
                        }
                      }
                      s.setSilence({ enabled: v });
                    }}
                    trackColor={switchTrack}
                    thumbColor="#ffffff"
                  />
                </Row>
                {s.silence.enabled && (
                  <>
                    <Row colors={colors} label="Mode">
                      <Segmented
                        accent={period.accent}
                        surface={colors.surfaceAlt}
                        text={colors.text}
                        muted={colors.textMuted}
                        invert={colors.textInvert}
                        options={["vibrate", "silent"]}
                        value={s.silence.mode}
                        onChange={(mode) => s.setSilence({ mode: mode as "vibrate" | "silent" })}
                      />
                    </Row>
                    <Row colors={colors} label="Restore after" last>
                      <InlineNumberInput
                        value={String(s.silence.restoreAfterMinutes)}
                        suffix="min"
                        onEnd={(text) => {
                          const n = Math.max(1, Math.min(180, Number(text) || 20));
                          s.setSilence({ restoreAfterMinutes: n });
                        }}
                      />
                    </Row>
                  </>
                )}
                <Text style={[styles.note, { color: colors.textFaint }]}>
                  Android only — iOS does not allow apps to change the ringer. Use a Focus there.
                </Text>
              </View>
            </>
          )}

          {/* Calculation method */}
          <SectionLabel colors={colors}>Calculation method</SectionLabel>
          <View style={[styles.card, { backgroundColor: colors.card }, colors.shadow]}>
            <MethodNumber colors={colors} label="Fajr angle" unit="°" value={String(s.method.fajrAngle)} onEnd={(x) => s.setMethod({ fajrAngle: clampNum(x, 0, 30, s.method.fajrAngle) })} />
            <MethodNumber colors={colors} label="Isha angle" unit="°" value={String(s.method.ishaAngle)} onEnd={(x) => s.setMethod({ ishaAngle: clampNum(x, 0, 30, s.method.ishaAngle) })} />
            <MethodNumber colors={colors} label="Asr shadow factor" unit="" hint="1 = Shafi · 2 = Hanafi" value={String(s.method.asrShadowFactor)} onEnd={(x) => s.setMethod({ asrShadowFactor: clampNum(x, 1, 2, s.method.asrShadowFactor) })} />
            <MethodNumber colors={colors} label="Dhuhr offset" unit="min" value={String(s.method.dhuhrOffsetMinutes)} onEnd={(x) => s.setMethod({ dhuhrOffsetMinutes: clampNum(x, -30, 30, s.method.dhuhrOffsetMinutes) })} />
            <MethodNumber colors={colors} label="Maghrib offset" unit="min" value={String(s.method.maghribOffsetMinutes)} onEnd={(x) => s.setMethod({ maghribOffsetMinutes: clampNum(x, -30, 30, s.method.maghribOffsetMinutes) })} last />
          </View>

          {/* Isha month rules */}
          <SectionLabel colors={colors}>Isha rules by month</SectionLabel>
          <View style={[styles.card, { backgroundColor: colors.card }, colors.shadow]}>
            {MONTHS.map((mName, idx) => {
              const month = idx + 1;
              const rule = s.ishaMonthRules[month];
              const summer = rule.mode === "fixedAfterMaghrib";
              return (
                <Pressable
                  key={month}
                  style={({ pressed }) => [
                    styles.monthRow,
                    idx > 0 && styles.rowBorder,
                    pressed && { opacity: 0.6 },
                  ]}
                  onPress={() => {
                    const nextMode: IshaMode = summer ? "anglePreferred" : "fixedAfterMaghrib";
                    s.setIshaMonthRule(month, { mode: nextMode });
                  }}
                >
                  <Text style={[styles.monthName, { color: colors.text }]}>{mName}</Text>
                  <View
                    style={[
                      styles.rulePill,
                      { backgroundColor: summer ? period.accent : colors.surfaceAlt },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: summer ? colors.textInvert : colors.textMuted,
                      }}
                    >
                      {summer ? `+${rule.fallbackMinutes} min` : "15°"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            <Text style={[styles.note, { color: colors.textFaint }]}>
              Tap a month to toggle between the 15° angle and the summer Maghrib-plus rule.
            </Text>
          </View>

          {/* Appearance */}
          <SectionLabel colors={colors}>Appearance</SectionLabel>
          <View style={[styles.card, { backgroundColor: colors.card }, colors.shadow]}>
            <Row
              colors={colors}
              label="Theme"
              first
              icon={<Dot size={14} color={period.accent} />}
            >
              <Segmented
                accent={period.accent}
                surface={colors.surfaceAlt}
                text={colors.text}
                muted={colors.textMuted}
                invert={colors.textInvert}
                options={["system", "light", "dark"]}
                value={s.theme}
                onChange={(v) => s.setTheme(v as "system" | "light" | "dark")}
              />
            </Row>
            <Row colors={colors} label="Clock" last icon={<Dot size={14} color={colors.surfaceAlt} />}>
              <Segmented
                accent={period.accent}
                surface={colors.surfaceAlt}
                text={colors.text}
                muted={colors.textMuted}
                invert={colors.textInvert}
                options={["12h", "24h"]}
                value={s.clock}
                onChange={(v) => s.setClock(v as "12h" | "24h")}
              />
            </Row>
          </View>

          {/* Danger zone */}
          <SectionLabel colors={colors} danger>Reset</SectionLabel>
          <Pressable
            onPress={() => {
              Alert.alert("Reset to defaults", "Restore the Estonia (Tallinn) method and defaults?", [
                { text: "Cancel", style: "cancel" },
                { text: "Reset", style: "destructive", onPress: () => s.resetToDefaults() },
              ]);
            }}
            style={({ pressed }) => [
              styles.resetBtn,
              { backgroundColor: colors.surfaceAlt },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.danger }}>
              Reset to defaults
            </Text>
          </Pressable>

          <Text style={[styles.footer, { color: colors.textFaint }]}>
            Calculation method from eestiislamikeskus.org
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* --------------------------------------------------------------- */
/* Building blocks                                                  */
/* --------------------------------------------------------------- */

type Theme = ReturnType<typeof useTheme>;

function SectionLabel({
  colors,
  children,
  danger,
}: {
  colors: Theme;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 2,
        textTransform: "uppercase",
        color: danger ? colors.danger : colors.textFaint,
        marginTop: 26,
        marginBottom: 10,
        marginHorizontal: 4,
      }}
    >
      {children}
    </Text>
  );
}

function Row({
  colors,
  label,
  children,
  icon,
  first,
  last,
}: {
  colors: Theme;
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[!first && styles.rowBorder]}>
      <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
        {icon ? <View style={{ marginRight: 10, width: 20, alignItems: "center" }}>{icon}</View> : null}
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text, flex: 1 }}>
          {label}
        </Text>
        {children}
      </View>
    </View>
  );
}

function Check({ color }: { color: string }) {
  return (
    <Text style={{ fontSize: 16, fontWeight: "800", color }}>✓</Text>
  );
}

function Dot({ size, color }: { size: number; color: string }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

function InlineNumberInput({
  value,
  onEnd,
  suffix,
}: {
  value: string;
  onEnd: (text: string) => void;
  suffix?: string;
}) {
  const colors = useTheme();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <View style={[styles.numWrap, { backgroundColor: colors.surfaceAlt }]}>
      <TextInput
        value={text}
        onChangeText={setText}
        onEndEditing={() => onEnd(text)}
        keyboardType="numeric"
        selectTextOnFocus
        style={{
          width: 44,
          textAlign: "center",
          paddingVertical: 6,
          fontSize: 15,
          fontWeight: "700",
          color: colors.text,
          fontVariant: ["tabular-nums" as const],
        }}
      />
      {suffix ? (
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textFaint, marginRight: 8 }}>
          {suffix}
        </Text>
      ) : null}
    </View>
  );
}

function MethodNumber({
  colors,
  label,
  unit,
  hint,
  value,
  onEnd,
  last,
}: {
  colors: Theme;
  label: string;
  unit: string;
  hint?: string;
  value: string;
  onEnd: (t: string) => void;
  last?: boolean;
}) {
  return (
    <View style={[!last && styles.rowBorder, styles.row, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
          {label}
          {unit ? ` (${unit})` : ""}
        </Text>
        {hint ? (
          <Text style={{ fontSize: 12, fontWeight: "500", color: colors.textFaint, marginTop: 2 }}>
            {hint}
          </Text>
        ) : null}
      </View>
      <InlineNumberInput value={value} onEnd={onEnd} suffix={unit || undefined} />
    </View>
  );
}

function Segmented({
  options,
  value,
  onChange,
  accent,
  surface,
  text,
  muted,
  invert,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  accent: string;
  surface: string;
  text: string;
  muted: string;
  invert: string;
}) {
  return (
    <View style={[styles.segTrack, { backgroundColor: surface }]}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.segItem, active && { backgroundColor: accent }]}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                textTransform: "capitalize",
                color: active ? invert : muted,
              }}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function clampNum(text: string, min: number, max: number, fallback: number): number {
  const n = Number(text);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

async function maybeOpenDndAccess(): Promise<boolean> {
  try {
    await Linking.openSettings();
    return true;
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },
  header: { alignItems: "center", marginBottom: 6 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  kicker: { fontSize: 10, fontWeight: "800", letterSpacing: 2.2 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 24, fontWeight: "800", letterSpacing: 0.2 },

  card: { borderRadius: 22, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 18,
    gap: 12,
    minHeight: 50,
  },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(128,128,128,0.18)" },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 18,
    minHeight: 50,
  },
  rowTitle: { fontSize: 15, fontWeight: "600", flex: 1 },
  coords: { fontSize: 12, fontWeight: "500", paddingHorizontal: 18, paddingBottom: 12 },
  note: { fontSize: 12, fontWeight: "500", paddingHorizontal: 18, paddingVertical: 12, lineHeight: 17 },

  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    paddingHorizontal: 18,
    minHeight: 48,
  },
  monthName: { fontSize: 15, fontWeight: "600" },
  rulePill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },

  numWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    overflow: "hidden",
  },

  segTrack: { flexDirection: "row", borderRadius: 12, padding: 3, gap: 2 },
  segItem: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 9,
    alignItems: "center",
  },

  resetBtn: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  footer: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 20,
  },
});
