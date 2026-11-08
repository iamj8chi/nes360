// cinematic-lock — en el #cameraRig. Durante los finales del Safari el jugador solo
// puede mover la cabeza: se apaga toda la locomoción y se libera al volver al menú.
//
//  - safari-ending-started → traba: WASD (movement-controls), sticks (vr-locomotion),
//    pinch-teleport (+ oculta su marcador) y boundary-collision (la camioneta del
//    final bueno está fuera del radio de la isla y el boundary la "devolvería").
//  - safari-game-ended → destraba. Ya llega a negro y con el rig de vuelta en 0 0 0
//    (lo hace returnToStart antes de emitir), así que el boundary no salta.
//
// La cabeza queda libre: look-controls en desktop y el tracking en VR no se tocan.
// flight-locomotion no se toca porque ya está desactivado (CLAUDE.md §8 gap #1).
AFRAME.registerComponent("cinematic-lock", {
  init: function () {
    this.locked = false;
    this.lock = this.lock.bind(this);
    this.unlock = this.unlock.bind(this);
    this.el.sceneEl.addEventListener("safari-ending-started", this.lock);
    this.el.sceneEl.addEventListener("safari-game-ended", this.unlock);
  },

  lock: function () {
    if (this.locked) return;
    this.locked = true;
    this.setLocomotion(false);
  },

  unlock: function () {
    if (!this.locked) return;
    this.locked = false;
    this.setLocomotion(true);
  },

  setLocomotion: function (on) {
    const el = this.el;

    if (el.components["movement-controls"]) {
      el.setAttribute("movement-controls", "enabled", on);
    }

    const vr = el.components["vr-locomotion"];
    if (vr) vr.enabled = on;

    const pinch = el.components["pinch-teleport"];
    if (pinch) {
      pinch.enabled = on;
      if (!on) {
        // Cortar un apuntado en curso: si no, al soltar el pinch teletransportaría.
        pinch.aiming = false;
        pinch.hasTarget = false;
        if (pinch.marker) pinch.marker.setAttribute("visible", "false");
      }
    }

    if (el.components["boundary-collision"]) {
      el.setAttribute("boundary-collision", "enabled", on);
    }
  },

  remove: function () {
    this.el.sceneEl.removeEventListener("safari-ending-started", this.lock);
    this.el.sceneEl.removeEventListener("safari-game-ended", this.unlock);
  },
});
