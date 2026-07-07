import { Tabs } from "expo-router";
import { Platform, Text, type ColorValue } from "react-native";

import { useTheme } from "@/hooks/use-theme";

/**
 * Bottom tab bar. Uses the stable expo-router <Tabs /> (works in Expo Go and bare
 * builds). Three tabs: Today, Month, Settings.
 *
 * (Previously used expo-router/unstable-native-tabs, which crashed in environments
 * lacking the native screens tab host — e.g. Expo Go.)
 */
export default function AppTabs() {
  const colors = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color }) => <TabGlyph icon="☀" color={color} />,
        }}
      />
      <Tabs.Screen
        name="month"
        options={{
          title: "Month",
          tabBarIcon: ({ color }) => <TabGlyph icon="▦" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <TabGlyph icon="⚙" color={color} />,
        }}
      />
    </Tabs>
  );
}

/** Lightweight text glyph as a tab icon (no asset dependency). */
function TabGlyph({ icon, color }: { icon: string; color: ColorValue }) {
  // Text-based glyph avoids needing image assets per platform.
  if (Platform.OS === "web") return null;
  return <Text style={{ fontSize: 18, color }}>{icon}</Text>;
}
