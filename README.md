# 🎈 BALLOON BLITZ! — Browser FPS Multiplayer

A colorful 3D multiplayer browser game. You and your friends are wobbly balloon people with bubble blasters! Jump around a candy arena, hide behind inflatable barricades, and pop each other. No accounts required.

## What is in the MVP?

- **First-person 3D gameplay:** mouse look, WASD, sprint, jump, blaster, health, damage feedback, ammo and reload
- **Real-time multiplayer:** WebSocket room codes and invite links; up to 12 human players per room
- **4 server-simulated bots** so you can play alone immediately
- **Server-side health/hits, respawning, and scoreboard**, with 5-minute rounds
- **Original Meshy 3D art:** balloon character, blaster, cactus and barricade. The game includes 3D procedural equivalents if the four GLBs have not been downloaded into `public/assets/`.
- **Mobile touch controls** (experimental) and desktop controls
- **Serverless database:** ephemeral multiplayer rooms, no tracking or accounts

## Run on your computer

Requires **Node.js 20+**.

```bash
npm install
npm run fetch:models  # optional: install the 4 generated Meshy GLB assets
npm start
```

Then open **http://localhost:3000** in Chrome, Edge, or Firefox. Enter a nickname and click **LET'S POP!**, then **BACK TO THE ACTION** to lock the mouse.

**Controls:** WASD move · Mouse aim · Left click shoot · Space jump · Shift sprint · R reload · Tab scoreboard · Escape pause · M toggle sound.

### Test multiplayer locally

Open two windows at `http://localhost:3000/?room=PARTY1`, choose different nicknames, and join both. They will see each other and can shoot each other. Or test from a second device on your home Wi-Fi by visiting `http://<your-LAN-IP>:3000/?room=PARTY1`; you may need to allow TCP 3000 through your local firewall.

## Share it publicly with a link

Because multiplayer is real-time, it needs a **running Node/WebSocket server**. Upload this entire project to a GitHub repo, then deploy to a Node/WebSocket-capable host such as Render, Railway or Fly.io. This is **not a GitHub Pages-only static game**.

**Render example:**
1. Make a new GitHub repo containing this project; include downloaded Meshy GLB files in `public/assets` if you want them always available.
2. In Render, create a new **Web Service** from the repo or import its `render.yaml` blueprint.
3. Set build command to `npm install` (or `npm install && npm run fetch:models` while links are current) and start command to `npm start`.
4. Once live, open `https://YOUR-HOSTNAME/`, choose a name, and click **LET'S POP!**.
5. Click **↗ SHARE** to copy an invite link such as `https://YOUR-HOSTNAME/?room=PARTY1` and send it to your friends. Friends need to use **the same room code**.

**Note:** the game server has in-memory rooms and should be deployed as **one instance**. Multiple instances need a shared broker/room affinity to work correctly. Hosting costs/limits are provider-dependent.

## Original Meshy models

See [`MESHY-MODELS.md`](MESHY-MODELS.md) for exact task IDs and download instructions. Signed automatic download links last approximately 48 hours; if expired, download the four GLB files from your connected Meshy Studio. Put them in `public/assets/` and they will be used automatically. The included default 3D models ensure a playable game even when downloads fail.

## For developers

- `server.mjs`: static hosting, WebSocket rooms, bot movement and hit/damage simulation
- `arena-logic.mjs`: shared geometry and gameplay math (tested)
- `public/game.js`: Three.js/WebGL renderer, world, input, meshes and effects
- `public/world.json`: cover collision positions, spawn points, arena size
- `public/style.css`: game UI
- `scripts/fetch-meshy-assets.mjs`: optional one-time GLB downloads

MVP limitations: no persistent profile database, no team modes or ranking persistence; basic bot AI and simple server-side movement validation; in-memory rooms reset when hosting service restarts. Avoid publicly exposing the server at scale without adding rate limits, auth/abuse controls, server-authoritative physics and a production observability setup.
