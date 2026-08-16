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

Corre en **desktop** (WASD/flechas + mouse) y en **VR** (WebXR: mandos Touch y
**hand tracking**). Se despliega como web (Vercel) y se empaqueta como **APK** para
Meta Quest vía PWA → TWA (§9). Además hay una **página WebAR** separada en `/ar` (§12).

### Estado — Versión 1.0 (los tres objetivos están cumplidos)

1. **Modo Safari** (juego con objetivo, narrativo): el jugador inicia desde el cartel
   "Safari" y tiene **2 min** para encontrar/"salvar" a los 6 animales antes de que el
   bosque se incendie. A medida que se agota el tiempo el ambiente se degrada (árboles
   con copa → árboles muertos, cielo azul → rojo, vignette rojo, loop de fuego). Si los
   salva todos a tiempo, el bosque se recupera; si no, queda quemado. **Hecho** (ver §4).
   Es el **único modo de juego**.
2. **Locomoción libre**: lo que antes se planeó como un "**modo Vuelo**" separado
   (sandbox con su propio cartel, entrada/salida y estado) **ya no existe**. El
   componente `vuelo-mode` fue **eliminado** junto con todos los eventos `vuelo-*`;
   el cartel principal quedó decorativo. Lo que sobrevivió es **`flight-locomotion`**,
   un componente de locomoción que convive con caminar/teleport en vez de reemplazar
   la escena — pero hoy está **desactivado** en `index.html` (§7 y §8 gap #1).
3. **Exportable a `.apk`**: **hecho**. PWA (`vite-plugin-pwa`, manifest + service
   worker que precachea todo el juego para correr offline) empaquetada como TWA con
   Bubblewrap. Ver §9.

**Si leés esta guía buscando "modo Vuelo": no lo busques en el código.**
`grep -rn "vuelo" src/ index.html` no devuelve nada. Cuando trabajes en una tarea,
ubícala respecto a estos objetivos y respetá las convenciones de §5. No rompas el
modo Safari (el único juego) al tocar locomoción.

---

## 2. Comandos

| Comando                | Qué hace                                                              |
| ---------------------- | --------------------------------------------------------------------- |
| `npm install`          | Instala dependencias (`aframe`, `aframe-extras`)                      |
| `npm run dev`          | Dev server Vite con HMR. **Puerto fijo 3333, HTTPS, host: 0.0.0.0**   |
| `npm run build`        | Build de producción a `dist/` (multipágina: juego + `/ar`)            |
| `npm run preview`      | Sirve el build (mismas opciones que dev: 3333/HTTPS/host)             |
| `npm run inspect`      | Dev server en **HTTP** (`NO_SSL=1`) para el Inspector — ver §11       |
| `npm run watch`        | aframe-watcher: persiste ediciones del Inspector a `index.html` (§11) |
| `npm run format`       | Prettier sobre todo el repo                                           |
| `npm run format:check` | Verifica formato sin escribir (CI-friendly)                           |

- **HTTPS con cert auto-firmado** (`@vitejs/plugin-basic-ssl`): obligatorio para
  WebXR sobre la LAN (http solo sirve en `localhost`). El navegador del headset
  avisará del cert no confiable una vez — aceptar.
- Para probar en un Quest: `npm run dev`, abrir `https://<IP-de-tu-Mac>:3333` en el
  navegador del headset (misma Wi-Fi).
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
`this.el.sceneEl`. El hub de estado es **`safari-game-manager`**. Estos son **todos**
los eventos del juego (los `vuelo-*` de versiones anteriores ya no existen):

| Evento                  | Emisor                           | Quién reacciona                                                                                                                                         | Payload                                  |
| ----------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `safari-start-game`     | `orb-controller` (cartel Safari) | `safari-game-manager.startGame`                                                                                                                         | —                                        |
| `safari-game-started`   | `safari-game-manager`            | `safari-compass` (muestra HUD + snapshot de posiciones), `game-modes` (→Safari), `environment-degradation` (arranca sano + loop de fuego)               | —                                        |
| `safari-animal-clicked` | `animal-clickable`               | `safari-game-manager` (cuenta hallazgo si `gameActive`), `animal-info-card` (abre ficha)                                                                | `{animalType, element}`                  |
| `safari-animal-found`   | `safari-game-manager`            | `safari-compass` (oculta icono), `animal-clickable` (glow verde)                                                                                        | `{animalType, totalFound, totalAnimals}` |
| `safari-timer-update`   | `safari-game-manager` (tick)     | `safari-compass` (timer + color), `environment-degradation` (cielo/niebla/árboles/vignette/volumen ∝ tiempo)                                            | `{timeRemaining, timeLimit}`             |
| `safari-game-ended`     | `safari-game-manager`            | `game-modes` (→Idle), `safari-compass` (oculta HUD), `environment-degradation` (restaura a sano)                                                        | `{won}`                                  |
| `safari-game-reset`     | `safari-game-manager`            | `animal-clickable.reset`, `safari-compass` (reset), `environment-degradation` (restaura a sano), `animal-spawner` (reparte animales entre spawn points) | —                                        |

Orden importante: `safari-game-reset` se emite **dentro de** `startGame`, **antes** de
`safari-game-started`. Por eso `animal-spawner` ya movió los animales cuando
`safari-compass` toma su snapshot de posiciones.

Al añadir comportamiento, **prefiere emitir/escuchar estos eventos** antes que
llamar componentes entre sí. La página `/ar` tiene su **propio** bus (`ar-*`), aislado
del juego principal — ver §12.

---

## 4. Loop de juego del modo Safari (estado actual)

Dos conjuntos de animales en `index.html`, alternados por `game-modes`:

- **Idle** (`#showcaseAnimals`): arco de 6 animales a la derecha del spawn que miran
  al jugador. Click → abre ficha (`animal-info-card`). Visible al inicio y tras
  terminar una partida.
- **Safari** (`#huntAnimals`, `visible=false` por defecto): los 6 animales repartidos
  por el mapa. Sus posiciones autoradas en el HTML son solo un fallback: cada partida
  `animal-spawner` los reubica al azar entre los **12 spawn points**. Visibles solo
  durante la partida. `game-modes` también oculta los flamencos decorativos del cielo
  (`#animals`) mientras dura el Safari.

Secuencia: click en cartel Safari → `safari-start-game` → `safari-game-manager`
hace fade-out (`screen-fade`), resetea (→ `safari-game-reset` → reparte spawns),
activa `gameActive`, oculta carteles, suena `game-start`, emite `safari-game-started`,
fade-in, muestra "¡ENCUENTRA A LOS 6 ANIMALES!". `tick` descuenta el timer
(`timeLimit` **120 s** en el entity `#gameManager`; el schema default sigue siendo 300).
Encontrar un animal = clickearlo → `safari-animal-clicked` → si activo, `checkAnimal`
lo marca, suena `game-found`, glow verde permanente, se oculta su icono del compás.
6/6 → `endGame(true)` (gana, muestra el tiempo empleado en **mm:ss**). Timer a 0 →
`endGame(false)` (pierde, muestra cuántos encontró). `endGame` muestra el mensaje 5 s,
fade-out, teletransporta el rig a `0 0 0` y resetea la rotación de la cámara, vuelve a Idle.

**HUD brújula** (`#compassUI`): tira de iconos frente a la cámara que se deslizan
apuntando hacia cada animal + timer MSDF. `safari-compass` lo maneja (reemplazó al
viejo `progress-ui`).

**Degradación ambiental ("el bosque se incendia")** — `environment-degradation` (en
`#gameManager`) escucha `safari-timer-update` y avanza `p = t ** 3` con
`t = 1 - timeRemaining/timeLimit` (**exponencial**: el bosque aguanta sano la primera
mitad y el incendio se acelera al final; exponente en la constante `DEGRADATION_EXP`).
Conforme `p` sube: tinta el `<a-sky id="sky">` de azul → rojo (y la niebla hacia humo),
va matando árboles vivos de a poco vía `composite-tree.kill()` (que les pone llamas
`low-poly-fire` en la base), **sube el volumen del loop de fuego** `#soundFire`
(`fire.mp3`, pico en `FIRE_MAX_VOLUME`) y opaca un **vignette rojo de daño** pegado a
la cámara (plano con textura de canvas generada en `createVignette()`, pico en
`VIGNETTE_MAX`). En `safari-game-ended` (sea victoria o derrota)
y en `safari-game-started/-reset` restaura todo a sano (cielo azul, árboles revividos sin
fuego, sonido detenido): como `safari-game-ended` se emite durante el fade-a-negro
mientras teletransporta al jugador frente al cartel, el reset es imperceptible y el
jugador siempre vuelve a un bosque vivo.

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
  `animal-info-card`, `game-modes`, `animal-spawner`). No es elegante pero es el patrón;
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
  **no** los importes desde JS. Subcarpetas por tipo: `models/` (`.glb`), `sfx/`
  (audio), `img/`, `ui/` (PNG), `fonts/` (atlas MSDF).
- Modelos `.glb` (en **`public/assets/models/`**) exportados de Blender/Blockbench.
  Los **fuentes** de arte (`.bbmodel` de Blockbench) viven en **`art-src/`** en la raíz
  (versionados, pero **fuera** de `public/` para no desplegarse). Audio crudo y demás
  binarios pesados, fuera del repo. Total actual de assets ~5 MB; el más pesado es
  `models/ground.glb` (476 KB) y `models/scenario.glb` (156 KB) — presupuesto sano VR.
- Quirk de nombres: el tipo de animal es **`flamingo`** pero el archivo es
  **`flamengo`**. Helpers `animalAssetName/animalIconAssetId/animalIconUrl` en
  `data/animal-info.js` encapsulan el mapeo. Si tocas esto, céntralo en un solo lugar.
- **Fuente del texto VR (MSDF):** los `<a-text>` usan un atlas **local**
  `public/assets/fonts/arial-es-msdf.{json,png}` (Arial) en vez del `Roboto-msdf` del
  CDN de A-Frame, porque ese **no incluye acentos ni ñ** y desaparecían en VR. Si agregas
  un `a-text`, ponle `font="/assets/fonts/arial-es-msdf.json"` +
  `font-image="/assets/fonts/arial-es-msdf.png"`. Para regenerar el atlas con más glifos:
  `npx msdf-bmfont-xml -f json -t msdf --charset-file <charset> -o ...png <Arial.ttf>`.

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
- **`animal-spawner`** — en `#gameManager`. En `safari-game-reset` (que se emite al inicio
  de `startGame`, antes de `safari-game-started`) reparte los 6 animales de `#huntAnimals`
  entre los spawn points (`[spawn-point]`) al azar (Fisher–Yates), copiando la pose completa
  (position + rotation) de cada marcador al animal. Así cada partida los animales aparecen en
  lugares distintos. Si hay <6 marcadores, no toca nada (quedan las posiciones autoradas). Como
  corre antes de `safari-game-started`, el compás toma el snapshot de las posiciones nuevas.
- **`debug-visor-toggle`** — en el cubo `#debugToggleCube` (detrás de `#mainCartelGrande`).
  Al clickearlo (mouse o hand-ray VR) togglea el "visor de debug": sincroniza
  `window.COLLISION_DEBUG` y `window.SPAWN_DEBUG` y refresca colisiones + spawn points. Es el
  equivalente in-world del viejo `Ctrl+C` (que sigue existiendo, solo para colisiones).
- **`safari-compass`** — brújula direccional HUD (`#compassUI`): tira de iconos que se
  deslizan apuntando hacia cada animal; timer MSDF que recolorea al bajar el tiempo
  (blanco → amarillo <40 s → rojo <15 s). **Reemplazó a `progress-ui`** (ya borrado).
  Expone `setTimerVisible()`, hoy sin llamadores (lo usaba el ex-modo Vuelo).
- **`orb-controller`** — hover/click de carteles. Hoy **solo** maneja `.orb-start` →
  `safari-start-game`; las clases `.orb-minigame`/`.orb-exit` del ex-modo Vuelo ya no
  existen en el HTML ni en el componente. El cartel principal (`#mainCartelGrande`) es
  **decorativo**: no lleva `orb-controller`, solo aloja el cubo de debug.
- **`animal-info-card`** — ficha de animal en DOM (desktop) o mano izq (VR).
- **`staggered-start`** — desfasa el inicio de las animaciones glTF para que no
  arranquen sincronizadas (`maxOffset`).

### animals/

- **`animal-clickable`** — emite `safari-animal-clicked`; pinta glow verde al ser
  encontrado; `reset()` lo limpia.
- **`animal-highlighter`** — montado UNA vez en `<a-scene>`. Highlight amarillo en
  hover vía `mouseenter`/`mouseleave` que burbujean al scene (cubre desktop y VR).
  No pisa el verde de los ya encontrados. El snapshot del emissive original se
  indexa **por material** (no por malla): los glTF comparten material entre mallas,
  y por malla el original quedaba contaminado y el amarillo se "pegaba".
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

- **Bosque (estático, sin componente `forest`)** — las **213** entities con
  `composite-tree` viven en **`index.html`**, dentro de `<a-entity id="trees">`, para
  poder editarlas con el Inspector + aframe-watcher (ver **§11**). Reparto por tipo:
  **46 `normal`**, **40 `pasto`**, **13 `shrub`**, **12 `palma`**, **6 `roca`**, más
  **96 `ring-N`** del anillo decorativo de fondo `#tree-ring` (no inflamables, ver
  `flammable` abajo). Cada uno: `id` único con prefijo por tipo (`normal-N`, `pasto-N`,
  `ring-N`, …) — el watcher solo guarda entities con `id` —, `position`,
  `scale="s s s"` (transform) y
  `composite-tree="type: …"`; los tipos `normal`/`palma`/`roca` llevan además
  `collision-cylinder` (arbustos/pasto son atravesables). El orden en el DOM define qué
  árboles se queman primero (cosmético). _El generador por datos (`forest` component +
  `src/data/forest.js`) fue removido; la fuente de verdad del bosque es el HTML._ _No se
  usan `dead` trees: son `normal` (con copa)._
- **`composite-tree`** — arma tronco/copa/colisión/viento según el tipo. **La escala la
  toma del transform del host (`scale="s s s"`), no de una prop** (así el gizmo del
  Inspector la edita y persiste). Expone
  `kill()`/`revive()` (idempotentes) para la mecánica de incendio: `kill()` oculta la
  copa (queda solo-tronco), chamusca el tronco y le pone llamas `low-poly-fire` en la
  base; `revive()` restaura todo y quita el fuego. Marca `this.isAlive` en tipos con copa
  (`normal`/`shrub`/`palma`). **`flammable` (schema, def `true`):** con `flammable: false`
  el árbol queda con `isAlive=false` → `environment-degradation` lo ignora y no se quema
  (se usa en el anillo decorativo de fondo `#tree-ring`, que debe quedar intacto durante el
  incendio). **Tinte del tronco:** clona el material por árbol antes de
  chamuscar (los glTF comparten material; sin clonar, un árbol oscurecía a todos y el
  color original quedaba contaminado → troncos negros tras la partida).
  **Variación de matiz del follaje:** cada instancia guarda un `hueShift`/`lightShift`
  aleatorio (schema `hueVariation`/`lightVariation`, sutil por defecto) y lo aplica al
  cargar el modelo vía `tintOnLoad`→`tintFoliage` (copa/hoja/arbusto/pasto), clonando el
  material por malla (mismo motivo que el tronco). **Tipo `roca`:** arbusto gris —
  reutiliza el modelo de copa de arbusto (`#samuuCanopyModel`) a ras de suelo, pero se
  desatura a gris (`tintRock`), **no** lleva `canopy-wind` y **no** es `isAlive` (no se
  quema). Es sólido: lleva `collision-cylinder` en su entity de `index.html`.
- **`spawn-point`** — marcador de spawn de animales del Safari. Entities estáticas en
  `index.html` (`<a-entity id="spawnPoints">`, `id="spawn-N"`), editables con Inspector +
  aframe-watcher igual que el bosque (la pose vive en el transform, ver §11). Solo construye un
  helper visual (anillo + pilar + flecha que apunta a −Z = dirección de mirada del animal),
  **oculto por defecto** (`window.SPAWN_DEBUG`); expone `updateDebugVisibility()` (mismo patrón
  que `collision-cube`). `animal-spawner` los descubre con `[spawn-point]` y los reparte.
- **`low-poly-fire`** — partículas de fuego low-poly (tetraedros que suben/encogen y
  hacen lerp amarillo→naranja→rojo→oscuro). Geometría **compartida** entre instancias
  (perf VR), materiales por partícula. Lo instancia `composite-tree` al quemarse un árbol.
  Schema: `count`/`height`/`radius`/`size`/`speed`.
- **`environment-degradation`** — en `#gameManager`. Conduce cielo + niebla + muerte de
  árboles + **volumen del loop de fuego** según el tiempo del Safari, con curva
  **exponencial** (ver §4). Descubre los árboles con `querySelectorAll("[composite-tree]")`
  filtrando `ct.isAlive` (funciona igual con las entities estáticas de `index.html`).
  Throttle interno y toggles incrementales (no recorre los 213 árboles por frame).
  Constantes en el archivo: colores, `DEGRADATION_EXP`, `FIRE_MAX_VOLUME`.
- **`canopy-wind`** — oscilación de copas.
- **`screen-fade`** — fade-out/in de pantalla (usado en transiciones de partida). El
  overlay lleva `render-on-top` (depthTest/depthWrite off): como plano `opacity:0` a 0.5m
  de la cámara escribía profundidad y ocluía el fuego; así no ocluye nada y aun cubre todo
  durante el fade.
- **`shadow-control`** — control de sombras (atributo `shadow-control="enabled: false"`
  en la escena).

### performance/

- **`performance-optimizer`** — LOD por distancia: culling > `farDistance`, y
  `timeScale` del animation-mixer según near/mid/far. Throttle `updateInterval` (200 ms).
- **`material-optimizer`** — optimiza materiales de los glTF.

### Locomoción e input (raíz de `components/`)

Todos viven en el `#cameraRig` y **coexisten**: cada uno escucha un input distinto
(thumbstick / pinch / aleteo / teclado), así que no compiten entre sí.

- **`vr-locomotion`** (`movement.js`) — locomoción por thumbstick en VR (evento
  `axismove`, solo mandos). Schema: `speed` (def 5.0), `acceleration`, `deceleration`,
  `deadZone`, `controllerHand` (def `left`), `useHeadDirection`. Flag de runtime
  `this.enabled` (def true) — hoy **nadie lo pone en false** (lo hacía `vuelo-mode`).
  Locomoción desktop la da `movement-controls` de aframe-extras (`speed: 0.2`).
- **`pinch-teleport`** — locomoción de **caminar con manos desnudas** (hand tracking).
  Apuntar al suelo con la mano elegida (`hand`, def `left`) + pinch → teletransporta el
  rig al punto, dentro de `maxRange` (60 en el HTML) y validando contra
  `collision-manager`. Muestra `#teleportMarker` como destino. Se **inhibe** si ese
  frame el `hand-ray` de esa mano apunta a un `.clickable`/`.animal` (la UI manda),
  porque el pinch también es el "click".
- **`hand-ray`** — **puntero láser propio** para manos y mandos, en `#leftHand`/
  `#rightHand`. Reemplaza a `raycaster`+`cursor`+`line` de A-Frame en esas entidades.
  Existe porque `hand-tracking-controls` deja el `object3D` de la entidad en el **origen
  del rig** y trackea muñeca/dedos en objetos aparte (en mundo), así que el raycaster
  nativo disparaba desde el rig y no desde la mano. `hand-ray` arma su propio
  `THREE.Raycaster` en espacio-mundo desde las articulaciones y despacha
  `mouseenter`/`mouseleave`/`click` con el **mismo contrato** del cursor — por eso
  `animal-highlighter`, `orb-controller` y `animal-clickable` funcionan sin cambios.
  Apunta desde el nudillo del dedo medio (`AIM_JOINT_INDEX = 11`), no desde la punta del
  índice, que salta al hacer pinch y hacía temblar el láser.
- **`flight-locomotion`** — vuelo "tipo ave": en VR, aletear ambos mandos hacia abajo
  empuja en la dirección 3D de la mirada, con `drag`/`gravity` para planear y banking por
  diferencia de altura entre manos; en PC, solo el eje vertical (Space = impulso arriba,
  Ctrl = caída rápida). **⚠️ HOY ESTÁ DESACTIVADO**: `index.html` lo monta con
  `flight-locomotion="enabled: false"`, así que el componente entero es código muerto
  (el `tick` sale en la primera línea). El comentario de cabecera del archivo todavía
  afirma lo contrario ("SIEMPRE ACTIVO") — **está desactualizado**. Ver §8 gap #1.
- **`quest-immersive-launch`** (`src/components/quest-immersive-launch.js`) — en
  `<a-scene>`. Llama `sceneEl.enterVR()` en `renderstart` **solo cuando el juego corre
  dentro del APK de Quest**, porque el APK está empaquetado en modo `immersive` y sin eso
  no se dibuja nada (ver §9 — fue el bug de "suena pero no se ve"). Dos guardas: contexto
  de app instalada (`window.getDigitalGoodsService`, o un `document.referrer`
  `android-app://` como respaldo si esa API no está expuesta en el Custom Tab) **y**
  `navigator.xr.isSessionSupported("immersive-vr")` — esta segunda deja el desktop intacto
  y además le da tiempo a la detección asíncrona de A-Frame (ver el trap de abajo).
  Reintenta hasta 4 veces con backoff y logea todo: en modo immersive un fallo es pantalla
  negra sin UI, así que `chrome://inspect` es el único diagnóstico.

  **⚠️ Trap de `enterVR()` — el "falso éxito":** que la promesa de `enterVR()` **resuelva
  NO significa que estés presentando en el visor**. Si `checkHeadsetConnected() || isMobile`
  da false, A-Frame toma la rama _"No VR"_ (`a-scene.js`): agrega el estado `vr-mode`, emite
  `enter-vr`, pide fullscreen y **resuelve sin haber llamado nunca a `requestSession`**. Y es
  irreversible, porque el `enterVR()` siguiente corta de entrada con `"Already in VR."`.
  Peor: `checkHeadsetConnected()` lee `supportsVRSession`, que `utils/device.js` resuelve de
  forma **asíncrona**, así que hay carrera real. Por eso el componente (a) espera
  `isSessionSupported` antes de intentar, (b) valida el éxito **solo** con
  `sceneEl.xrSession` —nunca con la resolución de la promesa— y (c) hace
  `removeState("vr-mode")` antes de reintentar. Si tocás este archivo, no "simplifiques"
  esos tres puntos.

- **`render-on-top`** (`src/components/render-on-top.js`) — helper de UI. Recorre las
  mallas descendientes del entity y les pone `depthTest/depthWrite=false` + `renderOrder`
  alto, para que un HUD pegado a la mano nunca se ocluya/recorte por profundidad. Aplicado
  a `#animalInfoCardVR` (la ficha VR se cortaba al extender el brazo por el sort de
  transparencias) y al overlay de `screen-fade` (evitar que ocluya el fuego). Reaplica al
  cargar, tras unos delays y al abrir cada ficha (el texto MSDF reconstruye su malla al
  cambiar de valor).

---

## 8. Brechas conocidas / deuda

1. **`flight-locomotion` está desactivado — decidir si vuelve o se borra.** El
   componente existe completo (214 líneas, schema tuneado) pero `index.html` lo monta
   con `enabled: false` (commit `9eac2af`, "desactiva gestos de vuelo"), así que es
   **código muerto**. Además su comentario de cabecera todavía dice "SIEMPRE ACTIVO
   (enabled:true)", que es falso — si lo tocás, corregí el comentario. Dos salidas
   sanas: (a) reactivarlo y tunear en headset real `flapVelThreshold`, `flapImpulse`,
   `maxSpeed`, `gravity`, `bankThreshold`, `bankTurnRate`; o (b) eliminarlo junto con
   el import de `main.js` y el atributo del rig. **No lo dejes a medias.**
   - Riesgo si se reactiva: `movement-controls` podría leer el thumbstick VR y competir
     con el aleteo. Si pasa, desactivar `movement-controls` en VR mientras se vuela.

2. **`audio-unlock` es un no-op.** `<a-scene>` lleva el atributo `audio-unlock`
   ([index.html:159](index.html)) pero **no existe** un componente registrado con ese
   nombre (no está en `main.js` ni en `src/`). El desbloqueo de audio por gesto del
   usuario (requerido por móviles/headsets para autoplay) **no está garantizado**.
   Ahora que se distribuye como APK en Quest, éste es el entorno donde más pega:
   implementar un componente `audio-unlock` real o quitar el atributo.

3. **Bug de sintaxis en `collision-cube` del cartel principal.**
   `collision-cube="width: 7; depth: 0.3; height: 16 offsetY: -10"` — falta el `;`
   antes de `offsetY`. A-Frame parsea `height` como `"16 offsetY: -10"` (`parseFloat`
   → 16, así que la altura sobrevive) pero **`offsetY` cae silenciosamente al default
   `0`**: la caja va de y 0→16 en vez de −10→6. Impacto bajo (a altura de cabeza tapa
   igual), pero no es lo que se quiso. Es el modo de fallo típico del parser de A-Frame:
   **silencioso**. Revisá los `;` al editar atributos multi-propiedad.

4. **`static-body` vestigial.** `#boundaryRing` lleva el atributo `static-body`, de
   `aframe-physics-system`, que **no es dependencia del proyecto**. No hace nada (y la
   entity es `visible="false"`). Borrable.

5. **Bundle de 1.39 MB** (377 KB gzip) en un solo chunk `main`. Es casi todo A-Frame,
   así que no hay mucho que rascar sin code-splitting real; Vite avisa en cada build.
   Ignorable, pero que no sorprenda.

---

## 9. Exportar a `.apk` (HECHO — cómo regenerarlo)

El juego es WebXR; en Quest corre en el navegador. El `.apk` instalable se arma
envolviendo el build web como **PWA → Trusted Web Activity (TWA)**. **Ya está hecho**;
esto documenta el pipeline para rehacerlo.

**Paso 1 — PWA (en el repo).** `vite-plugin-pwa` está configurado en `vite.config.js`:
manifest (`display: fullscreen`, `orientation: landscape`, iconos 192/512/512-maskable
en `public/`) + service worker Workbox con `registerType: "autoUpdate"`. El
`globPatterns` incluye **glb/gltf/bin/mp3/wav/ogg/png/…** a propósito: sin eso el juego
no cargaría offline dentro del APK. `maximumFileSizeToCacheInBytes` está en 6 MB por
`ground.glb` y compañía. `/ar/` está en `navigateFallbackDenylist` (carga A-Frame/AR.js
por CDN, no es objetivo del APK). Un `npm run build` precachea ~56 entradas / ~7.3 MB.

**Paso 2 — TWA (fuera del repo, con Bubblewrap).** Los artefactos generados
(`twa-manifest.json`, `build.gradle`, `gradlew`, `app/`, `android.keystore`, `*.apk`,
`*.aab`) están **gitignoreados a propósito** — el keystore es la clave de firma privada
y todo lo demás es regenerable. Config actual: `packageId app.vercel.nes360.twa`,
host `nes360.vercel.app`, **`enableXRScene: true`** (importante para WebXR).

**Paso 3 — verificación del dominio.** `public/.well-known/assetlinks.json` publica la
huella de firma para que el TWA abra sin barra de URL. Si **regenerás el keystore**, hay
que actualizar ese archivo o el APK mostrará la barra del navegador.

**Paso 4 — sideload:** `adb install app-release-signed.apk` (o SideQuest).

### ⚠️ Modo "immersive": la app DEBE pedir la sesión WebXR ella misma

`twa-manifest.json` tiene **`horizonOSAppMode: "immersive"`** (+ `isMetaQuest: true`).
Según la doc de Meta, `immersive` = _"an app that launches directly into WebXR"_: **no
hay panel 2D ni superficie de fallback**. Si la página no pide la sesión inmersiva
apenas carga, **no se dibuja un solo frame en las pantallas del visor** — el jugador se
queda para siempre en la pantalla de carga de Horizon OS, aunque **el audio suene**
(porque la página sí está corriendo). El botón "Enter VR" de `vr-mode-ui` no salva
nada: en modo immersive nunca es visible para clickearlo.

Ese fue un bug real ("el sonido entra pero no veo nada", Quest 3S y Quest 2). Lo cubre
**`quest-immersive-launch`** (§7), que llama `enterVR()` en `renderstart` **solo** dentro
del APK. Si algún día se saca ese componente, el APK vuelve a la pantalla de carga eterna.

**El TWA no empaqueta contenido web** — abre `https://nes360.vercel.app/` por red (el
`.apk` solo trae libs nativas). Consecuencia práctica muy útil: **arreglos de la web se
publican redeployando, sin reconstruir ni reinstalar el APK**.

**Pero ojo con el service worker:** `index.html` está precacheado con revisión, así que
tras un deploy **el primer arranque todavía sirve el HTML viejo** (el SW nuevo se
instala en ese arranque y reclama el cliente). Hay que **cerrar la app del todo y
relanzarla** para ver el cambio. Si se resiste: _Settings → Apps → No Están Solos →
Clear data/cache_. Reinstalar el APK **no** alcanza — el TWA usa el storage del Quest
Browser.

**Debug en el visor:** `adb logcat` + `chrome://inspect#devices` en Chrome de escritorio
es la única forma real de ver la consola dentro del headset.

Antes de empaquetar: verificar `base: "/"` (ya correcto), que todos los assets carguen
por HTTPS, y probar el WebXR inmersivo en el Quest vía `npm run preview` sobre la LAN.

Alternativas (mayor esfuerzo, sin motivo hoy): Cordova/Capacitor, o portar a un runtime
nativo (Unity/Godot) — esto último es una reescritura completa, **no** recomendado.

---

## 10. Gotchas / al editar

- **No metas el grafo de escena en JS.** Todas las entities de la escena — incluido el
  bosque (`#trees`) — viven en `index.html`. El bosque solía generarse desde datos; ahora
  es estático para poder editarlo con el Inspector (ver §11). Si volvés a generar algo por
  JS, que sea la excepción, no la regla.
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
- **Materiales glTF compartidos (¡recurrente!):** instancias de un mismo `.glb` (y mallas
  dentro de un modelo) **comparten el objeto material por referencia**. Si tintas/animas
  `material.color`/`.emissive` directo, afectas a TODAS y, peor, el "snapshot del color
  original" se contamina. Soluciones usadas: **clonar el material por entity** antes de
  mutarlo (`composite-tree.tintTrunk`), o indexar el snapshot **por material** capturando
  una sola vez antes de mutar (`animal-highlighter`). Fueron los bugs de troncos negros y
  de highlight amarillo pegado.
- **Transparentes que ocluyen (depth write):** un mesh transparente —aunque sea
  `opacity:0`— escribe en el depth buffer por defecto y puede ocluir partículas/HUD detrás
  (pasó con el cilindro de colisión y el overlay de `screen-fade` tapando el fuego).
  `visible:false` si es vestigial, o `render-on-top`/`depthWrite:false` si debe verse.
- **Texto VR sin acentos:** el MSDF `Roboto-msdf` del CDN no trae á/é/í/ó/ú/ñ. Usa el atlas
  local de §6 en todo `a-text` (incl. los creados desde JS con `shader:msdf`).
- **`hand-tracking-controls` secuestra las entities hijas al `wristObject3D`:** cualquier hijo
  de una entity con `hand-tracking-controls` (p.ej. la ficha VR `#animalInfoCardVR` bajo
  `#leftHand`) es **reparentado por A-Frame al `wristObject3D` interno** cuando carga el modelo
  de mano — y eso pasa **también con mandos Touch** (`iterateControllerProfiles`). Pero el wrist
  solo se mueve con **manos reales** (`updateWristObject` gatea en `controller.hand`), así que con
  mando la ficha quedaba clavada en el origen ("no se pega al control"). Fix en `hand-ray`
  (`anchorWristToController`): en modo mando alinea el `wristObject3D` con el `object3D` de la
  entidad (que sí posiciona `meta-touch-controls`), ambos colgados del rig. En modo manos lo maneja
  A-Frame. Si movés la ficha VR fuera de `#leftHand`, este secuestro deja de aplicar.
- **Chunk compartido entre los dos entries evaluado antes de A-Frame (solo prod):** el juego
  (`src/main.js`) **bundlea** A-Frame del npm; la página `/ar` (`src/ar/main.js`) lo toma del
  **CDN**. Cualquier módulo importado por AMBOS entries (p.ej. `low-poly-fire.js`) Rollup lo
  extrae a un **chunk compartido** que, por semántica ESM, se **hoistea al tope del entry y se
  evalúa ANTES del cuerpo** — o sea antes del A-Frame inlineado del juego. Como esos componentes
  hacen `AFRAME.registerComponent(...)` en el top-level, revientan con **`AFRAME is not defined`**:
  la `<a-scene>` no arranca y los `<img>` de `<a-assets>` (iconos del tracker) quedan como imágenes
  DOM sueltas. **En dev NO se ve** (Vite no bundlea y respeta el orden de `import`), solo en el
  build de producción → pantalla en blanco en Vercel. Regla: **no compartas módulos que toquen el
  global `AFRAME`/`THREE` entre el entry del juego y el de `/ar`.** Si necesitás reusar uno (como
  `low-poly-fire`), impórtalo en `/ar` con un **sufijo de query** (`import ".../low-poly-fire.js?ar"`):
  Rollup lo trata como módulo distinto (mismo source, sin copia física), no comparte chunk, y cada
  entry inlinea su copia después de su A-Frame.

---

## 11. Editar el bosque (y la escena) con el Inspector + aframe-watcher

El bosque (`<a-entity id="trees">` en `index.html`) son **entities estáticas** justamente
para poder moverlas/rotarlas/escalarlas visualmente con el **A-Frame Inspector** y guardar
los cambios de vuelta al HTML con **aframe-watcher**. El watcher **solo persiste entities
que tienen `id`** — por eso cada árbol lleva `id="forest-N"`.

**Flujo (dos terminales):**

1. **`npm run inspect`** — sirve el juego en **HTTP** (`NO_SSL=1`, `http://localhost:3333`).
   Usá este, **no** `npm run dev`: el Inspector guarda con un POST a `localhost:51234` y
   desde una página **HTTPS** ese POST se bloquea como _mixed content_ (falla silencioso con
   "aframe-watcher not running" aunque esté corriendo).
2. **`npm run watch`** — levanta el aframe-watcher (companion server en `localhost:51234`,
   vigila `index.html`).
3. Abrí `http://localhost:3333`, entrá al Inspector con **`Ctrl + Alt + I`**, editá árboles
   (gizmo de **mover/rotar/escalar**; la escala persiste porque vive en el transform, ver §7)
   o sus params (`composite-tree="type: …"`), y dale **Save**.
4. Aceptá el diff en la terminal del watcher → reescribe `index.html` en el sitio.
5. Cerrá con **`npm run format`** (el watcher no respeta el formato de Prettier).

**Gotchas del flujo:**

- **Solo se guardan entities con `id`.** Si **duplicás** un árbol en el Inspector, asegurate
  de que el nuevo tenga un `id` único (p.ej. `forest-117`) o no se persistirá.
- **Solo se editan los hosts.** El tronco/copa/fuego los crea `composite-tree` en runtime
  (sin `id`), así que no se editan por Inspector — está bien: editás dónde/cómo de cada
  árbol, no sus mallas internas.
- **Revisá el diff** (`git diff index.html`): el Inspector a veces reescribe más atributos de
  los que tocaste (redondeos de posición, etc.).
- El **orden en el DOM** de los árboles vivos define cuáles se queman primero en el Safari
  (cosmético) — si reordenás el markup, cambiás ese orden.

**Spawn points de animales (mismo flujo):** `<a-entity id="spawnPoints">` (`id="spawn-N"`,
componente `spawn-point`) usa exactamente este workflow — la pose (position + rotation) vive
en el transform del host, editable/persistible por Inspector + watcher. Como el helper está
oculto por defecto (`window.SPAWN_DEBUG`), **revelalo primero** clickeando el cubo blanco
detrás del cartel grande (`#debugToggleCube`) para ver los anillos/flechas mientras los movés.
Cada marcador define la pose que adopta el animal que le toque; la **flecha apunta a −Z** (hacia
dónde mirará). Podés **agregar** marcadores (más puntos = más variedad; `id` único obligatorio) o
**borrarlos** (mínimo 6, si no `animal-spawner` deja las posiciones autoradas y avisa por consola).

---

## 12. La página WebAR (`/ar`) — proyecto hermano, NO toques el juego desde acá

Además del juego VR hay un **minijuego WebAR para celular** en `ar/index.html`, servido
en **`/ar/`** (con barra; un middleware de `vite.config.js` redirige `/ar` → `/ar/`,
porque sin la barra caía en el fallback SPA y servía el juego principal). Vite lo
construye como **segundo entry** (`rollupOptions.input.ar`), así que sale en el mismo
build y deploy.

**Qué es:** apuntás la cámara del teléfono al **marcador Hiro** (AR.js) y sobre él
aparece un diorama del bosque en miniatura. Los 6 animales se esconden entre arbustos;
tenés **1 minuto** para tocarlos a todos mientras el bosque se incendia con la **misma
curva exponencial** `p = t³` del juego grande.

**Es un mundo aparte, a propósito:**

- **Su propia A-Frame, por CDN, fijada en 1.3.0** (el juego usa 1.7.1 bundleada de npm).
  AR.js 3.4.x se construyó contra A-Frame ~1.3/THREE r1xx; con 1.7.1 la proyección de
  cámara de AR.js se rompe y **el feed sale negro**. Bajar la versión acá **no afecta**
  al juego, que sigue en 1.7.1.
- **Su propio bus de eventos `ar-*`** y su propio hub, `ar-game-manager` — no comparte
  estado con `safari-game-manager`.
- **Su propio layout por datos** en `src/ar/ar-layout.js` (coordenadas en el espacio
  local del marcador, `x,z ∈ ~[-0.7, 0.7]`). Acá **sí** se genera desde JS, al revés que
  el bosque del juego (§10): no hay Inspector sobre un marcador AR.
- Comparte `public/assets/` (mismos `.glb`) y el quirk `flamingo`/`flamengo`.

**Componentes** (`src/ar/components/`, registrados desde `src/ar/main.js`):
`ar-game-manager` (estado, timer, placement aleatorio, overlays DOM), `ar-forest` +
`ar-tree` (versión recortada de `composite-tree`, con `kill()`/`revive()`),
`ar-fire-degradation` (espejo de `environment-degradation`; sin `<a-sky>`, el "cielo
rojo" se reemplaza por un **vignette DOM**), `animal-tap` (espejo de `animal-clickable`)
y `ar-passthrough`.

- **`ar-passthrough`** merece nota: fuerza `renderer.setClearColor(0x000000, 0)` para que
  el canvas WebGL sea transparente y se vea el `<video>` que AR.js pone detrás. Según la
  versión de A-Frame el `clearAlpha` puede quedar en 1 → el canvas se limpia a negro
  opaco cada frame y **se ve todo negro aunque el tracking funcione**.

**⚠️ La regla que más duele acá está en §10 (último bullet):** no compartas módulos que
toquen el global `AFRAME`/`THREE` entre el entry del juego y el de `/ar`, o Rollup los
extrae a un chunk compartido que se evalúa **antes** de A-Frame y tirás pantalla en
blanco **solo en producción**. `low-poly-fire` se reusa con el sufijo `?ar` justamente
por esto.
