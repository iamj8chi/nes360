# No Estan Solos — 360° VR Safari

A browser-based 360° VR safari game built with [A-Frame](https://aframe.io)
(WebGL). The player explores a Chaco savanna, clicks the Safari sign to start,
and has 5 minutes to find the 6 native animals: **flamenco, jaguareté, ñandú,
jurumí, taguá, and tatú**. It runs on desktop (WASD/arrows + mouse) and in VR
headsets (WebXR with controller locomotion).

## Prerequisites

- [Node.js](https://nodejs.org) 18+ and npm

## Getting started

```bash
npm install        # install dependencies
npm run dev        # start the dev server with hot reload (http://localhost:5173)
```

Open the printed URL in a WebXR-capable browser. For VR, use the headset's
browser or a desktop browser with the
[WebXR emulator](https://github.com/MozillaReality/WebXR-emulator-extension).

## Scripts

| Command                | What it does                                    |
| ---------------------- | ----------------------------------------------- |
| `npm run dev`          | Vite dev server with hot module reload          |
| `npm run build`        | Production build into `dist/`                   |
| `npm run preview`      | Serve the production build locally to verify it |
| `npm run format`       | Format all source with Prettier                 |
| `npm run format:check` | Check formatting without writing (CI-friendly)  |

## Controls

- **Desktop:** `W A S D` / arrow keys to move, mouse to look, click to interact.
- **VR:** left controller thumbstick to move (see `vr-locomotion`); gaze/point
  and trigger to interact.
- **Debug:** `Ctrl + C` toggles collision-volume visualization.

## Project structure

```
index.html              # Vite entry — the A-Frame scene graph (<a-scene>, assets, entities)
vite.config.js          # Vite config (default base "/", assets served from public/)
public/
  assets/               # 3D models (.glb), UI/sign images (.png), audio (.mp3) — served at /assets/*
  favicon.png
src/
  main.js               # Imports A-Frame + the extras we use, then registers all components
  scene-shadows.js      # Scene-load bootstrap: enables renderer shadows, configures the sun
  components/
    game/               # safari-game-manager, orb-controller, progress-ui, staggered-start
    animals/            # animal-highlighter, animal-clickable, animal-behavior
    collision/          # collision-manager/-cube/-cylinder/-responder, boundary-collision
    environment/        # composite-tree, canopy-wind, screen-fade, shadow-control
    movement.js         # vr-locomotion
    performance/        # material-optimizer, performance-optimizer
```

## Architecture

The game is a set of [A-Frame components](https://aframe.io/docs/1.7.0/core/component.html)
(`AFRAME.registerComponent`). Each file in `src/components/**` defines one
component and registers it at import time. `src/main.js` imports A-Frame first
(which sets up the global `AFRAME` and `THREE`), then the two extras components
we use, then every game component.

Components communicate through scene-level custom events emitted on
`this.el.sceneEl`, e.g. `safari-start-game`, `safari-animal-clicked`,
`safari-animal-found`, `safari-timer-update`, and `safari-game-ended`. The
`safari-game-manager` component is the hub that owns game state and the timer.

### Dependencies

- [`aframe`](https://www.npmjs.com/package/aframe) — WebGL/VR framework (bundles
  its own THREE as `super-three`).
- [`aframe-extras`](https://www.npmjs.com/package/aframe-extras) — only
  `controls` (keyboard/touch/gamepad locomotion) and `loaders/animation-mixer`
  (glTF animation playback) are imported, to keep the bundle lean and avoid
  pulling a second copy of THREE.

## Assets

Static assets live in `public/assets/` and are served verbatim at `/assets/...`
(Vite does not hash or transform `public/`), which is why A-Frame's
`<a-asset-item src="assets/...">` URLs work unchanged in dev and production.
Source `.glb` files are exported from Blender/Blockbench.

## Deployment

Deploys to **Vercel**, which auto-detects Vite (build command `npm run build`,
output directory `dist/`). No extra configuration is required because the app is
served at the domain root (`base: "/"`).
