const fs = require('fs');
const path = require('path');
const {
  withGradleProperties,
  withSettingsGradle,
  withProjectBuildGradle,
  withDangerousMod,
} = require('expo/config-plugins');

const FORCE_ARM64_SETTINGS = `
// Always regenerate autolinking.json so native module paths match this machine.
// Stale cache (old Downloads/C:\\\\cts paths) includes empty Gradle projects and
// fails release with "No variants exist" for every RN library.
def autolinkingCacheDir = new File(settingsDir, "build/generated/autolinking")
autolinkingCacheDir.deleteDir()

// Force arm64-only. Expo run:android may pass device ABIs (incl. armeabi-v7a),
// and 32-bit CMake/Ninja hits Windows MAX_PATH in this project.
def __rnArchProps = new HashMap(gradle.startParameter.projectProperties ?: [:])
__rnArchProps.put('reactNativeArchitectures', 'arm64-v8a')
gradle.startParameter.projectProperties = __rnArchProps
`;

const GRADLEW_WRAPPER = `@echo off
REM Force arm64-only architectures (Windows MAX_PATH / Expo device ABI list).
node "%~dp0..\\scripts\\filter-gradle-args.js" "%~dp0gradlew.original.bat" %*
exit /b %ERRORLEVEL%
`;

function setProperty(props, key, value) {
  const existing = props.find((item) => item.type === 'property' && item.key === key);
  if (existing) {
    existing.value = value;
    return;
  }
  props.push({ type: 'property', key, value });
}

function injectAfterPluginsBlock(contents, snippet) {
  if (contents.includes('__rnArchProps')) {
    return contents;
  }
  const match = contents.match(/plugins\s*\{[\s\S]*?\n\}\s*\n/);
  if (match) {
    const insertAt = match.index + match[0].length;
    return `${contents.slice(0, insertAt)}\n${snippet.trim()}\n${contents.slice(insertAt)}`;
  }
  return `${contents.trimEnd()}\n${snippet}\n`;
}

function ensureGradlewWrapper(androidDir) {
  const gradlewBat = path.join(androidDir, 'gradlew.bat');
  const originalBat = path.join(androidDir, 'gradlew.original.bat');
  if (!fs.existsSync(gradlewBat)) {
    return;
  }

  const current = fs.readFileSync(gradlewBat, 'utf8');
  const isWrapper = current.includes('filter-gradle-args.js');

  if (!isWrapper) {
    fs.copyFileSync(gradlewBat, originalBat);
    fs.writeFileSync(gradlewBat, GRADLEW_WRAPPER, 'utf8');
    return;
  }

  if (!fs.existsSync(originalBat)) {
    // Wrapper exists but original is missing — leave as-is to avoid breaking builds.
    console.warn(
      'withAndroidArm64: gradlew.bat is wrapped but gradlew.original.bat is missing.',
    );
  }
}

module.exports = function withAndroidArm64(config) {
  config = withGradleProperties(config, (mod) => {
    setProperty(mod.modResults, 'reactNativeArchitectures', 'arm64-v8a');
    return mod;
  });

  config = withSettingsGradle(config, (mod) => {
    mod.modResults.contents = injectAfterPluginsBlock(
      mod.modResults.contents,
      FORCE_ARM64_SETTINGS,
    );
    return mod;
  });

  config = withProjectBuildGradle(config, (mod) => {
    mod.modResults.contents = mod.modResults.contents.replace(
      /\n\/\/ Windows MAX_PATH[\s\S]*?gradle\.taskGraph\.whenReady \{[\s\S]*?\n\}\n?/g,
      '\n',
    );
    return mod;
  });

  config = withDangerousMod(config, [
    'android',
    async (mod) => {
      ensureGradlewWrapper(mod.modRequest.platformProjectRoot);
      return mod;
    },
  ]);

  return config;
};
