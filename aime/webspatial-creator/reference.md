# WebSpatial Creator — Reference

## What went wrong in real projects (postmortem-style lessons)

These are the mistakes that repeatedly cause “it opens but it’s not spatial / nothing renders”:

1) **Treating a WebGL viewer as “WebSpatial 3D”**
- Symptom: the model looks like a flat widget inside a page.
- Root cause: using `model-viewer`/`canvas` instead of WebSpatial 3D container elements.
- Fix: when a real 3D volumetric experience is needed, render models via `Model` from `@webspatial/react-sdk` inside a Volume Scene.

2) **Deploying the wrong build output**
- Symptom: Web App Shell shows **Regular Web mode**.
- Root cause: you deployed `dist/` (regular build) instead of the XR build directory.
- Fix: deploy **only** the XR build output (typical Vite setup: `dist/webspatial/avp/`).

3) **Using px-thinking for Volume Scene sizes**
- Symptom: Volume Scene opens but model is invisible / extremely tiny / feels missing.
- Root cause: `initScene(..., { type: 'volume' })` interprets numeric `defaultSize` as **meters (m)**, not px.
- Fix: use realistic meter sizes like `0.7–1.2` and include `depth`.

4) **Scene name reuse hiding config changes**
- Symptom: you changed `initScene(...)` config but nothing changes.
- Root cause: `window.open(url, 'sameName')` reuses the existing scene; `initScene` does not retroactively change existing scenes.
- Fix: close the old scene, or use a new name (e.g. `toycarVolume_v2`).

5) **Trying to “close the Start Scene”**
- Symptom: you always see two scenes.
- Root cause: Start Scene is native-created and may not be closable by `window.close()`.
- Fix: accept that Start Scene exists; only make it minimal when you explicitly want a launcher.

---

## Scene strategy (what to do by default)

### Key constraint (non-negotiable)

- The app always launches with a native-created **Start Scene**.
- **Current SDK: Start Scene is Window-only** (manifest exposes only `xr_main_scene.default_size`).

So you cannot truly enforce “open as Volume by default”.

### Recommended default: Window Scene (transparent / glass)

Unless the user explicitly asks for a Volume Scene, build a Window Scene experience:

- Make the window background transparent in XR CSS:
  - `html.is-spatial { background-color: transparent; --xr-background-material: transparent; }`
  - `html.is-spatial body, html.is-spatial #root { background: transparent; }`
- Use glass materials for UI blocks:
  - set `--xr-background-material: glass;` on UI card containers.
- Use `--xr-back` to layer content (2.5D).

### When the user explicitly wants a Volume Scene

Use a two-scene approach:

- Start Scene (Window) shows UI/text.
- Start Scene opens a dedicated Volume Scene:
  - `initScene(sceneName, updater, { type: 'volume' })`
  - `window.open(url, sceneName)`

---

## Volume Scene specifics

### Creating a Volume Scene (today)

1) In Start Scene, initialize the scene:
- API: `initScene(sceneName, updater, { type: 'volume' })`
- Important: `defaultSize` numbers are in **meters** for volume.

2) Open it:
- `window.open(url, sceneName)`

3) Route the target page:
- Hash route like `/#volume` is the lowest-friction solution.

### Putting a model in a Volume Scene

- Use `Model` from `@webspatial/react-sdk`.
- Ensure:
  - `enable-xr` is set on the `Model`.
  - the container has a real size (`width`/`height` not 0).
  - `src` resolves correctly (mind deployment base path).

---

## XR-only toolchain checklist (React + Vite)

- Install:
  - `@webspatial/react-sdk`, `@webspatial/core-sdk`
  - peer deps: `three`, `@google/model-viewer`
- TypeScript:
  - `jsxImportSource: "@webspatial/react-sdk"`
- Vite:
  - include `@webspatial/vite-plugin`
  - inject `XR_ENV` into HTML

Build and deploy:

- Build XR: `XR_ENV=avp npm run build`
- Deploy directory: `dist/webspatial/avp/`
