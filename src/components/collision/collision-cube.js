// Collision Cube Component
AFRAME.registerComponent("collision-cube", {
  schema: {
    width: { type: "number", default: 1 },
    depth: { type: "number", default: 1 },
    height: { type: "number", default: 2 },
    offsetX: { type: "number", default: 0 },
    offsetY: { type: "number", default: 0 },
    offsetZ: { type: "number", default: 0 },
  },

  init: function () {
    this.worldPos = new THREE.Vector3();
    this.createDebugVisual();
  },

  createDebugVisual: function () {
    // Create visual box for debugging
    this.debugBox = document.createElement("a-box");
    this.debugBox.setAttribute("width", this.data.width);
    this.debugBox.setAttribute("depth", this.data.depth);
    this.debugBox.setAttribute("height", this.data.height);
    this.debugBox.setAttribute(
      "position",
      `${this.data.offsetX} ${
        this.data.offsetY + this.data.height / 2
      } ${this.data.offsetZ}`
    );
    this.debugBox.setAttribute(
      "material",
      "color: #ffffff; shader: flat; side: double; opacity: 0.8; transparent: true"
    );
    this.debugBox.setAttribute("visible", "true");
    this.el.appendChild(this.debugBox);
    console.log(`Debug box visual created, visible=true`);
  },

  updateDebugVisibility: function () {
    if (this.debugBox) {
      this.debugBox.setAttribute("visible", window.COLLISION_DEBUG);
    }
  },

  checkCollision: function (position) {
    // Get world position of collider
    this.el.object3D.getWorldPosition(this.worldPos);

    // Apply offset
    const centerX = this.worldPos.x + this.data.offsetX;
    const centerY = this.worldPos.y + this.data.offsetY + this.data.height / 2;
    const centerZ = this.worldPos.z + this.data.offsetZ;

    // Check if position is inside the box
    const halfWidth = this.data.width / 2;
    const halfDepth = this.data.depth / 2;
    const halfHeight = this.data.height / 2;

    const collision =
      position.x >= centerX - halfWidth &&
      position.x <= centerX + halfWidth &&
      position.y >= centerY - halfHeight &&
      position.y <= centerY + halfHeight &&
      position.z >= centerZ - halfDepth &&
      position.z <= centerZ + halfDepth;

    // Calculate normal (closest face)
    let normalX = 0,
      normalY = 0,
      normalZ = 0;
    if (collision) {
      const dx = position.x - centerX;
      const dy = position.y - centerY;
      const dz = position.z - centerZ;

      // Find which face is closest
      const distX = Math.abs(dx) - halfWidth;
      const distY = Math.abs(dy) - halfHeight;
      const distZ = Math.abs(dz) - halfDepth;

      if (distX > distY && distX > distZ) {
        normalX = Math.sign(dx);
      } else if (distY > distZ) {
        normalY = Math.sign(dy);
      } else {
        normalZ = Math.sign(dz);
      }
    }

    return {
      collision: collision,
      normal: new THREE.Vector3(normalX, normalY, normalZ),
      center: new THREE.Vector3(centerX, centerY, centerZ),
      distance: 0,
    };
  },

  update: function () {
    // Update debug visual if it exists
    if (this.debugBox) {
      this.debugBox.setAttribute("width", this.data.width);
      this.debugBox.setAttribute("depth", this.data.depth);
      this.debugBox.setAttribute("height", this.data.height);
      this.debugBox.setAttribute(
        "position",
        `${this.data.offsetX} ${
          this.data.offsetY + this.data.height / 2
        } ${this.data.offsetZ}`
      );
    }
  },

  remove: function () {
    if (this.debugBox) {
      this.el.removeChild(this.debugBox);
    }
  },
});
