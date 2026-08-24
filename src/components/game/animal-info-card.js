import {
  ANIMAL_INFO,
  animalIconAssetId,
  animalIconUrl,
} from "../../data/animal-info.js";
import { loadLottieLib, fetchLottie } from "../../utils/lottie-loader.js";

// URL del Lottie del spike (ver schema.spike abajo).
const CAT_SPIKE_SRC = "/assets/lottie/404-cat.json";

// Drives the animal info card on both surfaces:
//  - VR: an in-world entity attached to the left hand (#animalInfoCardVR)
//  - Desktop: a DOM overlay fixed to the right corner (#animalInfoCard)
// The active surface is chosen from sceneEl.is("vr-mode"). The card opens when an
// animal is clicked (safari-animal-clicked) and hides on mode transitions.
//
// SPIKE (schema `spike`): permite mostrar una animación Lottie ("gato 404") EN LUGAR
// de la ficha, para evaluar si ese formato funciona pegado a la mano. Default "none"
// → el juego se comporta exactamente igual que antes. Se puede cambiar en caliente
// desde la consola (chrome://inspect en el visor), sin rebuild:
//   document.querySelector("#cameraRig").setAttribute("animal-info-card","spike","vr")
AFRAME.registerComponent("animal-info-card", {
  schema: {
    // none | vr | dom | both
    spike: { type: "string", default: "none" },
  },

  init: function () {
    this.currentType = null;
    this._domAnim = null;
    this._domAnimLoading = false;

    this.onAnimalClicked = this.onAnimalClicked.bind(this);
    this.hide = this.hide.bind(this);

    // Wait for the DOM/scene graph to be ready (same pattern as progress-ui).
    setTimeout(() => {
      this.setupElements();
      this.setupListeners();
    }, 100);
  },

  setupElements: function () {
    // VR (in-world) card — separate fields mirror the desktop layout.
    this.vrCard = document.getElementById("animalInfoCardVR");
    this.vrIcon = document.getElementById("animalInfoCardVRIcon");
    this.vrName = document.getElementById("animalInfoCardVRName");
    this.vrSci = document.getElementById("animalInfoCardVRSci");
    this.vrCons = document.getElementById("animalInfoCardVRCons");
    this.vrNut = document.getElementById("animalInfoCardVRNut");
    this.vrHab = document.getElementById("animalInfoCardVRHab");

    // Desktop (DOM) card
    this.domCard = document.getElementById("animalInfoCard");
    this.domIcon = document.getElementById("animalInfoCardIcon");
    this.domName = document.getElementById("animalInfoCardName");
    this.domSci = document.getElementById("animalInfoCardSci");
    this.domCons = document.getElementById("animalInfoCardCons");
    this.domNut = document.getElementById("animalInfoCardNut");
    this.domHab = document.getElementById("animalInfoCardHab");

    // Spike del gato: entity in-world + overlay DOM.
    this.vrCat = document.getElementById("animalCatSpikeVR");
    this.domCat = document.getElementById("catSpikeCard");
    this.domCatHost = document.getElementById("catSpikeLottie");

    const closeBtn = document.getElementById("animalInfoCardClose");
    if (closeBtn) {
      closeBtn.addEventListener("click", this.hide);
    }
    const catCloseBtn = document.getElementById("catSpikeCardClose");
    if (catCloseBtn) {
      catCloseBtn.addEventListener("click", this.hide);
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

    // Se lee fresco en cada apertura: cambiar `spike` por consola surte efecto en
    // el siguiente click, sin recargar.
    const spike = this.data.spike;

    if (this.el.sceneEl.is("vr-mode")) {
      if (spike === "vr" || spike === "both") {
        this.showVrCat();
        this.hideVr();
      } else {
        this.showVr(animalType, data);
        this.hideVrCat();
      }
      this.hideDom();
      this.hideDomCat();
    } else {
      if (spike === "dom" || spike === "both") {
        this.showDomCat();
        this.hideDom();
      } else {
        this.showDom(animalType, data);
        this.hideDomCat();
      }
      this.hideVr();
      this.hideVrCat();
    }
  },

  showVr: function (animalType, data) {
    if (!this.vrCard) return;
    if (this.vrIcon) {
      this.vrIcon.setAttribute("src", animalIconAssetId(animalType));
    }
    if (this.vrName) this.vrName.setAttribute("value", data.commonName);
    if (this.vrSci) this.vrSci.setAttribute("value", data.scientificName);
    if (this.vrCons) this.vrCons.setAttribute("value", data.conservation);
    if (this.vrNut) this.vrNut.setAttribute("value", data.nutrition);
    if (this.vrHab) this.vrHab.setAttribute("value", data.habitat);
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

  // --- Spike: superficie VR (WebGL) ---------------------------------------
  // lottie-plane vive en este mismo entity, así que su guard de visibilidad y el
  // play/pause de A-Frame lo dejan totalmente ocioso mientras está oculto.
  showVrCat: function () {
    if (!this.vrCat) return;
    this.vrCat.setAttribute("visible", "true");
    this.vrCat.play();
  },

  hideVrCat: function () {
    if (!this.vrCat) return;
    this.vrCat.setAttribute("visible", "false");
    this.vrCat.pause();
  },

  // --- Spike: superficie DOM ----------------------------------------------
  // Acá SÍ usamos autoplay + el rAF interno de lottie: esta superficie solo existe
  // fuera de una sesión XR, donde requestAnimationFrame corre normal. (En la
  // superficie VR es al revés: autoplay:false y goToAndStop desde tick.)
  showDomCat: function () {
    if (!this.domCat) return;
    this.domCat.classList.add("info-card--visible");
    this.domCat.setAttribute("aria-hidden", "false");

    if (this._domAnim) {
      this._domAnim.play();
      return;
    }
    if (this._domAnimLoading || !this.domCatHost) return;
    this._domAnimLoading = true;

    Promise.all([loadLottieLib(), fetchLottie(CAT_SPIKE_SRC)])
      .then(([lottie, animationData]) => {
        this._domAnim = lottie.loadAnimation({
          container: this.domCatHost,
          renderer: "canvas",
          loop: true,
          autoplay: true,
          animationData: animationData,
        });
      })
      .catch((err) => {
        console.error("animal-info-card: falló el Lottie del spike DOM", err);
      })
      .then(() => {
        this._domAnimLoading = false;
      });
  },

  hideDomCat: function () {
    if (!this.domCat) return;
    this.domCat.classList.remove("info-card--visible");
    this.domCat.setAttribute("aria-hidden", "true");
    // pause, no destroy: reabrir es instantáneo y deja de gastar CPU mientras
    // está oculto.
    if (this._domAnim) this._domAnim.pause();
  },

  hide: function () {
    this.currentType = null;
    this.hideVr();
    this.hideDom();
    this.hideVrCat();
    this.hideDomCat();
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
    if (this._domAnim) {
      this._domAnim.destroy();
      this._domAnim = null;
    }
  },
});
