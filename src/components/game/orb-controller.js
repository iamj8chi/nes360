AFRAME.registerComponent("orb-controller", {
  init: function () {
    this.originalColor = null;
    this.isClicked = false;

    // Store original material color
    const material = this.el.getAttribute("material");
    if (material && material.color) {
      this.originalColor = material.color;
    }

    // Yellow highlight on hover
    this.el.addEventListener("mouseenter", () => {
      if (!this.isClicked) {
        if (this.el.classList.contains("orb-start")) {
          this.el.setAttribute("material", "color", "#FF0000"); // Red for orb-start
        } else {
          this.el.setAttribute("material", "color", "#FFFF00"); // Yellow for others
        }
      }
    });

    this.el.addEventListener("mouseleave", () => {
      if (!this.isClicked) {
        if (this.originalColor) {
          this.el.setAttribute("material", "color", this.originalColor);
        } else {
          this.el.setAttribute("material", "color", "#FFFFFF");
        }
      }
    });

    // Green highlight and trigger on click
    this.el.addEventListener("click", () => {
      if (this.el.classList.contains("orb-start")) {
        this.isClicked = true;
        this.el.setAttribute("material", "color", "#00FF00");

        // Emit game start event
        this.el.sceneEl.emit("safari-start-game");

        // Reset color after a moment
        setTimeout(() => {
          this.isClicked = false;
          if (this.originalColor) {
            this.el.setAttribute("material", "color", this.originalColor);
          } else {
            this.el.setAttribute("material", "color", "#FFFFFF");
          }
        }, 1000);
      }
    });
  },
});
