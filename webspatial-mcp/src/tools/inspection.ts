/**
 * MCP Tool definitions: Device Inspection
 *
 * Screenshots, UI hierarchy, device info, logcat —
 * the observation side of the debug loop.
 */

import { z } from "zod";
import * as adb from "../utils/adb.js";
import * as ws from "../utils/webspatial.js";

// ---------------------------------------------------------------------------
// Screenshot
// ---------------------------------------------------------------------------

export const screenshotTool = {
  name: "screenshot",
  description:
    "Capture a screenshot of the device screen. Returns a base64-encoded PNG image.",
  schema: z.object({}),
  handler: async () => {
    const b64 = await adb.screenshot();
    return {
      content: [
        {
          type: "image" as const,
          data: b64,
          mimeType: "image/png",
        },
      ],
    };
  },
};

// ---------------------------------------------------------------------------
// UI Tree
// ---------------------------------------------------------------------------

export const getUiTreeTool = {
  name: "get_ui_tree",
  description:
    "Dump the current UI hierarchy (like DOM for Android). " +
    "Returns XML with element bounds, text, content descriptions, " +
    "and clickable/focusable state. Use to find tap coordinates.",
  schema: z.object({
    clickable_only: z
      .boolean()
      .default(false)
      .describe("If true, filter to only clickable elements"),
  }),
  handler: async ({ clickable_only }: { clickable_only: boolean }) => {
    const xml = await adb.dumpUi();

    if (!clickable_only) {
      return { content: [{ type: "text" as const, text: xml }] };
    }

    // Parse out clickable elements with bounds
    const elements: string[] = [];
    const nodeRegex =
      /<node[^>]*clickable="true"[^>]*>/g;
    const boundsRegex = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/;
    const textRegex = /text="([^"]*)"/;
    const descRegex = /content-desc="([^"]*)"/;
    const classRegex = /class="([^"]*)"/;

    let match;
    while ((match = nodeRegex.exec(xml)) !== null) {
      const node = match[0];
      const bounds = boundsRegex.exec(node);
      const text = textRegex.exec(node);
      const desc = descRegex.exec(node);
      const cls = classRegex.exec(node);

      if (bounds) {
        const [, x1, y1, x2, y2] = bounds.map(Number);
        const cx = Math.round((x1 + x2) / 2);
        const cy = Math.round((y1 + y2) / 2);

        elements.push(
          [
            cls?.[1] ?? "unknown",
            text?.[1] ? `text="${text[1]}"` : "",
            desc?.[1] ? `desc="${desc[1]}"` : "",
            `bounds=[${x1},${y1}][${x2},${y2}]`,
            `center=(${cx},${cy})`,
          ]
            .filter(Boolean)
            .join(" | "),
        );
      }
    }

    const output =
      elements.length > 0
        ? `Found ${elements.length} clickable elements:\n\n${elements.join("\n")}`
        : "No clickable elements found in the current UI.";

    return { content: [{ type: "text" as const, text: output }] };
  },
};

// ---------------------------------------------------------------------------
// Device Info
// ---------------------------------------------------------------------------

export const deviceInfoTool = {
  name: "device_info",
  description:
    "Get device information: model, brand, OS version, display size, density.",
  schema: z.object({}),
  handler: async () => {
    const info = await ws.getDeviceInfo();
    const text = [
      `Model:    ${info.model}`,
      `Brand:    ${info.brand}`,
      `SDK:      ${info.sdkVersion}`,
      `OS:       ${info.osVersion}`,
      `Display:  ${info.displaySize}`,
      `Density:  ${info.density}`,
      `Serial:   ${info.serial}`,
    ].join("\n");
    return { content: [{ type: "text" as const, text }] };
  },
};

// ---------------------------------------------------------------------------
// List connected devices
// ---------------------------------------------------------------------------

export const listDevicesTool = {
  name: "list_devices",
  description: "List all connected ADB devices and their state.",
  schema: z.object({}),
  handler: async () => {
    const devs = await adb.devices();
    if (devs.length === 0) {
      return { content: [{ type: "text" as const, text: "No devices connected." }] };
    }
    const lines = devs.map((d) => `${d.serial}\t${d.state}`);
    const current = adb.getDeviceSerial();
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Connected devices:\n${lines.join("\n")}` +
            (current ? `\n\nActive target: ${current}` : ""),
        },
      ],
    };
  },
};

// ---------------------------------------------------------------------------
// Logcat
// ---------------------------------------------------------------------------

export const logcatTool = {
  name: "logcat",
  description:
    "Get device logcat output. Optionally filter by tag and level.",
  schema: z.object({
    tag: z.string().optional().describe("Filter by log tag"),
    lines: z.number().default(100).describe("Number of recent lines"),
    level: z.enum(["V", "D", "I", "W", "E", "F"]).optional().describe("Minimum log level"),
  }),
  handler: async ({
    tag,
    lines,
    level,
  }: {
    tag?: string;
    lines: number;
    level?: string;
  }) => {
    const output = await adb.logcat({ tag, lines, level });
    return { content: [{ type: "text" as const, text: output }] };
  },
};

export const webspatialLogsTool = {
  name: "webspatial_logs",
  description:
    "Get logcat filtered for WebSpatial-related tags: " +
    "WebSpatial, chromium, WebEngine, SpatialSDK, " +
    "AttachmentManager, SpatialSession, JSBridge.",
  schema: z.object({
    lines: z.number().default(200),
  }),
  handler: async ({ lines }: { lines: number }) => {
    const output = await ws.getWebSpatialLogs(lines);
    return { content: [{ type: "text" as const, text: output || "No matching log entries." }] };
  },
};

// ---------------------------------------------------------------------------
// Shell command
// ---------------------------------------------------------------------------

export const shellCommandTool = {
  name: "adb_shell",
  description:
    "Execute an arbitrary adb shell command. Use for advanced debugging. " +
    "Example: am start -a android.intent.action.VIEW -d \"<URL>\" com.picoxr.browser " +
    "or specify an explicit activity with -n com.picoxr.webapp.template/com.picoxr.spacewebappp.platform.WebAppActivity.",
  schema: z.object({
    command: z.string().describe("Shell command to execute"),
  }),
  handler: async ({ command }: { command: string }) => {
    const output = await adb.shell(command);
    return { content: [{ type: "text" as const, text: output || "(no output)" }] };
  },
};

/** All inspection tools. */
export const inspectionTools = [
  screenshotTool,
  getUiTreeTool,
  deviceInfoTool,
  listDevicesTool,
  logcatTool,
  webspatialLogsTool,
  shellCommandTool,
];
