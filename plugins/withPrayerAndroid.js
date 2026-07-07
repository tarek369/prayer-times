/**
 * Expo config plugin for Prayer Estonia.
 *
 * Responsibilities:
 *  - Registers the Android "RingerSilencer" native module (auto-silence at adhan)
 *    by copying the Kotlin source into the generated android project and adding the
 *    package registration to MainApplication.kt.
 *
 * This plugin runs at `expo prebuild` time. It is a no-op on iOS.
 */

const { withDangerousMod, withMainApplication } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MODULE_PACKAGE = "org.eestiislam.prayerestonia";

function copyNativeModule(androidProjectRoot) {
  const srcDir = path.join(__dirname, "..", "modules", "silence", "android");
  const destDir = path.join(androidProjectRoot, "app", "src", "main", "java", ...MODULE_PACKAGE.split("."));
  fs.mkdirSync(destDir, { recursive: true });

  const kotlinSources = [
    { from: "RingerSilencerPackage.kt", to: "RingerSilencerPackage.kt" },
    { from: "RingerSilencerModule.kt", to: "RingerSilencerModule.kt" },
  ];

  for (const { from, to } of kotlinSources) {
    const fromPath = path.join(srcDir, from);
    if (fs.existsSync(fromPath)) {
      fs.copyFileSync(fromPath, path.join(destDir, to));
    }
  }
}

/** Register the package inside MainApplication.kt's PackageList(...).packages.apply { } block. */
function withSilencePackage(config) {
  return withMainApplication(config, (modConfig) => {
    const { contents, language } = modConfig.modResults;

    if (!contents.includes("RingerSilencerPackage")) {
      if (language === "kt") {
        // Kotlin: insert add(RingerSilencerPackage()) after the example comment line.
        const marker = "// add(MyReactNativePackage())";
        const idx = contents.indexOf(marker);
        if (idx !== -1) {
          const lineEnd = contents.indexOf("\n", idx);
          const insertAt = lineEnd === -1 ? contents.length : lineEnd + 1;
          const insertion = "          add(RingerSilencerPackage())\n";
          modConfig.modResults.contents =
            contents.slice(0, insertAt) + insertion + contents.slice(insertAt);
        }
      } else {
        // Java fallback (older Expo SDKs).
        modConfig.modResults.contents = contents
          .replace(
            /(import .+;\n)(?=public class MainApplication)/,
            `$1import ${MODULE_PACKAGE}.RingerSilencerPackage;\n`,
          )
          .replace(/(return Arrays\.asList\(\s*)/, `$1new RingerSilencerPackage(), `);
      }
    }

    return modConfig;
  });
}

module.exports = function withPrayerAndroid(config) {
  config = withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const androidRoot = modConfig.modRequest.platformProjectRoot;
      copyNativeModule(androidRoot);
      return modConfig;
    },
  ]);

  config = withSilencePackage(config);

  return config;
};

module.exports.default = module.exports;
