"use no memo";
/**
 * Android home-screen widget (compact): focuses on the next prayer + countdown,
 * but "stays in time" — once a prayer begins, it shows that active prayer (with
 * elapsed time) until the next one is imminent.
 *
 * The "use no memo" directive disables the React Compiler for this file, which
 * react-native-android-widget requires (it needs raw functions, not memoized ones).
 */

import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { WidgetData } from "./types";

const ACCENT = "#3ec97a";
const TEXT = "#eaf2ec";
const MUTED = "#9aa9a0";
const SUBTLE = "#cfd8d1";
const BORDER = "#26302a";

export function NextPrayerWidget({ data }: { data: WidgetData }) {
  return (
    <FlexWidget style={{ borderRadius: 20, padding: 16, backgroundColor: "#0e1410" }}>
      <TextWidget text={data.cityLabel} style={{ fontSize: 14, fontWeight: "700", color: TEXT }} />
      <TextWidget
        text={`${data.gregorian} · ${data.hijri}`}
        style={{ fontSize: 11, color: MUTED, marginTop: 2 }}
      />

      {/* Hero: active prayer (begun) shown first; next prayer below with countdown */}
      <FlexWidget style={{ marginTop: 12, alignItems: "center", justifyContent: "center" }}>
        <TextWidget text="NOW" style={{ fontSize: 11, color: MUTED, fontWeight: "600" }} />
        <TextWidget text={data.activeLabel} style={{ fontSize: 22, fontWeight: "800", color: ACCENT, marginTop: 2 }} />
        <TextWidget text={data.activeTime} style={{ fontSize: 20, fontWeight: "700", color: TEXT, marginTop: 2 }} />
        <TextWidget text={`started ${data.activeElapsed} ago`} style={{ fontSize: 11, color: MUTED, marginTop: 2 }} />

        <FlexWidget style={{ marginTop: 10, paddingTop: 8, borderTopColor: BORDER, borderTopWidth: 1, alignItems: "center" }}>
          <TextWidget text="NEXT" style={{ fontSize: 11, color: MUTED, fontWeight: "600" }} />
          <TextWidget text={data.nextLabel} style={{ fontSize: 14, fontWeight: "700", color: SUBTLE, marginTop: 2 }} />
          <TextWidget text={`in ${data.countdown}`} style={{ fontSize: 14, fontWeight: "700", color: ACCENT, marginTop: 2 }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
