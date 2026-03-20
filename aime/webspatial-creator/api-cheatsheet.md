# API Cheat Sheet (Creator Edition)

## Scene creation (multi-scene)

- `initScene(sceneName, updater, options)`
  - Use `options.type = 'volume'` to request a Volume Scene.
  - In the updater, set initial preferences like `defaultSize`.
- Open the scene via:
  - `window.open(url, sceneName)`
  - `<a target="sceneName">`

## 3D content (preferred)

- `Model` from `@webspatial/react-sdk`
  - `src="/path/to/model.glb"`
  - Use CSS to set width/height and centering.

Fallback (regular browsers / non-WebSpatial mode):

- `@google/model-viewer` or a `three.js` canvas

## 2D spatial UI (Window Scene)

- mark: `enable-xr` / `__enableXr__` / `enableXr: true`
- materials: `--xr-background-material`
- depth: `--xr-back` (requires positioning context)

## Interaction regions

Use semantic elements (`button`, `a`, `input`) or add `cursor: pointer` so the OS can provide hover effects in natural interaction.
