// Safari "the forest is burning" environment arc. As the round timer runs down,
// the world degrades linearly with progress p = 1 - timeRemaining/timeLimit:
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
  },

  onTimer: function (evt) {
    const { timeRemaining, timeLimit } = evt.detail;
    const p = Math.max(0, Math.min(1, 1 - timeRemaining / timeLimit));
    this.applyP(p);
  },

  onEnded: function () {
    // safari-game-ended fires during the fade-to-black as the player is
    // teleported back in front of the sign — restore the forest and sky to
    // normal for both win and loss so they return to a healthy world.
    this.recovering = false;
    this.applyP(0, true);
  },

  onReset: function () {
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
    this.el.sceneEl.setAttribute("fog", "color", "#" + this._tmp.getHexString());

    // Trees: kill the first N (stable scene order), revive the rest.
    const targetDead = Math.floor(p * this.trees.length);
    if (targetDead !== this.deadCount || force) {
      this.trees.forEach((tree, i) => {
        if (i < targetDead) tree.kill();
        else tree.revive();
      });
      this.deadCount = targetDead;
    }
  },

  remove: function () {
    const scene = this.el.sceneEl;
    scene.removeEventListener("safari-game-started", this.onStarted);
    scene.removeEventListener("safari-timer-update", this.onTimer);
    scene.removeEventListener("safari-game-ended", this.onEnded);
    scene.removeEventListener("safari-game-reset", this.onReset);
  },
});
