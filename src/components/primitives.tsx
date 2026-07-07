/**
 * Minimal styled primitives used across screens. Keeps StyleSheet usage consistent
 * and lets screens consume the active palette without prop-drilling colors.
 */

import { StyleSheet, View, Text, type ViewStyle, type TextStyle } from "react-native";

import { useTheme } from "@/hooks/use-theme";

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const colors = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>
      {children}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const colors = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>;
}

type TextVariant = "title" | "section" | "body" | "caption" | "mono" | "monoLarge" | "monoHero";

export function T({
  children,
  variant = "body",
  color,
  align,
  style,
}: {
  children: React.ReactNode;
  variant?: TextVariant;
  color?: string;
  align?: "auto" | "left" | "center" | "right";
  style?: TextStyle;
}) {
  const colors = useTheme();
  const base: Record<TextVariant, TextStyle> = {
    title: { fontSize: 26, fontWeight: "800", color: colors.text },
    section: { fontSize: 13, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5, textTransform: "uppercase" },
    body: { fontSize: 16, fontWeight: "500", color: colors.text },
    caption: { fontSize: 13, fontWeight: "500", color: colors.textMuted },
    mono: { fontSize: 17, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
    monoLarge: { fontSize: 40, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
    monoHero: { fontSize: 64, fontWeight: "800", color: colors.accent, fontVariant: ["tabular-nums"] },
  };
  const variantStyle = base[variant];
  return (
    <Text
      style={[
        variantStyle,
        align ? { textAlign: align } : null,
        color ? { color } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
});
