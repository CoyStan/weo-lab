"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from "react";
import * as THREE from "three";
import { getPreset } from "../model/presets";
import { SHOCKS } from "../model/shocks";
import { useLab } from "../store";
import type { FocusKey } from "../store";
import Districts, { DISTRICT_POS, LANDMARK_EXTENT, towerTop } from "./Districts";
import Island from "./Island";
import Water from "./Water";
import { clamp, useReducedMotionFlag } from "./useSmooth";
import Weather from "./Weather";
import { applyScenePalette, P } from "./palette";
import { labelLayer, markLabelsDirty, setLabelsPaused, startLabelDodge } from "./labelLayer";
import { ALL_LANDMARKS, useIslandMode, useIslandQuarter, useLandmarks, type IslandMode } from "./quarter";
import { getTheme } from "../themes";
import "./island.css";

/** A stable ref callback: registers the tag layer and runs its placement pass while mounted. */
function attachLabelLayer(el: HTMLDivElement | null) {
  labelLayer.current = el;
  if (!el) return;
  return startLabelDodge(el);
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full w-full items-center justify-center p-6 text-center text-(length:--t-sm) leading-relaxed text-[var(--lab-ink-2)]" role="status">
          The 3D view could not start in this browser (WebGL is unavailable). The indicators, charts and table below still reflect every change you make.
        </div>
      );
    }
    return this.props.children;
  }
}

function Lights() {
  return (
    <>
      <ambientLight intensity={P.ambient} />
      <hemisphereLight args={[P.hemiSky, P.hemiGround, P.hemi]} />
      <directionalLight
        position={[22, 30, 12]}
        intensity={P.sun}
        color={P.sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0006}
      />
    </>
  );
}

/** A strategy-game view: high, tilted toward the player, slightly off-axis. */
const HOME_DIR = new THREE.Vector3(6, 30.2, 29).normalize();
/** Share of the canvas the landmarks may fill, leaving room round them for the tags. */
const FILL = 0.8;
const corner = new THREE.Vector3();
const probe = new THREE.PerspectiveCamera();

/** The points the home view must hold: each landmark's footprint on the ground and the top of its tag's stem. */
const points: number[] = [];

/**
 * The home view for this canvas and these landmarks: always the same angle, centred on the
 * landmarks on show (and the town between them) and as close as they allow, so each piece is
 * as big as it can be on a phone, a laptop and a TV.
 */
function fitHome(camera: THREE.PerspectiveCamera, keys: Iterable<FocusKey>, pos: THREE.Vector3, target: THREE.Vector3, debtTop: number) {
  points.length = 0;
  const add = (x: number, z: number, w0: number, w1: number, n0: number, n1: number, h: number) => {
    for (const [dx, dz] of [
      [w0, n0],
      [w1, n0],
      [w0, n1],
      [w1, n1],
    ])
      points.push(x + dx, 0, z + dz);
    points.push(x, h + TAG_ROOM, z);
  };
  // The town is always in the picture.
  add(0, 0, -2.4, 2.4, -2.4, 2.4, 1.4);
  for (const k of keys) {
    const p = DISTRICT_POS[k];
    const e = LANDMARK_EXTENT[k];
    if (p && e) add(p[0], p[2], e[0], e[1], e[2], e[3], k === "debt" ? Math.max(e[4], debtTop) : e[4]);
  }
  const n = points.length / 3;
  target.set(0, 0.8, 0);
  for (let i = 0; i < n; i++) {
    target.x += points[i * 3] / n;
    target.z += points[i * 3 + 2] / n;
  }
  probe.copy(camera);
  probe.updateProjectionMatrix();
  const tan = Math.tan(THREE.MathUtils.degToRad(probe.fov / 2));
  let d = 42;
  for (let pass = 0; pass < 6; pass++) {
    probe.position.copy(target).addScaledVector(HOME_DIR, d);
    probe.lookAt(target);
    probe.updateMatrixWorld();
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < n; i++) {
      corner.set(points[i * 3], points[i * 3 + 1], points[i * 3 + 2]).project(probe);
      x0 = Math.min(x0, corner.x);
      x1 = Math.max(x1, corner.x);
      y0 = Math.min(y0, corner.y);
      y1 = Math.max(y1, corner.y);
    }
    // Centre the landmarks in the frame: slide the target across the ground (right, and
    // away from or toward the camera) by the box's offset from the middle of the canvas.
    const halfH = d * tan;
    const halfW = halfH * probe.aspect;
    target.x += RIGHT.x * ((x0 + x1) / 2) * halfW + (AWAY.x * (((y0 + y1) / 2) * halfH)) / SIN_ELEV;
    target.z += RIGHT.z * ((x0 + x1) / 2) * halfW + (AWAY.z * (((y0 + y1) / 2) * halfH)) / SIN_ELEV;
    d *= Math.max((x1 - x0) / 2, (y1 - y0) / 2) / FILL;
  }
  pos.copy(target).addScaledVector(HOME_DIR, clamp(d, 16, 56));
}
/** Across the screen, and straight away from the camera along the ground, for the home angle. */
const RIGHT = new THREE.Vector3(HOME_DIR.z, 0, -HOME_DIR.x).normalize();
const AWAY = new THREE.Vector3(-HOME_DIR.x, 0, -HOME_DIR.z).normalize();
const SIN_ELEV = HOME_DIR.y;
/** Room above the tallest landmark for its tag, in world units. */
const TAG_ROOM = 1.5;
/** The idle turn: one revolution in about five and a half minutes. */
const SPIN_RATE = (Math.PI * 2) / 330;
const UP = new THREE.Vector3(0, 1, 0);
const smoothstep = (x: number) => x * x * (3 - 2 * x);

/**
 * The camera. In the game the island holds still unless someone drags it, and comes back home
 * whenever the map is shown; behind the title screens and in free play it turns slowly once
 * left alone for a while. A click on a district flies in to it.
 */
function CameraRig({ reducedMotion, mode, paused }: { reducedMotion: boolean; mode: IslandMode; paused: boolean }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const focus = useLab((s) => s.focus);
  const cameraHome = useLab((s) => s.cameraHome);
  const clock = useThree((s) => s.clock);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const [interacting, setInteracting] = useState(false);
  const lastInteraction = useRef(-100);
  const { now } = useIslandQuarter();
  const shown = useLandmarks(now);
  // The debt tower grows a floor per 5% of GDP: the view makes room for a tall one, in steps,
  // so the camera does not creep every quarter.
  const debtTop = Math.ceil(towerTop(now.debt) / 1.5) * 1.5;
  const target = useMemo(() => new THREE.Vector3(0, 0.8, 0), []);
  const home = useMemo(() => new THREE.Vector3(6, 31, 29), []);
  const homeTarget = useMemo(() => new THREE.Vector3(0, 0.8, 0), []);
  /** The canvas size the camera was last fitted to: a resize snaps to the new home, a landmark rising glides. */
  const fittedTo = useRef("");
  /** Where the camera is flying to; cleared on arrival so the user can orbit freely. */
  const flyTo = useRef<THREE.Vector3 | null>(null);
  /** The player has moved the camera by hand since it was last home. */
  const moved = useRef(false);
  /** How far into its slow turn the camera is, 0 (still) to 1 (turning). */
  const spin = useRef(0);
  const offset = useMemo(() => new THREE.Vector3(), []);

  const snapHome = () => {
    flyTo.current = null;
    moved.current = false;
    camera.position.copy(home);
    target.copy(homeTarget);
    const c = controls.current;
    if (c) {
      c.target.copy(target);
      c.update();
    } else camera.lookAt(target);
  };

  // Fit the home view to the canvas and the landmarks on show. The first fit (and a resize)
  // puts the camera there at once; a landmark rising or sinking glides it there. Once the
  // player has moved the camera it stays where they put it.
  useLayoutEffect(() => {
    if (width < 2 || height < 2) return;
    // Behind the title screens the island is scenery: the whole of it, whatever the mission.
    fitHome(camera, mode === "backdrop" ? ALL_LANDMARKS : shown, home, homeTarget, debtTop);
    markLabelsDirty();
    const size = `${width}x${height}`;
    const resized = fittedTo.current !== size;
    fittedTo.current = size;
    if (moved.current || focus) return;
    if (resized || reducedMotion) snapHome();
    else flyTo.current = home.clone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, camera, shown, mode, debtTop]);

  useEffect(() => {
    const pos = focus ? DISTRICT_POS[focus] : undefined;
    if (!pos) return;
    // Keep the current viewing direction but come in close to the district.
    const t = new THREE.Vector3(pos[0], pos[1] + 1.2, pos[2]);
    const dir = camera.position.clone().sub(t).normalize();
    dir.y = Math.max(dir.y, 0.45);
    dir.normalize();
    flyTo.current = t.add(dir.multiplyScalar(focus === "oil" ? 18 : 12.5));
    moved.current = true;
  }, [focus, camera]);

  useEffect(() => {
    if (cameraHome > 0) {
      flyTo.current = home.clone();
      moved.current = false;
    }
  }, [cameraHome, home]);

  // The game's island comes back home whenever the map is shown (no frames are drawn while
  // it is hidden, so the next look at it starts from the usual view).
  useEffect(() => {
    if (!paused || mode !== "play") return;
    if (useLab.getState().focus) useLab.getState().setFocus(null);
    snapHome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, mode]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    const pos = focus ? DISTRICT_POS[focus] : undefined;
    if (pos) target.set(pos[0], pos[1] + 1.2, pos[2]);
    else target.copy(homeTarget);
    const k = reducedMotion ? 1 : Math.min(1, dt * 2.5);
    c.target.lerp(target, k);
    if (flyTo.current && !interacting) {
      camera.position.lerp(flyTo.current, k);
      if (camera.position.distanceTo(flyTo.current) < 0.05) flyTo.current = null;
    }
    // The slow turn: by the clock, not by the frame (drei's controls update once per frame,
    // so their own auto-rotate would run faster on a faster screen). It eases in and out over
    // two seconds rather than starting or stopping dead, and turns about the view's centre.
    const idle = clock.elapsedTime - lastInteraction.current > 10;
    const want = mode !== "play" && !reducedMotion && idle && !interacting && !focus && !flyTo.current ? 1 : 0;
    spin.current = want > spin.current ? Math.min(1, spin.current + dt / 2) : Math.max(0, spin.current - dt / 2);
    if (spin.current > 0) {
      offset.copy(camera.position).sub(c.target).applyAxisAngle(UP, SPIN_RATE * smoothstep(spin.current) * Math.min(dt, 0.1));
      camera.position.copy(c.target).add(offset);
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      minDistance={10}
      maxDistance={58}
      minPolarAngle={0.2}
      maxPolarAngle={1.12}
      enableDamping={!reducedMotion}
      dampingFactor={0.08}
      onStart={() => {
        setInteracting(true);
        flyTo.current = null;
        moved.current = true;
      }}
      onEnd={() => {
        setInteracting(false);
        lastInteraction.current = clock.elapsedTime;
      }}
    />
  );
}

/** Asks the tag layer to place the tags again whenever the camera or the canvas has moved. */
function LabelSync() {
  const last = useMemo(() => new Float32Array(18), []);
  useFrame(({ camera, size }) => {
    const e = camera.matrixWorld.elements;
    let changed = last[16] !== size.width || last[17] !== size.height;
    for (let i = 0; i < 16 && !changed; i++) if (Math.abs(e[i] - last[i]) > 1e-5) changed = true;
    if (!changed) return;
    for (let i = 0; i < 16; i++) last[i] = e[i];
    last[16] = size.width;
    last[17] = size.height;
    markLabelsDirty();
  });
  return null;
}

/**
 * The sun's shadows are drawn again only for a few seconds after the island changes (a new
 * quarter, a landmark rising or sinking), not every frame: nothing that casts a visible
 * shadow moves otherwise (the light is fixed; a turning camera does not change them).
 */
function ShadowPacer() {
  const gl = useThree((s) => s.gl);
  const clock = useThree((s) => s.clock);
  const { now } = useIslandQuarter();
  const shown = useLandmarks(now);
  const until = useRef(Infinity);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl]);
  useEffect(() => {
    until.current = clock.elapsedTime + 2.5;
  }, [now, shown, clock]);
  useFrame(({ clock: c }) => {
    if (c.elapsedTime < until.current) gl.shadowMap.needsUpdate = true;
  });
  return null;
}

function WeatherBridge({ reducedMotion }: { reducedMotion: boolean }) {
  const { now } = useIslandQuarter();
  const presetId = useLab((s) => s.config.presetId);
  const spreadBase = getPreset(presetId).params.spreadBase;
  const badShock = now.activeShocks.some((k) => SHOCKS[k].severity === "bad");
  // While the recap is open the sky clears to a light haze, so the payoff reads in full colour.
  const calm = useLab((s) => s.sceneCalm);
  const raw = badShock ? 1 : clamp((now.spread - spreadBase) / 900, 0, 0.6);
  const storm = calm ? Math.min(raw, 0.15) : raw;
  return (
    <>
      <Weather storm={storm} reducedMotion={reducedMotion} />
      <Water reducedMotion={reducedMotion} choppy={storm} />
    </>
  );
}

/**
 * Pausing (the play screen's island view while the map is up, a hidden tab, a canvas
 * scrolled out of view) stops the frame loop. Changing the frame loop restarts the canvas
 * clock at zero, which would throw every animation keyed to clock.elapsedTime back in time;
 * this runs first in every frame and carries the clock on from where it stopped, so on resume
 * nothing jumps by the time spent hidden. `onReady` fires once the first frames are drawn, so
 * the view can fade in on a finished picture.
 */
function PauseAndReady({ onReady }: { onReady?: () => void }) {
  const last = useRef(0);
  const frames = useRef(0);
  const ready = useRef(onReady);
  useEffect(() => {
    ready.current = onReady;
  });
  useFrame((state, dt) => {
    const clock = state.clock;
    if (clock.elapsedTime < last.current) clock.elapsedTime = last.current + Math.min(dt, 0.1);
    last.current = clock.elapsedTime;
    if (frames.current > 2) return;
    frames.current += 1;
    if (frames.current === 2) ready.current?.();
  }, -2);
  return null;
}

/** True while the page is in a background tab. */
function useDocumentHidden(): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return hidden;
}

/** True while the island is scrolled out of view (a phone reading the levers below it). */
function useOffscreen(): boolean {
  const [off, setOff] = useState(false);
  useEffect(() => {
    const el = labelLayer.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setOff(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return off;
}

export default function IslandScene({ paused = false, onReady }: { paused?: boolean; onReady?: () => void }) {
  const reducedMotion = useReducedMotionFlag();
  const themeId = useLab((s) => s.theme);
  const mode = useIslandMode();
  const docHidden = useDocumentHidden();
  const offscreen = useOffscreen();
  const idle = paused || docHidden || offscreen;
  useEffect(() => {
    setLabelsPaused(idle);
    return () => setLabelsPaused(false);
  }, [idle]);
  // Set the palette before the canvas (re)mounts; the key below remounts it on a theme change.
  applyScenePalette(getTheme(themeId).scene);
  return (
    <SceneErrorBoundary>
      <Canvas key={themeId} frameloop={idle ? "never" : "always"} shadows="percentage" dpr={[1, 1.5]} camera={{ position: [6, 31, 29], fov: 34, near: 0.5, far: 220 }} gl={{ antialias: true, powerPreference: "high-performance" }} onPointerMissed={() => useLab.getState().setFocus(null)}>
        <PauseAndReady onReady={onReady} />
        <fog attach="fog" args={[P.sky, 60, 140]} />
        <Lights />
        <Island reducedMotion={reducedMotion} />
        <Districts reducedMotion={reducedMotion} />
        <WeatherBridge reducedMotion={reducedMotion} />
        <CameraRig reducedMotion={reducedMotion} mode={mode} paused={paused} />
        <LabelSync />
        <ShadowPacer />
      </Canvas>
      {/* The landmark tags render here; see labelLayer.ts. */}
      <div ref={attachLabelLayer} className={`lab-label-layer pointer-events-none absolute inset-0 overflow-hidden${reducedMotion ? " is-still" : ""}`} />
    </SceneErrorBoundary>
  );
}
