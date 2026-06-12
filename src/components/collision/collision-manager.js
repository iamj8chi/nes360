// Global collision debug state
window.COLLISION_DEBUG = false;

// Collision Manager - Handles collision detection with collider entities
AFRAME.registerComponent("collision-manager", {
  init: function () {
    this.colliders = [];
    this.updateColliders();

    // Re-scan for colliders periodically
    this.updateInterval = setInterval(() => {
      this.updateColliders();
    }, 2000);

    // Listen for debug toggle
    window.addEventListener("keydown", (e) => {
      if (e.key === "c" && e.ctrlKey) {
        window.COLLISION_DEBUG = !window.COLLISION_DEBUG;
        console.log(
          `Collision debug: ${window.COLLISION_DEBUG ? "ON" : "OFF"}`
        );
        this.updateColliders(); // Refresh to update visibility
      }
    });
  },

  updateColliders: function () {
    this.colliders = [
      ...Array.from(document.querySelectorAll("[collision-cube]")),
      ...Array.from(document.querySelectorAll("[collision-cylinder]")),
    ];

    console.log(`Collision manager found ${this.colliders.length} colliders`);

    // Update debug visualization
    this.colliders.forEach((el) => {
      const cubeComp = el.components["collision-cube"];
      const cylComp = el.components["collision-cylinder"];
      if (cubeComp) cubeComp.updateDebugVisibility();
      if (cylComp) cylComp.updateDebugVisibility();
    });
  },

  checkCollision: function (position) {
    for (const collider of this.colliders) {
      const cubeComp = collider.components["collision-cube"];
      const cylComp = collider.components["collision-cylinder"];

      if (cubeComp) {
        const result = cubeComp.checkCollision(position);
        if (result.collision) {
          return {
            collider,
            type: "cube",
            component: cubeComp,
            ...result,
          };
        }
      }
      if (cylComp) {
        const result = cylComp.checkCollision(position);
        if (result.collision) {
          return {
            collider,
            type: "cylinder",
            component: cylComp,
            ...result,
          };
        }
      }
    }
    return null;
  },

  remove: function () {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  },
});
