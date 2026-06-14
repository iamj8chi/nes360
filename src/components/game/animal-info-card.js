import {
  ANIMAL_INFO,
  animalIconAssetId,
  animalIconUrl,
} from "../../data/animal-info.js";

// Drives the animal info card on both surfaces:
//  - VR: an in-world entity attached to the left hand (#animalInfoCardVR)
//  - Desktop: a DOM overlay fixed to the right corner (#animalInfoCard)
// The active surface is chosen from sceneEl.is("vr-mode"). The card opens when an
// animal is clicked (safari-animal-clicked) and hides on mode transitions.
AFRAME.registerComponent("animal-info-card", {
  init: function () {
    this.currentType = null;

    this.onAnimalClicked = this.onAnimalClicked.bind(this);
    this.hide = this.hide.bind(this);

    // Wait for the DOM/scene graph to be ready (same pattern as progress-ui).
    setTimeout(() => {
      this.setupElements();
      this.setupListeners();
    }, 100);
  },

  setupElements: function () {
    // VR (in-world) card
    this.vrCard = document.getElementById("animalInfoCardVR");
    this.vrIcon = document.getElementById("animalInfoCardVRIcon");
    this.vrText = document.getElementById("animalInfoCardVRText");

    // Desktop (DOM) card
    this.domCard = document.getElementById("animalInfoCard");
    this.domIcon = document.getElementById("animalInfoCardIcon");
    this.domName = document.getElementById("animalInfoCardName");
    this.domSci = document.getElementById("animalInfoCardSci");
    this.domCons = document.getElementById("animalInfoCardCons");
    this.domNut = document.getElementById("animalInfoCardNut");
    this.domHab = document.getElementById("animalInfoCardHab");

    const closeBtn = document.getElementById("animalInfoCardClose");
    if (closeBtn) {
      closeBtn.addEventListener("click", this.hide);
    }
  },

  setupListeners: function () {
    this.el.sceneEl.addEventListener(
      "safari-animal-clicked",
      this.onAnimalClicked
    );
    // Hide the card whenever the mode changes so it never lingers stale.
    this.el.sceneEl.addEventListener("safari-game-started", this.hide);
    this.el.sceneEl.addEventListener("safari-game-ended", this.hide);
    this.el.sceneEl.addEventListener("enter-vr", this.hide);
    this.el.sceneEl.addEventListener("exit-vr", this.hide);
  },

  onAnimalClicked: function (evt) {
    const animalType = evt.detail && evt.detail.animalType;
    if (animalType) {
      this.show(animalType);
    }
  },

  show: function (animalType) {
    const data = ANIMAL_INFO[animalType];
    if (!data) {
      console.warn(`No info-card data for animal: ${animalType}`);
      return;
    }
    this.currentType = animalType;

    if (this.el.sceneEl.is("vr-mode")) {
      this.showVr(animalType, data);
      this.hideDom();
    } else {
      this.showDom(animalType, data);
      this.hideVr();
    }
  },

  showVr: function (animalType, data) {
    if (!this.vrCard) return;
    if (this.vrIcon) {
      this.vrIcon.setAttribute("src", animalIconAssetId(animalType));
    }
    if (this.vrText) {
      this.vrText.setAttribute(
        "value",
        `${data.commonName}\n\n` +
          `Nombre científico: ${data.scientificName}\n` +
          `Conservación: ${data.conservation}\n` +
          `Nutrición: ${data.nutrition}\n` +
          `Hábitat: ${data.habitat}`
      );
    }
    this.vrCard.setAttribute("visible", "true");
  },

  showDom: function (animalType, data) {
    if (!this.domCard) return;
    if (this.domIcon) {
      this.domIcon.setAttribute("src", animalIconUrl(animalType));
      this.domIcon.setAttribute("alt", data.commonName);
    }
    if (this.domName) this.domName.textContent = data.commonName;
    if (this.domSci) this.domSci.textContent = data.scientificName;
    if (this.domCons) this.domCons.textContent = data.conservation;
    if (this.domNut) this.domNut.textContent = data.nutrition;
    if (this.domHab) this.domHab.textContent = data.habitat;

    this.domCard.classList.add("info-card--visible");
    this.domCard.setAttribute("aria-hidden", "false");
  },

  hide: function () {
    this.currentType = null;
    this.hideVr();
    this.hideDom();
  },

  hideVr: function () {
    if (this.vrCard) this.vrCard.setAttribute("visible", "false");
  },

  hideDom: function () {
    if (!this.domCard) return;
    this.domCard.classList.remove("info-card--visible");
    this.domCard.setAttribute("aria-hidden", "true");
  },

  remove: function () {
    this.el.sceneEl.removeEventListener(
      "safari-animal-clicked",
      this.onAnimalClicked
    );
    this.el.sceneEl.removeEventListener("safari-game-started", this.hide);
    this.el.sceneEl.removeEventListener("safari-game-ended", this.hide);
    this.el.sceneEl.removeEventListener("enter-vr", this.hide);
    this.el.sceneEl.removeEventListener("exit-vr", this.hide);
  },
});
