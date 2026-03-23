/**
 * visionOS Simulator command execution layer.
 *
 * Wraps `xcrun simctl` with structured error reporting.
 * Uses "booted" as the default simulator target.
 *
 * Camera nudging uses AppleScript + System Events (keystrokes), not mouse drag or Quartz.
 */

import { execFile, ExecFileOptions } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 15_000;
const XCRUN_PATH = "xcrun";

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export interface VisionOSResult {
  ok: boolean;
  command: string;
  stdout: string;
  stderr: string;
}

export type CameraDirection = "left" | "right" | "forward" | "back" | "up" | "down";

export interface CaptureAnglesResult {
  ok: boolean;
  commands: string[];
  screenshot_paths: string[];
  stdout: string;
  stderr: string;
}

export interface CaptureAnglesOptions {
  outputDir: string;
  directions?: CameraDirection[];
  stepsPerDirection?: number;
  viewSettleMs?: number;
  keyDelayMs?: number;
}

// ---------------------------------------------------------------------------
// Core exec
// ---------------------------------------------------------------------------

async function exec(
  args: string[],
  opts?: { timeout?: number },
): Promise<VisionOSResult> {
  const timeout = opts?.timeout ?? DEFAULT_TIMEOUT_MS;
  const execOpts: ExecFileOptions = {
    timeout,
    maxBuffer: 10 * 1024 * 1024, // 10 MB for screenshots
    encoding: "utf-8",
  };

  const command = `${XCRUN_PATH} ${args.join(" ")}`;

  return new Promise((resolve) => {
    execFile(XCRUN_PATH, args, execOpts, (error, stdout, stderr) => {
      const ok = !error;
      resolve({
        ok,
        command,
        stdout: (stdout ?? "").toString(),
        stderr: (stderr ?? "").toString(),
      });
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runOsascript(script: string, label: string): Promise<VisionOSResult> {
  return new Promise((resolve) => {
    execFile(
      "osascript",
      ["-e", script],
      { timeout: 20_000, encoding: "utf-8" },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          command: `osascript (${label})`,
          stdout: (stdout ?? "").toString(),
          stderr: (error ? `${error.message}\n` : "") + (stderr ?? "").toString(),
        });
      },
    );
  });
}

function inverseDirection(d: CameraDirection): CameraDirection {
  const m: Record<CameraDirection, CameraDirection> = {
    left: "right",
    right: "left",
    forward: "back",
    back: "forward",
    up: "down",
    down: "up",
  };
  return m[d];
}

/** Single key action per step inside System Events → Simulator. */
function directionToAppleScriptBody(direction: CameraDirection): string {
  switch (direction) {
    case "left":
      return "key code 123"; // left arrow
    case "right":
      return "key code 124"; // right arrow
    case "forward":
      return 'keystroke "w"';
    case "back":
      return 'keystroke "s"';
    case "up":
      return 'keystroke "q"';
    case "down":
      return 'keystroke "e"';
    default: {
      const _exhaustive: never = direction;
      return _exhaustive;
    }
  }
}

// ---------------------------------------------------------------------------
// Public simctl commands
// ---------------------------------------------------------------------------

/** List apps on the booted simulator. */
export async function listApps(): Promise<VisionOSResult> {
  return exec(["simctl", "listapps", "booted"]);
}

/** Get the app container path for a bundle ID. */
export async function getAppContainer(bundleId: string): Promise<VisionOSResult> {
  return exec(["simctl", "get_app_container", "booted", bundleId, "app"]);
}

/** Launch an app by bundle ID. */
export async function launchApp(bundleId: string): Promise<VisionOSResult> {
  return exec(["simctl", "launch", "booted", bundleId]);
}

/** Terminate an app by bundle ID. */
export async function terminateApp(bundleId: string): Promise<VisionOSResult> {
  return exec(["simctl", "terminate", "booted", bundleId]);
}

/** Take a screenshot and save to the given path. */
export async function screenshot(outputPath: string): Promise<VisionOSResult> {
  return exec(["simctl", "io", "booted", "screenshot", outputPath]);
}

/**
 * Bring the Simulator app to the front so keystrokes target it.
 * Requires Automation / Accessibility permissions for System Events.
 */
export async function focusSimulator(): Promise<VisionOSResult> {
  const script = `
    tell application "Simulator" to activate
    delay 0.12
    tell application "System Events"
      tell process "Simulator"
        set frontmost to true
      end tell
    end tell
  `;
  return runOsascript(script, "focusSimulator");
}

/**
 * Send a short burst of key presses to nudge the simulator camera.
 * Steps are conservative; pair with inverse direction to return to roughly the same pose.
 */
export async function sendSimulatorKeys(
  direction: CameraDirection,
  steps: number,
  opts?: { keyDelayMs?: number },
): Promise<VisionOSResult> {
  const keyDelayMs = opts?.keyDelayMs ?? 80;
  const delayStr = (keyDelayMs / 1000).toFixed(3);
  const body = directionToAppleScriptBody(direction);
  const script = `
    tell application "Simulator" to activate
    delay 0.12
    tell application "System Events"
      tell process "Simulator"
        set frontmost to true
        repeat ${steps} times
          ${body}
          delay ${delayStr}
        end repeat
      end tell
    end tell
  `;
  return runOsascript(script, `sendSimulatorKeys:${direction}:${steps}`);
}

/**
 * Focus Simulator, capture a baseline screenshot, then for each direction nudge keys,
 * screenshot, and nudge back. Uses simctl for PNGs (same as visionos_screenshot).
 */
export async function captureAngles(options: CaptureAnglesOptions): Promise<CaptureAnglesResult> {
  const {
    outputDir,
    directions = ["left", "right"],
    stepsPerDirection = 2,
    viewSettleMs = 300,
    keyDelayMs = 80,
  } = options;

  const commands: string[] = [];
  const screenshotPaths: string[] = [];
  let stdout = "";
  let stderr = "";
  let ok = true;

  const append = (r: VisionOSResult) => {
    commands.push(r.command);
    stdout += (stdout ? "\n" : "") + r.stdout;
    stderr += (stderr ? "\n" : "") + r.stderr;
    if (!r.ok) ok = false;
  };

  await mkdir(outputDir, { recursive: true });

  const focusResult = await focusSimulator();
  append(focusResult);
  await sleep(viewSettleMs);

  const baselinePath = path.join(outputDir, "00_baseline.png");
  const baselineShot = await screenshot(baselinePath);
  append(baselineShot);
  if (baselineShot.ok) screenshotPaths.push(baselinePath);

  let index = 1;
  for (const direction of directions) {
    const nudge = await sendSimulatorKeys(direction, stepsPerDirection, { keyDelayMs });
    append(nudge);
    await sleep(viewSettleMs);

    const shotPath = path.join(
      outputDir,
      `${String(index).padStart(2, "0")}_${direction}.png`,
    );
    const shot = await screenshot(shotPath);
    append(shot);
    if (shot.ok) screenshotPaths.push(shotPath);

    const undo = await sendSimulatorKeys(inverseDirection(direction), stepsPerDirection, { keyDelayMs });
    append(undo);
    await sleep(Math.min(viewSettleMs, 200));

    index += 1;
  }

  return {
    ok,
    commands,
    screenshot_paths: screenshotPaths,
    stdout,
    stderr,
  };
}

// ---------------------------------------------------------------------------
// High-level helper
// ---------------------------------------------------------------------------

/**
 * Ensure WebSpatial is running on visionOS simulator.
 * Verifies app container exists, launches the app, and optionally takes a screenshot.
 */
export async function ensureWebSpatialVisionOSRunning(
  bundleId = "com.webspatial.test",
  screenshotPath?: string,
): Promise<VisionOSResult> {
  // Verify app is installed
  const containerResult = await getAppContainer(bundleId);
  if (!containerResult.ok) {
    return containerResult;
  }

  // Launch the app
  const launchResult = await launchApp(bundleId);
  if (!launchResult.ok) {
    return launchResult;
  }

  // Optionally take screenshot
  if (screenshotPath) {
    const screenshotResult = await screenshot(screenshotPath);
    // Return combined result with screenshot info
    return {
      ok: screenshotResult.ok,
      command: `${launchResult.command}; ${screenshotResult.command}`,
      stdout: `${launchResult.stdout}\n${screenshotResult.stdout}`,
      stderr: `${launchResult.stderr}\n${screenshotResult.stderr}`,
    };
  }

  return launchResult;
}
