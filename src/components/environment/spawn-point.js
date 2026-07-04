// Spawn point marker — punto donde puede aparecer un animal del Safari.
//
// Son entities ESTÁTICAS en index.html (<a-entity id="spawnPoints">), editables
// con el Inspector + aframe-watcher igual que el bosque (ver CLAUDE.md §11): la
// POSE (position + rotation) vive en el transform del host, no en el schema, así el
// gizmo del Inspector la edita y el watcher la persiste. `animal-spawner` los
// descubre con querySelectorAll("[spawn-point]") y reparte los 6 animales entre
// ellos al azar cada partida (cada animal adopta la pose del marcador que le toca).
//
// El componente solo construye un helper visual (anillo + pilar + flecha de
// dirección) para poder verlos/colocarlos. En el juego están OCULTOS por defecto;
// se revelan con el cubo de debug detrás del cartel grande (debug-visor-toggle),
// que togglea window.SPAWN_DEBUG — mismo patrón que window.COLLISION_DEBUG.

// Estado global del visor de spawn points (default oculto).
if (window.SPAWN_DEBUG === undefined) window.SPAWN_DEBUG = false;

AFRAME.registerComponent("spawn-point", {
  schema: {
    // Solo cosmético: color del helper. La pose vive en el transform del host.
    color: { type: "color", default: "#00E5FF" },
  },

  init: function () {
    // Contenedor del helper (una sola entity que agrupa las mallas visuales, para
    // togglear su visibilidad de una).
    const helper = document.createElement("a-entity");

    // Anillo plano a ras de suelo (marca el punto en el mapa).
    const ring = document.createElement("a-torus");
    ring.setAttribute("radius", "0.6");
    ring.setAttribute("radius-tubular", "0.05");
    ring.setAttribute("rotation", "90 0 0"); // acostado sobre el piso (plano XZ)
    ring.setAttribute("position", "0 0.05 0");
    ring.setAttribute(
      "material",
      `shader: flat; color: ${this.data.color}; opacity: 0.85; transparent: true`
    );
    helper.appendChild(ring);

    // Pilar vertical translúcido, para ubicarlo de lejos.
    const pole = document.createElement("a-cylinder");
    pole.setAttribute("radius", "0.06");
    pole.setAttribute("height", "2");
    pole.setAttribute("position", "0 1 0");
    pole.setAttribute(
      "material",
      `shader: flat; color: ${this.data.color}; opacity: 0.35; transparent: true`
    );
    helper.appendChild(pole);

    // Flecha (cono) que apunta a -Z local: la dirección a la que MIRARÁ el animal
    // (los entities de A-Frame miran a -Z). Orientarla en el Inspector = orientar
    // al animal. Un cono de A-Frame apunta a +Y; lo rotamos -90° en X para que su
    // punta mire a -Z.
    const arrow = document.createElement("a-cone");
    arrow.setAttribute("radius-bottom", "0.18");
    arrow.setAttribute("radius-top", "0");
    arrow.setAttribute("height", "0.5");
    arrow.setAttribute("position", "0 0.25 -0.7");
    arrow.setAttribute("rotation", "-90 0 0");
    arrow.setAttribute(
      "material",
      `shader: flat; color: ${this.data.color}; opacity: 0.9; transparent: true`
    );
    helper.appendChild(arrow);

    this.el.appendChild(helper);
    this.helper = helper;

    this.updateDebugVisibility();
  },

  // Muestra/oculta el helper según window.SPAWN_DEBUG. Lo llama debug-visor-toggle
  // al clickear el cubo (mismo patrón que collision-cube.updateDebugVisibility).
  updateDebugVisibility: function () {
    if (this.helper) this.helper.setAttribute("visible", !!window.SPAWN_DEBUG);
  },
});
