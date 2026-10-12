import * as THREE from "three";

/**
 * Every colour and light level the island uses. A theme supplies one of
 * these; the canvas remounts on a theme change, so components read `P` at
 * render time and the shared THREE.Color objects in `SC` at frame time.
 */
export type ScenePalette = {
  // Sky, weather and sea
  sky: string;
  skyStorm: string;
  cloud: string;
  cloudStorm: string;
  rain: string;
  lightning: string;
  water: string;
  waterFar: string;
  lagoon: string;
  foam: string;
  // Land
  sand: string;
  grass: string;
  hill: string;
  leaf: string;
  trunk: string;
  road: string;
  plaza: string;
  pad: string;
  padRing: string;
  // Buildings
  cream: string;
  stone: string;
  building2: string;
  vault: string;
  dock: string;
  chimney: string;
  smoke: string;
  window: string;
  roof: string;
  roofOff: string;
  houseOff: string;
  hull: string;
  glass: string;
  lampGlass: string;
  lamp: string;
  beam: string;
  pallet: string;
  gold: string;
  carGlass: string;
  cars: string[];
  // Semantic accents: brand ink, good, bad, warning, cool, focus ring
  accent: string;
  good: string;
  bad: string;
  warn: string;
  cool: string;
  focus: string;
  // Lighting
  ambient: number;
  hemiSky: string;
  hemiGround: string;
  hemi: number;
  sunColor: string;
  sun: number;
  /** Use faceted (flat) shading on the land and buildings. */
  flat: boolean;
  // Hex terrain. When a theme leaves these out they are derived from its other colours.
  plains: string;
  forestFloor: string;
  deep: string;
  shallow: string;
  rock: string;
  snow: string;
  river: string;
  fieldA: string;
  fieldB: string;
  border: string;
  wall: string;
  /** District accent colours, used on hex borders and banner emblems. */
  districts: string[];
};

/** Keys derived from a theme's base colours when the theme does not set them. */
const DERIVED = ["plains", "forestFloor", "deep", "shallow", "rock", "snow", "river", "fieldA", "fieldB", "border", "wall"] as const;

export const DEFAULT_SCENE: ScenePalette = {
  sky: "#dbeefc",
  skyStorm: "#8d97a6",
  cloud: "#ffffff",
  cloudStorm: "#5c6472",
  rain: "#cfe3f3",
  lightning: "#e8f0ff",
  water: "#3f9fd0",
  waterFar: "#215f8f",
  lagoon: "#58c1d6",
  foam: "#ffffff",
  sand: "#e8d39a",
  grass: "#7fb24a",
  hill: "#9aa752",
  leaf: "#3f7f35",
  trunk: "#6b4a2f",
  road: "#b89b6c",
  plaza: "#e4dac4",
  pad: "#efe7d3",
  padRing: "#c9bfa6",
  cream: "#f6f1e6",
  stone: "#e4ddd0",
  building2: "#dcd3c4",
  vault: "#d6d0e2",
  dock: "#c9bea4",
  chimney: "#b9b0a4",
  smoke: "#f3f3f0",
  window: "#9fd8d4",
  roof: "#d97a5a",
  roofOff: "#8e8a99",
  houseOff: "#cfcbd2",
  hull: "#2a2a44",
  glass: "#ffffff",
  lampGlass: "#fff6d6",
  lamp: "#ffe9a8",
  beam: "#ffe08a",
  pallet: "#b89a6a",
  gold: "#E7B83D",
  carGlass: "#e8eef5",
  cars: ["#F46F61", "#22B8B0", "#E7B83D", "#4a3aa7", "#ffffff", "#2E2A7B"],
  accent: "#2E2A7B",
  good: "#22B8B0",
  bad: "#F46F61",
  warn: "#E7B83D",
  cool: "#86b6ef",
  focus: "#4a3aa7",
  ambient: 0.55,
  hemiSky: "#e6f1fb",
  hemiGround: "#c9b58f",
  hemi: 0.6,
  sunColor: "#ffffff",
  sun: 1.8,
  flat: true,
  plains: "#b9b95a",
  forestFloor: "#5f9640",
  deep: "#1f5f92",
  shallow: "#4fb6cf",
  rock: "#8a8176",
  snow: "#f5f7fa",
  river: "#4aa8d8",
  fieldA: "#e2c04f",
  fieldB: "#98b84a",
  border: "#e8b730",
  wall: "#d8cdb5",
  districts: ["#7b5cc4", "#e8b730", "#3c8de0", "#e07a2c", "#2aa7b5", "#c9a227", "#5aa34a", "#8fb6d9", "#c0504d"],
};

/** The palette in force. Mutated by applyScenePalette before the canvas mounts. */
export const P: ScenePalette = { ...DEFAULT_SCENE };

/** Shared colours read inside useFrame lerps. */
export const SC = {
  accent: new THREE.Color(DEFAULT_SCENE.accent),
  good: new THREE.Color(DEFAULT_SCENE.good),
  bad: new THREE.Color(DEFAULT_SCENE.bad),
  warn: new THREE.Color(DEFAULT_SCENE.warn),
  cool: new THREE.Color(DEFAULT_SCENE.cool),
  sky: new THREE.Color(DEFAULT_SCENE.sky),
  skyStorm: new THREE.Color(DEFAULT_SCENE.skyStorm),
  cloud: new THREE.Color(DEFAULT_SCENE.cloud),
  cloudStorm: new THREE.Color(DEFAULT_SCENE.cloudStorm),
};

const mix = (a: string, b: string, t: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

/** Fill terrain colours a theme did not set from the colours it did set. */
function derive(next: Partial<ScenePalette>): Partial<ScenePalette> {
  const d: Partial<ScenePalette> = {
    plains: mix(P.grass, P.sand, 0.5),
    forestFloor: mix(P.grass, P.leaf, 0.35),
    deep: mix(P.waterFar, "#000000", 0.18),
    shallow: P.lagoon,
    rock: mix(P.stone, "#4a4540", 0.45),
    snow: mix("#f5f7fa", P.sky, 0.15),
    river: P.water,
    fieldA: mix(P.sand, P.gold, 0.45),
    fieldB: mix(P.grass, P.leaf, 0.2),
    border: P.focus,
    wall: P.stone,
  };
  const out: Partial<ScenePalette> = {};
  for (const k of DERIVED) if (next[k] === undefined) (out as Record<string, unknown>)[k] = d[k];
  return out;
}

export function applyScenePalette(next: Partial<ScenePalette> | undefined) {
  const theme = next ?? {};
  Object.assign(P, DEFAULT_SCENE, theme);
  // A theme with its own land and sea but no terrain keys gets terrain derived from them.
  if (Object.keys(theme).length > 0) Object.assign(P, derive(theme));
  if (!Array.isArray(P.cars) || P.cars.length === 0) P.cars = DEFAULT_SCENE.cars;
  if (!Array.isArray(P.districts) || P.districts.length < 9) P.districts = DEFAULT_SCENE.districts;
  for (const key of Object.keys(SC) as (keyof typeof SC)[]) {
    try {
      SC[key].set(P[key] as string);
    } catch {
      SC[key].set(DEFAULT_SCENE[key] as string);
    }
  }
}
