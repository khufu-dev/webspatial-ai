# Troubleshooting (Creator Edition)

## Web App Shell shows “Regular Web mode”

Most common causes:

- You deployed the **regular build** (e.g. `dist/`) instead of the XR build directory (e.g. `dist/webspatial/avp/`).
- The page you opened is **outside manifest scope**, or the page does not include `<link rel="manifest" ...>`.
- You are opening the URL in a normal browser, not Web App Shell.

Fix checklist:

- Rebuild: `XR_ENV=avp npm run build`.
- Serve/deploy **only** `dist/webspatial/avp/`.
- Confirm `index.html` includes `<link rel="manifest" href="/manifest.webmanifest" />`.

## In Web App Shell I only see an “empty” window

Two very common causes:

1) **You made the window background transparent but provided no visible UI**
- If `html.is-spatial` forces full transparency, and your page only has transparent containers, it can look empty.
- Fix: give UI cards a material background (e.g. glass) and ensure text contrast.

2) **Your Start Scene size is too small**
- If `xr_main_scene.default_size` is set to something tiny (e.g. 1×1), it may look like a blank or un-findable window.
- Fix: for normal Window UI, use a normal default size.

## “Why are there two scenes (Window + Volume)?”

By design when you explicitly want a Volume Scene:

- The app always starts with a Start Scene (Window).
- A Volume Scene must be opened from it.

You cannot fully eliminate the Start Scene today.

## Volume Scene opens but model is not visible

Common causes:

- **Volume defaultSize units are wrong**: numbers are meters (m). `900` means 900 meters.
- The `Model` container has **0×0 size** (no width/height).
- Missing `enable-xr` on the `Model`.
- `src` is not reachable from the deployed base path.

Fix checklist:

- Use a volume size like `0.9 × 0.9 × 0.9` (meters) and include `depth`.
- Ensure CSS gives the `Model` a width/height.
- Ensure `enable-xr` is present.
- Prefer a robust URL strategy for `src` (relative to current page when possible).

## initScene config changes have no effect

Cause:

- You reused the same scene name; `window.open(url, name)` reused an existing scene.

Fix:

- Close the existing scene, or open a new name (e.g. `toycarVolume_v2`).
