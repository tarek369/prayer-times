/**
 * Shared storage bridge for the iOS widget.
 *
 * The iOS WidgetKit widget reads today's snapshot from UserDefaults in the App Group
 * "group.org.eestiislam.prayerestonia". Writing to an App Group requires a native call (JS has
 * no direct access), so we lazily load react-native-mmkv (App-Group-aware) when present.
 *
 * If MMKV is not configured, this is a graceful no-op: the widget falls back to its
 * placeholder until the native storage is wired (see README ▸ iOS widget integration).
 */

import { Platform } from "react-native";
import { buildWidgetData } from "./widget-data";

const APP_GROUP = "group.org.eestiislam.prayerestonia";
const KEY = "prayerWidgetSnapshot";

let mmkvInstance: { set: (value: string, key: string) => void } | null | undefined;

async function getMmkv(): Promise<typeof mmkvInstance> {
  if (mmkvInstance !== undefined) return mmkvInstance;
  try {
    const mod = await import("react-native-mmkv");
    const MMKV = (mod as any).MMKV;
    mmkvInstance = new MMKV({ id: "prayer-widget", encryptionKey: undefined });
    return mmkvInstance;
  } catch {
    mmkvInstance = null;
    return null;
  }
}

/** Push the current snapshot to shared storage so the iOS widget can render it. */
export async function publishWidgetSnapshot(): Promise<void> {
  if (Platform.OS !== "ios") return;
  const store = await getMmkv();
  if (!store) return;
  try {
    const data = buildWidgetData();
    const payload = JSON.stringify({ ...data, updatedAt: Date.now() });
    store.set(payload, KEY);
  } catch {
    // Non-fatal.
  }
}
