// Reparte los 6 animales del Safari (#huntAnimals) entre los spawn points
// (<a-entity id="spawnPoints"> en index.html, componente spawn-point) al azar cada
// partida, para que no aparezcan siempre en las mismas posiciones.
//
// Se engancha a `safari-game-reset`, que safari-game-manager.resetGame() emite AL
// INICIO de startGame — antes de `safari-game-started`. Por eso el compás
// (safari-compass.onStarted, que toma el snapshot de posiciones en
// safari-game-started) apunta correctamente a las posiciones nuevas sin cambios en
// safari-compass. Ver CLAUDE.md §3 (bus de eventos) y §7.
//
// Cada marcador define la POSE completa (position + rotation); el animal que le toca
// adopta ambas.

const HUNT_ANIMALS = [
  "flamingo",
  "jaguarete",
  "nandu",
  "jurumi",
  "tagua",
  "tatu",
];

// Fisher–Yates in-place. Math.random() es válido en código de la app (no es un
// script de workflow), así que la aleatoriedad real es intencional.
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

AFRAME.registerComponent("animal-spawner", {
  init: function () {
    this.assignSpawns = this.assignSpawns.bind(this);

    // Espera a que el grafo esté listo (patrón §5) para resolver #huntAnimals.
    setTimeout(() => {
      this.hunt = document.getElementById("huntAnimals");
    }, 100);

    this.el.sceneEl.addEventListener("safari-game-reset", this.assignSpawns);
  },

  assignSpawns: function () {
    const hunt = this.hunt || document.getElementById("huntAnimals");
    if (!hunt) return;

    const markers = Array.from(document.querySelectorAll("[spawn-point]"));
    if (markers.length < HUNT_ANIMALS.length) {
      console.warn(
        `animal-spawner: solo ${markers.length} spawn points (<${HUNT_ANIMALS.length}); ` +
          "los animales quedan en sus posiciones autoradas en index.html."
      );
      return;
    }

    // Baraja el pool y toma un marcador distinto para cada animal.
    const chosen = shuffle(markers.slice()).slice(0, HUNT_ANIMALS.length);

    HUNT_ANIMALS.forEach((type, i) => {
      const animal = hunt.querySelector(`[data-animal-type="${type}"]`);
      const marker = chosen[i];
      if (!animal || !marker) return;

      // #spawnPoints y #huntAnimals viven ambos en el origen, así que la pose local
      // del marcador es directamente la pose local que debe tener el animal.
      const pos = marker.getAttribute("position");
      const rot = marker.getAttribute("rotation");
      if (pos) animal.setAttribute("position", pos);
      if (rot) animal.setAttribute("rotation", rot);
    });
  },

  remove: function () {
    this.el.sceneEl.removeEventListener("safari-game-reset", this.assignSpawns);
  },
});
