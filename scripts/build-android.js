/**
 * Release APK build on Windows via C:\cts so CMake/Ninja and Metro stay under MAX_PATH.
 * Do NOT run `cd android && gradlew assembleRelease` from a long Downloads path.
 *
 * Usage: npm run build:android
 *        npm run build:android -- bundle   (AAB instead of APK)
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const SHORT_ROOT = 'C:\\cts';

function ensureAndroidHome() {
  if (process.env.ANDROID_HOME) return;
  const sdk =
    process.env.ANDROID_SDK_ROOT ||
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
  if (sdk && fs.existsSync(sdk)) {
    process.env.ANDROID_HOME = sdk;
    process.env.ANDROID_SDK_ROOT = sdk;
  }
}

function isThisProject(dir) {
  const pkg = path.join(dir, 'package.json');
  if (!fs.existsSync(pkg)) return false;
  try {
    return JSON.parse(fs.readFileSync(pkg, 'utf8')).name === 'new_user';
  } catch {
    return false;
  }
}

/**
 * Use C:\cts (same-drive junction). A subst letter like P: breaks Metro ESM
 * ("Received protocol 'p:'") and RN codegen ("different roots").
 */
function ensureShortProjectRoot() {
  spawnSync('subst', ['P:', '/d'], { encoding: 'utf8' });
  spawnSync('subst', ['R:', '/d'], { encoding: 'utf8' });

  if (isThisProject(SHORT_ROOT)) {
    console.log(`Using short project path: ${SHORT_ROOT}`);
    return SHORT_ROOT;
  }

  if (fs.existsSync(SHORT_ROOT)) {
    console.warn(
      `${SHORT_ROOT} exists but is not this project; building from ${projectRoot}`,
    );
    return projectRoot;
  }

  try {
    fs.symlinkSync(projectRoot, SHORT_ROOT, 'junction');
  } catch (err) {
    console.error(
      `Failed to create junction ${SHORT_ROOT} -> "${projectRoot}".\n${err.message || err}`,
    );
    process.exit(1);
  }
  if (!isThisProject(SHORT_ROOT)) {
    console.error(
      `Short path missing package.json at ${path.join(SHORT_ROOT, 'package.json')}`,
    );
    process.exit(1);
  }

  console.log(`Using short project path: ${SHORT_ROOT}`);
  return SHORT_ROOT;
}

function clearCxxCache(shortRoot) {
  const cxx = `${shortRoot}\\android\\app\\.cxx`;
  if (!fs.existsSync(cxx)) return;
  spawnSync('cmd', ['/c', `rmdir /s /q "${cxx}"`], { encoding: 'utf8' });
  console.log('Cleared android/app/.cxx (removes long-path RelWithDebInfo leftovers)');
}

function clearDuplicateBundleDrawables(shortRoot) {
  const appBuild = `${shortRoot}\\android\\app\\build`;
  const dirs = [
    `${appBuild}\\generated\\res\\createBundleReleaseJsAndAssets`,
    `${appBuild}\\generated\\assets\\createBundleReleaseJsAndAssets`,
  ];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) return;
    spawnSync('cmd', ['/c', `rmdir /s /q "${dir}"`], { encoding: 'utf8' });
  });
  console.log(
    'Cleared stale bundled drawables (avoids login.jpeg + splash.png duplicate resources)',
  );
}

function clearStaleReleaseResources(shortRoot) {
  const appBuild = `${shortRoot}\\android\\app\\build`;
  const dirs = [
    `${appBuild}\\intermediates\\incremental\\release\\mergeReleaseResources`,
    `${appBuild}\\intermediates\\incremental\\release\\packageReleaseResources`,
    `${appBuild}\\intermediates\\packaged_res\\release`,
    `${appBuild}\\intermediates\\merged_res\\release`,
  ];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) return;
    spawnSync('cmd', ['/c', `rmdir /s /q "${dir}"`], { encoding: 'utf8' });
  });
  console.log('Cleared stale release resource merge cache');
}

function clearAutolinkingCache(shortRoot) {
  const dir = `${shortRoot}\\android\\build\\generated\\autolinking`;
  if (!fs.existsSync(dir)) return;
  spawnSync('cmd', ['/c', `rmdir /s /q "${dir}"`], { encoding: 'utf8' });
  console.log(
    'Cleared android/build/generated/autolinking (stale paths cause "No variants exist")',
  );
}

function stopGradleDaemons(shortRoot) {
  const gradlew = `${shortRoot}\\android\\gradlew.bat`;
  spawnSync(gradlew, ['--stop'], {
    cwd: `${shortRoot}\\android`,
    encoding: 'utf8',
    shell: true,
    timeout: 60000,
  });
  console.log('Stopped Gradle daemons');
}

function run(command, args, opts) {
  console.log(`> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    ...opts,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  ensureAndroidHome();
  process.env.GRADLE_USER_HOME = path.join(
    process.env.USERPROFILE || '',
    '.gradle',
  );
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';

  const wantBundle = process.argv.includes('bundle') || process.argv.includes('--bundle');
  const task = wantBundle ? ':app:bundleRelease' : ':app:assembleRelease';

  if (process.platform !== 'win32') {
    run(
      path.join(projectRoot, 'android', 'gradlew'),
      [task, '-x', 'lint', '-x', 'test', '-PreactNativeArchitectures=arm64-v8a'],
      { cwd: path.join(projectRoot, 'android'), env: process.env },
    );
    return;
  }

  const shortRoot = ensureShortProjectRoot();
  stopGradleDaemons(shortRoot);
  clearAutolinkingCache(shortRoot);
  if (process.argv.includes('--clean')) {
    clearCxxCache(shortRoot);
  }
  clearDuplicateBundleDrawables(shortRoot);
  clearStaleReleaseResources(shortRoot);

  const androidDir = `${shortRoot}\\android`;
  const gradlew = `${androidDir}\\gradlew.bat`;

  run(
    gradlew,
    [
      task,
      '-x',
      'lint',
      '-x',
      'test',
      '-PreactNativeArchitectures=arm64-v8a',
    ],
    { cwd: androidDir, env: process.env },
  );

  if (wantBundle) {
    console.log(
      `AAB: ${androidDir}\\app\\build\\outputs\\bundle\\release\\app-release.aab`,
    );
  } else {
    console.log(
      `APK: ${androidDir}\\app\\build\\outputs\\apk\\release\\app-release.apk`,
    );
  }
}

main();
