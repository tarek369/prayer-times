"use no memo";
/**
 * Android home-screen widget (wide): shows ALL prayers + sunrise for the day.
 * The currently-active prayer and the next upcoming prayer are highlighted, and
 * the next prayer's countdown is shown at the top so the widget "stays in time".
 *
 * "use no memo" disables the React Compiler for this file (required by
 * react-native-android-widget).
 */

import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { WidgetData } from "./types";

const ACCENT = "#3ec97a";
const TEXT = "#eaf2ec";
const MUTED = "#9aa9a0";
const SUBTLE = "#cfd8d1";
const BORDER = "#26302a";

export function AllPrayersWidget({ data }: { data: WidgetData }) {
  return (
    <FlexWidget style={{ borderRadius: 20, padding: 16, backgroundColor: "#0e1410" }}>
      {/* Header: city + next-prayer countdown */}
      <FlexWidget style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <FlexWidget>
          <TextWidget text={data.cityLabel} style={{ fontSize: 14, fontWeight: "700", color: TEXT }} />
          <TextWidget
            text={`${data.gregorian} · ${data.hijri}`}
            style={{ fontSize: 11, color: MUTED, marginTop: 2 }}
          />
        </FlexWidget>
        <FlexWidget style={{ alignItems: "flex-end" }}>
          <TextWidget text={`${data.nextLabel} in`} style={{ fontSize: 11, color: MUTED, fontWeight: "600" }} />
          <TextWidget text={data.countdown} style={{ fontSize: 18, fontWeight: "800", color: ACCENT, marginTop: 2 }} />
        </FlexWidget>
      </FlexWidget>

      {/* All prayers + sunrise */}
      <FlexWidget style={{ marginTop: 12, paddingTop: 10, borderTopColor: BORDER, borderTopWidth: 1 }}>
        {data.prayers.map((p) => {
          const highlight = p.isActive || p.isNext;
          const tag = p.isActive ? "• now" : p.isNext ? "• next" : "";
          return (
            <FlexWidget
              key={p.label}
              style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5 }}
            >
              <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
                <TextWidget
                  text={p.label}
                  style={{ fontSize: 13, fontWeight: highlight ? "700" : "500", color: highlight ? ACCENT : SUBTLE }}
                />
                {tag ? (
                  <TextWidget
                    text={tag}
                    style={{ fontSize: 10, color: ACCENT, marginLeft: 6, fontWeight: "600" }}
                  />
                ) : null}
              </FlexWidget>
              <TextWidget
                text={p.time}
                style={{ fontSize: 13, fontWeight: highlight ? "700" : "500", color: highlight ? ACCENT : SUBTLE }}
              />
            </FlexWidget>
          );
        })}
      </FlexWidget>
    </FlexWidget>
  );
}
