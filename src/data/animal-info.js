// Animal info-card content — single source of truth for the species descriptions
// shown when the player clicks an animal (idle showcase or safari hunt).
//
// Keyed by the canonical `data-animal-type` values used on the entities in index.html
// (flamingo, jaguarete, nandu, jurumi, tagua, tatu).
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
// (same mapping used in progress-ui.js). Reused by both card surfaces.
export function animalAssetName(animalType) {
  return animalType === "flamingo" ? "flamengo" : animalType;
}

// A-Frame asset id for the in-world (VR) icon plane, e.g. "#jaguareteCheck".
export function animalIconAssetId(animalType) {
  return `#${animalAssetName(animalType)}Check`;
}

// Public URL for the desktop (DOM) icon image, e.g. "/assets/ui/jaguarete-check.png".
export function animalIconUrl(animalType) {
  return `/assets/ui/${animalAssetName(animalType)}-check.png`;
}
