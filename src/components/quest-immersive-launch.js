// quest-immersive-launch — entra a WebXR automáticamente cuando el juego corre dentro
// del APK de Quest. Va en <a-scene>.
//
// POR QUÉ EXISTE: el APK está empaquetado como app "immersive" de Horizon OS
// (twa-manifest.json → horizonOSAppMode: "immersive"), lo que significa que NO hay
// panel 2D ni superficie de fallback: la app debe pedir la sesión inmersiva ella misma
// apenas carga. Sin esto, la página carga y corre bien —el audio ambiente suena— pero
// nunca se dibuja un frame en las pantallas del visor, así que el jugador se queda
// para siempre en la pantalla de carga del sistema. Ese fue exactamente el bug: "el
// sonido entra pero no veo nada". Ver CLAUDE.md §9.
//
// El botón "Enter VR" de A-Frame (vr-mode-ui) no sirve en modo immersive: nunca es
// visible para clickearlo.
//
// DOS GUARDAS, y las dos tienen que pasar:
//
//  1. Contexto de app instalada. `window.getDigitalGoodsService` solo existe dentro de
//     una TWA/PWA instalada — es la guarda que recomienda Meta. Aceptamos ADEMÁS un
//     `document.referrer` `android-app://` (señal canónica de TWA) por si esa API no
//     está expuesta en el Custom Tab del APK: sin ese segundo camino, el componente
//     sería un no-op silencioso y volveríamos a la pantalla de carga eterna.
//  2. Que el visor soporte `immersive-vr` (navigator.xr.isSessionSupported). Esto es
//     lo que mantiene el desktop intacto, y además le da tiempo a la detección interna
//     de A-Frame (utils/device.js resuelve `supportsVRSession` de forma ASÍNCRONA) —
//     ver el comentario de `attempt()` sobre el falso éxito.
//
// En un navegador normal (desktop o Quest Browser) ninguna guarda pasa → no-op total y
// el flujo de siempre (2D + botón "Enter VR") queda igual.
//
// El click en el icono de la PWA cuenta como "user activation" para WebXR, así que
// requestSession() no necesita un gesto extra en este contexto.

const LOG = "[quest-immersive-launch]";

// Exportado para que otros módulos puedan preguntar "¿estamos dentro del APK?".
export function isInstalledApp() {
  return (
    typeof window.getDigitalGoodsService !== "undefined" ||
    (document.referrer || "").startsWith("android-app://")
  );
}

AFRAME.registerComponent("quest-immersive-launch", {
  schema: {
    maxAttempts: { type: "int", default: 4 },
    retryDelay: { type: "number", default: 800 }, // ms, escalado por intento
  },

  init: function () {
    if (!isInstalledApp()) return; // desktop / navegador normal: no-op

    this.attempts = 0;
    this.done = false;
    this.start = this.start.bind(this);

    const scene = this.el;

    // Si Horizon nos concede la sesión por su cuenta (a-scene escucha 'sessiongranted'
    // en navigator.xr), cancelamos nuestros reintentos.
    scene.addEventListener("enter-vr", () => {
      if (scene.xrSession) this.finish("sesión activa (enter-vr)");
    });

    // `renderstart` se emite justo después de que A-Frame arranca el render loop y
    // saca la pantalla de carga, y está guardado por el mismo flag `renderStarted`.
    // Esperar a ese punto (y no a `hasLoaded`, que llega antes) asegura que el primer
    // frame XR tenga algo que dibujar. `<a-assets>` tiene timeout de 3 s, así que
    // renderstart llega aunque un .glb se cuelgue.
    if (scene.renderStarted) this.start();
    else scene.addEventListener("renderstart", this.start, { once: true });
  },

  start: function () {
    if (this.done || this.attempts > 0) return;

    if (!navigator.xr || !navigator.xr.isSessionSupported) {
      this.fail("navigator.xr no disponible", true);
      return;
    }

    navigator.xr.isSessionSupported("immersive-vr").then(
      (ok) =>
        ok ? this.attempt() : this.fail("immersive-vr no soportado", true),
      (err) => this.fail("isSessionSupported falló: " + err, true)
    );
  },

  attempt: function () {
    const scene = this.el;
    if (this.done) return;
    if (scene.xrSession) return this.finish("sesión ya activa");

    this.attempts++;

    // Limpiar un posible falso éxito previo: si no, enterVR() corta de entrada con
    // "Already in VR." y nunca reintenta de verdad.
    if (scene.is("vr-mode")) scene.removeState("vr-mode");

    console.log(
      `${LOG} enterVR intento ${this.attempts}/${this.data.maxAttempts}`
    );

    let p;
    try {
      p = scene.enterVR();
    } catch (e) {
      p = Promise.reject(e);
    }

    Promise.resolve(p).then(
      () => {
        // OJO: que enterVR() resuelva NO significa que estemos presentando. Si
        // `checkHeadsetConnected() || isMobile` es false, A-Frame toma la rama "No VR"
        // (a-scene.js): marca el estado vr-mode, emite enter-vr, pide fullscreen y
        // RESUELVE — sin haber llamado nunca a requestSession. Eso es un falso éxito, y
        // encima irreversible, porque el siguiente enterVR() corta con "Already in VR.".
        // La única prueba real de que hay sesión en el visor es `xrSession`.
        if (scene.xrSession) this.finish("sesión inmersiva iniciada");
        else this.fail("enterVR resolvió sin xrSession (rama sin headset)");
      },
      (err) => this.fail("enterVR rechazó: " + ((err && err.message) || err))
    );
  },

  fail: function (reason, fatal) {
    console.warn(`${LOG} ${reason}`);
    if (fatal || this.attempts >= this.data.maxAttempts) {
      this.done = true;
      // En modo immersive esto es pantalla negra permanente sin UI donde mostrar el
      // error: el log por chrome://inspect es el único diagnóstico posible.
      console.error(
        `${LOG} sin sesión inmersiva tras ${this.attempts} intentos — el visor queda en la pantalla de carga del sistema`
      );
      return;
    }
    setTimeout(() => this.attempt(), this.data.retryDelay * this.attempts);
  },

  finish: function (msg) {
    this.done = true;
    console.log(`${LOG} ${msg}`);
  },
});
