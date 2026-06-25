AFRAME.registerComponent("vr-locomotion", {
  schema: {
    speed: { type: "number", default: 5.0 }, // m/s velocidad de movimiento VR
    acceleration: { type: "number", default: 6.0 }, // lerp factor per second
    deceleration: { type: "number", default: 8.0 }, // lerp factor per second
    deadZone: { type: "number", default: 0.18 }, // thumbstick deadzone
    controllerHand: { type: "string", default: "left" }, // 'left'|'right'|'both'
    useHeadDirection: { type: "boolean", default: true },
  },

  init: function () {
    this.velocity = new THREE.Vector3();
    this.moveVec = new THREE.Vector3();
    // Flag de runtime: vuelo-mode lo pone en false para que el aleteo
    // (flight-locomotion) no compita con el thumbstick durante el modo Vuelo.
    this.enabled = true;
    this.onAxisMove = this.onAxisMove.bind(this);
    this.bindControllerListeners();
  },

  bindControllerListeners: function () {
    // Listen on rig and also on possible controller entities
    this.el.addEventListener("axismove", this.onAxisMove);
    const left = this.el.querySelector('[hand-controls="hand: left"]');
    const right = this.el.querySelector('[hand-controls="hand: right"]');
    if (left) left.addEventListener("axismove", this.onAxisMove);
    if (right) right.addEventListener("axismove", this.onAxisMove);
  },

  onAxisMove: function (evt) {
    const axes = evt.detail && evt.detail.axis;
    if (!axes || axes.length < 2) return;

    // Determine which hand produced the event (if available)
    const target = evt.target;
    const handAttr =
      target && target.getAttribute
        ? target.getAttribute("hand-controls")
        : null;
    const isLeft = handAttr && handAttr.indexOf("left") !== -1;
    const isRight = handAttr && handAttr.indexOf("right") !== -1;

    if (this.data.controllerHand === "left" && !isLeft) return;
    if (this.data.controllerHand === "right" && !isRight) return;

    let ax = axes[0];
    let ay = axes[1];

    // Apply deadzone
    if (Math.abs(ax) < this.data.deadZone) ax = 0;
    if (Math.abs(ay) < this.data.deadZone) ay = 0;

    // Store the desired local movement vector (x right, z forward)
    this.moveVec.set(ax, 0, ay);
  },

  tick: function (time, dt) {
    if (!this.enabled) {
      this.moveVec.set(0, 0, 0);
      this.velocity.set(0, 0, 0);
      return;
    }
    const delta = (dt || 0) / 1000;
    if (delta <= 0) return;

    // Desired local movement
    if (this.moveVec.lengthSq() > 0.000001) {
      const stickMag = Math.min(1, this.moveVec.length());
      const desiredLocal = this.moveVec
        .clone()
        .normalize()
        .multiplyScalar(this.data.speed * stickMag);

      if (this.data.useHeadDirection) {
        const head = this.el.querySelector("#head");
        if (head && head.object3D) {
          const yaw = head.object3D.rotation.y; // radians
          desiredLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        }
      }

      // Smooth acceleration
      this.velocity.lerp(
        desiredLocal,
        Math.min(1, this.data.acceleration * delta)
      );
    } else {
      // Smooth deceleration to zero
      this.velocity.lerp(
        new THREE.Vector3(0, 0, 0),
        Math.min(1, this.data.deceleration * delta)
      );
    }

    // Apply velocity scaled by dt
    const step = this.velocity.clone().multiplyScalar(delta);
    const pos = this.el.object3D.position;
    pos.add(step);
  },

  remove: function () {
    this.el.removeEventListener("axismove", this.onAxisMove);
    const left = this.el.querySelector('[hand-controls="hand: left"]');
    const right = this.el.querySelector('[hand-controls="hand: right"]');
    if (left) left.removeEventListener("axismove", this.onAxisMove);
    if (right) right.removeEventListener("axismove", this.onAxisMove);
  },
});
