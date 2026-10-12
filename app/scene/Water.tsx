"use client";

import { P } from "./palette";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

/**
 * Low-poly sea: a faceted plane whose vertices bob on a few crossing waves,
 * with a calm outer plane that the fog swallows at the horizon.
 */
export default function Water({ reducedMotion, choppy }: { reducedMotion: boolean; choppy: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(110, 110, 72, 72);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const base = useMemo(() => Float32Array.from(geometry.attributes.position.array as Float32Array), [geometry]);

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const amp = 0.04 + 0.12 * choppy;
    for (let i = 0; i < arr.length; i += 3) {
      const x = base[i];
      const z = base[i + 2];
      // Calm water near the shore, more swell further out.
      const r = Math.hypot(x, z);
      const fade = 0.25 + 0.75 * Math.min(1, Math.max(0, (r - 14) / 12));
      arr[i + 1] = fade * amp * (Math.sin(x * 0.45 + t * 1.1) + Math.cos(z * 0.38 - t * 0.9) * 0.8 + Math.sin((x + z) * 0.9 + t * 1.7) * 0.35);
    }
    pos.needsUpdate = true;
  });

  return (
    <group>
      {/* Translucent swell over the hex sea tiles, so their shallow and deep colours show through. */}
      <mesh geometry={geometry} position-y={0.0}>
        <meshStandardMaterial color={P.water} roughness={0.25} metalness={0.1} transparent opacity={0.42} flatShading depthWrite={false} />
      </mesh>
      {/* Open ocean beyond the map. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.3}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={P.deep} roughness={0.6} />
      </mesh>
    </group>
  );
}
