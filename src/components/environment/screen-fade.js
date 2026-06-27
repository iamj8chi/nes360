// Screen Fade Component - Creates fade to black effect
AFRAME.registerComponent("screen-fade", {
  schema: {
    color: { type: "color", default: "#000000" },
    fadeDuration: { type: "number", default: 1000 }, // milliseconds
  },

  init: function () {
    this.createFadeOverlay();
  },

  createFadeOverlay: function () {
    // Create a plane that covers the entire view
    this.fadeOverlay = document.createElement("a-plane");
    this.fadeOverlay.setAttribute("id", "fadeOverlay");
    this.fadeOverlay.setAttribute("position", "0 0 -0.5");
    this.fadeOverlay.setAttribute("width", "2");
    this.fadeOverlay.setAttribute("height", "2");
    this.fadeOverlay.setAttribute("material", {
      color: this.data.color,
      shader: "flat",
      transparent: true,
      opacity: 0,
    });
    // Sit 0.5m in front of the camera as a transparent (opacity:0) plane: by
    // default it still writes to the depth buffer and, at that near distance,
    // occluded the burning trees' fire particles behind it. render-on-top turns
    // off depthTest/depthWrite and pins a high renderOrder, so it stops occluding
    // anything while still drawing over the whole scene during an actual fade.
    this.fadeOverlay.setAttribute("render-on-top", "");

    // Attach to camera so it follows the view
    const camera = document.querySelector("[camera]");
    if (camera) {
      camera.appendChild(this.fadeOverlay);
    }
  },

  fadeOut: function (callback) {
    if (!this.fadeOverlay) return;

    const duration = this.data.fadeDuration;
    this.fadeOverlay.setAttribute("animation", {
      property: "material.opacity",
      from: 0,
      to: 1,
      dur: duration,
      easing: "easeInQuad",
    });

    if (callback) {
      setTimeout(callback, duration);
    }
  },

  fadeIn: function (callback) {
    if (!this.fadeOverlay) return;

    const duration = this.data.fadeDuration;
    this.fadeOverlay.setAttribute("animation", {
      property: "material.opacity",
      from: 1,
      to: 0,
      dur: duration,
      easing: "easeOutQuad",
    });

    if (callback) {
      setTimeout(callback, duration);
    }
  },

  fadeOutAndIn: function (onFadedOut, onFadedIn) {
    this.fadeOut(() => {
      if (onFadedOut) onFadedOut();

      // Wait a moment at full black
      setTimeout(() => {
        this.fadeIn(() => {
          if (onFadedIn) onFadedIn();
        });
      }, 300);
    });
  },
});
