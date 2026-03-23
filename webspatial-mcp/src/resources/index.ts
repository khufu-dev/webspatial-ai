/**
 * MCP Resource definitions.
 *
 * Resources provide read-only context that the LLM can reference:
 *  - device://info           — current device info
 *  - device://screen         — live screenshot
 *  - webspatial://scene      — spatial scene state
 *  - webspatial://logs       — filtered logcat
 *  - webspatial://manifest   — web app manifest from current page
 *  - webspatial://debug-platforms — static PICO vs visionOS debug reference (no ADB)
 */

import * as adb from "../utils/adb.js";
import * as ws from "../utils/webspatial.js";
import { STATIC_PLATFORM_GUIDE } from "../utils/debug_platform_guide.js";

export interface ResourceDef {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: () => Promise<{ uri: string; text?: string; blob?: string; mimeType: string }>;
}

export const resources: ResourceDef[] = [
  {
    uri: "device://info",
    name: "Device Info",
    description: "Current connected device details (model, OS, display, etc)",
    mimeType: "application/json",
    handler: async () => {
      const info = await ws.getDeviceInfo();
      return { uri: "device://info", text: JSON.stringify(info, null, 2), mimeType: "application/json" };
    },
  },
  {
    uri: "device://screen",
    name: "Device Screen",
    description: "Current screenshot of the device",
    mimeType: "image/png",
    handler: async () => {
      const b64 = await adb.screenshot();
      return { uri: "device://screen", blob: b64, mimeType: "image/png" };
    },
  },
  {
    uri: "webspatial://logs",
    name: "WebSpatial Logs",
    description: "Recent logcat entries filtered for WebSpatial-related tags",
    mimeType: "text/plain",
    handler: async () => {
      const logs = await ws.getWebSpatialLogs(300);
      return { uri: "webspatial://logs", text: logs, mimeType: "text/plain" };
    },
  },
  {
    uri: "webspatial://scene",
    name: "Spatial Scene State",
    description: "Current spatial scene state from window.inspectCurrentSpatialScene()",
    mimeType: "application/json",
    handler: async () => {
      const scene = await ws.inspectSpatialScene();
      return { uri: "webspatial://scene", text: scene, mimeType: "application/json" };
    },
  },
  {
    uri: "device://ui-tree",
    name: "UI Hierarchy",
    description: "Current UI hierarchy XML dump (uiautomator)",
    mimeType: "application/xml",
    handler: async () => {
      const xml = await adb.dumpUi();
      return { uri: "device://ui-tree", text: xml, mimeType: "application/xml" };
    },
  },
  {
    uri: "webspatial://debug-platforms",
    name: "WebSpatial debug platforms",
    description:
      "How to debug WebSpatial on PICO OS 6 (ADB) vs visionOS Simulator: workflows, tools, resources. Read without a device.",
    mimeType: "application/json",
    handler: async () => {
      const doc = {
        server_purpose:
          "WebSpatial MCP supports two targets: PICO OS 6 via ADB, and visionOS via simctl on macOS. Use tool webspatial_debug_route to classify a user prompt.",
        how_to_route:
          "Call webspatial_debug_route with the user's goal text for primary_route + next_step. This resource is the same static guide embedded in that response.",
        ...STATIC_PLATFORM_GUIDE,
      };
      return {
        uri: "webspatial://debug-platforms",
        text: JSON.stringify(doc, null, 2),
        mimeType: "application/json",
      };
    },
  },
];
