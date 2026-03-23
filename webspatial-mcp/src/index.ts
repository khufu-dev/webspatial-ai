#!/usr/bin/env node

/**
 * @webspatial/adb-mcp-server
 *
 * MCP server for debugging WebSpatial experiences on:
 *   - PICO OS 6 (Swan): Android device/emulator via ADB
 *   - visionOS: Xcode Simulator on macOS via xcrun simctl (+ optional AppleScript)
 *
 * When the user's target is unclear, use tool `webspatial_debug_route` with their
 * prompt to choose the right workflow, or read resource `webspatial://debug-platforms`.
 *
 * Transport: stdio (for Claude Desktop, Cursor, Claude Code, etc.)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { inputTools } from "./tools/input.js";
import { inspectionTools } from "./tools/inspection.js";
import { webspatialTools } from "./tools/webspatial.js";
import { nativeUiTools } from "./tools/native_ui.js";
import { visionosTools } from "./tools/visionos.js";
import { debugGuideTools } from "./tools/debug_guide.js";
import { resources } from "./resources/index.js";
import { autoSelectDevice, setAdbPath, setDeviceSerial } from "./utils/adb.js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Parse env config
// ---------------------------------------------------------------------------

if (process.env.ADB_PATH) setAdbPath(process.env.ADB_PATH);
if (process.env.ANDROID_DEVICE_SERIAL) setDeviceSerial(process.env.ANDROID_DEVICE_SERIAL);

// ---------------------------------------------------------------------------
// Create MCP Server
// ---------------------------------------------------------------------------

const SERVER_INSTRUCTIONS = [
  "This server helps debug WebSpatial sites on two different stacks:",
  "",
  "1) PICO OS 6 (Swan) — Android: ADB tools (screenshot, get_ui_tree, tap/swipe, setup_dev_ports, launch_app, inspect_spatial_scene, webspatial_logs, …) and resources device://*, webspatial://scene, webspatial://logs.",
  "",
  "2) visionOS — macOS Simulator: visionos_* tools only (launch/screenshot/capture_angles/simctl). ADB tools do not apply.",
  "",
  "Routing: If the user does not say which platform, call webspatial_debug_route with their message (or goal) first. It returns primary_route (pico_os6 | visionos | both | unclear), matched_signals, next_step, and full per-platform workflows.",
  "Static reference without routing: tool webspatial_platform_guide or resource webspatial://debug-platforms.",
].join("\n");

const server = new McpServer(
  {
    name: "webspatial-adb",
    title: "WebSpatial debug (PICO OS 6 + visionOS)",
    description:
      "Debug WebSpatial on PICO OS 6 via ADB or on visionOS Simulator via simctl. Route ambiguous requests with webspatial_debug_route.",
    version: "0.1.0",
  },
  {
    instructions: SERVER_INSTRUCTIONS,
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  },
);

// ---------------------------------------------------------------------------
// Register all tools
// ---------------------------------------------------------------------------

const allTools = [
  ...debugGuideTools,
  ...inputTools,
  ...inspectionTools,
  ...webspatialTools,
  ...nativeUiTools,
  ...visionosTools,
];

for (const tool of allTools) {
  server.tool(
    tool.name,
    tool.description,
    tool.schema.shape,
    tool.handler as any,
  );
}

// ---------------------------------------------------------------------------
// Register resources
// ---------------------------------------------------------------------------

for (const res of resources) {
  server.resource(
    res.name,
    res.uri,
    { description: res.description, mimeType: res.mimeType },
    async (uri) => {
      const data = await res.handler();
      if (data.blob) {
        return { contents: [{ uri: uri.href, blob: data.blob, mimeType: data.mimeType }] };
      }
      return { contents: [{ uri: uri.href, text: data.text ?? "", mimeType: data.mimeType }] };
    },
  );
}

// ---------------------------------------------------------------------------
// Register prompts
// ---------------------------------------------------------------------------

server.prompt(
  "debug-webspatial",
  "Debug a WebSpatial site on PICO OS 6 (ADB / Android — not visionOS)",
  { url: z.string().optional().describe("URL of the WebSpatial site to debug") },
  ({ url }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            "I need to debug a WebSpatial site on PICO OS 6 (Swan) using ADB — not on visionOS Simulator.",
            url ? `The site URL is: ${url}` : "",
            "",
            "Please follow this workflow:",
            "1. List connected devices and select the PICO/Swan device",
            "2. Set up dev server port forwarding (setup_dev_ports)",
            "3. Take a screenshot to see the current state",
            "4. Get the UI tree to understand the layout",
            "5. Check WebSpatial logs for errors",
            "",
            "For each step, show me what you find and suggest next actions.",
            "If there are errors, help me understand the root cause.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      },
    ],
  }),
);

server.prompt(
  "test-interaction",
  "Test user interactions on a WebSpatial site",
  {
    element: z.string().optional().describe("Element to interact with (button, link, input, etc)"),
  },
  ({ element }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            "I want to test user interactions on the current WebSpatial site.",
            element ? `Focus on: ${element}` : "",
            "Platform: on PICO use tap/swipe/get_ui_tree; on visionOS use Simulator UI manually or narrow automation — call webspatial_debug_route if unsure.",
            "",
            "Please:",
            "1. Take a screenshot to see the current state",
            "2. Get the UI tree to find interactive elements and their coordinates",
            "3. Perform the interaction (tap, type, swipe, etc)",
            "4. Take another screenshot to verify the result",
            "5. Check logs for any errors",
            "",
            "Report what happened at each step.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      },
    ],
  }),
);

server.prompt(
  "debug-webspatial-visionos",
  "Debug a WebSpatial site on visionOS Simulator (macOS / simctl — not PICO ADB)",
  {
    bundle_id: z
      .string()
      .optional()
      .describe("visionOS app bundle ID (e.g. com.webspatial.test)"),
  },
  ({ bundle_id }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            "I need to debug a WebSpatial site on visionOS Simulator (Xcode / xcrun simctl).",
            bundle_id ? `Bundle ID: ${bundle_id}` : "",
            "",
            "Do not use ADB or device:// resources — they target Android.",
            "Use visionos_* MCP tools on macOS with a booted visionOS simulator.",
            "",
            "Suggested flow:",
            "1. visionos_ensure_webspatial_running or visionos_launch_app",
            "2. visionos_screenshot (and visionos_capture_angles if multiple angles help)",
            "3. visionos_get_app_container if filesystem paths are needed",
            "",
            "Report findings and next steps.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      },
    ],
  }),
);

server.prompt(
  "debug-webspatial-route",
  "Pick PICO vs visionOS WebSpatial debug path from a goal (uses webspatial_debug_route)",
  {
    goal: z.string().describe("What the user wants to do or fix (paste their message)"),
  },
  ({ goal }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            "I have a WebSpatial debugging goal but the target platform may be unclear:",
            "",
            `"${goal}"`,
            "",
            "First call the MCP tool webspatial_debug_route with prompt set to that goal (or the full user message).",
            "Follow primary_route and next_step from the JSON: use ADB tools for pico_os6, visionos_* for visionos, or clarify if unclear.",
          ].join("\n"),
        },
      },
    ],
  }),
);

server.prompt(
  "spatial-audit",
  "Audit spatial rendering of a WebSpatial site",
  () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            "Audit the spatial rendering of the current WebSpatial site.",
            "If the session is on visionOS Simulator, use visionos_screenshot / visionos_capture_angles instead of ADB screenshot; if on PICO, use inspect_spatial_scene and screenshot.",
            "",
            "Please:",
            "1. Take a screenshot of the spatial UI",
            "2. Inspect the spatial scene (inspect_spatial_scene)",
            "3. Get WebSpatial logs to check for rendering issues",
            "4. Get the UI tree to verify element layout",
            "",
            "Look for common issues:",
            "- Missing spatial panels or attachments",
            "- Incorrect elevation or depth values",
            "- Material backgrounds not rendering",
            "- Scene sizing problems",
            "- URL resolution errors (relative URLs crossing the JS bridge)",
            "",
            "Provide a summary of findings and recommended fixes.",
          ].join("\n"),
        },
      },
    ],
  }),
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  // Try to auto-select device before serving
  try {
    const serial = await autoSelectDevice();
    console.error(`[webspatial-adb] Using device: ${serial}`);
  } catch (e) {
    console.error(
      `[webspatial-adb] Warning: No device found at startup. ` +
        `Tools will attempt to connect when called.`,
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[webspatial-adb] MCP server running on stdio");
}

main().catch((err) => {
  console.error("[webspatial-adb] Fatal:", err);
  process.exit(1);
});
