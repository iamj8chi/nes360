# No Están Solos — 360° VR Safari

A browser-based 360° VR game built with [A-Frame](https://aframe.io) (WebGL /
WebXR). The player explores a Chaco savanna, clicks the Safari sign to start, and
has **2 minutes** to find and "save" the 6 threatened native animals — **flamenco,
jaguareté, ñandú, jurumí, taguá and tatú** — before the forest burns down. As the
timer runs out the world degrades: the sky turns from blue to red, trees catch
fire, and a red damage vignette closes in. Save all six and the forest recovers.

It runs on **desktop** (WASD/arrows + mouse), in **VR** (WebXR — Meta Touch
controllers _and_ hand tracking), and ships as an **installable APK** for Meta
Quest. There is also a separate **WebAR minigame for phones** at `/ar`.

> **Working on this repo?** Read [`CLAUDE.md`](CLAUDE.md) first — it is the
> detailed architecture guide (event bus, component inventory, known gotchas).
> This README is just the quick start.

## Prerequisites

- [Node.js](https://nodejs.org) 18+ and npm

## Getting started

```bash
npm install        # install dependencies
npm run dev        # start the dev server (https://localhost:3333)
```

The dev server runs on a **fixed port 3333 over HTTPS** with a self-signed
certificate, and binds `0.0.0.0` so headsets and phones on the same Wi-Fi can
reach it. HTTPS is not optional: WebXR only works over `https://` or on
`localhost`.

**Testing on a Quest:** run `npm run dev`, then open `https://<your-machine-IP>:3333`
in the headset browser (same Wi-Fi). It will warn once about the untrusted
certificate — accept it. You can also use a desktop browser with the
[WebXR emulator](https://github.com/MozillaReality/WebXR-emulator-extension).

## Scripts

| Command                | What it does                                                   |
| ---------------------- | -------------------------------------------------------------- |
| `npm run dev`          | Vite dev server, port 3333, HTTPS, exposed on the LAN          |
| `npm run build`        | Production build into `dist/` (both the game and `/ar`)        |
| `npm run preview`      | Serve the production build with the same options as `dev`      |
| `npm run inspect`      | Dev server over **HTTP** for the A-Frame Inspector (see below) |
| `npm run watch`        | aframe-watcher — saves Inspector edits back into `index.html`  |
| `npm run format`       | Format all source with Prettier                                |
| `npm run format:check` | Check formatting without writing (CI-friendly)                 |

There are no tests and no linter beyond Prettier.

## Controls

- **Desktop:** `W A S D` / arrow keys to move, mouse to look, click to interact.
- **VR (controllers):** left thumbstick to move (`vr-locomotion`), point and pull
  the trigger to interact.
- **VR (hand tracking):** point and **pinch** to select; point at the ground with
  the left hand and pinch to **teleport** (`pinch-teleport`). The laser pointer is
  a custom component (`hand-ray`), not A-Frame's built-in cursor.
- **Debug:** `Ctrl + C` toggles collision-volume visualization. In-headset, click
  the small cube behind the main sign to toggle collision volumes _and_ the
  otherwise-invisible animal spawn points.

## Editing the scene visually

The forest (~213 tree entities) and the 12 animal spawn points are **static
entities in `index.html`** specifically so they can be moved with the A-Frame
Inspector and persisted back to disk:

```bash
npm run inspect    # terminal 1 — HTTP, not HTTPS (the Inspector's save is
                   #              blocked as mixed content from an HTTPS page)
npm run watch      # terminal 2 — the companion server on localhost:51234
```

Open `http://localhost:3333`, press `Ctrl + Alt + I`, edit, hit **Save**, accept
the diff in the watcher terminal, then run `npm run format`. Only entities with
an `id` are persisted. Full walkthrough and gotchas in [`CLAUDE.md`](CLAUDE.md) §11.

## Project structure

```
index.html              # Vite entry — the entire A-Frame scene graph (2.5k lines)
ar/index.html           # Second entry — the WebAR minigame page, served at /ar/
vite.config.js          # Vite config: HTTPS dev server, PWA plugin, multipage build
public/
  assets/               # models (.glb), audio (.mp3), UI/sign images, MSDF fonts
  icon-*.png            # PWA icons
  .well-known/          # assetlinks.json — TWA domain verification for the APK
art-src/                # Blockbench sources (.bbmodel) — versioned, not deployed
src/
  main.js               # Imports A-Frame + extras, then registers every component
  scene-shadows.js      # Scene-load bootstrap: renderer shadows, sun shadow camera
  data/animal-info.js   # Species copy for the info cards (single source of truth)
  components/
    game/               # safari-game-manager, safari-compass, game-modes,
                        #   orb-controller, animal-spawner, animal-info-card, …
    animals/            # animal-clickable, animal-highlighter, animal-behavior
    collision/          # collision-manager/-cube/-cylinder/-responder, boundary
    environment/        # composite-tree, environment-degradation, low-poly-fire,
                        #   spawn-point, canopy-wind, screen-fade, shadow-control
    performance/        # material-optimizer, performance-optimizer
    movement.js         # vr-locomotion (thumbstick)
    flight-locomotion.js  # bird-style flight — currently disabled, see CLAUDE.md §8
    hand-ray.js         # custom laser pointer for hands and controllers
    pinch-teleport.js   # pinch-to-teleport locomotion for hand tracking
    render-on-top.js    # UI helper (depth-test off) for hand-mounted HUDs
  ar/                   # The /ar WebAR minigame — its own components and layout
```

## Architecture

The game is a set of [A-Frame components](https://aframe.io/docs/1.7.0/core/component.html)
(`AFRAME.registerComponent`), one per file under `src/components/**`, each
registered at import time. `src/main.js` imports A-Frame first (which defines the
global `AFRAME` and `THREE`), then the extras submodules, then every game
component. **Components use those globals — never add a per-file `import` of
`three` or `aframe`**, or you get a second copy of THREE.

Components never call each other directly. They emit and listen for scene-level
events on `this.el.sceneEl` — `safari-start-game`, `safari-game-started`,
`safari-animal-clicked`, `safari-animal-found`, `safari-timer-update`,
`safari-game-ended`, `safari-game-reset` — with `safari-game-manager` as the hub
that owns game state and the timer. The full event table is in
[`CLAUDE.md`](CLAUDE.md) §3.

### Dependencies

- [`aframe`](https://www.npmjs.com/package/aframe) 1.7.1 — WebGL/VR framework
  (bundles its own THREE as `super-three`).
- [`aframe-extras`](https://www.npmjs.com/package/aframe-extras) — only `controls`
  (keyboard/touch/gamepad locomotion) and `loaders/animation-mixer` (glTF
  animation playback) are imported, to keep the bundle lean and avoid pulling a
  second copy of THREE.
- [`aframe-watcher`](https://www.npmjs.com/package/aframe-watcher) — persists
  A-Frame Inspector edits back into `index.html`.

## Assets

Static assets live in `public/assets/` and are served verbatim at `/assets/...`
(Vite does not hash or transform `public/`), which is why A-Frame's
`<a-asset-item src="assets/...">` URLs work unchanged in dev and production.
Models are exported from Blender/Blockbench; the Blockbench sources are tracked in
`art-src/`, outside `public/` so they are not deployed.

Note the naming quirk: the animal _type_ is `flamingo` but the _file_ is
`flamengo`. Helpers in `src/data/animal-info.js` encapsulate the mapping.

## The WebAR minigame (`/ar`)

A separate phone experience: point the camera at a **Hiro marker** and a miniature
forest diorama appears on it, with the 6 animals hidden among the bushes and a
1-minute timer. It is built as a second Vite entry and deployed alongside the game.

It deliberately loads **its own A-Frame 1.3.0 from a CDN** rather than the bundled
1.7.1 — AR.js 3.4.x breaks against newer THREE and the camera feed goes black.
This does not affect the main game. See [`CLAUDE.md`](CLAUDE.md) §12 before
touching it, especially the rule about not sharing modules between the two entries.

## Deployment

Deploys to **Vercel**, which auto-detects Vite (build command `npm run build`,
output directory `dist/`). No extra configuration is needed — the app is served at
the domain root (`base: "/"`).

### Android / Meta Quest APK

The app is a PWA (`vite-plugin-pwa`: manifest + a Workbox service worker that
precaches the whole game, `.glb` and `.mp3` included, so it runs offline). That
PWA is wrapped as a **Trusted Web Activity** with
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) to produce a signed
`.apk` for sideloading (`adb install app-release-signed.apk` or SideQuest).

The generated Android project and the signing keystore are **intentionally
gitignored** — the keystore is a private signing key and everything else is
regenerable. `public/.well-known/assetlinks.json` carries the signing fingerprint
for domain verification; regenerate it if you regenerate the keystore. Full
pipeline in [`CLAUDE.md`](CLAUDE.md) §9.
