/**
 * Shared widget data types. Kept in their own module so pure data builders
 * (widget-data.ts) don't transitively import the native widget renderer.
 *
 * Two widgets share this snapshot:
 *   - NextPrayer: compact, focuses on the upcoming (or just-begun) prayer.
 *   - AllPrayers: wide, shows all five prayers + sunrise for the day.
 */

export interface PrayerRow {
  label: string;
  time: string;
  /** This prayer is the next upcoming one. */
  isNext: boolean;
  /** This prayer has already begun and is the currently-active one. */
  isActive: boolean;
}

export interface WidgetData {
  cityLabel: string;
  hijri: string;
  gregorian: string;

  /** The next prayer that has NOT yet begun. */
  nextLabel: string;
  nextTime: string;
  countdown: string;

  /** The most recent prayer that HAS begun ("stay in time"). */
  activeLabel: string;
  activeTime: string;
  /** Minutes since the active prayer began. */
  activeElapsed: string;

  /** All prayers + sunrise, in order. */
  prayers: PrayerRow[];
}

/** Back-compat alias for the compact widget. */
export type NextPrayerWidgetData = WidgetData;
