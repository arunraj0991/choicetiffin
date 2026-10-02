const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const SHORT_ROOT = 'C:\\cts';
const APP_ID = 'com.choicetiffinservices.com';

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

function pathOccupied(dir) {
  try {
    fs.lstatSync(dir);
    return true;
  } catch {
    return false;
  }
}

function isReparsePoint(dir) {
  try {
    return fs.lstatSync(dir).isSymbolicLink();
  } catch {
    return false;
  }
}

function removeStaleJunction(dir) {
  // Junctions must be removed with rmdir, not del / unlink of contents.
  const result = spawnSync('cmd', ['/c', 'rmdir', dir], { encoding: 'utf8' });
  if (result.status !== 0 && pathOccupied(dir)) {
    throw new Error(
      (result.stderr || result.stdout || `rmdir ${dir} failed`).trim(),
    );
  }
}

/**
 * Use a short same-drive junction (C:\cts). Subst drive letters (P:) break
 * RN codegen on Windows: "this and base files have different roots".
 */
function ensureShortProjectRoot() {
  spawnSync('subst', ['P:', '/d'], { encoding: 'utf8' });
  spawnSync('subst', ['R:', '/d'], { encoding: 'utf8' });

  if (isThisProject(SHORT_ROOT)) {
    console.log(`Using short project path: ${SHORT_ROOT}`);
    return SHORT_ROOT;
  }

  if (pathOccupied(SHORT_ROOT)) {
    if (isReparsePoint(SHORT_ROOT)) {
      console.log(
        `Replacing stale junction ${SHORT_ROOT} so it points at this project.`,
      );
      try {
        removeStaleJunction(SHORT_ROOT);
      } catch (err) {
        console.warn(
          `Could not replace ${SHORT_ROOT} (${err.message || err}); building from ${projectRoot}`,
        );
        return projectRoot;
      }
    } else {
      console.warn(
        `${SHORT_ROOT} exists but is not this project; building from ${projectRoot}`,
      );
      return projectRoot;
    }
  }

  try {
    fs.symlinkSync(projectRoot, SHORT_ROOT, 'junction');
  } catch (err) {
    console.warn(
      `Failed to create junction ${SHORT_ROOT} -> "${projectRoot}".\n${err.message || err}\nBuilding from ${projectRoot}`,
    );
    return projectRoot;
  }
  if (!isThisProject(SHORT_ROOT)) {
    console.warn(
      `Short path missing package.json at ${path.join(SHORT_ROOT, 'package.json')}; building from ${projectRoot}`,
    );
    return projectRoot;
  }

  console.log(`Using short project path: ${SHORT_ROOT}`);
  return SHORT_ROOT;
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

function debugApkPath(shortRoot) {
  return `${shortRoot}\\android\\app\\build\\outputs\\apk\\debug\\app-debug.apk`;
}

function buildDebugApk(shortRoot) {
  const androidDir = `${shortRoot}\\android`;
  const gradlew = `${androidDir}\\gradlew.bat`;
  process.env.GRADLE_USER_HOME = path.join(process.env.USERPROFILE, '.gradle');
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';

  // Incremental assemble — do not delete .cxx or app/build.
  run(
    gradlew,
    [
      ':app:assembleDebug',
      '-x',
      'lint',
      '-x',
      'test',
      '-PreactNativeDevServerPort=8081',
      '-PreactNativeArchitectures=arm64-v8a',
    ],
    {
      cwd: androidDir,
      env: process.env,
    },
  );

  return debugApkPath(shortRoot);
}

function getAdb() {
  return process.env.ANDROID_HOME
    ? path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe')
    : 'adb';
}

function isPortListening(port) {
  const out = spawnSync('netstat', ['-ano'], { encoding: 'utf8' }).stdout || '';
  return out.split(/\r?\n/).some(
    (line) =>
      line.includes('LISTENING') &&
      (line.includes(`:${port} `) || line.endsWith(`:${port}`)),
  );
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForPort(port, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (isPortListening(port)) return true;
    sleep(1000);
  }
  return isPortListening(port);
}

function freePort(port) {
  if (process.platform !== 'win32') return;
  const out = spawnSync('netstat', ['-ano'], { encoding: 'utf8' }).stdout || '';
  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    if (!line.includes('LISTENING') || !line.includes(`:${port} `)) continue;
    const m = line.trim().match(/(\d+)\s*$/);
    if (m) pids.add(m[1]);
  }
  for (const pid of pids) {
    console.log(`Freeing port ${port} (PID ${pid})`);
    spawnSync('taskkill', ['/F', '/PID', pid], { encoding: 'utf8' });
  }
}

function reverseMetroPort(port) {
  const adb = getAdb();
  spawnSync(adb, ['reverse', '--remove', 'tcp:8082'], { encoding: 'utf8' });
  spawnSync(adb, ['reverse', `tcp:${port}`, `tcp:${port}`], { encoding: 'utf8' });
  console.log(`adb reverse tcp:${port} tcp:${port}`);
}

function hasDevice() {
  const adb = getAdb();
  const devices = spawnSync(adb, ['devices'], { encoding: 'utf8' }).stdout || '';
  return devices.split(/\r?\n/).some((line) => /\tdevice$/.test(line));
}

function launchApp() {
  const adb = getAdb();
  reverseMetroPort(8081);
  console.log('Restarting app so it reconnects to Metro...');
  spawnSync(adb, ['shell', 'am', 'force-stop', APP_ID], { encoding: 'utf8' });
  sleep(500);
  run(adb, ['shell', 'am', 'start', '-n', `${APP_ID}/.MainActivity`]);
}

function isAppInstalled() {
  const adb = getAdb();
  const out =
    spawnSync(adb, ['shell', 'pm', 'path', APP_ID], { encoding: 'utf8' })
      .stdout || '';
  return /package:/.test(out);
}

function installApk(apkPath) {
  const adb = getAdb();
  if (!hasDevice()) {
    console.log(
      `\nAPK ready, but no Android device is connected.\nAPK: ${apkPath}\n`,
    );
    return false;
  }

  console.log(`Installing ${apkPath} on the device...`);
  const result = spawnSync(adb, ['install', '-r', apkPath], {
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.log('Install failed — uninstalling the old app and retrying...');
    spawnSync(adb, ['uninstall', APP_ID], { encoding: 'utf8', stdio: 'inherit' });
    run(adb, ['install', '-r', apkPath]);
  }

  if (!isAppInstalled()) {
    console.error(
      `App ${APP_ID} is still not installed. Connect a device/emulator and try:\n  npm run android -- --rebuild`,
    );
    return false;
  }
  return true;
}

function startMetro(shortRoot) {
  reverseMetroPort(8081);

  if (isPortListening(8081)) {
    console.log('Metro already running on 8081 — reusing it.');
    return false;
  }

  freePort(8082);

  console.log('Starting Metro bundler on 8081 (dev-client)...');
  const child = spawn(
    'npx',
    ['expo', 'start', '--offline', '--dev-client', '--port', '8081'],
    {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true,
      env: (() => {
        const env = {
          ...process.env,
          RCT_METRO_PORT: '8081',
          REACT_NATIVE_PACKAGER_HOSTNAME: '127.0.0.1',
          CHOKIDAR_USEPOLLING: 'true',
          WATCHPACK_POLLING: 'true',
        };
        delete env.CI;
        return env;
      })(),
    },
  );
  child.on('exit', (code) => process.exit(code ?? 1));

  console.log('Waiting for Metro to listen on 8081...');
  if (!waitForPort(8081, 90000)) {
    console.error('Metro did not start on 8081. Try: npm start');
    process.exit(1);
  }
  console.log('Metro is ready.');
  return true;
}

function main() {
  ensureAndroidHome();

  if (process.platform !== 'win32') {
    run('npx', ['expo', 'run:android', ...process.argv.slice(2)], {
      cwd: projectRoot,
      env: process.env,
    });
    return;
  }

  const shortRoot = ensureShortProjectRoot();
  const apkPath = debugApkPath(shortRoot);
  const forceRebuild = process.argv.includes('--rebuild');
  const apkExists = fs.existsSync(apkPath);

  let canLaunch = false;

  if (!forceRebuild && apkExists) {
    console.log(
      'Skipping native rebuild (using existing debug APK). For a full compile run:\n  npm run android -- --rebuild\n',
    );
    canLaunch = installApk(apkPath);
  } else {
    if (forceRebuild) {
      console.log('Rebuilding native debug APK...');
    } else {
      console.log('No debug APK found — building once (this can take several minutes)...');
    }
    const built = buildDebugApk(shortRoot);
    console.log(`Built ${built}`);
    canLaunch = installApk(built);
  }

  const metroStarted = startMetro(shortRoot);
  if (canLaunch) {
    launchApp();
  }

  if (metroStarted) {
    console.log('Keep this window open. JS logs will appear below.');
  } else if (canLaunch) {
    console.log('App restarted. Keep Metro open (npm start) and shake the phone to reload.');
  } else {
    console.log('Start JS with: npm start');
  }
}

main();
