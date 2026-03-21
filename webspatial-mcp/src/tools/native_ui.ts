/**
 * MCP Tool definitions: Native Browser UI automation
 */

import { z } from "zod";
import * as nui from "../utils/native_ui.js";

export const getNativeUiTreeTool = {
  name: "get_native_ui_tree",
  description: "Fetch the current Android UI hierarchy XML (native browser chrome).",
  schema: z.object({}),
  handler: async () => {
    const xml = await nui.getNativeUiTree();
    return { content: [{ type: "text" as const, text: xml }] };
  },
};

export const findNativeNodesTool = {
  name: "find_native_nodes",
  description:
    "Parse the UI XML and return normalized node list with attributes and bounds.",
  schema: z.object({ xml: z.string().describe("UI hierarchy XML from get_native_ui_tree") }),
  handler: async ({ xml }: { xml: string }) => {
    const nodes = nui.findNativeNodes(xml);
    return { content: [{ type: "text" as const, text: JSON.stringify(nodes, null, 2) }] };
  },
};

export const rankNativeCandidatesTool = {
  name: "rank_native_candidates",
  description: "Score and sort nodes for a given native intent (e.g., open_as_app).",
  schema: z.object({
    intent: z.string().default("open_as_app"),
    xml: z.string().describe("UI hierarchy XML"),
  }),
  handler: async ({ intent, xml }: { intent: string; xml: string }) => {
    const nodes = nui.findNativeNodes(xml);
    const ranked = await nui.rankNativeCandidates(intent, nodes);
    return { content: [{ type: "text" as const, text: JSON.stringify(ranked, null, 2) }] };
  },
};

export const clickOpenAsAppTool = {
  name: "click_open_as_app",
  description:
    "Deterministically click the native 'Open as app' control using UI parsing → menu → focus fallback.",
  schema: z.object({}),
  handler: async () => {
    const res = await nui.clickOpenAsApp();
    return { content: [{ type: "text" as const, text: JSON.stringify(res, null, 2) }] };
  },
};

export const ensurePwaOpenedTool = {
  name: "ensure_pwa_opened",
  description:
    "Ensure the PWA/app mode is open. If not, attempt to open via native UI automation and report structured result.",
  schema: z.object({}),
  handler: async () => {
    const res = await nui.ensurePwaOpened();
    return { content: [{ type: "text" as const, text: JSON.stringify(res, null, 2) }] };
  },
};

export const nativeUiTools: any[] = [
  getNativeUiTreeTool,
  findNativeNodesTool,
  rankNativeCandidatesTool,
  clickOpenAsAppTool,
  ensurePwaOpenedTool,
];

// Additional native context & navigation tools
export const getNativeContextTool = {
  name: "get_native_context",
  description: "Return structured native context: mode, top activity, focused window, package, notes.",
  schema: z.object({}),
  handler: async () => {
    const ctx = await nui.getNativeContext();
    return { content: [{ type: "text" as const, text: JSON.stringify(ctx, null, 2) }] };
  },
};

export const detectRuntimeModeTool = {
  name: "detect_runtime_mode",
  description: "Classify current runtime mode: browser | browser_menu | pwa | unknown.",
  schema: z.object({}),
  handler: async () => {
    const ctx = await nui.detectRuntimeMode();
    return { content: [{ type: "text" as const, text: JSON.stringify(ctx, null, 2) }] };
  },
};

export const getTopActivityTool = {
  name: "get_top_activity",
  description: "Get dumpsys top/resumed activity line.",
  schema: z.object({}),
  handler: async () => {
    const a = await nui.getTopActivity();
    return { content: [{ type: "text" as const, text: a ?? "(unknown)" }] };
  },
};

export const getFocusedWindowTool = {
  name: "get_focused_window",
  description: "Get current focused window from dumpsys window.",
  schema: z.object({}),
  handler: async () => {
    const w = await nui.getFocusedWindow();
    return { content: [{ type: "text" as const, text: w ?? "(unknown)" }] };
  },
};

export const getWindowDumpTool = {
  name: "get_window_dump",
  description: "Return dumpsys window output.",
  schema: z.object({}),
  handler: async () => {
    const d = await nui.getWindowDump();
    return { content: [{ type: "text" as const, text: d }] };
  },
};

export const waitForNativeUiChangeTool = {
  name: "wait_for_native_ui_change",
  description: "Poll until the UI tree changes or timeout; returns the new XML.",
  schema: z.object({ timeoutMs: z.number().default(2000), pollMs: z.number().default(300) }),
  handler: async ({ timeoutMs, pollMs }: { timeoutMs: number; pollMs: number }) => {
    const prev = await nui.getNativeUiTree();
    const res = await nui.waitForNativeUiChange(prev, timeoutMs, pollMs);
    return { content: [{ type: "text" as const, text: JSON.stringify(res, null, 2) }] };
  },
};

export const sendKeyeventTool = {
  name: "send_keyevent",
  description: "Send a native Android keyevent (string name or numeric code).",
  schema: z.object({ key: z.string() }),
  handler: async ({ key }: { key: string }) => {
    const out = await nui.sendKeyevent(key);
    return { content: [{ type: "text" as const, text: out }] };
  },
};

export const focusNavTools = [
  {
    name: "focus_next",
    description: "Move focus forward (TAB/DPAD_RIGHT).",
    schema: z.object({}),
    handler: async () => { await nui.focusNext(); return { content: [{ type: "text" as const, text: "focus_next" }] }; },
  },
  {
    name: "focus_prev",
    description: "Move focus backward (DPAD_LEFT).",
    schema: z.object({}),
    handler: async () => { await nui.focusPrev(); return { content: [{ type: "text" as const, text: "focus_prev" }] }; },
  },
  {
    name: "focus_up",
    description: "Move focus up (DPAD_UP).",
    schema: z.object({}),
    handler: async () => { await nui.focusUp(); return { content: [{ type: "text" as const, text: "focus_up" }] }; },
  },
  {
    name: "focus_down",
    description: "Move focus down (DPAD_DOWN).",
    schema: z.object({}),
    handler: async () => { await nui.focusDown(); return { content: [{ type: "text" as const, text: "focus_down" }] }; },
  },
  {
    name: "focus_left",
    description: "Move focus left (DPAD_LEFT).",
    schema: z.object({}),
    handler: async () => { await nui.focusLeft(); return { content: [{ type: "text" as const, text: "focus_left" }] }; },
  },
  {
    name: "focus_right",
    description: "Move focus right (DPAD_RIGHT).",
    schema: z.object({}),
    handler: async () => { await nui.focusRight(); return { content: [{ type: "text" as const, text: "focus_right" }] }; },
  },
  {
    name: "activate_focused",
    description: "Activate focused element (ENTER/DPAD_CENTER).",
    schema: z.object({}),
    handler: async () => { await nui.activateFocused(); return { content: [{ type: "text" as const, text: "activate_focused" }] }; },
  },
];

nativeUiTools.push(
  getNativeContextTool,
  detectRuntimeModeTool,
  getTopActivityTool,
  getFocusedWindowTool,
  getWindowDumpTool,
  waitForNativeUiChangeTool,
  sendKeyeventTool,
  ...focusNavTools,
);

// Caching / router utilities
export const cachePwaTargetTool = {
  name: "cache_pwa_target",
  description: "Cache current PWA package/activity (if detected) for reuse.",
  schema: z.object({}),
  handler: async () => {
    const ctx = await nui.detectRuntimeMode();
    nui.cachePwaTarget(ctx);
    return { content: [{ type: "text" as const, text: JSON.stringify({ cached: true, ctx }, null, 2) }] };
  },
};

export const loadCachedPwaTargetTool = {
  name: "load_cached_pwa_target",
  description: "Return cached PWA package/activity if available.",
  schema: z.object({}),
  handler: async () => {
    const t = nui.loadCachedPwaTarget();
    return { content: [{ type: "text" as const, text: JSON.stringify(t, null, 2) }] };
  },
};

export const tryLaunchCachedPwaTool = {
  name: "try_launch_cached_pwa",
  description: "Attempt to launch cached PWA target directly and verify.",
  schema: z.object({}),
  handler: async () => {
    const res = await nui.tryLaunchCachedPwa();
    return { content: [{ type: "text" as const, text: JSON.stringify(res, null, 2) }] };
  },
};

export const ensureRuntimeReadyTool = {
  name: "ensure_runtime_ready",
  description: "Return current mode and next recommended actions (mode-aware router).",
  schema: z.object({}),
  handler: async () => {
    const r = await nui.ensureRuntimeReady();
    return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }] };
  },
};

export const routeActionByModeTool = {
  name: "route_action_by_mode",
  description: "Show how an action would be routed given current mode (native vs webspatial).",
  schema: z.object({ action: z.string().default("navigate_to") }),
  handler: async ({ action }: { action: string }) => {
    const r = await nui.routeActionByMode(action);
    return { content: [{ type: "text" as const, text: JSON.stringify(r, null, 2) }] };
  },
};

nativeUiTools.push(
  cachePwaTargetTool,
  loadCachedPwaTargetTool,
  tryLaunchCachedPwaTool,
  ensureRuntimeReadyTool,
  routeActionByModeTool,
);
