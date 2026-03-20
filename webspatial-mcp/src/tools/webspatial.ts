/**
 * MCP Tool definitions: WebSpatial-specific
 *
 * Tools tailored to the WebSpatial development workflow on PICO OS 6:
 *  - Dev server port forwarding
 *  - App lifecycle (launch, stop, clear, install)
 *  - Spatial scene inspection
 *  - WebView navigation and JS eval
 */

import { z } from "zod";
import * as ws from "../utils/webspatial.js";
import * as adb from "../utils/adb.js";

// ---------------------------------------------------------------------------
// Dev environment setup
// ---------------------------------------------------------------------------

export const setupDevPortsTool = {
  name: "setup_dev_ports",
  description:
    "Set up reverse port forwarding for the WebSpatial dev server. " +
    "Maps device ports → host ports so the device can reach your " +
    "Vite dev server (default: 5173) and livereload (default: 35729). " +
    "Equivalent to: adb reverse tcp:5173 tcp:5173 && adb reverse tcp:35729 tcp:35729",
  schema: z.object({
    dev_server_port: z.number().default(5173),
    livereload_port: z.number().default(35729),
  }),
  handler: async ({
    dev_server_port,
    livereload_port,
  }: {
    dev_server_port: number;
    livereload_port: number;
  }) => {
    const ports = await ws.setupDevPorts(dev_server_port, livereload_port);
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Port forwarding established:\n` +
            `  Device :${ports.devServerPort} → Host :${ports.devServerPort} (dev server)\n` +
            `  Device :${ports.livereloadPort} → Host :${ports.livereloadPort} (livereload)`,
        },
      ],
    };
  },
};

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

export const launchAppTool = {
  name: "launch_app",
  description:
    "Launch a WebSpatial app on the device. " +
    "Defaults to the WebSpatial Browser app. " +
    "Optionally pass a URL to open directly. " +
    "Note: with a URL, this uses an Android VIEW intent (am start -a VIEW -d '<URL>'). " +
    "Typical targets include 'com.picoxr.browser'; you may also specify an explicit activity such as " +
    "'com.picoxr.webapp.template/com.picoxr.spacewebappp.platform.WebAppActivity'.",
  schema: z.object({
    package_name: z.string().optional().describe("Android package name"),
    url: z.string().optional().describe("URL to open in the app"),
  }),
  handler: async ({ package_name, url }: { package_name?: string; url?: string }) => {
    const result = await ws.launchApp(package_name, url);
    return {
      content: [
        {
          type: "text" as const,
          text: `Launched ${package_name ?? "WebSpatial Browser"}${url ? ` with URL: ${url}` : ""}\n${result}`,
        },
      ],
    };
  },
};

export const stopAppTool = {
  name: "stop_app",
  description: "Force-stop a WebSpatial app.",
  schema: z.object({
    package_name: z.string().optional(),
  }),
  handler: async ({ package_name }: { package_name?: string }) => {
    const result = await ws.stopApp(package_name);
    return { content: [{ type: "text" as const, text: `Stopped ${package_name ?? "WebSpatial Browser"}\n${result}` }] };
  },
};

export const clearAppDataTool = {
  name: "clear_app_data",
  description: "Clear all data for a WebSpatial app (cache, storage, etc).",
  schema: z.object({
    package_name: z.string().optional(),
  }),
  handler: async ({ package_name }: { package_name?: string }) => {
    const result = await ws.clearAppData(package_name);
    return { content: [{ type: "text" as const, text: `Cleared data for ${package_name ?? "WebSpatial Browser"}\n${result}` }] };
  },
};

export const installApkTool = {
  name: "install_apk",
  description: "Install an APK from the host machine onto the device.",
  schema: z.object({
    path: z.string().describe("Path to the APK file on the host"),
  }),
  handler: async ({ path }: { path: string }) => {
    const result = await ws.installApk(path);
    return { content: [{ type: "text" as const, text: result }] };
  },
};

export const checkInstalledTool = {
  name: "check_installed",
  description: "Check if a package is installed on the device.",
  schema: z.object({
    package_name: z.string(),
  }),
  handler: async ({ package_name }: { package_name: string }) => {
    const installed = await ws.isInstalled(package_name);
    return {
      content: [
        {
          type: "text" as const,
          text: installed
            ? `✓ ${package_name} is installed`
            : `✗ ${package_name} is NOT installed`,
        },
      ],
    };
  },
};

// ---------------------------------------------------------------------------
// WebSpatial inspection / navigation
// ---------------------------------------------------------------------------

export const inspectSceneTool = {
  name: "inspect_spatial_scene",
  description:
    "Call window.inspectCurrentSpatialScene() in the WebSpatial WebView. " +
    "Returns the current spatial scene state as JSON. " +
    "Requires debug mode / DevTools-enabled WebEngine.",
  schema: z.object({}),
  handler: async () => {
    const result = await ws.inspectSpatialScene();
    return { content: [{ type: "text" as const, text: result }] };
  },
};

export const getCurrentUrlTool = {
  name: "get_current_url",
  description: "Get the URL currently loaded in the WebSpatial WebView.",
  schema: z.object({}),
  handler: async () => {
    const url = await ws.getCurrentUrl();
    return { content: [{ type: "text" as const, text: url }] };
  },
};

export const navigateToTool = {
  name: "navigate_to",
  description: "Navigate the WebSpatial WebView to a URL.",
  schema: z.object({
    url: z.string().describe("URL to navigate to"),
  }),
  handler: async ({ url }: { url: string }) => {
    await ws.navigateTo(url);
    return { content: [{ type: "text" as const, text: `Navigating to: ${url}` }] };
  },
};

export const evalJsTool = {
  name: "eval_js",
  description:
    "Execute JavaScript in the WebSpatial WebView. " +
    "Use for inspecting runtime state, calling WebSpatial APIs, " +
    "or debugging spatial rendering issues.",
  schema: z.object({
    code: z.string().describe("JavaScript code to execute"),
  }),
  handler: async ({ code }: { code: string }) => {
    const result = await ws.evalInWebView(code);
    return { content: [{ type: "text" as const, text: result }] };
  },
};

// ---------------------------------------------------------------------------
// Port forwarding
// ---------------------------------------------------------------------------

export const portForwardTool = {
  name: "port_forward",
  description:
    "Forward a TCP port. Direction: 'forward' (host→device) or 'reverse' (device→host).",
  schema: z.object({
    direction: z.enum(["forward", "reverse"]),
    local_port: z.number(),
    remote_port: z.number(),
  }),
  handler: async ({
    direction,
    local_port,
    remote_port,
  }: {
    direction: "forward" | "reverse";
    local_port: number;
    remote_port: number;
  }) => {
    if (direction === "forward") {
      await adb.forward(local_port, remote_port);
    } else {
      await adb.reverse(remote_port, local_port);
    }
    return {
      content: [
        {
          type: "text" as const,
          text: `${direction}: local:${local_port} ↔ remote:${remote_port}`,
        },
      ],
    };
  },
};

/** All WebSpatial-specific tools. */
export const webspatialTools = [
  setupDevPortsTool,
  launchAppTool,
  stopAppTool,
  clearAppDataTool,
  installApkTool,
  checkInstalledTool,
  inspectSceneTool,
  getCurrentUrlTool,
  navigateToTool,
  evalJsTool,
  portForwardTool,
];

// ---------------------------------------------------------------------------
// PWA automation: Open as app
// ---------------------------------------------------------------------------

// (PWA automation moved to native_ui tools)
