/**
 * WebSpatial-specific ADB helpers for PICO OS 6 / Swan.
 *
 * These wrap adb shell commands tailored to the WebSpatial runtime:
 *  - Chromium DevTools Protocol (CDP) over adb forward
 *  - WebSpatial debug APIs (window.inspectCurrentSpatialScene)
 *  - WebEngine/App Shell lifecycle
 *  - Dev server port forwarding
 */

import * as adb from "./adb.js";

// ---------------------------------------------------------------------------
// Port forwarding for dev server
// ---------------------------------------------------------------------------

/**
 * Set up reverse port forwarding so the device can reach the host's
 * Vite dev server. Default ports match webspatial-sdk conventions.
 */
export async function setupDevPorts(
  devServerPort = 5173,
  livereloadPort = 35729,
): Promise<{ devServerPort: number; livereloadPort: number }> {
  await adb.reverse(devServerPort, devServerPort);
  await adb.reverse(livereloadPort, livereloadPort);
  return { devServerPort, livereloadPort };
}

// ---------------------------------------------------------------------------
// Package / activity management
// ---------------------------------------------------------------------------

const WEBSPATIAL_BROWSER_PKG = "dev.webspatial.browser";

/** Launch a WebSpatial app by package name, or the WebSpatial Browser. */
export async function launchApp(
  packageName?: string,
  url?: string,
): Promise<string> {
  const pkg = packageName ?? WEBSPATIAL_BROWSER_PKG;

  // When a URL is provided, rely on Android's intent resolution.
  // Do NOT force an activity with -n; PICO/Swan routes VIEW intents
  // through com.picoxr.webappservice/.IntentDispatcher.
  // Examples for manual navigation/testing:
  //   adb shell am start -a android.intent.action.VIEW -d "<URL>" com.picoxr.browser
  //   adb shell am start -a android.intent.action.VIEW -d "<URL>" \
  //     -n com.picoxr.webapp.template/com.picoxr.spacewebappp.platform.WebAppActivity
  if (url) {
    // Optional: log which activity would handle the intent for diagnostics
    try {
      await adb.shell(
        `cmd package resolve-activity --brief -a android.intent.action.VIEW -d "${url}"`,
      );
    } catch {
      // Ignore resolve failures and still attempt to start
    }
    return adb.shell(
      `am start -a android.intent.action.VIEW -d "${url}"`,
    );
  }

  // Without a URL, best-effort launch of the requested package (or default).
  // Some WebSpatial shells do not expose a LAUNCHER activity; keep previous
  // behavior but allow callers to specify a concrete package.
  return adb.shell(
    `monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`,
  );
}

/** Force-stop a WebSpatial app. */
export async function stopApp(
  packageName = WEBSPATIAL_BROWSER_PKG,
): Promise<string> {
  return adb.shell(`am force-stop ${packageName}`);
}

/** Clear app data. */
export async function clearAppData(
  packageName = WEBSPATIAL_BROWSER_PKG,
): Promise<string> {
  return adb.shell(`pm clear ${packageName}`);
}

/** Check if a package is installed. */
export async function isInstalled(packageName: string): Promise<boolean> {
  const result = await adb.shell(`pm list packages ${packageName}`);
  return result.includes(packageName);
}

/** Install an APK from the host. */
export async function installApk(hostPath: string): Promise<string> {
  const result = await adb.adb("install", "-r", "-t", hostPath);
  return result.stdout;
}

// ---------------------------------------------------------------------------
// WebSpatial debug / inspection
// ---------------------------------------------------------------------------

/**
 * Execute JavaScript inside the WebSpatial WebView via Chromium's
 * `chrome://inspect` debug channel.
 *
 * This requires DevTools remote debugging to be enabled, which is
 * typically on for debug builds.
 */
export async function evalInWebView(js: string): Promise<string> {
  // On PICO OS 6, the WebEngine exposes an inspectable WebView.
  // We use `input` + `am broadcast` as a lightweight JS eval path.
  // For production use, this should go through CDP (Chrome DevTools Protocol).
  //
  // Fallback: use a broadcast intent that the WebSpatial App Shell listens to.
  return adb.shell(
    `am broadcast -a dev.webspatial.DEBUG_EVAL --es code '${js.replace(/'/g, "'\\''")}'`,
  );
}

/**
 * Call the WebSpatial debug API to inspect the current spatial scene.
 * Equivalent to `window.inspectCurrentSpatialScene()` in the WebView console.
 */
export async function inspectSpatialScene(): Promise<string> {
  return evalInWebView("JSON.stringify(window.inspectCurrentSpatialScene())");
}

/**
 * Get the current URL loaded in the WebSpatial WebView.
 */
export async function getCurrentUrl(): Promise<string> {
  return evalInWebView("window.location.href");
}

/**
 * Navigate to a URL in the WebSpatial WebView.
 */
export async function navigateTo(url: string): Promise<string> {
  return evalInWebView(`window.location.href = '${url}'`);
}

// ---------------------------------------------------------------------------
// Device info helpers
// ---------------------------------------------------------------------------

export interface SwanDeviceInfo {
  model: string;
  brand: string;
  sdkVersion: string;
  osVersion: string;
  displaySize: string;
  density: string;
  serial: string;
}

export async function getDeviceInfo(): Promise<SwanDeviceInfo> {
  const [model, brand, sdkVersion, osVersion, displaySize, density, serial] =
    await Promise.all([
      adb.getprop("ro.product.model"),
      adb.getprop("ro.product.brand"),
      adb.getprop("ro.build.version.sdk"),
      adb.getprop("ro.build.display.id"),
      adb.shell("wm size").then((s) => s.replace("Physical size: ", "").trim()),
      adb
        .shell("wm density")
        .then((s) => s.replace("Physical density: ", "").trim()),
      adb.getprop("ro.serialno"),
    ]);

  return { model, brand, sdkVersion, osVersion, displaySize, density, serial };
}

// ---------------------------------------------------------------------------
// Logcat with WebSpatial filters
// ---------------------------------------------------------------------------

/**
 * Get WebSpatial-relevant logcat entries.
 * Filters for common tags: WebSpatial, chromium, WebEngine, SpatialSDK.
 */
export async function getWebSpatialLogs(lines = 200): Promise<string> {
  const tags = [
    "WebSpatial",
    "chromium",
    "WebEngine",
    "SpatialSDK",
    "AttachmentManager",
    "SpatialSession",
    "JSBridge",
  ];
  const filter = tags.map((t) => `${t}:V`).join(" ");
  return adb.shell(`logcat -d -t ${lines} ${filter} *:S`);
}

// ---------------------------------------------------------------------------
// PWA: "Open as app" / "作为独立应用打开" automation
// ---------------------------------------------------------------------------

/** Try to find and tap the browser address-bar PWA button to open as app. */
export async function openAsApp(buttonTexts: string[] = [
  "Open as app",
  "作为独立应用打开",
]): Promise<{ tapped: boolean; x?: number; y?: number; screenshot: string; note: string }> {
  // Attempt up to 3 times in case UI takes a moment to render
  for (let attempt = 0; attempt < 3; attempt++) {
    const xml = await adb.dumpUi();
    const nodeRegex = /<node[^>]*clickable="true"[^>]*>/g;
    const boundsRegex = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/;
    const textRegex = /text="([^"]*)"/;
    const descRegex = /content-desc="([^"]*)"/;

    let match: RegExpExecArray | null;
    while ((match = nodeRegex.exec(xml)) !== null) {
      const node = match[0];
      const text = textRegex.exec(node)?.[1] ?? "";
      const desc = descRegex.exec(node)?.[1] ?? "";
      const content = `${text} ${desc}`.trim();
      if (content) {
        const hit = buttonTexts.some((t) => content.includes(t));
        if (hit) {
          const b = boundsRegex.exec(node);
          if (!b) continue;
          const [, x1s, y1s, x2s, y2s] = b;
          const x1 = Number(x1s), y1 = Number(y1s), x2 = Number(x2s), y2 = Number(y2s);
          const cx = Math.round((x1 + x2) / 2);
          const cy = Math.round((y1 + y2) / 2);
          await adb.input("tap", cx, cy);
          const screenshot = await adb.screenshot();
          return { tapped: true, x: cx, y: cy, screenshot, note: `Tapped button: ${content}` };
        }
      }
    }
    // Small delay before next attempt
    await new Promise((r) => setTimeout(r, 500));
  }
  const screenshot = await adb.screenshot();
  return { tapped: false, screenshot, note: "Button not found (searched text/content-desc)." };
}
