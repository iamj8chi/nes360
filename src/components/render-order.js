// Fija el renderOrder de un entity (y sus mallas descendientes) SIN tocar
// depthTest/depthWrite. Hermano de render-on-top, pero para geometría del MUNDO.
//
// Por qué existe: three.js ordena los objetos transparentes por la profundidad
// del ORIGEN de cada objeto, no por píxel. Dos imágenes con transparencia
// apiladas (el botón "Safari" sobre el cartel grande) se invierten en cuanto
// girás la cabeza hacia la de adelante: su origen, al estar descentrado, pasa a
// quedar "más lejos" que el centro de la grande. Entonces la de adelante se
// dibuja primero, escribe profundidad, y la de atrás falla el depth test — por
// los píxeles transparentes se ve el cielo en vez del cartel de atrás.
// Acercarla unos centímetros NO alcanza: el orden depende del ángulo de cámara.
//
// Diferencia con render-on-top: aquel apaga el depth test (correcto para HUD
// pegado a la cámara o a la mano, que nunca debe ocluirse). Acá el cartel vive
// en el mundo y TIENE que seguir tapándose con árboles y terreno; lo único que
// hace falta es garantizar el orden entre las capas del propio cartel.
//
// a-image construye su malla de forma asíncrona (y la rehace al cambiar el src),
// así que se reaplica al cargar y tras un par de delays, igual que render-on-top.
AFRAME.registerComponent("render-order", {
  schema: {
    order: { type: "number", default: 1 },
  },

  init: function () {
    this.apply = this.apply.bind(this);

    this.el.addEventListener("loaded", this.apply);
    this.el.addEventListener("object3dset", this.apply);

    this._t1 = setTimeout(this.apply, 300);
    this._t2 = setTimeout(this.apply, 1000);
  },

  update: function () {
    this.apply();
  },

  apply: function () {
    const order = this.data.order;
    this.el.object3D.traverse((node) => {
      if (node.isMesh) node.renderOrder = order;
    });
  },

  remove: function () {
    clearTimeout(this._t1);
    clearTimeout(this._t2);
    this.el.removeEventListener("loaded", this.apply);
    this.el.removeEventListener("object3dset", this.apply);
  },
});
