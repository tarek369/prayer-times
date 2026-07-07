# Prayer Estonia

A cross-platform (Android + iOS) prayer-times app built with **Expo** (React Native +
TypeScript). The default calculation method is the **Estonia (Tallinn / Tartu)** method
from [eestiislamikeskus.org](https://eestiislamikeskus.org/): a custom high-latitude rule
using 15° angles for Fajr/Isha with a night-portion guard, and **per-month Isha rules**
(summer = Maghrib + 90 minutes). Every default is user-overridable.

The astronomical engine is a **bit-for-bit TypeScript port** of the website's `app.js`,
verified against the published timetable with 198 unit tests (`__tests__/engine.test.ts`).

## Features

- **Today** screen — Hijri + Gregorian date, live next-prayer countdown, all five times
  + sunrise, rule badges (e.g. "summer: Maghrib + 90").
- **Month** screen — the full monthly timetable with city/month/year navigation,
  today highlighted, and extreme-time (high-latitude) markers.
- **Settings** — change city (Tallinn / Tartu / **Use my GPS location**), override the
  method (angles, asr factor 1=Shafi / 2=Hanafi, offsets), toggle per-month Isha rules,
  per-prayer notification toggles, optional pre-adhan reminder, theme (system/light/dark),
  12h/24h clock, and a **Reset to defaults** button.
- **Notifications** — local scheduled notifications for each prayer, per-prayer enable,
  optional reminder N minutes before, sound toggle. Reschedules automatically on settings
  change and via a background fetch (day rollover).
- **Android auto-silence** — at adhan, the ringer switches to vibrate/silent and restores
  after a configurable delay. Requires Do-Not-Disturb access.
- **Home-screen widgets** — Android "Next Prayer" widget + iOS WidgetKit widget.

## Platform limitations (honest)

These are **OS-level restrictions**, not app bugs:

- **iOS cannot silence the ringer.** No iOS app can change the ringer mode. iOS users get
  rich notifications and an optional **Do-Not-Disturb Focus** (enable once via Settings ▸
  Focus). Full automatic silence is Android-only.
- **Widgets require native code.** The Android widget is built and wired automatically via
  `react-native-android-widget`. The iOS widget requires a one-time WidgetKit target in
  Xcode (see below).

## Getting started

```bash
npm install
npm test            # 198 engine-parity tests
npx tsc --noEmit    # type-check

# Dev
npm run android
npm run ios
```

To build for release / use native features (notifications, widget, auto-silence), generate
the native projects once:

```bash
npx expo prebuild
# then:
npm run android   # or open ios/*.xcworkspace in Xcode
```

## Configuration & defaults

All defaults live in [`src/engine/config.ts`](src/engine/config.ts) and
[`src/store/settings.ts`](src/store/settings.ts):

| Setting | Default | Where to change |
|---|---|---|
| City | Tallinn, Estonia | Settings ▸ Location |
| Fajr / Isha angles | 15° / 15° | Settings ▸ Calculation method |
| Asr factor | 1 (Shafi) | Settings ▸ Calculation method |
| Isha summer rule | Maghrib + 90 min (May–Aug) | Settings ▸ Isha rules by month |
| Notifications | On, all prayers, sound | Settings ▸ Notifications |
| Theme | System | Settings ▸ Appearance |
| Auto-silence (Android) | Off | Settings ▸ Auto-silence at prayer |

### Extending the Isha month rules

In Settings ▸ "Isha rules by month", tap any month to toggle between the **15° angle** and
the **"Maghrib + 90 min"** summer rule. This mirrors the `ISHA_MONTH_RULES` table from the
website and lets you adapt the method if your local mosque approves a different value.

## iOS WidgetKit integration (one-time)

After `npx expo prebuild`:

1. Open `ios/*.xcworkspace` in Xcode.
2. **File ▸ New ▸ Target ▸ Widget Extension** → name it `PrayerWidget`.
3. Replace the generated `PrayerWidget.swift` with
   [`widgets/ios/PrayerWidget.swift`](widgets/ios/PrayerWidget.swift).
4. Enable the **App Group** `group.org.eestiislam.prayerestonia` on both the main app and the
   widget target (the `withIosWidget` config plugin adds it to the app target).
5. Install `react-native-mmkv` so the JS side can write the shared snapshot:
   `npx expo install react-native-mmkv`, then re-run `npx expo prebuild`.

The widget reads today's snapshot from the shared App Group `UserDefaults`.

## Project structure

```
src/
  engine/          # Astronomical engine (ported from app.js, 198 tests)
  store/           # zustand settings (Estonia defaults, persisted)
  app/             # expo-router screens: index (Today), month, settings
  components/      # primitives, native tab bar
  hooks/           # prayer data, theme, notifications gateway
  notifications/   # scheduling + Android ringer-silence bridge
  widgets/         # Android widget component + task; iOS shared storage
plugins/
  withPrayerAndroid.js   # wires Android silence module
  withIosWidget.js       # App Group + WidgetKit entitlements
modules/silence/android/ # Kotlin ringer-silence native module
widgets/ios/             # Swift WidgetKit widget
__tests__/               # engine parity tests + ground truth fixtures
```

## Credits

Calculation method and defaults: [Estonian Islamic Centre](https://eestiislamikeskus.org/).
Engine ported with permission-equivalent fidelity for personal/community use.
