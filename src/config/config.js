// NES360 VR Project Configuration
window.NES360_CONFIG = {
  // Game Settings
  game: {
    timeLimit: 300, // 5 minutes
    totalAnimals: 6,
    animalTypes: ['flamingo', 'jaguarete', 'nandu', 'jurumi', 'tagua', 'tatu']
  },

  // Movement Settings
  movement: {
    desktop: {
      speed: 0.2,
      enabled: true
    },
    vr: {
      speed: 5.0,
      acceleration: 6.0,
      deceleration: 8.0,
      deadZone: 0.18,
      controllerHand: 'left'
    }
  },

  // Boundary Settings
  boundary: {
    radius: 45,
    centerX: 0,
    centerZ: 0,
    height: 10,
    color: '#0066ff',
    opacity: 0.2
  },

  // Performance Settings
  performance: {
    updateInterval: 200,
    nearDistance: 15,
    midDistance: 30,
    farDistance: 50
  },

  // Scene Settings
  scene: {
    fog: {
      type: 'exponential',
      color: '#FFD178',
      density: 0.02
    },
    background: '#FFD178',
    lighting: {
      hemisphere: {
        color: '#ffffff',
        groundColor: '#556655',
        intensity: 0.8
      },
      directional: {
        color: '#ffffff',
        intensity: 1.3,
        position: '0 50 0'
      }
    }
  },

  // Assets Paths
  assets: {
    models: {
      scenario: 'assets/scenario.glb',
      samuu: 'assets/samuu.glb',
      samuuCanopy: 'assets/samuu-canopy.glb',
      jaguarete: 'assets/jaguarete.glb',
      nandu: 'assets/nandu.glb',
      flamingo: 'assets/flamengo.glb',
      jurumi: 'assets/jurumi.glb',
      tagua: 'assets/tagua.glb',
      tatu: 'assets/tatu.glb'
    },
    ui: {
      trackerBg: 'assets/ui/tracker-background.png',
      // ... otros assets UI
    }
  }
};