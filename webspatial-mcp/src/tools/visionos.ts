/**
 * MCP Tool definitions: visionOS Simulator
 *
 * Minimal tools for debugging WebSpatial on visionOS Simulator:
 *  - App lifecycle (list, launch, terminate)
 *  - App container lookup
 *  - Screenshot capture
 */

import { z } from "zod";
import * as visionos from "../utils/visionos.js";
import type { CameraDirection } from "../utils/visionos.js";

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export const visionosListAppsTool = {
  name: "visionos_list_apps",
  description: "List installed apps on the booted visionOS Simulator.",
  schema: z.object({}),
  handler: async () => {
    const result = await visionos.listApps();
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};

export const visionosGetAppContainerTool = {
  name: "visionos_get_app_container",
  description: "Get the app container path for a bundle ID on visionOS Simulator.",
  schema: z.object({
    bundle_id: z.string().describe("Bundle ID of the app"),
  }),
  handler: async ({ bundle_id }: { bundle_id: string }) => {
    const result = await visionos.getAppContainer(bundle_id);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};

export const visionosLaunchAppTool = {
  name: "visionos_launch_app",
  description: "Launch an app by bundle ID on the booted visionOS Simulator.",
  schema: z.object({
    bundle_id: z.string().default("com.webspatial.test").describe("Bundle ID of the app to launch"),
  }),
  handler: async ({ bundle_id }: { bundle_id: string }) => {
    const result = await visionos.launchApp(bundle_id);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};

export const visionosTerminateAppTool = {
  name: "visionos_terminate_app",
  description: "Terminate an app by bundle ID on the booted visionOS Simulator.",
  schema: z.object({
    bundle_id: z.string().default("com.webspatial.test").describe("Bundle ID of the app to terminate"),
  }),
  handler: async ({ bundle_id }: { bundle_id: string }) => {
    const result = await visionos.terminateApp(bundle_id);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};

export const visionosScreenshotTool = {
  name: "visionos_screenshot",
  description: "Take a screenshot on the booted visionOS Simulator.",
  schema: z.object({
    output_path: z.string().describe("Path to save the screenshot PNG"),
  }),
  handler: async ({ output_path }: { output_path: string }) => {
    const result = await visionos.screenshot(output_path);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};

export const visionosEnsureWebSpatialRunningTool = {
  name: "visionos_ensure_webspatial_running",
  description: "High-level helper to ensure WebSpatial is running on visionOS Simulator. Verifies app container, launches app, and optionally takes screenshot.",
  schema: z.object({
    bundle_id: z.string().default("com.webspatial.test").describe("Bundle ID of WebSpatial app"),
    screenshot_path: z.string().optional().describe("Optional path to save screenshot after launch"),
  }),
  handler: async ({ bundle_id, screenshot_path }: { bundle_id: string; screenshot_path?: string }) => {
    const result = await visionos.ensureWebSpatialVisionOSRunning(bundle_id, screenshot_path);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};

const cameraDirectionSchema = z.enum(["left", "right", "forward", "back", "up", "down"]);

export const visionosCaptureAnglesTool = {
  name: "visionos_capture_angles",
  description:
    "Bring the visionOS Simulator to the front, take a baseline screenshot, then nudge the camera slightly with keyboard keys (arrows / WASD / Q-E), capture one screenshot per direction, and undo each nudge so the view returns. Uses simctl screenshots only; no mouse drag or Quartz. Requires the spatial scene to already be visible and Simulator + Automation permissions.",
  schema: z.object({
    output_dir: z.string().describe("Directory to write PNG screenshots (created if missing)"),
    directions: z
      .array(cameraDirectionSchema)
      .optional()
      .describe(
        "Camera nudge directions in order. Default: left, then right. Optional: forward, back, up, down (key bindings are documented in server assumptions).",
      ),
    steps_per_direction: z
      .number()
      .int()
      .min(1)
      .max(8)
      .optional()
      .describe("How many key repeats per nudge (keep small; default 2)"),
    view_settle_ms: z
      .number()
      .int()
      .min(50)
      .max(3000)
      .optional()
      .describe("Delay after focus or key input before screenshot (default 300)"),
  }),
  handler: async ({
    output_dir,
    directions,
    steps_per_direction,
    view_settle_ms,
  }: {
    output_dir: string;
    directions?: CameraDirection[];
    steps_per_direction?: number;
    view_settle_ms?: number;
  }) => {
    const result = await visionos.captureAngles({
      outputDir: output_dir,
      directions: directions ?? ["left", "right"],
      stepsPerDirection: steps_per_direction,
      viewSettleMs: view_settle_ms,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};

// ---------------------------------------------------------------------------
// Export all visionOS tools
// ---------------------------------------------------------------------------

export const visionosTools = [
  visionosListAppsTool,
  visionosGetAppContainerTool,
  visionosLaunchAppTool,
  visionosTerminateAppTool,
  visionosScreenshotTool,
  visionosEnsureWebSpatialRunningTool,
  visionosCaptureAnglesTool,
];
