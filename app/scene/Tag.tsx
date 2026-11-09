"use client";

import { Html } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { labelLayer } from "./labelLayer";

export type TagStatus = "at-risk" | "failed" | "breached";
const STATUS_WORD: Record<TagStatus, string> = { "at-risk": "at risk", failed: "off track", breached: "limit breached" };

const v = new THREE.Vector3();
/**
 * drei's default places the tag with a new [x, y] array every frame. This writes into two
 * arrays in turn instead (drei compares the new position with the last one it was given, so
 * it must not get the same array twice running): no allocation per frame.
 */
function makeCalculate() {
  const a = [0, 0];
  const b = [0, 0];
  let flip = false;
  return (el: THREE.Object3D, camera: THREE.Camera, size: { width: number; height: number }) => {
    v.setFromMatrixPosition(el.matrixWorld).project(camera);
    flip = !flip;
    const out = flip ? a : b;
    out[0] = v.x * (size.width / 2) + size.width / 2;
    out[1] = -(v.y * (size.height / 2)) + size.height / 2;
    return out;
  };
}

/**
 * A landmark's one-line tag, pinned in 3D: what it is, which way it is going and the
 * figure, "Inflation ▲ 7.1%", and a word when its goal is in trouble ("· at risk"). The
 * tag layer (labelLayer.ts) places it clear of the other tags and inside the island's
 * frame, with a thin stem back down to the building. It stays mounted and hides with CSS:
 * drei's Html portals into the layer, and mounting it on every hover races React.
 */
export default function Tag({
  position,
  name,
  arrow,
  value,
  status,
  hidden = false,
  focus = false,
  capital = false,
  sr,
}: {
  position: [number, number, number];
  name: string;
  /** "up", "down", or none when the figure is flat. */
  arrow?: "up" | "down";
  value: string;
  status?: TagStatus;
  hidden?: boolean;
  focus?: boolean;
  /** The capital's tag (free play): ink-filled. */
  capital?: boolean;
  /** The same in words, for screen readers. */
  sr?: string;
}) {
  const calculate = useMemo(makeCalculate, []);
  return (
    <Html position={position} calculatePosition={calculate} zIndexRange={[8, 0]} style={{ pointerEvents: "none" }} portal={labelLayer as React.RefObject<HTMLElement>}>
      <div className={`isl-pin${hidden ? " is-hidden" : ""}${focus ? " is-focus" : ""}${status ? ` has-status is-${status}` : ""}${capital ? " is-capital" : ""}`} aria-hidden={hidden || undefined}>
        <span className="isl-stem" aria-hidden="true" />
        <span className="isl-tag" aria-hidden={sr ? true : undefined}>
          <span className="isl-tag-name">{name}</span>
          {arrow ? (
            <span className={`isl-tag-arrow is-${arrow}`} aria-hidden="true">
              {arrow === "up" ? "▲" : "▼"}
            </span>
          ) : null}
          <strong className="isl-tag-value">{value}</strong>
          {status ? (
            <>
              <span className="isl-tag-sep" aria-hidden="true">
                ·
              </span>
              <span className="isl-tag-status">{STATUS_WORD[status]}</span>
            </>
          ) : null}
        </span>
        {sr ? <span className="isl-sr">{sr}</span> : null}
      </div>
    </Html>
  );
}
