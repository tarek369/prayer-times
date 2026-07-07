/**
 * Hijri date formatting, ported from app.js. Uses the Umm al-Qura calendar via
 * Intl.DateTimeFormat (supported in Hermes/JavaScriptCore ICU builds used by RN).
 */

export interface HijriDate {
  day: string;
  month: string;
  year: string;
}

export function getHijriDate(year: number, month: number, day: number, timeZone: string): HijriDate | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      timeZone,
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const parts = formatter.formatToParts(new Date(Date.UTC(year, month - 1, day, 12)));
    const getPart = (type: string) => parts.find((part) => part.type === type)?.value;

    return {
      day: getPart("day") ?? "",
      month: normalizeHijriMonthName(getPart("month") || ""),
      year: (getPart("year") || "").replace(/\s*AH$/i, ""),
    };
  } catch {
    return null;
  }
}

export function normalizeHijriMonthName(value: string): string {
  const plain = value
    .toLowerCase()
    .replace(/[’ʻʿ']/g, "")
    .replace(/[^a-z]+/g, " ")
    .trim();

  if (plain.includes("muharram")) return "Muharram";
  if (plain.includes("safar")) return "Safar";
  if (plain.includes("ramadan")) return "Ramadan";
  if (plain.includes("shawwal")) return "Shawwal";
  if (plain.includes("rajab")) return "Rajab";
  if (plain.includes("shaban") || plain.includes("sha ban")) return "Shaban";
  if (plain.includes("hijjah")) return "Dhul Hijjah";
  if (plain.includes("qidah") || plain.includes("qadah") || plain.includes("qi dah")) return "Dhul Qadah";
  if (plain.includes("rabi") && (plain.includes("ii") || plain.includes("second"))) return "Rabi al-Thani";
  if (plain.includes("rabi")) return "Rabi al-Awwal";
  if (plain.includes("jumada") && (plain.includes("ii") || plain.includes("second"))) return "Jumada al-Thani";
  if (plain.includes("jumada")) return "Jumada al-Awwal";

  return value;
}

export function formatHijriRange(firstHijri: HijriDate | null, lastHijri: HijriDate | null): string {
  if (!firstHijri || !lastHijri) return "";
  const firstText = `${firstHijri.month} ${firstHijri.year}`.trim();
  const lastText = `${lastHijri.month} ${lastHijri.year}`.trim();
  return firstText === lastText ? firstText : `${firstText} - ${lastText}`;
}
