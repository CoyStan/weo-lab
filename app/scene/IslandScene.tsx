"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from "react";
import * as THREE from "three";
import { getPreset } from "../model/presets";
import { SHOCKS } from "../model/shocks";
import { selectCurrent, useLab } from "../store";
import Districts, { DISTRICT_POS } from "./Districts";
import Island from "./Island";
import Traffic from "./Traffic";
import Water from "./Water";
import { clamp, useReducedMotionFlag } from "./useSmooth";
import Weather from "./Weather";
import { applyScenePalette, P } from "./palette";
import { labelLayer } from "./labelLayer";
import { getTheme } from "../themes";

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full w-full items-center justify-center p-6 text-center text-[0.8rem] leading-relaxed text-[#4A4D73]" role="status">
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
const HOME = new THREE.Vector3(6, 31, 29);

function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const focus = useLab((s) => s.focus);
  const cameraHome = useLab((s) => s.cameraHome);
  const clock = useThree((s) => s.clock);
  const camera = useThree((s) => s.camera);
  const [interacting, setInteracting] = useState(false);
  const lastInteraction = useRef(-100);
  const target = useMemo(() => new THREE.Vector3(0, 0.8, 0), []);
  /** Where the camera is flying to; cleared on arrival so the user can orbit freely. */
  const flyTo = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    const pos = focus ? DISTRICT_POS[focus] : undefined;
    if (!pos) return;
    // Keep the current viewing direction but come in close to the district.
    const t = new THREE.Vector3(pos[0], pos[1] + 1.2, pos[2]);
    const dir = camera.position.clone().sub(t).normalize();
    dir.y = Math.max(dir.y, 0.45);
    dir.normalize();
    flyTo.current = t.add(dir.multiplyScalar(focus === "oil" ? 18 : 12.5));
  }, [focus, camera]);

  useEffect(() => {
    if (cameraHome > 0) flyTo.current = HOME.clone();
  }, [cameraHome]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    const pos = focus ? DISTRICT_POS[focus] : undefined;
    if (pos) target.set(pos[0], pos[1] + 1.2, pos[2]);
    else target.set(0, 0.8, 0);
    const k = reducedMotion ? 1 : Math.min(1, dt * 2.5);
    c.target.lerp(target, k);
    if (flyTo.current && !interacting) {
      camera.position.lerp(flyTo.current, k);
      if (camera.position.distanceTo(flyTo.current) < 0.05) flyTo.current = null;
    }
    const idle = clock.elapsedTime - lastInteraction.current > 10;
    c.autoRotate = !reducedMotion && idle && !interacting && !focus;
    c.update();
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
      autoRotateSpeed={0.18}
      enableDamping
      dampingFactor={0.08}
      onStart={() => {
        setInteracting(true);
        flyTo.current = null;
      }}
      onEnd={() => {
        setInteracting(false);
        lastInteraction.current = clock.elapsedTime;
      }}
    />
  );
}

function WeatherBridge({ reducedMotion }: { reducedMotion: boolean }) {
  const current = useLab(selectCurrent);
  const presetId = useLab((s) => s.config.presetId);
  const spreadBase = getPreset(presetId).params.spreadBase;
  const badShock = current.activeShocks.some((k) => SHOCKS[k].severity === "bad");
  const storm = badShock ? 1 : clamp((current.spread - spreadBase) / 900, 0, 0.6);
  return (
    <>
      <Weather storm={storm} reducedMotion={reducedMotion} />
      <Water reducedMotion={reducedMotion} choppy={storm} />
    </>
  );
}

export default function IslandScene() {
  const reducedMotion = useReducedMotionFlag();
  const themeId = useLab((s) => s.theme);
  // Set the palette before the canvas (re)mounts; the key below remounts it on a theme change.
  applyScenePalette(getTheme(themeId).scene);
  return (
    <SceneErrorBoundary>
      <Canvas key={themeId} shadows="percentage" dpr={[1, 1.5]} camera={{ position: [6, 31, 29], fov: 34, near: 0.5, far: 220 }} gl={{ antialias: true, powerPreference: "high-performance" }} onPointerMissed={() => useLab.getState().setFocus(null)}>
        <fog attach="fog" args={[P.sky, 55, 130]} />
        <Lights />
        <Island reducedMotion={reducedMotion} />
        <Districts reducedMotion={reducedMotion} />
        <Traffic reducedMotion={reducedMotion} />
        <WeatherBridge reducedMotion={reducedMotion} />
        <CameraRig reducedMotion={reducedMotion} />
      </Canvas>
      {/* Overlays (district banners) render here; see labelLayer.ts. */}
      <div
        ref={(el) => {
          labelLayer.current = el;
        }}
        className="pointer-events-none absolute inset-0 overflow-hidden"
      />
    </SceneErrorBoundary>
  );
}
