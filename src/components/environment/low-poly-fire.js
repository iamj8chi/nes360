// Low-poly tetrahedron fire — used by the safari "the forest is burning" arc.
// composite-tree.kill() spawns one of these at a tree's base; revive() removes it.
//
// Each particle rises, shrinks and fades while lerping yellow -> orange -> red ->
// dark, then respawns. Geometry is shared across every instance (cheap for VR);
// materials are per-particle because colour/opacity differ per particle.
//
// Note: this entity is a child of the composite-tree's parent el, which is scaled
// up (default 5x), so `height`/`radius`/`size` here are in that *local* space —
// keep them small. See composite-tree.spawnFire().

const FIRE_COLORS = [0xfff066, 0xffa500, 0xff4500, 0x8b0000];

// One geometry shared by every flame mesh of every fire. Built lazily so it only
// exists once THREE is around and a fire is actually needed.
let sharedGeometry = null;
function getGeometry(size) {
  if (!sharedGeometry) {
    sharedGeometry = new THREE.TetrahedronGeometry(size);
  }
  return sharedGeometry;
}

AFRAME.registerComponent("low-poly-fire", {
  schema: {
    count: { type: "number", default: 26 },
    height: { type: "number", default: 1 },
    radius: { type: "number", default: 0.5 },
    size: { type: "number", default: 0.12 },
    speed: { type: "number", default: 1 },
  },

  init: function () {
    const d = this.data;
    this.particles = [];
    this.colors = FIRE_COLORS.map((c) => new THREE.Color(c));

    const geometry = getGeometry(d.size);

    for (let i = 0; i < d.count; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: FIRE_COLORS[0],
        transparent: true,
        depthWrite: false,
        flatShading: true,
      });
      const mesh = new THREE.Mesh(geometry, material);
      this.el.object3D.add(mesh);
      this.particles.push({
        mesh: mesh,
        material: material,
        // Stagger initial life so the flames don't pulse in unison.
        life: i / d.count,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 4,
        offset: Math.random() * d.radius,
      });
    }
  },

  tick: function (time, delta) {
    const d = this.data;
    const dt = delta / 1000;

    for (const p of this.particles) {
      p.life += dt * d.speed;
      if (p.life >= 1) {
        p.life = 0;
        p.angle = Math.random() * Math.PI * 2;
        p.offset = Math.random() * d.radius;
      }

      const t = p.life;
      const y = t * d.height;
      const shrink = 1 - t * 0.7;
      const wobble = Math.sin(time * 0.005 + p.angle) * 0.05;

      p.mesh.position.set(
        Math.cos(p.angle) * p.offset * (1 - t) + wobble,
        y,
        Math.sin(p.angle) * p.offset * (1 - t)
      );
      p.mesh.scale.setScalar(shrink);
      p.mesh.rotation.x += p.spin * dt;
      p.mesh.rotation.y += p.spin * dt;

      // Colour ramp across the 4 stops over the particle's lifetime.
      const seg = t * 3;
      const idx = Math.floor(seg);
      const f = seg - idx;
      const c1 = this.colors[Math.min(idx, 3)];
      const c2 = this.colors[Math.min(idx + 1, 3)];
      p.material.color.copy(c1).lerp(c2, f);
      p.material.opacity = 1 - t * t;
    }
  },

  remove: function () {
    // Dispose per-particle materials; the geometry is shared, leave it alone.
    for (const p of this.particles) {
      this.el.object3D.remove(p.mesh);
      p.material.dispose();
    }
    this.particles.length = 0;
  },
});
