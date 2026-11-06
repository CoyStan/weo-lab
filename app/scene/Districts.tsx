"use client";

import { P, SC } from "./palette";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ConstraintVar } from "../model/types";
import * as THREE from "three";
import { fmt } from "../components/format";
import { getPreset, WEO_REFERENCE } from "../model/presets";
import { selectCurrent, selectPolicyNow, useLab, type FocusKey } from "../store";
import Label, { PLACE, type IconName } from "./Label";
import { HEX, TOP } from "./hexmap";
import { WORLD } from "./world";
import { clamp, useSmooth } from "./useSmooth";
import { commitInstances, gableRoof, mixHex, placeInstance, primeInstances, prismGeometry, scatterOrder, TMP_COLOR, useGeometry } from "./shapes";

const NAVY = SC.accent;
const TEAL = SC.good;
const CORAL = SC.bad;
const AMBER = SC.warn;
const SKYBLUE = SC.cool;

const site = (k: keyof typeof WORLD.sites): [number, number, number] => [WORLD.sites[k].x, TOP, WORLD.sites[k].z];

/**
 * Each district stands on its own hex; the tanker anchors offshore, in open
 * water north-east of the island where the home view is widest, so its hull
 * stays inside the canvas at 1440x900 and on phones (checked against the hex map).
 */
export const DISTRICT_POS: Partial<Record<FocusKey, [number, number, number]>> = {
  debt: site("debt"),
  rate: site("rate"),
  infl: site("infl"),
  growth: site("growth"),
  ca: site("ca"),
  reserves: site("reserves"),
  unemp: site("unemp"),
  cred: site("cred"),
  oil: [12.2, 0, -12.2],
};

/** District type: colour slot in the palette, emblem, and scale that fits the model on one hex. */
const DISTRICT_STYLE: Partial<Record<FocusKey, { slot: number; icon: IconName; scale: number }>> = {
  debt: { slot: 0, icon: "scroll", scale: 0.82 },
  rate: { slot: 1, icon: "bank", scale: 0.6 },
  infl: { slot: 2, icon: "gauge", scale: 0.9 },
  growth: { slot: 3, icon: "factory", scale: 0.56 },
  ca: { slot: 4, icon: "anchor", scale: 0.68 },
  reserves: { slot: 5, icon: "coins", scale: 0.72 },
  unemp: { slot: 6, icon: "house", scale: 0.68 },
  cred: { slot: 7, icon: "beacon", scale: 0.9 },
  oil: { slot: 8, icon: "drop", scale: 1 },
};

const GROUND = TOP;
const SCRATCH = new THREE.Color();

/** Which constraint variables light up which district's pad when breached. */
const BREACH_MAP: Partial<Record<FocusKey, ConstraintVar[]>> = {
  debt: ["debt", "ob", "pb", "gfn", "spread"],
  infl: ["infl"],
  growth: ["growth"],
  ca: ["ca"],
  reserves: ["reserves"],
  unemp: ["unemp"],
};

/** Constraint variables breached at the current clock quarter. */
function useBreachedNow(): Set<ConstraintVar> {
  const breaches = useLab((s) => s.result.breaches);
  const constraints = useLab((s) => s.config.constraints);
  const clock = useLab((s) => s.clock);
  return useMemo(() => {
    const set = new Set<ConstraintVar>();
    for (const b of breaches) {
      if (b.quarter !== clock) continue;
      const c = constraints.find((x) => x.id === b.constraintId);
      if (c) set.add(c.variable);
    }
    return set;
  }, [breaches, constraints, clock]);
}

/** District hex: paved floor tinted with the district colour, and a border that pulses on a breach. */
function HexBadge({ color, active, breached, reducedMotion, scale }: { color: string; active: boolean; breached: boolean; reducedMotion: boolean; scale: number }) {
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  const floor = useMemo(() => "#" + new THREE.Color(P.plaza).lerp(new THREE.Color(color), 0.18).getHexString(), [color]);
  useFrame((state) => {
    const m = ring.current;
    if (!m) return;
    const pulse = breached && !reducedMotion ? 0.6 + 0.4 * Math.sin(state.clock.elapsedTime * 4) : 1;
    m.opacity = breached ? pulse : active ? 1 : 0.85;
  });
  // The badge lives inside the district's scaled group; undo the scale so it matches the tile.
  const k = 1 / scale;
  return (
    <group scale={k}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.012} receiveShadow>
        <circleGeometry args={[HEX * 0.9, 6, Math.PI / 2]} />
        <meshStandardMaterial color={floor} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
        <ringGeometry args={[HEX * (breached || active ? 0.8 : 0.84), HEX * 0.93, 6, 1, Math.PI / 2]} />
        <meshBasicMaterial ref={ring} color={breached ? P.bad : color} transparent opacity={0.85} depthWrite={false} />
      </mesh>
    </group>
  );
}

/**
 * Below this canvas width (phones) the island is too small for banners over the
 * buildings near the town: the capital's banner and a pending decision's banner
 * pin to the canvas corners instead, so the debt tower stays in view.
 */
const NARROW_CANVAS = 560;
const useNarrowCanvas = () => useThree((s) => s.size.width < NARROW_CANVAS);

function District({ focusKey, position, labelY, labelX = 0, pendingLabel, dockPending = false, dockValue, title, value, next, delta, bad, tilt, children, reducedMotion }: {
  focusKey: FocusKey;
  position: [number, number, number];
  labelY: number;
  labelX?: number;
  /** [y, x] of the banner while a decision is pending and the district is not focused. */
  pendingLabel?: [number, number];
  /** On a narrow canvas, pin the pending banner to the canvas corner instead of the building. */
  dockPending?: boolean;
  /** A shorter reading for the docked banner, so it stays clear of the buildings below it. */
  dockValue?: string;
  title: string;
  value: string;
  next?: string;
  /** The lever's move, "+2.00", flashed on the tag for a moment when it changes. */
  delta?: string;
  bad?: boolean;
  tilt?: number;
  children: ReactNode;
  reducedMotion: boolean;
  pad?: number;
}) {
  const style = DISTRICT_STYLE[focusKey] ?? { slot: 0, icon: "scroll" as IconName, scale: 1 };
  const color = P.districts[style.slot % P.districts.length];
  const focus = useLab((s) => s.focus);
  const setFocus = useLab((s) => s.setFocus);
  const labels = useLab((s) => s.labels);
  const spotlit = useLab((s) => s.spotlight.includes(focusKey));
  const breachedNow = useBreachedNow();
  const breached = (BREACH_MAP[focusKey] ?? []).some((v) => breachedNow.has(v));
  const goalStatus = useLab((s) => s.districtStatus[focusKey]);
  const cue = useLab((s) => s.sceneCue[focusKey]);
  const shocked = useLab((s) => s.shockFocus === focusKey);
  const [hover, setHover] = useState(false);
  const group = useRef<THREE.Group>(null);
  const focused = focus === focusKey;
  const active = hover || focused;
  // In the game, the goals' figures sit in a ruled strip on the scene's top edge (see Play),
  // so a tag stays on the island only where something is happening: a pending decision, a
  // district in trouble, or the one under the pointer. Free play keeps its spotlight tags.
  const inGame = labels === "focus";
  const showLabel = labels === "all" || active || breached || (spotlit && !inGame) || Boolean(goalStatus) || (inGame && (Boolean(cue) || shocked));
  const narrow = useNarrowCanvas();
  const dock = next && dockPending && narrow ? "top-right" : undefined;
  // A pending banner can ride somewhere else so it clears its neighbours; once the camera
  // flies in to the district it comes back down by the building, or it would leave the frame.
  const [ly, lx] = next && pendingLabel && !focused ? pendingLabel : [labelY, labelX];
  // Value pills sit outward from the island's centre, so they don't pile up over the town;
  // a pending decision keeps its banner right by its building.
  const out = Math.hypot(position[0], position[2]) || 1;
  const push = next || active || focusKey === "oil" ? 0 : 2.6 / style.scale;
  const labelPos: [number, number, number] = [lx + (position[0] / out) * push, ly, (position[2] / out) * push];

  useEffect(() => {
    if (!hover) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover]);

  const ring = useRef<THREE.Mesh>(null);
  // When the quarter plays and this district's number changes, its ground flashes once:
  // green if things are fine, red if the district is in trouble.
  const flash = useRef<THREE.Mesh>(null);
  const lastValue = useRef(value);
  const flashAt = useRef<number | null>(null);
  const flashQueued = useRef(false);
  useEffect(() => {
    if (lastValue.current !== value && !reducedMotion) flashQueued.current = true;
    lastValue.current = value;
  }, [value, reducedMotion]);
  useFrame(({ clock }, dt) => {
    if (flashQueued.current) {
      flashQueued.current = false;
      flashAt.current = clock.elapsedTime;
    }
    const f = flash.current;
    if (f) {
      const age = flashAt.current === null ? 99 : clock.elapsedTime - flashAt.current;
      const p = Math.min(1, age / 1.2);
      f.visible = p < 1;
      f.scale.setScalar(1 + p * 1.2);
      (f.material as THREE.MeshBasicMaterial).opacity = 0.65 * (1 - p);
    }
    const g = group.current;
    if (!g) return;
    // A decision waiting to play out makes its building breathe and send out a ring; the
    // district a news card points at breathes harder.
    const amp = shocked ? 0.1 : next ? 0.035 : 0;
    const pulse = amp && !reducedMotion ? amp * (0.5 + 0.5 * Math.sin(clock.elapsedTime * (shocked ? 3 : 4))) : 0;
    const target = (active ? 1.06 : 1) + pulse;
    const k = reducedMotion ? 1 : Math.min(1, dt * 8);
    const s = g.scale.x + (target - g.scale.x) * k;
    g.scale.setScalar(s);
    const r = ring.current;
    if (r) {
      const phase = reducedMotion ? 0.5 : (clock.elapsedTime * 0.7) % 1;
      r.scale.setScalar(1 + phase * 1.4);
      (r.material as THREE.MeshBasicMaterial).opacity = next || shocked ? (shocked ? 0.85 : 0.55) * (1 - phase) : 0;
    }
  });

  return (
    <group position={position} scale={style.scale}>
      {focusKey !== "oil" ? <HexBadge color={color} active={active} breached={breached} reducedMotion={reducedMotion} scale={style.scale} /> : null}
      <group
        ref={group}
        onClick={(e) => {
          e.stopPropagation();
          setFocus(focus === focusKey ? null : focusKey);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
      >
        {children}
      </group>
      <mesh ref={flash} rotation-x={-Math.PI / 2} position-y={0.3} visible={false}>
        <circleGeometry args={[2.3, 48]} />
        <meshBasicMaterial color={bad || breached ? "#d9534f" : "#3f9a5f"} transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.35} visible={Boolean(next) || shocked}>
        <ringGeometry args={[2.1, 2.45, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
      </mesh>
      <Label position={labelPos} title={breached ? `${title} · constraint breached` : title} value={dock && dockValue ? dockValue : value} next={next} delta={delta} bad={bad || breached} focus={active || Boolean(next)} tilt={tilt} hidden={!showLabel && !next} accent={color} icon={style.icon} dock={dock} status={goalStatus} place={PLACE[focusKey]} cue={inGame ? cue : undefined} shocked={shocked} />
    </group>
  );
}

// ---- Treasury: debt tower --------------------------------------------------

/** One floor per 5% of GDP of debt, up to 160%; beyond that the mast grows into a coral spire. */
const MAX_SLABS = 32;
const SLAB_PITCH = 0.24;
const PCT_PER_SLAB = 5;
const TOWER_BASE = 1.0;

/**
 * The tower gains a floor for every 5% of GDP of debt. Floors below the
 * debt threshold are the brand ink; floors above it turn amber, then coral
 * the further they climb. A gold frame marks the threshold itself.
 */
function DebtTower({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  const presetId = useLab((s) => s.config.presetId);
  const threshold = getPreset(presetId).params.debtThreshold;
  const slabs = useRef<THREE.InstancedMesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const crown = useRef<THREE.Group>(null);
  const frame = useRef<THREE.MeshStandardMaterial>(null);
  const shades = useMemo(() => ({ a: new THREE.Color(P.accent), b: new THREE.Color(P.accent).lerp(new THREE.Color(P.stone), 0.1) }), []);
  const glass = useMemo(() => mixHex(P.window, P.hull, 0.55), []);
  const floors = clamp(current.debt / PCT_PER_SLAB, 1, MAX_SLABS);
  /** Debt beyond the tallest tower: 0 at 160% of GDP, 1 at 200% and above. */
  const spire = clamp((current.debt - MAX_SLABS * PCT_PER_SLAB) / 40, 0, 1);
  const sm = useSmooth({ floors }, 3, reducedMotion);
  const thresholdFloors = threshold / PCT_PER_SLAB;
  const last = useRef(-1);
  useLayoutEffect(() => primeInstances(slabs.current, shades.a), [shades]);

  useFrame(() => {
    const m = slabs.current;
    if (!m) return;
    const c = sm.current.floors;
    // Rewrite the instances only while the tower is still moving (or the threshold changed).
    const key = c + thresholdFloors * 1000;
    if (key === last.current) return;
    last.current = key;
    const n = Math.min(MAX_SLABS, Math.ceil(c));
    for (let i = 0; i < MAX_SLABS; i++) {
      if (i >= n) {
        placeInstance(m, i, 0, 0, 0, 0);
        continue;
      }
      const v = clamp(c - i, 0, 1);
      // A slight taper gives the tower a skyscraper silhouette.
      const w = 1.5 - i * 0.009;
      placeInstance(m, i, 0, TOWER_BASE + i * SLAB_PITCH + (SLAB_PITCH * 0.76 * Math.max(0.01, v)) / 2, 0, w, Math.max(0.01, v), w);
      const over = i + 0.5 - thresholdFloors;
      if (over <= 0) TMP_COLOR.copy(i % 2 ? shades.b : shades.a);
      else TMP_COLOR.copy(AMBER).lerp(CORAL, clamp(over / 5, 0, 1));
      m.setColorAt(i, TMP_COLOR);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    const h = c * SLAB_PITCH;
    if (core.current) {
      core.current.scale.y = Math.max(0.01, h);
      core.current.position.y = TOWER_BASE + h / 2;
    }
    if (crown.current) crown.current.position.y = TOWER_BASE + h;
    // Below the threshold the frame is a faint marker of the headroom left; once reached it is solid.
    if (frame.current) frame.current.opacity = c >= thresholdFloors ? 1 : 0.4;
  });

  const markY = TOWER_BASE + thresholdFloors * SLAB_PITCH;
  const labelY = TOWER_BASE + floors * SLAB_PITCH + 1.5 + spire;
  const bad = current.debt > threshold + 20;
  return (
    <District focusKey="debt" pad={1.9} position={DISTRICT_POS.debt!} labelY={labelY} labelX={-1.2} title="Public debt" value={`${fmt(current.debt, 0)}% of GDP`} bad={bad} tilt={-1.2} reducedMotion={reducedMotion}>
      {/* Podium with a colonnade front */}
      <mesh position-y={0.08} receiveShadow>
        <boxGeometry args={[2.7, 0.16, 2.7]} />
        <meshStandardMaterial color={P.stone} roughness={1} flatShading={P.flat} />
      </mesh>
      <mesh position-y={0.55} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.8, 2.4]} />
        <meshStandardMaterial color={P.cream} roughness={0.9} flatShading={P.flat} />
      </mesh>
      <mesh position-y={0.98} castShadow>
        <boxGeometry args={[2.55, 0.1, 2.55]} />
        <meshStandardMaterial color={P.stone} roughness={1} flatShading={P.flat} />
      </mesh>
      {[-0.8, -0.4, 0.4, 0.8].map((x) => (
        <mesh key={x} position={[x, 0.55, 1.25]} castShadow>
          <boxGeometry args={[0.14, 0.8, 0.14]} />
          <meshStandardMaterial color={P.stone} roughness={0.9} flatShading={P.flat} />
        </mesh>
      ))}
      <mesh position={[0, 0.4, 1.21]}>
        <boxGeometry args={[0.5, 0.62, 0.02]} />
        <meshStandardMaterial color={P.accent} roughness={0.8} />
      </mesh>
      {/* Glass core shows between the floors */}
      <mesh ref={core} position-y={TOWER_BASE} castShadow>
        <boxGeometry args={[1.2, 1, 1.2]} />
        <meshStandardMaterial color={glass} roughness={0.3} metalness={0.2} flatShading={P.flat} />
      </mesh>
      <instancedMesh ref={slabs} args={[undefined, undefined, MAX_SLABS]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[1, SLAB_PITCH * 0.76, 1]} />
        <meshStandardMaterial roughness={0.75} flatShading={P.flat} />
      </instancedMesh>
      {/* Threshold frame: floors above it are debt beyond the safe level */}
      <mesh position-y={markY} rotation={[Math.PI / 2, 0, Math.PI / 4]}>
        <torusGeometry args={[1.12, 0.055, 4, 4]} />
        <meshStandardMaterial ref={frame} transparent color={P.gold} emissive={P.gold} emissiveIntensity={0.35} roughness={0.4} metalness={0.3} flatShading />
      </mesh>
      {/* Crown and mast ride on top of the last floor */}
      <group ref={crown} position-y={TOWER_BASE + floors * SLAB_PITCH}>
        <mesh position-y={0.06}>
          <boxGeometry args={[1.25, 0.12, 1.25]} />
          <meshStandardMaterial color={P.stone} roughness={0.9} flatShading={P.flat} />
        </mesh>
        <mesh position-y={0.36} rotation-y={Math.PI / 4} castShadow>
          <coneGeometry args={[0.72, 0.5, 4]} />
          <meshStandardMaterial color={P.accent} roughness={0.7} flatShading />
        </mesh>
        <mesh position-y={0.85}>
          <cylinderGeometry args={[0.025, 0.035, 0.6, 5]} />
          <meshStandardMaterial color={P.stone} roughness={0.6} />
        </mesh>
        {/* Debt past the top floor: a coral spire instead of more floors, so the tower stays in frame */}
        {spire > 0 ? (
          <mesh position-y={0.55 + (0.4 + 0.9 * spire) / 2} rotation-y={Math.PI / 4}>
            <coneGeometry args={[0.32, 0.4 + 0.9 * spire, 4]} />
            <meshStandardMaterial color={CORAL} emissive={CORAL} emissiveIntensity={0.25} roughness={0.6} flatShading />
          </mesh>
        ) : null}
      </group>
    </District>
  );
}

// ---- Central bank with an inflation thermometer ------------------------------

function CentralBank({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  const policy = useLab(selectPolicyNow);
  const presetId = useLab((s) => s.config.presetId);
  const neutral = getPreset(presetId).params.neutralRealRate;
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  const stance = clamp((current.realRate - neutral) / 3, -1, 1);
  const sm = useSmooth({ stance }, 3, reducedMotion);
  useFrame(() => {
    const s = sm.current.stance;
    if (!beacon.current) return;
    SCRATCH.copy(AMBER).lerp(s >= 0 ? TEAL : CORAL, Math.abs(s));
    beacon.current.color.copy(SCRATCH);
    beacon.current.emissive.copy(SCRATCH);
  });
  const stanceWord = stance > 0.33 ? "tight" : stance < -0.33 ? "loose" : "neutral";
  const next = policy.rateMode === "manual" && current.regime !== "peg" && Math.abs(policy.manualRate - current.rate) > 0.01 ? `${fmt(policy.manualRate, 2)}%` : undefined;
  // A pending decision rides high and to the right of the dome so it never covers the
  // top of the debt tower next door; on a phone it pins to the canvas corner instead.
  return (
    <District focusKey="rate" pad={2.35} position={DISTRICT_POS.rate!} labelY={6.1} labelX={-1.5} pendingLabel={[9.6, 3.0]} dockPending dockValue={`${fmt(current.rate, 2)}%`} title="Policy rate" value={next ? `${fmt(current.rate, 2)}%` : `${fmt(current.rate, 2)}% · ${stanceWord}`} next={next} delta={next ? fmt(policy.manualRate - current.rate, 2, true) : undefined} tilt={0.8} reducedMotion={reducedMotion}>
      <mesh position-y={0.15} receiveShadow castShadow>
        <cylinderGeometry args={[2.0, 2.1, 0.3, 8]} />
        <meshStandardMaterial color={P.stone} roughness={1} flatShading={P.flat} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.55, 0.9, Math.sin(a) * 1.55]} castShadow>
            <cylinderGeometry args={[0.12, 0.14, 1.2, 6]} />
            <meshStandardMaterial color={P.cream} roughness={0.9} />
          </mesh>
        );
      })}
      <mesh position-y={1.6} castShadow receiveShadow>
        <cylinderGeometry args={[1.05, 1.15, 2.6, 8]} />
        <meshStandardMaterial color={P.cream} roughness={0.9} flatShading={P.flat} />
      </mesh>
      <mesh position-y={3.2} castShadow>
        <sphereGeometry args={[0.85, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={P.accent} roughness={0.7} flatShading={P.flat} />
      </mesh>
      <mesh position-y={4.15}>
        <sphereGeometry args={[0.28, 12, 10]} />
        <meshStandardMaterial ref={beacon} color={AMBER} emissive={AMBER} emissiveIntensity={0.9} roughness={0.3} />
      </mesh>
      <pointLight position={[0, 4.4, 0]} intensity={2} distance={6} color={policy.rateMode === "manual" ? P.bad : P.good} />
    </District>
  );
}

/** Campus flags: (x, z) of each pole. */
const FLAGS: [number, number][] = [
  [-1.0, 0.5],
  [1.0, 0.5],
  [0, 1.05],
];
const POLE = 1.55;

/**
 * Campus: a thermometer in front of a lecture hall, and flags that are the
 * district colour near target, amber when inflation is moderately off target
 * and coral when it is far off.
 */
function Thermometer({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  const policy = useLab(selectPolicyNow);
  const mercury = useRef<THREE.Mesh>(null);
  const flags = useRef<(THREE.Group | null)[]>([]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: TEAL, roughness: 0.4, emissive: TEAL, emissiveIntensity: 0.25 }), []);
  const neutral = useMemo(() => new THREE.Color(P.districts[2 % P.districts.length]), []);
  const flagMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: neutral, roughness: 0.8, side: THREE.DoubleSide, flatShading: true }), [neutral]);
  const roofGeometry = useGeometry(() => gableRoof(0.66, 0.34, 1.62));
  const flagGeometry = useGeometry(() => new THREE.BoxGeometry(0.62, 0.38, 0.02).translate(0.31, 0, 0));
  const scaleMax = 20;
  const tube = 4.0;
  const fill = clamp(current.infl / scaleMax, 0.02, 1.05);
  const dev = current.infl - policy.inflationTarget;
  const tone = Math.abs(dev) <= 1.5 ? 0 : dev > 0 ? 1 : -1;
  // 0 near target, 1 moderately off (more than 1.5 points), 2 far off (more than 3 points).
  const alarm = Math.abs(dev) <= 1.5 ? 0 : Math.abs(dev) <= 3 ? 1 : 2;
  const sm = useSmooth({ fill, tone, alarm }, 3, reducedMotion);
  useEffect(
    () => () => {
      material.dispose();
      flagMaterial.dispose();
    },
    [material, flagMaterial],
  );
  useFrame((state) => {
    const { fill: f, tone: t, alarm: a } = sm.current;
    if (mercury.current) {
      mercury.current.scale.y = Math.max(0.01, f);
      mercury.current.position.y = 0.55 + (tube * f) / 2;
    }
    SCRATCH.copy(TEAL).lerp(t >= 0 ? CORAL : SKYBLUE, Math.abs(t));
    material.color.copy(SCRATCH);
    material.emissive.copy(SCRATCH);
    flagMaterial.color.copy(neutral).lerp(AMBER, clamp(a, 0, 1)).lerp(CORAL, clamp(a - 1, 0, 1));
    // Flags stir in the breeze, a little harder when the alarm is up.
    const time = state.clock.elapsedTime;
    for (let i = 0; i < FLAGS.length; i++) {
      const g = flags.current[i];
      if (!g) continue;
      g.rotation.y = reducedMotion ? -0.35 : -0.35 + Math.sin(time * (1.6 + a * 0.6) + i * 1.7) * (0.18 + a * 0.08);
    }
  });
  const targetY = 0.55 + tube * clamp(policy.inflationTarget / scaleMax, 0, 1);
  return (
    <District focusKey="infl" pad={1.0} position={DISTRICT_POS.infl!} labelY={0.6} labelX={3.1} title="Inflation" value={`${fmt(current.infl, 1)}% · target ${fmt(policy.inflationTarget, 1)}`} bad={Math.abs(dev) > 3} tilt={1.5} reducedMotion={reducedMotion}>
      {/* Lecture hall behind the thermometer */}
      <group position={[0, 0, -0.85]}>
        <mesh position-y={0.36} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.72, 0.5]} />
          <meshStandardMaterial color={P.cream} roughness={0.9} flatShading={P.flat} />
        </mesh>
        <mesh position-y={0.72} rotation-y={Math.PI / 2} castShadow geometry={roofGeometry}>
          <meshStandardMaterial color={P.roof} roughness={0.9} flatShading />
        </mesh>
        {[-0.5, -0.17, 0.17, 0.5].map((x) => (
          <mesh key={x} position={[x, 0.36, 0.26]}>
            <boxGeometry args={[0.16, 0.36, 0.02]} />
            <meshStandardMaterial color={P.window} roughness={0.4} />
          </mesh>
        ))}
      </group>
      <mesh position-y={0.2} receiveShadow>
        <cylinderGeometry args={[0.7, 0.8, 0.4, 8]} />
        <meshStandardMaterial color={P.stone} roughness={1} flatShading={P.flat} />
      </mesh>
      <mesh position-y={0.6}>
        <sphereGeometry args={[0.45, 12, 10]} />
        <meshStandardMaterial color={CORAL} roughness={0.4} />
      </mesh>
      <mesh ref={mercury} position-y={0.55} material={material}>
        <cylinderGeometry args={[0.2, 0.2, tube, 10]} />
      </mesh>
      <mesh position-y={0.55 + tube / 2}>
        <cylinderGeometry args={[0.3, 0.3, tube + 0.1, 12, 1, true]} />
        <meshStandardMaterial color={P.glass} transparent opacity={0.28} roughness={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position-y={targetY} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.42, 0.045, 8, 20]} />
        <meshStandardMaterial color={P.accent} roughness={0.6} />
      </mesh>
      {FLAGS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position-y={POLE / 2} castShadow>
            <cylinderGeometry args={[0.03, 0.04, POLE, 5]} />
            <meshStandardMaterial color={P.stone} roughness={0.6} />
          </mesh>
          <mesh position-y={POLE + 0.04}>
            <sphereGeometry args={[0.06, 6, 4]} />
            <meshStandardMaterial color={P.gold} roughness={0.4} metalness={0.4} />
          </mesh>
          <group
            ref={(el) => {
              flags.current[i] = el;
            }}
            position-y={POLE - 0.22}
          >
            <mesh geometry={flagGeometry} material={flagMaterial} castShadow />
          </group>
        </group>
      ))}
    </District>
  );
}

// ---- Industrial district: output and growth ----------------------------------

const FACTORY_X = [-1.6, 0, 1.6];
const FACTORY_D = 1.4;
/** Saw-tooth roof: teeth per factory and the depth of each. */
const TEETH = 3;
const TOOTH = FACTORY_D / TEETH;
const PANES = 6;
const PUFFS = 5;
const CHIMNEY = 1.35;

/**
 * Three saw-tooth sheds whose height follows the GDP level. Activity follows
 * the output gap: above potential the windows and roof lights glow and the
 * chimneys pour out smoke; deep below it the windows go dark and a thin
 * wisp barely rises.
 */
function Factories({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  const height = 1.1 + clamp((current.gdpLevel - 100) * 0.07, -0.4, 2.4);
  const activity = clamp(0.65 + current.gap * 0.22, 0.03, 1.4);
  const sm = useSmooth({ height, activity }, 3, reducedMotion);
  const bodies = useRef<(THREE.Mesh | null)[]>([]);
  const chimneys = useRef<(THREE.Group | null)[]>([]);
  const teeth = useRef<THREE.InstancedMesh>(null);
  const skylights = useRef<THREE.InstancedMesh>(null);
  const panes = useRef<THREE.InstancedMesh>(null);
  const smoke = useRef<THREE.InstancedMesh>(null);
  const toothGeometry = useGeometry(() =>
    prismGeometry(
      [
        [0, 0],
        [TOOTH, 0],
        [0, 0.34],
      ],
      1.25,
    ),
  );
  const colors = useMemo(
    () => ({
      // Warm lamplight, deep enough to stand out against the cream walls.
      lit: new THREE.Color(mixHex(P.lamp, P.gold, 0.6)),
      dark: new THREE.Color(mixHex(P.building2, P.hull, 0.6)),
      smoke: new THREE.Color(P.smoke),
      soot: new THREE.Color(mixHex(P.smoke, P.chimney, 0.7)),
      roof: new THREE.Color(mixHex(P.chimney, P.accent, 0.25)),
    }),
    [],
  );
  const order = useMemo(() => scatterOrder(FACTORY_X.length * PANES, 7), []);
  const phase = useMemo(() => new Float32Array(FACTORY_X.length), []);
  const last = useRef({ h: -1, a: -1 });
  /** With reduced motion the smoke stands still: write it once, then only when activity moves. */
  const smokeStill = useRef(false);
  useLayoutEffect(() => {
    primeInstances(teeth.current, colors.roof);
    primeInstances(skylights.current, colors.dark);
    primeInstances(panes.current, colors.dark);
    primeInstances(smoke.current, colors.smoke);
  }, [colors]);

  useFrame((_, dt) => {
    const { height: h, activity: a } = sm.current;
    const lit = clamp((a - 0.1) / 1.0, 0, 1);
    const changed = h !== last.current.h || a !== last.current.a;
    if (changed) {
      last.current.h = h;
      last.current.a = a;
      const tm = teeth.current;
      const sk = skylights.current;
      const pm = panes.current;
      for (let f = 0; f < FACTORY_X.length; f++) {
        const fx = FACTORY_X[f];
        const body = bodies.current[f];
        if (body) {
          body.scale.y = h;
          body.position.y = h / 2;
        }
        const ch = chimneys.current[f];
        if (ch) ch.position.y = h;
        for (let k = 0; k < TEETH; k++) {
          const i = f * TEETH + k;
          const z = FACTORY_D / 2 - k * TOOTH;
          if (tm) placeInstance(tm, i, fx, h, z, 1, 1, 1, Math.PI / 2);
          if (sk) {
            placeInstance(sk, i, fx, h + 0.15, z + 0.004, 1);
            // Roof lights glow in a scattered order as activity rises.
            const on = clamp((lit - order[(i * 2) % order.length]) * 5, 0, 1);
            sk.setColorAt(i, TMP_COLOR.copy(colors.dark).lerp(colors.lit, on));
          }
        }
        if (pm) {
          for (let k = 0; k < PANES; k++) {
            const i = f * PANES + k;
            const row = k < 3 ? 0 : 1;
            const col = (k % 3) - 1;
            placeInstance(pm, i, fx + col * 0.36, h * (row ? 0.66 : 0.3), FACTORY_D / 2 + 0.006, 1, Math.min(1, h * 0.55), 1);
            const on = clamp((lit - order[i]) * 5, 0, 1);
            pm.setColorAt(i, TMP_COLOR.copy(colors.dark).lerp(colors.lit, on));
          }
        }
      }
      commitInstances(tm);
      commitInstances(sk);
      commitInstances(pm);
    }

    // Smoke rises faster and fuller the hotter the economy runs.
    const sm2 = smoke.current;
    if (!sm2) return;
    if (reducedMotion && !changed && smokeStill.current) return;
    smokeStill.current = reducedMotion;
    const speed = reducedMotion ? 0 : 0.1 + 0.32 * a;
    // The plume leans downwind (away from the district label above) and climbs higher when busy.
    const rise = 0.35 + 0.65 * a;
    const drift = 1.2 + 1.3 * a;
    for (let f = 0; f < FACTORY_X.length; f++) {
      phase[f] = (phase[f] + dt * speed) % 1;
      const cx = FACTORY_X[f] + 0.35;
      const top = h + CHIMNEY + 0.05;
      for (let p = 0; p < PUFFS; p++) {
        const i = f * PUFFS + p;
        const prog = reducedMotion ? (p + 0.5) / PUFFS : (phase[f] + p / PUFFS + f * 0.13) % 1;
        // Grow as they rise, then shrink away at the top so there is no pop.
        const fade = prog > 0.7 ? (1 - prog) / 0.3 : 1;
        const size = (0.2 + prog * 0.5) * (0.3 + a * 0.7) * fade * clamp(a * 2.5, 0, 1);
        placeInstance(sm2, i, cx + prog * drift, top + prog * rise, -0.3 + prog * 0.9, Math.max(0.001, size));
        if (changed) sm2.setColorAt(i, TMP_COLOR.copy(colors.smoke).lerp(colors.soot, clamp(a - 0.6, 0, 0.8) * 0.4));
      }
    }
    sm2.instanceMatrix.needsUpdate = true;
    if (changed && sm2.instanceColor) sm2.instanceColor.needsUpdate = true;
  });

  return (
    <District focusKey="growth" pad={2.6} position={DISTRICT_POS.growth!} labelY={height + 3.0} labelX={1.4} title="Growth" value={`${fmt(current.growth, 1)}%`} bad={current.growth < 0} tilt={-0.6} reducedMotion={reducedMotion}>
      {/* Yard */}
      <mesh position={[0, 0.03, 0.1]} receiveShadow>
        <boxGeometry args={[4.9, 0.06, 2.3]} />
        <meshStandardMaterial color={P.road} roughness={1} />
      </mesh>
      {FACTORY_X.map((x, f) => (
        <group key={f} position-x={x}>
          <mesh
            ref={(el) => {
              bodies.current[f] = el;
            }}
            position-y={0.55}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[1.25, 1, FACTORY_D]} />
            <meshStandardMaterial color={f === 1 ? P.building2 : P.cream} roughness={0.95} flatShading={P.flat} />
          </mesh>
          {/* Loading door */}
          <mesh position={[0.42, 0.22, FACTORY_D / 2 + 0.005]}>
            <planeGeometry args={[0.3, 0.42]} />
            <meshStandardMaterial color={P.chimney} roughness={0.9} />
          </mesh>
          <group
            ref={(el) => {
              chimneys.current[f] = el;
            }}
            position-y={1.1}
          >
            <mesh position={[0.35, CHIMNEY / 2, -0.3]} castShadow>
              <cylinderGeometry args={[0.13, 0.19, CHIMNEY, 7]} />
              <meshStandardMaterial color={P.chimney} roughness={1} flatShading={P.flat} />
            </mesh>
            <mesh position={[0.35, CHIMNEY - 0.16, -0.3]}>
              <cylinderGeometry args={[0.145, 0.15, 0.12, 7]} />
              <meshStandardMaterial color={P.accent} roughness={0.8} flatShading={P.flat} />
            </mesh>
          </group>
        </group>
      ))}
      <instancedMesh ref={teeth} args={[toothGeometry, undefined, FACTORY_X.length * TEETH]} castShadow frustumCulled={false}>
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={skylights} args={[undefined, undefined, FACTORY_X.length * TEETH]} frustumCulled={false}>
        <planeGeometry args={[1.12, 0.22]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={panes} args={[undefined, undefined, FACTORY_X.length * PANES]} frustumCulled={false}>
        <planeGeometry args={[0.28, 0.32]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={smoke} args={[undefined, undefined, FACTORY_X.length * PUFFS]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial transparent opacity={0.82} roughness={1} flatShading depthWrite={false} />
      </instancedMesh>
    </District>
  );
}

// ---- Port: trade and the current account --------------------------------------

const MAX_CONTAINERS = 8;
/**
 * Freighters waiting at anchor, in the port's local frame: x, z, heading.
 * Close in on the water either side of the quay, so all three stay inside
 * the camera's frame on desktop, big screens and phones (checked against the hex map).
 */
const ANCHORAGE: [number, number, number][] = [
  [5.0, -3.0, -0.2],
  [3.4, -6.5, 0.25],
  [3.9, 6.3, -0.15],
];

/** A low-poly freighter: hull with a pointed bow, bridge at the stern, boxes on deck. */
function Freighter({ shipRef, cargo }: { shipRef: (el: THREE.Group | null) => void; cargo: number }) {
  const deck = [P.cars[cargo % P.cars.length], P.cars[(cargo + 2) % P.cars.length], P.cars[(cargo + 4) % P.cars.length]];
  return (
    <group ref={shipRef}>
      <mesh castShadow>
        <boxGeometry args={[1.5, 0.45, 0.72]} />
        <meshStandardMaterial color={P.hull} roughness={0.7} flatShading={P.flat} />
      </mesh>
      <mesh position={[0.96, 0, 0]} rotation-y={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.45, 3]} />
        <meshStandardMaterial color={P.hull} roughness={0.7} flatShading />
      </mesh>
      <mesh position={[0.2, -0.12, 0]}>
        <boxGeometry args={[2.36, 0.08, 0.74]} />
        <meshStandardMaterial color={P.cream} roughness={0.8} />
      </mesh>
      <mesh position={[-0.55, 0.45, 0]} castShadow>
        <boxGeometry args={[0.38, 0.45, 0.56]} />
        <meshStandardMaterial color={P.cream} roughness={0.9} flatShading={P.flat} />
      </mesh>
      <mesh position={[-0.6, 0.78, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.24, 6]} />
        <meshStandardMaterial color={P.chimney} roughness={0.9} />
      </mesh>
      {deck.map((c, i) => (
        <mesh key={i} position={[-0.08 + i * 0.36, 0.38, 0]} castShadow>
          <boxGeometry args={[0.32, 0.3, 0.52]} />
          <meshStandardMaterial color={c} roughness={0.7} flatShading={P.flat} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Harbour: export (brand ink) and import (rust brown) container stacks
 * follow the current account; the difference is in their height, not in a
 * good/bad colour, since imports are not a bad thing in themselves.
 * Freighters at anchor follow export volume, a mix of the current account
 * and how competitive the currency is.
 */
function Port({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  const exportsCount = clamp(3.5 + current.ca / 1.5, 0.3, MAX_CONTAINERS);
  const importsCount = clamp(3.5 - current.ca / 1.5, 0.3, MAX_CONTAINERS);
  // Ships at anchor beyond the one at the quay: more with a stronger current account and a weaker (more competitive) currency.
  const ships = clamp(1 + (current.ca + 4) / 3.5 + (current.rer - 100) / 30, 0, ANCHORAGE.length);
  const sm = useSmooth({ exportsCount, importsCount, ships }, 3, reducedMotion);
  const boxes = useRef<THREE.InstancedMesh>(null);
  const ship = useRef<THREE.Group | null>(null);
  const anchored = useRef<(THREE.Group | null)[]>([]);
  const shades = useMemo(() => {
    const out: THREE.Color[] = [];
    for (let i = 0; i < MAX_CONTAINERS * 2; i++) out.push(new THREE.Color(i < MAX_CONTAINERS ? P.accent : P.trunk).multiplyScalar(0.86 + ((i * 5) % 3) * 0.07));
    return out;
  }, []);
  const last = useRef({ e: -1, m: -1 });
  useLayoutEffect(() => primeInstances(boxes.current, P.accent), []);

  useFrame((state) => {
    const { exportsCount: e, importsCount: m, ships: n } = sm.current;
    const b = boxes.current;
    if (b && (e !== last.current.e || m !== last.current.m)) {
      last.current.e = e;
      last.current.m = m;
      for (let i = 0; i < MAX_CONTAINERS * 2; i++) {
        const imports = i >= MAX_CONTAINERS;
        const j = imports ? i - MAX_CONTAINERS : i;
        const v = clamp((imports ? m : e) - j, 0, 1);
        const col = j % 2;
        const row = Math.floor(j / 2);
        const s = v > 0.02 ? 1 : 0;
        placeInstance(b, i, (imports ? 1.2 : -0.9) + col * 0.95 - 0.47, 0.45 + row * 0.44 + (0.42 * v) / 2, -0.4, s, Math.max(0.01, v) * s, s);
        b.setColorAt(i, shades[i]);
      }
      commitInstances(b);
    }
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    const main = ship.current;
    if (main) {
      const x = 4.8 + Math.sin(t * 0.22) * 1.2;
      main.position.set(x, -0.42 + (reducedMotion ? 0 : Math.sin(t * 1.3) * 0.04), 2.7);
      main.rotation.y = Math.cos(t * 0.22) >= 0 ? 0 : Math.PI;
      main.rotation.z = reducedMotion ? 0 : Math.sin(t * 0.9) * 0.03;
    }
    for (let i = 0; i < ANCHORAGE.length; i++) {
      const g = anchored.current[i];
      if (!g) continue;
      const v = clamp(n - i, 0, 1);
      g.visible = v > 0.02;
      if (!g.visible) continue;
      const [ax, az, heading] = ANCHORAGE[i];
      // Ships sail in from the horizon side rather than popping into place.
      g.position.set(ax + (1 - v) * 4, -0.42 + (reducedMotion ? 0 : Math.sin(t * 1.1 + i * 2) * 0.04), az);
      g.rotation.set(0, heading + (reducedMotion ? 0 : Math.sin(t * 0.15 + i) * 0.08), reducedMotion ? 0 : Math.sin(t * 0.8 + i) * 0.025);
      g.scale.setScalar(0.4 + 0.6 * v);
    }
  });

  return (
    <District focusKey="ca" position={DISTRICT_POS.ca!} labelY={3.3} title="Current account" value={`${fmt(current.ca, 1, true)}% of GDP`} bad={current.ca < -6} tilt={1} reducedMotion={reducedMotion}>
      <mesh position={[1.2, 0.15, 0.4]} receiveShadow castShadow>
        <boxGeometry args={[5.2, 0.3, 2.6]} />
        <meshStandardMaterial color={P.dock} roughness={1} flatShading={P.flat} />
      </mesh>
      {/* Quay edge and bollards */}
      <mesh position={[1.2, 0.32, 1.66]}>
        <boxGeometry args={[5.2, 0.05, 0.1]} />
        <meshStandardMaterial color={P.gold} roughness={0.8} />
      </mesh>
      {[-0.8, 0.6, 2.0, 3.4].map((x) => (
        <mesh key={x} position={[x, 0.38, 1.5]}>
          <cylinderGeometry args={[0.06, 0.07, 0.16, 6]} />
          <meshStandardMaterial color={P.hull} roughness={0.8} />
        </mesh>
      ))}
      <instancedMesh ref={boxes} args={[undefined, undefined, MAX_CONTAINERS * 2]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.9, 0.42, 0.55]} />
        <meshStandardMaterial roughness={0.7} flatShading={P.flat} />
      </instancedMesh>
      {/* Portal crane: two legs, a beam and a boom reaching over the water */}
      <group position={[3.1, 0.3, 0.3]}>
        {[-0.75, 0.75].map((z) => (
          <group key={z}>
            <mesh position={[-0.35, 1.1, z]} castShadow>
              <boxGeometry args={[0.12, 2.2, 0.12]} />
              <meshStandardMaterial color={P.accent} roughness={0.8} flatShading={P.flat} />
            </mesh>
            <mesh position={[0.35, 1.1, z]} castShadow>
              <boxGeometry args={[0.12, 2.2, 0.12]} />
              <meshStandardMaterial color={P.accent} roughness={0.8} flatShading={P.flat} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 2.25, 0]} castShadow>
          <boxGeometry args={[0.85, 0.22, 1.7]} />
          <meshStandardMaterial color={P.accent} roughness={0.8} flatShading={P.flat} />
        </mesh>
        <mesh position={[0.2, 2.45, 1.2]} castShadow>
          <boxGeometry args={[0.18, 0.14, 4.2]} />
          <meshStandardMaterial color={P.cream} roughness={0.7} flatShading={P.flat} />
        </mesh>
        <mesh position={[0.2, 1.75, 2.4]}>
          <boxGeometry args={[0.02, 1.3, 0.02]} />
          <meshStandardMaterial color={P.hull} />
        </mesh>
        <mesh position={[0.2, 1.08, 2.4]}>
          <boxGeometry args={[0.5, 0.08, 0.3]} />
          <meshStandardMaterial color={P.hull} roughness={0.7} />
        </mesh>
      </group>
      <Freighter
        cargo={0}
        shipRef={(el) => {
          ship.current = el;
        }}
      />
      {ANCHORAGE.map((_, i) => (
        <Freighter
          key={i}
          cargo={i + 1}
          shipRef={(el) => {
            anchored.current[i] = el;
          }}
        />
      ))}
    </District>
  );
}

// ---- Reserve vault --------------------------------------------------------------

/** Gold bars stack as a pyramid on the pallet: 7 + 6 + ... + 1 = 28 bars, two per month of imports. */
const BAR_LAYERS = 7;
const MAX_BARS = (BAR_LAYERS * (BAR_LAYERS + 1)) / 2;
const BAR_SLOTS: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let layer = 0; layer < BAR_LAYERS; layer++) {
    const n = BAR_LAYERS - layer;
    for (let c = 0; c < n; c++) out.push([(c - (n - 1) / 2) * 0.46, 0.15 + layer * 0.19]);
  }
  return out;
})();
/** The facade gauge reads 0 to this many months of imports. */
const GAUGE_MONTHS = 14;
const GAUGE_H = 1.2;

/**
 * Reserve vault: a pyramid of gold bars on the pallet and a gauge on the
 * facade fill and empty with reserves; the door turns coral when they run low.
 */
function Vault({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  const bars = useRef<THREE.InstancedMesh>(null);
  const gauge = useRef<THREE.Mesh>(null);
  const door = useRef<THREE.MeshStandardMaterial>(null);
  const gaugeMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const count = clamp(current.reserves * 2, 0, MAX_BARS);
  const level = clamp(current.reserves / GAUGE_MONTHS, 0, 1);
  const sm = useSmooth({ count, level, danger: current.reserves < 1 ? 1 : current.reserves < 3 ? 0.5 : 0 }, 3, reducedMotion);
  const gold = useMemo(() => new THREE.Color(P.gold), []);
  const last = useRef(-1);
  useLayoutEffect(() => primeInstances(bars.current, gold), [gold]);
  useFrame(() => {
    const { count: c, level: l, danger } = sm.current;
    const m = bars.current;
    if (m && c !== last.current) {
      last.current = c;
      for (let i = 0; i < MAX_BARS; i++) {
        const v = clamp(c - i, 0, 1);
        const [x, y] = BAR_SLOTS[i];
        const s = v > 0.02 ? Math.max(0.01, v) : 0;
        placeInstance(m, i, x, y + 0.03, 1.95, s);
        m.setColorAt(i, TMP_COLOR.copy(gold).multiplyScalar(0.9 + ((i * 3) % 4) * 0.05));
      }
      commitInstances(m);
    }
    if (gauge.current) {
      gauge.current.scale.y = Math.max(0.01, l);
      gauge.current.position.y = 0.25 + (GAUGE_H * l) / 2;
    }
    if (door.current) door.current.color.copy(NAVY).lerp(CORAL, danger);
    if (gaugeMaterial.current) gaugeMaterial.current.emissiveIntensity = 0.15 + 0.25 * (1 - danger);
  });
  const lowMark = 0.25 + GAUGE_H * (3 / GAUGE_MONTHS);
  return (
    <District focusKey="reserves" pad={2.1} position={DISTRICT_POS.reserves!} labelY={3.1} title="Reserves" value={`${fmt(current.reserves, 1)} mo. imports`} bad={current.reserves < 2} tilt={-1.5} reducedMotion={reducedMotion}>
      <mesh position-y={0.06} receiveShadow>
        <boxGeometry args={[2.9, 0.12, 2.5]} />
        <meshStandardMaterial color={P.stone} roughness={1} flatShading={P.flat} />
      </mesh>
      <mesh position-y={0.91} castShadow receiveShadow>
        <boxGeometry args={[2.6, 1.6, 2.2]} />
        <meshStandardMaterial color={P.vault} roughness={0.9} flatShading={P.flat} />
      </mesh>
      {/* Stepped cornice */}
      <mesh position-y={1.79} castShadow>
        <boxGeometry args={[2.8, 0.16, 2.4]} />
        <meshStandardMaterial color={P.stone} roughness={0.95} flatShading={P.flat} />
      </mesh>
      <mesh position-y={1.97} castShadow>
        <boxGeometry args={[2.1, 0.2, 1.7]} />
        <meshStandardMaterial color={P.vault} roughness={0.9} flatShading={P.flat} />
      </mesh>
      {[-1.18, 1.18].map((x) => (
        <mesh key={x} position={[x, 0.91, 1.12]} castShadow>
          <boxGeometry args={[0.18, 1.6, 0.12]} />
          <meshStandardMaterial color={P.stone} roughness={0.95} flatShading={P.flat} />
        </mesh>
      ))}
      <mesh position={[-0.25, 0.85, 1.11]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.55, 0.55, 0.08, 20]} />
        <meshStandardMaterial ref={door} color={P.accent} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[-0.25, 0.85, 1.16]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.25, 0.04, 8, 20]} />
        <meshStandardMaterial color={P.gold} roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Reserve gauge: a glass slot that fills with gold; the coral tick marks three months */}
      <mesh position={[0.72, 0.25 + GAUGE_H / 2, 1.11]}>
        <boxGeometry args={[0.32, GAUGE_H + 0.1, 0.04]} />
        <meshStandardMaterial color={P.hull} roughness={0.6} />
      </mesh>
      <mesh ref={gauge} position={[0.72, 0.25, 1.14]}>
        <boxGeometry args={[0.22, GAUGE_H, 0.03]} />
        <meshStandardMaterial ref={gaugeMaterial} color={P.gold} emissive={P.gold} emissiveIntensity={0.3} roughness={0.35} metalness={0.5} />
      </mesh>
      <mesh position={[0.72, lowMark, 1.165]}>
        <boxGeometry args={[0.36, 0.035, 0.02]} />
        <meshBasicMaterial color={P.bad} />
      </mesh>
      <mesh position={[0, 0.03, 1.95]} receiveShadow>
        <boxGeometry args={[3.4, 0.06, 1.1]} />
        <meshStandardMaterial color={P.pallet} roughness={1} />
      </mesh>
      <instancedMesh ref={bars} args={[undefined, undefined, MAX_BARS]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.4, 0.17, 0.3]} />
        <meshStandardMaterial roughness={0.35} metalness={0.7} flatShading />
      </instancedMesh>
    </District>
  );
}

// ---- Housing: unemployment --------------------------------------------------------

const HOUSES = 12;
const WINDOWS_PER = 2;
/** House heights and roof directions vary a little so the block does not read as a grid. */
const HOUSE_H = Array.from({ length: HOUSES }, (_, i) => 0.46 + ((i * 5) % 4) * 0.07);
const HOUSE_TURN = Array.from({ length: HOUSES }, (_, i) => ((i * 7) % 3 === 0 ? Math.PI / 2 : 0));

/**
 * Neighbourhood: lit windows go dark, scattered through the block, as
 * unemployment rises; a house with no lit window fades to grey.
 */
function Housing({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  // Every window is lit at 3% unemployment; none at 18% or more.
  const lit = clamp(1 - (current.unemp - 3) / 15, 0, 1);
  const sm = useSmooth({ lit }, 3, reducedMotion);
  const bodies = useRef<THREE.InstancedMesh>(null);
  const roofs = useRef<THREE.InstancedMesh>(null);
  const panes = useRef<THREE.InstancedMesh>(null);
  const roofGeometry = useGeometry(() => gableRoof(0.78, 0.36, 0.74));
  const colors = useMemo(
    () => ({
      roof: new THREE.Color(P.roof),
      roofOff: new THREE.Color(P.roofOff),
      body: new THREE.Color(P.cream),
      bodyOff: new THREE.Color(P.houseOff),
      lamp: new THREE.Color(mixHex(P.lamp, P.gold, 0.6)),
      dark: new THREE.Color(mixHex(P.houseOff, P.hull, 0.6)),
    }),
    [],
  );
  const order = useMemo(() => scatterOrder(HOUSES * WINDOWS_PER, 7), []);
  const last = useRef(-1);
  useLayoutEffect(() => {
    primeInstances(bodies.current, colors.body);
    primeInstances(roofs.current, colors.roof);
    primeInstances(panes.current, colors.lamp);
  }, [colors]);

  useFrame(() => {
    const l = sm.current.lit;
    if (l === last.current) return;
    last.current = l;
    const b = bodies.current;
    const r = roofs.current;
    const w = panes.current;
    if (!b || !r || !w) return;
    for (let i = 0; i < HOUSES; i++) {
      const x = (i % 4) * 0.9 - 1.35;
      const z = Math.floor(i / 4) * 0.9 - 0.9;
      const h = HOUSE_H[i];
      let on = 0;
      for (let k = 0; k < WINDOWS_PER; k++) {
        const j = i * WINDOWS_PER + k;
        // Each window switches off in its own place in the order, with a short fade.
        const v = clamp((l * 1.1 - order[j]) * 12, 0, 1);
        on += v / WINDOWS_PER;
        placeInstance(w, j, x + (k ? 0.15 : -0.15), h * 0.55, z + 0.315, 1);
        w.setColorAt(j, TMP_COLOR.copy(colors.dark).lerp(colors.lamp, v));
      }
      placeInstance(b, i, x, h / 2, z, 1, h, 1);
      b.setColorAt(i, TMP_COLOR.copy(colors.body).lerp(colors.bodyOff, (1 - on) * 0.85));
      placeInstance(r, i, x, h, z, 1, 1, 1, HOUSE_TURN[i]);
      r.setColorAt(i, TMP_COLOR.copy(colors.roof).lerp(colors.roofOff, (1 - on) * 0.85));
    }
    commitInstances(b);
    commitInstances(r);
    commitInstances(w);
  });
  return (
    <District focusKey="unemp" pad={2.2} position={DISTRICT_POS.unemp!} labelY={2.1} title="Unemployment" value={`${fmt(current.unemp, 1)}%`} bad={current.unemp > 12} tilt={0.6} reducedMotion={reducedMotion}>
      <instancedMesh ref={bodies} args={[undefined, undefined, HOUSES]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[0.62, 1, 0.62]} />
        <meshStandardMaterial roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh ref={roofs} args={[roofGeometry, undefined, HOUSES]} castShadow frustumCulled={false}>
        <meshStandardMaterial roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh ref={panes} args={[undefined, undefined, HOUSES * WINDOWS_PER]} frustumCulled={false}>
        <planeGeometry args={[0.22, 0.25]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </District>
  );
}

// ---- Lighthouse: credibility -------------------------------------------------------

function Lighthouse({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  const beam = useRef<THREE.Mesh>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const sm = useSmooth({ cred: current.cred / 100 }, 2, reducedMotion);
  useFrame((state, dt) => {
    const c = sm.current.cred;
    if (beam.current) {
      if (!reducedMotion) beam.current.rotation.y += dt * 0.8;
      (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.03 + 0.12 * c;
    }
    if (lamp.current) lamp.current.intensity = 1 + 7 * c;
  });
  return (
    <District focusKey="cred" pad={1.25} position={DISTRICT_POS.cred!} labelY={4.4} title="Credibility" value={`${fmt(current.cred, 0)} / 100`} bad={current.cred < 30} tilt={-0.8} reducedMotion={reducedMotion}>
      <mesh position-y={0.15} receiveShadow>
        <cylinderGeometry args={[0.9, 1.0, 0.3, 8]} />
        <meshStandardMaterial color={P.stone} roughness={1} flatShading={P.flat} />
      </mesh>
      <mesh position-y={1.6} castShadow>
        <cylinderGeometry args={[0.32, 0.46, 2.6, 10]} />
        <meshStandardMaterial color={P.cream} roughness={0.9} />
      </mesh>
      {[1.0, 1.9].map((y) => (
        <mesh key={y} position-y={y}>
          <cylinderGeometry args={[0.44 - (y - 0.3) * 0.055, 0.44 - (y - 0.3) * 0.055 + 0.02, 0.3, 10]} />
          <meshStandardMaterial color={P.accent} roughness={0.9} />
        </mesh>
      ))}
      <mesh position-y={3.15}>
        <cylinderGeometry args={[0.36, 0.36, 0.5, 10]} />
        <meshStandardMaterial color={P.lampGlass} emissive={P.gold} emissiveIntensity={0.6} roughness={0.3} />
      </mesh>
      <mesh position-y={3.55} castShadow>
        <coneGeometry args={[0.5, 0.4, 10]} />
        <meshStandardMaterial color={P.accent} roughness={0.9} flatShading={P.flat} />
      </mesh>
      <pointLight ref={lamp} position={[0, 3.2, 0]} intensity={4} distance={14} color={P.lamp} />
      <group position-y={3.15}>
        <mesh ref={beam} rotation-z={-Math.PI / 2} position-x={0}>
          <coneGeometry args={[1.1, 5.5, 12, 1, true]} />
          <meshBasicMaterial color={P.beam} transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
    </District>
  );
}

// ---- Offshore tanker: oil price --------------------------------------------------------

function Tanker({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  const group = useRef<THREE.Group>(null);
  const dev = current.oil / WEO_REFERENCE.oilPrice - 1;
  useFrame((state) => {
    if (!group.current || reducedMotion) return;
    const t = state.clock.elapsedTime;
    group.current.position.y = Math.sin(t * 0.8) * 0.05;
    group.current.rotation.z = Math.sin(t * 0.6) * 0.02;
  });
  return (
    <District focusKey="oil" position={DISTRICT_POS.oil!} labelY={2.2} title="Oil" value={`$${fmt(current.oil, 0)}${Math.abs(dev) > 0.05 ? ` (${fmt(dev * 100, 0, true)}%)` : ""}`} bad={dev > 0.3} tilt={1.2} reducedMotion={reducedMotion}>
      <group ref={group} rotation-y={-0.3}>
        <mesh castShadow>
          <boxGeometry args={[4.2, 0.7, 1.3]} />
          <meshStandardMaterial color={P.hull} roughness={0.7} flatShading={P.flat} />
        </mesh>
        <mesh position={[-1.5, 0.75, 0]} castShadow>
          <boxGeometry args={[0.9, 0.8, 1.0]} />
          <meshStandardMaterial color={P.cream} roughness={0.9} />
        </mesh>
        {[0.2, 1.3].map((x) => (
          <mesh key={x} position={[x, 0.55, 0]} rotation-z={Math.PI / 2} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.9, 10]} />
            <meshStandardMaterial color={dev > 0.3 ? P.bad : dev < -0.2 ? P.good : P.gold} roughness={0.5} />
          </mesh>
        ))}
      </group>
    </District>
  );
}

/** Capital banner: city name and a real-GDP index, like a strategy game's city population badge. */
function CityBanner() {
  const presetId = useLab((s) => s.config.presetId);
  const gdp = useLab((s) => Math.round(s.result.path[Math.min(s.clock, s.result.path.length - 1)].gdpLevel));
  const narrow = useNarrowCanvas();
  const inGame = useLab((s) => s.labels === "focus");
  const { x, z } = WORLD.sites.center;
  // In the game the GDP index is chrome over the town: the goal cards carry the figures.
  if (inGame) return null;
  return <Label position={[x - 0.8, TOP + 1.5, z]} title={getPreset(presetId).name} value={`GDP index ${gdp}`} accent={P.border} icon="crown" capital dock={narrow ? "bottom-left" : undefined} />;
}

export default function Districts({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <group>
      <DebtTower reducedMotion={reducedMotion} />
      <CentralBank reducedMotion={reducedMotion} />
      <Thermometer reducedMotion={reducedMotion} />
      <Factories reducedMotion={reducedMotion} />
      <Port reducedMotion={reducedMotion} />
      <Vault reducedMotion={reducedMotion} />
      <Housing reducedMotion={reducedMotion} />
      <Lighthouse reducedMotion={reducedMotion} />
      <Tanker reducedMotion={reducedMotion} />
      <CityBanner />
    </group>
  );
}

export { GROUND };
