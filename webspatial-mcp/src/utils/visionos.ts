/**
 * visionOS Simulator command execution layer.
 *
 * Wraps `xcrun simctl` with structured error reporting.
 * Uses "booted" as the default simulator target.
 */

import { execFile, ExecFileOptions } from "node:child_process";

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
