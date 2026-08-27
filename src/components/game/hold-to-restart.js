// hold-to-restart — salida de emergencia del modo Safari.
//
// Mantener 3 s cualquiera de los botones A/B/X/Y del mando de Quest (X/Y en el
// izquierdo, A/B en el derecho) o Ctrl en teclado reinicia la partida y devuelve
// al jugador al principio. Existe porque el Safari se dispara con un solo click
// en el cartel y, una vez dentro, no había forma de salir salvo esperar el timer.
//
// El componente NO toca el estado del juego: solo detecta el gesto y emite
// "safari-restart" en la escena. El teardown lo hace safari-game-manager
// (abortGame), que es el dueño del estado (ver §3 de CLAUDE.md).
//
// Mientras haya un botón pulsado se muestra el prompt en el #gameMessage que ya
// maneja safari-game-manager; al soltar antes de tiempo, se cancela y se oculta.
//
// Nota: con hand tracking puro no hay botones, así que en VR esto requiere mandos.

// Eventos de botón de meta-touch-controls. Burbujean hasta la escena, así que
// alcanza con escucharlos una vez ahí para cubrir las dos manos.
const BUTTONS = ["a", "b", "x", "y"];

AFRAME.registerComponent("hold-to-restart", {
  schema: {
    enabled: { type: "boolean", default: true },
    holdTime: { type: "number", default: 3000 }, // ms que hay que mantener
    message: { type: "string", default: "Mantén apretado\npara reiniciar" },
  },

  init: function () {
    // Fuentes pulsadas ("a"/"b"/"x"/"y"/"ctrl"). Se usa un Set para que soltar un
    // botón mientras otro sigue apretado NO cancele la cuenta.
    this.pressed = new Set();
    this.holdTimeout = null;

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);

    // Un par de handlers por botón, guardados para poder desregistrarlos.
    this.buttonHandlers = [];
    BUTTONS.forEach((name) => {
      const down = () => this.press(name);
      const up = () => this.release(name);
      this.buttonHandlers.push([`${name}buttondown`, down]);
      this.buttonHandlers.push([`${name}buttonup`, up]);
      this.el.sceneEl.addEventListener(`${name}buttondown`, down);
      this.el.sceneEl.addEventListener(`${name}buttonup`, up);
    });
  },

  onKeyDown: function (e) {
    // El auto-repeat del teclado dispara keydown en loop; press() ya ignora
    // repetidos, pero cortamos acá para no hacer trabajo de más.
    if (e.repeat) return;
    if (e.code === "ControlLeft" || e.code === "ControlRight") {
      this.press("ctrl");
    }
  },

  onKeyUp: function (e) {
    if (e.code === "ControlLeft" || e.code === "ControlRight") {
      this.release("ctrl");
    }
  },

  press: function (source) {
    if (!this.data.enabled) return;
    if (this.pressed.has(source)) return;

    const wasEmpty = this.pressed.size === 0;
    this.pressed.add(source);
    if (!wasEmpty) return; // la cuenta ya está corriendo

    this.showPrompt(true);
    this.holdTimeout = setTimeout(() => {
      this.holdTimeout = null;
      this.showPrompt(false);
      console.log("hold-to-restart: reiniciando");
      this.el.sceneEl.emit("safari-restart");
    }, this.data.holdTime);
  },

  release: function (source) {
    if (!this.pressed.delete(source)) return;
    if (this.pressed.size > 0) return; // queda otro botón apretado

    this.cancel();
  },

  cancel: function () {
    if (this.holdTimeout) {
      clearTimeout(this.holdTimeout);
      this.holdTimeout = null;
      this.showPrompt(false);
    }
  },

  // Reutiliza el #gameMessage del manager (a-text MSDF con acentos y
  // render-on-top). Sin duration queda fijo hasta que lo ocultemos.
  showPrompt: function (visible) {
    if (!this.manager) this.manager = document.getElementById("gameManager");
    const comp = this.manager && this.manager.components["safari-game-manager"];
    if (!comp) return;

    if (visible) {
      comp.showMessage(this.data.message);
    } else {
      comp.hideMessage();
    }
  },

  remove: function () {
    this.cancel();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.buttonHandlers.forEach(([name, handler]) => {
      this.el.sceneEl.removeEventListener(name, handler);
    });
    this.buttonHandlers = [];
  },
});
