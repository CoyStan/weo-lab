"use client";

import { P, SC } from "./palette";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clamp, lerp } from "./useSmooth";

const SKY_CLEAR = SC.sky;
const SKY_STORM = SC.skyStorm;
const CLOUD_CLEAR = SC.cloud;
const CLOUD_STORM = SC.cloudStorm;

// Clouds drift high over the open sea around the map, framing it without hiding it.
const CLOUDS: { x: number; z: number; s: number; speed: number }[] = [
  { x: -24, z: -14, s: 1.3, speed: 0.25 },
  { x: 16, z: -24, s: 1.1, speed: 0.18 },
  { x: 27, z: 8, s: 1.4, speed: 0.22 },
  { x: -18, z: 22, s: 1.2, speed: 0.2 },
  { x: 4, z: -28, s: 1.2, speed: 0.15 },
  { x: -29, z: 4, s: 1.0, speed: 0.17 },
  { x: 20, z: 24, s: 1.1, speed: 0.19 },
]

const PUFFS: [number, number, number, number][] = [
  [0, 0, 0, 1.1],
  [1.0, 0.2, 0.3, 0.8],
  [-1.0, 0.1, -0.2, 0.85],
  [0.3, 0.5, -0.6, 0.7],
];

const DROPS = 260;

/**
 * Sky colour, cloud cover and rain respond to the storm level:
 * 0 is a clear day; 1 is a shock in progress. The clouds drift a little to and fro on slow
 * sine waves (no seam); the rain fades in and out with the storm rather than switching on.
 * With reduced motion the clouds and the rain hold still and the sky is the same.
 */
export default function Weather({ storm, reducedMotion }: { storm: number; reducedMotion: boolean }) {
  const scene = useThree((s) => s.scene);
  const level = useRef(0);
  const cloudGroup = useRef<THREE.Group>(null);
  const rain = useRef<THREE.InstancedMesh>(null);
  const rainMaterial = useRef<THREE.MeshBasicMaterial>(null);
  /** With reduced motion the drops are written once and then left alone. */
  const rainStill = useRef(false);
  const cloudMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: P.cloud, transparent: true, opacity: 0.8, roughness: 1 }), []);
  const drops = useMemo(() => {
    const arr: { x: number; y: number; z: number; v: number }[] = [];
    for (let i = 0; i < DROPS; i++) arr.push({ x: (Math.random() - 0.5) * 44, y: Math.random() * 12, z: (Math.random() - 0.5) * 44, v: 7 + Math.random() * 3 });
    return arr;
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const bg = useMemo(() => new THREE.Color(SKY_CLEAR), []);

  useEffect(() => () => cloudMaterial.dispose(), [cloudMaterial]);

  useFrame((state, dt) => {
    const k = reducedMotion ? 1 : Math.min(1, dt * 1.5);
    level.current = lerp(level.current, clamp(storm, 0, 1), k);
    const s = level.current;
    bg.copy(SKY_CLEAR).lerp(SKY_STORM, s);
    scene.background = bg;
    if (scene.fog) scene.fog.color.copy(bg);
    cloudMaterial.color.copy(CLOUD_CLEAR).lerp(CLOUD_STORM, s);
    cloudMaterial.opacity = 0.75 + 0.25 * s;
    if (cloudGroup.current) {
      const t = state.clock.elapsedTime;
      const clouds = cloudGroup.current.children;
      for (let i = 0; i < clouds.length && i < CLOUDS.length; i++) {
        const c = clouds[i];
        const spec = CLOUDS[i];
        c.position.x = spec.x + (reducedMotion ? 0 : Math.sin(t * spec.speed + i) * 1.5);
        c.position.y = 7 - s * 1.5 + (reducedMotion ? 0 : Math.sin(t * 0.3 + i) * 0.15);
        c.scale.setScalar(spec.s * (1 + s * 0.35));
      }
    }
    const r = rain.current;
    if (r) {
      // Rain thickens in over the second half of the storm scale.
      const amount = clamp((s - 0.4) / 0.4, 0, 1);
      if (rainMaterial.current) rainMaterial.current.opacity = 0.55 * amount;
      r.visible = amount > 0.01;
      if (r.visible && !(reducedMotion && rainStill.current)) {
        for (let i = 0; i < drops.length; i++) {
          const d = drops[i];
          if (!reducedMotion) {
            d.y -= d.v * dt;
            // A drop that reaches the sea starts again high above, where it is lost in the cloud.
            if (d.y < 0) d.y += 11;
          }
          dummy.position.set(d.x, d.y, d.z);
          dummy.updateMatrix();
          r.setMatrixAt(i, dummy.matrix);
        }
        r.instanceMatrix.needsUpdate = true;
      }
      rainStill.current = reducedMotion && r.visible;
    }
  });

  return (
    <group>
      <group ref={cloudGroup}>
        {CLOUDS.map((c, i) => (
          <group key={i} position={[c.x, 7, c.z]}>
            {PUFFS.map(([x, y, z, r], j) => (
              <mesh key={j} position={[x, y, z]} material={cloudMaterial}>
                <sphereGeometry args={[r, 10, 8]} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      <instancedMesh ref={rain} args={[undefined, undefined, DROPS]} visible={false} frustumCulled={false}>
        <cylinderGeometry args={[0.014, 0.014, 0.5, 3]} />
        <meshBasicMaterial ref={rainMaterial} color={P.rain} transparent opacity={0} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
