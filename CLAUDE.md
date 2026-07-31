# CLAUDE.md

@AGENTS.md

> **Read this first.** It is the source of truth for what this project is, how it is
> built, the conventions every change must follow, and the memory of what has been done
> and what remains. Follow it on every task.

---

## 1. What this project is

**Prayer Estonia** is a cross-platform (Android + iOS) prayer-times mobile app built with
**Expo SDK 57** (React Native + TypeScript). It shows the five daily prayer times
(Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha) for a chosen city, with notifications,
an Android auto-silence feature, and home-screen widgets.

### The defining feature: the calculation engine
The prayer-time math is a **bit-for-bit TypeScript port** of the engine published at
[eestiislamikeskus.org](https://eestiislamikeskus.org/). It is a custom high-latitude
method used in Estonia:

- **15° angles** for Fajr and Isha, with a **night-portion guard** for high latitudes.
- **Per-month Isha rules**: summer months (May–Aug) use `Isha = Maghrib + 90 minutes`;
  other months use the 15° angle when valid, falling back to Maghrib-plus when extreme.
- Times are computed astronomically (NOAA solar coordinates), not fetched from an API.

The port is **pinned by 198 unit tests** (`__tests__/engine.test.ts`) that compare the TS
output to the reference `app.js` output across 6 full months × 2 cities. **If you change
the engine math, the tests MUST still pass.** Do not "simplify" the math — it is
intentionally identical to the website.

### Defaults are overridable
The Estonia (Tallinn) configuration is the **default**, but every field is user-editable
in the Settings screen: city, GPS location, angles, asr factor (1=Shafi, 2=Hanafi),
offsets, per-month Isha rules, notification prefs, theme, clock format.

---

## 2. Tech stack & key commands

| | |
|---|---|
| Framework | Expo SDK 57 (`expo-router` for navigation, file-based routes in `src/app/`) |
| Language | TypeScript (strict). React 19 + React Compiler (`experiments.reactCompiler`) |
| State | `zustand` persisted to `@react-native-async-storage/async-storage` |
| Native features | `expo-notifications`, `expo-background-task`, `expo-location`, a custom Kotlin `RingerSilencer` module, `react-native-android-widget`, iOS WidgetKit |
| Build | Expo managed workflow + `expo prebuild` (CNG) → bare `android/` & `ios/` dirs |

```bash
npm test            # 198 engine parity tests (Jest + ts-jest)
npm run typecheck   # tsc --noEmit, MUST be clean before any commit
npm start           # Metro dev server
npx expo prebuild --platform android --clean   # regenerate native android/ (CNG)
# then restore local.properties + reactNativeArchitectures=arm64-v8a (see §6)
```

The two gates every change must pass: **`npm run typecheck` clean** and **`npm test`
green**. Do not commit if either fails.

---

## 3. Project structure

```
src/
  engine/          # THE prayer-time engine. Pure, no React, no React Native.
                   #   config.ts  – CITIES, METHOD, ISHA_MONTH_RULES constants
                   #   solar.ts   – NOAA solar coordinates, elevation, altitude-crossing roots
                   #   prayer.ts  – calculatePrayerTimes, Fajr/Isha guards + safety caps
                   #   hijri.ts   – Umm al-Qura Hijri date via Intl
                   #   format.ts  – formatPrayerTime (12/24h, ceil/round/floor)
                   #   index.ts   # PUBLIC API: getTimesForDay, getMonthTimetable, getNextPrayer
  store/           # zustand settings store (Estonia defaults, persisted, resetToDefaults)
  app/             # expo-router screens: index (Today), month, settings, _layout
  components/      # primitives.tsx (T, Card, Screen), app-tabs.tsx
  hooks/           # use-prayer-data, use-theme, use-notifications, use-color-scheme
  notifications/   # scheduler.ts (reschedule), silence.ts (Android ringer bridge)
  widgets/         # NextPrayerWidget, AllPrayersWidget, widget-data, widgetTask
  theme/           # light/dark palettes (green accent #1f8a4c / #3ec97a)
  types/           # ambient module decls (e.g. optional react-native-mmkv)
plugins/           # Expo config plugins: withPrayerAndroid.js, withIosWidget.js
modules/silence/android/  # Kotlin RingerSilencerModule + Package
widgets/ios/       # Swift WidgetKit widget source (added as Xcode target)
__tests__/         # engine parity tests + groundtruth.json fixtures
```

**Architectural rule:** `src/engine/` is **pure** — no React, no React Native, no
side effects. It must remain unit-testable in plain Node. UI code consumes it via
`src/engine` (the barrel) and the hooks in `src/hooks/use-prayer-data.ts`.

---

## 4. App identity (do not change casually)

| Field | Value |
|---|---|
| App name | **Prayer Estonia** |
| Android package / iOS bundle id | **`org.eestiislam.prayerestonia`** |
| slug | `prayer-estonia` |
| scheme (deep link) | `prayerestonia` |
| iOS App Group | `group.org.eestiislam.prayerestonia` |
| Version | 1.2.0 |

Changing the package requires updating **all** of: `app.json`, the Kotlin `package`
declarations in `modules/silence/android/*.kt`, `MODULE_PACKAGE` in
`plugins/withPrayerAndroid.js`, `APP_GROUP` in `plugins/withIosWidget.js` and
`src/widgets/sharedDefaults.ts`, and `widgets/ios/PrayerWidget.swift`. A full sweep
(`grep -rn "org.eestiislam.prayerestonia"`) must show the new value everywhere.

---

## 5. Code quality rules (MUST follow)

### TypeScript
- **`strict: true`** is on. No `any` unless commented why. No `// @ts-ignore` without a
  `// reason:` comment. Prefer `unknown` + a narrowing check over `any`.
- **Type every function parameter and return type** for public/exported APIs. Local
  closures may rely on inference.
- Use `interface` for object shapes that appear in many places (engine types, store);
  use `type` for unions/aliases.
- File extensions: `.ts` for logic, `.tsx` **only** when the file contains JSX. Never
  put JSX in a `.ts` file (the compiler will reject it).
- Path alias: import via `@/...` (maps to `src/...`). Example: `import { useSettings } from "@/store/settings"`.

### Functions
- **Small and single-purpose.** A function does one thing; if you wrote "and", split it.
- **Pure where possible** — especially anything in `src/engine/`. Side effects (storage,
  network, native calls) live in `src/store`, `src/notifications`, or `src/hooks`.
- Name functions as **verbs**: `calculatePrayerTimes`, `formatPrayerTime`,
  `buildWidgetData`, `reschedulePrayerNotifications`. Boolean predicates: `isX`,
  `hasX`, `canX`.
- Prefer **named exports** over default exports, except for React screen components in
  `src/app/` (expo-router requires a default export per route file).
- **Default parameters over truthy/falsy argument tricks**: `formatPrayerTime(minutes, mode = "round")`.
- Guard native/optional calls defensively: wrap native-module access in `try/catch` so a
  missing module (Expo Go, pre-prebuild) never crashes the app. See the pattern in
  `src/hooks/use-notifications.ts` and `src/widgets/widgetTask.tsx`.
- No magic numbers in logic — put physical/calc constants in `src/engine/config.ts`
  (`RAD`, `DEG`, `MINUTES_PER_DAY`). UI spacing/colors go in `src/theme/`.

### Classes
- We are mostly functional + hooks-based. Use a **class** only when you need encapsulated
  state with multiple operations (e.g. a native bridge or a formatter with caches).
- If you add a class: one responsibility, constructor validates/initializes all fields,
  prefer `readonly` fields, no public mutable state unless necessary.
- The native Kotlin module (`RingerSilencerModule`) is a class because React Native
  requires it — mirror its structure if adding new native modules.

### React / React Native
- **Functional components + hooks only.** No class components.
- Components in `src/app/` are route screens (default export). Reusable UI goes in
  `src/components/` as named exports.
- **Read settings/state via selectors**, not by subscribing to the whole store:
  `useSettings((s) => s.method)` — this prevents needless re-renders.
- Computed prayer data goes through the hooks in `src/hooks/use-prayer-data.ts`, never
  by calling the engine inline in a component.
- **`"use no memo"` MUST be the first line** of any file under `src/widgets/` that
  `react-native-android-widget` renders. The React Compiler otherwise breaks the widget
  with `Invalid Hook Call`. (We hit this bug — do not remove the directive.)
- Styling: use the `useTheme()` palette + `StyleSheet.create`. No inline color literals
  in components except for one-off widget bitmaps.

### Files & naming
- `camelCase` for files containing functions/logic (`widget-data.ts`).
- `PascalCase` for files exporting a React component (`NextPrayerWidget.tsx`).
- One primary export per file where practical.

---

## 6. Build, run & deploy notes

- `android/` and `ios/` are **gitignored** (Expo CNG). Regenerate with `npx expo prebuild`.
- After `prebuild --clean`, **`android/local.properties` is wiped** — recreate it with
  `sdk.dir=<Android SDK path>` (and the release signing block if building a release).
  `ANDROID_HOME` must also be exported for Gradle.
- For the release build, signing credentials live in `local.properties`
  (`prayerReleaseStoreFile` etc.) or `PRAYER_RELEASE_*` env vars. The keystore is kept
  **outside the repo** (`~/.android/prayer-keystore/`) and is gitignored.
- Restrict `reactNativeArchitectures` to the target device's ABI (e.g. `arm64-v8a`) to
  avoid slow/unsupported NDK builds for unused ABIs (we hit an x86 CMake failure).
- Install on a device may trigger **Google Play Protect** ("Send app for a security
  check?") → tap **Don't send** to proceed.

---

## 7. Platform limitations (honest, do not try to "fix")

These are **OS-level restrictions**, not bugs. Do not claim they can be worked around:

- **iOS cannot silence the ringer.** No iOS app can change the ringer mode. iOS gets rich
  notifications + an optional Do-Not-Disturb Focus the user enables. Auto-silence is
  Android-only.
- **iOS widget needs a one-time Xcode WidgetKit target.** The Swift source
  (`widgets/ios/PrayerWidget.swift`) and App Group config plugin are ready; the target
  itself is added in Xcode (see README §iOS WidgetKit integration).

---

## 8. Git & release workflow

- **Never commit:** keystores (`*.jks`, `*.keystore`), `local.properties`, APKs/AABs,
  `node_modules`, or the generated `android/`/`ios/` dirs. `.gitignore` covers these;
  verify with `git status` before committing.
- Before pushing: `npm run typecheck` clean + `npm test` green.
- Releases are GitHub Releases with the signed APK attached. Bump `version` in `app.json`
  and tag `vX.Y.Z`. Keep the release keystore safe — it is required for every update
  under the same package.

---

## 9. Agent memory (living log — UPDATE THIS on every change)

> **When you make a change, append a dated entry to §9.1 and update §9.2/§9.3.** This is
> the project's durable memory across sessions. Keep entries concise: what changed, why,
> and any gotcha future agents must know.

### 9.1 Change log

- **2026-07-06** — Initial build. Ported the `eestiislamikeskus.org` engine from JS to TS
  (`src/engine/`), verified by 198 tests. Built Today/Month/Settings screens, settings
  store (Estonia defaults), notifications, Android auto-silence Kotlin module, and
  Android + iOS widget scaffolding.
- **2026-07-06** — Fixed `ExpoRoot` crash: replaced `expo-router/unstable-native-tabs`
  (NativeTabs) with the stable `<Tabs>` navigator — NativeTabs requires a native tab
  host absent in Expo Go. Also made `use-notifications.ts` and the widget imports fully
  defensive (dynamic + try/catch) so missing native modules never crash boot.
- **2026-07-06** — Migrated deprecated `expo-background-fetch` → `expo-background-task`
  (`BackgroundTaskResult.Success/Failed`). Warning eliminated.
- **2026-07-07** — Fixed widget `Invalid Hook Call` crash: added `"use no memo"` to all
  `src/widgets/*.tsx` files (React Compiler breaks react-native-android-widget). Also
  moved `registerWidgetTaskHandler` to module-load time to fix the
  `No task registered for key RNWidgetBackgroundTask` race. Added a second widget
  (**AllPrayers**, wide) alongside the compact **NextPrayer** widget; both now show the
  active ("now") prayer and stay in time.
- **2026-07-07** — Renamed app **Prayer Times → Prayer Estonia**, package
  `org.eestiislam.prayer → org.eestiislam.prayerestonia`. Updated app.json, Kotlin
  module, both config plugins, widget click actions, iOS App Group, README. Built
  signed release v1.1.0, installed on OnePlus tablet (Play Protect → "Don't send"),
  pushed to GitHub, published release.
- **2026-07-31** — **Celestial design overhaul.** Replaced the generic flat UI with a
  distinctive, modern design language built on three signature ideas:
  (1) **time-of-day adaptive palette** — the whole color world shifts with the active
  prayer period (`src/theme/palettes.ts`, 6 period palettes: Fajr indigo, Sunrise
  rose/gold, Dhuhr sky blue, Asr amber, Maghrib magenta, Isha navy);
  (2) **animated countdown ring** (`src/components/countdown-ring.tsx`, SVG +
  reanimated, arc fills toward next prayer);
  (3) **sky arc** (`src/components/sky-arc.tsx`, shows the sun's journey across the
  day with prayer markers + live sun position).
  Added bespoke SVG prayer icons + crescent brand mark (`src/components/icons.tsx`),
  glassmorphic cards, starfield for night periods. Rebuilt Today/Month/Settings.
  Added `react-native-svg` + `expo-linear-gradient`. Verified on emulator (Asr period
  renders correctly, no JS errors), 198 tests still green.

### 9.2 Known gotchas (read before touching these areas)
- **Widget files need `"use no memo"`** as line 1 — React Compiler + react-native-android-widget conflict.
- **`local.properties` is wiped by `expo prebuild --clean`** — recreate it (+ signing block) each time.
- **NDK builds fail for unused ABIs** — set `reactNativeArchitectures=arm64-v8a` after prebuild.
- **`NativeTabs` crashes without native host** — use stable `<Tabs>`.
- **Engine math is frozen** — only change if the website's method changes, and update groundtruth.json + tests.
- **`local.properties`, keystores, APKs must never be committed** — `.gitignore` covers them; always re-verify.

### 9.3 What's missing / future work (TODO)
> Update this list when you start or finish a pending item.

- [ ] **iOS build & run** — only Android has been built/run so far. iOS needs `expo prebuild --platform ios` + Xcode; verify notifications and the Today/Month/Settings screens on Simulator.
- [ ] **iOS WidgetKit target** — `widgets/ios/PrayerWidget.swift` + App Group plugin are ready, but the actual Widget Extension target must be added in Xcode and verified end-to-end (lock-screen + home widget). Optionally add `react-native-mmkv` for the shared snapshot write path.
- [ ] **Real app icon & splash** — current icons are solid-color placeholders. Generate a proper Prayer Estonia icon (green, crescent/minaret motif) at 1024×1024 + adaptive foreground/background.
- [ ] **Notification tap deep-link** — `addNotificationResponseReceivedListener` is wired but tapping a prayer notification doesn't navigate anywhere yet. Consider opening the Today screen scrolled to that prayer.
- [ ] **Qibla direction** — commonly requested; would need device compass (`expo-location` heading) + great-circle bearing to Mecca.
- [ ] **Localization (i18n)** — UI strings are English-only. Estonian/Russian/Arabic would suit the Estonian audience.
- [ ] **Play Store release** — current APK is self-signed for sideloading. Set up Google Play App Signing + a proper upload key for store distribution.
- [ ] **Hijri date offset adjustment** — some users expect to adjust the Hijri day by ±1 for moonsighting; currently uses the fixed Umm al-Qura calendar.
- [ ] **Engine: DST/timezone edge cases** — the `Intl`-based TZ helpers cover Estonia; verify behavior for arbitrary custom-location timezones (DST transitions, southern hemisphere).
- [ ] **Backup/restore settings** — export/import the settings store JSON for moving between devices.
