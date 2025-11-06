// Component Loader System
window.NES360_ComponentLoader = {
  components: [
    'src/config/config.js',
    'src/components/game-manager.js',
    'src/components/movement.js',
    'src/components/animals.js',
    'src/components/ui.js',
    'src/components/environment.js',
    'src/components/performance.js'
  ],

  async loadAll() {
    console.log('🔄 Loading NES360 components...');
    
    for (const componentPath of this.components) {
      try {
        await this.loadScript(componentPath);
        console.log(`✅ Loaded: ${componentPath}`);
      } catch (error) {
        console.warn(`⚠️ Failed to load: ${componentPath}`, error);
      }
    }
    
    console.log('🎉 All components loaded!');
    
    // Initialize the game
    this.initializeGame();
  },

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  },

  initializeGame() {
    // Setup scene configuration
    this.setupScene();
    
    // Initialize game manager
    const gameManager = document.querySelector('#gameManager');
    if (gameManager) {
      gameManager.setAttribute('game-manager', 
        `timeLimit: ${window.NES360_CONFIG.game.timeLimit}`
      );
    }
    
    // Initialize camera rig with movement controller
    const cameraRig = document.querySelector('#cameraRig');
    if (cameraRig) {
      cameraRig.setAttribute('movement-controller', '');
      cameraRig.setAttribute('boundary-collision', '');
    }
    
    console.log('🎮 NES360 VR Experience initialized!');
  },

  setupScene() {
    const scene = document.querySelector('a-scene');
    const config = window.NES360_CONFIG.scene;
    
    if (scene) {
      // Apply scene configuration
      scene.setAttribute('fog', 
        `type: ${config.fog.type}; color: ${config.fog.color}; density: ${config.fog.density}`
      );
      scene.setAttribute('background', `color: ${config.background}`);
    }
  }
};