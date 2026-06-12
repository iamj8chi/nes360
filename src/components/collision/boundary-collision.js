// Boundary collision component to keep player within scene
AFRAME.registerComponent("boundary-collision", {
  schema: {
    radius: { type: "number", default: 45 }, // Match boundary ring radius
    centerX: { type: "number", default: 0 },
    centerZ: { type: "number", default: 0 },
  },

  init: function () {
    this.lastPosition = new THREE.Vector3();
    this.currentPosition = new THREE.Vector3();
    this.el.object3D.getWorldPosition(this.lastPosition);
  },

  tick: function () {
    // Get current world position
    this.el.object3D.getWorldPosition(this.currentPosition);

    // Calculate distance from center (only X and Z, ignore Y)
    const distanceFromCenter = Math.sqrt(
      Math.pow(this.currentPosition.x - this.data.centerX, 2) +
        Math.pow(this.currentPosition.z - this.data.centerZ, 2)
    );

    // If player is outside the boundary, push them back
    if (distanceFromCenter > this.data.radius) {
      // Calculate the direction from center to player
      const dirX = this.currentPosition.x - this.data.centerX;
      const dirZ = this.currentPosition.z - this.data.centerZ;

      // Normalize the direction
      const length = Math.sqrt(dirX * dirX + dirZ * dirZ);
      const normalizedDirX = dirX / length;
      const normalizedDirZ = dirZ / length;

      // Set position to boundary edge
      const newX = this.data.centerX + normalizedDirX * this.data.radius;
      const newZ = this.data.centerZ + normalizedDirZ * this.data.radius;

      // Update position (keep Y unchanged)
      const currentPos = this.el.getAttribute("position");
      this.el.setAttribute("position", {
        x: newX,
        y: currentPos.y,
        z: newZ,
      });
    }

    // Update last position
    this.lastPosition.copy(this.currentPosition);
  },
});
