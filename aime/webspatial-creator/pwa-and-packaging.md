# PWA & Packaging

## Minimal PWA requirements

WebSpatial builds on the PWA standard. At minimum, you need a manifest with:

- `name`
- `start_url`
- `display`
- `icons`:
  - one with `purpose: any`
  - one maskable icon at least 1024×1024 with `purpose: maskable`

## Link the manifest everywhere

Every page in scope must include:

```html
<link rel="manifest" href="/manifest.webmanifest" />
```

Otherwise the page may not be recognized as part of the PWA / WebSpatial app scope.

## WebSpatial manifest extension: xr_main_scene

`xr_main_scene.default_size` controls the **Start Scene (Window Scene)** initial size.

Default guidance:

- Use a **normal size** so the Window Scene UI is visible.
- Only use a tiny size (e.g. 1×1) when you explicitly implement a "launcher" Start Scene and the real experience lives in another scene.

## Transparent window look (recommended)

To get a see-through window effect in Web App Shell:

- In XR-only CSS (`html.is-spatial` scope):
  - make the page background transparent
  - use material backgrounds (glass) for UI cards

## Key manifest properties and implications

### start_url

- Defines the Start Scene’s default entry page.

### scope

- Determines which URLs open inside Web App Shell as part of this WebSpatial app.
- Anything outside the scope opens in a normal browser.

### display

Controls which native UI appears in each Scene Menu:

- `minimal-ui`: provides basic navigation affordances.
- `standalone`: removes them; your app must handle navigation.

## Packaging with WebSpatial Builder (high-level)

WebSpatial Builder packages your XR build output into a platform app bundle (e.g. visionOS).

For “website only” workflows, you may skip packaging and simply serve the XR build over the network.
