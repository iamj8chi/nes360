AFRAME.registerComponent("progress-ui", {
  init: function () {
    this.animalsFound = new Set();
    this.timeRemaining = 300;
    this.isVisible = false;

    // Wait for DOM to be ready
    setTimeout(() => {
      this.setupUIElements();
      this.setupEventListeners();
    }, 100);
  },

  setupUIElements: function () {
    // Get references to all UI plane elements
    this.trackerUI = document.getElementById("trackerUI");
    this.trackerBg = document.getElementById("trackerBackground");
    this.timerText = document.getElementById("timerDisplay");

    // Animal icons mapping
    this.icons = {
      flamingo: document.getElementById("flamengoIcon"),
      jaguarete: document.getElementById("jaguareteIcon"),
      nandu: document.getElementById("nanduIcon"),
      jurumi: document.getElementById("jurumiIcon"),
      tagua: document.getElementById("taguaIcon"),
      tatu: document.getElementById("tatuIcon"),
    };

    // Initially hide the tracker UI
    if (this.trackerUI) {
      this.trackerUI.setAttribute("visible", "false");
    }

    console.log("Progress UI elements initialized");
  },

  setupEventListeners: function () {
    // Listen for game events
    this.el.sceneEl.addEventListener("safari-game-started", () => {
      this.show();
      this.reset();
    });

    this.el.sceneEl.addEventListener("safari-animal-found", (evt) => {
      this.updateAnimal(evt.detail.animalType, true);
    });

    this.el.sceneEl.addEventListener("safari-timer-update", (evt) => {
      this.updateTimer(evt.detail.timeRemaining);
    });

    this.el.sceneEl.addEventListener("safari-game-ended", () => {
      setTimeout(() => this.hide(), 3000);
    });

    this.el.sceneEl.addEventListener("safari-game-reset", () => {
      this.reset();
    });
  },

  show: function () {
    if (this.trackerUI) {
      this.trackerUI.setAttribute("visible", "true");
      this.isVisible = true;
    }
  },

  hide: function () {
    if (this.trackerUI) {
      this.trackerUI.setAttribute("visible", "false");
      this.isVisible = false;
    }
  },

  reset: function () {
    this.animalsFound.clear();

    // Reset all animals to unchecked state
    Object.keys(this.icons).forEach((animal) => {
      this.updateAnimal(animal, false);
    });

    // Reset timer
    this.updateTimer(300);
  },

  updateAnimal: function (animalType, found) {
    const icon = this.icons[animalType];
    if (!icon) {
      console.warn(`Icon not found for animal: ${animalType}`);
      return;
    }

    // Handle flamingo/flamengo naming mismatch
    const assetName = animalType === "flamingo" ? "flamengo" : animalType;

    if (found) {
      this.animalsFound.add(animalType);
      // Switch to checked image
      icon.setAttribute("src", `#${assetName}Check`);

      // Add a brief scale animation for feedback
      icon.setAttribute("animation__found", {
        property: "scale",
        from: "1 1 1",
        to: "1.2 1.2 1.2",
        dur: 200,
        easing: "easeOutQuad",
        loop: false,
      });

      setTimeout(() => {
        icon.setAttribute("animation__foundback", {
          property: "scale",
          from: "1.2 1.2 1.2",
          to: "1 1 1",
          dur: 200,
          easing: "easeInQuad",
          loop: false,
        });
      }, 200);
    } else {
      this.animalsFound.delete(animalType);
      // Switch to unchecked image
      icon.setAttribute("src", `#${assetName}Uncheck`);
    }
  },

  updateTimer: function (seconds) {
    this.timeRemaining = seconds;

    if (!this.timerText) return;

    // Format time as MM:SS
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const timeStr = `${minutes}:${secs.toString().padStart(2, "0")}`;

    this.timerText.setAttribute("value", timeStr);

    // Change color based on remaining time
    if (seconds < 60) {
      // Red - less than 1 minute
      this.timerText.setAttribute("color", "#FF0000");

      // Pulse animation when low on time
      if (seconds > 0 && seconds % 2 === 0) {
        this.timerText.setAttribute("animation__pulse", {
          property: "scale",
          from: "0.15 0.15 0.15",
          to: "0.18 0.18 0.18",
          dur: 500,
          easing: "easeInOutSine",
          loop: false,
          dir: "alternate",
        });
      }
    } else if (seconds < 120) {
      // Yellow - less than 2 minutes
      this.timerText.setAttribute("color", "#FFFF00");
      this.timerText.removeAttribute("animation__pulse");
    } else {
      // White - plenty of time
      this.timerText.setAttribute("color", "#FFFFFF");
      this.timerText.removeAttribute("animation__pulse");
    }
  },
});
