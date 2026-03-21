/**
 * Native Browser UI automation (pre-WebSpatial phase)
 *
 * Deterministic interaction with Android/PICO browser chrome using:
 * - UI tree parsing (uiautomator dump)
 * - Key/focus navigation (input keyevent/DPAD)
 * - Pixel taps only as a final fallback
 */

import * as adb from "./adb.js";

export interface Bounds { x1: number; y1: number; x2: number; y2: number }
export interface NativeNode {
  index?: number;
  text?: string;
  contentDesc?: string;
  resourceId?: string;
  className?: string;
  packageName?: string;
  clickable?: boolean;
  enabled?: boolean;
  focusable?: boolean;
  focused?: boolean;
  bounds?: Bounds;
}

function parseBounds(boundsStr: string | undefined): Bounds | undefined {
  if (!boundsStr) return undefined;
  const m = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(boundsStr);
  if (!m) return undefined;
  return { x1: Number(m[1]), y1: Number(m[2]), x2: Number(m[3]), y2: Number(m[4]) };
}

function centerOf(b: Bounds | undefined): { cx: number; cy: number } | undefined {
  if (!b) return undefined;
  const cx = Math.round((b.x1 + b.x2) / 2);
  const cy = Math.round((b.y1 + b.y2) / 2);
  return { cx, cy };
}

export async function getNativeUiTree(): Promise<string> {
  return adb.dumpUi();
}

export function findNativeNodes(xml: string): NativeNode[] {
  const nodes: NativeNode[] = [];
  const nodeRegex = /<node[^>]*>/g;
  let m: RegExpExecArray | null;
  const attr = (src: string, name: string) => {
    const a = new RegExp(name + '="([^"]*)"').exec(src);
    return a?.[1];
  };
  while ((m = nodeRegex.exec(xml)) !== null) {
    const n = m[0];
    const bounds = parseBounds(attr(n, "bounds"));
    nodes.push({
      index: Number(attr(n, "index") ?? ""),
      text: attr(n, "text") ?? undefined,
      contentDesc: attr(n, "content-desc") ?? undefined,
      resourceId: attr(n, "resource-id") ?? undefined,
      className: attr(n, "class") ?? undefined,
      packageName: attr(n, "package") ?? undefined,
      clickable: (attr(n, "clickable") ?? "false") === "true",
      enabled: (attr(n, "enabled") ?? "true") === "true",
      focusable: (attr(n, "focusable") ?? "false") === "true",
      focused: (attr(n, "focused") ?? "false") === "true",
      bounds,
    });
  }
  return nodes;
}

function normalize(s?: string): string {
  return (s ?? "").trim().toLowerCase();
}

async function getViewport(): Promise<{ width: number; height: number }> {
  const s = await adb.shell("wm size");
  const m = /Physical size:\s*(\d+)x(\d+)/.exec(s);
  if (m) return { width: Number(m[1]), height: Number(m[2]) };
  // Fallback: infer from maximum bounds seen later
  return { width: 2160, height: 2160 };
}

export interface RankedNode {
  node: NativeNode;
  score: number;
  reason: string[];
}

export interface NativeContextInfo {
  mode: "browser" | "browser_menu" | "pwa" | "unknown";
  topActivity?: string;
  focusedWindow?: string;
  package?: string;
}

export async function rankNativeCandidates(
  intent: "open_as_app" | "browser_menu" | string,
  nodes: NativeNode[],
  context?: NativeContextInfo,
): Promise<RankedNode[]> {
  const viewport = await getViewport();
  const topToolbarMaxY = Math.round(Math.min(200, viewport.height * 0.12));
  const rightThresholdX = Math.round(viewport.width * 0.6);

  const phrasesExact = ["open as app", "作为独立应用打开"];
  const phrasesPartial = ["open", "app"];
  const installPhrases = [
    "install", "add to home screen", "use as app", "open", "添加到主屏幕", "安装",
  ];
  const menuHints = ["more options", "menu", "⋮", "更多选项"];

  const ranked: RankedNode[] = nodes.map((n) => {
    let score = 0;
    const reason: string[] = [];
    const txt = normalize(n.text);
    const desc = normalize(n.contentDesc);
    const id = normalize(n.resourceId);
    const cls = normalize(n.className);
    const pkg = normalize(n.packageName);
    const b = n.bounds;

    // Base penalties
    if (n.enabled === false) { score -= 10; reason.push("disabled"); }
    if (!b || b.x1 === b.x2 || b.y1 === b.y2) { score -= 10; reason.push("zero-size"); }

    // Region preference: browser toolbar (top area) and right side
    if (b) {
      if (b.y2 <= topToolbarMaxY) { score += 8; reason.push("top-toolbar"); }
      if (b.x1 >= rightThresholdX) { score += 5; reason.push("right-side"); }
    }

    const content = `${txt} ${desc}`.trim();

    if (intent === "open_as_app") {
      if (phrasesExact.some((p) => content === p)) { score += 50; reason.push("exact-text"); }
      if (phrasesPartial.every((p) => content.includes(p))) { score += 30; reason.push("partial-open+app"); }
      if (installPhrases.some((p) => content.includes(p))) { score += 12; reason.push("install-related"); }
      if (menuHints.some((p) => content.includes(p)) || id.includes("menu") || cls.includes("imagebutton")) {
        score += 6; reason.push("menu-hint");
      }
    } else if (intent === "browser_menu") {
      if (menuHints.some((p) => content.includes(p))) { score += 25; reason.push("menu-text"); }
      if (id.includes("menu") || cls.includes("imagebutton")) { score += 15; reason.push("menu-id/class"); }
    }

    // Package hint: prefer browser package for native chrome controls
    if (pkg.includes("browser")) { score += 3; reason.push("browser-pkg"); }

    // Context nudge: if we are in browser_menu, prefer menu candidates
    if (context?.mode === "browser_menu" && (id.includes("menu") || menuHints.some((p) => `${txt} ${desc}`.includes(p)))) {
      score += 5; reason.push("context-menu-mode");
    }
    return { node: n, score, reason };
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

export async function tapBoundsCenter(bounds: Bounds): Promise<{ cx: number; cy: number; output: string }> {
  const { cx, cy } = centerOf(bounds)!;
  const output = await adb.input("tap", cx, cy);
  return { cx, cy, output };
}

export async function tapNativeNode(node: NativeNode): Promise<{ cx: number; cy: number; output: string }> {
  if (!node.bounds) throw new Error("tapNativeNode: node has no bounds");
  return tapBoundsCenter(node.bounds);
}

export async function sendKeyevent(key: string | number): Promise<string> {
  // Prefer input keyevent for determinism
  return adb.input("keyevent", String(key));
}

export async function focusNext(): Promise<void> {
  try { await sendKeyevent("KEYCODE_TAB"); } catch {}
  await sendKeyevent("KEYCODE_DPAD_RIGHT");
}

export async function focusPrev(): Promise<void> {
  await sendKeyevent("KEYCODE_DPAD_LEFT");
}

export async function activateFocused(): Promise<void> {
  try { await sendKeyevent("KEYCODE_ENTER"); } catch {}
  await sendKeyevent("KEYCODE_DPAD_CENTER");
}

export async function focusUp(): Promise<void> {
  await sendKeyevent("KEYCODE_DPAD_UP");
}
export async function focusDown(): Promise<void> {
  await sendKeyevent("KEYCODE_DPAD_DOWN");
}
export async function focusLeft(): Promise<void> {
  await sendKeyevent("KEYCODE_DPAD_LEFT");
}
export async function focusRight(): Promise<void> {
  await sendKeyevent("KEYCODE_DPAD_RIGHT");
}

export async function openBrowserMenu(): Promise<{ ok: boolean; method: string; note: string }> {
  const xml = await getNativeUiTree();
  const nodes = findNativeNodes(xml);
  const ranked = await rankNativeCandidates("browser_menu", nodes);
  const top = ranked[0];
  if (top && top.score >= 10 && top.node.bounds) {
    await tapNativeNode(top.node);
    return { ok: true, method: "menu-node-tap", note: `Tapped menu candidate: ${top.reason.join(",")}` };
  }
  await sendKeyevent("KEYCODE_MENU");
  return { ok: true, method: "keyevent-menu", note: "Sent KEYCODE_MENU" };
}

export async function waitForNativeUiChange(prevXml: string, timeoutMs = 2000, pollMs = 300): Promise<{ changed: boolean; xml: string }> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const xml = await getNativeUiTree();
    if (xml !== prevXml) return { changed: true, xml };
    await new Promise((r) => setTimeout(r, pollMs));
  }
  const xml = await getNativeUiTree();
  return { changed: xml !== prevXml, xml };
}

// ---------------------------------------------------------------------------
// Native context detection
// ---------------------------------------------------------------------------

export async function getTopActivity(): Promise<string | undefined> {
  const dump = await adb.shell("dumpsys activity activities");
  const m1 = /mResumedActivity:\s*([^\n]+)/.exec(dump);
  if (m1) return m1[1].trim();
  const m2 = /topResumedActivity:\s*([^\n]+)/.exec(dump);
  return m2?.[1]?.trim();
}

export async function getFocusedWindow(): Promise<string | undefined> {
  const dump = await adb.shell("dumpsys window windows");
  const m = /mCurrentFocus=Window\{[^}]+\s([^\s]+)\}/.exec(dump);
  return m?.[1]?.trim();
}

export async function getWindowDump(): Promise<string> {
  return adb.shell("dumpsys window windows");
}

function inferPackageFromActivityLine(line?: string): string | undefined {
  if (!line) return undefined;
  const m = /([A-Za-z0-9_.]+)\//.exec(line);
  return m?.[1];
}

function classifyMode(xml: string, topActivity?: string, focusedWindow?: string): NativeContextInfo["mode"] {
  const nodes = findNativeNodes(xml);
  const pkgs = new Set(nodes.map((n) => normalize(n.packageName)));
  const anyBrowser = [...pkgs].some((p) => p.includes("browser"));
  const anyWebapp = [...pkgs].some((p) => p.includes("webapp"));
  const actPkg = normalize(inferPackageFromActivityLine(topActivity));

  if (anyWebapp || (actPkg && actPkg.includes("webapp"))) return "pwa";
  if (anyBrowser || (actPkg && actPkg.includes("browser"))) {
    // Heuristic: presence of obvious menu nodes suggests menu open state
    const menuLike = nodes.some((n) => normalize(n.resourceId).includes("menu") || normalize(n.contentDesc).includes("more options") || normalize(n.contentDesc).includes("更多选项"));
    return menuLike ? "browser_menu" : "browser";
  }
  return "unknown";
}

export async function detectRuntimeMode(): Promise<NativeContextInfo> {
  const xml = await getNativeUiTree();
  const topActivity = await getTopActivity();
  const focusedWindow = await getFocusedWindow();
  const pkg = inferPackageFromActivityLine(topActivity);
  const mode = classifyMode(xml, topActivity, focusedWindow);
  return {
    mode,
    topActivity,
    focusedWindow,
    package: pkg,
  };
}

export async function getNativeContext(): Promise<{
  mode: NativeContextInfo["mode"]; topActivity?: string; focusedWindow?: string; package?: string; uiTreeAvailable: boolean; notes: string[];
}> {
  const notes: string[] = [];
  const ctx = await detectRuntimeMode();
  const xml = await getNativeUiTree();
  notes.push(`nodes=${findNativeNodes(xml).length}`);
  return { mode: ctx.mode, topActivity: ctx.topActivity, focusedWindow: ctx.focusedWindow, package: ctx.package, uiTreeAvailable: true, notes };
}

function isPwaOpened(xml: string, ctx?: NativeContextInfo): boolean {
  if (ctx?.mode === "pwa") return true;
  const nodes = findNativeNodes(xml);
  return nodes.some((n) => normalize(n.packageName).includes("webapp"));
}

export async function clickOpenAsApp(): Promise<{
  ok: boolean;
  action: string;
  method: "direct-node-tap" | "menu-node-tap" | "focus-activate" | "already-open" | "failed";
  beforeContext?: NativeContextInfo;
  afterContext?: NativeContextInfo;
  node?: NativeNode;
  verification: { uiChanged: boolean; pwaOpened: boolean; topActivityChanged?: boolean; focusedWindowChanged?: boolean };
  log: string[];
}> {
  const log: string[] = [];

  // Step A: get native UI tree
  const beforeCtx = await detectRuntimeMode();
  const xmlA = await getNativeUiTree();
  log.push("Fetched native UI tree (A)");
  if (beforeCtx.mode === "pwa" || isPwaOpened(xmlA, beforeCtx)) {
    return { ok: true, action: "click_open_as_app", method: "already-open", beforeContext: beforeCtx, afterContext: beforeCtx, verification: { uiChanged: false, pwaOpened: true }, log };
  }

  // Step B: search for direct candidates
  const nodesA = findNativeNodes(xmlA);
  const rankedA = await rankNativeCandidates("open_as_app", nodesA, beforeCtx);
  log.push(`Candidates(A): ${rankedA.slice(0, 5).map((r) => r.score).join(", ")}`);
  const bestA = rankedA[0];
  if (bestA && bestA.score >= 30 && bestA.node.bounds) {
    const tap = await tapNativeNode(bestA.node);
    log.push(`Tapped direct candidate at (${tap.cx},${tap.cy})`);
    const changed = await waitForNativeUiChange(xmlA);
    const afterCtx = await detectRuntimeMode();
    const pwa = isPwaOpened(changed.xml, afterCtx);
    return {
      ok: pwa,
      action: "click_open_as_app",
      method: "direct-node-tap",
      beforeContext: beforeCtx,
      afterContext: afterCtx,
      node: bestA.node,
      verification: { uiChanged: changed.changed, pwaOpened: pwa, topActivityChanged: beforeCtx.topActivity !== afterCtx.topActivity, focusedWindowChanged: beforeCtx.focusedWindow !== afterCtx.focusedWindow },
      log,
    };
  }

  // Step E: open browser menu
  const menuRes = await openBrowserMenu();
  log.push(`Menu: ${menuRes.method} (${menuRes.note})`);
  const xmlE = (await waitForNativeUiChange(xmlA)).xml;

  // Step F/G: search again for install/open actions
  const nodesE = findNativeNodes(xmlE);
  const midCtx = await detectRuntimeMode();
  const rankedE = await rankNativeCandidates("open_as_app", nodesE, midCtx);
  log.push(`Candidates(E): ${rankedE.slice(0, 5).map((r) => r.score).join(", ")}`);
  const bestE = rankedE[0];
  if (bestE && bestE.node.bounds) {
    const tap = await tapNativeNode(bestE.node);
    log.push(`Tapped menu candidate at (${tap.cx},${tap.cy})`);
    const changed = await waitForNativeUiChange(xmlE);
    const afterCtx = await detectRuntimeMode();
    const pwa = isPwaOpened(changed.xml, afterCtx);
    return {
      ok: pwa,
      action: "click_open_as_app",
      method: "menu-node-tap",
      beforeContext: beforeCtx,
      afterContext: afterCtx,
      node: bestE.node,
      verification: { uiChanged: changed.changed, pwaOpened: pwa, topActivityChanged: beforeCtx.topActivity !== afterCtx.topActivity, focusedWindowChanged: beforeCtx.focusedWindow !== afterCtx.focusedWindow },
      log,
    };
  }

  // Step I: focus navigation fallback
  log.push("Fallback: focus navigation");
  let xmlPrev = xmlE;
  for (let i = 0; i < 8; i++) {
    await focusNext();
    const changed = await waitForNativeUiChange(xmlPrev, 800, 200);
    xmlPrev = changed.xml;
    const nodesF = findNativeNodes(xmlPrev);
    const ctxF = await detectRuntimeMode();
    const rankedF = await rankNativeCandidates("open_as_app", nodesF, ctxF);
    const candidate = rankedF[0];
    if (candidate && candidate.node.focused && candidate.node.bounds) {
      await activateFocused();
      const finalChanged = await waitForNativeUiChange(xmlPrev);
      const afterCtx = await detectRuntimeMode();
      const pwa = isPwaOpened(finalChanged.xml, afterCtx);
      return {
        ok: pwa,
        action: "click_open_as_app",
        method: "focus-activate",
        beforeContext: beforeCtx,
        afterContext: afterCtx,
        node: candidate.node,
        verification: { uiChanged: finalChanged.changed, pwaOpened: pwa, topActivityChanged: beforeCtx.topActivity !== afterCtx.topActivity, focusedWindowChanged: beforeCtx.focusedWindow !== afterCtx.focusedWindow },
        log,
      };
    }
  }

  return {
    ok: false,
    action: "click_open_as_app",
    method: "failed",
    beforeContext: beforeCtx,
    afterContext: await detectRuntimeMode(),
    verification: { uiChanged: false, pwaOpened: false, topActivityChanged: false, focusedWindowChanged: false },
    log,
  };
}

export async function ensurePwaOpened(): Promise<{
  ok: boolean;
  action: string;
  method: string;
  verification: { uiChanged?: boolean; pwaOpened: boolean; topActivityChanged?: boolean; focusedWindowChanged?: boolean };
  log: string[];
}> {
  const log: string[] = [];
  const startCtx = await detectRuntimeMode();
  const xml0 = await getNativeUiTree();
  const already = isPwaOpened(xml0, startCtx);
  if (already) {
    return {
      ok: true,
      action: "ensure_pwa_opened",
      method: "already-open",
      verification: { pwaOpened: true },
      log,
    };
  }
  const res = await clickOpenAsApp();
  // Wait for clear PWA open state
  const wait = await waitForPwaOpen(4000, 400);
  const verify = { ...res.verification, pwaOpened: res.verification.pwaOpened || wait.opened };
  return { ok: verify.pwaOpened, action: "ensure_pwa_opened", method: res.method, verification: verify, log: [...res.log, `wait_for_pwa_open:${wait.opened}`] };
}

export async function waitForPwaOpen(timeoutMs = 5000, pollMs = 300): Promise<{ opened: boolean; ctx?: NativeContextInfo }> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const ctx = await detectRuntimeMode();
    if (ctx.mode === "pwa") return { opened: true, ctx };
    await new Promise((r) => setTimeout(r, pollMs));
  }
  const ctx = await detectRuntimeMode();
  return { opened: ctx.mode === "pwa", ctx };
}

// ---------------------------------------------------------------------------
// PWA target caching (opportunistic)
// ---------------------------------------------------------------------------
let cachedPwaPackage: string | undefined;
let cachedPwaActivity: string | undefined;

export function cachePwaTarget(ctx: NativeContextInfo) {
  const pkg = ctx.package;
  if (pkg && pkg.includes("webapp")) {
    cachedPwaPackage = pkg;
    // activity not reliably available; keep placeholder
  }
}

export function loadCachedPwaTarget(): { package?: string; activity?: string } {
  return { package: cachedPwaPackage, activity: cachedPwaActivity };
}

export async function tryLaunchCachedPwa(): Promise<{ ok: boolean; output?: string }> {
  if (!cachedPwaPackage) return { ok: false };
  const out = await adb.shell(`monkey -p ${cachedPwaPackage} -c android.intent.category.LAUNCHER 1`);
  // Verify
  const ctx = await detectRuntimeMode();
  return { ok: ctx.mode === "pwa", output: out };
}

// ---------------------------------------------------------------------------
// Mode-aware router stubs
// ---------------------------------------------------------------------------
export async function ensureRuntimeReady(): Promise<{ mode: NativeContextInfo["mode"]; next: string[] }> {
  const ctx = await detectRuntimeMode();
  if (ctx.mode === "pwa") return { mode: ctx.mode, next: ["use WebSpatial tools"] };
  return { mode: ctx.mode, next: ["ensure_pwa_opened"] };
}

export async function routeActionByMode<T>(action: string, args?: T): Promise<{ mode: NativeContextInfo["mode"]; routed: string }> {
  const ctx = await detectRuntimeMode();
  return { mode: ctx.mode, routed: ctx.mode === "pwa" ? `webspatial:${action}` : `native:${action}` };
}
