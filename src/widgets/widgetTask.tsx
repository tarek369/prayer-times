"use no memo";
/**
 * Android widget task handler + on-open refresh.
 *
 * Two widgets are supported:
 *   - NextPrayer  (compact): active prayer + next prayer with countdown.
 *   - AllPrayers  (wide):     all five prayers + sunrise for the day.
 *
 * react-native-android-widget is a native module only present in a prebuilt project,
 * so every access is dynamic and guarded — the app boots fine without it.
 *
 * IMPORTANT: registerWidgetTaskHandler MUST run as early as possible (the native
 * RNWidgetBackgroundTaskWorker looks up the "RNWidgetBackgroundTask" task name, and if
 * it isn't registered yet the worker logs "No task registered" and uses the last cached
 * render). We therefore register synchronously at module load. "use no memo" disables
 * the React Compiler for this file (required by the library).
 */

import { Platform } from "react-native";

const WIDGETS = ["NextPrayer", "AllPrayers"] as const;
type WidgetName = (typeof WIDGETS)[number];

const isAndroid = Platform.OS === "android";

/** Render the appropriate widget component for a given widget name. */
async function renderWidgetFor(name: WidgetName, data: import("./types").WidgetData) {
  if (name === "NextPrayer") {
    const { NextPrayerWidget } = await import("./NextPrayerWidget");
    return <NextPrayerWidget data={data} />;
  }
  const { AllPrayersWidget } = await import("./AllPrayersWidget");
  return <AllPrayersWidget data={data} />;
}

// --- Register the task handler synchronously at module load -------------------
// The handler itself is async internally (it dynamic-imports the data builder), but
// registering the task NAME must happen before the native worker fires.
if (isAndroid) {
  try {
    // require() is synchronous, so the handler is registered immediately on import.
    const { registerWidgetTaskHandler } = require("react-native-android-widget") as typeof import("react-native-android-widget");
    registerWidgetTaskHandler(async ({ widgetInfo, renderWidget }: import("react-native-android-widget").WidgetTaskHandlerProps) => {
      try {
        const { buildWidgetData } = require("./widget-data") as typeof import("./widget-data");
        const name = widgetInfo.widgetName as WidgetName;
        renderWidget(await renderWidgetFor(name, buildWidgetData()));
      } catch {
        // Non-fatal: leave the previous render in place.
      }
    });
  } catch {
    // Native module unavailable (Expo Go / pre-prebuild): non-fatal.
  }
}

/** Request an update for every supported widget. Safe to call on app open. */
export async function updateNextPrayerWidget(): Promise<void> {
  if (!isAndroid) return;
  try {
    const [{ requestWidgetUpdate }, { buildWidgetData }] = await Promise.all([
      import("react-native-android-widget"),
      import("./widget-data"),
    ]);
    await Promise.all(
      WIDGETS.map((name) =>
        requestWidgetUpdate({
          widgetName: name,
          renderWidget: () => renderWidgetFor(name, buildWidgetData()),
          widgetNotFound: () => {},
        }).catch(() => {}),
      ),
    );
  } catch {
    // Native module unavailable or no widget placed: non-fatal.
  }
}

/**
 * Kept for back-compat with callers (use-notifications.ts imports it). The actual
 * registration now happens at module load above, so this is a no-op.
 */
export function registerWidgetTask(): void {
  /* registration performed at module load */
}
