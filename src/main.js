// NES360 — "No Estan Solos" 360° VR safari game
// Entry point: load A-Frame and the extras we use, then register all game components.

// A-Frame must be imported first — it sets up the global `window.AFRAME` and
// `window.THREE` that every component module below relies on.
import "aframe";

// aframe-extras: import only the submodules the game actually uses, to avoid
// bundling the FBX/Collada loaders (the only parts that pull a second copy of THREE).
// - movement-controls: desktop/keyboard locomotion on the camera rig
// - animation-mixer: plays the animals' glTF animation clips
import "aframe-extras/controls/index.js";
import "aframe-extras/loaders/animation-mixer.js";

// Game logic
import "./components/game/safari-game-manager.js";
import "./components/game/orb-controller.js";
import "./components/game/safari-compass.js";
import "./components/game/staggered-start.js";
import "./components/game/game-modes.js";
import "./components/game/vuelo-mode.js";
import "./components/game/animal-info-card.js";

// Animals
import "./components/animals/animal-highlighter.js";
import "./components/animals/animal-clickable.js";
import "./components/animals/animal-behavior.js";

// Collision system
import "./components/collision/collision-manager.js";
import "./components/collision/collision-cube.js";
import "./components/collision/collision-cylinder.js";
import "./components/collision/collision-responder.js";
import "./components/collision/boundary-collision.js";

// Environment
import "./components/environment/composite-tree.js";
import "./components/environment/low-poly-fire.js";
import "./components/environment/forest.js";
import "./components/environment/canopy-wind.js";
import "./components/environment/screen-fade.js";
import "./components/environment/shadow-control.js";
import "./components/environment/environment-degradation.js";

// Movement (VR locomotion)
import "./components/movement.js";
import "./components/flight-locomotion.js";
import "./components/pinch-teleport.js";

// UI helpers
import "./components/render-on-top.js";

// Performance
import "./components/performance/material-optimizer.js";
import "./components/performance/performance-optimizer.js";

// Scene-level bootstrap: enables renderer shadows and configures the sun once the
// scene loads (this was a top-level IIFE in the original inline script).
import "./scene-shadows.js";
