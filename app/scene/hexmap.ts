// Procedural hex world for the island, in the style of 4X strategy maps:
// pointy-top hexes, terrain classes, forests, mountains, a river, roads from
// the city centre to each district, farm fields and a territory border.
// Pure and deterministic, so the map never changes between renders.

import { mulberry32 } from "../model/random.ts";

/** Hex circumradius in world units. */
export const HEX = 1.45;
const SQRT3 = Math.sqrt(3);
/** Grid radius in hexes. */
export const GRID = 9;
/** Top of flat, developed land: districts stand on this. */
export const TOP = 0.3;

export type TileKind = "deep" | "shallow" | "sand" | "grass" | "plains" | "forest" | "hills" | "mountain";

export type Tile = {
  q: number;
  r: number;
  x: number;
  z: number;
  /** Hex distance from the city centre. */
  d: number;
  kind: TileKind;
  /** Height of the tile top. */
  top: number;
  land: boolean;
  /** Developed tiles (city, districts, roads) stay flat and clear. */
  developed: boolean;
  /** Small per-tile shade variation, -1..1. */
  shade: number;
};

export type DistrictSite = { q: number; r: number; x: number; z: number; top: number };

export type HexWorld = {
  tiles: Tile[];
  trees: { x: number; y: number; z: number; s: number; broad: boolean; shade: number }[];
  peaks: { x: number; y: number; z: number; r: number; h: number }[];
  bumps: { x: number; y: number; z: number; s: number }[];
  farms: { x: number; y: number; z: number; rot: number; d: number }[];
  roads: [number, number][][];
  river: [number, number][] | null;
  /** Flat [x,y,z, x,y,z, ...] segment list along the territory edge. */
  border: number[];
  /** Flat segment list of hex outlines on land. */
  grid: number[];
  sites: Record<SiteKey, DistrictSite>;
};

export type SiteKey = "center" | "debt" | "rate" | "infl" | "growth" | "ca" | "reserves" | "unemp" | "cred";

/** Axial coordinates of each site. The port and lighthouse sit on the coast. */
const SITES: Record<SiteKey, [number, number]> = {
  center: [0, 0],
  debt: [-2, -1],
  rate: [0, -2],
  infl: [2, -3],
  growth: [2, -1],
  ca: [4, 0],
  reserves: [-3, 2],
  unemp: [0, 2],
  cred: [-2, 5],
};

export const HEIGHTS: Record<TileKind, number> = {
  deep: -0.24,
  shallow: -0.1,
  sand: 0.2,
  grass: TOP,
  plains: TOP,
  forest: TOP,
  hills: 0.62,
  mountain: 0.78,
};

const DIRS: [number, number][] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

export function axialToWorld(q: number, r: number): [number, number] {
  return [HEX * SQRT3 * (q + r / 2), HEX * 1.5 * r];
}

export function hexDistance(q: number, r: number, q2 = 0, r2 = 0): number {
  const dq = q - q2;
  const dr = r - r2;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

/** Corners of a pointy-top hex, starting at the right-hand upper corner. */
export function hexCorners(x: number, z: number, size = HEX): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = ((60 * i - 30) * Math.PI) / 180;
    out.push([x + size * Math.cos(a), z + size * Math.sin(a)]);
  }
  return out;
}

function cubeRound(q: number, r: number): [number, number] {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return [rq, rr];
}

export function hexLine(a: [number, number], b: [number, number]): [number, number][] {
  const n = hexDistance(a[0], a[1], b[0], b[1]);
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n;
    out.push(cubeRound(a[0] + (b[0] - a[0]) * t + 1e-6, a[1] + (b[1] - a[1]) * t + 1e-6));
  }
  return out;
}

/** Smooth value noise on a lattice, two octaves. */
function makeNoise(seed: number) {
  const rand = mulberry32(seed);
  const perm = Array.from({ length: 256 }, () => rand());
  const lattice = (ix: number, iz: number) => perm[(((ix * 73856093) ^ (iz * 19349663)) >>> 0) % 256];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const value = (x: number, z: number) => {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = smooth(x - ix);
    const fz = smooth(z - iz);
    const a = lattice(ix, iz);
    const b = lattice(ix + 1, iz);
    const c = lattice(ix, iz + 1);
    const d = lattice(ix + 1, iz + 1);
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
  };
  return (x: number, z: number) => 0.65 * value(x, z) + 0.35 * value(x * 2.1 + 17, z * 2.1 + 9);
}

const key = (q: number, r: number) => `${q},${r}`;

export function generateWorld(seed = 11): HexWorld {
  const landNoise = makeNoise(seed);
  const elevNoise = makeNoise(seed + 1);
  const moistNoise = makeNoise(seed + 2);
  const rand = mulberry32(seed + 3);

  const sites = {} as Record<SiteKey, DistrictSite>;
  const siteKeys = new Set<string>();
  for (const [name, [q, r]] of Object.entries(SITES) as [SiteKey, [number, number]][]) {
    const [x, z] = axialToWorld(q, r);
    sites[name] = { q, r, x, z, top: TOP };
    siteKeys.add(key(q, r));
  }

  // Roads: hex lines from the centre to each district.
  const roadKeys = new Set<string>();
  const roadPaths: [number, number][][] = [];
  for (const name of Object.keys(SITES) as SiteKey[]) {
    if (name === "center") continue;
    const path = hexLine(SITES.center, SITES[name]);
    roadPaths.push(path);
    for (const [q, r] of path) roadKeys.add(key(q, r));
  }

  // Sea forced around the harbour (east) and the lighthouse point (south).
  const [portX] = axialToWorld(...SITES.ca);
  const [, lightZ] = axialToWorld(...SITES.cred);
  const forcedWater = (q: number, r: number, x: number, z: number) => {
    if (siteKeys.has(key(q, r)) || roadKeys.has(key(q, r))) return false;
    if (x > portX + HEX * 0.9 && Math.abs(z) < HEX * 3.2) return true;
    if (z > lightZ + HEX * 0.8 && Math.abs(x - axialToWorld(...SITES.cred)[0]) < HEX * 4) return true;
    return false;
  };

  const tiles: Tile[] = [];
  const byKey = new Map<string, Tile>();
  for (let q = -GRID; q <= GRID; q++) {
    for (let r = -GRID; r <= GRID; r++) {
      const d = hexDistance(q, r);
      if (d > GRID) continue;
      const [x, z] = axialToWorld(q, r);
      const developed = siteKeys.has(key(q, r)) || roadKeys.has(key(q, r)) || d <= 1;
      const score = 1 - d / 7.3 + 0.55 * (landNoise(x * 0.16 + 3, z * 0.16 + 7) - 0.5);
      let land = developed || d <= 3 || score > 0.05;
      if (!developed && forcedWater(q, r, x, z)) land = false;
      const tile: Tile = { q, r, x, z, d, kind: land ? "grass" : "deep", top: 0, land, developed, shade: rand() * 2 - 1 };
      tiles.push(tile);
      byKey.set(key(q, r), tile);
    }
  }
  const neighbours = (t: Tile) => DIRS.map(([dq, dr]) => byKey.get(key(t.q + dq, t.r + dr))).filter((n): n is Tile => Boolean(n));

  // Terrain classes.
  for (const t of tiles) {
    if (!t.land) {
      t.kind = neighbours(t).some((n) => n.land) ? "shallow" : "deep";
      continue;
    }
    if (t.developed) {
      t.kind = t.d <= 1 || siteKeys.has(key(t.q, t.r)) ? "grass" : moistNoise(t.x * 0.2, t.z * 0.2) > 0.5 ? "grass" : "plains";
      continue;
    }
    const e = elevNoise(t.x * 0.17 + 50, t.z * 0.17 + 50);
    const m = moistNoise(t.x * 0.2, t.z * 0.2);
    const coastal = neighbours(t).some((n) => !n.land) || neighbours(t).length < 6;
    if (t.d >= 3 && e > 0.6) t.kind = "mountain";
    else if (t.d >= 2 && e > 0.5) t.kind = "hills";
    else if (coastal && e < 0.42) t.kind = "sand";
    else if (m > 0.56) t.kind = "forest";
    else if (m < 0.42) t.kind = "plains";
    else t.kind = "grass";
  }

  // River: from the highest undeveloped land down the shortest hex line to the sea.
  let river: [number, number][] | null = null;
  const source = tiles
    .filter((t) => t.land && !t.developed && t.d >= 3 && (t.kind === "mountain" || t.kind === "hills"))
    .sort((a, b) => elevNoise(b.x * 0.17 + 50, b.z * 0.17 + 50) - elevNoise(a.x * 0.17 + 50, a.z * 0.17 + 50))[0];
  if (source) {
    const sea = tiles.filter((t) => !t.land).sort((a, b) => hexDistance(a.q, a.r, source.q, source.r) - hexDistance(b.q, b.r, source.q, source.r))[0];
    if (sea) {
      const path = hexLine([source.q, source.r], [sea.q, sea.r]);
      if (!path.some(([q, r]) => siteKeys.has(key(q, r)))) {
        river = [];
        path.forEach(([q, r], i) => {
          const t = byKey.get(key(q, r));
          if (!t) return;
          if (i > 0 && t.land && !t.developed) t.kind = "grass";
          river!.push([t.x, t.z]);
        });
      }
    }
  }

  for (const t of tiles) t.top = HEIGHTS[t.kind];

  // Decoration.
  const trees: HexWorld["trees"] = [];
  const peaks: HexWorld["peaks"] = [];
  const bumps: HexWorld["bumps"] = [];
  const scatter = (t: Tile, radius: number) => {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * radius;
    return [t.x + Math.cos(a) * r, t.z + Math.sin(a) * r] as const;
  };
  for (const t of tiles) {
    if (!t.land || t.developed) continue;
    if (t.kind === "forest") {
      const broad = moistNoise(t.x * 0.31 + 5, t.z * 0.31) > 0.5;
      const n = 5 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        const [x, z] = scatter(t, HEX * 0.72);
        trees.push({ x, y: t.top, z, s: 0.75 + rand() * 0.5, broad: broad ? rand() > 0.2 : rand() > 0.8, shade: rand() * 2 - 1 });
      }
    } else if (t.kind === "hills") {
      bumps.push({ x: t.x + (rand() - 0.5) * 0.4, y: t.top, z: t.z + (rand() - 0.5) * 0.4, s: 0.85 + rand() * 0.3 });
      if (rand() > 0.5) {
        const [x, z] = scatter(t, HEX * 0.6);
        trees.push({ x, y: t.top, z, s: 0.7, broad: false, shade: rand() * 2 - 1 });
      }
    } else if (t.kind === "mountain") {
      peaks.push({ x: t.x + (rand() - 0.5) * 0.3, y: t.top, z: t.z + (rand() - 0.5) * 0.3, r: HEX * (0.62 + rand() * 0.12), h: 1.7 + rand() * 0.8 });
      for (let i = 0; i < 2; i++) {
        const [x, z] = scatter(t, HEX * 0.5);
        peaks.push({ x, y: t.top, z, r: HEX * (0.3 + rand() * 0.12), h: 0.8 + rand() * 0.5 });
      }
    } else if (t.kind === "grass" && rand() > 0.72) {
      const [x, z] = scatter(t, HEX * 0.6);
      trees.push({ x, y: t.top, z, s: 0.65 + rand() * 0.3, broad: rand() > 0.5, shade: rand() * 2 - 1 });
    }
  }

  // Farm fields on open land around the city, nearest first.
  const farms = tiles
    .filter((t) => t.land && !siteKeys.has(key(t.q, t.r)) && !roadKeys.has(key(t.q, t.r)) && (t.kind === "plains" || t.kind === "grass") && t.d >= 2 && t.d <= 5)
    .sort((a, b) => a.d - b.d || Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x))
    .slice(0, 12)
    .map((t) => ({ x: t.x, y: t.top, z: t.z, rot: (Math.floor(rand() * 3) * Math.PI) / 3, d: t.d }));

  // Territory: land within four hexes of the centre plus every district and road.
  const inTerritory = (t: Tile | undefined) => Boolean(t && t.land && (t.d <= 4 || siteKeys.has(key(t.q, t.r)) || roadKeys.has(key(t.q, t.r))));
  const border: number[] = [];
  const grid: number[] = [];
  for (const t of tiles) {
    if (!t.land) continue;
    const corners = hexCorners(t.x, t.z, HEX);
    for (const [dq, dr] of DIRS) {
      const n = byKey.get(key(t.q + dq, t.r + dr));
      const [nx, nz] = n ? [n.x, n.z] : axialToWorld(t.q + dq, t.r + dr);
      const mx = (t.x + nx) / 2;
      const mz = (t.z + nz) / 2;
      const edge = corners
        .map((c, i) => ({ i, dist: Math.hypot(c[0] - mx, c[1] - mz) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 2)
        .map((c) => corners[c.i]);
      if (inTerritory(t) && !inTerritory(n)) {
        // Inset slightly so the border reads as belonging to the inner tile.
        const inset = (c: [number, number]) => [t.x + (c[0] - t.x) * 0.94, t.z + (c[1] - t.z) * 0.94] as const;
        const [a, b] = edge.map(inset);
        const y = Math.max(t.top, n && n.land ? n.top : t.top) + 0.04;
        border.push(a[0], y, a[1], b[0], y, b[1]);
      }
      if (n && n.land && (t.q < n.q || (t.q === n.q && t.r < n.r))) {
        const y = Math.max(t.top, n.top) + 0.006;
        grid.push(edge[0][0], y, edge[0][1], edge[1][0], y, edge[1][1]);
      }
    }
  }

  const roads = roadPaths.map((path) => path.map(([q, r]) => axialToWorld(q, r)));

  return { tiles, trees, peaks, bumps, farms, roads, river, border, grid, sites };
}
