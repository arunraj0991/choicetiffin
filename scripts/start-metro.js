const { spawn, spawnSync } = require("child_process");
const path = require("path");

const PORT = "8081";
const projectRoot = path.resolve(__dirname, "..");

function getAdb() {
  if (process.env.ANDROID_HOME) {
    return path.join(process.env.ANDROID_HOME, "platform-tools", "adb.exe");
  }
  return path.join(
    process.env.LOCALAPPDATA || "",
    "Android",
    "Sdk",
    "platform-tools",
    "adb.exe",
  );
}

function freePort(port) {
  if (process.platform !== "win32") return;
  const out = spawnSync("netstat", ["-ano"], { encoding: "utf8" }).stdout || "";
  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    if (!line.includes("LISTENING")) continue;
    // Match ":8081 " so we don't hit 18081 etc.
    if (!line.includes(`:${port} `) && !line.endsWith(`:${port}`)) continue;
    const m = line.trim().match(/(\d+)\s*$/);
    if (m && m[1] !== "0") pids.add(m[1]);
  }
  for (const pid of pids) {
    console.log(`Freeing port ${port} (PID ${pid})`);
    spawnSync("taskkill", ["/F", "/PID", pid], { encoding: "utf8" });
  }
}

function setupAdbReverse() {
  const adb = getAdb();
  try {
    spawnSync(adb, ["reverse", "--remove", "tcp:8082"], {
      encoding: "utf8",
      timeout: 8000,
    });
    const result = spawnSync(adb, ["reverse", `tcp:${PORT}`, `tcp:${PORT}`], {
      encoding: "utf8",
      timeout: 8000,
    });
    console.log(`adb reverse tcp:${PORT} tcp:${PORT}`);
    if (result.status !== 0) {
      console.warn(
        "adb reverse failed — keep phone on USB with debugging on.",
      );
    }
  } catch (e) {
    console.warn("adb reverse timed out/failed:", e.message || e);
  }
}

// Old Metro left on 8081 makes Expo ask for 8082 — then the app never
// connects and CMD shows no Android logs.
freePort(8081);
freePort(8082);
setupAdbReverse();

console.log(
  `Starting Metro on ${PORT}. Keep phone on USB. Expect "Waiting on http://localhost:8081" (not 8082).`,
);

const child = spawn(
  "npx",
  ["expo", "start", "--offline", "--dev-client", "--port", PORT],
  {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
    env: (() => {
      const env = {
        ...process.env,
        RCT_METRO_PORT: PORT,
        REACT_NATIVE_PACKAGER_HOSTNAME: "127.0.0.1",
        CHOKIDAR_USEPOLLING: "true",
        WATCHPACK_POLLING: "true",
      };
      // CI mode disables Fast Refresh / file watching.
      delete env.CI;
      return env;
    })(),
  },
);

child.on("exit", (code) => process.exit(code ?? 1));
