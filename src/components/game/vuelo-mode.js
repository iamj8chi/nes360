// vuelo-mode — orquesta el MODO VUELO (sandbox de exploración con objetivo ligero).
// Vive en <a-scene>. Calca el patrón de safari-game-manager (fade + teleport) y
// game-modes (toggles de visibilidad), pero SIN timer ni condición de derrota.
//
//  - Entrar: click en el cartel Vuelo → evento `vuelo-enter`.
//  - Salir:  click en el cartel principal → evento `vuelo-exit`.
//  - Recolección ligera: clickear los 6 animales los marca como "vistos" (reutiliza
//    `safari-animal-clicked`, que safari-game-manager ignora fuera de su partida).
//
// Emite `vuelo-started` / `vuelo-ended` (para UI/tracker) y `vuelo-animal-seen`.
AFRAME.registerComponent("vuelo-mode", {
  init: function () {
    this.active = false;
    this.seen = new Set();
    this.animalTypes = [
      "flamingo",
      "jaguarete",
      "nandu",
      "jurumi",
      "tagua",
      "tatu",
    ];

    this.enter = this.enter.bind(this);
    this.exit = this.exit.bind(this);
    this.onAnimalClicked = this.onAnimalClicked.bind(this);

    this.el.addEventListener("vuelo-enter", this.enter);
    this.el.addEventListener("vuelo-exit", this.exit);
    this.el.addEventListener("safari-animal-clicked", this.onAnimalClicked);

    // Resolver referencias del grafo una vez listo (mismo patrón que game-modes).
    setTimeout(() => {
      this.carteles = document.getElementById("carteles");
      this.showcase = document.getElementById("showcaseAnimals");
      this.hunt = document.getElementById("huntAnimals");
      this.cameraRig = document.getElementById("cameraRig");
    }, 100);
  },

  flight: function () {
    return this.cameraRig
      ? this.cameraRig.components["flight-locomotion"]
      : null;
  },

  fade: function () {
    return this.cameraRig ? this.cameraRig.components["screen-fade"] : null;
  },

  enter: function () {
    if (this.active) return;
    // No entrar si el Safari está corriendo.
    const mgr = document.getElementById("gameManager");
    if (mgr && mgr.components["safari-game-manager"]?.gameActive) return;

    const fade = this.fade();
    const setup = () => {
      this.active = true;
      this.seen.clear();

      if (this.carteles) this.carteles.setAttribute("visible", "false");
      if (this.showcase) this.showcase.setAttribute("visible", "false");
      if (this.hunt) this.hunt.setAttribute("visible", "true");

      // Activar vuelo y silenciar el thumbstick (vr-locomotion) para no competir.
      const flight = this.flight();
      if (flight) flight.enable();
      this.setVrLocomotion(false);

      this.el.emit("vuelo-started");
    };

    if (fade) {
      fade.fadeOut(() => {
        setup();
        setTimeout(() => fade.fadeIn(), 300);
      });
    } else {
      setup();
    }
  },

  exit: function () {
    if (!this.active) return;

    const fade = this.fade();
    const teardown = () => {
      this.active = false;

      const flight = this.flight();
      if (flight) flight.disable();
      this.setVrLocomotion(true);

      // Volver al spawn y restaurar Idle.
      if (this.cameraRig) {
        this.cameraRig.setAttribute("position", "0 0 0");
        const head = document.getElementById("head");
        if (head) head.object3D.rotation.set(0, 0, 0);
      }
      if (this.hunt) this.hunt.setAttribute("visible", "false");
      if (this.showcase) this.showcase.setAttribute("visible", "true");
      if (this.carteles) this.carteles.setAttribute("visible", "true");

      this.el.emit("vuelo-ended");
    };

    if (fade) {
      fade.fadeOut(() => {
        teardown();
        setTimeout(() => fade.fadeIn(), 300);
      });
    } else {
      teardown();
    }
  },

  onAnimalClicked: function (evt) {
    if (!this.active) return;
    const type = evt.detail && evt.detail.animalType;
    if (!type || this.seen.has(type)) return;

    this.seen.add(type);
    this.el.emit("vuelo-animal-seen", {
      animalType: type,
      totalSeen: this.seen.size,
      totalAnimals: this.animalTypes.length,
    });

    if (this.seen.size >= this.animalTypes.length) {
      this.showMessage("¡Viste todos los animales!", 4000);
    }
  },

  // Habilita/inhabilita el componente de locomoción por thumbstick durante el vuelo.
  setVrLocomotion: function (on) {
    if (!this.cameraRig) return;
    const loco = this.cameraRig.components["vr-locomotion"];
    if (loco) loco.enabled = on; // se respeta en su tick (ver movement.js)
  },

  // Mensaje breve anclado a la cámara (mismo patrón que safari-game-manager).
  showMessage: function (text, duration) {
    let messageEl = document.getElementById("gameMessage");
    const camera = document.querySelector("[camera]");
    if (!messageEl) {
      messageEl = document.createElement("a-text");
      messageEl.setAttribute("id", "gameMessage");
      messageEl.setAttribute("position", "0 0.5 -2");
      messageEl.setAttribute("align", "center");
      messageEl.setAttribute("width", "4");
      messageEl.setAttribute("color", "#FFFFFF");
      messageEl.setAttribute("shader", "msdf");
      // Local MSDF atlas with Spanish accents + ñ (CDN Roboto-msdf omits them).
      messageEl.setAttribute("font", "/assets/fonts/arial-es-msdf.json");
      messageEl.setAttribute("font-image", "/assets/fonts/arial-es-msdf.png");
      messageEl.setAttribute("negate", "false");
      messageEl.setAttribute("outline-width", "15%");
      messageEl.setAttribute("outline-color", "#000000");
      if (camera) camera.appendChild(messageEl);
      else this.el.appendChild(messageEl);
    }
    messageEl.setAttribute("value", text);
    messageEl.setAttribute("visible", true);
    if (duration) {
      setTimeout(() => messageEl.setAttribute("visible", false), duration);
    }
  },

  remove: function () {
    this.el.removeEventListener("vuelo-enter", this.enter);
    this.el.removeEventListener("vuelo-exit", this.exit);
    this.el.removeEventListener("safari-animal-clicked", this.onAnimalClicked);
  },
});
