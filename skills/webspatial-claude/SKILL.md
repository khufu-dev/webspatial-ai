---
name: webspatial-app
description: Scaffold and run a WebSpatial spatial computing application (React + Vite + TypeScript + WebSpatial SDK) that targets Apple Vision Pro via the visionOS simulator, and PICO OS 6 devices. Use this skill whenever the user wants to create a WebSpatial app, build a spatial web app, make a visionOS web app, create a spatial computing project, or mentions "WebSpatial" in the context of creating or scaffolding a project. Also trigger when the user asks to build an app for Apple Vision Pro or PICO using web technologies, or wants to convert a web project idea into a spatial experience. Even if the user just says "create a spatial app" or "build something for Vision Pro with React", this skill applies.
---

# WebSpatial App Scaffolder

Scaffold a complete, ready-to-run WebSpatial application from scratch. The output is a React + Vite + TypeScript project with the WebSpatial SDK fully configured, targeting visionOS (Apple Vision Pro simulator or device) and PICO OS 6.

## What is WebSpatial?

WebSpatial extends standard 2D web apps with spatial computing features — translucent material backgrounds, Z-axis elevation, multi-scene windowing, and inline 3D models — then packages them as native visionOS apps via `webspatial-builder`. The local dev workflow is:

1. Run a Vite dev server
2. Run `webspatial-builder run --base=<dev-server-url>` to package and launch in the visionOS simulator

The developer writes standard React + CSS. Spatial features are added through CSS custom properties (`--xr-background-material`, `--xr-back`, `--xr-depth`) and the `enable-xr` JSX attribute.

## Key resources

Consult these references when scaffolding, troubleshooting, or answering questions about WebSpatial:

- **WebSpatial SDK repo**: https://github.com/webspatial/webspatial-sdk
- **Web Builder Plugins repo**: https://github.com/webspatial/web-builder-plugins
- **Docs home**: https://webspatial.dev/docs
- **Quick Example walkthrough**: https://webspatial.dev/docs/quick-example
- **WebSpatial on PICO OS 6**: https://developer.picoxr.com/document/?platform=web
- **Code examples**: https://github.com/webspatial/webspatial-sdk/tree/main/apps/test-server/src — see `references/code-examples.md` in this skill for curated excerpts
- **Sample apps** (for inspiration and reference):
  - https://spatial-wander-ws.vercel.app/
  - https://v0-pwa-hello-world.vercel.app/

## Workflow

### Step 1: Gather inputs from the user

Before scaffolding, collect:

1. **Project name** — used for the directory name, `package.json` name field (kebab-cased), manifest display name, and HTML `<title>`. Ask the user what their app should be called.
2. **App icon** — the default WebSpatial starter icons are bundled with this skill and will be copied into the project automatically in Step 3. Ask the user if they'd like to upload their own icon instead.

### Step 2: Scaffold the project

Read `references/template-files.md` for the exact file contents to generate.

Create the project directory at `/home/claude/<project-name>/` with this structure:

```
<project-name>/
├── index.html
├── index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json
├── public/
│   ├── manifest.webmanifest
│   ├── icon-48.png
│   ├── icon-180-maskable.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-1024-maskable.png
│   ├── img/           (for fallback images for 3D models)
│   └── usdz/          (for 3D models)
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── MainPage.tsx
    ├── MainPage.css
    └── vite-env.d.ts
```

When writing each file, substitute these placeholders from the template:

| Placeholder | Value |
|---|---|
| `PROJECT_NAME` | kebab-case project name (e.g. `my-spatial-app`) |
| `DISPLAY_NAME` | display name as provided by user (e.g. `My Spatial App`) |
| `SHORT_NAME` | short version, max ~12 chars |

Keep `MainPage.css` exactly as defined in the template for the default scaffold. When adding spatial-specific styles, scope them under `html.isSpatial` within each page's own CSS file (e.g. `MainPage.css`). The global `index.css` only contains the base spatial defaults (background material, color).

### Step 3: Copy icons into the project

Copy the default icons bundled with this skill into the project's `public/` directory:

```bash
cp assets/icons/icon-48.png "<project-dir>/public/"
cp assets/icons/icon-180-maskable.png "<project-dir>/public/"
cp assets/icons/icon-192.png "<project-dir>/public/"
cp assets/icons/icon-512.png "<project-dir>/public/"
cp assets/icons/icon-1024-maskable.png "<project-dir>/public/"
```

Where `assets/icons/` is relative to this skill's directory (i.e. the same folder that contains this `SKILL.md`).

**If the user uploaded their own icon image**, copy that file into the project's `public/` directory as each required icon filename instead:

```bash
for name in icon-48.png icon-180-maskable.png icon-192.png icon-512.png icon-1024-maskable.png; do
  cp /mnt/user-data/uploads/<filename> "<project-dir>/public/$name"
done
```

### Step 4: Download 3D models (if requested)

If the user asks for 3D content in their app, download models from these sources:

**USDZ models (preferred for visionOS — used with the `<Model>` component):**
- Apple AR Quick Look Gallery: https://developer.apple.com/augmented-reality/quick-look/
  - Direct download pattern: `https://developer.apple.com/augmented-reality/quick-look/models/<modelname>/<filename>.usdz`
  - Known models: toy_drummer, toy_biplane, toy_robot_vintage, toy_car, cupandsaucer, teapot, gramophone, fender_stratocaster, wheelbarrow, tulip, pancakes, etc.

**glTF/GLB models (also used with the `<Model>` component):**
- Khronos glTF Sample Assets: https://github.com/KhronosGroup/glTF-Sample-Assets
  - Direct GLB download: `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/<ModelName>/glTF-Binary/<ModelName>.glb`
  - Popular models: Duck, Avocado, DamagedHelmet, FlightHelmet, Lantern, WaterBottle, BoomBox, etc.
- Khronos glTF Sample Models (archived, still accessible): https://github.com/KhronosGroup/glTF-Sample-Models/tree/main/2.0

Download the model with `curl` into `public/usdz/` for USDZ or `public/models/` for GLB:

```bash
curl -L -o public/usdz/toy_drummer.usdz \
  "https://developer.apple.com/augmented-reality/quick-look/models/drummertoy/toy_drummer.usdz"

curl -L -o public/models/Avocado.glb \
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Avocado/glTF-Binary/Avocado.glb"
```

Then wire the model into the component using the `<Model>` component (works with both USDZ and GLB):

```tsx
import { Model } from "@webspatial/react-sdk";

<Model enable-xr src="/usdz/toy_drummer.usdz" className="model">
  <img src="/img/toy_drummer.png" alt="Toy Drummer" />
</Model>
```

### Step 5: Build and launch in visionOS simulator

After scaffolding is complete, install dependencies and launch the app in the visionOS simulator:

```bash
cd <project-dir>
npm install
npm run avp
```

The `avp` script builds the project and runs `webspatial-builder run` which automatically opens the visionOS simulator and installs the app.

Note: this step requires Xcode 26+ with the visionOS 26+ simulator installed on the user's machine. If running in a container or CI environment where Xcode isn't available, skip this step and instruct the user to run it locally.

### Step 6: Present the output

Copy the entire project directory to `/mnt/user-data/outputs/<project-name>/`.

Tell the user:

1. What was created and where
2. Prerequisites: Node.js, Xcode 26+ with visionOS 26+ simulator installed
3. How to run:
   ```
   cd <project-name>
   npm install
   npm run avp
   ```
   The `avp` script builds the project and launches it in the visionOS simulator automatically.
   For regular web development (desktop/mobile), use `npm run dev` instead.
4. How to customize: edit `src/MainPage.tsx` for content, add spatial styles in page-specific CSS files scoped under `html.isSpatial`, edit `public/manifest.webmanifest` for window size

## Customizing the app content

If the user describes what their app should do or show, modify `MainPage.tsx` accordingly. Read `references/code-examples.md` for real-world usage patterns from the WebSpatial SDK test server. The full WebSpatial API includes:

- **Spatialization**: add `enable-xr` attribute to any JSX element to make it a spatialized HTML element
- **Material backgrounds**: `--xr-background-material` CSS property (values: `transparent`, `translucent`, `thin`, `regular`, `thick`, `ultraThick`)
- **Elevation**: `--xr-back` CSS property for Z-axis positioning (in points)
- **3D model depth**: `--xr-depth` CSS property on `<Model>` elements
- **3D models (static)**: `<Model>` component from `@webspatial/react-sdk` for inline 3D models (USDZ and GLB formats) — like `<img>` for 3D
- **Dynamic 3D / Reality**: `<Reality>` component for building 3D scenes with primitives (`BoxEntity`, `SphereEntity`, etc.), materials (`UnlitMaterial`), and model instances (`ModelAsset` + `ModelEntity`) — like `<canvas>` but for 3D. Use when the user needs procedural/programmatic 3D content, multiple instances of a model, animated primitives, or interactive 3D scenes
- **Multi-scene**: use `window.open()` with a named target, and `initScene()` from `@webspatial/react-sdk` to configure new scene windows
- **Spatial styles gating**: spatial-specific styles go in each page's own CSS file, scoped under `html.isSpatial` — `index.css` only contains the global spatial defaults (background material, color)

## Dynamic 3D with `<Reality>`

When the user needs more than a static 3D model — e.g. procedural shapes, multiple model instances, animated primitives, or interactive 3D scenes — use the `<Reality>` component instead of `<Model>`. Read `references/code-examples.md` section "6. Dynamic 3D with Reality" for complete patterns.

### When to use `<Reality>` vs `<Model>`

| Need | Use |
|---|---|
| Display a single 3D model file | `<Model>` (static) |
| Build a 3D scene with primitives (boxes, spheres, etc.) | `<Reality>` |
| Instance one model many times (e.g. fleet of ships) | `<Reality>` with `ModelAsset` + `ModelEntity` |
| Animate 3D transforms per-frame | `<Reality>` |
| Combine primitives, models, and interaction | `<Reality>` |

### Key concepts

- **`<Reality>`** — 3D viewport container. Size with CSS like any `div`. Hosts materials, model assets, and a scene graph. Use `--xr-depth` for the container's depth.
- **`<SceneGraph>`** — Root of the 3D scene tree inside `<Reality>`. All entities must be children of this.
- **`<Entity>`** — Empty transform group. Has `position`, `rotation`, `scale`. Groups children; moving the entity moves all descendants.
- **Primitive entities** — `BoxEntity`, `SphereEntity`, `PlaneEntity`, `ConeEntity`, `CylinderEntity`. All sizes in **meters**, rotation in **radians**.
- **`<UnlitMaterial>`** — Material resource declared by `id`. Referenced via `materials={['id']}` on primitives or `ModelEntity`.
- **`<ModelAsset>`** — Loaded 3D model resource (USDZ/GLB). Declared by `id` and `src`. Invisible by itself; referenced by `ModelEntity`.
- **`<ModelEntity>`** — Instance of a `ModelAsset` in the scene. Same asset can be instanced many times.

### Structure inside `<Reality>`

Declare resources (materials, assets) first, then `<SceneGraph>`:

```tsx
import {
  Reality, SceneGraph, Entity,
  BoxEntity, SphereEntity,
  UnlitMaterial, ModelAsset, ModelEntity,
} from '@webspatial/react-sdk';

<Reality style={{ width: '500px', height: '500px', '--xr-depth': 100 }}>
  <UnlitMaterial id="red" color="#ff0000" />
  <ModelAsset id="teapot" src="/usdz/teapot.usdz" />
  <SceneGraph>
    <BoxEntity materials={['red']} width={0.2} height={0.2} depth={0.2} />
    <ModelEntity model="teapot" position={{ x: 0, y: 0.2, z: 0 }} />
  </SceneGraph>
</Reality>
```

### Coordinate system

- **+Y** up, **+X** right, **+Z** toward the viewer (right-handed)
- Sizes/distances in **meters** (`0.1` = 10 cm)
- Rotation in **radians** (`Math.PI/2` = 90°)

### Interaction and animation

Entities support spatial event handlers: `onSpatialTap`, `onSpatialDragStart`, `onSpatialDrag`, `onSpatialDragEnd`, `onSpatialRotate`, `onSpatialMagnify`. Drive animation via `requestAnimationFrame` updating React state.

### Dynamic updates (Phase 2)

- Changing `UnlitMaterial` props (`color`, `opacity`) at runtime updates all entities using that material
- Changing primitive geometry props rebuilds the geometry in place
- Changing `ModelEntity`'s `model` prop recreates the entity with the new asset
- `ModelEntity` accepts `materials` for material override on the model instance

## Important notes

- The project uses `@webspatial/vite-plugin` with `mode: 'avp'` which auto-generates the WebSpatial-specific web output
- The `isSpatial` CSS class is added to `<html>` at runtime inside the WebSpatial App Shell
- `Spatial.prototype.runInSpatialWeb()` in `main.tsx` handles the runtime detection
- Icons must follow PWA conventions (maskable icons need safe-zone padding within center 80%)
- Requires Xcode 26+ with visionOS 26+ simulator support installed
- WebSpatial also supports PICO OS 6 — see https://developer.picoxr.com/document/?platform=web
- For issues, check: https://github.com/webspatial/webspatial-sdk/issues
