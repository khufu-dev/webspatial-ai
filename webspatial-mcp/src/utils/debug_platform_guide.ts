/**
 * Static reference + prompt-based routing for WebSpatial debugging on
 * PICO OS 6 (ADB) vs visionOS Simulator (simctl / macOS).
 */

export type DebugPrimaryRoute = "pico_os6" | "visionos" | "both" | "unclear";

export interface PlatformDebugGuide {
  label: string;
  one_line: string;
  prerequisites: string[];
  typical_workflow: string[];
  primary_tools: string[];
  mcp_resources: string[];
  notes: string[];
}

export interface DebugRouteResult {
  primary_route: DebugPrimaryRoute;
  /** Substrings / tags that increased each score (for transparency). */
  matched_signals: { pico_os6: string[]; visionos: string[] };
  /** Short rationale for the model. */
  rationale: string;
  /** What to do next in one sentence. */
  next_step: string;
  pico_os6: PlatformDebugGuide;
  visionos: PlatformDebugGuide;
}

const PICO_SIGNALS: { pattern: RegExp; signal: string }[] = [
  { pattern: /\bpico\b/i, signal: "pico" },
  { pattern: /\bswan\b/i, signal: "swan" },
  { pattern: /\bpico\s*os\s*6\b/i, signal: "pico_os_6" },
  { pattern: /\badb\b/i, signal: "adb" },
  { pattern: /\blogcat\b/i, signal: "logcat" },
  { pattern: /\bapk\b/i, signal: "apk" },
  { pattern: /\bandroid\b/i, signal: "android" },
  { pattern: /\bpicoxr\b/i, signal: "picoxr" },
  { pattern: /\bheadset\b/i, signal: "headset" },
  { pattern: /\bandroid\s+emulator\b/i, signal: "android_emulator" },
  { pattern: /\bq2\b|\bneo\s*3\b/i, signal: "pico_device_family" },
  { pattern: /\buiautomator\b/i, signal: "uiautomator" },
  { pattern: /\bwebview\b.*\bandroid\b|\bandroid\b.*\bwebview\b/i, signal: "android_webview" },
];

const VISION_SIGNALS: { pattern: RegExp; signal: string }[] = [
  { pattern: /\bvision\s*os\b|\bvisionos\b|\bxros\b/i, signal: "visionos" },
  { pattern: /\bxcode\b/i, signal: "xcode" },
  { pattern: /\brealitykit\b|\breality\s+composer\b/i, signal: "realitykit" },
  { pattern: /\bapple\s+simulator\b|\bsimulator\b.*\bvision\b|\bvision\b.*\bsimulator\b/i, signal: "vision_simulator" },
  { pattern: /\bxr\s+simulator\b/i, signal: "xr_simulator" },
  { pattern: /\bsimctl\b/i, signal: "simctl" },
  { pattern: /\bcom\.apple\.|\.xcworkspace\b|\bswiftui\b/i, signal: "apple_stack" },
  { pattern: /\bmacos\b.*\bsimulator\b|\bsimulator\b.*\bmacos\b/i, signal: "macos_simulator" },
];

/** Plain "simulator" is weak; boost vision only if not clearly Android. */
const WEAK_SIMULATOR = /\bsimulator\b/i;

function collectSignals(text: string, table: typeof PICO_SIGNALS): string[] {
  const out: string[] = [];
  for (const { pattern, signal } of table) {
    if (pattern.test(text)) out.push(signal);
  }
  return out;
}

function picoScore(text: string, signals: string[]): number {
  let s = signals.length * 2;
  if (WEAK_SIMULATOR.test(text) && /\bandroid\b/i.test(text)) s += 2;
  return s;
}

function visionScore(text: string, signals: string[]): number {
  let s = signals.length * 2;
  if (WEAK_SIMULATOR.test(text) && !/\bandroid\b/i.test(text)) s += 1;
  return s;
}

export const STATIC_PLATFORM_GUIDE: Omit<DebugRouteResult, "primary_route" | "matched_signals" | "rationale" | "next_step"> = {
  pico_os6: {
    label: "PICO OS 6 (Swan) — Android device / emulator",
    one_line:
      "Debug via ADB: screenshots, UI XML, shell, WebView JS, and WebSpatial logcat on a connected PICO-class device.",
    prerequisites: [
      "ADB installed; device or emulator authorized (`adb devices`).",
      "Optional: ANDROID_DEVICE_SERIAL or ADB_PATH env vars.",
      "WebSpatial browser or template app installed on device.",
    ],
    typical_workflow: [
      "list_devices → confirm the PICO/Swan serial is selected.",
      "screenshot and/or get_ui_tree to see chrome + spatial UI.",
      "setup_dev_ports so the device can reach your Vite dev server.",
      "launch_app (with URL) or navigate_to / eval_js inside the WebView.",
      "inspect_spatial_scene and webspatial_logs for spatial / bridge issues.",
      "Use tap / swipe / input tools to reproduce interactions.",
    ],
    primary_tools: [
      "list_devices",
      "device_info",
      "screenshot",
      "get_ui_tree",
      "setup_dev_ports",
      "launch_app",
      "navigate_to",
      "get_current_url",
      "eval_js",
      "inspect_spatial_scene",
      "webspatial_logs",
      "logcat",
      "adb_shell",
      "tap",
      "swipe",
      "port_forward",
      "get_native_ui_tree",
      "ensure_pwa_opened",
      "click_open_as_app",
    ],
    mcp_resources: [
      "device://info",
      "device://screen",
      "device://ui-tree",
      "webspatial://scene",
      "webspatial://logs",
    ],
    notes: [
      "MCP prompts: debug-webspatial, test-interaction, spatial-audit (PICO-oriented).",
      "Resources device://* require a live ADB target.",
    ],
  },
  visionos: {
    label: "visionOS — Xcode Simulator on macOS",
    one_line:
      "Debug via simctl and Simulator focus: app lifecycle, PNG screenshots, optional multi-angle captures (keyboard nudges).",
    prerequisites: [
      "macOS with Xcode; visionOS Simulator booted (simctl target: booted).",
      "Automation / Accessibility for Terminal or Cursor controlling Simulator.",
      "Your WebSpatial test app installed in the simulator.",
    ],
    typical_workflow: [
      "visionos_ensure_webspatial_running or visionos_launch_app with your bundle ID.",
      "visionos_screenshot for a single frame; visionos_capture_angles for nearby viewpoints.",
      "visionos_get_app_container when you need on-disk app data paths.",
      "Use host-side logs / Safari Web Inspector as needed (outside this MCP).",
    ],
    primary_tools: [
      "visionos_list_apps",
      "visionos_get_app_container",
      "visionos_launch_app",
      "visionos_terminate_app",
      "visionos_screenshot",
      "visionos_capture_angles",
      "visionos_ensure_webspatial_running",
    ],
    mcp_resources: [],
    notes: [
      "ADB-backed tools and device://* resources do not apply to visionOS.",
      "MCP prompt: debug-webspatial-visionos.",
      "Camera key bindings for visionos_capture_angles are documented on that tool (arrows / WASD / Q-E heuristics).",
    ],
  },
};

/**
 * Infer which debug path matches the user's prompt. Heuristic only — no network.
 */
export function routeDebugFromPrompt(prompt: string): DebugRouteResult {
  const trimmed = (prompt ?? "").trim();
  const lower = trimmed.toLowerCase();

  const picoSig = collectSignals(lower, PICO_SIGNALS);
  const visionSig = collectSignals(lower, VISION_SIGNALS);

  const ps = picoScore(lower, picoSig);
  const vs = visionScore(lower, visionSig);

  let primary: DebugPrimaryRoute;
  let rationale: string;
  let next: string;

  const bothMentioned =
    /\bboth\b/i.test(trimmed) ||
    (picoSig.length > 0 && visionSig.length > 0 && ps >= 2 && vs >= 2);

  if (bothMentioned && ps >= 2 && vs >= 2) {
    primary = "both";
    rationale = "Prompt suggests both PICO and visionOS (keywords for each platform).";
    next = "Run PICO and visionOS workflows in parallel on the appropriate hosts, or split into two sessions.";
  } else if (ps === 0 && vs === 0) {
    primary = "unclear";
    rationale = "No strong platform keywords; cannot infer PICO vs visionOS from this text alone.";
    next = "Ask which target they use, or call webspatial_debug_route again after they add 'PICO/ADB' or 'visionOS/Simulator'.";
  } else if (ps > vs) {
    primary = "pico_os6";
    rationale = `Scored higher for PICO/Android/ADB context (signals: ${picoSig.join(", ") || "weak generic"}).`;
    next = "Use ADB tools: list_devices → screenshot / get_ui_tree → setup_dev_ports → launch_app → webspatial_logs / inspect_spatial_scene.";
  } else if (vs > ps) {
    primary = "visionos";
    rationale = `Scored higher for visionOS / Apple Simulator context (signals: ${visionSig.join(", ") || "weak generic"}).`;
    next = "Use visionos_* tools on macOS with a booted visionOS Simulator; start with visionos_ensure_webspatial_running or visionos_screenshot.";
  } else {
    primary = "both";
    rationale = "Similar scores for PICO and visionOS signals; treat as cross-platform or clarify.";
    next = "Confirm one target first, or debug each platform with its respective tool set.";
  }

  return {
    primary_route: primary,
    matched_signals: { pico_os6: picoSig, visionos: visionSig },
    rationale,
    next_step: next,
    pico_os6: STATIC_PLATFORM_GUIDE.pico_os6,
    visionos: STATIC_PLATFORM_GUIDE.visionos,
  };
}
