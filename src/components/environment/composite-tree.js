AFRAME.registerComponent("composite-tree", {
  schema: {
    scale: { type: "number", default: 5.0 },
    colliderRadius: { type: "number", default: 0.5 },
    windStrengthX: { type: "number", default: 0.02 },
    windStrengthY: { type: "number", default: 0.01 },
    windStrengthZ: { type: "number", default: 0.02 },
    windFreqA: { type: "number", default: 0.2 },
    windFreqB: { type: "number", default: 0.2 },
    windRotStrength: { type: "number", default: 0.01 },
    type: { type: "string", default: "normal" }, // normal, dead, shrub, pasto, or palma
    canopyHeight: { type: "number", default: -1.1 }, // Override height for shrubs
  },

  init: function () {
    const isNormal = this.data.type === "normal";
    const isDead = this.data.type === "dead";
    const isShrub = this.data.type === "shrub";
    const isPasto = this.data.type === "pasto";
    const isPalma = this.data.type === "palma";

    // Declare entities
    var canopy, pasto;

    // Create base tree entity (for normal, dead, and palma trees)
    if (isNormal || isDead || isPalma) {
      var base = document.createElement("a-entity");
      // Use karanday trunk for palma, samuu for others
      base.setAttribute(
        "gltf-model",
        isPalma ? "#karandayTroncoModel" : "#samuuModel"
      );
      base.setAttribute("shadow", "cast: true");
      this.el.appendChild(base);
    }

    // Create invisible collider cylinder
    var collider = document.createElement("a-cylinder");
    collider.setAttribute("radius", this.data.colliderRadius);
    // Adjust height based on type
    const colliderHeight = isShrub || isPasto ? 2 : 6;
    collider.setAttribute("height", colliderHeight.toString());
    collider.setAttribute("material", "opacity: 0");
    collider.setAttribute("position", `0 ${colliderHeight / 2} 0`);
    this.el.appendChild(collider);

    // Create canopy entity (not for dead trees)
    if (isNormal || isShrub || isPalma) {
      canopy = document.createElement("a-entity");
      // Use karanday hoja for palma, samuu canopy for others
      canopy.setAttribute(
        "gltf-model",
        isPalma ? "#karandayHojaModel" : "#samuuCanopyModel"
      );
      canopy.setAttribute("shadow", "cast: true");

      // For shrubs, position canopy at ground level and scale it differently
      if (isShrub) {
        const height = this.data.canopyHeight || 0;
        canopy.setAttribute("position", `0 ${height} 0`);
        canopy.setAttribute("scale", "1.2 0.8 1.2");
      }

      canopy.setAttribute("canopy-wind", {
        strengthX: this.data.windStrengthX,
        strengthY: this.data.windStrengthY,
        strengthZ: this.data.windStrengthZ,
        freqA: this.data.windFreqA,
        freqB: this.data.windFreqB,
        rotStrength: this.data.windRotStrength,
      });
    }

    // Create pasto entity (grass)
    if (isPasto) {
      pasto = document.createElement("a-entity");
      pasto.setAttribute("gltf-model", "#pastoModel");
      pasto.setAttribute("shadow", "cast: true");

      // For pasto, position at ground level with +1.1 Y offset
      const height = (this.data.canopyHeight || 0) + 1.0;
      pasto.setAttribute("position", `0 ${height} 0`);
      pasto.setAttribute("scale", "3 4 3");

      pasto.setAttribute("canopy-wind", {
        strengthX: this.data.windStrengthX * 0.25,
        strengthY: 0,
        strengthZ: this.data.windStrengthZ * 0.25,
        freqA: this.data.windFreqA,
        freqB: this.data.windFreqB,
        rotStrength: this.data.windRotStrength,
      });
    }

    // Set scale on parent (this element)
    this.el.setAttribute("scale", {
      x: this.data.scale,
      y: this.data.scale,
      z: this.data.scale,
    });

    // Add children to parent
    if (isNormal || isShrub || isPalma) {
      this.el.appendChild(canopy);
    }
    if (isPasto) {
      this.el.appendChild(pasto);
    }
    this.el.appendChild(collider);
  },
});
