// Movement and Locomotion Components
AFRAME.registerComponent('movement-controller', {
  schema: {
    speed: { type: 'number', default: 0.2 },
    vrSpeed: { type: 'number', default: 5.0 },
    enabled: { type: 'boolean', default: true }
  },

  init: function() {
    this.config = window.NES360_CONFIG.movement;
    
    // Apply configuration
    this.data.speed = this.config.desktop.speed;
    this.data.vrSpeed = this.config.vr.speed;
    this.data.enabled = this.config.desktop.enabled;
    
    // Setup movement controls
    this.setupMovementControls();
  },

  setupMovementControls: function() {
    // Desktop movement
    this.el.setAttribute('movement-controls', {
      enabled: this.data.enabled,
      speed: this.data.speed
    });
    
    // VR locomotion
    this.el.setAttribute('vr-locomotion', {
      speed: this.data.vrSpeed,
      acceleration: this.config.vr.acceleration,
      deceleration: this.config.vr.deceleration,
      deadZone: this.config.vr.deadZone,
      controllerHand: this.config.vr.controllerHand
    });
  }
});

// Boundary Collision Component
AFRAME.registerComponent('boundary-collision', {
  schema: {
    radius: { type: 'number', default: 45 },
    centerX: { type: 'number', default: 0 },
    centerZ: { type: 'number', default: 0 }
  },

  init: function() {
    this.config = window.NES360_CONFIG.boundary;
    
    // Use config values
    this.data.radius = this.config.radius;
    this.data.centerX = this.config.centerX;
    this.data.centerZ = this.config.centerZ;
    
    this.lastPosition = new THREE.Vector3();
    this.currentPosition = new THREE.Vector3();
    this.el.object3D.getWorldPosition(this.lastPosition);
  },

  tick: function() {
    this.el.object3D.getWorldPosition(this.currentPosition);
    
    const distanceFromCenter = Math.sqrt(
      Math.pow(this.currentPosition.x - this.data.centerX, 2) +
      Math.pow(this.currentPosition.z - this.data.centerZ, 2)
    );

    if (distanceFromCenter > this.data.radius) {
      const dirX = this.currentPosition.x - this.data.centerX;
      const dirZ = this.currentPosition.z - this.data.centerZ;
      const length = Math.sqrt(dirX * dirX + dirZ * dirZ);
      
      const normalizedDirX = dirX / length;
      const normalizedDirZ = dirZ / length;
      
      const newX = this.data.centerX + normalizedDirX * this.data.radius;
      const newZ = this.data.centerZ + normalizedDirZ * this.data.radius;
      
      const currentPos = this.el.getAttribute('position');
      this.el.setAttribute('position', {
        x: newX,
        y: currentPos.y,
        z: newZ
      });
    }

    this.lastPosition.copy(this.currentPosition);
  }
});