"use client";

import { P, SC } from "./palette";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ConstraintVar } from "../model/types";
import * as THREE from "three";
import { fmt } from "../components/format";
import { regimeName } from "../model/economy";
import { getPreset, WEO_REFERENCE } from "../model/presets";
import { selectCurrent, selectPolicyNow, useLab, type FocusKey } from "../store";
import Label, { type IconName } from "./Label";
import { HEX, TOP } from "./hexmap";
import { WORLD } from "./world";
import { clamp, useSmooth } from "./useSmooth";

const NAVY = SC.accent;
const TEAL = SC.good;
const CORAL = SC.bad;
const AMBER = SC.warn;
const SKYBLUE = SC.cool;

const site = (k: keyof typeof WORLD.sites): [number, number, number] => [WORLD.sites[k].x, TOP, WORLD.sites[k].z];

/** Each district stands on its own hex; the tanker anchors offshore. */
export const DISTRICT_POS: Partial<Record<FocusKey, [number, number, number]>> = {
  debt: site("debt"),
  rate: site("rate"),
  infl: site("infl"),
  growth: site("growth"),
  ca: site("ca"),
  reserves: site("reserves"),
  unemp: site("unemp"),
  cred: site("cred"),
  oil: [15.5, 0, 5.5],
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

function District({ focusKey, position, labelY, labelX = 0, title, value, bad, tilt, children, reducedMotion }: { focusKey: FocusKey; position: [number, number, number]; labelY: number; labelX?: number; title: string; value: string; bad?: boolean; tilt?: number; children: ReactNode; reducedMotion: boolean; pad?: number }) {
  const style = DISTRICT_STYLE[focusKey] ?? { slot: 0, icon: "scroll" as IconName, scale: 1 };
  const color = P.districts[style.slot % P.districts.length];
  const focus = useLab((s) => s.focus);
  const setFocus = useLab((s) => s.setFocus);
  const labels = useLab((s) => s.labels);
  const breachedNow = useBreachedNow();
  const breached = (BREACH_MAP[focusKey] ?? []).some((v) => breachedNow.has(v));
  const [hover, setHover] = useState(false);
  const group = useRef<THREE.Group>(null);
  const active = hover || focus === focusKey;
  const showLabel = labels === "all" || active || breached;

  useEffect(() => {
    if (!hover) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const target = active ? 1.06 : 1;
    const k = reducedMotion ? 1 : Math.min(1, dt * 8);
    const s = g.scale.x + (target - g.scale.x) * k;
    g.scale.setScalar(s);
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
      <Label position={[labelX, labelY, 0]} title={breached ? `${title} · constraint breached` : title} value={value} bad={bad || breached} focus={active} tilt={tilt} hidden={!showLabel} accent={color} icon={style.icon} />
    </group>
  );
}

// ---- Treasury: debt tower --------------------------------------------------

const MAX_SLABS = 40;
const SLAB_PITCH = 0.3;

function DebtTower({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  const presetId = useLab((s) => s.config.presetId);
  const threshold = getPreset(presetId).params.debtThreshold;
  const slabs = useRef<(THREE.Mesh | null)[]>([]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.8, flatShading: true }), []);
  const sm = useSmooth({ count: clamp(current.debt / 5, 1, MAX_SLABS), danger: clamp((current.debt - threshold) / 40, 0, 1) }, 3, reducedMotion);
  const base = 1.0;
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const { count, danger } = sm.current;
    for (let i = 0; i < MAX_SLABS; i++) {
      const m = slabs.current[i];
      if (!m) continue;
      const v = clamp(count - i, 0, 1);
      m.visible = v > 0.01;
      m.scale.y = Math.max(0.01, v);
      m.position.y = base + i * SLAB_PITCH + (SLAB_PITCH * 0.9 * v) / 2;
    }
    material.color.copy(NAVY).lerp(AMBER, clamp(danger * 2, 0, 1)).lerp(CORAL, clamp(danger * 2 - 1, 0, 1));
  });

  const labelY = base + clamp(current.debt / 5, 1, MAX_SLABS) * SLAB_PITCH + 0.9;
  const bad = current.debt > threshold + 20;
  return (
    <District focusKey="debt" pad={1.9} position={DISTRICT_POS.debt!} labelY={labelY} labelX={-1.2} title="Treasury" value={`Debt ${fmt(current.debt, 0)}% GDP`} bad={bad} tilt={-1.2} reducedMotion={reducedMotion}>
      <mesh position-y={0.5} castShadow receiveShadow>
        <boxGeometry args={[2.4, 1.0, 2.4]} />
        <meshStandardMaterial color={P.cream} roughness={0.9} flatShading={P.flat} />
      </mesh>
      <mesh position={[0, 0.35, 1.21]}>
        <boxGeometry args={[0.5, 0.7, 0.02]} />
        <meshStandardMaterial color={P.accent} roughness={0.8} />
      </mesh>
      {Array.from({ length: MAX_SLABS }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            slabs.current[i] = el;
          }}
          material={material}
          castShadow
          receiveShadow
          visible={false}
        >
          <boxGeometry args={[1.5, SLAB_PITCH * 0.9, 1.5]} />
        </mesh>
      ))}
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
  return (
    <District focusKey="rate" pad={2.35} position={DISTRICT_POS.rate!} labelY={6.1} title={`Central bank · ${stanceWord}`} value={`${fmt(current.rate, 2)}% · ${regimeName(current.regime)}`} tilt={0.8} reducedMotion={reducedMotion}>
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

function Thermometer({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  const policy = useLab(selectPolicyNow);
  const mercury = useRef<THREE.Mesh>(null);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: TEAL, roughness: 0.4, emissive: TEAL, emissiveIntensity: 0.25 }), []);
  const scaleMax = 20;
  const tube = 4.0;
  const fill = clamp(current.infl / scaleMax, 0.02, 1.05);
  const dev = current.infl - policy.inflationTarget;
  const tone = Math.abs(dev) <= 1.5 ? 0 : dev > 0 ? 1 : -1;
  const sm = useSmooth({ fill, tone }, 3, reducedMotion);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    const { fill: f, tone: t } = sm.current;
    if (mercury.current) {
      mercury.current.scale.y = Math.max(0.01, f);
      mercury.current.position.y = 0.55 + (tube * f) / 2;
    }
    SCRATCH.copy(TEAL).lerp(t >= 0 ? CORAL : SKYBLUE, Math.abs(t));
    material.color.copy(SCRATCH);
    material.emissive.copy(SCRATCH);
  });
  const targetY = 0.55 + tube * clamp(policy.inflationTarget / scaleMax, 0, 1);
  return (
    <District focusKey="infl" pad={1.0} position={DISTRICT_POS.infl!} labelY={1.9} labelX={1.6} title="Campus · inflation" value={`${fmt(current.infl, 1)}% (target ${fmt(policy.inflationTarget, 1)})`} bad={Math.abs(dev) > 3} tilt={1.5} reducedMotion={reducedMotion}>
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
    </District>
  );
}

// ---- Industrial district: output and growth ----------------------------------

function Factories({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  const puffs = useRef<(THREE.Mesh | null)[]>([]);
  const height = 1.1 + clamp((current.gdpLevel - 100) * 0.07, -0.4, 2.4);
  const activity = clamp(0.6 + current.gap * 0.25, 0, 1.4);
  const sm = useSmooth({ height, activity }, 3, reducedMotion);
  const bodies = useRef<(THREE.Mesh | null)[]>([]);
  const chimneys = useRef<(THREE.Mesh | null)[]>([]);
  const windows = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

  useFrame((state) => {
    const { height: h, activity: a } = sm.current;
    const t = state.clock.elapsedTime;
    for (let f = 0; f < 3; f++) {
      const body = bodies.current[f];
      if (body) {
        body.scale.y = h;
        body.position.y = h / 2;
      }
      const chimney = chimneys.current[f];
      if (chimney) chimney.position.y = h + 0.5;
      const win = windows.current[f];
      if (win) win.emissiveIntensity = clamp(a - 0.3, 0, 1) * 0.9;
      for (let p = 0; p < 3; p++) {
        const puff = puffs.current[f * 3 + p];
        if (!puff) continue;
        const progress = reducedMotion ? (p + 0.5) / 3 : ((t * 0.45 + p / 3 + f * 0.17) % 1);
        puff.position.y = h + 1.0 + progress * 1.6;
        puff.position.x = f * 1.6 - 1.6 + 0.35 + progress * 0.3;
        const size = (0.12 + progress * 0.28) * a;
        puff.scale.setScalar(Math.max(0.001, size));
        const mat = puff.material as THREE.MeshStandardMaterial;
        mat.opacity = clamp((1 - progress) * 0.55 * a, 0, 0.7);
        puff.visible = a > 0.05;
      }
    }
  });

  return (
    <District focusKey="growth" pad={2.6} position={DISTRICT_POS.growth!} labelY={height + 3.0} title="Industry" value={`Growth ${fmt(current.growth, 1)}%`} bad={current.growth < 0} tilt={-0.6} reducedMotion={reducedMotion}>
      {[0, 1, 2].map((f) => (
        <group key={f} position-x={f * 1.6 - 1.6}>
          <mesh
            ref={(el) => {
              bodies.current[f] = el;
            }}
            position-y={0.55}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[1.25, 1, 1.4]} />
            <meshStandardMaterial color={f === 1 ? P.building2 : P.cream} roughness={0.95} flatShading={P.flat} />
          </mesh>
          <mesh position={[0, 0.5, 0.71]}>
            <planeGeometry args={[0.9, 0.35]} />
            <meshStandardMaterial
              ref={(el) => {
                windows.current[f] = el;
              }}
              color={P.window}
              emissive={P.good}
              emissiveIntensity={0}
              roughness={0.4}
            />
          </mesh>
          <mesh
            ref={(el) => {
              chimneys.current[f] = el;
            }}
            position={[0.35, 1.5, -0.3]}
            castShadow
          >
            <cylinderGeometry args={[0.16, 0.2, 1.0, 7]} />
            <meshStandardMaterial color={P.chimney} roughness={1} />
          </mesh>
          {[0, 1, 2].map((p) => (
            <mesh
              key={p}
              ref={(el) => {
                puffs.current[f * 3 + p] = el;
              }}
              position={[0.35, 2.5, -0.3]}
            >
              <sphereGeometry args={[1, 8, 6]} />
              <meshStandardMaterial color={P.smoke} transparent opacity={0.4} roughness={1} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ))}
    </District>
  );
}

// ---- Port: trade and the current account --------------------------------------

const MAX_CONTAINERS = 8;

function Port({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  const exportsCount = clamp(3.5 + current.ca / 1.5, 0.3, MAX_CONTAINERS);
  const importsCount = clamp(3.5 - current.ca / 1.5, 0.3, MAX_CONTAINERS);
  const sm = useSmooth({ exportsCount, importsCount }, 3, reducedMotion);
  const exportRefs = useRef<(THREE.Mesh | null)[]>([]);
  const importRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ship = useRef<THREE.Group>(null);

  useFrame((state) => {
    const { exportsCount: e, importsCount: m } = sm.current;
    const apply = (refs: (THREE.Mesh | null)[], count: number) => {
      for (let i = 0; i < MAX_CONTAINERS; i++) {
        const mesh = refs[i];
        if (!mesh) continue;
        const v = clamp(count - i, 0, 1);
        mesh.visible = v > 0.02;
        mesh.scale.y = Math.max(0.01, v);
        const col = i % 2;
        const row = Math.floor(i / 2);
        mesh.position.set(col * 0.95 - 0.47, 0.45 + row * 0.44 + (0.42 * v) / 2, 0);
      }
    };
    apply(exportRefs.current, e);
    apply(importRefs.current, m);
    if (ship.current) {
      const t = reducedMotion ? 0 : state.clock.elapsedTime;
      const x = 5.4 + Math.sin(t * 0.22) * 1.6;
      ship.current.position.set(x, -0.42 + (reducedMotion ? 0 : Math.sin(t * 1.3) * 0.04), 2.7);
      ship.current.rotation.y = Math.cos(t * 0.22) >= 0 ? 0 : Math.PI;
      ship.current.rotation.z = reducedMotion ? 0 : Math.sin(t * 0.9) * 0.03;
    }
  });

  return (
    <District focusKey="ca" position={DISTRICT_POS.ca!} labelY={3.3} title="Harbour · current acct" value={`${fmt(current.ca, 1, true)}% GDP`} bad={current.ca < -6} tilt={1} reducedMotion={reducedMotion}>
      <mesh position={[1.2, 0.15, 0.4]} receiveShadow castShadow>
        <boxGeometry args={[5.2, 0.3, 2.6]} />
        <meshStandardMaterial color={P.dock} roughness={1} flatShading={P.flat} />
      </mesh>
      <group position={[-0.9, 0, -0.4]}>
        {Array.from({ length: MAX_CONTAINERS }, (_, i) => (
          <mesh
            key={i}
            ref={(el) => {
              exportRefs.current[i] = el;
            }}
            castShadow
            visible={false}
          >
            <boxGeometry args={[0.9, 0.42, 0.55]} />
            <meshStandardMaterial color={P.good} roughness={0.7} flatShading={P.flat} />
          </mesh>
        ))}
      </group>
      <group position={[1.2, 0, -0.4]}>
        {Array.from({ length: MAX_CONTAINERS }, (_, i) => (
          <mesh
            key={i}
            ref={(el) => {
              importRefs.current[i] = el;
            }}
            castShadow
            visible={false}
          >
            <boxGeometry args={[0.9, 0.42, 0.55]} />
            <meshStandardMaterial color={P.bad} roughness={0.7} flatShading={P.flat} />
          </mesh>
        ))}
      </group>
      {/* Crane */}
      <mesh position={[2.9, 1.2, -0.2]} castShadow>
        <boxGeometry args={[0.18, 2.4, 0.18]} />
        <meshStandardMaterial color={P.accent} roughness={0.8} />
      </mesh>
      <mesh position={[2.3, 2.35, -0.2]} castShadow>
        <boxGeometry args={[2.4, 0.14, 0.14]} />
        <meshStandardMaterial color={P.accent} roughness={0.8} />
      </mesh>
      {/* Ship */}
      <group ref={ship} position={[5.4, -0.42, 2.7]}>
        <mesh castShadow>
          <boxGeometry args={[1.9, 0.5, 0.8]} />
          <meshStandardMaterial color={P.accent} roughness={0.7} flatShading={P.flat} />
        </mesh>
        <mesh position={[-0.5, 0.45, 0]} castShadow>
          <boxGeometry args={[0.6, 0.45, 0.6]} />
          <meshStandardMaterial color={P.cream} roughness={0.9} />
        </mesh>
        <mesh position={[0.4, 0.4, 0]}>
          <boxGeometry args={[0.8, 0.3, 0.55]} />
          <meshStandardMaterial color={P.gold} roughness={0.8} />
        </mesh>
      </group>
    </District>
  );
}

// ---- Reserve vault --------------------------------------------------------------

const MAX_BARS = 28;

function Vault({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  const door = useRef<THREE.MeshStandardMaterial>(null);
  const count = clamp(current.reserves * 2, 0, MAX_BARS);
  const sm = useSmooth({ count, danger: current.reserves < 1 ? 1 : current.reserves < 3 ? 0.5 : 0 }, 3, reducedMotion);
  useFrame(() => {
    const { count: c, danger } = sm.current;
    for (let i = 0; i < MAX_BARS; i++) {
      const m = bars.current[i];
      if (!m) continue;
      const v = clamp(c - i, 0, 1);
      m.visible = v > 0.02;
      m.scale.setScalar(Math.max(0.01, v));
      const layer = Math.floor(i / 7);
      const col = i % 7;
      m.position.set(col * 0.46 - 1.38, 0.18 + layer * 0.2, 1.9 + (layer % 2) * 0.05);
    }
    if (door.current) door.current.color.copy(NAVY).lerp(CORAL, danger);
  });
  return (
    <District focusKey="reserves" pad={2.1} position={DISTRICT_POS.reserves!} labelY={2.9} title="Reserve vault" value={`${fmt(current.reserves, 1)} mo. imports`} bad={current.reserves < 2} tilt={-1.5} reducedMotion={reducedMotion}>
      <mesh position-y={0.85} castShadow receiveShadow>
        <boxGeometry args={[2.6, 1.7, 2.2]} />
        <meshStandardMaterial color={P.vault} roughness={0.9} flatShading={P.flat} />
      </mesh>
      <mesh position={[0, 0.8, 1.11]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.55, 0.55, 0.08, 20]} />
        <meshStandardMaterial ref={door} color={P.accent} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.8, 1.16]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.25, 0.04, 8, 20]} />
        <meshStandardMaterial color={P.gold} roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.03, 1.95]} receiveShadow>
        <boxGeometry args={[3.4, 0.06, 1.1]} />
        <meshStandardMaterial color={P.pallet} roughness={1} />
      </mesh>
      {Array.from({ length: MAX_BARS }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            bars.current[i] = el;
          }}
          castShadow
          visible={false}
        >
          <boxGeometry args={[0.4, 0.18, 0.22]} />
          <meshStandardMaterial color={P.gold} roughness={0.35} metalness={0.7} />
        </mesh>
      ))}
    </District>
  );
}

// ---- Housing: unemployment --------------------------------------------------------

const HOUSES = 12;

function Housing({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  const dark = clamp(Math.round((HOUSES * current.unemp) / 24), 0, HOUSES);
  const roofs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const bodies = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const sm = useSmooth({ dark }, 3, reducedMotion);
  const lit = useMemo(() => ({ roof: new THREE.Color(P.roof), body: new THREE.Color(P.cream) }), []);
  const off = useMemo(() => ({ roof: new THREE.Color(P.roofOff), body: new THREE.Color(P.houseOff) }), []);
  useFrame(() => {
    const d = sm.current.dark;
    for (let i = 0; i < HOUSES; i++) {
      // Houses go dark from the back row forward.
      const k = clamp(d - (HOUSES - 1 - i), 0, 1);
      roofs.current[i]?.color.copy(lit.roof).lerp(off.roof, k);
      bodies.current[i]?.color.copy(lit.body).lerp(off.body, k);
    }
  });
  return (
    <District focusKey="unemp" pad={2.2} position={DISTRICT_POS.unemp!} labelY={2.1} title="Neighbourhood" value={`Jobless ${fmt(current.unemp, 1)}%`} bad={current.unemp > 12} tilt={0.6} reducedMotion={reducedMotion}>
      {Array.from({ length: HOUSES }, (_, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        return (
          <group key={i} position={[col * 0.9 - 1.35, 0, row * 0.9 - 0.9]}>
            <mesh position-y={0.28} castShadow receiveShadow>
              <boxGeometry args={[0.62, 0.56, 0.62]} />
              <meshStandardMaterial
                ref={(el) => {
                  bodies.current[i] = el;
                }}
                color={P.cream}
                roughness={0.95}
                flatShading
              />
            </mesh>
            <mesh position-y={0.78} rotation-y={Math.PI / 4} castShadow>
              <coneGeometry args={[0.52, 0.42, 4]} />
              <meshStandardMaterial
                ref={(el) => {
                  roofs.current[i] = el;
                }}
                color={P.roof}
                roughness={0.95}
                flatShading
              />
            </mesh>
          </group>
        );
      })}
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
    <District focusKey="cred" pad={1.25} position={DISTRICT_POS.cred!} labelY={4.4} title="Lighthouse" value={`Credibility ${fmt(current.cred, 0)}`} bad={current.cred < 30} tilt={-0.8} reducedMotion={reducedMotion}>
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
    <District focusKey="oil" position={DISTRICT_POS.oil!} labelY={2.2} title="Tanker · oil" value={`$${fmt(current.oil, 0)}${Math.abs(dev) > 0.05 ? ` (${fmt(dev * 100, 0, true)}%)` : ""}`} bad={dev > 0.3} tilt={1.2} reducedMotion={reducedMotion}>
      <group ref={group} rotation-y={-0.5}>
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
  const { x, z } = WORLD.sites.center;
  return <Label position={[x, TOP + 2.35, z]} title="Capital · GDP index" value={`${getPreset(presetId).name} · ${gdp}`} accent={P.border} icon="crown" capital />;
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
