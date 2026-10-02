const {
  withAndroidManifest,
  withAndroidStyles,
  withAppBuildGradle,
  withDangerousMod,
} = require("@expo/config-plugins");
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const SPLASH_RELATIVE = path.join("assets", "images", "splash.jpg");

const SPLASH_FULL_XML = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/splashscreen_background" />
  <item>
    <bitmap android:gravity="fill" android:src="@drawable/splash" />
  </item>
</layer-list>
`;

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function setStyleItem(xml, styleName, itemName, itemValue) {
  const style = asArray(xml.resources && xml.resources.style).find(
    (entry) => entry.$ && entry.$.name === styleName,
  );
  if (!style) return;
  delete style.items;
  const items = asArray(style.item);
  const existing = items.find((entry) => entry.$ && entry.$.name === itemName);
  if (existing) {
    existing._ = itemValue;
  } else {
    items.push({ $: { name: itemName }, _: itemValue });
  }
  style.item = items;
}

function convertImageToPng(src, dest) {
  if (src.toLowerCase().endsWith(".png")) {
    fs.copyFileSync(src, dest);
    return;
  }
  if (process.platform === "win32") {
    const psSrc = src.replace(/'/g, "''");
    const psDest = dest.replace(/'/g, "''");
    const result = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${psSrc}'); $img.Save('${psDest}', [System.Drawing.Imaging.ImageFormat]::Png); $img.Dispose()`,
      ],
      { encoding: "utf8" },
    );
    if (result.status === 0 && fs.existsSync(dest)) {
      return;
    }
    throw new Error(
      `Failed to convert splash image to PNG: ${result.stderr || result.stdout || "unknown error"}`,
    );
  }
  fs.copyFileSync(src, dest);
}

function copySplashAssets(projectRoot, platformRoot) {
  const src = path.join(projectRoot, SPLASH_RELATIVE);
  if (!fs.existsSync(src)) {
    throw new Error(`Missing splash image: ${src}`);
  }
  const res = path.join(platformRoot, "app", "src", "main", "res");
  const drawable = path.join(res, "drawable");
  fs.mkdirSync(drawable, { recursive: true });
  fs.copyFileSync(src, path.join(drawable, "splash.jpg"));
  const oldPng = path.join(drawable, "splash.png");
  if (fs.existsSync(oldPng)) fs.unlinkSync(oldPng);
  fs.writeFileSync(path.join(drawable, "splashscreen_full.xml"), SPLASH_FULL_XML);

  const logoPng = path.join(os.tmpdir(), "cts-splashscreen-logo.png");
  convertImageToPng(src, logoPng);
  [
    "drawable-mdpi",
    "drawable-hdpi",
    "drawable-xhdpi",
    "drawable-xxhdpi",
    "drawable-xxxhdpi",
    "drawable-night-mdpi",
    "drawable-night-hdpi",
    "drawable-night-xhdpi",
    "drawable-night-xxhdpi",
    "drawable-night-xxxhdpi",
  ].forEach((folder) => {
    const dir = path.join(res, folder);
    if (!fs.existsSync(dir)) return;
    fs.copyFileSync(logoPng, path.join(dir, "splashscreen_logo.png"));
  });
}

const DEDUPE_BUNDLED_DRAWABLES = `
// BEGIN dedupeBundledDrawables
tasks.configureEach { task ->
    if (!(task.name.startsWith("merge") && task.name.endsWith("Resources"))) {
        return
    }
    task.doFirst {
        def genRoot = file("\${project.buildDir}/generated/res")
        if (!genRoot.exists()) {
            return
        }
        genRoot.eachDir { bundleDir ->
            if (!bundleDir.name.startsWith("createBundle")) {
                return
            }
            bundleDir.eachDir { densityDir ->
                def byBase = [:]
                densityDir.eachFile { f ->
                    if (!f.file) {
                        return
                    }
                    def name = f.name
                    def idx = name.lastIndexOf('.')
                    if (idx <= 0) {
                        return
                    }
                    def key = name.substring(0, idx).toLowerCase()
                    if (!byBase.containsKey(key)) {
                        byBase[key] = []
                    }
                    byBase[key] << f
                }
                byBase.each { _base, files ->
                    if (files.size() <= 1) {
                        return
                    }
                    def rank = { File f ->
                        def ext = f.name.substring(f.name.lastIndexOf('.') + 1).toLowerCase()
                        if (ext == 'jpg') return 0
                        if (ext == 'png') return 1
                        if (ext == 'webp') return 2
                        if (ext == 'jpeg') return 3
                        return 9
                    }
                    def keep = files.sort { a, b -> rank(a) <=> rank(b) }.first()
                    files.each { f ->
                        if (f != keep) {
                            logger.lifecycle("Removing duplicate bundled resource \${f.name}")
                            f.delete()
                        }
                    }
                }
            }
        }
    }
}
// END dedupeBundledDrawables
`;

function withDedupeBundledDrawables(config) {
  return withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes("BEGIN dedupeBundledDrawables")) {
      mod.modResults.contents =
        mod.modResults.contents.trimEnd() + "\n" + DEDUPE_BUNDLED_DRAWABLES;
    }
    return mod;
  });
}

function withFullSplash(config) {
  config = withDedupeBundledDrawables(config);
  config = withDangerousMod(config, [
    "android",
    async (mod) => {
      copySplashAssets(
        mod.modRequest.projectRoot,
        mod.modRequest.platformProjectRoot,
      );
      return mod;
    },
  ]);

  config = withAndroidManifest(config, (mod) => {
    asArray(mod.modResults.manifest.application?.[0]?.activity).forEach(
      (activity) => {
        const name = activity.$?.["android:name"] || "";
        if (name.endsWith(".MainActivity") || name === ".MainActivity") {
          activity.$["android:theme"] = "@style/Theme.App.SplashScreen";
        }
      },
    );
    return mod;
  });

  config = withAndroidStyles(config, (mod) => {
    asArray(mod.modResults.resources && mod.modResults.resources.style).forEach(
      (style) => {
        if (style.items) {
          style.item = asArray(style.item).concat(asArray(style.items));
          delete style.items;
        }
        if (style.$?.name === "Theme.App.SplashScreen") {
          style.$.parent = "Theme.SplashScreen";
        }
      },
    );
    setStyleItem(
      mod.modResults,
      "AppTheme",
      "android:windowBackground",
      "@drawable/splashscreen_full",
    );
    setStyleItem(
      mod.modResults,
      "Theme.App.SplashScreen",
      "windowSplashScreenBackground",
      "@color/splashscreen_background",
    );
    setStyleItem(
      mod.modResults,
      "Theme.App.SplashScreen",
      "windowSplashScreenAnimatedIcon",
      "@drawable/splash",
    );
    setStyleItem(
      mod.modResults,
      "Theme.App.SplashScreen",
      "postSplashScreenTheme",
      "@style/AppTheme",
    );
    setStyleItem(
      mod.modResults,
      "Theme.App.SplashScreen",
      "android:windowBackground",
      "@drawable/splashscreen_full",
    );
    return mod;
  });

  return config;
}

module.exports = withFullSplash;
