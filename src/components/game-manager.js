// Game Management Component
AFRAME.registerComponent('game-manager', {
  schema: {
    timeLimit: { type: 'number', default: 300 }
  },

  init: function() {
    this.config = window.NES360_CONFIG.game;
    this.gameActive = false;
    this.timeRemaining = this.data.timeLimit;
    this.animalsFound = new Set();
    
    // Bind methods
    this.startGame = this.startGame.bind(this);
    this.endGame = this.endGame.bind(this);
    this.resetGame = this.resetGame.bind(this);
    
    // Event listeners
    this.setupEventListeners();
  },

  setupEventListeners: function() {
    this.el.sceneEl.addEventListener('safari-start-game', this.startGame);
    this.el.sceneEl.addEventListener('safari-animal-clicked', (evt) => {
      this.checkAnimal(evt.detail.animalType, evt.detail.element);
    });
  },

  startGame: function() {
    this.gameActive = true;
    this.timeRemaining = this.data.timeLimit;
    this.animalsFound.clear();
    
    this.el.sceneEl.emit('safari-game-started');
    console.log('🎮 Safari game started!');
  },

  endGame: function(won = false) {
    this.gameActive = false;
    
    this.el.sceneEl.emit('safari-game-ended', {
      won: won,
      score: this.animalsFound.size,
      total: this.config.totalAnimals,
      timeUsed: this.data.timeLimit - this.timeRemaining
    });
    
    console.log(won ? '🎉 Game won!' : '⏰ Game over!');
  },

  checkAnimal: function(animalType, element) {
    if (!this.gameActive || this.animalsFound.has(animalType)) return;
    
    this.animalsFound.add(animalType);
    
    this.el.sceneEl.emit('safari-animal-found', {
      animalType: animalType,
      element: element,
      count: this.animalsFound.size,
      total: this.config.totalAnimals
    });
    
    // Check win condition
    if (this.animalsFound.size >= this.config.totalAnimals) {
      this.endGame(true);
    }
  },

  tick: function(time, timeDelta) {
    if (!this.gameActive) return;
    
    this.timeRemaining -= timeDelta / 1000;
    
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.endGame(false);
    }
    
    this.el.sceneEl.emit('safari-timer-update', {
      timeRemaining: this.timeRemaining,
      timeLimit: this.data.timeLimit
    });
  },

  resetGame: function() {
    this.gameActive = false;
    this.timeRemaining = this.data.timeLimit;
    this.animalsFound.clear();
    this.el.sceneEl.emit('safari-game-reset');
  }
});