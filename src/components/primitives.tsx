/**
 * Minimal styled primitives for the clean modern design. Cards use soft shadows
 * and solid surfaces; text uses a strict type scale with guaranteed contrast.
 */

import * as React from "react";
import { StyleSheet, View, Text, type ViewStyle, type TextStyle } from "react-native";

import { useTheme } from "@/hooks/use-theme";

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const colors = useTheme();
  return <View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const colors = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card }, colors.shadow, style]}>
      {children}
    </View>
  );
}

type TextVariant = "title" | "section" | "body" | "caption" | "mono";

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
    title: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: 0.2 },
    section: {
      fontSize: 11,
      fontWeight: "800",
      color: colors.textFaint,
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    body: { fontSize: 16, fontWeight: "500", color: colors.text },
    caption: { fontSize: 13, fontWeight: "500", color: colors.textMuted },
    mono: { fontSize: 16, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  };
  return (
    <Text style={[base[variant], align ? { textAlign: align } : null, color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22 },
});
