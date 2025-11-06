// UI Components
AFRAME.registerComponent("progress-ui", {
  init: function () {
    this.animalsFound = new Set();
    this.timeRemaining = window.NES360_CONFIG.game.timeLimit;

    this.createUI();
    this.setupEventListeners();
  },

  setupEventListeners: function () {
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
      this.hide();
    });

    this.el.sceneEl.addEventListener("safari-game-reset", () => {
      this.reset();
    });
  },

  createUI: function () {
    // Create UI panel attached to left hand
    this.panel = document.createElement("a-entity");
    this.panel.setAttribute(
      "geometry",
      "primitive: plane; width: 0.4; height: 0.3"
    );
    this.panel.setAttribute("material", "src: #trackerBg; transparent: true");
    this.panel.setAttribute("position", "0 0.1 -0.15");
    this.panel.setAttribute("rotation", "-45 0 0");

    // Timer text
    this.timerText = document.createElement("a-text");
    this.timerText.setAttribute("value", "5:00");
    this.timerText.setAttribute("position", "0 0.08 0.01");
    this.timerText.setAttribute("align", "center");
    this.timerText.setAttribute("scale", "0.6 0.6 0.6");
    this.timerText.setAttribute("color", "#FFFFFF");
    this.panel.appendChild(this.timerText);

    this.el.appendChild(this.panel);
    this.hide();
  },

  show: function () {
    this.panel.setAttribute("visible", true);
  },

  hide: function () {
    this.panel.setAttribute("visible", false);
  },

  reset: function () {
    this.animalsFound.clear();
    this.timeRemaining = window.NES360_CONFIG.game.timeLimit;

    // Reset all animal indicators
    window.NES360_CONFIG.game.animalTypes.forEach((type) => {
      this.updateAnimal(type, false);
    });
  },

  updateAnimal: function (animalType, found) {
    if (found) {
      this.animalsFound.add(animalType);
    } else {
      this.animalsFound.delete(animalType);
    }

    // Update UI indicators
    console.log(
      `📋 Progress: ${this.animalsFound.size}/${window.NES360_CONFIG.game.totalAnimals}`
    );
  },

  updateTimer: function (seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const timeStr = `${minutes}:${secs.toString().padStart(2, "0")}`;

    if (this.timerText) {
      this.timerText.setAttribute("value", timeStr);

      // Change color based on time
      if (seconds < 60) {
        this.timerText.setAttribute("color", "#FF0000"); // Red
      } else if (seconds < 120) {
        this.timerText.setAttribute("color", "#FFFF00"); // Yellow
      } else {
        this.timerText.setAttribute("color", "#FFFFFF"); // White
      }
    }
  },
});

// Orb Controller
AFRAME.registerComponent("orb-controller", {
  init: function () {
    this.el.addEventListener("click", () => {
      if (this.el.classList.contains("orb-start")) {
        this.el.sceneEl.emit("safari-start-game");
      }
    });
  },
});

// Billboard Cartel Component
AFRAME.registerComponent("billboard-cartel", {
  schema: {
    texture: { type: "string" },
    legs: { type: "number", default: 2 }, // 1 or 2 legs
    width: { type: "number", default: 3 },
    height: { type: "number", default: 2 },
    interactive: { type: "boolean", default: false },
    action: { type: "string", default: "" }, // 'safari', 'vuelo', or empty
  },

  init: function () {
    this.createBillboard();

    if (this.data.interactive) {
      this.setupInteraction();
    }
  },

  createBillboard: function () {
    // Create the main billboard plane
    this.billboard = document.createElement("a-plane");
    this.billboard.setAttribute(
      "geometry",
      `width: ${this.data.width}; height: ${this.data.height}`
    );
    this.billboard.setAttribute(
      "material",
      `src: ${this.data.texture}; transparent: true`
    );
    this.billboard.setAttribute("position", "0 1 0");

    if (this.data.interactive) {
      this.billboard.classList.add("clickable");
      this.billboard.classList.add("billboard");
    }

    // Create wooden legs
    this.createLegs();

    this.el.appendChild(this.billboard);
  },

  createLegs: function () {
    const legHeight = 1.8;
    const legRadius = 0.08;
    const legColor = "#8B4513"; // Brown color

    if (this.data.legs === 2) {
      // Two legs for main cartel
      const leftLeg = document.createElement("a-cylinder");
      leftLeg.setAttribute(
        "geometry",
        `radius: ${legRadius}; height: ${legHeight}`
      );
      leftLeg.setAttribute("material", `color: ${legColor}`);
      leftLeg.setAttribute("position", "-0.8 0 -0.05");
      this.el.appendChild(leftLeg);

      const rightLeg = document.createElement("a-cylinder");
      rightLeg.setAttribute(
        "geometry",
        `radius: ${legRadius}; height: ${legHeight}`
      );
      rightLeg.setAttribute("material", `color: ${legColor}`);
      rightLeg.setAttribute("position", "0.8 0 -0.05");
      this.el.appendChild(rightLeg);
    } else {
      // Single leg for smaller cartels
      const leg = document.createElement("a-cylinder");
      leg.setAttribute(
        "geometry",
        `radius: ${legRadius}; height: ${legHeight}`
      );
      leg.setAttribute("material", `color: ${legColor}`);
      leg.setAttribute("position", "0 0 -0.05");
      this.el.appendChild(leg);
    }
  },

  setupInteraction: function () {
    // Add click handler
    this.billboard.addEventListener("click", () => {
      this.handleClick();
    });

    // Add highlight capability
    this.billboard.setAttribute("billboard-highlighter", "");
  },

  handleClick: function () {
    switch (this.data.action) {
      case "safari":
        console.log("🎮 Starting Safari Game from cartel!");
        this.el.sceneEl.emit("safari-start-game");
        break;
      case "vuelo":
        console.log("✈️ Flight game coming soon!");
        // Show coming soon message
        break;
      default:
        console.log("📋 Billboard clicked");
    }
  },
});

// Billboard Highlighter Component
AFRAME.registerComponent("billboard-highlighter", {
  init: function () {
    this.originalMaterial = null;
    this.highlighted = false;

    // Listen for raycaster events
    this.el.addEventListener("mouseenter", () => {
      this.highlight();
    });

    this.el.addEventListener("mouseleave", () => {
      this.unhighlight();
    });

    // For VR controllers
    this.el.addEventListener("raycaster-intersected", () => {
      this.highlight();
    });

    this.el.addEventListener("raycaster-intersected-cleared", () => {
      this.unhighlight();
    });
  },

  highlight: function () {
    if (this.highlighted) return;

    this.highlighted = true;

    // Store original material
    if (!this.originalMaterial) {
      const material = this.el.getAttribute("material");
      this.originalMaterial = { ...material };
    }

    // Apply highlight effect
    this.el.setAttribute("material", {
      ...this.originalMaterial,
      emissive: "#ffff00",
      emissiveIntensity: 0.3,
    });
  },

  unhighlight: function () {
    if (!this.highlighted) return;

    this.highlighted = false;

    // Restore original material
    if (this.originalMaterial) {
      this.el.setAttribute("material", this.originalMaterial);
    }
  },
});
