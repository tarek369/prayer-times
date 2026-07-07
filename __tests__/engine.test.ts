/**
 * Engine parity tests.
 *
 * These pin the TypeScript port (src/engine) to the exact output of the original
 * eestiislamikeskus.org app.js engine, across full months and both built-in cities.
 * The reference values in groundtruth.json were produced by running the original
 * (unmodified) app.js calculation core in Node, and cross-checked against the
 * live published timetable for July 2026 Tallinn (exact match).
 *
 * If any value diverges, the port has drifted from the website and must be fixed.
 */

import { calculatePrayerTimes, CITIES, formatPrayerTime, getNextPrayer } from "@/engine";
import type { City } from "@/engine";

import groundtruth from "./groundtruth.json";

type Row = [number, string, string, string, string, string, string];
type Matrix = Record<string, Row[]>;

const GT = groundtruth as unknown as Matrix;

function checkMonth(key: string, month: number, cityKey: keyof typeof CITIES) {
  const city: City = CITIES[cityKey];
  const expected = GT[key];

  test(`${key}: ${expected.length} days present`, () => {
    expect(expected.length).toBeGreaterThan(27);
  });

  for (const row of expected) {
    const [day, fajr, sunrise, dhuhr, asr, maghrib, isha] = row;
    test(`${key} day ${day}: ${fajr} ${sunrise} ${dhuhr} ${asr} ${maghrib} ${isha}`, () => {
      const t = calculatePrayerTimes(2026, month, day, city);
      expect(formatPrayerTime(t.fajr.time, "round")).toBe(fajr);
      expect(formatPrayerTime(t.sunrise, "round")).toBe(sunrise);
      expect(formatPrayerTime(t.dhuhr, "ceil")).toBe(dhuhr);
      expect(formatPrayerTime(t.asr, "ceil")).toBe(asr);
      expect(formatPrayerTime(t.maghrib, "ceil")).toBe(maghrib);
      expect(formatPrayerTime(t.isha.time, "ceil")).toBe(isha);
    });
  }
}

describe("engine parity with eestiislamikeskus.org", () => {
  checkMonth("tallinn_jul", 7, "tallinn");
  checkMonth("tallinn_jan", 1, "tallinn");
  checkMonth("tallinn_apr", 4, "tallinn");
  checkMonth("tallinn_dec", 12, "tallinn");
  checkMonth("tartu_jul", 7, "tartu");
  checkMonth("tartu_jan", 1, "tartu");
});

describe("getNextPrayer countdown logic", () => {
  const city = CITIES.tallinn;
  const times = calculatePrayerTimes(2026, 7, 1, city);

  test("returns Fajr before sunrise", () => {
    // 02:00 local → 120 min. Fajr is 02:47 (167 min).
    const next = getNextPrayer(times, 120, 167 + 1440);
    expect(next.key).toBe("fajr");
    expect(next.previousKey).toBe("isha");
    expect(next.minutesUntil).toBeGreaterThan(0);
  });

  test("returns Dhuhr between Fajr and Dhuhr", () => {
    // 10:00 local → 600 min. Next is Dhuhr (13:25 → 805 min).
    const next = getNextPrayer(times, 600);
    expect(next.key).toBe("dhuhr");
    expect(next.previousKey).toBe("fajr");
  });

  test("returns Isha on late-evening summer days where Isha is after midnight", () => {
    // July 1 Isha is at minute 1450 (00:11 next day). At 23:59 (1439) the next prayer is still Isha.
    const next = getNextPrayer(times, 1439, 167 + 1440);
    expect(next.key).toBe("isha");
    expect(next.previousKey).toBe("maghrib");
    expect(next.minutesUntil).toBeGreaterThan(0);
  });

  test("rolls over to next day's Fajr once Isha has passed", () => {
    // Use a winter day where Isha is in the evening, then query late at night.
    const winter = calculatePrayerTimes(2026, 1, 15, CITIES.tallinn); // Isha ~18:07 = 1087
    const next = getNextPrayer(winter, 1300, 405 + 1440); // 21:40, past Isha → tomorrow Fajr
    expect(next.key).toBe("fajr");
    expect(next.previousKey).toBe("isha");
    expect(next.minutesUntil).toBeGreaterThan(0);
  });

  test("minutesUntil is always positive", () => {
    for (let m = 0; m < 1440; m += 60) {
      const next = getNextPrayer(times, m, 167 + 1440);
      expect(next.minutesUntil).toBeGreaterThan(0);
    }
  });
});

describe("formatting parity", () => {
  test("12-hour formatting matches website style", () => {
    expect(formatPrayerTime(167, "round")).toBe("02:47 AM");
    expect(formatPrayerTime(805, "ceil")).toBe("01:25 PM");
    expect(formatPrayerTime(null, "round")).toBe("--");
  });

  test("24-hour formatting", () => {
    expect(formatPrayerTime(167, "round", true)).toBe("02:47");
    expect(formatPrayerTime(1325, "ceil", true)).toBe("22:05");
  });
});
