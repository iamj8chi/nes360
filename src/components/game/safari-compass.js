// Directional compass HUD for Safari mode. Replaces the old static progress
// tracker (progress-ui). A horizontal strip of animal icons sits in front of the
// camera; each icon slides left/right to point toward where that animal actually
// is relative to where the player is looking, so it's easy to find them.
//
// - The strip container (#compassUI) is a child of #head, so it rotates with the
//   view. We only use the camera's YAW to place icons horizontally within it.
// - When an animal is found it's removed from the compass (icon hidden).
// - The MM:SS timer lives on the strip and recolors as time runs low.
//
// Driven by the existing safari-* scene events (same wiring progress-ui used).

const HUNT_ANIMALS = [
  "flamingo",
  "jaguarete",
  "nandu",
  "jurumi",
  "tagua",
  "tatu",
];

const HALF_FOV = Math.PI / 2; // ±90° maps to the full strip width
const STRIP_HALF_WIDTH = 0.7; // metres from centre to each edge

function normalizeAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

AFRAME.registerComponent("safari-compass", {
  init: function () {
    this.active = false;
    this.found = new Set();

    // Reusable vectors to avoid per-frame allocation.
    this._fwd = new THREE.Vector3();
    this._camPos = new THREE.Vector3();
    this._animalPos = new THREE.Vector3();

    // Per-animal state: { type, iconEl, animalEl, worldPos }
    this.entries = [];

    this.onStarted = this.onStarted.bind(this);
    this.onFound = this.onFound.bind(this);
    this.onTimer = this.onTimer.bind(this);
    this.onEnded = this.onEnded.bind(this);
    this.onReset = this.onReset.bind(this);

    // Modo Vuelo: misma brújula (apunta a los animales) pero SIN timer. Reutiliza
    // onStarted/onFound/onEnded; solo alterna la visibilidad del reloj.
    this.onVueloStarted = () => {
      this.onStarted();
      this.setTimerVisible(false);
    };
    this.onVueloEnded = () => {
      this.onEnded();
      this.setTimerVisible(true);
    };

    // Wait for the DOM/scene graph (same pattern as progress-ui/animal-info-card).
    setTimeout(() => {
      this.compassUI = document.getElementById("compassUI");
      this.timerText = document.getElementById("timerDisplay");
      this.head = document.getElementById("head");

      this.entries = HUNT_ANIMALS.map((type) => ({
        type,
        iconEl: document.getElementById(`compassIcon-${type}`),
        animalEl: null,
        worldPos: new THREE.Vector3(),
      }));

      if (this.compassUI) this.compassUI.setAttribute("visible", "false");

      const scene = this.el.sceneEl;
      scene.addEventListener("safari-game-started", this.onStarted);
      scene.addEventListener("safari-animal-found", this.onFound);
      scene.addEventListener("safari-timer-update", this.onTimer);
      scene.addEventListener("safari-game-ended", this.onEnded);
      scene.addEventListener("safari-game-reset", this.onReset);

      scene.addEventListener("vuelo-started", this.onVueloStarted);
      scene.addEventListener("vuelo-animal-seen", this.onFound); // detail.animalType
      scene.addEventListener("vuelo-ended", this.onVueloEnded);

      console.log("Safari compass initialized");
    }, 100);
  },

  onStarted: function () {
    this.found.clear();

    // Snapshot each hunt animal's world position (entities are static).
    const hunt = document.getElementById("huntAnimals");
    this.entries.forEach((entry) => {
      if (!entry.animalEl && hunt) {
        entry.animalEl = hunt.querySelector(
          `[data-animal-type="${entry.type}"]`
        );
      }
      if (entry.animalEl && entry.animalEl.object3D) {
        entry.animalEl.object3D.getWorldPosition(entry.worldPos);
      }
      if (entry.iconEl) entry.iconEl.setAttribute("visible", "true");
    });

    if (this.compassUI) this.compassUI.setAttribute("visible", "true");
    this.active = true;
  },

  onFound: function (evt) {
    const type = evt.detail && evt.detail.animalType;
    if (!type) return;
    this.found.add(type);
    const entry = this.entries.find((e) => e.type === type);
    if (entry && entry.iconEl) entry.iconEl.setAttribute("visible", "false");
  },

  onTimer: function (evt) {
    this.updateTimer(evt.detail.timeRemaining);
  },

  onEnded: function () {
    this.active = false;
    // safari-game-ended fires at full fade-to-black, so hide the HUD (compass +
    // timer) immediately — behind the black — instead of lingering for a few
    // seconds after the player has already faded back in.
    if (this.compassUI) this.compassUI.setAttribute("visible", "false");
  },

  onReset: function () {
    this.found.clear();
    this.entries.forEach((entry) => {
      if (entry.iconEl) entry.iconEl.setAttribute("visible", "true");
    });
  },

  setTimerVisible: function (visible) {
    if (this.timerText) this.timerText.setAttribute("visible", visible);
  },

  updateTimer: function (seconds) {
    if (!this.timerText) return;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    this.timerText.setAttribute(
      "value",
      `${minutes}:${secs.toString().padStart(2, "0")}`
    );

    if (seconds < 15) {
      this.timerText.setAttribute("color", "#FF0000");
    } else if (seconds < 40) {
      this.timerText.setAttribute("color", "#FFFF00");
    } else {
      this.timerText.setAttribute("color", "#FFFFFF");
    }
  },

  tick: function () {
    if (!this.active || !this.head) return;

    const head3D = this.head.object3D;
    head3D.getWorldPosition(this._camPos);
    // THREE's getWorldDirection returns the entity's +Z (which points BEHIND an
    // A-Frame entity, since entities face -Z). Negate it to get the actual look
    // direction — without this the whole compass is rotated 180° around the player.
    head3D.getWorldDirection(this._fwd);
    this._fwd.negate();
    const camYaw = Math.atan2(this._fwd.x, this._fwd.z);

    this.entries.forEach((entry) => {
      const icon = entry.iconEl;
      if (!icon || this.found.has(entry.type)) return;
      if (icon.getAttribute("visible") === false) return;

      const dx = entry.worldPos.x - this._camPos.x;
      const dz = entry.worldPos.z - this._camPos.z;
      const animalYaw = Math.atan2(dx, dz);
      const delta = normalizeAngle(animalYaw - camYaw);

      // delta: 0 = dead ahead, negative = to the left, positive = to the right.
      const t = Math.max(-1, Math.min(1, delta / HALF_FOV));
      icon.object3D.position.x = t * STRIP_HALF_WIDTH;

      // Fade/shrink icons for animals behind the player (beyond the FOV) as a
      // "keep turning" cue.
      const behind = Math.abs(delta) > HALF_FOV;
      const scale = behind ? 0.6 : 1;
      icon.object3D.scale.set(scale, scale, scale);
    });
  },

  remove: function () {
    const scene = this.el.sceneEl;
    scene.removeEventListener("safari-game-started", this.onStarted);
    scene.removeEventListener("safari-animal-found", this.onFound);
    scene.removeEventListener("safari-timer-update", this.onTimer);
    scene.removeEventListener("safari-game-ended", this.onEnded);
    scene.removeEventListener("safari-game-reset", this.onReset);
    scene.removeEventListener("vuelo-started", this.onVueloStarted);
    scene.removeEventListener("vuelo-animal-seen", this.onFound);
    scene.removeEventListener("vuelo-ended", this.onVueloEnded);
  },
});
