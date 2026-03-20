# WebSpatial ADB MCP Server

MCP server that drives the PICO OS 6 (Swan) emulator/device via `adb` to debug and test WebSpatial sites. It exposes tools for screenshots, UI inspection, input (tap/scroll/type), port forwarding, and app lifecycle — callable from MCP‑capable editors/agents like Cursor and Claude.

**MCP in one line:** a local server process that exposes “tools” over JSON‑RPC; your editor/agent calls those tools to operate the emulator.

**Minimal tree (kept files)**

```
package.json
tsconfig.json
src/
  index.ts
  http-server.ts
  tools/
    input.ts
    inspection.ts
    webspatial.ts
  utils/
    adb.ts
    webspatial.ts
  resources/
    index.ts
.cursor/
  mcp.json           # optional (Cursor integration)
```

## Prerequisites
- Node.js ≥ 18
- `adb` in PATH (or set `ADB_PATH`)
- PICO OS 6 emulator running (or device) and visible in `adb devices`

## Install & Build
- `npm install`
- `npm run build`

## Run
- Stdio MCP (for Cursor/Claude): `node build/index.js`
- HTTP+SSE (browser clients): `node build/http-server.js` → SSE at `http://localhost:3100/sse`

Environment variables:
- `ANDROID_DEVICE_SERIAL` — target device serial (auto‑selects if omitted)
- `ADB_PATH` — path to `adb`
- `PORT` — HTTP port for `http-server`

## Cursor Integration
Place this in `.cursor/mcp.json` (already included here if you keep the file):

```json
{
  "mcpServers": {
    "webspatial-adb": {
      "command": "node",
      "args": ["./build/index.js"],
      "env": { "ANDROID_DEVICE_SERIAL": "emulator-5554" }
    }
  }
}
```

Open the project in Cursor; the MCP panel will show `webspatial-adb` with tools and prompts.

## Claude Desktop Integration
Add an MCP server pointing to `node /absolute/path/to/build/index.js` and optional env (`ADB_PATH`, `ANDROID_DEVICE_SERIAL`).

## coco Integration
You can use this server directly from the `coco` CLI (TraeCli). Register the local stdio MCP server and then prompt the agent:

1) Register the server (use a unique name to avoid conflicts with built‑ins):

```
coco mcp add-json webspatial-adb-local '{
  "type": "stdio",
  "command": "node",
  "args": ["/Users/bytedance/src/webspatial-mcp/build/index.js"],
  "env": { "ANDROID_DEVICE_SERIAL": "emulator-5554" }
}'
```

- If you see a conflict with a builtin `webspatial-adb`, pick another name (e.g., `webspatial-adb-local`).
- Restart the CLI if prompted so coco loads the new MCP server.

2) Use it in a session (examples):

```
coco "Use webspatial-adb-local tools to list devices, reverse-forward dev ports, open https://webspatial-hackathon.vercel.app, then take a screenshot"

# Or with fewer confirmations
coco -y "List ADB devices, run setup_dev_ports, launch the browser to my URL, then screenshot"
```

3) Helpful commands:

```
coco -h
coco mcp --help
coco mcp add-json --help
```

## Quick Start (Emulator)
- `list_devices` → confirm the emulator is targeted.
- `setup_dev_ports` → reverse‑forward dev ports (defaults: 5173, 35729) so the device can reach your host Vite server.
- `launch_app` with `url="https://your-app"` or `navigate_to` after launch.
- `screenshot` → verify frame; `get_ui_tree(clickable_only=true)` → element centers for tapping.
- Interact with `tap` / `type_text` / `swipe`; check `webspatial_logs` if issues occur.

## Tool Overview
- Input: `tap`, `double_tap`, `long_press`, `swipe`, `type_text`, `keyevent`, `scroll`, `drag_and_drop`, `hover`, `motion_event`, `key_combination`.
- Inspect: `screenshot`, `get_ui_tree`, `device_info`, `list_devices`, `logcat`, `webspatial_logs`, `adb_shell`.
- WebSpatial: `setup_dev_ports`, `launch_app`, `stop_app`, `clear_app_data`, `install_apk`, `check_installed`, `inspect_spatial_scene`, `get_current_url`, `navigate_to`, `eval_js`, `port_forward`.

## Navigation with adb am start
- Open a URL in the PICO browser:
- `adb shell am start -a android.intent.action.VIEW -d "<URL>" com.picoxr.browser`
- Open a URL via the WebApp template Activity explicitly:
- `adb shell am start -a android.intent.action.VIEW -d "<URL>" -n com.picoxr.webapp.template/com.picoxr.spacewebappp.platform.WebAppActivity`
- In MCP, you can also use `launch_app` with `url` or `navigate_to` to achieve the same navigation.

## Native browser automation (pre‑WebSpatial)
- Deterministic flow for native chrome actions (e.g., “Open as app”):
- 1) Parse `get_native_ui_tree` → `find_native_nodes` → `rank_native_candidates`
- 2) Try direct node tap; verify with `wait_for_native_ui_change`
- 3) If not found, `open_browser_menu` then re‑rank and tap
- 4) Fallback: focus navigation (`focus_next`/`activate_focused`)
- 5) Last resort: explicit coordinate tap for debug only
- High‑level: `ensure_pwa_opened` detects if app mode is already open; otherwise runs the strategy and returns structured verification.

### Examples
- `ensure_pwa_opened` → then continue with `navigate_to` and page-level automation
- `click_open_as_app` → explicit action with logs and verification
 - Inspect native context: `detect_runtime_mode`, `get_native_context`

Example flow (pseudo CLI invoking MCP tools):
- `launch_app package_name="com.picoxr.browser" url="https://webspatial-hackathon.vercel.app/"`
- `ensure_pwa_opened`
- `get_current_url` (should now reflect the PWA window)
- Continue with WebSpatial tools: `inspect_spatial_scene`, `eval_js`, `navigate_to`

## Troubleshooting
- No device: start the emulator; `adb devices` should list it. The server auto‑selects if only one device is present.
- SSL/privacy interstitial: some PICO builds use stricter/out‑of‑date trust stores. Use `get_ui_tree(clickable_only=true)` to locate “Advanced/Proceed” UI and `tap` through, or update system time/certs. For local dev, you can test over LAN `http://` while debugging.
- Connectivity: re‑toggle Wi‑Fi (`adb shell svc wifi disable/enable`), check `http_proxy` and DNS via `adb shell settings get global http_proxy` / `getprop net.dns1`. Ensure `setup_dev_ports` ran.

## Development
- `npm run dev` — TypeScript watch
- `npm run build` — compile to `build/`
- `npm run inspector` — open MCP Inspector on the server

### Browser → PWA transition model
- Native/browser phase: operates Android UI/chrome (address bar, overflow menu, install prompts) using UI tree + key events.
- PWA/app phase: once the standalone window opens, control switches to WebSpatial/page tools; native chrome logic is paused.
- Context detection: `detect_runtime_mode` classifies `browser | browser_menu | pwa | unknown` using dumpsys + UI tree heuristics.
- Transition orchestration: `ensure_pwa_opened` calls `click_open_as_app`, waits and verifies the mode/activity/window change.
This repo is trimmed to essential source only; build artifacts and ad‑hoc files are excluded for clarity.
