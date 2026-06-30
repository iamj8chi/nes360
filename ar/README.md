# nes360 AR — minijuego WebAR con marcador (`/ar`)

Minijuego **WebAR con marcador** de _No Están Solos_, **integrado como una página del
proyecto principal**: se sirve en **`/ar`** del mismo build y deploy que el juego VR, y
**comparte `public/assets`** (sin duplicar modelos ni audio).

Apuntás la cámara del teléfono al **marcador Hiro**, aparece un botón **Empezar**, y
arranca un juego de **1 minuto**: una escena de bosque sobre el marcador con **6 animales
del Chaco** escondidos en arbustos, en posiciones **al azar de una lista predefinida**. Hay
que **encontrarlos y tocarlos a los 6** antes de que el bosque se queme (mismo efecto de
fuego y curva exponencial `p = t³` del juego principal).

## Cómo corre

Es parte del proyecto raíz — **no tiene `package.json` ni Vite propios**. Desde la raíz:

```bash
npm run dev          # Vite HTTPS, puerto 3333 — sirve el juego en / y el AR en /ar
```

- Juego principal: `https://<IP-de-tu-Mac>:3333/`
- Minijuego AR: `https://<IP-de-tu-Mac>:3333/ar/`
- **HTTPS es obligatorio** para la cámara (`getUserMedia`) fuera de `localhost`. En el
  teléfono (misma Wi-Fi) aceptá el certificado self-signed una vez. También corre en
  desktop con webcam para iterar.
- `npm run build` construye **ambas páginas** juntas (multipage en `vite.config.js`);
  `npm run preview` las sirve.

## El marcador

Marcador **Hiro** clásico de AR.js — imprimilo o mostralo en otra pantalla:
<https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/hiro.png>

Para un marcador branded, generá un `.patt` con el
[training tool](https://ar-js-org.github.io/AR.js/three.js/examples/marker-training/examples/generator.html)
y cambiá `preset="hiro"` por `type="pattern" url="..."` en `ar/index.html`.

## Cómo está armado

- **A-Frame 1.3.0 + AR.js 3.4.5** se cargan por **CDN** dentro de `ar/index.html`. Como la
  página AR es un entry separado del bundle del juego principal, no chocan ni duplican THREE.
- **A-Frame va fijado en 1.3.0** (no 1.7.1) a propósito: AR.js 3.4.x se construyó contra
  A-Frame ~1.3; con 1.7.1 (THREE muy posterior) la proyección de cámara de AR.js se rompe y
  el feed sale **negro**. La página AR carga su propia A-Frame por CDN, aislada del bundle
  del juego principal (que sigue en **1.7.1**), así que esto no afecta al juego.
- Los componentes AR viven en `src/ar/` y usan los globales `AFRAME`/`THREE` (sin imports de
  aframe/three), igual que el resto del repo.
- `low-poly-fire` se **reusa tal cual** desde `src/components/environment/` (sin copia).

```
ar/index.html                       # página /ar: <a-scene arjs>, <a-marker hiro>, HUD/overlays DOM
src/ar/
  main.js                           # entry de la página AR (registra componentes)
  ar-layout.js                      # animales, posiciones de spawn, layout de árboles, escalas
  components/
    ar-game-manager.js              # timer 60s, placement aleatorio, win/lose, HUD/overlays
    animal-tap.js                   # tap → ar-animal-clicked; glow verde + pop
    ar-tree.js                      # tronco+copa / arbusto; kill()/revive() (tint + fuego)
    ar-forest.js                    # monta árboles decorativos desde TREE_LAYOUT
    ar-fire-degradation.js          # curva p=t³ → quema árboles + fuego + vignette rojo
vite.config.js                      # rollupOptions.input = { main, ar }  (multipage)
```

## Eventos (bus en `sceneEl`, namespace `ar-*`)

| Evento              | Emisor          | Payload                                  |
| ------------------- | --------------- | ---------------------------------------- |
| `ar-game-started`   | ar-game-manager | —                                        |
| `ar-timer-update`   | ar-game-manager | `{timeRemaining, timeLimit}`             |
| `ar-animal-clicked` | animal-tap      | `{animalType, element}`                  |
| `ar-animal-found`   | ar-game-manager | `{animalType, totalFound, totalAnimals}` |
| `ar-game-ended`     | ar-game-manager | `{won}`                                  |

## Pendiente de tuning (en dispositivo)

Valores tentativos en `src/ar/ar-layout.js` — ajustar sobre el marcador real: `ANIMAL_SCALE`,
`HIDER_BUSH_SCALE`, escalas de `TREE_LAYOUT`, y `SPAWN_POSITIONS` (que no se solapen ni se
salgan del marcador). Los animales se montan **estáticos** (sin `animation-mixer`); para
animarlos, agregar ese loader al entry.

### Riesgos a verificar

- **Tap en móvil**: depende de `cursor="rayOrigin: mouse"` + `.tappable`. Plan B si no
  dispara `click`: un `touchstart` global con raycast manual desde `sceneEl.camera`.
- **Versión de A-Frame para AR.js**: AR.js 3.4.5 anda con A-Frame **1.3.0** (ya fijado). Si
  alguna vez se sube, validar que la cámara no salga negra — es el síntoma del THREE de
  A-Frame nuevo rompiendo a AR.js. El pin vive en `ar/index.html`, aislado del juego principal.
