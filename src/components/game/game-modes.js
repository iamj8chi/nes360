// Idle / Safari mode visibility. Game state and the timer live in
// safari-game-manager; this component just toggles which set of animals is visible:
//  - Idle  (start, and after a game ends): showcase animals behind spawn are shown,
//    the scattered hunt animals are hidden.
//  - Safari (after the Start Safari sign): showcase hidden, hunt animals shown.
// Also hides the decorative sky flamingos (#animals) during Safari, restoring them in Idle.
//  - Ending (safari-ending-started): all three hidden; the endings bring their own animals.
// Driven by the safari-game-started / safari-ending-started / safari-game-ended events.
AFRAME.registerComponent("game-modes", {
  init: function () {
    this.setIdle = this.setIdle.bind(this);
    this.setSafari = this.setSafari.bind(this);

    // Resolve the animal containers once the scene graph is ready.
    setTimeout(() => {
      this.showcase = document.getElementById("showcaseAnimals");
      this.hunt = document.getElementById("huntAnimals");
      this.flyers = document.getElementById("animals"); // decorative sky flamingos
      this.setIdle();
    }, 100);

    this.setEnding = this.setEnding.bind(this);

    this.el.sceneEl.addEventListener("safari-game-started", this.setSafari);
    this.el.sceneEl.addEventListener("safari-ending-started", this.setEnding);
    this.el.sceneEl.addEventListener("safari-game-ended", this.setIdle);
  },

  setIdle: function () {
    if (this.showcase) this.showcase.setAttribute("visible", "true");
    if (this.hunt) this.hunt.setAttribute("visible", "false");
    if (this.flyers) this.flyers.setAttribute("visible", "true");
  },

  setSafari: function () {
    if (this.showcase) this.showcase.setAttribute("visible", "false");
    if (this.hunt) this.hunt.setAttribute("visible", "true");
    if (this.flyers) this.flyers.setAttribute("visible", "false");
  },

  // Finales (safari-ending-started): ningún set del juego a la vista. Los finales
  // traen sus propios animales (enjaulados en la camioneta, o en círculo); si no,
  // en el final malo se verían además los de caza sueltos por el mapa.
  setEnding: function () {
    if (this.showcase) this.showcase.setAttribute("visible", "false");
    if (this.hunt) this.hunt.setAttribute("visible", "false");
    if (this.flyers) this.flyers.setAttribute("visible", "false");
  },

  remove: function () {
    this.el.sceneEl.removeEventListener("safari-game-started", this.setSafari);
    this.el.sceneEl.removeEventListener(
      "safari-ending-started",
      this.setEnding
    );
    this.el.sceneEl.removeEventListener("safari-game-ended", this.setIdle);
  },
});
