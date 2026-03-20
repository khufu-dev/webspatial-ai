# Core Concepts (Creator Edition)

## WebSpatial App

A WebSpatial App is a multitasking spatial app that runs in the OS Shared Space. It inherits mainstream Web APIs and adds a minimal set of **WebSpatial APIs** so the OS can understand and render mixed 2D+3D UI uniformly.

## Scenes

A spatial app is composed of OS-managed **Scenes**.

### Window Scene

- A 2D plane with depth extending forward.
- Can be translucent or fully transparent.
- Suitable for most UI surfaces.

### Volume Scene

- A bounded local 3D space (a 3D bounding box / volumetric window).
- Managed differently by the OS (drag behaviors, spatial layout rules).
- Suitable when your content is more object-like and needs true volumetric presence.

### Scenes in a WebSpatial app

Each scene loads and runs a URL (like a web runtime), but without full browser UI. Think “PWA window”, with WebSpatial-specific native scene controls.

### Start Scene

- The first scene created when the app launches.
- Created by native code before web code runs.
- Configured via Web App Manifest.
- Current SDK limitation: Start Scene is effectively Window-only.

## Spatialized 2D elements vs 3D container elements

### Spatialized 2D elements

Existing HTML elements marked for spatialization retain their normal capabilities, and additionally gain:

- material backgrounds (glass)
- Z-axis elevation (`--xr-back`)

### 3D container elements

3D containers are the WebSpatial-native way to place 3D content into a scene (similar to how `<img>` places raster content).

- Static 3D containers load pre-authored model files.
- Dynamic 3D containers are driven by a 3D engine.

In React SDK, a practical entry point is the `Model` component.
