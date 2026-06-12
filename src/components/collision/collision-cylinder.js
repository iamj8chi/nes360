// Collision Cylinder Component
AFRAME.registerComponent("collision-cylinder", {
  schema: {
    radius: { type: "number", default: 2 },
    height: { type: "number", default: 8 },
    offsetX: { type: "number", default: 0 },
    offsetY: { type: "number", default: 0 },
    offsetZ: { type: "number", default: 0 },
  },

  init: function () {
    this.worldPos = new THREE.Vector3();
    console.log(
      `Collision cylinder created on ${
        this.el.id || "unnamed"
      }: radius=${this.data.radius}, height=${this.data.height}`
    );

    // Delay debug visual creation to ensure parent is ready
    setTimeout(() => {
      this.createDebugVisual();
    }, 100);
  },

  createDebugVisual: function () {
    // Create visual cylinder for debugging - solid white with emissive
    this.debugCylinder = document.createElement("a-cylinder");
    this.debugCylinder.setAttribute("radius", this.data.radius);
    this.debugCylinder.setAttribute("height", this.data.height);
    this.debugCylinder.setAttribute(
      "position",
      `${this.data.offsetX} ${
        this.data.offsetY + this.data.height / 2
      } ${this.data.offsetZ}`
    );
    this.debugCylinder.setAttribute(
      "material",
      "color: #ffffff; emissive: #ffffff; emissiveIntensity: 0; shader: flat; side: double; opacity: 0; transparent: true"
    );
    this.debugCylinder.setAttribute("visible", "true");
    this.el.appendChild(this.debugCylinder);
    console.log(
      `Debug cylinder visual created for ${
        this.el.id || "unnamed"
      }, visible=true, radius=${this.data.radius}, height=${this.data.height}`
    );
  },

  updateDebugVisibility: function () {
    if (this.debugCylinder) {
      this.debugCylinder.setAttribute("visible", window.COLLISION_DEBUG);
    }
  },

  checkCollision: function (position) {
    // Get world position of collider
    this.el.object3D.getWorldPosition(this.worldPos);

    // Apply offset
    const centerX = this.worldPos.x + this.data.offsetX;
    const centerY = this.worldPos.y + this.data.offsetY + this.data.height / 2;
    const centerZ = this.worldPos.z + this.data.offsetZ;

    // Check if position is inside the cylinder
    const dx = position.x - centerX;
    const dz = position.z - centerZ;
    const distXZ = Math.sqrt(dx * dx + dz * dz);

    const withinRadius = distXZ <= this.data.radius;
    const withinHeight =
      position.y >= centerY - this.data.height / 2 &&
      position.y <= centerY + this.data.height / 2;

    const collision = withinRadius && withinHeight;

    // Calculate normal (pointing away from center on XZ plane)
    let normalX = 0,
      normalZ = 0;
    if (distXZ > 0.0001) {
      normalX = dx / distXZ;
      normalZ = dz / distXZ;
    }

    // Debug logging when close
    if (distXZ < this.data.radius + 1) {
      console.log(
        `Collision check for ${this.el.id}: dist=${distXZ.toFixed(
          2
        )}, radius=${this.data.radius}, collision=${collision}`
      );
    }

    return {
      collision: collision,
      normal: new THREE.Vector3(normalX, 0, normalZ),
      center: new THREE.Vector3(centerX, centerY, centerZ),
      distance: distXZ,
    };
  },

  update: function () {
    // Update debug visual if it exists
    if (this.debugCylinder) {
      this.debugCylinder.setAttribute("radius", this.data.radius);
      this.debugCylinder.setAttribute("height", this.data.height);
      this.debugCylinder.setAttribute(
        "position",
        `${this.data.offsetX} ${
          this.data.offsetY + this.data.height / 2
        } ${this.data.offsetZ}`
      );
    }
  },

  remove: function () {
    if (this.debugCylinder) {
      this.el.removeChild(this.debugCylinder);
    }
  },
});
