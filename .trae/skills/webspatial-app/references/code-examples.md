# WebSpatial Code Examples

Curated examples from the [WebSpatial SDK test server](https://github.com/webspatial/webspatial-sdk/tree/main/apps/test-server/src). Use these as reference patterns when building WebSpatial app content.

## Table of Contents

1. Background Materials
2. Spatialized Elements with enable-xr
3. 3D Models with <Model>
4. Multi-Scene Management
5. Spatial Gestures
6. Basic Transforms

---

## 1. Background Materials

Demonstrates cycling through material types and applying them to both the scene and individual spatialized elements.

Source: `pages/backgroundmaterial/index.tsx`

```tsx
import { useState } from "react";
import type { BackgroundMaterialType } from "@webspatial/core-sdk";

function App() {
  const materialVals: BackgroundMaterialType[] = [
    "none", "transparent", "thin", "translucent", "regular", "thick",
  ];
  const [materialIndex, setMaterialIndex] = useState(0);

  // Change the whole scene's background material
  const toggleBackgroundMaterial = () => {
    const newIndex = (materialIndex + 1) % materialVals.length;
    document.documentElement.style.setProperty(
      "--xr-background-material",
      materialVals[newIndex],
    );
    setMaterialIndex(newIndex);
  };

  const [color, setColor] = useState("red");

  return (
    <div>
      <button onClick={toggleBackgroundMaterial}>
        Change scene material: {materialVals[materialIndex]}
      </button>

      {/* Individual spatialized element with its own material */}
      <div
        enable-xr
        onClick={() => setColor(v => (v === "green" ? "red" : "green"))}
        style={{
          "--xr-back": 120,
          backgroundColor: color,
          width: "200px",
          height: "200px",
          "--xr-background-material": "thick",
        }}
      >
        Spatialized element with thick material
      </div>
    </div>
  );
}
```

Key patterns:
- Set scene-level material via `document.documentElement.style.setProperty("--xr-background-material", value)`
- Set element-level material via inline style `"--xr-background-material": "thick"`
- Combine `enable-xr` with `--xr-back` for elevation and `--xr-background-material` for glass effect

---

## 2. Spatialized Elements with enable-xr

Three ways to mark an element as spatialized.

Source: `pages/spatialStyleTest/SpatialTagComponent.tsx`

```tsx
// Method 1: JSX attribute (recommended)
<div enable-xr style={{ "--xr-back": 60, color: "blue" }}>
  Spatialized with enable-xr attribute
</div>

// Method 2: Inline style property
<div style={{ "--xr-back": 60, enableXr: true, color: "blue" }}>
  Spatialized with inline style
</div>

// Method 3: CSS class name
<div style={{ "--xr-back": 60 }} className="__enableXr__">
  Spatialized with className
</div>
```

Nested spatialized elements:

Source: `pages/spatialStyleTest/SimpleSpatialComponent.tsx`

```tsx
<div enable-xr style={{ width: "200px", color: "blue" }}>
  Outer spatialized element
  <div enable-xr style={{ transformOrigin: "left top", color: "red" }}>
    Inner spatialized element (nested)
  </div>
</div>
```

---

## 3. 3D Models with <Model>

The `<Model>` component renders USDZ and GLB models inline in the spatial app. It supports spatial gestures (tap, drag, rotate, magnify), CSS transforms, and entity transforms.

Source: `pages/model-test/index.tsx`

### Basic model usage

```tsx
import { Model, ModelRef } from "@webspatial/react-sdk";
import { useRef } from "react";

function ModelExample() {
  const modelRef = useRef<ModelRef>(null);

  return (
    <Model
      enable-xr
      ref={modelRef}
      src="/modelasset/cone.usdz"
      style={{
        width: "300px",
        height: "300px",
        "--xr-back": "140px",
        "--xr-depth": "100px",
        display: "block",
      }}
      onLoad={e => console.log("Model loaded:", e)}
      onError={e => console.error("Model error:", e)}
    >
      {/* Fallback content for non-spatial platforms */}
      <img src="/modelasset/cone.png" alt="Cone" style={{ width: "100%", height: "300px", objectFit: "contain" }} />
    </Model>
  );
}
```

### Model with spatial gestures

```tsx
import { Model, ModelRef, toSceneSpatial } from "@webspatial/react-sdk";

<Model
  enable-xr
  ref={modelRef}
  src="/modelasset/cone.usdz"
  style={{ width: "300px", height: "300px", "--xr-back": "140px" }}
  onSpatialTap={e => {
    console.log("Tapped at:", e.detail.location3D);
    console.log("Bounding cube:", e.currentTarget.getBoundingClientCube());
  }}
  onSpatialDragStart={e => {
    dragTranslationRef.current = { x: 0, y: 0, z: 0 };
  }}
  onSpatialDrag={e => {
    const delta = {
      x: e.detail.translation3D.x - dragTranslationRef.current.x,
      y: e.detail.translation3D.y - dragTranslationRef.current.y,
      z: e.detail.translation3D.z - dragTranslationRef.current.z,
    };
    if (modelRef.current) {
      modelRef.current.entityTransform = DOMMatrix.fromMatrix(
        modelRef.current.entityTransform,
      ).translate(delta.x, delta.y, delta.z);
    }
    dragTranslationRef.current = e.detail.translation3D;
  }}
  onSpatialDragEnd={e => {
    if (modelRef.current) {
      modelRef.current.entityTransform = new DOMMatrix();
    }
  }}
/>
```

### Entity transform (programmatic 3D positioning)

```tsx
// Translate, rotate, scale the model entity directly
function entityTransform(ref, cb) {
  if (!ref.current) return;
  ref.current.entityTransform = cb(
    DOMMatrix.fromMatrix(ref.current.entityTransform)
  );
}

// Usage:
entityTransform(modelRef, e => e.translate(10, 0, 0));
entityTransform(modelRef, e => e.rotate(0, 45, 0));
entityTransform(modelRef, e => e.scale(1.5, 1.5, 1.5));

// Reset:
entityTransform(modelRef, e => e.setMatrixValue("translate3d(0, 0, 0)"));
```

---

## 4. Multi-Scene Management

Open new spatial windows/scenes from your app using `window.open()` and `initScene()`.

Source: `pages/scene/index.tsx`

### Open a new scene with default size

```tsx
import { initScene } from "@webspatial/react-sdk";

// Configure the scene before opening
initScene("myScene", () => ({
  defaultSize: { width: 900, height: 900 },
}));

// Open in a named window
window.open("/second-page", "myScene");
```

### Open a resizable scene

```tsx
initScene("resizable", () => ({
  defaultSize: { width: 900, height: 900 },
  resizability: {
    minWidth: 700,
    minHeight: 700,
    maxWidth: 900,
    maxHeight: 900,
  },
}));
window.open("/second-page", "resizable");
```

### Open a volume (3D container)

```tsx
initScene("volume", () => ({
  defaultSize: { width: 1, height: 1, depth: 0.1 },
}), { type: "volume" });
window.open("/3d-content", "volume");
```

### Close scenes

```tsx
// Close the current scene
window.close();

// Close a scene opened via window.open
const win = window.open("/page", "sceneName");
// Later:
win?.close();

// Close the parent (opener) scene
window.opener?.close();
```

---

## 5. Basic Transform

Spatialized elements support standard CSS 3D transforms that become real spatial transforms.

Source: `pages/basic-transform/index.tsx`

```tsx
<div
  enable-xr
  style={{
    width: "300px",
    height: "300px",
    backgroundColor: "green",
  }}
  className="rounded-lg shadow-xl"
/>
```

CSS transform with 3D rotation and translation:

```tsx
style={{
  transform: "translateX(20px) rotateZ(20deg)",
  "--xr-back": 120,
}}
```

Full 3D transform string:

```tsx
const transform = [
  `translate3d(${x}px, ${y}px, ${z}px)`,
  `scale3d(${sx}, ${sy}, ${sz})`,
  `rotateX(${rx}deg)`,
  `rotateY(${ry}deg)`,
  `rotateZ(${rz}deg)`,
].join(" ");

<Model enable-xr src="/model.usdz" style={{ transform }} />
```

---

## Quick Reference: CSS Custom Properties

| Property | Values | Description |
|---|---|---|
| `--xr-background-material` | `none`, `transparent`, `translucent`, `thin`, `regular`, `thick`, `ultraThick` | Glass material behind element |
| `--xr-back` | number (px or unitless points) | Z-axis elevation from page plane |
| `--xr-depth` | length (e.g. `150px`) | Depth of 3D model container |

## Quick Reference: Key Imports

```tsx
// Core SDK
import { Spatial } from "@webspatial/core-sdk";

// React SDK — components and hooks
import { Model, ModelRef, initScene, toSceneSpatial, enableDebugTool } from "@webspatial/react-sdk";

// Types
import type { BackgroundMaterialType } from "@webspatial/core-sdk";
import type {
  ModelSpatialTapEvent,
  ModelSpatialDragEvent,
  ModelSpatialDragStartEvent,
  ModelSpatialDragEndEvent,
  ModelSpatialRotateEvent,
  ModelSpatialMagnifyEvent,
  ModelLoadEvent,
} from "@webspatial/react-sdk";
```
