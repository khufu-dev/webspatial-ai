---
name: webspatial-creator
description: Use this when you need to create or refactor a WebSpatial app end-to-end with a Window-Scene-first mindset. By default, produce and deploy ONLY the WebSpatial build (XR_ENV=avp) for Web App Shell usage (no regular-mode site unless explicitly requested). Covers the real constraints (Start Scene is Window-only today), building transparent/see-through window experiences (materials + transparent backgrounds), initScene+window.open for multi-scene (Window + Volume when explicitly requested), placing 3D content via WebSpatial 3D container elements (Model), and the most common failure modes (wrong build deployed, volume units, scene-name reuse).
---

# WebSpatial Creator (Skill)

This skill is a practical, end-to-end playbook for building **real WebSpatial experiences**.

## Default policy (critical)

Because WebSpatial currently cannot force the Start Scene to be a Volume Scene, the default strategy must be **Window Scene first**:

- Default to **Window Scene** (2.5D / spatialized UI on a window plane).
- Only create a **Volume Scene** when the user explicitly asks for it.

In Window Scene mode, prefer a **transparent / see-through look**:

- Use `html.is-spatial` scope.
- Make the page background transparent.
- Use material backgrounds (e.g. glass) for cards and UI blocks.

> Build/deploy policy: by default, only build/deploy the WebSpatial site (`XR_ENV=avp`). Do not deploy Regular Web mode unless explicitly requested.

## Core outcome

Given a target web project, COCO should be able to:

- wire WebSpatial correctly in React + build tool (Vite example included)
- produce a **transparent Window Scene** experience with spatialized UI
- create a **Window + Volume dual-scene experience** when asked
- render 3D content using WebSpatial’s **3D container elements** (e.g. `Model`) when a Volume Scene is requested
- avoid the known traps that make apps fall back to Regular Web mode

## How to apply this skill

1. **Decide the scene plan (based on the user request)**
   - Default: **Window Scene only** (transparent window + spatialized UI)
   - If user asks for Volume / 3D volume: **two scenes** (Window UI + Volume model)

2. **Wire the toolchain (XR-only by default)**
   - Install SDK deps and the build-tool plugin.
   - Configure `jsxImportSource`.
   - Inject `XR_ENV` into HTML and scope spatial CSS with `html.is-spatial`.

3. **Use WebSpatial primitives**
   - Window UI: `enable-xr`, `--xr-background-material`, `--xr-back`.
   - Multi-scene (when requested): `initScene(name, updater, { type })` + `window.open(url, name)`.
   - 3D content (Volume only): `Model` / static 3D containers (NOT an embedded WebGL viewer).

4. **Validate in the right environment**
   - Confirm you are serving the **XR build** output.
   - Open via Web App Shell, then verify spatial CSS/materials and (if requested) the Volume Scene.

## References (load on demand)

- `reference.md`
- `core-concepts.md`
- `development-setup.md`
- `api-cheatsheet.md`
- `interaction-and-ux.md`
- `pwa-and-packaging.md`
- `troubleshooting.md`
- `examples.md`
