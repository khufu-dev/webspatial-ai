/**
 * ADB command execution layer.
 *
 * Wraps `child_process.execFile` with device serial targeting,
 * timeout handling, and structured error reporting.
 *
 * PICO OS 6 / Swan notes:
 *  - The shell binary is at /system/bin/input (confirmed via `which input`)
 *  - WebEngine is Chromium-based, NOT Android WebView
 *  - `input` supports: tap, swipe, text, keyevent, draganddrop, scroll,
 *    motionevent, press, roll, keycombination
 */

import { execFile, ExecFileOptions } from "node:child_process";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 15_000;

let adbPath =
  process.env.ADB_PATH ??
  process.env.ANDROID_HOME
    ? `${process.env.ANDROID_HOME}/platform-tools/adb`
    : "adb";

let deviceSerial: string | null =
  process.env.ANDROID_DEVICE_SERIAL ?? null;

export function setAdbPath(p: string) {
  adbPath = p;
}
export function setDeviceSerial(s: string | null) {
  deviceSerial = s;
}
export function getDeviceSerial() {
  return deviceSerial;
}

// ---------------------------------------------------------------------------
// Core exec
// ---------------------------------------------------------------------------

export interface AdbResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function exec(
  args: string[],
  opts?: { timeout?: number; encoding?: BufferEncoding },
): Promise<AdbResult> {
  const timeout = opts?.timeout ?? DEFAULT_TIMEOUT_MS;
  const execOpts: ExecFileOptions = {
    timeout,
    maxBuffer: 10 * 1024 * 1024, // 10 MB for screenshots
    encoding: (opts?.encoding ?? "utf-8") as BufferEncoding,
  };

  // Prepend -s <serial> when targeting a specific device
  const fullArgs = deviceSerial ? ["-s", deviceSerial, ...args] : args;

  return new Promise((resolve, reject) => {
    execFile(adbPath, fullArgs, execOpts, (error, stdout, stderr) => {
      if (error && (error as any).killed) {
        reject(new Error(`ADB command timed out after ${timeout}ms`));
        return;
      }
      resolve({
        stdout: (stdout ?? "").toString(),
        stderr: (stderr ?? "").toString(),
        exitCode: error?.code ? Number(error.code) : 0,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/** Run an arbitrary `adb <args>` command. */
export async function adb(...args: string[]): Promise<AdbResult> {
  return exec(args);
}

/** Run `adb shell <cmd>`. */
export async function shell(cmd: string): Promise<string> {
  const { stdout, stderr, exitCode } = await exec(["shell", cmd]);
  if (exitCode !== 0 && stderr.trim()) {
    throw new Error(`adb shell failed (${exitCode}): ${stderr.trim()}`);
  }
  return stdout;
}

/** Run `adb shell input <subcommand> <...rest>`. */
export async function input(
  subcommand: string,
  ...rest: (string | number)[]
): Promise<string> {
  return shell(`input ${subcommand} ${rest.join(" ")}`);
}

/** List connected devices. */
export async function devices(): Promise<
  Array<{ serial: string; state: string }>
> {
  const { stdout } = await adb("devices");
  return stdout
    .split("\n")
    .slice(1) // skip header
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, state] = line.split(/\s+/);
      return { serial, state };
    });
}

/** Auto-select device if none configured. */
export async function autoSelectDevice(): Promise<string> {
  if (deviceSerial) return deviceSerial;
  const devs = await devices();
  const online = devs.filter((d) => d.state === "device");
  if (online.length === 0) {
    throw new Error(
      "No ADB devices found. Connect a device or start an emulator.",
    );
  }
  if (online.length === 1) {
    deviceSerial = online[0].serial;
    return deviceSerial;
  }
  // Prefer Swan/PICO emulator naming
  const swan = online.find(
    (d) => d.serial.includes("emulator") || d.serial.includes("swan"),
  );
  deviceSerial = swan?.serial ?? online[0].serial;
  return deviceSerial;
}

/** Take a screenshot and return base64 PNG. */
export async function screenshot(): Promise<string> {
  // Capture to device, pull as base64
  const tmpPath = "/sdcard/mcp_screenshot.png";
  await shell(`screencap -p ${tmpPath}`);
  const { stdout } = await exec(
    ["exec-out", "base64", tmpPath],
    { timeout: 30_000 },
  );
  // Cleanup
  shell(`rm -f ${tmpPath}`).catch(() => {});
  return stdout.replace(/\s/g, "");
}

/** Get the current UI hierarchy XML via uiautomator. */
export async function dumpUi(): Promise<string> {
  const tmpPath = "/sdcard/mcp_uidump.xml";
  await shell(`uiautomator dump ${tmpPath}`);
  const xml = await shell(`cat ${tmpPath}`);
  shell(`rm -f ${tmpPath}`).catch(() => {});
  return xml;
}

/** Forward a local TCP port to the device. */
export async function forward(
  localPort: number,
  remotePort: number,
): Promise<void> {
  await adb("forward", `tcp:${localPort}`, `tcp:${remotePort}`);
}

/** Reverse-forward (device → host). */
export async function reverse(
  remotePort: number,
  localPort: number,
): Promise<void> {
  await adb("reverse", `tcp:${remotePort}`, `tcp:${localPort}`);
}

/** Get device properties. */
export async function getprop(key: string): Promise<string> {
  return (await shell(`getprop ${key}`)).trim();
}

/** Get logcat output, optionally filtered. */
export async function logcat(opts?: {
  tag?: string;
  lines?: number;
  level?: string;
}): Promise<string> {
  const parts = ["logcat", "-d"];
  if (opts?.lines) parts.push(`-t`, `${opts.lines}`);
  if (opts?.tag) parts.push(`-s`, `${opts.tag}:${opts.level ?? "*"}`);
  return shell(parts.join(" "));
}
