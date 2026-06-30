// Datos de layout del minijuego AR. Coordenadas en el espacio LOCAL del marcador
// Hiro (1 unidad ≈ el ancho del marcador), centrado en el origen, plano XZ con Y
// hacia arriba. Todo se mantiene chico (x,z ∈ ~[-0.7, 0.7]) para caber sobre el
// marcador. Ajustar escalas/posiciones al probar en dispositivo (ver README).

// Los 6 tipos canónicos (mismo `data-animal-type` que el juego principal).
export const ANIMAL_TYPES = [
  "flamingo",
  "jaguarete",
  "nandu",
  "jurumi",
  "tagua",
  "tatu",
];

// Quirk de nombres: el tipo es "flamingo" pero el archivo es "flamengo".
// (Mismo mapeo que src/data/animal-info.js del juego principal.)
export function animalAssetName(animalType) {
  return animalType === "flamingo" ? "flamengo" : animalType;
}

export function animalModelId(animalType) {
  return `#${animalAssetName(animalType)}Model`;
}

// Lista PREDEFINIDA de posiciones donde puede aparecer un animal escondido en un
// arbusto. Cada partida baraja esta lista y elige 6. Tener más de 6 hace que la
// distribución cambie entre partidas. y=0 (apoyados en el marcador).
export const SPAWN_POSITIONS = [
  { x: -0.55, y: 0, z: -0.5 },
  { x: 0.0, y: 0, z: -0.62 },
  { x: 0.55, y: 0, z: -0.48 },
  { x: -0.65, y: 0, z: 0.05 },
  { x: 0.66, y: 0, z: 0.08 },
  { x: -0.45, y: 0, z: 0.55 },
  { x: 0.05, y: 0, z: 0.4 },
  { x: 0.5, y: 0, z: 0.55 },
  { x: -0.15, y: 0, z: -0.2 },
  { x: 0.28, y: 0, z: -0.12 },
];

// Árboles decorativos del diorama (posiciones fijas, fuera de los spots de spawn
// para no tapar a los animales). type: "tree" (samuu con copa) | "shrub" (arbusto).
export const TREE_LAYOUT = [
  { x: -0.72, y: 0, z: -0.72, scale: 0.16, type: "tree" },
  { x: 0.74, y: 0, z: -0.68, scale: 0.18, type: "tree" },
  { x: 0.78, y: 0, z: 0.72, scale: 0.15, type: "tree" },
  { x: -0.78, y: 0, z: 0.7, scale: 0.17, type: "tree" },
  { x: 0.0, y: 0, z: -0.88, scale: 0.14, type: "tree" },
  { x: -0.3, y: 0, z: 0.8, scale: 0.12, type: "shrub" },
  { x: 0.35, y: 0, z: -0.55, scale: 0.12, type: "shrub" },
  { x: -0.55, y: 0, z: 0.32, scale: 0.12, type: "shrub" },
  { x: 0.6, y: 0, z: 0.25, scale: 0.12, type: "shrub" },
];

// Escala de los animales sobre el marcador (tentativa; tunear en dispositivo).
export const ANIMAL_SCALE = 0.13;

// Escala del arbusto que esconde a cada animal en su spot de spawn.
export const HIDER_BUSH_SCALE = 0.13;
