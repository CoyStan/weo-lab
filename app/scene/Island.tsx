"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mulberry32 } from "../model/random";
import { selectCurrent, useLab } from "../store";
import { HEX, hexCorners, TOP, type TileKind } from "./hexmap";
import { P } from "./palette";
import { clamp } from "./useSmooth";
import { WORLD } from "./world";

const BASE = -0.7;
const dummy = new THREE.Object3D();
const tmp = new THREE.Color();

function tileColor(kind: TileKind): string {
  switch (kind) {
    case "deep":
      return P.deep;
    case "shallow":
      return P.shallow;
    case "sand":
      return P.sand;
    case "plains":
      return P.plains;
    case "forest":
      return P.forestFloor;
    case "hills":
      return P.hill;
    case "mountain":
      return P.rock;
    default:
      return P.grass;
  }
}

/** Apply matrices and per-instance colours once. */
function useInstances(ref: React.RefObject<THREE.InstancedMesh | null>, count: number, place: (i: number, o: THREE.Object3D, c: THREE.Color) => void) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) {
      dummy.position.set(0, 0, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      tmp.set("#ffffff");
      place(i, dummy, tmp);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, tmp);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, count, place]);
}

function Tiles() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const tiles = WORLD.tiles;
  const place = useMemo(
    () => (i: number, o: THREE.Object3D, c: THREE.Color) => {
      const t = tiles[i];
      o.position.set(t.x, (t.top + BASE) / 2, t.z);
      o.scale.set(1, t.top - BASE, 1);
      c.set(tileColor(t.kind)).offsetHSL(0, 0, t.shade * (t.land ? 0.035 : 0.015));
    },
    [tiles],
  );
  useInstances(ref, tiles.length, place);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, tiles.length]} receiveShadow castShadow>
      <cylinderGeometry args={[HEX * 0.995, HEX, 1, 6, 1]} />
      <meshStandardMaterial roughness={0.95} flatShading />
    </instancedMesh>
  );
}

function Forests() {
  const trees = WORLD.trees;
  const conifers = useMemo(() => trees.filter((t) => !t.broad), [trees]);
  const broads = useMemo(() => trees.filter((t) => t.broad), [trees]);
  const low = useRef<THREE.InstancedMesh>(null);
  const high = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const leaf = useMemo(() => new THREE.Color(P.leaf), []);
  const placeLow = useMemo(
    () => (i: number, o: THREE.Object3D, c: THREE.Color) => {
      const t = conifers[i];
      o.position.set(t.x, t.y + 0.55 * t.s, t.z);
      o.scale.setScalar(t.s);
      c.copy(leaf).offsetHSL(0.01 * t.shade, 0, 0.04 * t.shade);
    },
    [conifers, leaf],
  );
  const placeHigh = useMemo(
    () => (i: number, o: THREE.Object3D, c: THREE.Color) => {
      const t = conifers[i];
      o.position.set(t.x, t.y + 0.95 * t.s, t.z);
      o.scale.setScalar(t.s);
      c.copy(leaf).offsetHSL(0.01 * t.shade, 0, 0.06 + 0.04 * t.shade);
    },
    [conifers, leaf],
  );
  const placeCrown = useMemo(
    () => (i: number, o: THREE.Object3D, c: THREE.Color) => {
      const t = broads[i];
      o.position.set(t.x, t.y + 0.62 * t.s, t.z);
      o.scale.set(t.s * 0.42, t.s * 0.4, t.s * 0.42);
      o.rotation.y = t.shade * 3;
      c.copy(leaf).offsetHSL(0.04, 0.05, 0.08 + 0.05 * t.shade);
    },
    [broads, leaf],
  );
  const placeTrunk = useMemo(
    () => (i: number, o: THREE.Object3D, c: THREE.Color) => {
      const t = trees[i];
      o.position.set(t.x, t.y + 0.14 * t.s, t.z);
      o.scale.setScalar(t.s);
      c.set(P.trunk);
    },
    [trees],
  );
  useInstances(low, conifers.length, placeLow);
  useInstances(high, conifers.length, placeHigh);
  useInstances(crowns, broads.length, placeCrown);
  useInstances(trunks, trees.length, placeTrunk);
  return (
    <group>
      <instancedMesh ref={low} args={[undefined, undefined, conifers.length]} castShadow>
        <coneGeometry args={[0.36, 0.62, 7]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={high} args={[undefined, undefined, conifers.length]} castShadow>
        <coneGeometry args={[0.26, 0.5, 7]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, broads.length]} castShadow>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 0.3, 5]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
    </group>
  );
}

function Mountains() {
  const peaks = WORLD.peaks;
  const snowy = useMemo(() => peaks.filter((p) => p.h > 1.3), [peaks]);
  const rock = useRef<THREE.InstancedMesh>(null);
  const snow = useRef<THREE.InstancedMesh>(null);
  const bumps = useRef<THREE.InstancedMesh>(null);
  const placeRock = useMemo(
    () => (i: number, o: THREE.Object3D, c: THREE.Color) => {
      const p = peaks[i];
      o.position.set(p.x, p.y + p.h / 2 - 0.02, p.z);
      o.scale.set(p.r, p.h, p.r);
      o.rotation.y = i * 1.3;
      c.set(P.rock).offsetHSL(0, 0, (i % 3) * 0.025 - 0.02);
    },
    [peaks],
  );
  const placeSnow = useMemo(
    () => (i: number, o: THREE.Object3D, c: THREE.Color) => {
      const p = snowy[i];
      const h = p.h * 0.36;
      o.position.set(p.x, p.y + p.h - h / 2 + 0.01, p.z);
      o.scale.set(p.r * 0.38, h, p.r * 0.38);
      o.rotation.y = peaks.indexOf(p) * 1.3;
      c.set(P.snow);
    },
    [snowy, peaks],
  );
  const placeBump = useMemo(
    () => (i: number, o: THREE.Object3D, c: THREE.Color) => {
      const b = WORLD.bumps[i];
      o.position.set(b.x, b.y - 0.02, b.z);
      o.scale.set(HEX * 0.5 * b.s, 0.3 * b.s, HEX * 0.5 * b.s);
      c.set(P.hill).offsetHSL(0, 0, 0.03);
    },
    [],
  );
  useInstances(rock, peaks.length, placeRock);
  useInstances(snow, snowy.length, placeSnow);
  useInstances(bumps, WORLD.bumps.length, placeBump);
  return (
    <group>
      <instancedMesh ref={rock} args={[undefined, undefined, peaks.length]} castShadow receiveShadow>
        <coneGeometry args={[1, 1, 5]} />
        <meshStandardMaterial roughness={1} flatShading />
      </instancedMesh>
      <instancedMesh ref={snow} args={[undefined, undefined, snowy.length]} castShadow>
        <coneGeometry args={[1, 1, 5]} />
        <meshStandardMaterial roughness={0.7} flatShading />
      </instancedMesh>
      <instancedMesh ref={bumps} args={[undefined, undefined, WORLD.bumps.length]} castShadow receiveShadow>
        <sphereGeometry args={[1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial roughness={1} flatShading />
      </instancedMesh>
    </group>
  );
}

const STRIPS = 4;

/** Farm fields: more tiles are worked, and they ripen, as output rises. */
function Farms({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  const ref = useRef<THREE.InstancedMesh>(null);
  const farms = WORLD.farms;
  const worked = Math.round(clamp(6 + current.gap * 1.6 + (current.gdpLevel - 100) * 0.3, 2, farms.length));
  const shown = useRef(worked);
  const place = useMemo(
    () => (i: number, o: THREE.Object3D, c: THREE.Color) => {
      const f = farms[Math.floor(i / STRIPS)];
      const k = i % STRIPS;
      const off = (k - (STRIPS - 1) / 2) * 0.42;
      o.position.set(f.x + Math.cos(f.rot) * off, f.y + 0.02, f.z + Math.sin(f.rot) * off);
      o.rotation.y = -f.rot;
      o.scale.set(1, 1, 1);
      c.set(k % 2 ? P.fieldA : P.fieldB);
    },
    [farms],
  );
  useInstances(ref, farms.length * STRIPS, place);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    shown.current = reducedMotion ? worked : shown.current + (worked - shown.current) * 0.08;
    m.count = Math.round(shown.current) * STRIPS;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, farms.length * STRIPS]} receiveShadow>
      <boxGeometry args={[0.36, 0.05, HEX * 1.3]} />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
  );
}

function Roads() {
  const segments = useMemo(() => {
    const out: { x: number; z: number; len: number; rot: number }[] = [];
    for (const path of WORLD.roads) {
      for (let i = 1; i < path.length; i++) {
        const [x1, z1] = path[i - 1];
        const [x2, z2] = path[i];
        out.push({ x: (x1 + x2) / 2, z: (z1 + z2) / 2, len: Math.hypot(x2 - x1, z2 - z1) + 0.3, rot: Math.atan2(x2 - x1, z2 - z1) });
      }
    }
    return out;
  }, []);
  const ref = useRef<THREE.InstancedMesh>(null);
  const place = useMemo(
    () => (i: number, o: THREE.Object3D, c: THREE.Color) => {
      const s = segments[i];
      o.position.set(s.x, TOP + 0.012, s.z);
      o.rotation.y = s.rot;
      o.scale.set(1, 1, s.len);
      c.set(P.road);
    },
    [segments],
  );
  useInstances(ref, segments.length, place);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, segments.length]} receiveShadow>
      <boxGeometry args={[0.34, 0.02, 1]} />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
  );
}

function River() {
  const geometry = useMemo(() => {
    const pts = WORLD.river;
    if (!pts || pts.length < 2) return null;
    const tops = pts.map(([x, z]) => {
      const t = WORLD.tiles.find((tile) => Math.abs(tile.x - x) < 0.01 && Math.abs(tile.z - z) < 0.01);
      return Math.max(t ? t.top : 0, 0) + 0.025;
    });
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z], i) => new THREE.Vector3(x, tops[i], z)));
    const g = new THREE.TubeGeometry(curve, 48, 0.2, 6, false);
    g.scale(1, 0.25, 1);
    return g;
  }, []);
  if (!geometry) return null;
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={P.river} roughness={0.2} metalness={0.15} />
    </mesh>
  );
}

/** Hex outlines on land and the glowing territory border. */
function Overlays() {
  const grid = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(WORLD.grid, 3));
    return g;
  }, []);
  const borderPoints = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < WORLD.border.length; i += 3) pts.push([WORLD.border[i], WORLD.border[i + 1], WORLD.border[i + 2]]);
    return pts;
  }, []);
  return (
    <group>
      <lineSegments geometry={grid}>
        <lineBasicMaterial color="#000000" transparent opacity={0.13} depthWrite={false} />
      </lineSegments>
      <Line points={borderPoints} segments color={P.border} lineWidth={7} transparent opacity={0.28} depthWrite={false} />
      <Line points={borderPoints} segments color={P.border} lineWidth={2.4} />
    </group>
  );
}

/** Walled city centre with a palace and a ring of houses. */
function CityCentre() {
  const { x, z } = WORLD.sites.center;
  const corners = useMemo(() => hexCorners(x, z, HEX * 0.86), [x, z]);
  const houses = useMemo(() => {
    const rand = mulberry32(5);
    const roadSegs: [number, number, number, number][] = [];
    for (const path of WORLD.roads) for (let i = 1; i < path.length; i++) roadSegs.push([...path[i - 1], ...path[i]]);
    const nearRoad = (px: number, pz: number) =>
      roadSegs.some(([x1, z1, x2, z2]) => {
        const dx = x2 - x1;
        const dz = z2 - z1;
        const t = clamp(((px - x1) * dx + (pz - z1) * dz) / (dx * dx + dz * dz), 0, 1);
        return Math.hypot(px - (x1 + dx * t), pz - (z1 + dz * t)) < 0.42;
      });
    const out: { x: number; z: number; s: number; rot: number; roof: number }[] = [];
    const ring = WORLD.tiles.filter((t) => t.d === 1);
    for (const t of ring) {
      for (let k = 0; k < 9 && out.length < ring.length * 4; k++) {
        const a = rand() * Math.PI * 2;
        const r = 0.3 + rand() * 0.75;
        const hx = t.x + Math.cos(a) * r;
        const hz = t.z + Math.sin(a) * r;
        if (nearRoad(hx, hz)) continue;
        if (out.some((h) => Math.hypot(h.x - hx, h.z - hz) < 0.48)) continue;
        out.push({ x: hx, z: hz, s: 0.75 + rand() * 0.45, rot: Math.floor(rand() * 6) * (Math.PI / 3), roof: Math.floor(rand() * 3) });
      }
    }
    return out;
  }, []);
  const body = useRef<THREE.InstancedMesh>(null);
  const roof = useRef<THREE.InstancedMesh>(null);
  const roofColors = useMemo(() => [P.roof, new THREE.Color(P.roof).offsetHSL(0.02, 0, -0.08).getStyle(), P.accent], []);
  const placeBody = useMemo(
    () => (i: number, o: THREE.Object3D, c: THREE.Color) => {
      const h = houses[i];
      o.position.set(h.x, TOP + 0.17 * h.s, h.z);
      o.rotation.y = h.rot;
      o.scale.setScalar(h.s);
      c.set(P.cream);
    },
    [houses],
  );
  const placeRoof = useMemo(
    () => (i: number, o: THREE.Object3D, c: THREE.Color) => {
      const h = houses[i];
      o.position.set(h.x, TOP + 0.42 * h.s, h.z);
      o.rotation.y = h.rot + Math.PI / 4;
      o.scale.setScalar(h.s);
      c.set(roofColors[h.roof]);
    },
    [houses, roofColors],
  );
  useInstances(body, houses.length, placeBody);
  useInstances(roof, houses.length, placeRoof);

  return (
    <group>
      {/* Paved centre */}
      <mesh position={[x, TOP + 0.01, z]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[HEX * 0.9, 6, Math.PI / 2]} />
        <meshStandardMaterial color={P.plaza} roughness={1} />
      </mesh>
      {/* Walls and towers */}
      {corners.map(([cx, cz], i) => {
        const [nx, nz] = corners[(i + 1) % 6];
        const len = Math.hypot(nx - cx, nz - cz);
        return (
          <group key={i}>
            <mesh position={[(cx + nx) / 2, TOP + 0.17, (cz + nz) / 2]} rotation-y={Math.atan2(nx - cx, nz - cz)} castShadow receiveShadow>
              <boxGeometry args={[0.12, 0.34, len]} />
              <meshStandardMaterial color={P.wall} roughness={0.95} flatShading={P.flat} />
            </mesh>
            <mesh position={[cx, TOP + 0.26, cz]} castShadow>
              <cylinderGeometry args={[0.13, 0.15, 0.52, 6]} />
              <meshStandardMaterial color={P.wall} roughness={0.95} flatShading={P.flat} />
            </mesh>
            <mesh position={[cx, TOP + 0.6, cz]} castShadow>
              <coneGeometry args={[0.17, 0.22, 6]} />
              <meshStandardMaterial color={P.roof} roughness={0.9} flatShading={P.flat} />
            </mesh>
          </group>
        );
      })}
      {/* Palace */}
      <group position={[x, TOP, z]}>
        <mesh position-y={0.1} castShadow receiveShadow>
          <boxGeometry args={[1.25, 0.2, 0.95]} />
          <meshStandardMaterial color={P.stone} roughness={0.95} flatShading={P.flat} />
        </mesh>
        <mesh position-y={0.42} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.45, 0.7]} />
          <meshStandardMaterial color={P.cream} roughness={0.9} flatShading={P.flat} />
        </mesh>
        <mesh position-y={0.82} rotation-y={Math.PI / 4} scale={[1.05, 1, 0.74]} castShadow>
          <coneGeometry args={[0.72, 0.38, 4]} />
          <meshStandardMaterial color={P.accent} roughness={0.8} flatShading={P.flat} />
        </mesh>
        <mesh position={[0.32, 0.85, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.15, 0.9, 8]} />
          <meshStandardMaterial color={P.cream} roughness={0.9} flatShading={P.flat} />
        </mesh>
        <mesh position={[0.32, 1.42, 0]} castShadow>
          <coneGeometry args={[0.19, 0.3, 8]} />
          <meshStandardMaterial color={P.accent} roughness={0.8} flatShading={P.flat} />
        </mesh>
        <mesh position={[0.32, 1.72, 0]}>
          <boxGeometry args={[0.02, 0.32, 0.02]} />
          <meshStandardMaterial color="#5b4a3a" />
        </mesh>
        <mesh position={[0.4, 1.8, 0]}>
          <boxGeometry args={[0.16, 0.1, 0.01]} />
          <meshStandardMaterial color={P.border} emissive={P.border} emissiveIntensity={0.3} />
        </mesh>
      </group>
      <instancedMesh ref={body} args={[undefined, undefined, houses.length]} castShadow receiveShadow>
        <boxGeometry args={[0.32, 0.34, 0.3]} />
        <meshStandardMaterial roughness={0.95} flatShading={P.flat} />
      </instancedMesh>
      <instancedMesh ref={roof} args={[undefined, undefined, houses.length]} castShadow>
        <coneGeometry args={[0.28, 0.18, 4]} />
        <meshStandardMaterial roughness={0.9} flatShading={P.flat} />
      </instancedMesh>
    </group>
  );
}

export default function Island({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <group>
      <Tiles />
      <Overlays />
      <Roads />
      <River />
      <Farms reducedMotion={reducedMotion} />
      <Forests />
      <Mountains />
      <CityCentre />
    </group>
  );
}
