// Force an entity (and all its descendant meshes — planes, images, msdf text) to
// render on top, immune to depth-based clipping/occlusion.
//
// Why: the VR animal info card is parented to the controller and built from
// stacked TRANSPARENT surfaces (background + icon + text rows). Transparent
// objects are sorted/occluded by distance-to-camera, so as the hand moves away
// from the headset the card crosses that radial "depth boundary" and starts to
// get cut off. Disabling depthTest/depthWrite and pinning a high renderOrder
// makes the card always draw fully, regardless of how far the hand is extended.
//
// a-text / a-image build their meshes asynchronously and rebuild them when their
// value/src changes, so we re-apply on load, after a couple of delays, and
// whenever a card is about to be shown.
AFRAME.registerComponent("render-on-top", {
  schema: {
    order: { type: "number", default: 999 },
  },

  init: function () {
    this.apply = this.apply.bind(this);

    this.el.addEventListener("loaded", this.apply);
    this.el.addEventListener("object3dset", this.apply);

    // Catch async text/image meshes created after init.
    this._t1 = setTimeout(this.apply, 300);
    this._t2 = setTimeout(this.apply, 1000);

    // Re-apply right after a card is populated (its text meshes get rebuilt).
    this._onShow = () => setTimeout(this.apply, 50);
    this.el.sceneEl.addEventListener("safari-animal-clicked", this._onShow);
    this.el.sceneEl.addEventListener("vuelo-animal-seen", this._onShow);
  },

  apply: function () {
    const order = this.data.order;
    this.el.object3D.traverse((node) => {
      if (!node.isMesh || !node.material) return;
      const mats = Array.isArray(node.material)
        ? node.material
        : [node.material];
      mats.forEach((m) => {
        m.depthTest = false;
        m.depthWrite = false;
        m.needsUpdate = true;
      });
      node.renderOrder = order;
    });
  },

  remove: function () {
    clearTimeout(this._t1);
    clearTimeout(this._t2);
    this.el.removeEventListener("loaded", this.apply);
    this.el.removeEventListener("object3dset", this.apply);
    this.el.sceneEl.removeEventListener("safari-animal-clicked", this._onShow);
    this.el.sceneEl.removeEventListener("vuelo-animal-seen", this._onShow);
  },
});
