import { FOREST } from "../../data/forest.js";

// Genera el bosque desde datos (src/data/forest.js) en vez de tener ~730 líneas
// de <a-entity> a mano en index.html. Cada entrada produce una entidad
// `composite-tree`, que a su vez arma tronco/copa/colisión/viento según su tipo.
//
// Uso: <a-entity forest></a-entity>

// Tipos que reciben un colisionador (igual que el markup original: árboles y
// palmas bloquean al jugador; arbustos y pastos son atravesables).
const COLLIDABLE_TYPES = new Set(["normal", "dead", "palma"]);

AFRAME.registerComponent("forest", {
  init: function () {
    FOREST.forEach((tree, i) => {
      const el = document.createElement("a-entity");
      el.id = `forest-${i}`;
      el.setAttribute("position", {
        x: tree.pos[0],
        y: tree.pos[1],
        z: tree.pos[2],
      });
      el.setAttribute("composite-tree", {
        scale: tree.scale,
        type: tree.type || "normal",
      });
      if (COLLIDABLE_TYPES.has(tree.type)) {
        el.setAttribute("collision-cylinder", "");
      }
      this.el.appendChild(el);
    });
  },
});
