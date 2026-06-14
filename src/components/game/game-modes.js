// Idle / Safari mode visibility. Game state and the timer live in
// safari-game-manager; this component just toggles which set of animals is visible:
//  - Idle  (start, and after a game ends): showcase animals behind spawn are shown,
//    the scattered hunt animals are hidden.
//  - Safari (after the Start Safari sign): showcase hidden, hunt animals shown.
// Driven by the existing safari-game-started / safari-game-ended scene events.
AFRAME.registerComponent("game-modes", {
  init: function () {
    this.setIdle = this.setIdle.bind(this);
    this.setSafari = this.setSafari.bind(this);

    // Resolve the two animal containers once the scene graph is ready.
    setTimeout(() => {
      this.showcase = document.getElementById("showcaseAnimals");
      this.hunt = document.getElementById("huntAnimals");
      this.setIdle();
    }, 100);

    this.el.sceneEl.addEventListener("safari-game-started", this.setSafari);
    this.el.sceneEl.addEventListener("safari-game-ended", this.setIdle);
  },

  setIdle: function () {
    if (this.showcase) this.showcase.setAttribute("visible", "true");
    if (this.hunt) this.hunt.setAttribute("visible", "false");
  },

  setSafari: function () {
    if (this.showcase) this.showcase.setAttribute("visible", "false");
    if (this.hunt) this.hunt.setAttribute("visible", "true");
  },

  remove: function () {
    this.el.sceneEl.removeEventListener("safari-game-started", this.setSafari);
    this.el.sceneEl.removeEventListener("safari-game-ended", this.setIdle);
  },
});
