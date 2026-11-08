AFRAME.registerComponent("safari-game-manager", {
  schema: {
    timeLimit: { type: "number", default: 300 }, // 5 minutes in seconds
    // Cuánto dura cada final (ms), contados desde que la pantalla queda en negro
    // hasta que arranca el fade de vuelta al menú. Ver playEnding().
    goodEndingDuration: { type: "number", default: 12000 },
    badEndingDuration: { type: "number", default: 10000 },
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
    this.abortGame = this.abortGame.bind(this);

    // Timeouts pendientes (la vuelta al inicio tras endGame y el auto-hide del
    // mensaje). Se guardan para poder cancelarlos desde abortGame.
    this.endTimeout = null;
    this.messageTimeout = null;

    // Token del final en curso. Los callbacks de playEnding lo comparan antes de
    // seguir: abortGame/startGame lo incrementan, así un final abortado a mitad del
    // fade no emite safari-ending-started ni programa una segunda vuelta al inicio.
    this.endingToken = 0;

    // Listen for start game event
    this.el.sceneEl.addEventListener("safari-start-game", this.startGame);

    // Salida de emergencia (hold-to-restart: A/B/X/Y o Ctrl mantenidos 3 s).
    this.el.sceneEl.addEventListener("safari-restart", this.abortGame);

    // Listen for animal found events
    this.el.sceneEl.addEventListener("safari-animal-clicked", (evt) => {
      if (this.gameActive) {
        this.checkAnimal(evt.detail.animalType);
      }
    });

    console.log("Safari Game Manager initialized");
  },

  // Muestra/oculta todos los carteles del menú: el cartel Safari (#carteles) y
  // el cartel principal (#mainCartelGrande, que a su vez contiene el cubo de
  // debug #debugToggleCube). Se ocultan al empezar la partida y vuelven al terminar.
  setCartelesVisible: function (visible) {
    ["carteles", "mainCartelGrande"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.setAttribute("visible", visible);
      }
    });
  },

  startGame: function () {
    console.log("Starting Safari Game!");
    this.endingToken++;

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

        // Hide carteles (Safari + main cartel con su cubo de debug)
        this.setCartelesVisible(false);

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
            this.showMessage("¡ENCUENTRA A\nLOS 6 ANIMALES!", 3000);
          });
        }, 300);
      });
    } else {
      // Fallback without fade
      this.resetGame();
      this.gameActive = true;
      this.timeRemaining = this.data.timeLimit;

      this.setCartelesVisible(false);

      const startSound = document.getElementById("soundGameStart");
      if (startSound && startSound.components.sound) {
        startSound.components.sound.stopSound();
        startSound.components.sound.playSound();
      }

      this.el.sceneEl.emit("safari-game-started");
      this.showMessage("¡ENCUENTRA A\nLOS 6 ANIMALES!", 3000);
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
    const sound = document.getElementById(
      won ? "soundGameWin" : "soundGameOver"
    );
    if (sound && sound.components.sound) {
      sound.components.sound.stopSound();
      sound.components.sound.playSound();
    }

    this.hideMessage();
    this.playEnding(won);
  },

  // Cinemática de cierre (los finales del guion "NES 360 ENDINGS"):
  //   fade a negro → safari-ending-started {won, found} → fade-in → el final corre
  //   `duration` ms → returnToStart (fade, teleport, safari-game-ended, menú).
  // Este componente solo lleva la secuencia; cada final lo arma su propio componente
  // (ending-good / ending-bad), y cinematic-lock apaga la locomoción. Todos desarman
  // en safari-game-ended, así que el skip con hold-to-restart (abortGame) sale gratis.
  playEnding: function (won) {
    const token = ++this.endingToken;
    const found = Array.from(this.animalsFound);
    const duration = won
      ? this.data.goodEndingDuration
      : this.data.badEndingDuration;

    const cameraRig = document.getElementById("cameraRig");
    const fade = cameraRig ? cameraRig.components["screen-fade"] : null;

    const begin = () => {
      if (token !== this.endingToken) return; // abortado durante el fade
      this.el.sceneEl.emit("safari-ending-started", { won, found });
      this.endTimeout = setTimeout(() => {
        this.endTimeout = null;
        if (token !== this.endingToken) return;
        this.returnToStart(won);
      }, duration);
    };

    if (!fade) {
      begin();
      return;
    }

    fade.fadeOut(() => {
      begin();
      setTimeout(() => {
        if (token === this.endingToken) fade.fadeIn();
      }, 300);
    });
  },

  // Teardown compartido: vuelve al punto de partida con todo restaurado. Lo usan
  // endGame (tras los 5 s de mensaje) y abortGame (inmediato, ver "safari-restart").
  returnToStart: function (won) {
    const cameraRig = document.getElementById("cameraRig");
    const fadeComponent = cameraRig
      ? cameraRig.components["screen-fade"]
      : null;

    // Restaura escena + UI. Todos los reactores de safari-game-ended son
    // idempotentes, así que esto es seguro incluso si no había partida en curso.
    const restore = () => {
      if (cameraRig) {
        cameraRig.setAttribute("position", "0 0 0");
        // Los finales rotan el rig para que el jugador mire hacia la camioneta /
        // el logo (ver utils/place-rig.js); el menú se juega con el rig sin rotar.
        cameraRig.object3D.rotation.set(0, 0, 0);

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

      // Show carteles menu (Safari + main cartel con su cubo de debug)
      this.setCartelesVisible(true);
    };

    if (fadeComponent) {
      fadeComponent.fadeOut(() => {
        restore();

        // Wait a bit then fade in
        setTimeout(() => {
          fadeComponent.fadeIn(() => {
            console.log("Player teleported back to start");
          });
        }, 300);
      });
    } else {
      // Fallback if fade component not available
      restore();
    }
  },

  // Salida de emergencia: reinicia la partida y devuelve al jugador al principio,
  // sin esperar mensajes ni el final del timer. La dispara hold-to-restart
  // (mantener A/B/X/Y o Ctrl 3 s) vía el evento "safari-restart".
  abortGame: function () {
    console.log("Safari game aborted — returning to start");

    // Si había un final en curso (o su fade inicial), invalidarlo y cancelar su
    // vuelta programada para no teletransportar dos veces.
    this.endingToken++;
    if (this.endTimeout) {
      clearTimeout(this.endTimeout);
      this.endTimeout = null;
    }

    this.hideMessage();
    // Durante un final gameActive ya es false y NO se resetea acá: safari-game-reset
    // revive el bosque al instante, con la cinemática todavía en pantalla. La
    // restauración la hace safari-game-ended (a negro) y el reset completo, el
    // próximo startGame.
    if (this.gameActive) this.resetGame(); // timer y animales a cero (safari-game-reset)
    this.returnToStart(false);
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
      // Debajo del centro de la vista, para no pisar el HUD de la brújula.
      // Ojo: el mensaje está a z -2 y #compassUI a z -1, así que lo que importa
      // es el ÁNGULO, no la Y. La brújula ocupa de ~9° (timer) a ~20° (iconos);
      // "0 0.5 -2" caía en 14°, o sea justo en el medio. Con y -0.35 el mensaje
      // queda en ~-10°, con margen de sobra para el texto de 2 líneas (todos los
      // mensajes lo son) — más aún desde que el texto se achicó (ver width abajo).
      messageEl.setAttribute("position", "0 -0.35 -2");
      messageEl.setAttribute("align", "center");
      // En a-text el tamaño de glifo es width/wrapCount (wrapCount def 40), así
      // que el width es el control de tamaño: 2.6 = ~35% más chico que el 4
      // original. Si hay que retocar el tamaño del mensaje, es este número.
      messageEl.setAttribute("width", "2.6");
      messageEl.setAttribute("color", "#FFFFFF");
      messageEl.setAttribute("shader", "msdf");
      // Local MSDF atlas that includes Spanish accents + ñ (the CDN Roboto-msdf
      // default omits them, so they vanished in VR).
      messageEl.setAttribute("font", "/assets/fonts/arial-es-msdf.json");
      messageEl.setAttribute("font-image", "/assets/fonts/arial-es-msdf.png");
      messageEl.setAttribute("negate", "false");
      // Add black outline for better visibility
      messageEl.setAttribute("outline-width", "15%");
      messageEl.setAttribute("outline-color", "#000000");
      // Al estar por debajo del horizonte, el terreno lo ocluía (antes quedaba
      // contra el cielo y no hacía falta). render-on-top lo deja siempre visible.
      messageEl.setAttribute("render-on-top", "");

      if (camera) {
        camera.appendChild(messageEl);
      } else {
        this.el.sceneEl.appendChild(messageEl);
      }
    }

    messageEl.setAttribute("value", text);
    messageEl.setAttribute("visible", true);

    // a-text reconstruye su malla al cambiar el value, así que hay que re-aplicar
    // el render-on-top o el mensaje nuevo vuelve a ocluirse contra el terreno.
    const onTop = messageEl.components["render-on-top"];
    if (onTop) setTimeout(() => onTop.apply(), 50);

    // Un solo auto-hide vivo a la vez: si no, el timeout de un mensaje anterior
    // apaga el que se acaba de mostrar (p.ej. el prompt fijo de hold-to-restart).
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }

    // Sin duration el mensaje queda fijo hasta un hideMessage() explícito.
    if (duration) {
      this.messageTimeout = setTimeout(() => {
        this.messageTimeout = null;
        messageEl.setAttribute("visible", false);
      }, duration);
    }
  },

  hideMessage: function () {
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }
    const messageEl = document.getElementById("gameMessage");
    if (messageEl) messageEl.setAttribute("visible", false);
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
