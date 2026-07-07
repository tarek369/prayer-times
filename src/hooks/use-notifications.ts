/**
 * Notification lifecycle + background tasks.
 *
 *  - Sets the foreground notification presenter (Android channel handling).
 *  - Listens for incoming prayer notifications and triggers Android auto-silence.
 *  - Registers a background fetch task to reschedule notifications daily (day rollover).
 *
 * Everything here is defensive: every native call is wrapped so a missing native module
 * (e.g. Expo Go without the plugin, or a pre-prebuild run) cannot crash the app. The
 * widget/silence features simply become no-ops in that case.
 *
 * Use <NotificationGateway /> once near the app root (in _layout.tsx).
 */

import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { ensureNotificationChannel, NOTIF_CHANNEL_ID, reschedulePrayerNotifications } from "@/notifications/scheduler";
import { silenceAtPrayer, isSilenceSupported } from "@/notifications/silence";
import { registerWidgetTask, updateNextPrayerWidget } from "@/widgets/widgetTask";
import { publishWidgetSnapshot } from "@/widgets/sharedDefaults";

const BACKGROUND_RESCHEDULE_TASK = "prayer-reschedule";

// Configure foreground presentation. Wrapped — some environments lack the handler setter.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
} catch {
  // Non-fatal: notification presentation falls back to platform defaults.
}

// Register the background task once at module load. Guarded so a missing
// native module does not crash the app. Uses expo-background-task (the successor
// to the deprecated expo-background-fetch).
let backgroundTaskRegistered = false;
async function ensureBackgroundTask() {
  if (backgroundTaskRegistered) return;
  try {
    const [BackgroundTaskMod, TaskManagerMod] = await Promise.all([
      import("expo-background-task"),
      import("expo-task-manager"),
    ]);
    const BackgroundTask = BackgroundTaskMod;
    const TaskManager = TaskManagerMod;
    const taskName = BACKGROUND_RESCHEDULE_TASK;
    try {
      TaskManager.defineTask(taskName, async () => {
        try {
          await reschedulePrayerNotifications(30);
          return BackgroundTask.BackgroundTaskResult.Success;
        } catch {
          return BackgroundTask.BackgroundTaskResult.Failed;
        }
      });
    } catch {
      // defineTask can throw if already defined; ignore.
    }
    try {
      await BackgroundTask.registerTaskAsync(taskName, {
        minimumInterval: 60 * 12, // at most twice a day
      });
    } catch {
      // Background task may be unavailable; non-fatal.
    }
    backgroundTaskRegistered = true;
  } catch {
    // Optional dependency unavailable; non-fatal.
  }
}

export function useNotificationGateway() {
  useEffect(() => {
    let sub1: Notifications.Subscription | undefined;
    let sub2: Notifications.Subscription | undefined;
    let cancelled = false;

    (async () => {
      try {
        await ensureNotificationChannel();
      } catch {
        // Non-fatal.
      }

      // Trigger auto-silence when a prayer notification is received (Android only).
      try {
        sub1 = Notifications.addNotificationReceivedListener((event) => {
          const id = event.request.identifier;
          if (id.startsWith("prayer-") && isSilenceSupported()) {
            void silenceAtPrayer();
          }
        });
        sub2 = Notifications.addNotificationResponseReceivedListener(() => {
          // Tapping a prayer notification could deep-link; nothing required for now.
        });
      } catch {
        // Non-fatal.
      }

      // Register the background reschedule task (best-effort; OS decides cadence).
      void ensureBackgroundTask();

      // Register the Android home-screen widget task handler + refresh once on open.
      try {
        registerWidgetTask();
      } catch {
        // Widget module unavailable; non-fatal.
      }
      if (!cancelled) void updateNextPrayerWidget().catch(() => {});

      // Publish today's snapshot for the iOS WidgetKit widget.
      if (!cancelled) void publishWidgetSnapshot().catch(() => {});
    })();

    return () => {
      cancelled = true;
      sub1?.remove();
      sub2?.remove();
    };
  }, []);
}

/** Component form for easy mounting in _layout. */
export function NotificationGateway() {
  useNotificationGateway();
  return null;
}

export { NOTIF_CHANNEL_ID };
