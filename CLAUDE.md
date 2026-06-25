# CLAUDE.md — nes360 / "No Están Solos" 360° VR

Guía de trabajo para Claude en este repositorio. Léela antes de editar. Mantenla
sincronizada cuando la arquitectura cambie (igual que `.github/copilot-instructions.md`).

---

## 1. Qué es esto y a dónde va (objetivo v1.0)

**nes360** ("No Están Solos") es un juego/experiencia **VR 360° en el navegador**,
construido con **A-Frame 1.7.1** (WebGL/WebXR) y empaquetado con **Vite 5**.
Ambientado en la sabana del **Chaco**; muestra 6 animales nativos amenazados:
**flamenco, jaguareté, ñandú, jurumí, taguá y tatú** (fauna real, con fines de
concientización — de ahí "No Están Solos").

Corre en **desktop** (WASD/flechas + mouse) y en **VR** (WebXR con locomoción por
controles). Hoy se despliega como web (Vercel).

### Meta de esta fase — Versión 1.0

1. **Modo Safari** (juego con objetivo, narrativo): el jugador inicia desde el cartel
   "Safari" y tiene **2 min** para encontrar/"salvar" a los 6 animales antes de que el
   bosque se incendie. A medida que se agota el tiempo el ambiente se degrada (árboles
   con copa → árboles muertos, cielo azul → rojo). Si los salva todos a tiempo, el
   bosque se recupera; si no, queda quemado. _Ya existe y funciona_ (ver §4).
2. **Modo Vuelo** (sandbox / exploración libre, "fly mode"): exploración sin
   objetivo ni timer, con desplazamiento libre (incluyendo vuelo). _Hoy NO está
   implementado_ — el cartel existe pero no hace nada (ver §7, gap #1). Es el
   trabajo principal de v1.0.
3. **Exportable a `.apk`** para headsets Android (Meta Quest principalmente). Hoy
   solo hay build web. Estrategia de empaquetado en §8.

Cuando trabajes en una tarea, ubícala respecto a estos tres objetivos y respeta
las convenciones de §5. No rompas el modo Safari al añadir el modo Vuelo.

---

## 2. Comandos

| Comando                | Qué hace                                                       |
| ---------------------- | -------------------------------------------------------------- |
| `npm install`          | Instala dependencias (`aframe`, `aframe-extras`)               |
| `npm run dev`          | Dev server Vite con HMR. **Puerto fijo 3333, HTTPS, host: 0.0.0.0** |
| `npm run build`        | Build de producción a `dist/`                                  |
| `npm run preview`      | Sirve el build (mismas opciones que dev: 3333/HTTPS/host)      |
| `npm run format`       | Prettier sobre todo el repo                                    |
| `npm run format:check` | Verifica formato sin escribir (CI-friendly)                    |

- **HTTPS con cert auto-firmado** (`@vitejs/plugin-basic-ssl`): obligatorio para
  WebXR sobre la LAN (http solo sirve en `localhost`). El navegador del headset
  avisará del cert no confiable una vez — aceptar.
- Para probar en un Quest: `npm run dev`, abrir `https://<IP-de-tu-Mac>:3333` en el
  navegador del headset (misma Wi-Fi). El README dice 5173 pero la config real es
  **3333** — la config manda.
- No hay tests ni linter aparte de Prettier. No hay CI configurado en el repo.

---

## 3. Arquitectura (cómo está armado)

A-Frame = ECS sobre Three.js. Todo el grafo de escena vive en **`index.html`**
(`<a-scene>`): assets, luces, carteles, animales, cámara/rig, UI. La lógica son
**componentes A-Frame** (`AFRAME.registerComponent`), uno por archivo bajo
`src/components/**`, registrados al importarse.

**Flujo de arranque:**

1. `index.html` carga un único script: `<script type="module" src="/src/main.js">`.
2. `src/main.js` importa **A-Frame primero** (define los globales `window.AFRAME` y
   `window.THREE`), luego los dos submódulos de `aframe-extras` que usamos, luego
   **cada componente del juego** (solo por su efecto de registro).
3. `src/scene-shadows.js` (IIFE, no es componente) se ejecuta al `loaded` de la
   escena: habilita sombras del renderer y configura la cámara de sombras del sol.

**Regla dura:** los componentes usan los **globales** `AFRAME` y `THREE`. **No**
agregues `import` de `three` ni de `aframe` por archivo (ver §6, nota de THREE).

### Bus de eventos (comunicación entre componentes)

Los componentes **no se llaman directo**; emiten/escuchan eventos en
`this.el.sceneEl`. El hub de estado es **`safari-game-manager`**. Eventos `safari-*`:

| Evento                  | Emisor                | Quién reacciona                                  | Payload                              |
| ----------------------- | --------------------- | ------------------------------------------------ | ------------------------------------ |
| `safari-start-game`     | `orb-controller` (cartel Safari) | `safari-game-manager.startGame`       | —                                    |
| `safari-game-started`   | `safari-game-manager` | `safari-compass` (muestra HUD), `game-modes` (→Safari), `animal-info-card` (oculta), `environment-degradation` (arranca sano) | — |
| `safari-animal-clicked` | `animal-clickable`    | `safari-game-manager` (cuenta hallazgo si activo), `vuelo-mode` (recolección si activo), `animal-info-card` (abre ficha) | `{animalType, element}` |
| `safari-animal-found`   | `safari-game-manager` | `safari-compass` (oculta icono), `animal-clickable` (glow verde) | `{animalType, totalFound, totalAnimals}` |
| `safari-timer-update`   | `safari-game-manager` (tick) | `safari-compass` (timer + color), `environment-degradation` (cielo/árboles ∝ tiempo) | `{timeRemaining, timeLimit}` |
| `safari-game-ended`     | `safari-game-manager` | `game-modes` (→Idle), `safari-compass` (oculta), `animal-info-card` (oculta), `environment-degradation` (restaura a sano) | `{won}` |
| `safari-game-reset`     | `safari-game-manager` | `animal-clickable.reset`, `safari-compass` (reset), `environment-degradation` (restaura a sano) | —          |
| `vuelo-enter`           | `orb-controller` (cartel Vuelo) | `vuelo-mode.enter`                     | —                                    |
| `vuelo-exit`            | `orb-controller` (cartel principal) | `vuelo-mode.exit`                  | —                                    |
| `vuelo-started`/`-ended`| `vuelo-mode`          | `safari-compass` (HUD sin timer)                 | —                                    |
| `vuelo-animal-seen`     | `vuelo-mode`          | `safari-compass` (oculta icono)                  | `{animalType, totalSeen, totalAnimals}` |

Al añadir comportamiento, **prefiere emitir/escuchar estos eventos** antes que
llamar componentes entre sí. Para el modo Vuelo, sigue el mismo patrón (ver §7).

---

## 4. Loop de juego del modo Safari (estado actual)

Dos conjuntos de animales en `index.html`, alternados por `game-modes`:

- **Idle** (`#showcaseAnimals`): arco de 6 animales a la derecha del spawn que miran
  al jugador. Click → abre ficha (`animal-info-card`). Visible al inicio y tras
  terminar una partida.
- **Safari** (`#huntAnimals`, `visible=false` por defecto): los 6 animales repartidos
  por el mapa con posiciones fijas. Visibles solo durante la partida.

Secuencia: click en cartel Safari → `safari-start-game` → `safari-game-manager`
hace fade-out (`screen-fade`), resetea, activa `gameActive`, oculta carteles,
suena `game-start`, emite `safari-game-started`, fade-in, muestra "FIND ALL 6
ANIMALS!". `tick` descuenta el timer (`timeLimit` **120 s** en el entity `#gameManager`;
el schema default sigue siendo 300). Encontrar un animal = clickearlo → `safari-animal-clicked`
→ si activo, `checkAnimal` lo marca, suena `game-found`, glow verde permanente, check
en el tracker. 6/6 → `endGame(true)` (gana). Timer a 0 → `endGame(false)` (pierde).
`endGame` muestra mensaje, fade-out, teletransporta el rig a `0 0 0`, vuelve a Idle.

**HUD brújula** (`#compassUI`): tira de iconos frente a la cámara que se deslizan
apuntando hacia cada animal + timer MSDF. `safari-compass` lo maneja (reemplazó al
viejo `progress-ui`).

**Degradación ambiental ("el bosque se incendia")** — `environment-degradation` (en
`#gameManager`) escucha `safari-timer-update` y avanza `p = 1 - timeRemaining/timeLimit`
(lineal). Conforme `p` sube: tinta el `<a-sky id="sky">` de azul → rojo (y la niebla
hacia humo) e va matando árboles vivos de a poco vía `composite-tree.kill()`. En
`safari-game-ended` (sea victoria o derrota) y en `safari-game-started/-reset` restaura
todo a sano (cielo azul, árboles revividos): como `safari-game-ended` se emite durante
el fade-a-negro mientras teletransporta al jugador frente al cartel, el reset es
imperceptible y el jugador siempre vuelve a un bosque vivo.

**Ficha de animal** (`animal-info-card`): dos superficies según `sceneEl.is('vr-mode')`
— DOM overlay (`#animalInfoCard`, desktop) o entity en la mano izquierda
(`#animalInfoCardVR`). Contenido desde **`src/data/animal-info.js`** (`ANIMAL_INFO`,
fuente única de verdad; copy en español, marcada con TODO de revisión).

---

## 5. Convenciones (respétalas)

- **Un componente por archivo**, agrupado por dominio: `game/`, `animals/`,
  `collision/`, `environment/`, `performance/`, más `movement.js` (raíz de components).
- **Comunicación por eventos** en `sceneEl` con nombres `safari-*` (§3). `safari-game-manager`
  es el dueño del estado del juego.
- **Globales, no imports** para `AFRAME`/`THREE` (§6).
- **El orden de registro no importa**: `registerComponent` solo define; A-Frame
  instancia al adjuntar entities. El descubrimiento en runtime usa `querySelectorAll`
  (p.ej. `collision-manager`).
- **Patrón de timing recurrente:** varios componentes esperan a que el grafo esté
  listo con `setTimeout(fn, 100)` antes de `getElementById` (ver `safari-compass`,
  `animal-info-card`, `game-modes`, `vuelo-mode`). No es elegante pero es el patrón;
  si lo cambias, hazlo de forma consistente.
- **Formato:** Prettier — comillas dobles, 2 espacios, trailing commas `es5`. Corre
  `npm run format` antes de cerrar.
- **Idioma:** UI de cara al jugador en **español**. Comentarios de código mezclan
  ES/EN; sigue el estilo del archivo que tocas.
- **Assets:** ver §6. Nunca `import` de `.glb`/`.mp3`/`.png`.

---

## 6. Assets y empaquetado de dependencias

- Los estáticos viven en **`public/assets/`** y Vite los sirve **verbatim** en
  `/assets/...` (sin hash ni transform). Por eso `<a-asset-item src="assets/foo.glb">`
  funciona igual en dev y prod. Referencia siempre con rutas root-relativas en HTML;
  **no** los importes desde JS.
- Modelos `.glb` exportados de Blender/Blockbench. Mantén binarios fuente pesados
  (proyectos Blender, audio crudo) **fuera** del repo. Total actual de assets ~5 MB;
  el más pesado es `ground.glb` (476 KB) y `scenario.glb` (156 KB) — presupuesto sano
  para VR.
- Quirk de nombres: el tipo de animal es **`flamingo`** pero el archivo es
  **`flamengo`**. Helpers `animalAssetName/animalIconAssetId/animalIconUrl` en
  `data/animal-info.js` encapsulan el mapeo. Si tocas esto, céntralo en un solo lugar.

**Nota de THREE (importante):** `aframe` trae su propia THREE (`super-three`);
`aframe-extras` depende de `three` estándar. Para evitar dos copias de THREE,
`main.js` importa **solo** dos submódulos de extras que usan la THREE global:
`controls/index.js` (locomoción teclado/touch/gamepad) y
`loaders/animation-mixer.js` (clips glTF). Si agregas una pieza de extras que
importe `three` directo (p.ej. loaders FBX/Collada), tendrás copia duplicada de
THREE — agrega un `resolve.alias` en `vite.config.js` mapeando `three` al build de
A-Frame.

---

## 7. Inventario de componentes

### game/
- **`safari-game-manager`** — hub de estado y timer del Safari. Schema `timeLimit`
  (def 300). Dueño de `gameActive`, `animalsFound` (Set), `tick` del timer.
- **`game-modes`** — alterna `#showcaseAnimals` (Idle) ↔ `#huntAnimals` (Safari)
  según `safari-game-started`/`-ended`.
- **`vuelo-mode`** — orquestador del modo Vuelo (entrar/salir, vuelo, recolección). Ver §8.
- **`safari-compass`** — brújula direccional HUD (`#compassUI`): tira de iconos que se
  deslizan apuntando hacia cada animal; timer MSDF que recolorea al bajar el tiempo.
  **Reemplazó a `progress-ui`** (ya borrado). También sirve al modo Vuelo sin timer.
- **`orb-controller`** — hover/click de carteles. Emite según la clase: `.orb-start`→
  `safari-start-game`, `.orb-minigame`→`vuelo-enter`, `.orb-exit`→`vuelo-exit`.
- **`animal-info-card`** — ficha de animal en DOM (desktop) o mano izq (VR).
- **`staggered-start`** — desfasa el inicio de las animaciones glTF para que no
  arranquen sincronizadas (`maxOffset`).

### animals/
- **`animal-clickable`** — emite `safari-animal-clicked`; pinta glow verde al ser
  encontrado; `reset()` lo limpia.
- **`animal-highlighter`** — montado UNA vez en `<a-scene>`. Highlight amarillo en
  hover vía `mouseenter`/`mouseleave` que burbujean al scene (cubre desktop y VR).
  No pisa el verde de los ya encontrados.
- **`animal-behavior`** — vuelo circular de los flamencos decorativos del cielo
  (`#animals`): `radius`, `pathRotation`.

### collision/
- **`collision-manager`** — montado en `<a-scene>`. Re-escanea colisionadores cada
  2 s (`querySelectorAll`). `checkCollision(pos)` recorre cubos/cilindros.
  **`Ctrl+C` togglea la visualización de volúmenes** (`window.COLLISION_DEBUG`).
- **`collision-cube` / `collision-cylinder`** — primitivas de colisión por entity.
- **`collision-responder`** — en el `cameraRig`: chequea a altura de cabeza y desliza
  a lo largo de la superficie (slide) o revierte a la última posición válida.
- **`boundary-collision`** — anillo: empuja al jugador de vuelta si sale del
  `radius` (60 en index.html; default del schema es 45).

### environment/
- **`forest`** — genera el bosque desde **`src/data/forest.js`** (`FOREST`): cada
  entrada crea un `composite-tree`; los tipos `normal`/`dead`/`palma` reciben
  `collision-cylinder` (arbustos/pasto son atravesables).
- **`composite-tree`** — arma tronco/copa/colisión/viento según el tipo. Expone
  `kill()`/`revive()` (idempotentes) para la mecánica de incendio: `kill()` oculta la
  copa (queda solo-tronco, igual que un `type:"dead"`) y chamusca el tronco; `revive()`
  restaura. Marca `this.isAlive` en tipos con copa (`normal`/`shrub`/`palma`).
- **`environment-degradation`** — en `#gameManager`. Conduce cielo + niebla + muerte de
  árboles según el tiempo del Safari (ver §4). Throttle interno y toggles incrementales
  (no recorre los ~97 árboles por frame). Colores objetivo como constantes en el archivo.
- **`canopy-wind`** — oscilación de copas.
- **`screen-fade`** — fade-out/in de pantalla (usado en transiciones de partida).
- **`shadow-control`** — control de sombras (atributo `shadow-control="enabled: false"`
  en la escena).

### performance/
- **`performance-optimizer`** — LOD por distancia: culling > `farDistance`, y
  `timeScale` del animation-mixer según near/mid/far. Throttle `updateInterval` (200 ms).
- **`material-optimizer`** — optimiza materiales de los glTF.

### movement.js / flight-locomotion.js
- **`vr-locomotion`** (`movement.js`) — locomoción por thumbstick en VR. Schema: `speed`
  (def 5.0), `acceleration`, `deceleration`, `deadZone`, `controllerHand` (def `left`),
  `useHeadDirection`. Flag de runtime `this.enabled` (def true): `vuelo-mode` lo pone en
  false para que el aleteo no compita con el thumbstick. Locomoción desktop la da
  `movement-controls` de aframe-extras (`speed: 0.2`).
- **`flight-locomotion`** (`src/components/flight-locomotion.js`) — locomoción del modo
  Vuelo (aleteo VR + vertical PC). Ver §8 gap #1 para el detalle.
- **`render-on-top`** (`src/components/render-on-top.js`) — helper de UI. Recorre las
  mallas descendientes del entity y les pone `depthTest/depthWrite=false` + `renderOrder`
  alto, para que un HUD pegado a la mano nunca se ocluya/recorte por profundidad. Aplicado
  a `#animalInfoCardVR` (la ficha VR se cortaba al extender el brazo por el sort de
  transparencias). Reaplica al cargar, tras unos delays y al abrir cada ficha (el texto
  MSDF reconstruye su malla al cambiar de valor).

---

## 8. Brechas conocidas hacia v1.0

1. **Modo Vuelo — IMPLEMENTADO (v1.0).** Sandbox de exploración con locomoción "tipo
   ave" y objetivo ligero de recolección. Entrada: cartel Vuelo (`.orb-minigame` →
   evento `vuelo-enter`). Salida: cartel principal (`.orb-exit` → `vuelo-exit`).
   - **`flight-locomotion`** (`src/components/flight-locomotion.js`) en `#cameraRig`,
     desactivado por defecto. Esquema `verticalMode` (def `gaze-gravity`,
     parametrizable para probar `gaze-nogravity`/`flap-lift` luego):
     - VR: aletear ambos mandos hacia abajo (vel. vertical > `flapVelThreshold`) →
       empuje hacia adelante en la dirección 3D de la mirada (cap `maxSpeed`); sin
       aletear, `drag` lo frena lento y `gravity` lo hace planear hacia abajo. Banking
       por umbral fijo: un mando más bajo que el otro por > `bankThreshold` rota el
       yaw del rig a `bankTurnRate`.
     - PC: WASD horizontal lo da `movement-controls`; el vertical es de
       `flight-locomotion` (gravedad lenta + Space=impulso arriba + Ctrl=caída rápida).
     - Límites: clamp `minAltitude`/`maxAltitude`. Borde y árboles los resuelven
       `boundary-collision` y `collision-responder` (XZ; volar > y≈8 libra árboles).
   - **`vuelo-mode`** (`src/components/game/vuelo-mode.js`) en `<a-scene>`: orquesta
     entrar/salir (fade + teleport), toggles de visibilidad (oculta carteles+showcase,
     muestra hunt), activa `flight-locomotion` y desactiva `vr-locomotion`
     (`loco.enabled=false`). Sin timer, sin derrota. Recolección: `safari-animal-clicked`
     marca "vistos" y emite `vuelo-animal-seen`; los 6 → mensaje.
   - **Tracker:** reutiliza `safari-compass` (la brújula direccional que reemplazó a
     progress-ui) mostrándola en `vuelo-started` con el timer oculto.
   - Eventos nuevos: `vuelo-enter`, `vuelo-exit`, `vuelo-started`, `vuelo-ended`,
     `vuelo-animal-seen {animalType, totalSeen, totalAnimals}`.
   - **Pendiente de tuning real en headset:** `flapVelThreshold`, `flapImpulse`,
     `maxSpeed`, `gravity`, `bankThreshold`, `bankTurnRate` (todos en el schema).
   - **Riesgo a verificar:** `movement-controls` podría leer el thumbstick VR y competir
     con el aleteo. Si pasa, desactivar también `movement-controls` en VR durante el vuelo.

2. **`audio-unlock` es un no-op.** `<a-scene>` lleva el atributo `audio-unlock` pero
   **no existe** un componente registrado con ese nombre (no está en `main.js` ni en
   `src/`). El desbloqueo de audio por gesto del usuario (requerido por móviles/headsets
   para autoplay) **no está garantizado**. Si hay problemas de audio que no suena
   hasta interactuar, implementar un componente `audio-unlock` real o quitar el atributo.

3. **README desactualizado:** dice puerto 5173; la config real es 3333. Considera
   corregirlo al tocar docs.

4. **Sin manifest PWA / service worker** todavía — necesario para el empaquetado APK
   (§9).

---

## 9. Exportar a `.apk` (estrategia)

El juego es WebXR; en Quest corre en el navegador. Para un `.apk` instalable
(sideload) la vía realista **sin reescribir el juego** es envolver el build web como
**PWA → Trusted Web Activity (TWA)**:

1. Hacer la app instalable: agregar `manifest.webmanifest` (name, icons, `display:
   standalone`, `start_url`) y un service worker mínimo (Vite plugin `vite-plugin-pwa`
   o manual). Servir sobre HTTPS público (Vercel ya lo da).
2. Generar el APK con **PWABuilder** (web) o **Bubblewrap** (CLI de Google) apuntando
   a la URL desplegada. Producen un proyecto Android/TWA y un `.apk`/`.aab` firmado.
3. Sideload al Quest con `adb install app.apk` (o SideQuest). El TWA abre la PWA a
   pantalla completa; el botón "Enter VR" de A-Frame entra a WebXR inmersivo.

Alternativas (mayor esfuerzo, fuera de alcance de v1.0 salvo decisión explícita):
empaquetar con Cordova/Capacitor, o portar a un runtime nativo (Unity/Godot) — esto
último es una reescritura completa, **no** recomendado para v1.0.

Antes de empaquetar: verificar `base: "/"` (ya correcto), que todos los assets carguen
por HTTPS, y probar el WebXR inmersivo en el Quest vía `npm run preview` sobre la LAN.

---

## 10. Gotchas / al editar

- **No metas el grafo de escena en JS** salvo lo ya generado por datos (`forest`).
  Entities estáticas van en `index.html`.
- Al añadir un componente nuevo: crearlo en `src/components/<dominio>/`, **registrarlo
  con un import en `main.js`** (sin él, el atributo es un no-op silencioso — justo el
  bug de `audio-unlock`).
- Estado del juego: pásalo por `safari-game-manager` y eventos, no con variables
  globales.
- Sombras: resolución del shadow map en `scene-shadows.js` (2048, bajado de 8192 por
  perf VR). Súbelo solo si el perf lo permite.
- Rendimiento VR es el rey: respeta `performance-optimizer`, mantén polys/draw calls
  bajos, evita duplicar THREE (§6).
- Targets: **desktop (mouse/teclado) Y VR (WebXR)** deben seguir funcionando ambos en
  cada cambio. La ficha de animal y el highlighter ya están escritos para cubrir las
  dos rutas — sigue ese patrón.
- **Dirección de mirada en A-Frame:** `object3D.getWorldDirection()` de THREE devuelve el
  **+Z** del entity, que apunta **hacia atrás** (los entities de A-Frame miran a −Z).
  Si calculas rumbo/orientación a partir de él, **niega el vector** (`.negate()`), o todo
  saldrá rotado 180° (fue el bug de la brújula en `safari-compass`).
- **HUD en la mano que se recorta/ocluye:** los UIs transparentes pegados al control se
  ordenan por distancia a la cámara y se "cortan" pasado cierto radio. Aplica
  `render-on-top` (depthTest off + renderOrder alto) en vez de pelear con offsets de z.
```
