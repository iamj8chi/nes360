// animal-tap — adaptación de animal-clickable para el minijuego AR. Cada animal
// escondido lleva este componente. Tap (raycast del cursor) → emite
// "ar-animal-clicked"; cuando el manager confirma el hallazgo, glow verde + "pop".

AFRAME.registerComponent("animal-tap", {
  init: function () {
    this.found = false;
    this.animalType = this.el.getAttribute("data-animal-type");

    this.onClick = () => {
      if (this.found) return;
      this.el.sceneEl.emit("ar-animal-clicked", {
        animalType: this.animalType,
        element: this.el,
      });
    };
    this.el.addEventListener("click", this.onClick);

    this.onFound = (evt) => {
      if (evt.detail.animalType === this.animalType) this.markAsFound();
    };
    this.el.sceneEl.addEventListener("ar-animal-found", this.onFound);
  },

  remove: function () {
    this.el.removeEventListener("click", this.onClick);
    this.el.sceneEl.removeEventListener("ar-animal-found", this.onFound);
  },

  markAsFound: function () {
    if (this.found) return;
    this.found = true;

    // Glow verde permanente (igual que animal-clickable del juego principal).
    const obj = this.el.getObject3D("mesh");
    if (obj) {
      obj.traverse((node) => {
        if (node.isMesh && node.material && node.material.emissive) {
          node.material.emissive.setHex(0x00ff00);
          node.material.emissiveIntensity = 0.8;
          node.material.needsUpdate = true;
        }
      });
    }

    // "Pop" de escala: sube y vuelve, para feedback de hallazgo.
    const base = this.el.getAttribute("scale");
    this.el.removeAttribute("animation__pop");
    this.el.setAttribute("animation__pop", {
      property: "scale",
      from: `${base.x} ${base.y} ${base.z}`,
      to: `${base.x * 1.5} ${base.y * 1.5} ${base.z * 1.5}`,
      dur: 180,
      dir: "alternate",
      loop: 1,
      easing: "easeOutQuad",
    });
  },
});
