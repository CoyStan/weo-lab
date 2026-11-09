"use client";

// The 3D island: ground, the five landmarks, roads with moving flows, the
// lever's pulse and the shocks. Everything animates from the clock, so loops
// are seamless, and holds still under reduced motion.

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { LABEL_AT, LABEL_BELOW, LANES, legTo, NODE_AT, ROAD_LABELS, ROADS, SEA, SPOT, v, type Lane, type Road } from "./geo";
import type { Flows, LandmarkId, LandmarkState, Pulse, ShockProp, StageNode } from "./story";

export type Colors = { good: string; bad: string; warn: string; pulse: string; ink: string };

/** The scene's own warm, low-poly palette (colour for meaning comes from the theme, in Colors). */
const C = {
  sea: "#86c6dc",
  seaDeep: "#6fb6d2",
  sand: "#efdfb4",
  grass: "#b3d58a",
  grassDark: "#9cc673",
  road: "#f1e6cc",
  roadEdge: "#dccba5",
  cream: "#f8f2e4",
  stone: "#e6dfd0",
  roof: "#e48c6c",
  roofDark: "#c9735a",
  dome: "#b9c4dc",
  wood: "#c79b68",
  trunk: "#8a6142",
  leaf: "#6fae5a",
  glass: "#a8dbe0",
  hull: "#4b5a8c",
  gold: "#e9bd4c",
  crate: "#d4a466",
  smoke: "#fbfbf7",
  cloud: "#9aa3b3",
  rain: "#7d9fc0",
  field: "#e5c867",
  fieldDry: "#c9a668",
  canopy: ["#f3a07f", "#f6d27a", "#9fd3c7"],
};

const ease = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Fades in over the first `edge` of a loop and out over its last, so loops have no seam. */
const fadeEnds = (u: number, edge = 0.1) => ease(clamp01(u / edge)) * ease(clamp01((1 - u) / edge));

function Mat({ color, ...rest }: { color: string } & Partial<THREE.MeshStandardMaterialParameters>) {
  return <meshStandardMaterial color={color} flatShading roughness={0.85} metalness={0} {...rest} />;
}

function Box({ p, s, color, r = 0 }: { p: [number, number, number]; s: [number, number, number]; color: string; r?: number }) {
  return (
    <mesh position={p} rotation-y={r} castShadow receiveShadow>
      <boxGeometry args={s} />
      <Mat color={color} />
    </mesh>
  );
}


/** Gable roof as a prism, built once. */
const gableGeo = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0, 0.5);
  shape.lineTo(-0.5, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g;
})();

function Gable({ p, s, color, r = 0 }: { p: [number, number, number]; s: [number, number, number]; color: string; r?: number }) {
  return (
    <mesh geometry={gableGeo} position={p} scale={s} rotation-y={r} castShadow>
      <Mat color={color} />
    </mesh>
  );
}

function Tree({ p, s = 1 }: { p: [number, number]; s?: number }) {
  return (
    <group position={[p[0], 0, p[1]]} scale={s}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.14, 0.7, 6]} />
        <Mat color={C.trunk} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <icosahedronGeometry args={[0.55, 0]} />
        <Mat color={C.leaf} />
      </mesh>
    </group>
  );
}

// ---- Ground -----------------------------------------------------------------

function Ground() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.55, 0]} receiveShadow>
        <circleGeometry args={[140, 48]} />
        <Mat color={C.sea} />
      </mesh>
      <mesh position={[0.5, -0.35, 0]} receiveShadow>
        <cylinderGeometry args={[13.6, 14.2, 0.5, 30]} />
        <Mat color={C.sand} />
      </mesh>
      <mesh position={[0.3, -0.15, -0.2]} receiveShadow>
        <cylinderGeometry args={[12.4, 12.9, 0.3, 30]} />
        <Mat color={C.grass} />
      </mesh>
      {/* The market square's paving */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[2.6, 2.6, 0.08, 8]} />
        <Mat color={C.stone} />
      </mesh>
      {[
        [-10, -1.5, 1],
        [-3.6, -9.6, 0.9],
        [-3.4, -7.6, 0.8],
        [9.6, -2.4, 1],
        [2.4, 9.6, 0.9],
        [-10.2, 8, 0.8],
        [10.4, -5, 0.8],
        [-2.8, -5.2, 0.7],
        [0.6, 8.6, 0.9],
        [5.8, 9, 0.8],
      ].map(([x, z, s], i) => (
        <Tree key={i} p={[x, z]} s={s} />
      ))}
    </group>
  );
}

function RoadMesh({ road, scale = 1 }: { road: Road; scale?: number }) {
  const geo = useMemo(() => ribbon(road.curve, road.width * scale, 0.03), [road, scale]);
  const edge = useMemo(() => ribbon(road.curve, road.width * scale + 0.3, 0.015), [road, scale]);
  return (
    <group>
      <mesh geometry={edge} receiveShadow>
        <Mat color={C.roadEdge} />
      </mesh>
      <mesh geometry={geo} receiveShadow>
        <Mat color={C.road} />
      </mesh>
    </group>
  );
}

/** A flat strip along a curve, `width` wide, at height y. */
function ribbon(curve: THREE.Curve<THREE.Vector3>, width: number, y: number) {
  const n = 28;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    const nx = -t.z;
    const nz = t.x;
    const len = Math.hypot(nx, nz) || 1;
    const hw = width / 2;
    pos.push(p.x + (nx / len) * hw, y, p.z + (nz / len) * hw, p.x - (nx / len) * hw, y, p.z - (nz / len) * hw);
    if (i < n) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---- Landmarks --------------------------------------------------------------

function CentralBank() {
  const [x, , z] = SPOT.bank.toArray();
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0.25, 0]} s={[4, 0.5, 2.8]} color={C.stone} />
      <Box p={[0, 1.35, -0.3]} s={[3.4, 1.7, 2]} color={C.cream} />
      {[-1.3, -0.45, 0.45, 1.3].map((cx) => (
        <mesh key={cx} position={[cx, 1.35, 0.85]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 1.7, 8]} />
          <Mat color={C.cream} />
        </mesh>
      ))}
      <Box p={[0, 2.3, 0.1]} s={[3.8, 0.25, 2.6]} color={C.stone} />
      <Gable p={[0, 2.42, 0.95]} s={[3.8, 1.2, 0.5]} color={C.stone} />
      <mesh position={[0, 2.45, -0.3]} castShadow>
        <sphereGeometry args={[1.05, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Mat color={C.dome} />
      </mesh>
      <mesh position={[0, 3.6, -0.3]}>
        <cylinderGeometry args={[0.32, 0.32, 0.1, 12]} />
        <Mat color={C.gold} />
      </mesh>
    </group>
  );
}

/** Two commercial banks just south of the central bank, where credit sets off. */
function Banks() {
  return (
    <group position={[-7.4, 0, -1.6]}>
      <group position={[-1.3, 0, 0]}>
        <Box p={[0, 0.7, 0]} s={[1.3, 1.4, 1.2]} color={C.cream} />
        <Box p={[0, 1.48, 0]} s={[1.45, 0.16, 1.35]} color={C.dome} />
        <Box p={[0, 0.45, 0.61]} s={[0.4, 0.7, 0.04]} color={C.glass} />
      </group>
      <group position={[1.3, 0, 0.1]}>
        <Box p={[0, 0.9, 0]} s={[1.2, 1.8, 1.2]} color={C.cream} />
        <Box p={[0, 1.88, 0]} s={[1.35, 0.16, 1.35]} color={C.dome} />
        <Box p={[0, 0.45, 0.61]} s={[0.4, 0.7, 0.04]} color={C.glass} />
      </group>
    </group>
  );
}

function TownHall({ reduced }: { reduced: boolean }) {
  const flag = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!flag.current || reduced) return;
    // Hinged at the pole: the group sits on the pole, the cloth hangs off it.
    flag.current.rotation.y = Math.sin(clock.elapsedTime * 1.6) * 0.18;
  });
  const [x, , z] = SPOT.hall.toArray();
  return (
    <group position={[x, 0, z]}>
      <Box p={[0, 0.2, 0]} s={[4.4, 0.4, 2.8]} color={C.stone} />
      <Box p={[0, 1.2, -0.2]} s={[4, 1.6, 2.1]} color={C.cream} />
      {[-1.5, -0.75, 0, 0.75, 1.5].map((cx) => (
        <mesh key={cx} position={[cx, 1.2, 0.95]} castShadow>
          <cylinderGeometry args={[0.13, 0.13, 1.6, 8]} />
          <Mat color={C.cream} />
        </mesh>
      ))}
      <Box p={[0, 2.08, -0.2]} s={[4.3, 0.18, 2.5]} color={C.roof} />
      <Gable p={[0, 2.16, 0.85]} s={[4.3, 1.1, 0.4]} color={C.roof} />
      {/* Clock tower */}
      <Box p={[0, 2.85, -0.55]} s={[0.9, 1.4, 0.9]} color={C.cream} />
      <mesh position={[0, 3.1, -0.08]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.28, 0.28, 0.05, 14]} />
        <Mat color="#ffffff" />
      </mesh>
      <mesh position={[0, 3.95, -0.55]} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[0.72, 0.8, 4]} />
        <Mat color={C.roofDark} />
      </mesh>
      {/* Flag pole and flag */}
      <mesh position={[1.9, 1.6, 1.4]}>
        <cylinderGeometry args={[0.04, 0.04, 3.2, 6]} />
        <Mat color="#8a8a96" />
      </mesh>
      <group ref={flag} position={[1.9, 2.85, 1.4]}>
        <mesh position={[0.4, 0, 0]} castShadow>
          <boxGeometry args={[0.8, 0.5, 0.03]} />
          <Mat color={C.hull} />
        </mesh>
      </group>
    </group>
  );
}

/** The market square: stalls round a price column whose fill is inflation. */
function Market({ infl, target, tone, colors, reduced }: { infl: number; target: number; tone: string; colors: Colors; reduced: boolean }) {
  const fill = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const H = 3.2;
  const level = (x: number) => Math.min(1, Math.max(0.03, x / 16)) * H;
  const shown = useRef(level(infl));
  const toneColor = useMemo(() => new THREE.Color(tone === "bad" ? colors.bad : tone === "good" ? colors.good : tone === "warn" ? colors.warn : colors.ink), [tone, colors]);
  useFrame((_, dt) => {
    const want = level(infl);
    shown.current += (want - shown.current) * (reduced ? 1 : Math.min(1, dt * 2));
    if (fill.current) {
      fill.current.scale.y = shown.current;
      fill.current.position.y = 0.5 + shown.current / 2;
    }
    if (mat.current) mat.current.color.lerp(toneColor, reduced ? 1 : Math.min(1, dt * 3));
  });
  const stalls: [number, number, number][] = [
    [-1.7, -1.2, 0.5],
    [1.8, -0.9, -0.4],
    [-1.5, 1.6, 2.6],
    [1.6, 1.6, -2.4],
  ];
  return (
    <group position={SPOT.market}>
      {stalls.map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]} rotation-y={r}>
          <Box p={[0, 0.35, 0]} s={[1, 0.7, 0.6]} color={C.wood} />
          <mesh position={[0, 1.15, 0]} castShadow>
            <coneGeometry args={[0.85, 0.5, 4]} />
            <Mat color={C.canopy[i % 3]} />
          </mesh>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.6, 5]} />
            <Mat color={C.trunk} />
          </mesh>
        </group>
      ))}
      {/* Price column: a glass tube, a fill that rises with inflation, a ring at the target. */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.7, 0.85, 0.5, 8]} />
        <Mat color={C.stone} />
      </mesh>
      <mesh position={[0, 0.5 + H / 2, 0]}>
        <cylinderGeometry args={[0.42, 0.42, H, 12, 1, true]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.45} roughness={0.2} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={fill} position={[0, 0.5 + level(infl) / 2, 0]} scale={[1, level(infl), 1]}>
        <cylinderGeometry args={[0.32, 0.32, 1, 12]} />
        <meshStandardMaterial ref={mat} color={toneColor} roughness={0.6} flatShading />
      </mesh>
      <mesh position={[0, 0.5 + level(target), 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.5, 0.06, 6, 16]} />
        <Mat color={C.hull} />
      </mesh>
      <mesh position={[0, 0.5 + H + 0.12, 0]}>
        <sphereGeometry args={[0.45, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Mat color={C.stone} />
      </mesh>
    </group>
  );
}

/** Houses and a factory; the chimney's smoke runs with output. */
function Town({ output, reduced }: { output: number; reduced: boolean }) {
  const puffs = useRef<(THREE.Mesh | null)[]>([]);
  const N = 4;
  const k = useRef(output);
  useFrame(({ clock }, dt) => {
    k.current += (output - k.current) * Math.min(1, dt * 2);
    const t = reduced ? 0 : clock.elapsedTime;
    const size = 0.35 + 0.35 * Math.min(1.6, Math.max(0.2, k.current));
    for (let i = 0; i < N; i++) {
      const m = puffs.current[i];
      if (!m) continue;
      const u = (t * 0.16 + i / N) % 1;
      // Puffs rise, drift downwind and swell; they fade in at the chimney and out at the top.
      m.position.set(0.9 * u + 0.12 * Math.sin(u * 6 + i), 3.25 + u * 2.6, -0.5 * u);
      m.scale.setScalar(size * (0.35 + 0.9 * u) * fadeEnds(u, 0.18));
    }
  });
  const houses: [number, number, number, number][] = [
    [-8.6, 3.6, 0.3, 1],
    [-8.4, 5.9, -0.2, 0.9],
    [-6.6, 7.3, 0.2, 1.05],
    [-4.4, 7.1, -0.3, 0.9],
    [-6.4, 5.2, 0.1, 0.85],
  ];
  return (
    <group>
      {houses.map(([x, z, r, s], i) => (
        <group key={i} position={[x, 0, z]} rotation-y={r} scale={s}>
          <Box p={[0, 0.55, 0]} s={[1.3, 1.1, 1.1]} color={C.cream} />
          <Gable p={[0, 1.1, 0]} s={[1.5, 1.2, 1.25]} color={i % 2 ? C.roofDark : C.roof} />
          <Box p={[0.3, 0.55, 0.56]} s={[0.3, 0.3, 0.03]} color={C.glass} />
        </group>
      ))}
      {/* Factory */}
      <group position={[-3.6, 0, 5.3]}>
        <Box p={[0, 0.7, 0]} s={[2.4, 1.4, 1.6]} color={C.stone} />
        {[-0.8, 0, 0.8].map((x) => (
          <mesh key={x} position={[x, 1.4, 0]} rotation-y={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0, 0.55, 0.8, 3]} />
            <Mat color={C.roof} />
          </mesh>
        ))}
        <mesh position={[0.95, 1.9, -0.45]} castShadow>
          <cylinderGeometry args={[0.2, 0.26, 2.6, 8]} />
          <Mat color={C.roofDark} />
        </mesh>
        <group position={[0.95, 0, -0.45]}>
          {Array.from({ length: N }, (_, i) => (
            <mesh key={i} ref={(m) => void (puffs.current[i] = m)}>
              <icosahedronGeometry args={[0.5, 0]} />
              <Mat color={C.smoke} transparent opacity={0.92} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

function Port() {
  const [x, , z] = SPOT.port.toArray();
  return (
    <group>
      <group position={[x, 0, z]}>
        <Box p={[0, 0.7, -0.4]} s={[2.6, 1.4, 1.6]} color={C.cream} />
        <Gable p={[0, 1.4, -0.4]} s={[2.8, 1, 1.8]} color={C.roof} r={Math.PI / 2} />
        {/* Containers */}
        <Box p={[-0.6, 0.3, 1.2]} s={[1.1, 0.6, 0.55]} color={C.hull} />
        <Box p={[0.6, 0.3, 1.2]} s={[1.1, 0.6, 0.55]} color={C.crate} />
        <Box p={[0, 0.9, 1.2]} s={[1.1, 0.6, 0.55]} color={C.roof} />
      </group>
      {/* Pier out to sea */}
      <Box p={[12, -0.05, 5]} s={[4.4, 0.25, 1.4]} color={C.wood} />
      {[10.4, 11.9, 13.4].map((px) => (
        <mesh key={px} position={[px, -0.35, 5.6]}>
          <cylinderGeometry args={[0.1, 0.1, 0.6, 6]} />
          <Mat color={C.trunk} />
        </mesh>
      ))}
      {/* Crane */}
      <group position={[10.6, 0, 3.8]}>
        <Box p={[0, 1.4, 0]} s={[0.3, 2.8, 0.3]} color={C.gold} />
        <Box p={[0.6, 2.8, 0.4]} s={[2.4, 0.22, 0.22]} color={C.gold} r={-0.5} />
      </group>
    </group>
  );
}

/** Fields between the town and the market: the harvest. */
function Fields({ dry }: { dry: boolean }) {
  const rows: [number, number][] = [
    [-1.2, -8.4],
    [1.0, -8.7],
    [-0.1, -10.4],
  ];
  return (
    <group>
      {rows.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.04, z]} rotation-y={0.15} receiveShadow>
          <boxGeometry args={[1.9, 0.08, 1.6]} />
          <Mat color={dry ? C.fieldDry : i % 2 ? C.grassDark : C.field} />
        </mesh>
      ))}
    </group>
  );
}

// ---- Flows ------------------------------------------------------------------

const coinGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.12, 10);
const crateGeo = new THREE.BoxGeometry(0.42, 0.36, 0.42);

function LaneTokens({ lane, strength, reduced, oil }: { lane: Lane; strength: number; reduced: boolean; oil: boolean }) {
  const N = 7;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const s = useRef(strength);
  const vis = useRef<number[]>(Array.from({ length: N }, () => 1));
  const phase = useRef(0);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const color = lane.kind === "coin" ? C.gold : oil && lane.flow === "imports" ? "#3a3a48" : C.crate;
  useFrame(({ clock }, dt) => {
    const m = mesh.current;
    if (!m) return;
    s.current += (strength - s.current) * (reduced ? 1 : Math.min(1, dt * 1.5));
    const st = s.current;
    // Thicker flows run faster with bigger tokens and more of them.
    if (!reduced) phase.current += dt * (0.05 + 0.04 * st);
    const shown = Math.max(2, Math.min(N, Math.round(2 + 3.4 * st)));
    const size = 0.6 + 0.45 * Math.min(st, 1.8);
    for (let i = 0; i < N; i++) {
      vis.current[i] += ((i < shown ? 1 : 0) - vis.current[i]) * (reduced ? 1 : Math.min(1, dt * 2));
      let u = (phase.current + i / N) % 1;
      if (reduced) u = (i + 0.5) / N;
      const cu = lane.reverse ? 1 - u : u;
      lane.road.curve.getPointAt(cu, p);
      const t = lane.road.curve.getTangentAt(cu);
      const nx = -t.z;
      const nz = t.x;
      const len = Math.hypot(nx, nz) || 1;
      tmp.position.set(p.x + (nx / len) * lane.offset, 0.2 + (lane.kind === "coin" ? 0.06 * Math.sin(clock.elapsedTime * 5 + i) * (reduced ? 0 : 1) : 0.08), p.z + (nz / len) * lane.offset);
      tmp.rotation.set(0, Math.atan2(t.x, t.z), 0);
      tmp.scale.setScalar(size * fadeEnds(u, 0.12) * vis.current[i] + 1e-4);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[lane.kind === "coin" ? coinGeo : crateGeo, undefined, N]} castShadow frustumCulled={false}>
      <Mat color={color} metalness={lane.kind === "coin" ? 0.2 : 0} />
    </instancedMesh>
  );
}

/** Capital ships on the sea lane: leaving (outflows) or arriving (inflows). */
function CapitalShips({ strength, inbound, reduced }: { strength: number; inbound: boolean; reduced: boolean }) {
  const N = 3;
  const refs = useRef<(THREE.Group | null)[]>([]);
  const p = useMemo(() => new THREE.Vector3(), []);
  const phase = useRef(0);
  useFrame((_, dt) => {
    if (!reduced) phase.current += dt * (0.025 + 0.02 * Math.min(2, strength));
    for (let i = 0; i < N; i++) {
      const g = refs.current[i];
      if (!g) continue;
      const u = reduced ? (i + 0.5) / N : (phase.current + i / N) % 1;
      const cu = inbound ? 1 - u : u;
      SEA.capital.getPointAt(cu, p);
      const t = SEA.capital.getTangentAt(cu);
      // Leave the pier small, then sink over the horizon at the far end: no popping.
      const near = ease(clamp01(cu / 0.08));
      const far = ease(clamp01((1 - cu) / 0.25));
      g.position.set(p.x, -0.45 - (1 - far) * 0.8, p.z);
      g.rotation.y = Math.atan2(t.x, t.z) + (inbound ? Math.PI : 0);
      g.scale.setScalar((0.55 + 0.25 * Math.min(2, strength)) * near * far + 1e-4);
    }
  });
  return (
    <group>
      {Array.from({ length: N }, (_, i) => (
        <group key={i} ref={(g) => void (refs.current[i] = g)}>
          <Ship cargo={C.gold} />
        </group>
      ))}
    </group>
  );
}

function Ship({ cargo, tanker = false }: { cargo: string; tanker?: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[1.1, 0.6, tanker ? 4 : 2.6]} />
        <Mat color={C.hull} />
      </mesh>
      <mesh position={[0, 0.35, tanker ? 2.1 : 1.45]} rotation-y={Math.PI / 4}>
        <boxGeometry args={[0.78, 0.6, 0.78]} />
        <Mat color={C.hull} />
      </mesh>
      <Box p={[0, 0.95, tanker ? -1.5 : -0.9]} s={[0.9, 0.6, 0.6]} color={C.cream} />
      {tanker ? (
        [-0.6, 0.3, 1.2].map((z) => (
          <mesh key={z} position={[0, 0.85, z]} rotation-z={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.38, 0.38, 0.9, 10]} />
            <Mat color={cargo} />
          </mesh>
        ))
      ) : (
        <>
          <Box p={[0, 0.85, 0.1]} s={[0.8, 0.4, 0.6]} color={cargo} />
          <Box p={[0, 0.85, 0.8]} s={[0.8, 0.4, 0.6]} color={cargo} />
        </>
      )}
    </group>
  );
}

/** An oil tanker sails in once and moors at the pier; it stays while the shock lasts. */
function Tanker({ reduced, colors }: { reduced: boolean; colors: Colors }) {
  const g = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  const p = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    if (!g.current) return;
    if (start.current === null) start.current = clock.elapsedTime;
    const u = reduced ? 1 : ease(clamp01((clock.elapsedTime - start.current) / 7));
    SEA.tanker.getPointAt(u, p);
    const t = SEA.tanker.getTangentAt(Math.min(u, 0.999));
    g.current.position.set(p.x, -0.5 + (reduced ? 0 : 0.04 * Math.sin(clock.elapsedTime * 1.3)), p.z);
    g.current.rotation.y = Math.atan2(t.x, t.z);
    g.current.scale.setScalar(ease(clamp01(u / 0.2)) + 1e-4);
  });
  return (
    <group ref={g}>
      <Ship cargo={colors.bad} tanker />
    </group>
  );
}

/** A rain cloud hovering over a place (the harvest, or the town in a storm). */
function RainCloud({ at, reduced, dark = false }: { at: THREE.Vector3; reduced: boolean; dark?: boolean }) {
  const cloud = useRef<THREE.Group>(null);
  const drops = useRef<THREE.InstancedMesh>(null);
  const N = 24;
  const seeds = useMemo(() => Array.from({ length: N }, (_, i) => [((i * 37) % 23) / 23 - 0.5, ((i * 53) % 19) / 19 - 0.5, (i * 0.618) % 1] as const), []);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  const appear = useRef(reduced ? 1 : 0);
  useFrame(({ clock }, dt) => {
    const t = reduced ? 0 : clock.elapsedTime;
    appear.current = reduced ? 1 : Math.min(1, appear.current + dt * 0.8);
    const a = ease(appear.current);
    if (cloud.current) {
      cloud.current.position.set(at.x + Math.sin(t * 0.4) * 0.3, at.y + 4.2 + Math.sin(t * 0.9) * 0.08, at.z);
      cloud.current.scale.setScalar(0.2 + 0.8 * a);
    }
    const m = drops.current;
    if (!m) return;
    for (let i = 0; i < N; i++) {
      const [dx, dz, ph] = seeds[i];
      const u = (t * 1.1 + ph) % 1;
      tmp.position.set(at.x + dx * 3 + Math.sin(t * 0.4) * 0.3, at.y + 3.7 - u * 3.6, at.z + dz * 2);
      tmp.scale.set(1, 1, 1).multiplyScalar(a * fadeEnds(u, 0.1) + 1e-4);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  const puffs: [number, number, number, number][] = [
    [0, 0, 0, 1.1],
    [-1.1, -0.2, 0.2, 0.85],
    [1.1, -0.15, -0.1, 0.9],
    [0.4, 0.45, -0.3, 0.8],
    [-0.5, 0.35, -0.4, 0.7],
  ];
  return (
    <group>
      <group ref={cloud}>
        {puffs.map(([x, y, z, s], i) => (
          <mesh key={i} position={[x, y, z]} scale={s}>
            <icosahedronGeometry args={[0.9, 1]} />
            <Mat color={dark ? "#7c8494" : C.cloud} />
          </mesh>
        ))}
      </group>
      <instancedMesh ref={drops} args={[undefined, undefined, N]} frustumCulled={false}>
        <boxGeometry args={[0.05, 0.4, 0.05]} />
        <meshBasicMaterial color={C.rain} />
      </instancedMesh>
    </group>
  );
}

// ---- The lever's pulse ------------------------------------------------------

type Leg = { curve: THREE.Curve<THREE.Vector3> | null; reverse: boolean; at: THREE.Vector3; dur: number; start: number };

const LEAD = 0.5; // grow at the start node
const HOLD = 1.8; // rest at the last stage
const GAP = 1.2; // pause before the next run

/** The run's timeline: one leg per stage; travel time grows with the stage's lag. */
export function pulseTimeline(pulse: Pulse): { legs: Leg[]; total: number } {
  const legs: Leg[] = [];
  let t = LEAD;
  pulse.stages.forEach((s, i) => {
    if (i === 0) {
      legs.push({ curve: null, reverse: false, at: NODE_AT[s.node], dur: 0, start: 0 });
      return;
    }
    const prev = pulse.stages[i - 1];
    const leg = prev.node === s.node ? null : legTo(prev.node, s.node);
    const dur = leg ? 0.9 + 1.3 * Math.max(0, s.lag - prev.lag) : 0.5;
    legs.push({ curve: leg?.curve ?? null, reverse: leg?.reverse ?? false, at: NODE_AT[s.node], dur, start: t });
    t += dur;
  });
  return { legs, total: t + HOLD + GAP };
}

function PulseRunner({ pulse, colors, reduced, onStage }: { pulse: Pulse; colors: Colors; reduced: boolean; onStage: (reached: number) => void }) {
  const { legs, total } = useMemo(() => pulseTimeline(pulse), [pulse]);
  const ball = useRef<THREE.Group>(null);
  const trail = useRef<(THREE.Mesh | null)[]>([]);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const reached = useRef(-1);
  const t0 = useRef<number | null>(null);
  const p = useMemo(() => new THREE.Vector3(), []);
  const color = useMemo(() => new THREE.Color(colors.pulse), [colors.pulse]);
  const route = useMemo(() => legs.filter((l) => l.curve).map((l) => ribbon(l.curve!, 0.28, 0.06)), [legs]);

  // Restart the run whenever the lever moves.
  useEffect(() => {
    t0.current = null;
  }, [pulse]);

  const where = (leg: Leg, u: number, out: THREE.Vector3) => {
    if (!leg.curve) return out.copy(leg.at);
    return leg.curve.getPointAt(leg.reverse ? 1 - u : u, out);
  };

  useFrame(({ clock }) => {
    if (t0.current === null) t0.current = clock.elapsedTime;
    const t = reduced ? total - GAP - 0.01 : (clock.elapsedTime - t0.current) % total;
    // Which stage the pulse has reached.
    let idx = 0;
    for (let i = 1; i < legs.length; i++) if (t >= legs[i].start + legs[i].dur) idx = i;
    const last = legs.length - 1;
    const leg = legs.find((l, i) => i > 0 && t >= l.start && t < l.start + l.dur);
    if (leg) where(leg, ease((t - leg.start) / leg.dur), p);
    else p.copy(legs[idx].at);
    // Grow in at the start, shrink out after the hold: the loop has no seam.
    const grow = ease(clamp01(t / LEAD));
    const fade = 1 - ease(clamp01((t - (legs[last].start + legs[last].dur + HOLD)) / 0.5));
    const sc = grow * fade;
    if (ball.current) {
      ball.current.position.set(p.x, 0.55, p.z);
      ball.current.scale.setScalar(sc + 1e-4);
    }
    for (let k = 0; k < trail.current.length; k++) {
      const m = trail.current[k];
      if (!m) continue;
      const lag = (k + 1) * 0.07;
      const tk = t - lag;
      const lk = legs.find((l, i) => i > 0 && tk >= l.start && tk < l.start + l.dur);
      const moving = !!lk;
      if (lk) where(lk, ease((tk - lk.start) / lk.dur), p);
      m.position.set(p.x, 0.5, p.z);
      m.scale.setScalar((moving ? (1 - k * 0.22) * sc : 0) + 1e-4);
    }
    for (let i = 0; i < legs.length; i++) {
      const r = rings.current[i];
      if (!r) continue;
      const arrive = i === 0 ? 0 : legs[i].start + legs[i].dur;
      const a = reduced ? 1 : (t - arrive) / 1.1;
      const on = a >= 0 && a <= 1;
      r.position.set(legs[i].at.x, 0.12, legs[i].at.z);
      r.scale.setScalar(on ? 0.6 + 1.4 * ease(a) : 1e-4);
      (r.material as THREE.MeshBasicMaterial).opacity = reduced ? 0.6 : on ? 0.8 * (1 - a) : 0;
    }
    if (idx !== reached.current) {
      reached.current = idx;
      onStage(idx);
    }
  });

  return (
    <group>
      {route.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color={color} transparent opacity={0.45} depthWrite={false} />
        </mesh>
      ))}
      <group ref={ball}>
        <mesh>
          <sphereGeometry args={[0.42, 16, 10]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.4} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.7, 16, 10]} />
          <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} />
        </mesh>
      </group>
      {[0, 1, 2].map((k) => (
        <mesh key={k} ref={(m) => void (trail.current[k] = m)}>
          <sphereGeometry args={[0.26, 10, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
      {legs.map((_, i) => (
        <mesh key={i} ref={(m) => void (rings.current[i] = m)} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.7, 0.95, 28]} />
          <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ---- Labels -----------------------------------------------------------------

const TONE_WORD: Record<string, string> = { bad: "bad", good: "good", warn: "watch", neutral: "" };

/** Where the tags are drawn: a layer the scene owns, over the canvas. */
export const tagLayer: { current: HTMLDivElement | null } = { current: null };

function Tag({ at, below = false, children, className = "" }: { at: THREE.Vector3; below?: boolean; children: ReactNode; className?: string }) {
  return (
    <Html position={at} zIndexRange={[4, 0]} pointerEvents="none" wrapperClass="flow-html" portal={tagLayer as React.RefObject<HTMLElement>}>
      <div className={`flow-tag ${below ? "is-below" : ""} ${className}`}>{children}</div>
    </Html>
  );
}

export type StageLine = { node: StageNode; text: string; tone: string; index: number };

const NODE_MARK: Record<StageNode, LandmarkId> = { bank: "bank", banks: "bank", town: "town", market: "market", hall: "hall", port: "port" };

function LandmarkTag({ l, lines, register }: { l: LandmarkState; lines: StageLine[]; register: (i: number, el: HTMLElement | null) => void }) {
  const arrow = l.dir === "up" ? "▲" : l.dir === "down" ? "▼" : "•";
  return (
    <Tag at={LABEL_AT[l.id]} below={LABEL_BELOW[l.id]} className={`is-${l.id}`}>
      <span className="flow-tag-title">{l.title}</span>
      <span className="flow-tag-short">
        {l.short}
      </span>
      <span className="flow-tag-value">
        <b>{l.value}</b> {l.what}
      </span>
      <span className={`flow-tag-state is-${l.tone}`}>
        <span aria-hidden="true">{arrow}</span> {l.move}
        {l.why ? <span className="flow-tag-why"> — {l.why}</span> : null}
        {TONE_WORD[l.tone] ? <span className="flow-sr"> ({TONE_WORD[l.tone]})</span> : null}
      </span>
      {lines.map((s) => (
        <span key={s.index} ref={(el) => register(s.index, el)} className={`flow-tag-lever is-${s.tone}`}>
          <i aria-hidden="true" />
          {s.text}
        </span>
      ))}
    </Tag>
  );
}

// ---- Camera -----------------------------------------------------------------

function Rig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  useLayoutEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // Fit the island's width (about 30 units with labels) and its depth.
    const d = Math.max(16.5 / (tan * aspect), 13.8 / tan);
    const dir = new THREE.Vector3(0.12, 1, 0.92).normalize();
    const target = new THREE.Vector3(1, 0, -1.6);
    camera.position.copy(target).addScaledVector(dir, d);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

// ---- The world --------------------------------------------------------------

export type WorldProps = {
  marks: LandmarkState[];
  flows: Flows;
  pulse: Pulse | null;
  lines: StageLine[];
  shocks: ShockProp[];
  infl: number;
  target: number;
  output: number;
  colors: Colors;
  reduced: boolean;
  register: (i: number, el: HTMLElement | null) => void;
  onStage: (reached: number) => void;
};

/** Order of a shock among the ones drawn at sea. */
const seaIndex = (shocks: ShockProp[], i: number) => shocks.slice(0, i).filter((s) => s.prop !== "rain" && s.prop !== "storm").length;

export default function World({ marks, flows, pulse, lines, shocks, infl, target, output, colors, reduced, register, onStage }: WorldProps) {
  const has = (p: ShockProp["prop"]) => shocks.some((s) => s.prop === p);
  const oil = has("tanker");
  const priceTone = marks.find((m) => m.id === "market")?.tone ?? "neutral";
  const roadScale = (ids: (keyof Flows)[]) => 0.8 + 0.2 * Math.min(1.8, ids.reduce((a, k) => a + (flows[k] as number), 0) / ids.length);
  /** Where the weather-like shocks hover. */
  const shockAt = { rain: v(-0.1, -9.2), storm: v(-6.4, 5.4) };
  return (
    <>
      <Rig />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={["#f3f7fb", "#d8c7a0", 0.55]} />
      <directionalLight position={[14, 26, 12]} intensity={1.6} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-bias={-0.0008} />
      <Ground />
      <RoadMesh road={ROADS.cbBanks} />
      <RoadMesh road={ROADS.credit} scale={roadScale(["credit"])} />
      <RoadMesh road={ROADS.spending} scale={roadScale(["spending"])} />
      <RoadMesh road={ROADS.gov} scale={roadScale(["public", "taxes"])} />
      <RoadMesh road={ROADS.trade} scale={roadScale(["imports", "exports"])} />
      <CentralBank />
      <Banks />
      <TownHall reduced={reduced} />
      <Market infl={infl} target={target} tone={priceTone} colors={colors} reduced={reduced} />
      <Town output={output} reduced={reduced} />
      <Port />
      <Fields dry={has("rain")} />
      {LANES.map((lane) => (
        <LaneTokens key={lane.flow} lane={lane} strength={flows[lane.flow] as number} reduced={reduced} oil={oil} />
      ))}
      <CapitalShips strength={flows.capital} inbound={has("ships-in") || (flows.capitalIn && !has("ships-out"))} reduced={reduced} />
      {oil ? <Tanker reduced={reduced} colors={colors} /> : null}
      {has("rain") ? <RainCloud at={shockAt.rain} reduced={reduced} /> : null}
      {has("storm") ? <RainCloud at={shockAt.storm} reduced={reduced} dark /> : null}
      {has("slump") ? <RainCloud at={v(13.5, 1.5, -0.4)} reduced={reduced} dark /> : null}
      {pulse ? <PulseRunner pulse={pulse} colors={colors} reduced={reduced} onStage={onStage} /> : null}

      {marks.map((l) => (
        <LandmarkTag key={l.id} l={l} lines={lines.filter((s) => NODE_MARK[s.node] === l.id)} register={register} />
      ))}
      {ROAD_LABELS.map((r) => (
        <Tag key={r.text} at={r.at} className="is-road">
          {r.text}
        </Tag>
      ))}
      {shocks.map((s, i) =>
        s.prop === "rain" || s.prop === "storm" ? (
          <Tag key={s.kind} at={shockAt[s.prop].clone().setY(6.4)} className={`is-shock is-${s.tone}`}>
            <b>{s.name}</b>
            <span>{s.effect}</span>
          </Tag>
        ) : (
          // Shocks at sea hang their tag off the right edge of the island, pointing left.
          <Tag key={s.kind} at={v(16.4, -4.5 + 4.2 * seaIndex(shocks, i), 1)} className={`is-shock is-left is-${s.tone}`}>
            <b>{s.name}</b>
            <span>{s.effect}</span>
          </Tag>
        ),
      )}
    </>
  );
}
