// Collision Responder - Attach to moving entities (like cameraRig)
AFRAME.registerComponent("collision-responder", {
  schema: {
    padding: { type: "number", default: 0.3 },
  },

  init: function () {
    this.position = new THREE.Vector3();
    this.lastValidPosition = new THREE.Vector3();
    this.el.object3D.position.copy(this.lastValidPosition);

    // Get collision manager
    this.collisionManager = null;

    // Wait for scene to be ready
    const scene = document.querySelector("a-scene");
    const waitForManager = () => {
      if (scene && scene.components["collision-manager"]) {
        this.collisionManager = scene.components["collision-manager"];
        console.log("Collision responder connected to manager");
      } else {
        setTimeout(waitForManager, 100);
      }
    };
    waitForManager();
  },

  tick: function () {
    if (!this.collisionManager) return;

    // Get current local position
    this.position.copy(this.el.object3D.position);

    // Check for collision at head/camera height (where the player actually is)
    const worldPos = new THREE.Vector3();
    const head = this.el.querySelector("#head");
    if (head && head.object3D) {
      head.object3D.getWorldPosition(worldPos);
    } else {
      // Fallback: use rig position + standard head height
      this.el.object3D.getWorldPosition(worldPos);
      worldPos.y += 1.6;
    }

    const collision = this.collisionManager.checkCollision(worldPos);

    if (collision) {
      // Calculate movement vector
      const movement = new THREE.Vector3().subVectors(
        this.position,
        this.lastValidPosition
      );

      // Project movement onto the collision normal to get the component we need to remove
      const normal = collision.normal.normalize();
      const dotProduct = movement.dot(normal);

      if (dotProduct < 0) {
        // Moving into the collider - slide along the surface
        // Remove the component of movement that's perpendicular to the surface
        const slideMovement = movement
          .clone()
          .sub(normal.multiplyScalar(dotProduct));

        // Apply the slide movement
        const newPosition = this.lastValidPosition.clone().add(slideMovement);
        this.el.object3D.position.copy(newPosition);

        // Check if the slide position is also colliding
        this.el.object3D.getWorldPosition(worldPos);
        const slideCollision = this.collisionManager.checkCollision(worldPos);

        if (slideCollision) {
          // Still colliding after slide, push back completely
          this.el.object3D.position.copy(this.lastValidPosition);
        } else {
          // Slide was successful, update last valid position
          this.lastValidPosition.copy(newPosition);
        }
      } else {
        // Moving away from collider, allow movement
        this.lastValidPosition.copy(this.position);
      }
    } else {
      // No collision - update last valid position
      this.lastValidPosition.copy(this.position);
    }
  },
});
