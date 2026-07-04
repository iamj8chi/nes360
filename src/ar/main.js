// Entry point de la página AR (/ar/). A-Frame y AR.js se cargan por CDN en
// ar/index.html (definen window.AFRAME / window.THREE) antes de que corra este
// módulo. Acá solo registramos componentes — usan los globales, sin imports de
// aframe/three (misma convención que el juego principal; ver CLAUDE.md §6).
//
// low-poly-fire se reusa TAL CUAL del juego principal (es autocontenido y usa
// globales): una sola fuente de verdad, sin copia física.
//
// El sufijo `?ar` es DELIBERADO: hace que Vite/Rollup traten este import como un
// módulo distinto del que importa el juego (mismo source, id distinto), de modo que
// NO se comparta un chunk entre los dos entries. Sin esto, Rollup extrae
// low-poly-fire a un chunk compartido que se hoistea al tope del entry `main` y se
// evalúa ANTES que A-Frame (que el juego bundlea, mientras /ar lo toma del CDN) →
// "AFRAME is not defined" y pantalla en blanco SOLO en producción. Con el sufijo,
// cada entry inlinea su propia copia después de su A-Frame. (En dev no había bug:
// Vite no bundlea y respeta el orden de imports.)

import "../components/environment/low-poly-fire.js?ar";
import "./components/ar-passthrough.js";
import "./components/ar-tree.js";
import "./components/ar-forest.js";
import "./components/animal-tap.js";
import "./components/ar-fire-degradation.js";
import "./components/ar-game-manager.js";
