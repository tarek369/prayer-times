import { useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

import { Card, T } from "@/components/primitives";
import { useTheme } from "@/hooks/use-theme";
import { PERIOD_PALETTES } from "@/theme/palettes";
import { CITIES, MONTHS } from "@/engine";
import { useSettings } from "@/store/settings";
import { requestNotificationPermission, reschedulePrayerNotifications } from "@/notifications/scheduler";
import { updateNextPrayerWidget } from "@/widgets/widgetTask";
import { publishWidgetSnapshot } from "@/widgets/sharedDefaults";
import type { IshaMode } from "@/engine";

export default function SettingsScreen() {
  const colors = useTheme();
  const palette = PERIOD_PALETTES.neutral;
  const s = useSettings();

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

  return (
    <View style={{ flex: 1, backgroundColor: palette.sky[0] }}>
      <LinearGradient colors={palette.sky} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <T variant="section">Location</T>
          <Card style={{ marginTop: 8 }}>
            {Object.values(CITIES).map((c) => {
              const active = s.location.mode === "preset" && s.location.presetKey === c.key;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => s.usePresetCity(c.key)}
                  style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.6 }]}
                >
                  <T variant="body" color={active ? colors.accent : colors.text}>{c.label}</T>
                  {active && <T variant="body" color={colors.accent}>✓</T>}
                </Pressable>
              );
            })}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Pressable onPress={onUseLocation} style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.6 }]}>
              <T variant="body" color={s.location.mode === "custom" ? colors.accent : colors.text}>
                {s.location.mode === "custom" ? `📍 ${s.location.label}` : "📍 Use my location (GPS)"}
              </T>
              {s.location.mode === "custom" && <T variant="body" color={colors.accent}>✓</T>}
            </Pressable>
            {s.location.mode === "custom" && s.location.latitude && (
              <T variant="caption" style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                {s.location.latitude.toFixed(4)}, {s.location.longitude?.toFixed(4)} · {s.location.timeZone}
              </T>
            )}
          </Card>

          {/* Notifications */}
          <T variant="section" style={{ marginTop: 20 }}>Notifications</T>
          <Card style={{ marginTop: 8 }}>
            <Row label="Prayer notifications">
              <Switch
                value={s.notifications.enabled}
                onValueChange={onEnableNotifications}
                trackColor={{ false: colors.border, true: colors.accent }}
              />
            </Row>
            {s.notifications.enabled && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
                {(["fajr", "dhuhr", "asr", "maghrib", "isha"] as const).map((p) => (
                  <Row key={p} label={p.charAt(0).toUpperCase() + p.slice(1)}>
                    <Switch
                      value={s.notifications.prayers[p]}
                      onValueChange={(v) =>
                        s.setNotifications({ prayers: { ...s.notifications.prayers, [p]: v } })
                      }
                      trackColor={{ false: colors.border, true: colors.accent }}
                    />
                  </Row>
                ))}
                <Row label="Reminder (min before)">
                  <InlineNumberInput
                    value={reminderText}
                    onEnd={(text) => {
                      const n = Math.max(0, Math.min(120, Number(text) || 0));
                      setReminderText(String(n));
                      s.setNotifications({ reminderMinutesBefore: n });
                    }}
                  />
                </Row>
                <Row label="Sound">
                  <Switch
                    value={s.notifications.sound}
                    onValueChange={(v) => s.setNotifications({ sound: v })}
                    trackColor={{ false: colors.border, true: colors.accent }}
                  />
                </Row>
              </View>
            )}
          </Card>

          {/* Auto-silence (Android only) */}
          {Platform.OS === "android" && (
            <>
              <T variant="section" style={{ marginTop: 20 }}>Auto-silence at prayer</T>
              <Card style={{ marginTop: 8 }}>
                <Row label="Silence ringer at adhan">
                  <Switch
                    value={s.silence.enabled}
                    onValueChange={async (v) => {
                      if (v) {
                        const granted = await Notifications.requestPermissionsAsync();
                        // Android: needs Do-Not-Disturb access (Notification Policy).
                        // We deep-link the user to the setting because granting requires system UI.
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
                        void granted;
                      }
                      s.setSilence({ enabled: v });
                    }}
                    trackColor={{ false: colors.border, true: colors.accent }}
                  />
                </Row>
                {s.silence.enabled && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
                    <Row label="Mode">
                      <Segmented
                        options={["vibrate", "silent"]}
                        value={s.silence.mode}
                        onChange={(mode) => s.setSilence({ mode: mode as "vibrate" | "silent" })}
                      />
                    </Row>
                    <Row label="Restore after (min)">
                      <InlineNumberInput
                        value={String(s.silence.restoreAfterMinutes)}
                        onEnd={(text) => {
                          const n = Math.max(1, Math.min(180, Number(text) || 20));
                          s.setSilence({ restoreAfterMinutes: n });
                        }}
                      />
                    </Row>
                  </View>
                )}
                <T variant="caption" style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                  Automatic silencing is available on Android only. On iOS, use a Do-Not-Disturb Focus instead.
                </T>
              </Card>
            </>
          )}

          {/* Advanced method overrides */}
          <T variant="section" style={{ marginTop: 20 }}>Calculation method (advanced)</T>
          <Card style={{ marginTop: 8 }}>
            <MethodNumber label="Fajr angle (°)" value={String(s.method.fajrAngle)} onEnd={(t) => s.setMethod({ fajrAngle: clampNum(t, 0, 30, s.method.fajrAngle) })} />
            <MethodNumber label="Isha angle (°)" value={String(s.method.ishaAngle)} onEnd={(t) => s.setMethod({ ishaAngle: clampNum(t, 0, 30, s.method.ishaAngle) })} />
            <MethodNumber label="Asr shadow factor (1=Shafi, 2=Hanafi)" value={String(s.method.asrShadowFactor)} onEnd={(t) => s.setMethod({ asrShadowFactor: clampNum(t, 1, 2, s.method.asrShadowFactor) })} />
            <MethodNumber label="Dhuhr offset (min)" value={String(s.method.dhuhrOffsetMinutes)} onEnd={(t) => s.setMethod({ dhuhrOffsetMinutes: clampNum(t, -30, 30, s.method.dhuhrOffsetMinutes) })} />
            <MethodNumber label="Maghrib offset (min)" value={String(s.method.maghribOffsetMinutes)} onEnd={(t) => s.setMethod({ maghribOffsetMinutes: clampNum(t, -30, 30, s.method.maghribOffsetMinutes) })} />
          </Card>

          {/* Isha month rules */}
          <T variant="section" style={{ marginTop: 20 }}>Isha rules by month</T>
          <Card style={{ marginTop: 8 }}>
            {MONTHS.map((mName, idx) => {
              const month = idx + 1;
              const rule = s.ishaMonthRules[month];
              return (
                <Pressable
                  key={month}
                  style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.6 }]}
                  onPress={() => {
                    const nextMode: IshaMode = rule.mode === "fixedAfterMaghrib" ? "anglePreferred" : "fixedAfterMaghrib";
                    s.setIshaMonthRule(month, { mode: nextMode });
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <T variant="body">{mName}</T>
                    <T variant="caption">{rule.mode === "fixedAfterMaghrib" ? `Maghrib + ${rule.fallbackMinutes} min` : "15° angle"}</T>
                  </View>
                  <T variant="caption" color={colors.accent}>{rule.mode === "fixedAfterMaghrib" ? "Summer" : "Angle"}</T>
                </Pressable>
              );
            })}
            <T variant="caption" style={{ padding: 16 }}>Tap a month to toggle between the 15° angle and the summer "Maghrib + 90 min" rule.</T>
          </Card>

          {/* Appearance */}
          <T variant="section" style={{ marginTop: 20 }}>Appearance</T>
          <Card style={{ marginTop: 8 }}>
            <Row label="Theme">
              <Segmented options={["system", "light", "dark"]} value={s.theme} onChange={(v) => s.setTheme(v as "system" | "light" | "dark")} />
            </Row>
            <Row label="Clock">
              <Segmented options={["12h", "24h"]} value={s.clock} onChange={(v) => s.setClock(v as "12h" | "24h")} />
            </Row>
          </Card>

          <Pressable
            onPress={() => {
              Alert.alert("Reset to defaults", "Restore the Estonia (Tallinn) method and defaults?", [
                { text: "Cancel", style: "cancel" },
                { text: "Reset", style: "destructive", onPress: () => s.resetToDefaults() },
              ]);
            }}
            style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.6 }, { borderColor: colors.danger }]}
          >
            <T variant="body" color={colors.danger}>Reset to defaults</T>
          </Pressable>

          <T variant="caption" style={{ textAlign: "center", marginTop: 12, marginBottom: 32 }}>
            Defaults from eestiislamikeskus.org · Prayer v1.0
          </T>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* --------------------------------------------------------------- */
/* Small building blocks                                            */
/* --------------------------------------------------------------- */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.optionRow}>
      <T variant="body">{label}</T>
      {children}
    </View>
  );
}

function InlineNumberInput({ value, onEnd }: { value: string; onEnd: (text: string) => void }) {
  const colors = useTheme();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <TextInput
      value={text}
      onChangeText={setText}
      onEndEditing={() => onEnd(text)}
      keyboardType="numeric"
      style={{
        width: 64,
        textAlign: "center",
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        color: colors.text,
      }}
    />
  );
}

function MethodNumber({ label, value, onEnd }: { label: string; value: string; onEnd: (t: string) => void }) {
  return (
    <View style={styles.optionRow}>
      <T variant="body" style={{ flex: 1 }}>{label}</T>
      <InlineNumberInput value={value} onEnd={onEnd} />
    </View>
  );
}

function Segmented({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const colors = useTheme();
  return (
    <View style={{ flexDirection: "row", borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, overflow: "hidden" }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              backgroundColor: active ? colors.accent : "transparent",
            }}
          >
            <T variant="caption" color={active ? colors.textInvert : colors.textMuted} style={{ textTransform: "none" }}>
              {opt}
            </T>
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
  // Android Notification Policy access can't be queried reliably pre-grant; we open the
  // system settings page so the user can enable it. Return true optimistically once there.
  try {
    await Linking.openSettings();
    return true;
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  resetBtn: {
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
});
