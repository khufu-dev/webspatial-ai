# Examples (Prompt Patterns)

## 1) Default: Transparent Window Scene (2.5D)

"Create a WebSpatial React+Vite app for Web App Shell. By default, use a Window Scene with a transparent/see-through background and glass UI cards. Spatialize UI blocks with enable-xr, set material backgrounds, and layer them using --xr-back. Build with XR_ENV=avp and tell me which directory to deploy. Do NOT build or deploy any regular-mode website unless I explicitly ask." 

## 2) Two scenes: Window UI + Volume model (only when asked)

"Create a WebSpatial app with two scenes: a Window Scene that shows UI/text and a button, and a Volume Scene that only shows a ToyCar model. Build and deploy only the XR_ENV=avp output for Web App Shell." 

## 3) Diagnose Regular Web mode

"I opened my link in Web App Shell but it still shows Regular Web mode. Please check whether I'm deploying the correct XR build directory, whether manifest is linked, and whether the URL is inside manifest scope." 
