// Safari "the forest is burning" environment arc. As the round timer runs down,
// the world degrades with progress p, eased exponentially (slow at first, then
// accelerating toward the deadline) from raw t = 1 - timeRemaining/timeLimit:
//   - the sky tints from daytime blue toward fire red,
//   - the fog tints toward smoke,
//   - living (foliaged) trees turn into dead, trunk-only trees a few at a time.
//
// When the round ends (win or loss) the forest and sky snap back to normal,
// since safari-game-ended fires behind the fade-to-black as the player is
// teleported back in front of the sign.
//
// Driven by the existing safari-* scene events emitted by safari-game-manager.

const SKY_HEALTHY = "#87ceeb";
const SKY_BURN = "#b3260b";
const FOG_HEALTHY = "#f5dca6";
const FOG_BURN = "#4a1505";

// Exponent for the degradation curve: p = t ** DEGRADATION_EXP. >1 keeps the
// forest healthy through the early game and ramps the fire up sharply near the
// deadline. Higher = more back-loaded.
const DEGRADATION_EXP = 3;

// Peak volume of the burning-forest loop, reached at p = 1.
const FIRE_MAX_VOLUME = 1.0;

// Peak opacity of the red damage vignette at p = 1.
const VIGNETTE_MAX = 0.8;

AFRAME.registerComponent("environment-degradation", {
  init: function () {
    this.currentP = 0;
    this.lastAppliedP = -1;
    this.deadCount = 0;
    this.trees = []; // composite-tree component instances that can be killed

    this._cHealthy = new THREE.Color(SKY_HEALTHY);
    this._cBurn = new THREE.Color(SKY_BURN);
    this._fHealthy = new THREE.Color(FOG_HEALTHY);
    this._fBurn = new THREE.Color(FOG_BURN);
    this._tmp = new THREE.Color();

    this.onStarted = this.onStarted.bind(this);
    this.onTimer = this.onTimer.bind(this);
    this.onEnded = this.onEnded.bind(this);
    this.onReset = this.onReset.bind(this);

    setTimeout(() => {
      this.sky = document.getElementById("sky");
      this.fireSoundEl = document.getElementById("soundFire");
      this.createVignette();
      this.collectTrees();
      this.applyP(0, true);

      const scene = this.el.sceneEl;
      scene.addEventListener("safari-game-started", this.onStarted);
      scene.addEventListener("safari-timer-update", this.onTimer);
      scene.addEventListener("safari-game-ended", this.onEnded);
      scene.addEventListener("safari-game-reset", this.onReset);

      console.log(
        `Environment degradation ready (${this.trees.length} living trees)`
      );
    }, 100);
  },

  collectTrees: function () {
    const els = document.querySelectorAll("[composite-tree]");
    this.trees = [];
    els.forEach((el) => {
      const ct = el.components && el.components["composite-tree"];
      if (ct && ct.isAlive) this.trees.push(ct);
    });
  },

  onStarted: function () {
    if (!this.trees.length) this.collectTrees();
    this.applyP(0, true);
    // Start the fire loop silent; the timer ramps it up via applyP().
    this.playFire();
  },

  onTimer: function (evt) {
    const { timeRemaining, timeLimit } = evt.detail;
    const t = Math.max(0, Math.min(1, 1 - timeRemaining / timeLimit));
    const p = Math.pow(t, DEGRADATION_EXP);
    this.applyP(p);
  },

  onEnded: function () {
    // safari-game-ended fires during the fade-to-black as the player is
    // teleported back in front of the sign — restore the forest and sky to
    // normal for both win and loss so they return to a healthy world.
    this.recovering = false;
    this.stopFire();
    this.applyP(0, true);
  },

  onReset: function () {
    this.stopFire();
    this.applyP(0, true);
  },

  // Apply degradation state p∈[0,1]. Sky/fog tint every meaningful step; trees
  // only flip when they cross the kill threshold (kill()/revive() are idempotent).
  applyP: function (p, force) {
    if (!force && Math.abs(p - this.lastAppliedP) < 0.004) return;
    this.lastAppliedP = p;
    this.currentP = p;

    // Sky colour
    if (this.sky) {
      this._tmp.copy(this._cHealthy).lerp(this._cBurn, p);
      this.sky.setAttribute("color", "#" + this._tmp.getHexString());
    }

    // Fog colour (scene-level)
    this._tmp.copy(this._fHealthy).lerp(this._fBurn, p);
    this.el.sceneEl.setAttribute(
      "fog",
      "color",
      "#" + this._tmp.getHexString()
    );

    // Trees: kill the first N (stable scene order), revive the rest.
    const targetDead = Math.floor(p * this.trees.length);
    if (targetDead !== this.deadCount || force) {
      this.trees.forEach((tree, i) => {
        if (i < targetDead) tree.kill();
        else tree.revive();
      });
      this.deadCount = targetDead;
    }

    // Burning-forest loop swells with the same exponential progress.
    this.setFireVolume(p * FIRE_MAX_VOLUME);

    // Red damage vignette deepens as the fire gets worse.
    this.setVignette(p * VIGNETTE_MAX);
  },

  // --- Red damage vignette (camera-attached) ------------------------------

  // A flat plane pinned in front of the camera with a radial red gradient
  // (transparent centre → opaque red edges). depthTest/Write off + a renderOrder
  // below the fade overlay so the end-of-round fade still covers it.
  createVignette: function () {
    const cam = document.getElementById("head");
    if (!cam || !cam.object3D) return;

    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.28,
      size / 2,
      size / 2,
      size * 0.62
    );
    grad.addColorStop(0, "rgba(150, 0, 0, 0)");
    grad.addColorStop(1, "rgba(120, 0, 0, 1)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    if ("SRGBColorSpace" in THREE) tex.colorSpace = THREE.SRGBColorSpace;

    this.vignetteMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4),
      this.vignetteMat
    );
    mesh.position.set(0, 0, -0.2);
    mesh.renderOrder = 900; // under the screen-fade overlay (renderOrder 999)
    mesh.frustumCulled = false;
    mesh.visible = false;
    this.vignetteMesh = mesh;
    cam.object3D.add(mesh);
  },

  setVignette: function (opacity) {
    if (!this.vignetteMat) return;
    this.vignetteMat.opacity = opacity;
    this.vignetteMesh.visible = opacity > 0.001;
  },

  // --- Fire loop (a-frame sound component on #soundFire) -------------------

  playFire: function () {
    const sc = this.fireSoundEl && this.fireSoundEl.components.sound;
    if (!sc) return;
    this.setFireVolume(0);
    sc.playSound();
  },

  stopFire: function () {
    const sc = this.fireSoundEl && this.fireSoundEl.components.sound;
    if (!sc) return;
    this.setFireVolume(0);
    sc.stopSound();
  },

  // Set the loop's gain directly on the pooled THREE.Audio nodes (cheaper than
  // re-parsing the sound attribute every throttled tick).
  setFireVolume: function (vol) {
    const sc = this.fireSoundEl && this.fireSoundEl.components.sound;
    if (!sc || !sc.pool) return;
    sc.pool.children.forEach((audio) => audio.setVolume(vol));
  },

  remove: function () {
    const scene = this.el.sceneEl;
    scene.removeEventListener("safari-game-started", this.onStarted);
    scene.removeEventListener("safari-timer-update", this.onTimer);
    scene.removeEventListener("safari-game-ended", this.onEnded);
    scene.removeEventListener("safari-game-reset", this.onReset);
  },
});
