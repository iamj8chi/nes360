# Copilot Instructions for nes360

## Overview

"No Estan Solos" is a 360° VR safari game built with **A-Frame** (WebGL) and
bundled with **Vite**. The player finds 6 native animals within a time limit, on
desktop or in VR. See `README.md` for run/build instructions.

## Tech stack & workflow

- **Build tool:** Vite. `npm run dev` (HMR dev server), `npm run build`
  (production bundle into `dist/`), `npm run preview` (serve the build).
- **Dependencies:** `aframe` and `aframe-extras`, installed from npm (NOT
  vendored). There is no Webpack and no hand-managed library folder.
- **Formatting:** Prettier (`npm run format`). Config in `.prettierrc.json`
  (double quotes, 2-space indent, `es5` trailing commas).
- **Deployment:** Vercel (auto-detected Vite; root base `/`).

## Architecture

- `index.html` (project root) is the Vite entry and holds the entire A-Frame
  scene graph: `<a-scene>`, `<a-assets>`, lights, signs, the 6 animal entities,
  and the camera rig. It loads exactly one script: `<script type="module"
src="/src/main.js">`.
- `src/main.js` imports A-Frame first (this sets up the global `AFRAME` and
  `THREE`), then the only two `aframe-extras` pieces used
  (`controls/index.js` and `loaders/animation-mixer.js`), then every game
  component.
- Each file under `src/components/**` defines exactly one component via
  `AFRAME.registerComponent(...)` and registers it at import time. Components
  reference the **global** `AFRAME` and `THREE` — do not add per-file
  `import` statements for them.

## Conventions

- **One component per file**, grouped by domain: `game/`, `animals/`,
  `collision/`, `environment/`, `performance/`, plus `movement.js`.
- **Cross-component communication is event-based.** Components emit and listen
  on `this.el.sceneEl` with the `safari-*` event names (`safari-start-game`,
  `safari-animal-clicked`, `safari-animal-found`, `safari-timer-update`,
  `safari-game-ended`, `safari-game-reset`). `safari-game-manager` owns game
  state. When adding behavior, prefer emitting/handling these events over direct
  cross-component calls.
- **Registration order does not matter** — `registerComponent` only defines;
  A-Frame instantiates components when entities attach. Discovery (e.g.
  `collision-manager`) happens at runtime via `querySelectorAll`.

## Assets

- Static assets live in `public/assets/` and are served verbatim at
  `/assets/...`. Reference them with root-relative paths in HTML
  (`<a-asset-item src="assets/foo.glb">`) — do NOT `import` `.glb`/`.mp3`/`.png`.
- `.glb` models are exported from Blender/Blockbench. Keep large binary source
  files (Blender projects, raw audio) out of the repo.

## THREE version note

`aframe` bundles its THREE as `super-three`; `aframe-extras` depends on stock
`three`. We avoid duplicate-THREE issues by importing only the two extras
submodules that use the **global** THREE (animation-mixer, movement-controls)
rather than all of `aframe-extras`. If you add an extras feature that imports
`three` directly (e.g. the FBX/Collada loaders), expect a second THREE copy and
add a Vite `resolve.alias` mapping `three` to A-Frame's build.

---

Keep this file in sync with the actual setup when the architecture changes.
