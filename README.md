# Middle East Conquest - Render deployment

This folder is the whole site: `public/` (the installable game) + `server.js` (static hosting and the online-room relay).

## Deploy on render.com
1. Create a new GitHub repo and upload everything in this folder (keep `public/`, `server.js`, `package.json`, `render.yaml`).
2. On render.com: **New +  ->  Web Service**, connect the repo (or **Blueprint** to use `render.yaml`).
3. Settings if asked: Runtime **Node**, Build Command `npm install`, Start Command `node server.js`. Plan: Free is fine.
4. When it is live, open your URL. Optional: **Settings -> Custom Domains** to use your own domain (HTTPS is automatic - required for installing).

## What players see
* Opening the site in a browser shows the landing page with an **Install the app** button (Android/Chrome/Edge; on iPhone it
  shows "Share -> Add to Home Screen").
* The installed app opens a menu: **Play Offline**, **Pass & Play**, **Play Online**, **Nearby**. After the first load the game works with no internet.
* Online = room codes through `server.js` (WebSocket at `/ws`). The free Render plan sleeps when idle, so the first online connection can take ~30 seconds.

## Updating
Re-run `python tools/build_deploy.py` and push; the service worker version changes so phones pick up the new build.
