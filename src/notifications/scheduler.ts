/**
 * Notification scheduling.
 *
 * Reschedules the five daily prayers (plus an optional pre-adhan reminder) for the
 * next N days using expo-notifications. Triggers are computed from the engine, so
 * notifications follow the same method/city/rules as the on-screen times.
 *
 * Note: exact-millisecond scheduling is best-effort on Android (Doze/foreground-service
 * rules); on iOS it's reliable up to 64 pending triggers. We schedule ~30 days and
 * refresh via a background fetch + on app open.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { calculatePrayerTimes } from "@/engine";
import type { City, MethodConfig, IshaMonthRule } from "@/engine";
import { resolveCity, useSettings, type NotificationPrefs } from "@/store/settings";

export const NOTIF_CHANNEL_ID = "prayer-times";

export async function ensureNotificationChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(NOTIF_CHANNEL_ID, {
      name: "Prayer times",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1f8a4c",
    });
  }
}

/** Request permission; returns true if granted (or if notifications are unavailable). */
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return requested.granted;
}

interface ScheduleOptions {
  city: City;
  method: MethodConfig;
  ishaMonthRules: Record<number, IshaMonthRule>;
  prefs: NotificationPrefs;
  days?: number;
  use24h?: boolean;
}

const PRAYER_LABELS: Record<string, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

function buildTrigger(year: number, month: number, day: number, minutes: number): Notifications.NotificationTriggerInput {
  // Normalize: prayer "minutes" can exceed 1440 (after midnight). Roll into the next day.
  let m = minutes;
  let d = day;
  let mo = month;
  let y = year;
  while (m >= 1440) {
    m -= 1440;
    const next = new Date(Date.UTC(y, mo - 1, d + 1));
    y = next.getUTCFullYear();
    mo = next.getUTCMonth() + 1;
    d = next.getUTCDate();
  }
  const hh = Math.floor(m / 60);
  const mm = Math.round(m % 60);

  // Calendar trigger fires at the wall-clock time in the device's local timezone.
  // The engine produces times in the configured city's timezone; these match as long
  // as the device is in that timezone (true for the default Tallinn use case).
  return {
    type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
    day: d,
    month: mo,
    hour: hh,
    minute: mm,
    channelId: NOTIF_CHANNEL_ID,
  };
}

/** Cancel all previously scheduled prayer notifications. */
export async function cancelAllPrayerNotifications() {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((n) => n.identifier.startsWith("prayer-") || n.identifier.startsWith("reminder-"))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Reschedule prayer notifications for the next `days` days based on current settings.
 * Call on app open, settings change, and background refresh.
 */
export async function reschedulePrayerNotifications(days = 30): Promise<number> {
  const state = useSettings.getState();
  const prefs = state.notifications;
  if (!prefs.enabled) {
    await cancelAllPrayerNotifications();
    return 0;
  }

  await ensureNotificationChannel();
  await cancelAllPrayerNotifications();

  const city = resolveCity(state.location);
  const { method, ishaMonthRules } = state;
  return scheduleForRange({ city, method, ishaMonthRules, prefs, days, use24h: state.clock === "24h" });
}

async function scheduleForRange(opts: ScheduleOptions): Promise<number> {
  const { city, method, ishaMonthRules, prefs, days = 30 } = opts;
  let scheduled = 0;
  const today = new Date();

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const y = date.getFullYear();
    const mo = date.getMonth() + 1;
    const d = date.getDate();
    const times = calculatePrayerTimes(y, mo, d, city, { method, ishaMonthRules });

    const entries: { key: string; minutes: number }[] = [
      { key: "fajr", minutes: times.fajr.time },
      { key: "dhuhr", minutes: times.dhuhr },
      { key: "asr", minutes: times.asr ?? times.maghrib },
      { key: "maghrib", minutes: times.maghrib },
      { key: "isha", minutes: times.isha.time },
    ];

    for (const { key, minutes } of entries) {
      if (!prefs.prayers[key as keyof typeof prefs.prayers]) continue;

      const label = PRAYER_LABELS[key];
      // Skip times already in the past for "today".
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      if (offset === 0 && minutes <= nowMin) continue;

      await Notifications.scheduleNotificationAsync({
        identifier: `prayer-${key}-${y}-${mo}-${d}`,
        content: {
          title: `${label} prayer`,
          body: `It's time for ${label}.`,
          sound: prefs.sound ? "default" : undefined,
          ...(Platform.OS === "android" ? { channelId: NOTIF_CHANNEL_ID } : {}),
        },
        trigger: buildTrigger(y, mo, d, minutes),
      });
      scheduled += 1;

      // Optional reminder before adhan.
      if (prefs.reminderMinutesBefore > 0 && minutes - prefs.reminderMinutesBefore > 0) {
        await Notifications.scheduleNotificationAsync({
          identifier: `reminder-${key}-${y}-${mo}-${d}`,
          content: {
            title: `${label} in ${prefs.reminderMinutesBefore} min`,
            body: `${label} prayer begins soon.`,
            sound: prefs.sound ? "default" : undefined,
            ...(Platform.OS === "android" ? { channelId: NOTIF_CHANNEL_ID } : {}),
          },
          trigger: buildTrigger(y, mo, d, minutes - prefs.reminderMinutesBefore),
        });
        scheduled += 1;
      }
    }
  }

  return scheduled;
}
