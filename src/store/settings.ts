/**
 * App settings store (zustand + AsyncStorage).
 *
 * Defaults are the Estonia (Tallinn) configuration from eestiislamikeskus.org.
 * Every field is user-overridable from the Settings screen; "resetToDefaults()"
 * restores the original method, Isha month rules, and city.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  CITIES,
  DEFAULT_CITY_KEY,
  DEFAULT_METHOD,
  DEFAULT_ISHA_MONTH_RULES,
} from "@/engine";
import type { City, MethodConfig, IshaMonthRule } from "@/engine";

export type ThemeMode = "system" | "light" | "dark";
export type ClockFormat = "12h" | "24h";

/** A city key, or "custom" with explicit lat/lng/tz. */
export interface LocationConfig {
  mode: "preset" | "custom";
  /** When mode === "preset", a key into CITIES. */
  presetKey: string;
  /** When mode === "custom". */
  label?: string;
  latitude?: number;
  longitude?: number;
  timeZone?: string;
}

export interface NotificationPrefs {
  enabled: boolean;
  /** Per-prayer enable flags. Sunrise is excluded. */
  prayers: Record<"fajr" | "dhuhr" | "asr" | "maghrib" | "isha", boolean>;
  /** Minutes before adhan to send a reminder (0 = off). */
  reminderMinutesBefore: number;
  sound: boolean;
  vibration: boolean;
}

export interface SilencePrefs {
  /** Android only: automatically silence the ringer at adhan. */
  enabled: boolean;
  /** Restore the previous ringer mode this many minutes after adhan. */
  restoreAfterMinutes: number;
  /** "vibrate" or "silent". */
  mode: "vibrate" | "silent";
}

export interface SettingsState {
  location: LocationConfig;
  method: MethodConfig;
  ishaMonthRules: Record<number, IshaMonthRule>;
  notifications: NotificationPrefs;
  silence: SilencePrefs;
  theme: ThemeMode;
  clock: ClockFormat;

  setLocation: (loc: Partial<LocationConfig>) => void;
  usePresetCity: (key: string) => void;
  useCustomLocation: (city: { label: string; latitude: number; longitude: number; timeZone: string }) => void;
  setMethod: (patch: Partial<MethodConfig>) => void;
  setIshaMonthRule: (month: number, patch: Partial<IshaMonthRule>) => void;
  setNotifications: (patch: Partial<NotificationPrefs>) => void;
  setSilence: (patch: Partial<SilencePrefs>) => void;
  setTheme: (t: ThemeMode) => void;
  setClock: (c: ClockFormat) => void;
  resetToDefaults: () => void;
}

/** Resolve the active City object (preset lookup or custom). */
export function resolveCity(loc: LocationConfig): City {
  if (loc.mode === "preset") {
    return CITIES[loc.presetKey] ?? CITIES[DEFAULT_CITY_KEY];
  }
  return {
    key: "custom",
    label: loc.label ?? "My location",
    posterLabel: loc.label ?? "My location",
    latitude: loc.latitude ?? CITIES[DEFAULT_CITY_KEY].latitude,
    longitude: loc.longitude ?? CITIES[DEFAULT_CITY_KEY].longitude,
    timeZone: loc.timeZone ?? "Europe/Tallinn",
  };
}

const DEFAULT_LOCATION: LocationConfig = {
  mode: "preset",
  presetKey: DEFAULT_CITY_KEY,
};

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  enabled: true,
  prayers: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
  reminderMinutesBefore: 0,
  sound: true,
  vibration: true,
};

const DEFAULT_SILENCE: SilencePrefs = {
  enabled: false,
  restoreAfterMinutes: 20,
  mode: "vibrate",
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      location: DEFAULT_LOCATION,
      method: { ...DEFAULT_METHOD },
      ishaMonthRules: { ...DEFAULT_ISHA_MONTH_RULES },
      notifications: { ...DEFAULT_NOTIFICATIONS, prayers: { ...DEFAULT_NOTIFICATIONS.prayers } },
      silence: { ...DEFAULT_SILENCE },
      theme: "system",
      clock: "12h",

      setLocation: (loc) =>
        set((s) => ({ location: { ...s.location, ...loc } })),
      usePresetCity: (key) =>
        set({ location: { mode: "preset", presetKey: key } }),
      useCustomLocation: (city) =>
        set({
          location: {
            mode: "custom",
            presetKey: DEFAULT_CITY_KEY,
            label: city.label,
            latitude: city.latitude,
            longitude: city.longitude,
            timeZone: city.timeZone,
          },
        }),
      setMethod: (patch) =>
        set((s) => ({ method: { ...s.method, ...patch } })),
      setIshaMonthRule: (month, patch) =>
        set((s) => ({
          ishaMonthRules: {
            ...s.ishaMonthRules,
            [month]: { ...s.ishaMonthRules[month], ...patch },
          },
        })),
      setNotifications: (patch) =>
        set((s) => ({ notifications: { ...s.notifications, ...patch } })),
      setSilence: (patch) =>
        set((s) => ({ silence: { ...s.silence, ...patch } })),
      setTheme: (t) => set({ theme: t }),
      setClock: (c) => set({ clock: c }),

      resetToDefaults: () =>
        set({
          location: { ...DEFAULT_LOCATION },
          method: { ...DEFAULT_METHOD },
          ishaMonthRules: { ...DEFAULT_ISHA_MONTH_RULES },
          notifications: {
            ...DEFAULT_NOTIFICATIONS,
            prayers: { ...DEFAULT_NOTIFICATIONS.prayers },
          },
          silence: { ...DEFAULT_SILENCE },
        }),
    }),
    {
      name: "prayer-settings",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
