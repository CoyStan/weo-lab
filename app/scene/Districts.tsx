"use client";

import { P, SC } from "./palette";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ConstraintVar, QuarterState } from "../model/types";
import * as THREE from "three";
import { getPreset, WEO_REFERENCE } from "../model/presets";
import { quarterLabel } from "../model/economy";
import { useLab, type FocusKey } from "../store";
import { useGame } from "../game/store";
import { firstBreach, getMission, objectiveStatus } from "../game/missions";
import { decidingQuarter } from "../game/ui/Goals";
import Tag, { type TagStatus } from "./Tag";
import { markLabelsDirty } from "./labelLayer";
import { HEX, TOP } from "./hexmap";
import { WORLD } from "./world";
import { clamp, useSmooth } from "./useSmooth";
import { commitInstances, gableRoof, mixHex, placeInstance, primeInstances, prismGeometry, scatterOrder, TMP_COLOR, useGeometry } from "./shapes";
import { forecastPath, useIslandMode, useIslandQuarter, useLandmarks, type IslandQuarter } from "./quarter";

/** Rates as the lever shows them: up to two decimals, no trailing zeros (10.5, 10.25). */
const rateText = (v: number) => String(+v.toFixed(2));

const TEAL = SC.good;
const CORAL = SC.bad;
const AMBER = SC.warn;
const SKYBLUE = SC.cool;
const NAVY = SC.accent;

const site = (k: keyof typeof WORLD.sites): [number, number, number] => [WORLD.sites[k].x, TOP, WORLD.sites[k].z];

/**
 * Each district stands on its own hex; the tanker anchors offshore, in open water north-east
 * of the island (its whole hull over sea hexes, not the beach), close enough to stay in the
 * home view on a laptop, a TV and a phone.
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
  oil: [12.6, 0, -11.2],
};

/** The tanker's hull: its length and its heading (turn about the vertical, in radians). */
const HULL_LENGTH = 4.2;
const HULL_YAW = -0.3;

// Development only: the tanker rides the swell, so it must float. Warn if its middle or either
// end of its hull is over a land hex (a moved anchorage, or a change to the island's map).
if (process.env.NODE_ENV !== "production") {
  const [x, , z] = DISTRICT_POS.oil!;
  const dx = (Math.cos(HULL_YAW) * HULL_LENGTH) / 2;
  const dz = (-Math.sin(HULL_YAW) * HULL_LENGTH) / 2;
  for (const [px, pz] of [
    [x, z],
    [x + dx, z + dz],
    [x - dx, z - dz],
  ]) {
    let near = WORLD.tiles[0];
    for (const t of WORLD.tiles) if (Math.hypot(t.x - px, t.z - pz) < Math.hypot(near.x - px, near.z - pz)) near = t;
    if (near.land) console.warn(`Island: the oil tanker at (${px.toFixed(1)}, ${pz.toFixed(1)}) sits on a ${near.kind} hex; move DISTRICT_POS.oil out to sea.`);
  }
}

/**
 * How far each landmark reaches round its site, in world units: [west, east, north, south,
 * height of its tag's stem]. The camera frames the landmarks on the island with these.
 */
export const LANDMARK_EXTENT: Partial<Record<FocusKey, [number, number, number, number, number]>> = {
  debt: [-1.6, 1.6, -1.6, 1.6, 4.6],
  rate: [-1.6, 1.6, -1.6, 1.6, 3.2],
  infl: [-1.6, 1.6, -1.6, 1.6, 4.6],
  growth: [-1.6, 1.6, -1.6, 1.6, 2.3],
  ca: [-1.5, 4.2, -4.8, 4.8, 2.2],
  reserves: [-1.6, 1.6, -1.6, 1.6, 2.2],
  unemp: [-1.6, 1.6, -1.6, 1.6, 1.4],
  cred: [-1.4, 1.4, -1.4, 1.4, 4.0],
  oil: [-2.4, 2.4, -1.4, 1.4, 2.0],
};

/** District type: colour slot in the palette, and the scale that fits the model on one hex. */
const DISTRICT_STYLE: Partial<Record<FocusKey, { slot: number; scale: number }>> = {
  debt: { slot: 0, scale: 0.82 },
  rate: { slot: 1, scale: 0.6 },
  infl: { slot: 2, scale: 0.9 },
  growth: { slot: 3, scale: 0.56 },
  ca: { slot: 4, scale: 0.68 },
  reserves: { slot: 5, scale: 0.72 },
  unemp: { slot: 6, scale: 0.68 },
  cred: { slot: 7, scale: 0.9 },
  oil: { slot: 8, scale: 1 },
};

const GROUND = TOP;
const SCRATCH = new THREE.Color();

// ---- What each tag says ---------------------------------------------------------------

/** Each landmark's tag names its figure, as the goal cards and the map do. */
const NAME: Partial<Record<FocusKey, string>> = {
  debt: "Debt",
  rate: "Rate",
  infl: "Inflation",
  growth: "Growth",
  ca: "Current account",
  reserves: "Reserves",
  unemp: "Unemployment",
  cred: "Credibility",
  oil: "Oil",
};
const LONG: Partial<Record<FocusKey, string>> = { debt: "Public debt", rate: "Policy rate", oil: "Oil price" };

/** A figure to `d` decimals with a true minus sign, and no "−0.0". */
const num = (v: number, d: number) => {
  const s = Math.abs(v).toFixed(d);
  return v < 0 && Number(s) !== 0 ? `−${s}` : s;
};

const FORMAT: Partial<Record<FocusKey, { get: (s: QuarterState) => number; text: (v: number) => string; digits: number }>> = {
  debt: { get: (s) => s.debt, text: (v) => `${num(v, 1)}%`, digits: 1 },
  rate: { get: (s) => s.rate, text: (v) => `${rateText(v)}%`, digits: 2 },
  infl: { get: (s) => s.infl, text: (v) => `${num(v, 1)}%`, digits: 1 },
  growth: { get: (s) => s.growth, text: (v) => `${num(v, 1)}%`, digits: 1 },
  ca: { get: (s) => s.ca, text: (v) => `${num(v, 1)}%`, digits: 1 },
  reserves: { get: (s) => s.reserves, text: (v) => `${num(v, 1)} mo`, digits: 1 },
  unemp: { get: (s) => s.unemp, text: (v) => `${num(v, 1)}%`, digits: 1 },
  cred: { get: (s) => s.cred, text: (v) => `${num(v, 0)}/100`, digits: 0 },
  oil: { get: (s) => s.oil, text: (v) => `$${num(v, 0)}`, digits: 0 },
};

type Reading = { name: string; value: string; arrow?: "up" | "down"; sr: string };

/** "Inflation ▲ 7.1%": the figure in the quarter shown, and which way it moved from the quarter before. */
export function reading(k: FocusKey, q: IslandQuarter): Reading {
  const f = FORMAT[k]!;
  const v = f.get(q.now);
  const p = f.get(q.prev);
  const shown = Number(v.toFixed(f.digits));
  const before = Number(p.toFixed(f.digits));
  const arrow = shown > before ? "up" : shown < before ? "down" : undefined;
  const value = f.text(v);
  const name = NAME[k] ?? k;
  const long = LONG[k] ?? name;
  const sr = `${long} ${value} in ${q.now.label}${arrow ? `, ${arrow} from ${f.text(p)}` : ", no change"}.`;
  return { name, value, arrow, sr };
}

// ---- Districts ----------------------------------------------------------------------

/** Which constraint variables light up which district's pad when breached (free play). */
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

/** The paved hex a district stands on, with a ring in the district's colour. It does not pulse. */
function HexBadge({ color, active, scale }: { color: string; active: boolean; scale: number }) {
  const floor = useMemo(() => "#" + new THREE.Color(P.plaza).lerp(new THREE.Color(color), 0.18).getHexString(), [color]);
  // The badge lives inside the district's scaled group; undo the scale so it matches the tile.
  const k = 1 / scale;
  return (
    <group scale={k}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.012} receiveShadow>
        <circleGeometry args={[HEX * 0.9, 6, Math.PI / 2]} />
        <meshStandardMaterial color={floor} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
        <ringGeometry args={[HEX * (active ? 0.78 : 0.84), HEX * 0.95, 6, 1, Math.PI / 2]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 1 : 0.8} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Seconds a landmark takes to rise out of its hex or sink back into it. */
const GROW_S = 0.7;
const smoothstep = (x: number) => x * x * (3 - 2 * x);

/**
 * One landmark: the district's model on its hex, and its one-line tag. A landmark the
 * mission does not need sinks into its hex (and rises when it is needed: a news card points
 * at it); a news card's district sends out one slow ring at a time.
 */
function District({
  focusKey,
  q,
  shown,
  tagAt,
  status,
  children,
  reducedMotion,
}: {
  focusKey: FocusKey;
  q: IslandQuarter;
  shown: boolean;
  /** Where the tag's stem meets the building, in the model's own units (before its scale). */
  tagAt: [number, number, number];
  status?: TagStatus;
  children: ReactNode;
  reducedMotion: boolean;
}) {
  const style = DISTRICT_STYLE[focusKey] ?? { slot: 0, scale: 1 };
  const color = P.districts[style.slot % P.districts.length];
  const position = DISTRICT_POS[focusKey]!;
  const focus = useLab((s) => s.focus);
  const setFocus = useLab((s) => s.setFocus);
  const labels = useLab((s) => s.labels);
  const spotlightCount = useLab((s) => s.spotlight.length);
  const shocked = useLab((s) => s.shockFocus === focusKey);
  const mode = useIslandMode();
  const [hover, setHover] = useState(false);
  const focused = focus === focusKey;
  const active = hover || focused;
  // Every landmark on the island carries its tag, unless the player asked for tags on hover
  // only; the title screens show the island bare.
  const hoverOnly = labels === "focus" && spotlightCount === 0;
  const showTag = shown && mode !== "backdrop" && (!hoverOnly || active);
  const r = reading(focusKey, q);
  const when = useStatusWhen(focusKey, status);

  useEffect(() => {
    if (!hover) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover]);
  useEffect(() => {
    if (!shown) setHover(false);
  }, [shown]);

  const grow = useRef<THREE.Group>(null);
  const rise = useRef(shown ? 1 : 0);
  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }, dt) => {
    const g = grow.current;
    if (g) {
      const target = shown ? 1 : 0;
      const step = dt / GROW_S;
      rise.current = reducedMotion ? target : rise.current < target ? Math.min(target, rise.current + step) : Math.max(target, rise.current - step);
      const s = smoothstep(rise.current);
      g.scale.setScalar(Math.max(0.0001, s));
      g.visible = rise.current > 0.001;
    }
    // A news card's district: one ring at a time spreads out and fades, starting and ending
    // invisible, so the loop has no seam. Held still, half-spread, with reduced motion.
    const m = ring.current;
    const rm = ringMat.current;
    if (m && rm) {
      m.visible = shocked && shown;
      if (m.visible) {
        const phase = reducedMotion ? 0.5 : (clock.elapsedTime * 0.4) % 1;
        m.scale.setScalar(1 + phase * 0.9);
        rm.opacity = 0.85 * Math.sin(Math.PI * phase);
      }
    }
  });

  const k = style.scale;
  return (
    <group position={position}>
      <group ref={grow}>
        <group scale={k}>
          {focusKey !== "oil" ? <HexBadge color={status ? P.bad : color} active={active} scale={k} /> : null}
          <group
            onClick={(e) => {
              if (!shown) return;
              e.stopPropagation();
              setFocus(focus === focusKey ? null : focusKey);
            }}
            onPointerOver={(e) => {
              if (!shown) return;
              e.stopPropagation();
              setHover(true);
            }}
            onPointerOut={() => setHover(false)}
          >
            {children}
          </group>
        </group>
        <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.36} visible={false}>
          <ringGeometry args={[1.3, 1.6, 6, 1, Math.PI / 2]} />
          <meshBasicMaterial ref={ringMat} color={color} transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <TagAt at={[tagAt[0] * k, tagAt[1] * k, tagAt[2] * k]} r={r} hidden={!showTag} focus={active} status={status} when={when} />
    </group>
  );
}

/** The tag, re-placed by the tag layer whenever its anchor moves (a tower growing). */
function TagAt({ at, r, hidden, focus, status, when }: { at: [number, number, number]; r: Reading; hidden: boolean; focus: boolean; status?: TagStatus; when?: string }) {
  const [x, y, z] = at;
  useEffect(() => markLabelsDirty(), [x, y, z]);
  return <Tag position={[x, y, z]} name={r.name} arrow={r.arrow} value={r.value} sr={r.sr} hidden={hidden} focus={focus} status={status} when={when} />;
}

/** The status word on a landmark's tag: the goal's trouble in the game, a breached limit in free play. */
function useStatus(focusKey: FocusKey): TagStatus | undefined {
  const goal = useLab((s) => s.districtStatus[focusKey]);
  const mode = useIslandMode();
  const breachedNow = useBreachedNow();
  if (mode === "play") return goal;
  if (mode === "sandbox" && (BREACH_MAP[focusKey] ?? []).some((v) => breachedNow.has(v))) return "breached";
  return undefined;
}

/**
 * For a goal that must hold every quarter, the quarter its trouble is about, so a tag never
 * reads "Growth ▲ 3.1% · at risk" with no hint that the danger is a dip later on. At risk: the
 * quarter that decides it on the forecast, its low (or high) point, the quarter the goal card
 * leads with ("Lowest in 2026Q4", decidingQuarter in app/game/ui/Goals.tsx): the goal holds
 * exactly when that quarter does. Missed: the quarter it first broke. Goals judged at the end
 * or over a year (and free play) get none: their tags stay as they are.
 */
function useStatusWhen(focusKey: FocusKey, status: TagStatus | undefined): string | undefined {
  const mode = useIslandMode();
  const missionId = useGame((s) => s.missionId);
  const config = useLab((s) => s.config);
  const clock = useLab((s) => s.clock);
  const actual = useLab((s) => s.result.path);
  return useMemo(() => {
    if (mode !== "play" || (status !== "at-risk" && status !== "failed") || !missionId) return undefined;
    const mission = getMission(missionId);
    if (!mission) return undefined;
    const end = mission.quarters;
    const forecast = forecastPath(config, clock);
    // The goal whose trouble the tag shows: judged on this figure, every quarter, and in that trouble now.
    const o = mission.objectives.find((x) => !x.bonus && x.metric === focusKey && x.when === "every" && objectiveStatus(x, mission, actual, forecast, clock) === status);
    if (!o) return undefined;
    if (status === "failed") {
      const t = firstBreach(o, actual, 1, Math.min(clock, end));
      return t === null ? undefined : quarterLabel(t);
    }
    const dq = decidingQuarter(o, forecast, clock, end);
    return dq ? quarterLabel(dq.worst) : undefined;
  }, [mode, status, missionId, focusKey, config, clock, actual]);
}

type Props = { q: IslandQuarter; shown: boolean; reducedMotion: boolean };

// ---- Treasury: debt tower --------------------------------------------------

/** One floor per 5% of GDP of debt, up to 160%; beyond that the mast grows into a coral spire. */
const MAX_SLABS = 32;
const SLAB_PITCH = 0.24;
const PCT_PER_SLAB = 5;
const TOWER_BASE = 1.0;

/** Height of the debt tower's tag anchor above the ground, in world units, for a debt ratio. */
export const towerTop = (debt: number) =>
  (TOWER_BASE + clamp(debt / PCT_PER_SLAB, 1, MAX_SLABS) * SLAB_PITCH + 1.3 + clamp((debt - MAX_SLABS * PCT_PER_SLAB) / 40, 0, 1) * 1.3) * (DISTRICT_STYLE.debt?.scale ?? 1);

/**
 * The tower gains a floor for every 5% of GDP of debt. Floors below the
 * debt threshold are the brand ink; floors above it turn amber, then coral
 * the further they climb. A gold frame marks the threshold itself.
 */
function DebtTower({ q, shown, reducedMotion }: Props) {
  const current = q.now;
  const presetId = useLab((s) => s.config.presetId);
  const threshold = getPreset(presetId).params.debtThreshold;
  const slabs = useRef<THREE.InstancedMesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const crown = useRef<THREE.Group>(null);
  const spireMesh = useRef<THREE.Mesh>(null);
  const frame = useRef<THREE.MeshStandardMaterial>(null);
  const shades = useMemo(() => ({ a: new THREE.Color(P.accent), b: new THREE.Color(P.accent).lerp(new THREE.Color(P.stone), 0.1) }), []);
  const glass = useMemo(() => mixHex(P.window, P.hull, 0.55), []);
  const spireGeometry = useGeometry(() => new THREE.ConeGeometry(0.32, 1.3, 4).translate(0, 0.65, 0));
  const status = useStatus("debt");
  const floors = clamp(current.debt / PCT_PER_SLAB, 1, MAX_SLABS);
  /** Debt beyond the tallest tower: 0 at 160% of GDP, 1 at 200% and above. */
  const spire = clamp((current.debt - MAX_SLABS * PCT_PER_SLAB) / 40, 0, 1);
  const sm = useSmooth({ floors, spire }, 3, reducedMotion);
  const thresholdFloors = threshold / PCT_PER_SLAB;
  const last = useRef(-1);
  useLayoutEffect(() => primeInstances(slabs.current, shades.a), [shades]);

  useFrame(() => {
    const m = slabs.current;
    if (!m) return;
    const c = sm.current.floors;
    const sp = sm.current.spire;
    // Rewrite the instances only while the tower is still moving (or the threshold changed).
    const key = c + thresholdFloors * 1000 + sp * 1e6;
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
    // The spire grows out of the mast rather than appearing whole.
    const sp3 = spireMesh.current;
    if (sp3) {
      sp3.visible = sp > 0.002;
      sp3.scale.set(1, Math.max(0.001, sp), 1);
    }
    // Below the threshold the frame is a faint marker of the headroom left; it firms up over the last half floor.
    if (frame.current) frame.current.opacity = 0.4 + 0.6 * clamp(c - thresholdFloors + 0.5, 0, 1);
  });

  const markY = TOWER_BASE + thresholdFloors * SLAB_PITCH;
  return (
    <District focusKey="debt" q={q} shown={shown} status={status} tagAt={[0, TOWER_BASE + floors * SLAB_PITCH + 1.3 + spire * 1.3, 0]} reducedMotion={reducedMotion}>
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
        {/* Debt past the top floor: a coral spire instead of more floors, so the tower stays in frame.
            Its base sits on the roof and it grows upward from there (the cone is built base-down at y = 0). */}
        <mesh ref={spireMesh} geometry={spireGeometry} position-y={0.55} rotation-y={Math.PI / 4} visible={false}>
          <meshStandardMaterial color={CORAL} emissive={CORAL} emissiveIntensity={0.25} roughness={0.6} flatShading />
        </mesh>
      </group>
    </District>
  );
}

// ---- Central bank -------------------------------------------------------------------

/** The central bank: a domed rotunda with a gold lamp. Its tag carries the rate. */
function CentralBank({ q, shown, reducedMotion }: Props) {
  return (
    <District focusKey="rate" q={q} shown={shown} tagAt={[0, 4.8, 0]} reducedMotion={reducedMotion}>
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
        <meshStandardMaterial color={P.gold} emissive={P.gold} emissiveIntensity={0.5} roughness={0.3} />
      </mesh>
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
function Thermometer({ q, shown, reducedMotion }: Props) {
  const current = q.now;
  const target = useLab((s) => s.policyNow.inflationTarget);
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
  const dev = current.infl - target;
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
    // Flags stir in a light breeze, each about its own pole (the cloth is built out from the pole).
    const time = state.clock.elapsedTime;
    for (let i = 0; i < FLAGS.length; i++) {
      const g = flags.current[i];
      if (!g) continue;
      g.rotation.y = reducedMotion ? -0.35 : -0.35 + Math.sin(time * 1.3 + i * 1.7) * 0.16;
    }
  });
  const targetY = 0.55 + tube * clamp(target / scaleMax, 0, 1);
  const status = useStatus("infl");
  return (
    <District focusKey="infl" q={q} shown={shown} status={status} tagAt={[0, 0.55 + tube + 0.5, 0]} reducedMotion={reducedMotion}>
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
        <meshStandardMaterial color={P.glass} transparent opacity={0.28} roughness={0.1} side={THREE.DoubleSide} forceSinglePass depthWrite={false} />
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
const PUFFS = 4;
const CHIMNEY = 1.35;

/**
 * Three saw-tooth sheds whose height follows the GDP level. Activity follows
 * the output gap: above potential the windows and roof lights glow and the
 * chimneys pour out smoke; deep below it the windows go dark and a thin
 * wisp barely rises.
 */
function Factories({ q, shown, reducedMotion }: Props) {
  const current = q.now;
  const height = 1.1 + clamp((current.gdpLevel - 100) * 0.07, -0.4, 2.4);
  const activity = clamp(0.65 + current.gap * 0.22, 0.03, 1.4);
  const sm = useSmooth({ height, activity }, 3, reducedMotion);
  const status = useStatus("growth");
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
  const last = useRef({ h: -1, a: -1 });
  /** With reduced motion the smoke stands still: write it once, then only when activity moves. */
  const smokeStill = useRef(false);
  useLayoutEffect(() => {
    primeInstances(teeth.current, colors.roof);
    primeInstances(skylights.current, colors.dark);
    primeInstances(panes.current, colors.dark);
    primeInstances(smoke.current, colors.smoke);
  }, [colors]);

  useFrame((state) => {
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

    // Smoke rises at an even, slow pace; a busier economy makes fuller, taller plumes.
    const sm2 = smoke.current;
    if (!sm2) return;
    if (reducedMotion && !changed && smokeStill.current) return;
    smokeStill.current = reducedMotion;
    const t = state.clock.elapsedTime;
    // The plume leans downwind and climbs higher when busy, short enough not to cross the next chimney's.
    const rise = 0.6 + 0.8 * a;
    const drift = 0.6 + 0.7 * a;
    for (let f = 0; f < FACTORY_X.length; f++) {
      const cx = FACTORY_X[f] + 0.35;
      const top = h + CHIMNEY + 0.05;
      for (let p = 0; p < PUFFS; p++) {
        const i = f * PUFFS + p;
        // Each puff's age on a loop from the clock, so the loop never jumps.
        const prog = reducedMotion ? (p + 0.5) / PUFFS : (t * 0.08 + p / PUFFS + f * 0.13) % 1;
        // Born small at the chimney mouth, it swells as it rises, then shrinks away at the top: no pop at either end.
        const fade = prog < 0.15 ? prog / 0.15 : prog > 0.7 ? (1 - prog) / 0.3 : 1;
        const size = (0.2 + prog * 0.5) * (0.3 + a * 0.7) * fade * clamp(a * 2.5, 0, 1);
        placeInstance(sm2, i, cx + prog * drift, top + prog * rise, -0.3 + prog * 0.5, Math.max(0.001, size));
        if (changed) sm2.setColorAt(i, TMP_COLOR.copy(colors.smoke).lerp(colors.soot, clamp(a - 0.6, 0, 0.8) * 0.4));
      }
    }
    sm2.instanceMatrix.needsUpdate = true;
    if (changed && sm2.instanceColor) sm2.instanceColor.needsUpdate = true;
  });

  return (
    <District focusKey="growth" q={q} shown={shown} status={status} tagAt={[0, height + 2.2, 0]} reducedMotion={reducedMotion}>
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

/** A low-poly freighter: hull with a pointed bow, bridge at the stern, boxes on deck. Its origin is the middle of the hull. */
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
function Port({ q, shown, reducedMotion }: Props) {
  const current = q.now;
  const exportsCount = clamp(3.5 + current.ca / 1.5, 0.3, MAX_CONTAINERS);
  const importsCount = clamp(3.5 - current.ca / 1.5, 0.3, MAX_CONTAINERS);
  // Ships at anchor beyond the one at the quay: more with a stronger current account and a weaker (more competitive) currency.
  // Whole ships only: one sails in or out at a time, never a toy-sized ship left half way.
  const ships = Math.round(clamp(1 + (current.ca + 4) / 3.5 + (current.rer - 100) / 30, 0, ANCHORAGE.length));
  const sm = useSmooth({ exportsCount, importsCount, ships }, 3, reducedMotion);
  const status = useStatus("ca");
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
    // The freighter at the quay is moored: it rides the swell in place, about the middle of its hull.
    const main = ship.current;
    if (main) {
      main.position.set(4.8, -0.42 + (reducedMotion ? 0 : Math.sin(t * 1.1) * 0.035), 2.7);
      main.rotation.set(0, 0, reducedMotion ? 0 : Math.sin(t * 0.8) * 0.02);
    }
    for (let i = 0; i < ANCHORAGE.length; i++) {
      const g = anchored.current[i];
      if (!g) continue;
      const v = clamp(n - i, 0, 1);
      g.visible = v > 0.002;
      if (!g.visible) continue;
      const [ax, az, heading] = ANCHORAGE[i];
      // A ship sails in from the open sea as it grows from nothing, and out again as it shrinks: no pop.
      g.position.set(ax + (1 - v) * 3, -0.42 + (reducedMotion ? 0 : Math.sin(t * 1.1 + i * 2) * 0.035), az);
      g.rotation.set(0, heading + (reducedMotion ? 0 : Math.sin(t * 0.15 + i) * 0.06), reducedMotion ? 0 : Math.sin(t * 0.8 + i) * 0.02);
      g.scale.setScalar(smoothstep(v));
    }
  });

  return (
    <District focusKey="ca" q={q} shown={shown} status={status} tagAt={[1.2, 3.0, 0.4]} reducedMotion={reducedMotion}>
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
function Vault({ q, shown, reducedMotion }: Props) {
  const current = q.now;
  const bars = useRef<THREE.InstancedMesh>(null);
  const gauge = useRef<THREE.Mesh>(null);
  const door = useRef<THREE.MeshStandardMaterial>(null);
  const gaugeMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const count = clamp(current.reserves * 2, 0, MAX_BARS);
  const level = clamp(current.reserves / GAUGE_MONTHS, 0, 1);
  const sm = useSmooth({ count, level, danger: current.reserves < 1 ? 1 : current.reserves < 3 ? 0.5 : 0 }, 3, reducedMotion);
  const status = useStatus("reserves");
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
    <District focusKey="reserves" q={q} shown={shown} status={status} tagAt={[0, 2.6, 0]} reducedMotion={reducedMotion}>
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
function Housing({ q, shown, reducedMotion }: Props) {
  const current = q.now;
  // Every window is lit at 3% unemployment; none at 18% or more.
  const lit = clamp(1 - (current.unemp - 3) / 15, 0, 1);
  const sm = useSmooth({ lit }, 3, reducedMotion);
  const status = useStatus("unemp");
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
    <District focusKey="unemp" q={q} shown={shown} status={status} tagAt={[0, 1.6, 0]} reducedMotion={reducedMotion}>
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

/** The lamp's height in the tower's own units. */
const LAMP_Y = 3.15;
/** The beam: rings along its length (distance from the lamp, radius, opacity). */
const BEAM: [number, number, number][] = [
  [0.3, 0.07, 0.55],
  [1.2, 0.17, 0.32],
  [2.4, 0.29, 0.14],
  [3.6, 0.4, 0],
];
const BEAM_SIDES = 14;

/**
 * A soft beam of light: an open cone from the lamp outward along +x, narrow at the lamp and
 * widening a little, its colour fading out along its length (alpha in the vertex colours).
 * It tips down slightly toward the sea, so seen from above it still starts in the lamp.
 */
function beamGeometry(color: string): THREE.BufferGeometry {
  const c = new THREE.Color(color);
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  for (let r = 0; r < BEAM.length; r++) {
    const [x, rad, a] = BEAM[r];
    for (let s = 0; s < BEAM_SIDES; s++) {
      const th = (s / BEAM_SIDES) * Math.PI * 2;
      pos.push(x, Math.cos(th) * rad, Math.sin(th) * rad);
      col.push(c.r, c.g, c.b, a);
    }
  }
  for (let r = 0; r < BEAM.length - 1; r++) {
    for (let s = 0; s < BEAM_SIDES; s++) {
      const a = r * BEAM_SIDES + s;
      const b = r * BEAM_SIDES + ((s + 1) % BEAM_SIDES);
      const a2 = a + BEAM_SIDES;
      const b2 = b + BEAM_SIDES;
      idx.push(a, a2, b, b, a2, b2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  return g;
}

/** A round, soft glow for the lamp: brightest in the middle, gone at the edge. */
function glowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Lighthouse: the brighter the beam, the more people trust the central bank. Two soft beams
 * leave the lamp in opposite directions and sweep slowly round the tower's axis, at lamp
 * height; a glow sits on the lamp. With reduced motion they hold still, side-on to the view.
 */
function Lighthouse({ q, shown, reducedMotion }: Props) {
  const current = q.now;
  const spin = useRef<THREE.Group>(null);
  const glowMat = useRef<THREE.SpriteMaterial>(null);
  const sm = useSmooth({ cred: current.cred / 100 }, 2, reducedMotion);
  const status = useStatus("cred");
  const geometry = useGeometry(() => beamGeometry(P.beam));
  // One material for both beams, both faces drawn in one pass (three otherwise draws a
  // transparent two-sided material twice a frame, and re-checks its shader each time).
  const beam = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false, toneMapped: false }), []);
  useEffect(() => () => beam.dispose(), [beam]);
  const glow = useMemo(glowTexture, []);
  useEffect(() => () => glow.dispose(), [glow]);
  useFrame((state) => {
    const c = sm.current.cred;
    if (spin.current) spin.current.rotation.y = reducedMotion ? 0 : state.clock.elapsedTime * 0.45;
    beam.opacity = 0.35 + 0.65 * c;
    if (glowMat.current) glowMat.current.opacity = 0.35 + 0.55 * c;
  });
  return (
    <District focusKey="cred" q={q} shown={shown} status={status} tagAt={[0, 4.3, 0]} reducedMotion={reducedMotion}>
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
      <mesh position-y={LAMP_Y}>
        <cylinderGeometry args={[0.36, 0.36, 0.5, 10]} />
        <meshStandardMaterial color={P.lampGlass} emissive={P.gold} emissiveIntensity={0.8} roughness={0.3} />
      </mesh>
      <mesh position-y={3.55} castShadow>
        <coneGeometry args={[0.5, 0.4, 10]} />
        <meshStandardMaterial color={P.accent} roughness={0.9} flatShading={P.flat} />
      </mesh>
      {/* The lamp's glow shows round the roof from any angle, so the beams have a source. */}
      <sprite position-y={LAMP_Y + 0.1} scale={1.9} renderOrder={2}>
        <spriteMaterial ref={glowMat} map={glow} color={P.beam} transparent depthWrite={false} depthTest={false} opacity={0.6} toneMapped={false} />
      </sprite>
      {/* The beams turn about the tower's axis, at the lamp; each starts inside the lamp glass
          and tips 8 degrees down toward the sea. */}
      <group ref={spin} position-y={LAMP_Y}>
        {[0, Math.PI].map((turn) => (
          <group key={turn} rotation-y={turn}>
            <mesh geometry={geometry} material={beam} rotation-z={-0.14} />
          </group>
        ))}
      </group>
    </District>
  );
}

// ---- Offshore tanker: oil price --------------------------------------------------------

/** The tanker: it shows up with an oil shock (or anywhere in free play), and rides the swell about its own middle. */
function Tanker({ q, shown, reducedMotion }: Props) {
  const current = q.now;
  const group = useRef<THREE.Group>(null);
  const dev = current.oil / WEO_REFERENCE.oilPrice - 1;
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    g.position.y = Math.sin(t * 0.8) * 0.05;
    g.rotation.z = Math.sin(t * 0.6) * 0.02;
  });
  return (
    <District focusKey="oil" q={q} shown={shown} tagAt={[0, 2.0, 0]} reducedMotion={reducedMotion}>
      <group ref={group} rotation-y={HULL_YAW}>
        <mesh castShadow>
          <boxGeometry args={[HULL_LENGTH, 0.7, 1.3]} />
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

/** Free play's capital tag: the country's name and a real-GDP index. The game's goal cards carry the figures instead. */
function CityBanner({ q }: { q: IslandQuarter }) {
  const presetId = useLab((s) => s.config.presetId);
  const mode = useIslandMode();
  const labels = useLab((s) => s.labels);
  const { x, z } = WORLD.sites.center;
  if (mode !== "sandbox") return null;
  const gdp = Math.round(q.now.gdpLevel);
  return <Tag position={[x, TOP + 2.0, z]} name={getPreset(presetId).name} value={`GDP index ${gdp}`} sr={`${getPreset(presetId).name}: real GDP index ${gdp} in ${q.now.label}.`} hidden={labels !== "all"} capital />;
}

/** Every landmark, reading the same quarter. */
export default function Districts({ reducedMotion }: { reducedMotion: boolean }) {
  const q = useIslandQuarter();
  const shown = useLandmarks(q.now);
  return (
    <group>
      <DebtTower q={q} shown={shown.has("debt")} reducedMotion={reducedMotion} />
      <CentralBank q={q} shown={shown.has("rate")} reducedMotion={reducedMotion} />
      <Thermometer q={q} shown={shown.has("infl")} reducedMotion={reducedMotion} />
      <Factories q={q} shown={shown.has("growth")} reducedMotion={reducedMotion} />
      <Port q={q} shown={shown.has("ca")} reducedMotion={reducedMotion} />
      <Vault q={q} shown={shown.has("reserves")} reducedMotion={reducedMotion} />
      <Housing q={q} shown={shown.has("unemp")} reducedMotion={reducedMotion} />
      <Lighthouse q={q} shown={shown.has("cred")} reducedMotion={reducedMotion} />
      <Tanker q={q} shown={shown.has("oil")} reducedMotion={reducedMotion} />
      <CityBanner q={q} />
    </group>
  );
}

export { GROUND };
