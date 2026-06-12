// Animal movement with organic motion
AFRAME.registerComponent("animal-behavior", {
  schema: {
    speed: { type: "number", default: -0.2 },
    radius: { type: "number", default: 2 },
    yawOffset: { type: "number", default: 0 },
    modelRotation: { type: "number", default: -90 },
    pathRotation: { type: "number", default: 0 },
    // Position wiggle parameters
    positionWiggleX: { type: "number", default: 0.3 }, // Amplitude of X wiggle
    positionWiggleY: { type: "number", default: 0.2 }, // Amplitude of Y wiggle
    positionWiggleZ: { type: "number", default: 0.25 }, // Amplitude of Z wiggle
    // Rotation wiggle parameters
    rotationWiggleX: { type: "number", default: 5 }, // Max pitch wiggle in degrees
    rotationWiggleY: { type: "number", default: 3 }, // Max yaw wiggle in degrees
    rotationWiggleZ: { type: "number", default: 8 }, // Max roll wiggle in degrees
  },
  init: function () {
    this.startTime = Date.now();
    this.center = this.el.object3D.position.clone();
    this.pathRotationRad = this.data.pathRotation * (Math.PI / 180);

    // Random phase offsets for organic feel
    this.phaseOffsets = {
      pos: {
        x: Math.random() * Math.PI * 2,
        y: Math.random() * Math.PI * 2,
        z: Math.random() * Math.PI * 2,
      },
      rot: {
        x: Math.random() * Math.PI * 2,
        y: Math.random() * Math.PI * 2,
        z: Math.random() * Math.PI * 2,
      },
    };
  },

  // Eased sine wave function
  easedSine: function (t, amplitude, frequency, phaseOffset) {
    // Combine two sine waves for more organic motion
    return (
      amplitude *
      (Math.sin(t * frequency + phaseOffset) * 0.7 +
        Math.sin(t * frequency * 1.3 + phaseOffset * 2.1) * 0.3)
    );
  },

  tick: function (t, dt) {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const r = this.data.radius;
    const speed = this.data.speed;

    // Base circular motion
    const ang = elapsed * speed + this.pathRotationRad;
    const baseX = this.center.x + Math.cos(ang) * r;
    const baseZ = this.center.z + Math.sin(ang) * r;

    // Position wiggle
    const wiggleX = this.easedSine(
      elapsed,
      this.data.positionWiggleX,
      1.5,
      this.phaseOffsets.pos.x
    );
    const wiggleY = this.easedSine(
      elapsed,
      this.data.positionWiggleY,
      2.1,
      this.phaseOffsets.pos.y
    );
    const wiggleZ = this.easedSine(
      elapsed,
      this.data.positionWiggleZ,
      1.8,
      this.phaseOffsets.pos.z
    );

    // Apply position with wiggle
    const nx = baseX + wiggleX;
    const ny = this.center.y + wiggleY;
    const nz = baseZ + wiggleZ;

    // Update position
    this.el.setAttribute("position", `${nx} ${ny} ${nz}`);

    // Calculate base movement direction
    const tangentX = Math.sin(ang) * r;
    const tangentZ = Math.cos(ang) * r;
    const baseYaw =
      Math.atan2(tangentZ, tangentX) * (180 / Math.PI) +
      this.data.yawOffset +
      this.data.modelRotation;

    // Rotation wiggle
    const rotWiggleX = this.easedSine(
      elapsed,
      this.data.rotationWiggleX,
      2.3,
      this.phaseOffsets.rot.x
    );
    const rotWiggleY = this.easedSine(
      elapsed,
      this.data.rotationWiggleY,
      1.7,
      this.phaseOffsets.rot.y
    );
    const rotWiggleZ = this.easedSine(
      elapsed,
      this.data.rotationWiggleZ,
      2.0,
      this.phaseOffsets.rot.z
    );

    // Apply rotation with wiggle
    this.el.setAttribute(
      "rotation",
      `${rotWiggleX} ${baseYaw + rotWiggleY} ${rotWiggleZ}`
    );
  },
});
