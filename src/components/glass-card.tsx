/**
 * Shared glass card + chip used across the celestial screens. Kept here so the Today,
 * Month, and Settings screens share one consistent surface treatment.
 */

import * as React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";

import type { PeriodPalette } from "@/theme/palettes";

export function GlassCard({
  palette,
  style,
  children,
}: {
  palette: PeriodPalette;
  style?: ViewStyle;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.glassSurface,
          borderColor: palette.glassBorder,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Chip({
  palette,
  children,
}: {
  palette: PeriodPalette;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: palette.accentSoft },
      ]}
    >
      <React.Fragment>
        {typeof children === "string" ? (
          <Text style={{ color: palette.accent, fontSize: 12, fontWeight: "700" }}>
            {children}
          </Text>
        ) : (
          children
        )}
      </React.Fragment>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
