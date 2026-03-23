# WebSpatial Starter Template Files

This document contains the exact source files to generate when scaffolding a new WebSpatial project. Replace `PROJECT_NAME` with the kebab-case project name, `DISPLAY_NAME` with the user-facing name, and `SHORT_NAME` with a short version (max ~12 chars).

## package.json

```json
{
  "name": "PROJECT_NAME",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "lint": "tsc --build",
    "build": "npm run lint && vite build",
    "preview": "npm run build && vite preview --host --port 5173",
    "avp": "npm run build && webspatial-builder run --base=http://localhost:5173"
  },
  "dependencies": {
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "@types/three": "latest",
    "@vitejs/plugin-react": "latest",
    "@webspatial/core-sdk": "latest",
    "@webspatial/react-sdk": "latest",
    "react": "latest",
    "react-dom": "latest",
    "react-router": "latest",
    "three": "latest",
    "three-usdz-loader": "latest",
    "typescript": "latest",
    "vite": "latest"
  },
  "devDependencies": {
    "@types/node": "latest",
    "@webspatial/builder": "latest",
    "@webspatial/platform-visionos": "latest",
    "@webspatial/vite-plugin": "latest"
  }
}
```

## vite.config.ts

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webspatial from "@webspatial/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    webspatial({ mode: 'avp', outputDir: "/" }),
  ],
  server: {
    open: true,
    host: true,
  },
});
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "jsxImportSource": "@webspatial/react-sdk",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

## index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="stylesheet" type="text/css" href="./index.css">
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DISPLAY_NAME</title>
    <link
      rel="apple-touch-icon"
      type="image/png"
      href="/icon-180-maskable.png"
      sizes="180x180"
    >
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## index.css

```css
html {
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica,
    Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  color: CanvasText;
  color-scheme: light dark;
}

html.isSpatial {
  color: Canvas;
  --xr-background-material: translucent;
}
```

## vercel.json

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## public/manifest.webmanifest

```json
{
  "name": "DISPLAY_NAME",
  "short_name": "SHORT_NAME",
  "start_url": "/",
  "scope": "/",
  "display": "minimal-ui",
  "icons": [
    {
      "src": "/icon-48.png",
      "sizes": "48x48",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-180-maskable.png",
      "sizes": "180x180",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-1024-maskable.png",
      "sizes": "1024x1024",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "xr_main_scene": {
    "default_size": {
      "width": 1200,
      "height": 800
    }
  }
}
```

## src/main.tsx

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Spatial } from "@webspatial/core-sdk";

if (Spatial.prototype.runInSpatialWeb()) {
  document.documentElement.classList.add("isSpatial");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

## src/App.tsx

```tsx
import { BrowserRouter, Route, Routes } from "react-router";
import MainPage from "./MainPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## src/MainPage.tsx

This is the default starter page. If the user describes specific app content, customize this file to match their requirements while keeping the same import pattern.

Important: only import `Model` from `@webspatial/react-sdk` if a 3D model is actually used. The project has `noUnusedLocals: true` in tsconfig.json, so unused imports will cause build failures.

**Default (no 3D model):**

```tsx
import "./MainPage.css";

export default function MainPage() {
  return (      
    <div className="mainPage">
      <header>
        <h1>Hello DISPLAY_NAME</h1>
      </header>
      <main>
        <p>Edit <code>src/MainPage.tsx</code> to get started.</p>
      </main>
    </div>
  );
}
```

**With a 3D model** (see Step 4 in SKILL.md):

```tsx
import { Model } from "@webspatial/react-sdk";
import "./MainPage.css";

export default function MainPage() {
  return (      
    <div className="mainPage">
      <header>
        <h1>Hello DISPLAY_NAME</h1>
      </header>
      <main>
        <Model enable-xr src="/usdz/MODEL_FILE.usdz" className="model">
          <img src="/img/MODEL_FALLBACK.png" alt="MODEL_NAME" />
        </Model>
      </main>
    </div>
  );
}
```

**With a Reality scene** (dynamic 3D — primitives, model instances, interaction):

```tsx
import {
  Reality, SceneGraph, Entity,
  BoxEntity, SphereEntity,
  UnlitMaterial, ModelAsset, ModelEntity,
} from "@webspatial/react-sdk";
import "./MainPage.css";

export default function MainPage() {
  return (
    <div className="mainPage">
      <header>
        <h1>Hello DISPLAY_NAME</h1>
      </header>
      <main>
        <Reality className="reality" style={{ width: '100%', height: '400px', '--xr-depth': 200 }}>
          <UnlitMaterial id="primary" color="#4a90d9" />
          <UnlitMaterial id="accent" color="#e74c3c" />

          <SceneGraph>
            <BoxEntity
              materials={['primary']}
              width={0.2} height={0.2} depth={0.2}
              position={{ x: -0.2, y: 0, z: 0 }}
            />
            <SphereEntity
              materials={['accent']}
              radius={0.1}
              position={{ x: 0.2, y: 0, z: 0 }}
            />
          </SceneGraph>
        </Reality>
      </main>
    </div>
  );
}
```

Important: only import the specific components you use from `@webspatial/react-sdk`. The project has `noUnusedLocals: true` in tsconfig.json, so unused imports will cause build failures.

## src/MainPage.css

This is the base page CSS. When adding spatial-specific styles for this page, scope them under `html.isSpatial` within this same file. The global `index.css` only contains base spatial defaults (background material, color).

```css
.mainPage {
  .model {
    width: 300px;
    height: 200px;
    --xr-depth: 150px;
  }
}

/* Spatial overrides for this page */
html.isSpatial .mainPage {
  /* Add spatial styles here, e.g.:
  .card {
    --xr-background-material: thick;
    position: relative;
    --xr-back: 20;
  }
  */
}
```

## src/vite-env.d.ts

```ts
/// <reference types="vite/client" />
```

## Adding 3D content

The `<Model>` component from `@webspatial/react-sdk` supports both USDZ and glTF/GLB formats. Place models in `public/usdz/` or `public/models/` and reference them by path. The component accepts:

- `src` — path to the model file (USDZ or GLB)
- `enable-xr` — marks it as a spatialized element
- `className` — for CSS sizing and depth control
- Children — fallback content (typically an `<img>`) shown on non-spatial platforms

Sources for free 3D models:

**USDZ:**
- Apple AR Quick Look Gallery: https://developer.apple.com/augmented-reality/quick-look/
- Sketchfab (many models offer USDZ export): https://sketchfab.com/

**glTF/GLB:**
- Khronos glTF Sample Assets: https://github.com/KhronosGroup/glTF-Sample-Assets
- Khronos glTF Sample Models: https://github.com/KhronosGroup/glTF-Sample-Models/tree/main/2.0
- Poly Haven (CC0): https://polyhaven.com/models
- Kenney Assets (CC0): https://kenney.nl/assets

## Adding spatial styles for additional pages

When adding new pages to the app, put spatial-only overrides in each page's own CSS file, scoped under `html.isSpatial`. The global `index.css` only has the base spatial defaults. Example:

```css
/* In SecondPage.css */
.secondPage {
  /* Regular styles */
  padding: 2rem;
}

/* Spatial overrides for this page */
html.isSpatial .secondPage {
  .card {
    --xr-background-material: thick;
    position: relative;
    --xr-back: 30;
  }
}
```

This keeps spatial styles co-located with the page they belong to, while the `html.isSpatial` scope ensures they only activate inside the WebSpatial App Shell.
