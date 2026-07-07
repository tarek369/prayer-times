//
//  PrayerWidget.swift
//  Prayer widget extension (WidgetKit).
//
//  Shows the next prayer + countdown and today's five prayer times on the iOS Home
//  Screen and Lock Screen. Reads shared data from the App Group UserDefaults that the
//  React Native side writes via src/notifications/sharedDefaults.ts.
//
//  Integration (one-time, after `expo prebuild`):
//    1. In Xcode: File ▸ New ▸ Target ▸ Widget Extension → name "PrayerWidget".
//    2. Replace the generated PrayerWidget.swift with this file.
//    3. Enable the "PrayerWidget" target's App Group: group.org.eestiislam.prayer.
//    4. Build & run.
//

import WidgetKit
import SwiftUI

private let appGroup = "group.org.eestiislam.prayer"

struct PrayerSnapshot: Codable {
    var cityLabel: String
    var hijri: String
    var gregorian: String
    var nextLabel: String
    var nextTime: String
    var countdown: String
    var prayers: [PrayerEntry]
    var updatedAt: Double

    struct PrayerEntry: Codable {
        var label: String
        var time: String
        var isNext: Bool
    }

    static func read() -> PrayerSnapshot? {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let data = defaults.data(forKey: "prayerWidgetSnapshot"),
              let snapshot = try? JSONDecoder().decode(PrayerSnapshot.self, from: data) else {
            return nil
        }
        return snapshot
    }
}

struct PrayerEntry: TimelineEntry {
    let date: Date
    let snapshot: PrayerSnapshot
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerEntry {
        PrayerEntry(date: Date(), snapshot: Provider.placeholderSnapshot)
    }

    func getSnapshot(in context: Context, completion: @escaping (PrayerEntry) -> Void) {
        let entry = PrayerEntry(date: Date(), snapshot: PrayerSnapshot.read() ?? Provider.placeholderSnapshot)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerEntry>) -> Void) {
        let snapshot = PrayerSnapshot.read() ?? Provider.placeholderSnapshot
        // Refresh every 15 minutes; the app also calls WidgetCenter reload when it writes.
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        let timeline = Timeline(entries: [PrayerEntry(date: Date(), snapshot: snapshot)], policy: .after(next))
        completion(timeline)
    }

    static let placeholderSnapshot = PrayerSnapshot(
        cityLabel: "Tallinn, Estonia",
        hijri: "",
        gregorian: "",
        nextLabel: "Dhuhr",
        nextTime: "01:25 PM",
        countdown: "2h 10m",
        prayers: [
            .init(label: "Fajr", time: "02:47 AM", isNext: false),
            .init(label: "Dhuhr", time: "01:25 PM", isNext: true),
            .init(label: "Asr", time: "06:05 PM", isNext: false),
            .init(label: "Maghrib", time: "10:41 PM", isNext: false),
            .init(label: "Isha", time: "12:11 AM", isNext: false),
        ],
        updatedAt: 0
    )
}

struct PrayerWidgetEntryView: View {
    var entry: PrayerEntry

    private let accent = Color(red: 62/255, green: 201/255, blue: 122/255)

    var body: some View {
        ZStack {
            Color(red: 14/255, green: 20/255, blue: 16/255)
            VStack(alignment: .leading, spacing: 6) {
                Text(entry.snapshot.cityLabel)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                Text("\(entry.snapshot.gregorian) · \(entry.snapshot.hijri)")
                    .font(.system(size: 10))
                    .foregroundColor(Color(white: 0.65))

                VStack(spacing: 2) {
                    Text(entry.snapshot.nextLabel)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(Color(white: 0.65))
                    Text(entry.snapshot.nextTime)
                        .font(.system(size: 30, weight: .heavy))
                        .foregroundColor(accent)
                    Text("in \(entry.snapshot.countdown)")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(accent)
                }
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.top, 6)

                Divider().background(Color(white: 0.2))
                ForEach(entry.snapshot.prayers, id: \.label) { p in
                    HStack {
                        Text(p.label)
                            .font(.system(size: 11, weight: p.isNext ? .bold : .regular))
                            .foregroundColor(p.isNext ? accent : Color(white: 0.85))
                        Spacer()
                        Text(p.time)
                            .font(.system(size: 11, weight: p.isNext ? .bold : .regular))
                            .foregroundColor(p.isNext ? accent : Color(white: 0.85))
                    }
                }
            }
            .padding(14)
        }
    }
}

@main
struct PrayerWidget: Widget {
    let kind: String = "PrayerWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            PrayerWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Next Prayer")
        .description("Shows the next prayer time and today's five prayers.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
