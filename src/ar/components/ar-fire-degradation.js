// ar-fire-degradation — adaptación de environment-degradation (juego principal) al
// minijuego AR. Va en <a-scene>. Conduce el incendio según el tiempo restante con
// la MISMA curva exponencial p = t³: el bosque aguanta sano la primera mitad y el
// fuego se acelera al final.
//
// Diferencias vs el original: en AR no hay <a-sky> (el fondo es la cámara real), así
// que el "cielo se pone rojo" se reemplaza por un vignette DOM rojo. Mata/revive los
// ar-tree del diorama (decorativos + arbustos que esconden animales) en orden estable,
// y rampa el volumen del loop de fuego.

const DEGRADATION_EXP = 3; // exponente de la curva (mismo que el juego principal)
const FIRE_MAX_VOLUME = 0.9;
const P_EPSILON = 0.004; // throttle: solo reaplicar si p cambió lo suficiente

AFRAME.registerComponent("ar-fire-degradation", {
  init: function () {
    this.trees = [];
    this.lastAppliedP = -1;
    this.vignette = document.getElementById("vignette");

    this.fireAudio = new Audio("/assets/sfx/fire.mp3");
    this.fireAudio.loop = true;
    this.fireAudio.volume = 0;

    this.onStarted = () => this.onGameStarted();
    this.onTimer = (evt) => this.onTimerUpdate(evt.detail);
    this.onEnded = () => this.reset();

    const scene = this.el.sceneEl;
    scene.addEventListener("ar-game-started", this.onStarted);
    scene.addEventListener("ar-timer-update", this.onTimer);
    scene.addEventListener("ar-game-ended", this.onEnded);
  },

  // (Re)construye la lista de árboles quemables. Se llama al arrancar la partida,
  // cuando ya existen los arbustos que esconden a los animales.
  collectTrees: function () {
    const diorama = document.getElementById("diorama");
    if (!diorama) return;
    const els = diorama.querySelectorAll("[ar-tree]");
    this.trees = [];
    els.forEach((el) => {
      const comp = el.components && el.components["ar-tree"];
      if (comp) this.trees.push(comp);
    });
  },

  onGameStarted: function () {
    // Esperar un frame a que los arbustos de los animales estén montados.
    setTimeout(() => {
      this.collectTrees();
      this.trees.forEach((t) => t.revive());
      this.lastAppliedP = -1;
      this.applyP(0, true);
      this.fireAudio.currentTime = 0;
      this.fireAudio.volume = 0;
      this.fireAudio.play().catch(() => {});
    }, 120);
  },

  onTimerUpdate: function (detail) {
    const { timeRemaining, timeLimit } = detail;
    if (!timeLimit) return;
    const t = 1 - timeRemaining / timeLimit; // progreso bruto [0,1]
    const p = Math.pow(Math.max(0, Math.min(1, t)), DEGRADATION_EXP);
    if (Math.abs(p - this.lastAppliedP) < P_EPSILON) return;
    this.applyP(p, false);
  },

  applyP: function (p, force) {
    this.lastAppliedP = p;

    // Matar/revivir incrementalmente en orden estable.
    const targetDead = Math.floor(p * this.trees.length);
    for (let i = 0; i < this.trees.length; i++) {
      if (i < targetDead) this.trees[i].kill();
      else if (force) this.trees[i].revive();
    }

    // Volumen del loop de fuego.
    this.fireAudio.volume = Math.min(FIRE_MAX_VOLUME, p * FIRE_MAX_VOLUME);

    // Vignette rojo (sustituto del cielo que se pone rojo).
    if (this.vignette) this.vignette.style.opacity = String(p);
  },

  // Restaurar a sano: revivir todo, parar fuego, vignette a 0.
  reset: function () {
    this.trees.forEach((t) => t.revive());
    this.lastAppliedP = -1;
    this.fireAudio.pause();
    this.fireAudio.currentTime = 0;
    this.fireAudio.volume = 0;
    if (this.vignette) this.vignette.style.opacity = "0";
  },

  remove: function () {
    const scene = this.el.sceneEl;
    scene.removeEventListener("ar-game-started", this.onStarted);
    scene.removeEventListener("ar-timer-update", this.onTimer);
    scene.removeEventListener("ar-game-ended", this.onEnded);
    this.fireAudio.pause();
  },
});
