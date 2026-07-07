import { useEffect, useState } from "react";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { View } from "react-native";

import AppTabs from "@/components/app-tabs";
import { NotificationGateway } from "@/hooks/use-notifications";
import { useTheme } from "@/hooks/use-theme";
import { reschedulePrayerNotifications } from "@/notifications/scheduler";

// preventAutoHideAsync returns a promise; ignore failures (e.g. already hidden).
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Root layout. The active palette comes from the settings store (system/light/dark)
 * and is fed to expo-router's ThemeProvider. AppTabs is the stable <Tabs> navigator.
 *
 * NotificationGateway wires foreground handling, auto-silence, and the background
 * reschedule task — all defensively so a missing native module cannot crash the app.
 */
export default function TabLayout() {
  const colors = useTheme();
  const isDark = colors.bg === "#0e1410";
  const [, setReady] = useState(false);

  const routerTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.bg, primary: colors.accent } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.accent } };

  // Kick off notification scheduling; hide the splash once the UI is mounted. We do not
  // block rendering on the (best-effort) scheduling promise.
  useEffect(() => {
    let mounted = true;
    reschedulePrayerNotifications(30)
      .catch(() => {})
      .finally(() => {
        if (mounted) SplashScreen.hideAsync().catch(() => {});
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ThemeProvider value={routerTheme}>
      <View style={{ flex: 1, backgroundColor: colors.bg }} onLayout={() => setReady(true)}>
        <NotificationGateway />
        <AppTabs />
      </View>
    </ThemeProvider>
  );
}
