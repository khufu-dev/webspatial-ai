# Development Setup (XR-first)

## Supported project characteristics

A project can use WebSpatial out of the box if:

- UI is built with **React + Web standards**.
- The final build uses a mainstream build tool (Vite / Next.js / Rsbuild / Rspack).
- You can control the HTML output and static assets (so the XR build can ship a Web App Manifest and WebSpatial-specific HTML).

## Install packages

Typical runtime deps:

- `@webspatial/react-sdk`
- `@webspatial/core-sdk`

Peer deps used by the SDK (install explicitly):

- `@google/model-viewer`
- `three`

Build-time deps:

- `@webspatial/vite-plugin` (or next/rsbuild/rspack equivalents)

## Configure the compiler (TypeScript)

Add `jsxImportSource` so the SDK can affect JSX transforms:

```json
{
  "compilerOptions": {
    "jsxImportSource": "@webspatial/react-sdk"
  }
}
```

## Integrate build-tool plugins (Vite example)

- Add `@webspatial/vite-plugin` in `vite.config.ts`.
- Inject `XR_ENV` into `index.html` so you can:
  - branch by `import.meta.env.XR_ENV`
  - add `html.is-spatial` for XR-only CSS

## XR-only workflow (default)

Unless the user explicitly asks for a regular-mode website, follow an XR-only workflow:

- Dev server (XR): `XR_ENV=avp npm run dev`
- Build (XR): `XR_ENV=avp npm run build`
- Deploy directory: `dist/webspatial/avp/`

> Note: the WebSpatial plugin may still generate a regular build, but you should not deploy it unless requested.

## Detect WebSpatial mode reliably

Recommended patterns:

- Build-time injection: `import.meta.env.XR_ENV === 'avp'`.
- CSS scope class: `html.is-spatial`.

## Hot reload note

Some WebSpatial-specific logic may not fully support HMR; a manual refresh in the spatial runtime may be required.
