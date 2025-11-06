// UI Components
AFRAME.registerComponent('progress-ui', {
  init: function() {
    this.animalsFound = new Set();
    this.timeRemaining = window.NES360_CONFIG.game.timeLimit;
    
    this.createUI();
    this.setupEventListeners();
  },

  setupEventListeners: function() {
    this.el.sceneEl.addEventListener('safari-game-started', () => {
      this.show();
      this.reset();
    });

    this.el.sceneEl.addEventListener('safari-animal-found', (evt) => {
      this.updateAnimal(evt.detail.animalType, true);
    });

    this.el.sceneEl.addEventListener('safari-timer-update', (evt) => {
      this.updateTimer(evt.detail.timeRemaining);
    });

    this.el.sceneEl.addEventListener('safari-game-ended', () => {
      this.hide();
    });

    this.el.sceneEl.addEventListener('safari-game-reset', () => {
      this.reset();
    });
  },

  createUI: function() {
    // Create UI panel attached to left hand
    this.panel = document.createElement('a-entity');
    this.panel.setAttribute('geometry', 'primitive: plane; width: 0.4; height: 0.3');
    this.panel.setAttribute('material', 'src: #trackerBg; transparent: true');
    this.panel.setAttribute('position', '0 0.1 -0.15');
    this.panel.setAttribute('rotation', '-45 0 0');
    
    // Timer text
    this.timerText = document.createElement('a-text');
    this.timerText.setAttribute('value', '5:00');
    this.timerText.setAttribute('position', '0 0.08 0.01');
    this.timerText.setAttribute('align', 'center');
    this.timerText.setAttribute('scale', '0.6 0.6 0.6');
    this.timerText.setAttribute('color', '#FFFFFF');
    this.panel.appendChild(this.timerText);

    this.el.appendChild(this.panel);
    this.hide();
  },

  show: function() {
    this.panel.setAttribute('visible', true);
  },

  hide: function() {
    this.panel.setAttribute('visible', false);
  },

  reset: function() {
    this.animalsFound.clear();
    this.timeRemaining = window.NES360_CONFIG.game.timeLimit;
    
    // Reset all animal indicators
    window.NES360_CONFIG.game.animalTypes.forEach(type => {
      this.updateAnimal(type, false);
    });
  },

  updateAnimal: function(animalType, found) {
    if (found) {
      this.animalsFound.add(animalType);
    } else {
      this.animalsFound.delete(animalType);
    }
    
    // Update UI indicators
    console.log(`📋 Progress: ${this.animalsFound.size}/${window.NES360_CONFIG.game.totalAnimals}`);
  },

  updateTimer: function(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const timeStr = `${minutes}:${secs.toString().padStart(2, '0')}`;

    if (this.timerText) {
      this.timerText.setAttribute('value', timeStr);
      
      // Change color based on time
      if (seconds < 60) {
        this.timerText.setAttribute('color', '#FF0000'); // Red
      } else if (seconds < 120) {
        this.timerText.setAttribute('color', '#FFFF00'); // Yellow
      } else {
        this.timerText.setAttribute('color', '#FFFFFF'); // White
      }
    }
  }
});

// Orb Controller
AFRAME.registerComponent('orb-controller', {
  init: function() {
    this.el.addEventListener('click', () => {
      if (this.el.classList.contains('orb-start')) {
        this.el.sceneEl.emit('safari-start-game');
      }
    });
  }
});