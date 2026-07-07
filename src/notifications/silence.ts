/**
 * Android ringer auto-silence controller.
 *
 * Bridges to the native RingerSilencer module. On iOS, all methods are no-ops because
 * iOS does not allow apps to change the ringer mode (documented limitation).
 *
 * Workflow:
 *   1. On adhan notification, call silenceAtPrayer() → ringer goes to vibrate/silent.
 *   2. After restoreAfterMinutes, restore() puts it back to the saved mode.
 *
 * The "at adhan" trigger is fired by a notification listener (see useNotificationHandler).
 */

import { Platform, NativeModules } from "react-native";
import { useSettings } from "@/store/settings";

const RingerSilencer = NativeModules.RingerSilencer as
  | {
      silent: (mode: "vibrate" | "silent") => Promise<boolean>;
      restore: () => Promise<boolean>;
      hasDndAccess: () => Promise<boolean>;
    }
  | undefined;

export function isSilenceSupported(): boolean {
  return Platform.OS === "android" && !!RingerSilencer;
}

/** Returns true if the user has granted Do-Not-Disturb (Notification Policy) access. */
export async function hasDndAccess(): Promise<boolean> {
  if (!isSilenceSupported()) return false;
  try {
    return await RingerSilencer!.hasDndAccess();
  } catch {
    return false;
  }
}

/** Silence the ringer at adhan; schedules an auto-restore after the configured delay. */
export async function silenceAtPrayer(): Promise<void> {
  const prefs = useSettings.getState().silence;
  if (!prefs.enabled || !isSilenceSupported()) return;
  try {
    await RingerSilencer!.silent(prefs.mode);
    // Schedule restore.
    setTimeout(() => {
      restoreRinger().catch(() => {});
    }, prefs.restoreAfterMinutes * 60 * 1000);
  } catch {
    // Permission missing or refused — UI handles re-prompting.
  }
}

/** Restore the ringer to its pre-silence mode. */
export async function restoreRinger(): Promise<void> {
  if (!isSilenceSupported()) return;
  try {
    await RingerSilencer!.restore();
  } catch {
    // ignore
  }
}
