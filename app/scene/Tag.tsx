"use client";

import { Html } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { labelLayer } from "./labelLayer";

export type TagStatus = "at-risk" | "failed" | "breached";
const STATUS_WORD: Record<TagStatus, string> = { "at-risk": "at risk", failed: "off track", breached: "limit breached" };
/** The status word with the quarter that decides an every-quarter goal: "at risk in 2026Q4", "missed in 2026Q3". */
const statusText = (status: TagStatus, when?: string) => (when ? `${status === "failed" ? "missed" : STATUS_WORD[status]} in ${when}` : STATUS_WORD[status]);
/** The same for screen readers, after the figure: "Goal at risk in 2026Q4." */
const statusSr = (status: TagStatus, when?: string) => (status === "breached" ? "Limit breached." : `Goal ${statusText(status, when)}.`);

const v = new THREE.Vector3();
/** drei's Html moves a tag only when its position changed by more than this (its own `eps`). */
const DREI_EPS = 0.001;
/**
 * drei's default places the tag with a new [x, y] array every frame. This writes into one of
 * two arrays instead: no allocation per frame. drei keeps the array it was last given as its
 * "old" position, but only on a frame when it moved the tag, so the array to write is always
 * the one drei is not holding. (Flipping every call wrote into the held array after any frame
 * without movement: drei then compared the new position with itself and skipped the move, so
 * a tag could stall, then catch up in one jump.)
 */
function makeCalculate() {
  const a = [0, 0];
  const b = [0, 0];
  /** The array drei holds as its last position; null while it still holds its own [0, 0]. */
  let held: number[] | null = null;
  /** drei's first call places the tag once on mounting and keeps nothing. */
  let mounted = false;
  return (el: THREE.Object3D, camera: THREE.Camera, size: { width: number; height: number }) => {
    v.setFromMatrixPosition(el.matrixWorld).project(camera);
    const x = v.x * (size.width / 2) + size.width / 2;
    const y = -(v.y * (size.height / 2)) + size.height / 2;
    const out = held === a ? b : a;
    out[0] = x;
    out[1] = y;
    if (!mounted) {
      mounted = true;
      return out;
    }
    // On a frame, drei takes this array as its old position exactly when it moves the tag.
    const hx = held ? held[0] : 0;
    const hy = held ? held[1] : 0;
    if (Math.abs(hx - x) > DREI_EPS || Math.abs(hy - y) > DREI_EPS) held = out;
    return out;
  };
}

/**
 * A landmark's one-line tag, pinned in 3D: what it is, which way it is going and the
 * figure, "Inflation ▲ 7.1%", and a word when its goal is in trouble ("· at risk"), with the
 * quarter that decides it for a goal that must hold every quarter ("· at risk in 2026Q4"). The
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
  when,
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
  /** For an every-quarter goal in trouble, the quarter that decides it ("2026Q4"). */
  when?: string;
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
              <span className="isl-tag-status">{statusText(status, when)}</span>
            </>
          ) : null}
        </span>
        {sr ? <span className="isl-sr">{status ? `${sr} ${statusSr(status, when)}` : sr}</span> : null}
      </div>
    </Html>
  );
}
