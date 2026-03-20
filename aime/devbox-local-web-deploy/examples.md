# Examples

## Example 1: Deploy a Vite site for others to access

"I have a Vite project on my DevBox. Please run it so others can access it over the network. Use port 5173 if available, otherwise pick another. Bind to 0.0.0.0 and tell me the final URL." 

Expected actions:

- `npm install`
- `npm run dev -- --host 0.0.0.0 --port 5173`
- `hostname -f` and/or `hostname -I` to produce the share URL

## Example 2: Deploy a production build (recommended)

"Build my Vite/React project and serve the dist folder on 0.0.0.0:8080 so it is stable for sharing." 

Expected actions:

- `npm run build`
- `npx serve -s dist -l 0.0.0.0:8080`

## Example 3: Serve a plain static site

"I have a folder with index.html and assets. Serve it on my DevBox so others can access it." 

Expected actions:

- `python3 -m http.server <port> --bind 0.0.0.0`

## Example 4: Next.js

"Start my Next.js app on 0.0.0.0:3000 and give me the shareable URL." 

Expected actions:

- `npm run dev -- --hostname 0.0.0.0 --port 3000`

## Example 5: WebSpatial — serve the XR build (no Regular Web mode)

"I built a WebSpatial app and need to open it in Web App Shell. Please build with XR_ENV=avp and serve ONLY dist/webspatial/avp on 0.0.0.0:8080, then give me the shareable URL." 

Expected actions:

- `XR_ENV=avp npm run build`
- `npx serve -s dist/webspatial/avp -l 0.0.0.0:8080`
