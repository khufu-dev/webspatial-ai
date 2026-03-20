/**
 * MCP Tool definitions: Input / Interaction
 *
 * Maps to `adb shell input` commands on PICO OS 6 (Swan).
 * Supports: tap, swipe, text, keyevent, scroll, draganddrop,
 *           motionevent sequences (for hover simulation), keycombination.
 */

import { z } from "zod";
import * as adb from "../utils/adb.js";

// ---------------------------------------------------------------------------
// Tool definitions (for McpServer.tool registration)
// ---------------------------------------------------------------------------

export const tapTool = {
  name: "tap",
  description:
    "Tap at (x, y) on the device screen. Simulates a finger touch. " +
    "Use `get_ui_tree` first to find element coordinates.",
  schema: z.object({
    x: z.number().describe("X coordinate"),
    y: z.number().describe("Y coordinate"),
    source: z
      .enum(["touchscreen", "touchnavigation", "stylus", "touchpad", "mouse"])
      .default("touchscreen")
      .describe("Input source"),
  }),
  handler: async ({ x, y, source }: { x: number; y: number; source?: string }) => {
    const src = source ?? "touchscreen";
    await adb.input("tap", x, y);
    return { content: [{ type: "text" as const, text: `Tapped (${x}, ${y}) via ${src}` }] };
  },
};

export const doubleTapTool = {
  name: "double_tap",
  description: "Double-tap at (x, y).",
  schema: z.object({
    x: z.number(),
    y: z.number(),
  }),
  handler: async ({ x, y }: { x: number; y: number }) => {
    await adb.input("tap", x, y);
    await new Promise((r) => setTimeout(r, 80));
    await adb.input("tap", x, y);
    return { content: [{ type: "text" as const, text: `Double-tapped (${x}, ${y})` }] };
  },
};

export const longPressTool = {
  name: "long_press",
  description: "Long press at (x, y) for a given duration.",
  schema: z.object({
    x: z.number(),
    y: z.number(),
    duration_ms: z.number().default(1000).describe("Hold duration in milliseconds"),
  }),
  handler: async ({ x, y, duration_ms }: { x: number; y: number; duration_ms: number }) => {
    // Long press = swipe from same point to same point over duration
    await adb.input("swipe", x, y, x, y, duration_ms);
    return {
      content: [{ type: "text" as const, text: `Long pressed (${x}, ${y}) for ${duration_ms}ms` }],
    };
  },
};

export const swipeTool = {
  name: "swipe",
  description:
    "Swipe from (x1, y1) to (x2, y2). Use for scrolling, " +
    "page transitions, or gesture-based navigation.",
  schema: z.object({
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
    duration_ms: z.number().default(300).describe("Swipe duration in ms"),
  }),
  handler: async ({
    x1,
    y1,
    x2,
    y2,
    duration_ms,
  }: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    duration_ms: number;
  }) => {
    await adb.input("swipe", x1, y1, x2, y2, duration_ms);
    return {
      content: [
        { type: "text" as const, text: `Swiped (${x1},${y1}) → (${x2},${y2}) in ${duration_ms}ms` },
      ],
    };
  },
};

export const textInputTool = {
  name: "type_text",
  description:
    "Type text on the device keyboard. Focus an input field first with `tap`.",
  schema: z.object({
    text: z.string().describe("Text to type"),
  }),
  handler: async ({ text }: { text: string }) => {
    // `input text` requires spaces to be escaped
    const escaped = text.replace(/ /g, "%s").replace(/'/g, "\\'");
    await adb.input("text", escaped);
    return { content: [{ type: "text" as const, text: `Typed: "${text}"` }] };
  },
};

export const keyeventTool = {
  name: "keyevent",
  description:
    "Send a key event. Common keys: KEYCODE_BACK (4), KEYCODE_HOME (3), " +
    "KEYCODE_ENTER (66), KEYCODE_DEL (67), KEYCODE_TAB (61), " +
    "KEYCODE_VOLUME_UP (24), KEYCODE_VOLUME_DOWN (25). " +
    "Use name or numeric code.",
  schema: z.object({
    key: z.string().describe("Key code name or number (e.g. 'KEYCODE_BACK' or '4')"),
    longpress: z.boolean().default(false),
  }),
  handler: async ({ key, longpress }: { key: string; longpress: boolean }) => {
    const flags = longpress ? "--longpress" : "";
    await adb.input("keyevent", flags, key);
    return { content: [{ type: "text" as const, text: `Key event: ${key}${longpress ? " (longpress)" : ""}` }] };
  },
};

export const scrollTool = {
  name: "scroll",
  description:
    "Scroll at (x, y) by the given axis amounts. " +
    "Positive VSCROLL = scroll up, negative = scroll down.",
  schema: z.object({
    x: z.number().describe("X coordinate for scroll origin"),
    y: z.number().describe("Y coordinate for scroll origin"),
    vscroll: z.number().default(-3).describe("Vertical scroll amount"),
    hscroll: z.number().optional().describe("Horizontal scroll amount"),
  }),
  handler: async ({
    x,
    y,
    vscroll,
    hscroll,
  }: {
    x: number;
    y: number;
    vscroll: number;
    hscroll?: number;
  }) => {
    const axes = [`--axis VSCROLL,${vscroll}`];
    if (hscroll !== undefined) axes.push(`--axis HSCROLL,${hscroll}`);
    await adb.shell(`input mouse scroll ${x} ${y} ${axes.join(" ")}`);
    return {
      content: [{ type: "text" as const, text: `Scrolled at (${x},${y}) vscroll=${vscroll}` }],
    };
  },
};

export const dragAndDropTool = {
  name: "drag_and_drop",
  description: "Drag from (x1, y1) and drop at (x2, y2).",
  schema: z.object({
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
    duration_ms: z.number().default(500),
  }),
  handler: async ({
    x1,
    y1,
    x2,
    y2,
    duration_ms,
  }: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    duration_ms: number;
  }) => {
    await adb.input("draganddrop", x1, y1, x2, y2, duration_ms);
    return {
      content: [
        { type: "text" as const, text: `Dragged (${x1},${y1}) → (${x2},${y2}) in ${duration_ms}ms` },
      ],
    };
  },
};

/**
 * Hover simulation via motionevent sequence.
 *
 * PICO OS 6 `input` supports `motionevent DOWN|UP|MOVE|CANCEL`.
 * A hover is: mouse source MOVE without DOWN, but the `input` command
 * requires us to use the `mouse` source explicitly.
 * We send a MOVE event at the target coords using the mouse source.
 */
export const hoverTool = {
  name: "hover",
  description:
    "Simulate a hover at (x, y) using mouse motion events. " +
    "Useful for testing CSS :hover states in WebSpatial spatial panels.",
  schema: z.object({
    x: z.number(),
    y: z.number(),
  }),
  handler: async ({ x, y }: { x: number; y: number }) => {
    // Send a MOVE event via the mouse source to simulate hover
    await adb.shell(`input mouse motionevent MOVE ${x} ${y}`);
    return { content: [{ type: "text" as const, text: `Hover at (${x}, ${y})` }] };
  },
};

export const motionEventTool = {
  name: "motion_event",
  description:
    "Send a raw motion event (DOWN, UP, MOVE, CANCEL) at (x, y). " +
    "Compose these for complex gesture sequences.",
  schema: z.object({
    action: z.enum(["DOWN", "UP", "MOVE", "CANCEL"]),
    x: z.number(),
    y: z.number(),
    source: z.enum(["touchscreen", "mouse", "stylus", "touchpad"]).default("touchscreen"),
  }),
  handler: async ({
    action,
    x,
    y,
    source,
  }: {
    action: string;
    x: number;
    y: number;
    source: string;
  }) => {
    await adb.shell(`input ${source} motionevent ${action} ${x} ${y}`);
    return {
      content: [{ type: "text" as const, text: `Motion ${action} at (${x},${y}) via ${source}` }],
    };
  },
};

export const keyCombinationTool = {
  name: "key_combination",
  description:
    "Send a key combination (e.g. Ctrl+A). Provide key codes in order.",
  schema: z.object({
    keys: z.array(z.string()).describe("Key codes in order, e.g. ['KEYCODE_CTRL_LEFT', 'KEYCODE_A']"),
    duration_ms: z.number().optional().describe("Duration to hold"),
  }),
  handler: async ({ keys, duration_ms }: { keys: string[]; duration_ms?: number }) => {
    const dFlag = duration_ms ? `-t ${duration_ms}` : "";
    await adb.shell(`input keycombination ${dFlag} ${keys.join(" ")}`);
    return {
      content: [{ type: "text" as const, text: `Key combination: ${keys.join(" + ")}` }],
    };
  },
};

/** All input tools as an array for easy registration. */
export const inputTools = [
  tapTool,
  doubleTapTool,
  longPressTool,
  swipeTool,
  textInputTool,
  keyeventTool,
  scrollTool,
  dragAndDropTool,
  hoverTool,
  motionEventTool,
  keyCombinationTool,
];
