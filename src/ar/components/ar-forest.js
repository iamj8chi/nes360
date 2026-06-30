// ar-forest — monta los árboles/arbustos decorativos del diorama desde TREE_LAYOUT.
// Va en #diorama (hijo del marcador). Los animales escondidos los monta aparte
// ar-game-manager en cada partida. Todos los ar-tree (decorativos + arbustos que
// esconden animales) los quema ar-fire-degradation.

import { TREE_LAYOUT } from "../ar-layout.js";

AFRAME.registerComponent("ar-forest", {
  init: function () {
    for (const t of TREE_LAYOUT) {
      const el = document.createElement("a-entity");
      el.setAttribute("position", `${t.x} ${t.y} ${t.z}`);
      el.setAttribute("ar-tree", { type: t.type, scale: t.scale });
      el.classList.add("decor-tree");
      this.el.appendChild(el);
    }
  },
});
