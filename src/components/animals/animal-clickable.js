AFRAME.registerComponent("animal-clickable", {
  init: function () {
    this.found = false;
    this.animalType = this.el.getAttribute("data-animal-type");

    // Listen for click events from raycaster. Always emit so the info card opens
    // even for an already-found animal; the game manager dedupes finds itself.
    this.el.addEventListener("click", () => {
      this.onFound();
    });

    // Listen for game reset
    this.el.sceneEl.addEventListener("safari-game-reset", () => {
      this.reset();
    });

    // Check if animal was found
    this.el.sceneEl.addEventListener("safari-animal-found", (evt) => {
      if (evt.detail.animalType === this.animalType) {
        this.markAsFound();
      }
    });
  },

  onFound: function () {
    console.log(`Clicked on ${this.animalType}`);

    // Emit animal clicked event
    this.el.sceneEl.emit("safari-animal-clicked", {
      animalType: this.animalType,
      element: this.el,
    });
  },

  markAsFound: function () {
    this.found = true;
    const obj = this.el.getObject3D("mesh");
    if (!obj) return;

    // Add permanent green glow
    obj.traverse((node) => {
      if (node.isMesh && node.material) {
        if (node.material.emissive) {
          node.material.emissive.setHex(0x00ff00); // Green glow
          node.material.emissiveIntensity = 0.8;
          node.material.needsUpdate = true;
        }
      }
    });

    console.log(`${this.animalType} marked as found!`);
  },

  reset: function () {
    this.found = false;
    const obj = this.el.getObject3D("mesh");
    if (!obj) return;

    // Reset to original
    obj.traverse((node) => {
      if (node.isMesh && node.material) {
        if (node.material.emissive) {
          node.material.emissive.setHex(0x000000);
          node.material.emissiveIntensity = 0;
          node.material.needsUpdate = true;
        }
      }
    });
  },
});
