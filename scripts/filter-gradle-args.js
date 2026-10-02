/**
 * Spawns the real Gradle wrapper after forcing arm64-only architectures.
 * Expo often passes -PreactNativeArchitectures=arm64-v8a,armeabi-v7a for debug devices;
 * 32-bit CMake/Ninja hits Windows MAX_PATH in this project.
 */
const { spawn } = require('child_process');
const path = require('path');

function rewriteArgs(argv) {
  return argv.map((arg) => {
    if (typeof arg === 'string' && arg.startsWith('-PreactNativeArchitectures=')) {
      return '-PreactNativeArchitectures=arm64-v8a';
    }
    return arg;
  });
}

function main() {
  const [realGradlew, ...rest] = process.argv.slice(2);
  if (!realGradlew) {
    console.error('Usage: node filter-gradle-args.js <gradlew.original.bat> [args...]');
    process.exit(1);
  }

  const args = rewriteArgs(rest);
  const child = spawn(realGradlew, args, {
    cwd: path.dirname(realGradlew),
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.exit(1);
    }
    process.exit(code ?? 1);
  });
}

main();
