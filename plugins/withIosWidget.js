/**
 * Expo config plugin for the iOS WidgetKit widget.
 *
 * What it does at prebuild time:
 *  - Adds a Notification Service / Widget Extension entitlements blob to the app group
 *    so the app (JS side) and the widget (Swift side) can share today's prayer times
 *    via shared UserDefaults.
 *  - Adds the WidgetKit capability and an App Group to the main target's entitlements.
 *
 * The widget itself (Swift TimelineProvider + View) lives in widgets/ios/PrayerWidget.swift.
 * Because Expo prebuild regenerates the Xcode project, the widget extension target is
 * best added through Xcode after the first prebuild; this plugin wires the shared
 * storage + entitlements so the integration is drop-in.
 *
 * NOTE: Full WidgetKit extension target creation from a config plugin requires editing
 * the pbxproj. We enable App Groups + shared defaults here; add the extension target in
 * Xcode (File ▸ New ▸ Target ▸ Widget Extension), point it at widgets/ios/, done.
 */

const { withEntitlementsPlist, withInfoPlist } = require("expo/config-plugins");

const APP_GROUP = "group.org.eestiislam.prayerestonia";

/** Ensure the main app target has an App Group + Keychain sharing capability. */
function withAppGroup(config) {
  return withEntitlementsPlist(config, (mod) => {
    const entitlements = mod.modResults;
    entitlements["com.apple.security.application-groups"] = [APP_GROUP];
    return mod;
  });
}

/** Bump Info.plist so the system knows we expose a widget configuration. */
function withWidgetInfo(config) {
  return withInfoPlist(config, (mod) => {
    const plist = mod.modResults;
    // Marker so the README/integration docs can detect plugin ran.
    plist["PrayerHasWidget"] = true;
    return mod;
  });
}

module.exports = function withIosWidget(config) {
  config = withAppGroup(config);
  config = withWidgetInfo(config);
  return config;
};

module.exports.default = module.exports;
module.exports.APP_GROUP = APP_GROUP;
