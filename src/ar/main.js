// Entry point de la página AR (/ar/). A-Frame y AR.js se cargan por CDN en
// ar/index.html (definen window.AFRAME / window.THREE) antes de que corra este
// módulo. Acá solo registramos componentes — usan los globales, sin imports de
// aframe/three (misma convención que el juego principal; ver CLAUDE.md §6).
//
// low-poly-fire se reusa TAL CUAL del juego principal (es autocontenido y usa
// globales): una sola fuente de verdad, sin copia.

import "../components/environment/low-poly-fire.js";
import "./components/ar-passthrough.js";
import "./components/ar-tree.js";
import "./components/ar-forest.js";
import "./components/animal-tap.js";
import "./components/ar-fire-degradation.js";
import "./components/ar-game-manager.js";
