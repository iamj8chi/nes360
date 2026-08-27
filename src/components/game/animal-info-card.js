import {
  ANIMAL_INFO,
  animalCardAssetId,
  animalCardUrl,
  animalIconAssetId,
  animalIconUrl,
} from "../../data/animal-info.js";

// Drives the animal info card on both surfaces:
//  - VR: an in-world image attached to the left hand (#animalInfoCardVR)
//  - Desktop: a DOM overlay fixed to the right corner (#animalInfoCard)
// La ficha es UNA imagen por especie: el arte (public/assets/ui/cards/*.png) ya trae
// título, etiquetas y valores horneados, así que acá solo se cambia el `src`.
// ANIMAL_INFO sigue dando el texto accesible (`alt`) y el guard de tipo desconocido.
// The active surface is chosen from sceneEl.is("vr-mode"). The card opens when an
// animal is clicked (safari-animal-clicked) and hides on mode transitions.
AFRAME.registerComponent("animal-info-card", {
  init: function () {
    this.currentType = null;

    this.onAnimalClicked = this.onAnimalClicked.bind(this);
    this.hide = this.hide.bind(this);

    // Wait for the DOM/scene graph to be ready (same pattern as safari-compass).
    setTimeout(() => {
      this.setupElements();
      this.setupListeners();
    }, 100);
  },

  setupElements: function () {
    // VR (in-world) card — el entity ES la imagen; el único hijo es el icono
    // que va sobre el hueco vacío del arte.
    this.vrCard = document.getElementById("animalInfoCardVR");
    this.vrIcon = document.getElementById("animalInfoCardVRIcon");

    // Desktop (DOM) card
    this.domCard = document.getElementById("animalInfoCard");
    this.domImg = document.getElementById("animalInfoCardImg");
    this.domIcon = document.getElementById("animalInfoCardIcon");

    this.closeBtn = document.getElementById("animalInfoCardClose");
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", this.hide);
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
      this.showVr(animalType);
      this.hideDom();
    } else {
      this.showDom(animalType, data);
      this.hideVr();
    }
  },

  showVr: function (animalType) {
    if (!this.vrCard) return;
    this.vrCard.setAttribute("src", animalCardAssetId(animalType));
    if (this.vrIcon) {
      this.vrIcon.setAttribute("src", animalIconAssetId(animalType));
    }
    this.vrCard.setAttribute("visible", "true");
  },

  showDom: function (animalType, data) {
    if (!this.domCard) return;
    if (this.domImg) {
      this.domImg.setAttribute("src", animalCardUrl(animalType));
      // La copia visible vive en la imagen; el alt es el texto accesible.
      this.domImg.setAttribute("alt", data.commonName);
    }
    if (this.domIcon) {
      this.domIcon.setAttribute("src", animalIconUrl(animalType));
      // Decorativo: el nombre ya lo da el alt de la ficha.
      this.domIcon.setAttribute("alt", "");
    }

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
    if (this.closeBtn) {
      this.closeBtn.removeEventListener("click", this.hide);
    }
  },
});
