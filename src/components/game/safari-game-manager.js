AFRAME.registerComponent("safari-game-manager", {
  schema: {
    timeLimit: { type: "number", default: 300 }, // 5 minutes in seconds
  },

  init: function () {
    this.gameActive = false;
    this.timeRemaining = this.data.timeLimit;
    this.animalsFound = new Set();
    this.totalAnimals = 6;
    this.animalTypes = [
      "flamingo",
      "jaguarete",
      "nandu",
      "jurumi",
      "tagua",
      "tatu",
    ];

    // Bind methods
    this.startGame = this.startGame.bind(this);
    this.endGame = this.endGame.bind(this);
    this.resetGame = this.resetGame.bind(this);
    this.checkAnimal = this.checkAnimal.bind(this);

    // Listen for start game event
    this.el.sceneEl.addEventListener("safari-start-game", this.startGame);

    // Listen for animal found events
    this.el.sceneEl.addEventListener("safari-animal-clicked", (evt) => {
      if (this.gameActive) {
        this.checkAnimal(evt.detail.animalType);
      }
    });

    console.log("Safari Game Manager initialized");
  },

  startGame: function () {
    console.log("Starting Safari Game!");

    // Get fade component
    const cameraRig = document.getElementById("cameraRig");
    const fadeComponent = cameraRig
      ? cameraRig.components["screen-fade"]
      : null;

    if (fadeComponent) {
      // Fade out, setup game, then fade in
      fadeComponent.fadeOut(() => {
        // Reset game state first
        this.resetGame();

        this.gameActive = true;
        this.timeRemaining = this.data.timeLimit;

        // Hide carteles
        const carteles = document.getElementById("carteles");
        if (carteles) {
          carteles.setAttribute("visible", false);
        }

        // Play game start sound
        const startSound = document.getElementById("soundGameStart");
        if (startSound && startSound.components.sound) {
          startSound.components.sound.stopSound();
          startSound.components.sound.playSound();
        }

        // Emit game started event (this will show the UI)
        this.el.sceneEl.emit("safari-game-started");

        // Fade back in
        setTimeout(() => {
          fadeComponent.fadeIn(() => {
            // Show start message after fade in
            this.showMessage("FIND ALL 6 ANIMALS!", 3000);
          });
        }, 300);
      });
    } else {
      // Fallback without fade
      this.resetGame();
      this.gameActive = true;
      this.timeRemaining = this.data.timeLimit;

      const carteles = document.getElementById("carteles");
      if (carteles) {
        carteles.setAttribute("visible", false);
      }

      const startSound = document.getElementById("soundGameStart");
      if (startSound && startSound.components.sound) {
        startSound.components.sound.stopSound();
        startSound.components.sound.playSound();
      }

      this.el.sceneEl.emit("safari-game-started");
      this.showMessage("FIND ALL 6 ANIMALS!", 3000);
    }
  },

  checkAnimal: function (animalType) {
    if (!this.gameActive) return;

    if (this.animalsFound.has(animalType)) {
      console.log(`Animal ${animalType} already found!`);
      return;
    }

    this.animalsFound.add(animalType);
    console.log(
      `Found ${animalType}! (${this.animalsFound.size}/${this.totalAnimals})`
    );

    // Play animal found sound
    const foundSound = document.getElementById("soundGameFound");
    if (foundSound && foundSound.components.sound) {
      foundSound.components.sound.stopSound();
      foundSound.components.sound.playSound();
    }

    // Emit animal found event
    this.el.sceneEl.emit("safari-animal-found", {
      animalType: animalType,
      totalFound: this.animalsFound.size,
      totalAnimals: this.totalAnimals,
    });

    // Check win condition
    if (this.animalsFound.size >= this.totalAnimals) {
      setTimeout(() => this.endGame(true), 500);
    }
  },

  endGame: function (won) {
    if (!this.gameActive) return;

    this.gameActive = false;

    // Play appropriate end game sound
    if (won) {
      const winSound = document.getElementById("soundGameWin");
      if (winSound && winSound.components.sound) {
        winSound.components.sound.stopSound();
        winSound.components.sound.playSound();
      }

      const minutes = Math.floor(
        (this.data.timeLimit - this.timeRemaining) / 60
      );
      const seconds = (this.data.timeLimit - this.timeRemaining) % 60;
      this.showMessage(
        `YOU WIN!\nTime: ${minutes}:${seconds.toString().padStart(2, "0")}`,
        5000
      );
    } else {
      const overSound = document.getElementById("soundGameOver");
      if (overSound && overSound.components.sound) {
        overSound.components.sound.stopSound();
        overSound.components.sound.playSound();
      }

      this.showMessage(
        `TIME'S UP!\nFound: ${this.animalsFound.size}/${this.totalAnimals}`,
        5000
      );
    }

    // Wait for message to be visible, then fade out and teleport
    setTimeout(() => {
      const cameraRig = document.getElementById("cameraRig");
      const fadeComponent = cameraRig
        ? cameraRig.components["screen-fade"]
        : null;

      if (fadeComponent) {
        // Fade out
        fadeComponent.fadeOut(() => {
          // On faded out - teleport player to starting position
          if (cameraRig) {
            cameraRig.setAttribute("position", "0 0 0");

            // Reset camera rotation
            const head = document.getElementById("head");
            if (head) {
              head.object3D.rotation.set(0, 0, 0);
            }
          }

          // Hide UI
          this.el.sceneEl.emit("safari-game-ended", { won: won });

          // Reset all animal highlights
          const animals = document.querySelectorAll(".animal");
          animals.forEach((animalEl) => {
            const clickable = animalEl.components["animal-clickable"];
            if (clickable) {
              clickable.reset();
            }
          });

          // Show carteles menu
          const carteles = document.getElementById("carteles");
          if (carteles) {
            carteles.setAttribute("visible", true);
          }

          // Wait a bit then fade in
          setTimeout(() => {
            fadeComponent.fadeIn(() => {
              console.log("Player teleported back to start");
            });
          }, 300);
        });
      } else {
        // Fallback if fade component not available
        if (cameraRig) {
          cameraRig.setAttribute("position", "0 0 0");
        }

        this.el.sceneEl.emit("safari-game-ended", { won: won });

        const animals = document.querySelectorAll(".animal");
        animals.forEach((animalEl) => {
          const clickable = animalEl.components["animal-clickable"];
          if (clickable) {
            clickable.reset();
          }
        });

        const carteles = document.getElementById("carteles");
        if (carteles) {
          carteles.setAttribute("visible", true);
        }
      }
    }, 5000);
  },

  resetGame: function () {
    this.gameActive = false;
    this.timeRemaining = this.data.timeLimit;
    this.animalsFound.clear();

    // Reset all animals
    this.el.sceneEl.emit("safari-game-reset");
  },

  showMessage: function (text, duration) {
    // Create or update message entity attached to camera
    let messageEl = document.getElementById("gameMessage");
    const camera = document.querySelector("[camera]");

    if (!messageEl) {
      messageEl = document.createElement("a-text");
      messageEl.setAttribute("id", "gameMessage");
      messageEl.setAttribute("position", "0 0.5 -2");
      messageEl.setAttribute("align", "center");
      messageEl.setAttribute("width", "4");
      messageEl.setAttribute("color", "#FFFFFF");
      messageEl.setAttribute("shader", "msdf");
      messageEl.setAttribute("negate", "false");
      // Add black outline for better visibility
      messageEl.setAttribute("outline-width", "15%");
      messageEl.setAttribute("outline-color", "#000000");

      if (camera) {
        camera.appendChild(messageEl);
      } else {
        this.el.sceneEl.appendChild(messageEl);
      }
    }

    messageEl.setAttribute("value", text);
    messageEl.setAttribute("visible", true);

    if (duration) {
      setTimeout(() => {
        messageEl.setAttribute("visible", false);
      }, duration);
    }
  },

  tick: function (time, timeDelta) {
    if (!this.gameActive) return;

    // Update timer
    this.timeRemaining -= timeDelta / 1000;

    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.endGame(false);
    }

    // Emit timer update
    this.el.sceneEl.emit("safari-timer-update", {
      timeRemaining: this.timeRemaining,
      timeLimit: this.data.timeLimit,
    });
  },
});
