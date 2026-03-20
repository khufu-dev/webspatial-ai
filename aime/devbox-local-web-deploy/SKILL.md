---
name: devbox-local-web-deploy
description: Use this when you need to run and expose a website from your own DevBox on a TCP port so others (including a headset/Web App Shell) can access it. Covers prerequisites (Node/Python), choosing a port, binding to 0.0.0.0, running common frameworks (Vite/React/Next), serving static builds, and sharing an accessible URL. Also includes WebSpatial-specific deployment rules: serve the XR build output (e.g. dist/webspatial/avp) so Web App Shell does NOT fall back to Regular Web mode.
---

# DevBox Local Web Deployment (Skill)

Goal: after reading this skill, COCO should be able to **fully autonomously** start a web site on your DevBox, bind it correctly, keep it running, and tell you what URL others can use to access it.

> Important: unlike Aime, COCO cannot deploy to a public bytedance.net domain. The only supported strategy here is: **run a server process on the DevBox and expose a port**.

## Operating principles

- Always bind the server to **`0.0.0.0`** (NOT `localhost` / `127.0.0.1`), otherwise other people cannot access it.
- Prefer a **single, explicit port** (e.g. 5173/3000/8080). If the default port is occupied, pick another.
- When the project is buildable, prefer **production-like** serving (build -> static server) for stability.
- Provide a shareable URL in the form: `http://<devbox-host-or-ip>:<port>/`.

## WebSpatial rule (critical)

If the site is a WebSpatial app and the user wants it to open in Web App Shell:

- Build with **`XR_ENV=avp`**.
- Serve/deploy **only** the XR build output directory (typical Vite setup: `dist/webspatial/avp/`).
- Do not accidentally serve `dist/` or you will see **Regular Web mode**.

## Use the detailed docs on demand

- `reference.md` — step-by-step deployment playbook and commands.
- `scripts/start_static_site.sh` — serve a folder (dist/build) on 0.0.0.0.
- `examples.md` — common project recipes and prompts.
