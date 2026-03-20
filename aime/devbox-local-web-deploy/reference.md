# DevBox Local Web Deployment — Reference

## 0) Prerequisites (dependencies)

COCO should ensure these commands exist:

- `bash`
- `python3` (for `python3 -m http.server`)
- Node.js (recommended **>= 18**) + `npm` + `npx`

### Quick checks

```bash
python3 --version
node --version
npm --version
```

## 1) Decide the port and host

### Port

Use one of: `5173`, `3000`, `8080`, `9000`.

If a port is in use:

```bash
lsof -i :5173 || true
```

Pick another port, or stop the old process.

### Host binding (critical)

- Must bind to `0.0.0.0`.

## 2) Determine how to run the website

### Case A: Static files (plain HTML/CSS/JS)

**Option 1: Python built-in server**

```bash
cd /path/to/site
python3 -m http.server 8080 --bind 0.0.0.0
```

**Option 2: Use the provided script**

```bash
bash SKILLS/devbox-local-web-deploy/scripts/start_static_site.sh /path/to/site 8080
```

### Case B: Vite (React/Vue/Svelte/etc.)

Development server (fast iteration):

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Production-like (recommended for sharing):

```bash
npm install
npm run build
npx serve -s dist -l 0.0.0.0:8080
```

### Case C: Next.js

Development:

```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Production-like:

```bash
npm install
npm run build
npm run start -- --hostname 0.0.0.0 --port 3000
```

### Case D: WebSpatial (serve XR build for Web App Shell)

This is the most common pitfall when sharing to a headset:

- If you serve the **regular build** output, Web App Shell will show **Regular Web mode**.

Recommended flow (Vite example):

```bash
npm install
XR_ENV=avp npm run build
npx serve -s dist/webspatial/avp -l 0.0.0.0:8080
```

Alternative (XR dev server):

```bash
npm install
XR_ENV=avp npm run dev -- --host 0.0.0.0 --port 5173
```

Validation tips:

- Confirm the served root contains `manifest.webmanifest` and `index.html`.
- Confirm `index.html` includes `<link rel="manifest" href="/manifest.webmanifest" />`.

> Note: Many PWA/Web App Shell environments require HTTPS for installability. If the headset refuses to treat it as a PWA over plain HTTP, COCO must ask the user what HTTPS strategy is available in their DevBox environment.

## 3) Keep the server running (so others can access)

### Option A: tmux (recommended)

```bash
tmux new -s website
# run the server command inside tmux
# detach: Ctrl+b then d
```

Re-attach:

```bash
tmux attach -t website
```

### Option B: nohup

```bash
nohup npm run dev -- --host 0.0.0.0 --port 5173 > web.log 2>&1 &

tail -f web.log
```

## 4) Share an accessible URL

COCO should provide both a hostname and an IP fallback.

### Get hostname

```bash
hostname -f || hostname
```

### Get IP address

```bash
hostname -I | awk '{print $1}'
```

Then share:

- `http://<hostname>:<port>/`
- or `http://<ip>:<port>/`

## 5) Verify from the DevBox itself

```bash
curl -I http://127.0.0.1:5173/ || true
curl -I http://0.0.0.0:5173/ || true
```

## 6) Common pitfalls (lessons learned)

- **Bound to localhost**: others cannot access. Fix by adding `--host 0.0.0.0` / `--bind 0.0.0.0`.
- **Wrong directory served for WebSpatial**: serving `dist/` instead of `dist/webspatial/avp/` leads to Regular Web mode.
- **Firewall / network policy**: if inbound traffic is blocked, you may need an approved port-mapping or reverse-proxy solution. COCO must ask the user what mechanism is available.
- **Large assets**: prefer production build + static serving.
