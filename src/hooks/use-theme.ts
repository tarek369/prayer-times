/**
 * Resolve the active theme palette. Honors the user's theme setting (system/light/dark)
 * and falls back to the OS preference for "system".
 */

import { useColorScheme } from "@/hooks/use-color-scheme";
import { light, dark, type ThemeColors } from "@/theme";
import { useSettings } from "@/store/settings";

export function useTheme(): ThemeColors {
  const mode = useSettings((s) => s.theme);
  const system = useColorScheme();
  const isDark = mode === "dark" || (mode === "system" && system === "dark");
  return isDark ? dark : light;
}
