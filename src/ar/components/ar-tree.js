// ar-tree — versión recortada del composite-tree del juego principal, a escala de
// marcador. Un árbol "tree" = tronco samuu + copa samuu-canopy; un "shrub" = mata
// de pasto (también sirve de arbusto donde se esconde un animal). Expone
// kill()/revive() idempotentes para la mecánica de incendio (ar-fire-degradation).
//
// Reusa los dos patrones clave de composite-tree (ver CLAUDE.md §10):
//  - clonar el material del tronco antes de tintar (los glTF comparten material por
//    referencia; sin clonar, chamuscar un árbol oscurece a todos).
//  - low-poly-fire como hijo del el escalado: height/radius leen en espacio local.

AFRAME.registerComponent("ar-tree", {
  schema: {
    type: { type: "string", default: "tree" }, // "tree" | "shrub"
    scale: { type: "number", default: 0.16 },
  },

  init: function () {
    const isShrub = this.data.type === "shrub";
    this.isShrub = isShrub;
    this.dead = false;
    this.baseEl = null; // tronco (tree) o la mata (shrub) — lo que se tinta
    this.canopyEl = null; // copa (solo tree) — se oculta al morir
    this.fireEl = null;

    if (isShrub) {
      const bush = document.createElement("a-entity");
      bush.setAttribute("gltf-model", "#pastoModel");
      bush.setAttribute("scale", "1.4 1.2 1.4");
      this.el.appendChild(bush);
      this.baseEl = bush;
    } else {
      const trunk = document.createElement("a-entity");
      trunk.setAttribute("gltf-model", "#samuuModel");
      this.el.appendChild(trunk);
      this.baseEl = trunk;

      const canopy = document.createElement("a-entity");
      canopy.setAttribute("gltf-model", "#samuuCanopyModel");
      this.el.appendChild(canopy);
      this.canopyEl = canopy;
    }

    this.el.setAttribute("scale", {
      x: this.data.scale,
      y: this.data.scale,
      z: this.data.scale,
    });
  },

  kill: function () {
    if (this.dead) return;
    this.dead = true;
    if (this.canopyEl) this.canopyEl.setAttribute("visible", false);
    this.tintBase(0x2a221c); // chamuscado
    this.spawnFire();
  },

  revive: function () {
    if (!this.dead) return;
    this.dead = false;
    if (this.canopyEl) this.canopyEl.setAttribute("visible", true);
    this.tintBase(null);
    this.removeFire();
  },

  spawnFire: function () {
    if (this.fireEl) return;
    const fire = document.createElement("a-entity");
    fire.setAttribute("position", "0 0 0");
    // Espacio local del el (escalado ~0.13–0.18): low-poly-fire usa valores grandes
    // que se reducen con la escala. Para el arbusto, fuego más bajo y chico.
    fire.setAttribute(
      "low-poly-fire",
      this.isShrub
        ? "height: 1.2; radius: 0.9; count: 10; size: 0.5"
        : "height: 4; radius: 1.6; count: 20; size: 0.6"
    );
    this.el.appendChild(fire);
    this.fireEl = fire;
  },

  removeFire: function () {
    if (!this.fireEl) return;
    if (this.fireEl.parentNode) this.fireEl.parentNode.removeChild(this.fireEl);
    this.fireEl = null;
  },

  // Tinta las mallas del baseEl, clonando el material la primera vez (anti material
  // compartido). hex=null restaura.
  tintBase: function (hex) {
    if (!this.baseEl) return;
    const obj = this.baseEl.getObject3D("mesh");
    if (!obj) return;
    obj.traverse((node) => {
      if (!node.isMesh || !node.material || !node.material.color) return;
      if (!node.userData.originalColor) {
        node.material = node.material.clone();
        node.userData.originalColor = node.material.color.clone();
      }
      if (hex === null) {
        node.material.color.copy(node.userData.originalColor);
      } else {
        node.material.color.setHex(hex);
      }
      node.material.needsUpdate = true;
    });
  },
});
