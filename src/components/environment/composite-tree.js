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
    type: { type: "string", default: "normal" }, // normal, dead, shrub, pasto, palma, or roca
    canopyHeight: { type: "number", default: -1.1 }, // Override height for shrubs
    hueVariation: { type: "number", default: 0.05 }, // ± desplazamiento de tono del follaje (0..1)
    lightVariation: { type: "number", default: 0.12 }, // ± desplazamiento de brillo del follaje
    satVariation: { type: "number", default: 0.15 }, // ± desplazamiento de saturación del follaje
  },

  init: function () {
    const isNormal = this.data.type === "normal";
    const isDead = this.data.type === "dead";
    const isShrub = this.data.type === "shrub";
    const isPasto = this.data.type === "pasto";
    const isPalma = this.data.type === "palma";
    const isRoca = this.data.type === "roca";

    // Per-instance color shift: todas las mallas de follaje de este árbol comparten
    // el mismo desplazamiento de tono/brillo, así cada árbol tiene un verde distinto
    // sin variar entre sus propias hojas. Las rocas reutilizan lightShift para un gris
    // ligeramente distinto por piedra.
    this.hueShift = (Math.random() - 0.5) * 2 * this.data.hueVariation;
    this.lightShift = (Math.random() - 0.5) * 2 * this.data.lightVariation;
    this.satShift = (Math.random() - 0.5) * 2 * this.data.satVariation;

    // Declare entities
    var canopy, pasto;

    // Whether this tree has foliage that can be "killed" (turned into a dead,
    // trunk-only tree) by the safari fire mechanic. Exposed for environment-degradation.
    this.isAlive = isNormal || isShrub || isPalma;
    this.dead = false;
    this.baseEl = null;
    this.canopyEl = null;
    this.fireEl = null;

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
      this.baseEl = base;
    }

    // Create invisible collider cylinder
    var collider = document.createElement("a-cylinder");
    collider.setAttribute("radius", this.data.colliderRadius);
    // Adjust height based on type
    const colliderHeight = isShrub || isPasto || isRoca ? 2 : 6;
    collider.setAttribute("height", colliderHeight.toString());
    collider.setAttribute("material", "opacity: 0");
    collider.setAttribute("position", `0 ${colliderHeight / 2} 0`);
    // Don't render it at all: it's a vestigial placeholder (real collision is the
    // collision-cylinder component). As an opacity:0 mesh it still wrote to the
    // depth buffer and occluded the transparent fire particles inside it.
    collider.setAttribute("visible", false);
    this.el.appendChild(collider);

    // Create canopy entity (not for dead trees). Rocks (roca) reuse the shrub
    // canopy geometry but are tinted gray and get no wind.
    if (isNormal || isShrub || isPalma || isRoca) {
      canopy = document.createElement("a-entity");
      // Use karanday hoja for palma, samuu canopy for others (incl. shrub/roca)
      canopy.setAttribute(
        "gltf-model",
        isPalma ? "#karandayHojaModel" : "#samuuCanopyModel"
      );
      canopy.setAttribute("shadow", "cast: true");

      // Shrubs and rocks sit at ground level; rocks are a bit flatter/rounder
      if (isShrub || isRoca) {
        const height = this.data.canopyHeight || 0;
        canopy.setAttribute("position", `0 ${height} 0`);
        canopy.setAttribute("scale", isRoca ? "1.3 0.7 1.3" : "1.2 0.8 1.2");
      }

      // Wind for everything except rocks (a rock doesn't sway).
      if (!isRoca) {
        canopy.setAttribute("canopy-wind", {
          strengthX: this.data.windStrengthX,
          strengthY: this.data.windStrengthY,
          strengthZ: this.data.windStrengthZ,
          freqA: this.data.windFreqA,
          freqB: this.data.windFreqB,
          rotStrength: this.data.windRotStrength,
        });
      }

      // Per-instance tint: gray for rocks, subtle green hue shift otherwise.
      // Las palmeras se excluyen del cambio de color.
      if (!isPalma) {
        this.tintOnLoad(canopy, isRoca);
      }
      this.canopyEl = canopy;
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

      // Subtle green hue variation on the grass too.
      this.tintOnLoad(pasto, false);
    }

    // Set scale on parent (this element)
    this.el.setAttribute("scale", {
      x: this.data.scale,
      y: this.data.scale,
      z: this.data.scale,
    });

    // Add children to parent
    if (isNormal || isShrub || isPalma || isRoca) {
      this.el.appendChild(canopy);
    }
    if (isPasto) {
      this.el.appendChild(pasto);
    }
    this.el.appendChild(collider);
  },

  // Turn a living tree into a dead, trunk-only tree (safari "fire" mechanic):
  // hide the foliage (consistent with the scene's native type:"dead" trees) and
  // optionally scorch the trunk toward charcoal.
  kill: function () {
    if (!this.isAlive || this.dead) return;
    this.dead = true;
    if (this.canopyEl) this.canopyEl.setAttribute("visible", false);
    this.tintTrunk(0x2a221c); // scorched brown/charcoal
    this.spawnFire();
  },

  revive: function () {
    if (!this.isAlive || !this.dead) return;
    this.dead = false;
    if (this.canopyEl) this.canopyEl.setAttribute("visible", true);
    this.tintTrunk(null); // restore original trunk material color
    this.removeFire();
  },

  // Low-poly flames at the trunk base. The fire entity is a child of this
  // (scaled-up) el, so low-poly-fire's small height/radius read in local space.
  // Shrubs sit lower, so their fire hugs the ground.
  spawnFire: function () {
    if (this.fireEl) return;
    const isShrub = this.data.type === "shrub";
    const fire = document.createElement("a-entity");
    fire.setAttribute("position", "0 0 0");
    fire.setAttribute(
      "low-poly-fire",
      isShrub ? "height: 0.25; radius: 0.18; count: 10" : ""
    );
    this.el.appendChild(fire);
    this.fireEl = fire;
  },

  removeFire: function () {
    if (!this.fireEl) return;
    if (this.fireEl.parentNode) this.fireEl.parentNode.removeChild(this.fireEl);
    this.fireEl = null;
  },

  // Tint the trunk meshes' base color to `hex`, or restore originals when `hex`
  // is null. glTF instances share material references, so on first tint we clone
  // the material per tree — otherwise scorching one tree would darken every tree
  // sharing that material, and the "original color" snapshot would be polluted by
  // an already-scorched neighbour (which left the trunks black after a round).
  tintTrunk: function (hex) {
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

  // Run a per-instance material tint once the foliage glTF is loaded. The model
  // may not be ready during init(), so we mirror canopy-wind's pattern: tint now
  // if the mesh exists, else wait for `model-loaded`.
  tintOnLoad: function (entityEl, isRock) {
    const apply = () =>
      isRock ? this.tintRock(entityEl) : this.tintFoliage(entityEl);
    if (entityEl.getObject3D("mesh")) {
      apply();
    } else {
      entityEl.addEventListener("model-loaded", apply, { once: true });
    }
  },

  // Per-instance green variation so no two trees/plants look identical. glTF
  // instances share material references, so we clone per mesh before mutating
  // (same reasoning as tintTrunk).
  //
  // Las copas son TEXTURADAS: tintar `material.color` solo multiplica la textura
  // (oscurece y no rota bien el matiz). En su lugar rotamos el matiz de la textura
  // dentro del shader vía `onBeforeCompile`: inyectamos una rotación de tono
  // (Rodrigues sobre el eje 1,1,1) justo después del muestreo del mapa, más un
  // ajuste de saturación/brillo. Cada material clonado lleva sus propios uniforms.
  tintFoliage: function (entityEl) {
    const obj = entityEl.getObject3D("mesh");
    if (!obj) return;
    const hueAngle = this.hueShift * 2 * Math.PI; // hueShift [-hueVar,hueVar] → radianes
    const satShift = this.satShift;
    const lightShift = this.lightShift;
    obj.traverse((node) => {
      if (!node.isMesh || !node.material || !node.material.color) return;
      if (node.userData.foliageTinted) return; // idempotente
      const mat = node.material.clone();
      node.material = mat;
      node.userData.foliageTinted = true;

      mat.onBeforeCompile = (shader) => {
        shader.uniforms.hueShift = { value: hueAngle };
        shader.uniforms.satShift = { value: satShift };
        shader.uniforms.lightShift = { value: lightShift };
        shader.fragmentShader =
          "uniform float hueShift;\nuniform float satShift;\nuniform float lightShift;\n" +
          "vec3 nesHueRotate(vec3 c, float a){\n" +
          "  vec3 k = vec3(0.57735);\n" +
          "  float cs = cos(a);\n" +
          "  return c*cs + cross(k,c)*sin(a) + k*dot(k,c)*(1.0-cs);\n" +
          "}\n" +
          shader.fragmentShader.replace(
            "#include <map_fragment>",
            "#include <map_fragment>\n" +
              "{\n" +
              "  vec3 nesC = nesHueRotate(diffuseColor.rgb, hueShift);\n" +
              "  float nesL = dot(nesC, vec3(0.299,0.587,0.114));\n" +
              "  nesC = mix(vec3(nesL), nesC, 1.0 + satShift);\n" +
              "  nesC *= (1.0 + lightShift);\n" +
              "  diffuseColor.rgb = clamp(nesC, 0.0, 1.0);\n" +
              "}"
          );
      };
      mat.needsUpdate = true;
    });
  },

  // Desaturate the (shrub) foliage into a gray rock, with a small per-instance
  // lightness variation so the rocks aren't all the exact same gray.
  tintRock: function (entityEl) {
    const obj = entityEl.getObject3D("mesh");
    if (!obj) return;
    obj.traverse((node) => {
      if (!node.isMesh || !node.material || !node.material.color) return;
      if (node.userData.foliageTinted) return;
      node.material = node.material.clone();
      node.userData.foliageTinted = true;
      const l = 0.45 + this.lightShift; // gris medio con leve variación por piedra
      node.material.color.setHSL(0, 0, Math.min(1, Math.max(0, l)));
      node.material.needsUpdate = true;
    });
  },
});
