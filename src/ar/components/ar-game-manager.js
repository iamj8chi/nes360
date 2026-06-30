// ar-game-manager — hub de estado del minijuego AR (espejo reducido de
// safari-game-manager). Va en <a-scene>. Maneja: detección del marcador → overlay
// "Empezar", placement aleatorio de los 6 animales escondidos, timer de 1 min,
// conteo de hallazgos, victoria/derrota, y los overlays/HUD del DOM.

import {
  ANIMAL_TYPES,
  SPAWN_POSITIONS,
  animalModelId,
  ANIMAL_SCALE,
  HIDER_BUSH_SCALE,
} from "../ar-layout.js";

// Baraja una copia (Fisher–Yates). No usamos Math.random fuera de runtime del juego,
// así que está OK acá (no afecta el determinismo de ningún build).
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function playSfx(name) {
  const a = new Audio(`/assets/sfx/${name}.mp3`);
  a.play().catch(() => {});
}

AFRAME.registerComponent("ar-game-manager", {
  schema: {
    timeLimit: { type: "number", default: 60 },
  },

  init: function () {
    this.gameActive = false;
    this.markerSeen = false;
    this.timeRemaining = this.data.timeLimit;
    this.animalsFound = new Set();
    this.totalAnimals = ANIMAL_TYPES.length;
    this.timerId = null;
    this.spawned = []; // entidades creadas por partida (animales + arbustos)

    // Cachear refs del DOM (la capa de UI está fuera del <a-scene>).
    this.dom = {
      scanHint: document.getElementById("scanHint"),
      startOverlay: document.getElementById("startOverlay"),
      startBtn: document.getElementById("startBtn"),
      hud: document.getElementById("hud"),
      found: document.getElementById("found"),
      timer: document.getElementById("timer"),
      endOverlay: document.getElementById("endOverlay"),
      endTitle: document.getElementById("endTitle"),
      endText: document.getElementById("endText"),
      replayBtn: document.getElementById("replayBtn"),
    };

    this.dom.startBtn.addEventListener("click", () => this.startGame());
    this.dom.replayBtn.addEventListener("click", () => this.startGame());

    // Hallazgo de animal (tap).
    this.el.sceneEl.addEventListener("ar-animal-clicked", (evt) => {
      if (this.gameActive) this.checkAnimal(evt.detail.animalType);
    });

    // Detección del marcador: a la primera, ofrecer "Empezar" (si estamos ociosos).
    setTimeout(() => this.wireMarker(), 100);
  },

  wireMarker: function () {
    const marker = document.getElementById("marker");
    if (!marker) return;
    marker.addEventListener("markerFound", () => {
      this.markerSeen = true;
      if (this.dom.scanHint) this.dom.scanHint.hidden = true;
      // Solo ofrecer Start si no hay partida ni overlay de fin abierto.
      if (!this.gameActive && this.dom.endOverlay.hidden) {
        this.dom.startOverlay.hidden = false;
      }
    });
  },

  startGame: function () {
    // Reset de estado.
    this.clearSpawned();
    this.animalsFound.clear();
    this.timeRemaining = this.data.timeLimit;
    this.gameActive = true;

    // UI.
    this.dom.startOverlay.hidden = true;
    this.dom.endOverlay.hidden = true;
    this.dom.scanHint.hidden = true;
    this.dom.hud.hidden = false;
    this.updateHud();

    // Colocar los 6 animales escondidos en posiciones al azar.
    this.placeAnimals();

    playSfx("game-start");
    this.el.sceneEl.emit("ar-game-started");

    // Timer 1 Hz. OJO: el método NO puede llamarse `tick` — A-Frame reserva `tick`
    // como hook de ciclo de vida y lo invoca en CADA frame (~60 Hz), lo que hacía
    // que el minuto se consumiera en ~1 segundo.
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => this.stepTimer(), 1000);
  },

  placeAnimals: function () {
    const diorama = document.getElementById("diorama");
    if (!diorama) return;
    const spots = shuffled(SPAWN_POSITIONS).slice(0, this.totalAnimals);

    ANIMAL_TYPES.forEach((type, i) => {
      const spot = spots[i];

      // Arbusto que lo esconde (ar-tree shrub → también se quema).
      const bush = document.createElement("a-entity");
      bush.setAttribute("position", `${spot.x} ${spot.y} ${spot.z}`);
      bush.setAttribute("ar-tree", { type: "shrub", scale: HIDER_BUSH_SCALE });
      diorama.appendChild(bush);
      this.spawned.push(bush);

      // Animal, ligeramente adelante del arbusto para que asome y sea tapeable.
      const animal = document.createElement("a-entity");
      animal.setAttribute("data-animal-type", type);
      animal.setAttribute("gltf-model", animalModelId(type));
      animal.setAttribute("position", `${spot.x} ${spot.y} ${spot.z + 0.02}`);
      animal.setAttribute(
        "scale",
        `${ANIMAL_SCALE} ${ANIMAL_SCALE} ${ANIMAL_SCALE}`
      );
      animal.setAttribute("rotation", `0 ${Math.floor(Math.random() * 360)} 0`);
      animal.classList.add("tappable", "animal");
      animal.setAttribute("animal-tap", "");
      diorama.appendChild(animal);
      this.spawned.push(animal);
    });
  },

  stepTimer: function () {
    if (!this.gameActive) return;
    this.timeRemaining = Math.max(0, this.timeRemaining - 1);
    this.updateHud();
    this.el.sceneEl.emit("ar-timer-update", {
      timeRemaining: this.timeRemaining,
      timeLimit: this.data.timeLimit,
    });
    if (this.timeRemaining <= 0) this.endGame(false);
  },

  checkAnimal: function (type) {
    if (this.animalsFound.has(type)) return;
    this.animalsFound.add(type);
    playSfx("game-found");
    this.updateHud();
    this.el.sceneEl.emit("ar-animal-found", {
      animalType: type,
      totalFound: this.animalsFound.size,
      totalAnimals: this.totalAnimals,
    });
    if (this.animalsFound.size >= this.totalAnimals) this.endGame(true);
  },

  endGame: function (won) {
    if (!this.gameActive) return;
    this.gameActive = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    this.el.sceneEl.emit("ar-game-ended", { won });

    this.dom.hud.hidden = true;
    this.dom.endTitle.textContent = won
      ? "🎉 ¡Los salvaste!"
      : "🔥 Se quemó el bosque";
    this.dom.endText.textContent = won
      ? "Encontraste a los 6 animales a tiempo. ¡No están solos!"
      : "Se acabó el tiempo. Probá de nuevo y salvalos a todos.";
    this.dom.endOverlay.hidden = false;

    playSfx(won ? "game-win" : "game-over");
  },

  updateHud: function () {
    this.dom.found.textContent = `${this.animalsFound.size}/${this.totalAnimals}`;
    this.dom.timer.textContent = String(this.timeRemaining);
    this.dom.timer.classList.toggle("low", this.timeRemaining <= 10);
  },

  clearSpawned: function () {
    for (const el of this.spawned) {
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    this.spawned = [];
  },
});
