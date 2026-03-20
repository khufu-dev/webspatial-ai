#!/usr/bin/env node

/**
 * @webspatial/adb-mcp-server
 *
 * MCP server for debugging and testing WebSpatial sites on
 * PICO OS 6 (Swan) via ADB.
 *
 * Transport: stdio (for Claude Desktop, Cursor, Claude Code, etc.)
 *
 * Architecture:
 *   Claude / MCP Client
 *       ↕  (stdio / JSON-RPC)
 *   This MCP Server
 *       ↕  (child_process.execFile)
 *   adb → PICO OS 6 emulator or device
 *       ↕  (input commands, screencap, uiautomator, shell)
 *   WebSpatial App Shell + WebEngine (Chromium)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { inputTools } from "./tools/input.js";
import { inspectionTools } from "./tools/inspection.js";
import { webspatialTools } from "./tools/webspatial.js";
import { nativeUiTools } from "./tools/native_ui.js";
import { visionosTools } from "./tools/visionos.js";
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

const server = new McpServer(
  {
    name: "webspatial-adb",
    version: "0.1.0",
  },
  {
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

const allTools = [...inputTools, ...inspectionTools, ...webspatialTools, ...nativeUiTools, ...visionosTools];

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
  "Debug a WebSpatial site on PICO OS 6",
  { url: z.string().optional().describe("URL of the WebSpatial site to debug") },
  ({ url }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            "I need to debug a WebSpatial site on a PICO OS 6 device.",
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
