// demo-mode — el Safari se juega solo (modo demo / vidriera). En <a-scene>.
//
// Se activa por URL y es un no-op sin el parámetro:
//   /?demo=partida  un "bot" camina por el mapa, encuentra a los 6 y llega al final bueno
//   /?demo=bueno    marca a los 6 en ~2 s → final bueno
//   /?demo=malo     marca a N al azar (&encontrados=N, 0–5, def 3), el tiempo corre
//                   FAST_FORWARD veces más rápido (se ve el incendio) → final malo
// (scripts `npm run demo`, `demo:bueno`, `demo:malo` en package.json).
//
// Al volver al menú la demo arranca de nuevo a los LOOP_DELAY_MS, sin fin. Se corta con
// el gesto de reinicio (hold-to-restart → "safari-restart"): a partir de ahí el juego
// queda normal hasta recargar la página.
//
// Juega por los MISMOS caminos que un jugador, sin atajos de estado: "aprieta" el cartel
// Safari (mouseenter + click → orb-controller → safari-start-game) y clickea los animales
// (click → animal-clickable → safari-animal-clicked). Los dos finales directos usan además
// checkAnimal() y timeRemaining del safari-game-manager. Los finales, el cinematic-lock y
// el skip funcionan sin cambios.
//
// El autopiloto (demo=partida) planifica cada tramo con A* sobre una grilla de la isla
// (utils/grid-path.js) esquivando los collision-cylinder/-cube y los otros animales.
//
// Toca dos cosas fuera de su entity, y las devuelve:
//  - pausa el collision-responder del #cameraRig mientras camina: la ruta ya esquiva los
//    colliders, y el responder hacía avanzar a los tirones al rozar uno.
//  - mueve el pitch/yaw internos de look-controls (#head) para mirar al animal. El jugador
//    puede seguir arrastrando el mouse: look-controls es relativo al rig.
//
// Pensado para DESKTOP. En VR el bot mueve el rig solo, y eso marea.

import {
  buildGrid,
  findPath,
  lineFree,
  obstacleInfo,
} from "../../utils/grid-path.js";

const MODES = ["partida", "bueno", "malo"];

const START_DELAY_MS = 2000; // tras renderstart, para que carguen los modelos
const LOOP_DELAY_MS = 4000; // menú → próxima vuelta
const AFTER_FADE_IN_MS = 1500; // startGame: 300 ms a negro + fadeDuration 1000
const MARK_INTERVAL_MS = 350; // bueno/malo: un animal cada tanto
const FAST_FORWARD = 24; // malo: 120 s de ronda en ~5 s

// Autopiloto
const WALK_SPEED = 3; // m/s
const STOP_DIST = 3.2; // m del animal donde frena para "mirarlo"
const TURN_RATE = (120 * Math.PI) / 180; // rad/s, tope de giro
const GRID_CELL = 0.5; // m
const GRID_RADIUS = 25.5; // m, dentro del boundary-collision (26.7)
const CLEARANCE = 0.7; // m que la ruta deja libres alrededor de cada collider
const ANIMAL_CLEARANCE = 1.2; // m alrededor de los otros animales (no atravesarlos)
const WAYPOINT_REACHED = 0.8; // m
// Red de seguridad: el paso nunca entra a menos de esto de un collider (al girar con
// inercia el bot puede recortar una esquina de la ruta). Menor que CLEARANCE.
const HARD_MARGIN = 0.3;
const LOOK_HEIGHT = 0.7; // m sobre el piso: a dónde apunta la mirada en el animal
// Atascado = casi no se movió en 2 s, o no se acercó en 8 s → replanificar. Si vuelve
// a pasar con el mismo animal, ir derecho ignorando los troncos (nunca las paredes).
const STUCK_MOVE_MS = 2000;
const STUCK_MIN_MOVE = 0.5; // m recorridos dentro de la ventana
const STUCK_PROGRESS_MS = 8000;
const STUCK_MIN_PROGRESS = 1; // m hacia el objetivo dentro de la ventana
const MAX_REPLANS = 2;
// Guion al llegar a un animal (ms desde que frena)
const HOVER_AT_MS = 700;
const CLICK_AT_MS = 1200;
const LEAVE_AT_MS = 3200;

// Diferencia angular normalizada a (-π, π].
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

// Yaw de A-Frame (rotación +Y, 0 = mirando a −Z) para la dirección (dx, dz).
function yawOf(dx, dz) {
  return Math.atan2(-dx, -dz);
}

AFRAME.registerComponent("demo-mode", {
  init: function () {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("demo");
    this.active = false;
    if (!mode) return;
    if (!MODES.includes(mode)) {
      console.warn(
        `demo-mode: "${mode}" no existe (usar ${MODES.join(" | ")})`
      );
      return;
    }

    this.active = true;
    this.mode = mode;
    const n = parseInt(params.get("encontrados"), 10);
    this.foundCount = Number.isFinite(n) ? Math.max(0, Math.min(5, n)) : 3;

    this.stopped = false;
    this.phase = "idle"; // idle | script | hunt | look | burn | ending
    this.round = 0; // invalida los timeouts de una vuelta anterior
    this.timers = new Set();
    this.pitchTarget = null;

    this.onGameStarted = this.onGameStarted.bind(this);
    this.onEndingStarted = this.onEndingStarted.bind(this);
    this.onGameEnded = this.onGameEnded.bind(this);
    this.onRestart = this.onRestart.bind(this);

    const scene = this.el.sceneEl;
    scene.addEventListener("safari-game-started", this.onGameStarted);
    scene.addEventListener("safari-ending-started", this.onEndingStarted);
    scene.addEventListener("safari-game-ended", this.onGameEnded);
    scene.addEventListener("safari-restart", this.onRestart);

    this.setupSoundHint();

    const go = () => this.later(() => this.startRound(), START_DELAY_MS);
    if (scene.renderStarted) go();
    else scene.addEventListener("renderstart", go, { once: true });

    console.log(`demo-mode: "${mode}" (se corta con Ctrl/A/B/X/Y 3 s)`);
  },

  // --- Helpers ------------------------------------------------------------

  // setTimeout atado a la vuelta actual: si la demo se corta o arranca otra vuelta,
  // el callback no corre.
  later: function (fn, ms) {
    const round = this.round;
    const id = setTimeout(() => {
      this.timers.delete(id);
      if (this.stopped || round !== this.round) return;
      fn();
    }, ms);
    this.timers.add(id);
  },

  clearTimers: function () {
    this.timers.forEach((id) => clearTimeout(id));
    this.timers.clear();
  },

  manager: function () {
    const el = document.getElementById("gameManager");
    return el && el.components["safari-game-manager"];
  },

  rig: function () {
    return document.getElementById("cameraRig");
  },

  lookControls: function () {
    const head = document.getElementById("head");
    return head && head.components["look-controls"];
  },

  // --- Vuelta -------------------------------------------------------------

  // Desde el menú: mirar al frente y "apretar" el cartel Safari.
  startRound: function () {
    const gm = this.manager();
    if (!gm || gm.gameActive || this.phase !== "idle") return;

    const lc = this.lookControls();
    if (lc) {
      lc.yawObject.rotation.y = 0;
      lc.pitchObject.rotation.x = 0;
    }

    const cartel = document.querySelector(".orb-start");
    if (!cartel) {
      this.el.sceneEl.emit("safari-start-game");
      return;
    }
    cartel.emit("mouseenter");
    this.later(() => {
      cartel.emit("click");
      this.later(() => cartel.emit("mouseleave"), 1200);
    }, 600);
  },

  onGameStarted: function () {
    if (this.stopped) return;
    // Nueva vuelta: lo que quedara pendiente del menú (p.ej. un startRound si el
    // jugador apretó el cartel a mano) ya no aplica.
    this.round++;
    this.clearTimers();
    this.phase = "script";
    this.later(() => this.runScript(), AFTER_FADE_IN_MS);
  },

  runScript: function () {
    const gm = this.manager();
    if (!gm || !gm.gameActive) return;

    if (this.mode === "partida") {
      this.startHunt();
      return;
    }

    let types = gm.animalTypes.slice();
    if (this.mode === "malo") {
      // Fisher–Yates y los primeros N: cada vuelta el círculo sale distinto.
      for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
      }
      types = types.slice(0, this.foundCount);
    }

    types.forEach((type, i) => {
      this.later(() => gm.checkAnimal(type), i * MARK_INTERVAL_MS);
    });

    // bueno: el sexto checkAnimal cierra la partida solo (endGame(true)).
    // malo: después de marcar, el tiempo corre rápido hasta que el manager llega a 0.
    if (this.mode === "malo") {
      this.later(
        () => {
          this.phase = "burn";
        },
        types.length * MARK_INTERVAL_MS + 300
      );
    }
  },

  onEndingStarted: function () {
    if (this.stopped) return;
    this.endHunt();
    this.phase = "ending";
    // A negro: enderezar la mirada (el bot venía mirando hacia abajo al último
    // animal) y que ningún timeout del guion la vuelva a mover durante el final.
    this.round++;
    this.clearTimers();
    const lc = this.lookControls();
    if (lc) lc.pitchObject.rotation.x = 0;
  },

  onGameEnded: function () {
    if (this.stopped) return;
    this.endHunt();
    this.phase = "idle";
    this.round++;
    this.clearTimers();
    this.later(() => this.startRound(), LOOP_DELAY_MS);
  },

  // Gesto de reinicio: la demo se corta para siempre (hasta recargar).
  onRestart: function () {
    if (this.stopped) return;
    console.log("demo-mode: cortada por el gesto de reinicio");
    this.endHunt();
    this.stopped = true;
    this.phase = "idle";
    this.clearTimers();
    // Si se cortó con el cartel "apretado a medias" (hover sin click), devolverle el
    // color. orb-controller lo ignora si ya hubo click.
    const cartel = document.querySelector(".orb-start");
    if (cartel) cartel.emit("mouseleave");
  },

  // --- Autopiloto (demo=partida) -----------------------------------------

  startHunt: function () {
    const rig = this.rig();
    if (!rig) return;

    // animal-spawner ya los movió: safari-game-reset va antes de safari-game-started.
    this.targets = Array.from(
      document.querySelectorAll("#huntAnimals .animal")
    ).map((el) => {
      const pos = new THREE.Vector3();
      el.object3D.getWorldPosition(pos);
      return { el, pos, type: el.getAttribute("data-animal-type") };
    });
    this.collectObstacles();
    this.grid = buildGrid(this.obstacles, {
      cell: GRID_CELL,
      radius: GRID_RADIUS,
      clearance: CLEARANCE,
    });

    this.heading = rig.object3D.rotation.y;
    this.speed = 0;
    this.target = null;

    const responder = rig.components["collision-responder"];
    if (responder) responder.pause();
    this.pausedResponder = responder || null;

    this.phase = "hunt";
    this.pickTarget();
  },

  // Deja todo como lo encontró (idempotente).
  endHunt: function () {
    this.target = null;
    this.path = null;
    this.pitchTarget = null;
    const responder = this.pausedResponder;
    if (responder) {
      // Que no "devuelva" al jugador a la última posición válida de antes de pausar.
      const rig = this.rig();
      if (rig && responder.lastValidPosition) {
        responder.lastValidPosition.copy(rig.object3D.position);
      }
      responder.play();
      this.pausedResponder = null;
    }
  },

  // El no-encontrado más cercano.
  pickTarget: function () {
    const gm = this.manager();
    const rigPos = this.rig().object3D.position;
    let best = null;
    let bestDist = Infinity;
    this.targets.forEach((t) => {
      if (gm && gm.animalsFound.has(t.type)) return;
      const d = Math.hypot(t.pos.x - rigPos.x, t.pos.z - rigPos.z);
      if (d < bestDist) {
        best = t;
        bestDist = d;
      }
    });
    this.target = best;
    this.phase = best ? "hunt" : "script";
    this.replans = 0;
    if (best) this.planPath();
  },

  // Ruta A* hasta el animal actual. Los OTROS animales cuentan como obstáculo.
  planPath: function () {
    const t = this.target;
    const pos = this.rig().object3D.position;
    const others = this.targets.filter((o) => o !== t);
    this.extra = (x, z) =>
      others.some(
        (o) => Math.hypot(x - o.pos.x, z - o.pos.z) < ANIMAL_CLEARANCE
      );

    this.straight = false;
    this.path = findPath(
      this.grid,
      pos.x,
      pos.z,
      t.pos.x,
      t.pos.z,
      STOP_DIST - 0.4,
      this.extra
    );
    if (!this.path) this.goStraight("sin ruta");
    this.wp = 0;
    this.resetStuck(Math.hypot(t.pos.x - pos.x, t.pos.z - pos.z));
  },

  // Último recurso: derecho al animal ignorando los troncos (las paredes no: el
  // responder está en pausa y atravesar el cartel se ve mal).
  goStraight: function (why) {
    console.log(`demo-mode: ${why}, camina derecho hacia ${this.target.type}`);
    this.straight = true;
    this.path = [{ x: this.target.pos.x, z: this.target.pos.z }];
    this.wp = 0;
  },

  resetStuck: function (dist) {
    const pos = this.rig().object3D.position;
    this.moveTime = 0;
    this.moveRefX = pos.x;
    this.moveRefZ = pos.z;
    this.progressTime = 0;
    this.progressRef = dist;
  },

  checkStuck: function (dist, dt) {
    const pos = this.rig().object3D.position;
    let stuck = false;

    this.moveTime += dt * 1000;
    if (this.moveTime >= STUCK_MOVE_MS) {
      const moved = Math.hypot(pos.x - this.moveRefX, pos.z - this.moveRefZ);
      if (moved < STUCK_MIN_MOVE) stuck = true;
      this.moveTime = 0;
      this.moveRefX = pos.x;
      this.moveRefZ = pos.z;
    }

    this.progressTime += dt * 1000;
    if (this.progressTime >= STUCK_PROGRESS_MS) {
      if (this.progressRef - dist < STUCK_MIN_PROGRESS) stuck = true;
      this.progressTime = 0;
      this.progressRef = dist;
    }

    if (!stuck || this.straight) return;
    this.replans++;
    if (this.replans > MAX_REPLANS) {
      this.goStraight("atascado");
    } else {
      console.log("demo-mode: atascado, replanifica");
      this.planPath();
    }
  },

  // Colliders del juego como círculos y rectángulos en XZ (todos van del piso a varios
  // metros, así que la altura no importa). Los cubos no rotan.
  collectObstacles: function () {
    const p = new THREE.Vector3();
    this.obstacles = [];
    document.querySelectorAll("[collision-cylinder]").forEach((el) => {
      const c = el.components["collision-cylinder"];
      if (!c) return;
      el.object3D.getWorldPosition(p);
      this.obstacles.push({
        x: p.x + c.data.offsetX,
        z: p.z + c.data.offsetZ,
        r: c.data.radius,
      });
    });
    document.querySelectorAll("[collision-cube]").forEach((el) => {
      const c = el.components["collision-cube"];
      if (!c) return;
      el.object3D.getWorldPosition(p);
      this.obstacles.push({
        x: p.x + c.data.offsetX,
        z: p.z + c.data.offsetZ,
        hw: c.data.width / 2,
        hd: c.data.depth / 2,
      });
    });
  },

  turnHeading: function (goalYaw, dt) {
    const diff = angleDiff(goalYaw, this.heading);
    const maxStep = TURN_RATE * dt;
    // angleDiff(x, 0) normaliza a (-π, π]: que el rumbo no acumule vueltas.
    this.heading = angleDiff(
      this.heading + Math.max(-maxStep, Math.min(maxStep, diff)),
      0
    );
    this.rig().object3D.rotation.y = this.heading;
    return diff;
  },

  walk: function (dt) {
    const t = this.target;
    if (!t || !this.path) return;
    const pos = this.rig().object3D.position;
    const dist = Math.hypot(t.pos.x - pos.x, t.pos.z - pos.z);
    const last = this.path.length - 1;

    // Solo en el último tramo: cerca pero del otro lado de una pared no vale.
    if (dist <= STOP_DIST && this.wp >= last) {
      this.arrive();
      return;
    }

    this.checkStuck(dist, dt);

    // Avanzar de waypoint al llegar, o antes si el siguiente ya se ve (curvas más
    // suaves que ir punto por punto).
    while (this.wp < last) {
      const w = this.path[this.wp];
      const next = this.path[this.wp + 1];
      const reached = Math.hypot(w.x - pos.x, w.z - pos.z) < WAYPOINT_REACHED;
      if (
        !reached &&
        (this.straight ||
          !lineFree(this.grid, pos.x, pos.z, next.x, next.z, this.extra))
      ) {
        break;
      }
      this.wp++;
    }
    const w = this.path[this.wp];
    const diff = this.turnHeading(yawOf(w.x - pos.x, w.z - pos.z), dt);

    // Frena al girar fuerte (arranque de cada tramo) y al acercarse al animal.
    const align = Math.max(0, Math.cos(diff));
    const approach =
      this.wp >= last ? Math.max(0.3, Math.min(1, (dist - STOP_DIST) / 2)) : 1;
    const goalSpeed = WALK_SPEED * align * approach;
    this.speed += (goalSpeed - this.speed) * Math.min(1, dt * 3);

    let stepX = -Math.sin(this.heading) * this.speed * dt;
    let stepZ = -Math.cos(this.heading) * this.speed * dt;

    // Red de seguridad: si el paso entra en el margen de un collider, quitarle la
    // parte que avanza hacia él (desliza por el borde). En modo "derecho", solo paredes.
    this.obstacles.forEach((o) => {
      if (this.straight && o.r !== undefined) return;
      const info = obstacleInfo(o, pos.x + stepX, pos.z + stepZ);
      if (info.surface >= HARD_MARGIN) return;
      const into = stepX * info.nx + stepZ * info.nz;
      if (into < 0) {
        stepX -= into * info.nx;
        stepZ -= into * info.nz;
      }
    });

    pos.x += stepX;
    pos.z += stepZ;
  },

  // Frenó frente al animal: mirarlo, hover (amarillo), click (verde + ficha), cerrar
  // la ficha y seguir con el próximo.
  arrive: function () {
    const t = this.target;
    this.phase = "look";
    this.speed = 0;

    const cam = this.el.sceneEl.camera;
    const camPos = new THREE.Vector3();
    if (cam) cam.getWorldPosition(camPos);
    const horiz = Math.hypot(t.pos.x - camPos.x, t.pos.z - camPos.z) || 1;
    this.pitchTarget = Math.atan2(t.pos.y + LOOK_HEIGHT - camPos.y, horiz);

    this.later(() => t.el.emit("mouseenter"), HOVER_AT_MS);
    this.later(() => t.el.emit("click"), CLICK_AT_MS);
    this.later(() => {
      const close = document.getElementById("animalInfoCardClose");
      if (close) close.click();
      t.el.emit("mouseleave");
      this.pitchTarget = 0;
      const gm = this.manager();
      if (gm && gm.gameActive) this.pickTarget();
    }, LEAVE_AT_MS);
  },

  tick: function (time, delta) {
    if (!this.active || this.stopped) return;
    const dt = Math.min(delta || 0, 50) / 1000;

    if (this.phase === "burn") {
      const gm = this.manager();
      if (gm && gm.gameActive) {
        gm.timeRemaining -= dt * (FAST_FORWARD - 1);
      }
      return;
    }

    if (this.phase === "hunt") this.walk(dt);

    if (this.phase === "look" && this.target) {
      const pos = this.rig().object3D.position;
      this.turnHeading(
        yawOf(this.target.pos.x - pos.x, this.target.pos.z - pos.z),
        dt
      );
    }

    // Pitch suave (solo desktop: en VR la cabeza la maneja el visor).
    if (this.pitchTarget !== null) {
      const lc = this.lookControls();
      if (lc) {
        const p = lc.pitchObject.rotation;
        p.x += (this.pitchTarget - p.x) * Math.min(1, dt * 4);
        if (this.pitchTarget === 0 && Math.abs(p.x) < 0.002) {
          p.x = 0;
          this.pitchTarget = null;
        }
      }
    }
  },

  // --- Aviso de sonido ----------------------------------------------------

  // Los navegadores no dejan sonar audio hasta un gesto del usuario. La demo arranca
  // igual; un click o una tecla en cualquier lado reanuda el AudioContext.
  setupSoundHint: function () {
    const ctx =
      THREE.AudioContext && THREE.AudioContext.getContext
        ? THREE.AudioContext.getContext()
        : null;
    if (!ctx || ctx.state === "running") return;

    const hint = document.createElement("div");
    hint.id = "demoSoundHint";
    hint.textContent = "🔊 Click para activar el sonido";
    Object.assign(hint.style, {
      position: "fixed",
      left: "50%",
      bottom: "24px",
      transform: "translateX(-50%)",
      padding: "8px 16px",
      borderRadius: "999px",
      background: "rgba(0, 0, 0, 0.6)",
      color: "#fff",
      font: "14px/1.3 system-ui, sans-serif",
      zIndex: "10000",
      pointerEvents: "none",
    });
    document.body.appendChild(hint);

    const unlock = () => {
      ctx.resume().then(() => {
        if (ctx.state !== "running") return;
        hint.remove();
        window.removeEventListener("pointerdown", unlock, true);
        window.removeEventListener("keydown", unlock, true);
      });
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
  },

  remove: function () {
    if (!this.active) return;
    this.onRestart();
    const scene = this.el.sceneEl;
    scene.removeEventListener("safari-game-started", this.onGameStarted);
    scene.removeEventListener("safari-ending-started", this.onEndingStarted);
    scene.removeEventListener("safari-game-ended", this.onGameEnded);
    scene.removeEventListener("safari-restart", this.onRestart);
  },
});
