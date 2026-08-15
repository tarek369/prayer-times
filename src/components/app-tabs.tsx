import { Tabs } from "expo-router";

import { TabTodayIcon, TabMonthIcon, TabSettingsIcon } from "@/components/icons";
import { useTheme } from "@/hooks/use-theme";

/**
 * Bottom tab bar — clean and modern: floating translucent surface, soft top border,
 * proper SVG icons (no text glyphs). Three tabs: Today, Month, Settings.
 */
export default function AppTabs() {
  const colors = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: colors.isDark ? "rgba(11,15,20,0.92)" : "rgba(255,255,255,0.94)",
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 84,
          paddingTop: 8,
          paddingBottom: 20,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarIconStyle: { marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color }) => <TabTodayIcon size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="month"
        options={{
          title: "Month",
          tabBarIcon: ({ color }) => <TabMonthIcon size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <TabSettingsIcon size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
