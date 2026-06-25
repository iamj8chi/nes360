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

    // Green highlight and trigger on click. Each cartel emits its own scene event:
    //  - orb-start    → safari-start-game (inicia el Safari)
    //  - orb-minigame → vuelo-enter       (entra al modo Vuelo)
    //  - orb-exit     → vuelo-exit         (sale del modo Vuelo; cartel principal)
    this.el.addEventListener("click", () => {
      let event = null;
      if (this.el.classList.contains("orb-start")) event = "safari-start-game";
      else if (this.el.classList.contains("orb-minigame"))
        event = "vuelo-enter";
      else if (this.el.classList.contains("orb-exit")) event = "vuelo-exit";
      if (!event) return;

      this.isClicked = true;
      this.el.setAttribute("material", "color", "#00FF00");
      this.el.sceneEl.emit(event);

      // Reset color after a moment
      setTimeout(() => {
        this.isClicked = false;
        if (this.originalColor) {
          this.el.setAttribute("material", "color", this.originalColor);
        } else {
          this.el.setAttribute("material", "color", "#FFFFFF");
        }
      }, 1000);
    });
  },
});
