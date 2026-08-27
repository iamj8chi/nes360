// Animal info-card content, keyed by the canonical `data-animal-type` values used on
// the entities in index.html (flamingo, jaguarete, nandu, jurumi, tagua, tatu).
//
// OJO: la copia que el jugador VE ya no sale de acá. Desde el arte final de la ficha
// (public/assets/ui/cards/*.png, exportado de art-src/pop-up/*.svg) el texto viene
// horneado dentro de la imagen. ANIMAL_INFO sigue siendo:
//   (a) el texto accesible del overlay de desktop (`alt` del <img>),
//   (b) el guard de tipo desconocido en animal-info-card, y
//   (c) la fuente de verdad textual contra la que se regenera ese arte.
// Si cambiás un texto acá, hay que re-exportar la ficha correspondiente.
//
// TODO: review copy — drafted Spanish text for the Chaco fauna; verify common names,
// scientific names and conservation status against the project's reference material.

export const ANIMAL_INFO = {
  flamingo: {
    commonName: "Flamenco austral",
    scientificName: "Phoenicopterus chilensis",
    conservation: "Casi Amenazado",
    nutrition: "Filtrador: algas, crustáceos e invertebrados acuáticos.",
    habitat: "Lagunas salinas y humedales del Chaco.",
  },
  jaguarete: {
    commonName: "Jaguar o Jaguareté",
    scientificName: "Panthera onca",
    conservation: "En Peligro de Extinción",
    nutrition: "Es carnívoro y un excelente cazador.",
    habitat: "Selva, planicies y matorrales.",
  },
  nandu: {
    commonName: "Ñandú",
    scientificName: "Rhea americana",
    conservation: "Casi Amenazado",
    nutrition: "Omnívoro: plantas, semillas, insectos y pequeños animales.",
    habitat: "Pastizales y sabanas abiertas.",
  },
  jurumi: {
    commonName: "Oso hormiguero gigante (Jurumí)",
    scientificName: "Myrmecophaga tridactyla",
    conservation: "Vulnerable",
    nutrition: "Insectívoro: hormigas y termitas.",
    habitat: "Sabanas, pastizales y bosques.",
  },
  tagua: {
    commonName: "Taguá o Pecarí del Chaco",
    scientificName: "Catagonus wagneri",
    conservation: "En Peligro de Extinción",
    nutrition: "Herbívoro: cactus, raíces y frutos del bosque seco.",
    habitat: "Bosque seco chaqueño.",
  },
  tatu: {
    commonName: "Tatú carreta (Armadillo gigante)",
    scientificName: "Priodontes maximus",
    conservation: "Vulnerable",
    nutrition: "Insectívoro: termitas, hormigas y otros invertebrados.",
    habitat: "Bosques y sabanas con suelos blandos.",
  },
};

// Asset basename for an animal type, handling the flamingo→flamengo file-naming quirk
// (el SVG de diseño además viene como `flamenco`; se normaliza a `flamengo` al copiar,
// así este sigue siendo el único lugar del mapeo). Reused by both card surfaces.
export function animalAssetName(animalType) {
  return animalType === "flamingo" ? "flamengo" : animalType;
}

// A-Frame asset id for the hexagonal animal icon, e.g. "#jaguareteCheck".
// Se superpone sobre el hueco vacío que la ficha deja arriba del nombre.
export function animalIconAssetId(animalType) {
  return `#${animalAssetName(animalType)}Check`;
}

// Public URL for the desktop (DOM) icon image, e.g. "/assets/ui/jaguarete-check.png".
export function animalIconUrl(animalType) {
  return `/assets/ui/${animalAssetName(animalType)}-check.png`;
}

// A-Frame asset id for the in-world (VR) card image, e.g. "#jaguareteCartel".
export function animalCardAssetId(animalType) {
  return `#${animalAssetName(animalType)}Cartel`;
}

// Public URL for the desktop (DOM) card image, e.g.
// "/assets/ui/cards/jaguarete-cartel.png".
export function animalCardUrl(animalType) {
  return `/assets/ui/cards/${animalAssetName(animalType)}-cartel.png`;
}
