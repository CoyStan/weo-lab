// The island's layout: where the five landmarks stand and the roads between
// them. x runs east, z runs toward the viewer; the ground is y = 0.

import * as THREE from "three";
import type { FlowId, LandmarkId, StageNode } from "./story";

export const v = (x: number, z: number, y = 0) => new THREE.Vector3(x, y, z);

export const SPOT: Record<LandmarkId, THREE.Vector3> = {
  bank: v(-7, -5.6),
  hall: v(5.2, -6),
  market: v(0, 0),
  town: v(-6, 5),
  port: v(8.4, 4),
};

/** Where a landmark's label hangs (above the building's top). */
export const LABEL_AT: Record<LandmarkId, THREE.Vector3> = {
  bank: v(-7.4, -6, 4.6),
  hall: v(5.4, -6.4, 4.6),
  market: v(0.8, 2.7, 0.1),
  town: v(-8.4, 6.8, 0.4),
  port: v(10.4, 5.8, 0.4),
};

/** Labels that hang below their anchor rather than above it. */
export const LABEL_BELOW: Partial<Record<LandmarkId, boolean>> = { town: true, port: true, market: true };

const bez = (a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3) => new THREE.QuadraticBezierCurve3(a, c, b);

export type Road = { id: string; curve: THREE.Curve<THREE.Vector3>; width: number };

export const ROADS = {
  cbBanks: { id: "cbBanks", curve: bez(v(-7, -4.1), v(-7.3, -3.2), v(-7.4, -2.3)), width: 0.9 },
  credit: { id: "credit", curve: bez(v(-7.3, -0.7), v(-7.9, 1.4), v(-6.4, 3.2)), width: 1 },
  spending: { id: "spending", curve: bez(v(-4.4, 3.9), v(-3.2, 1.9), v(-1.6, 1.1)), width: 1 },
  gov: { id: "gov", curve: bez(v(4.1, -4.4), v(2.4, -3.3), v(1.3, -1.5)), width: 1.5 },
  trade: { id: "trade", curve: bez(v(6.6, 3.3), v(4.3, 2.9), v(1.8, 1.0)), width: 1.5 },
} satisfies Record<string, Road>;

/** Sea lanes (no road drawn). */
export const SEA = {
  capital: bez(v(13.6, 4.4), v(17.4, 1.5), v(15.6, -8)),
  tanker: bez(v(16.4, -7.5), v(18.2, 2), v(13.6, 6.5)),
};

export type Lane = { flow: FlowId; road: Road; reverse: boolean; offset: number; kind: "coin" | "crate"; label: string };

/** Each flow runs along a road, one lane per direction. */
export const LANES: Lane[] = [
  { flow: "credit", road: ROADS.credit, reverse: false, offset: 0, kind: "coin", label: "Credit" },
  { flow: "spending", road: ROADS.spending, reverse: false, offset: 0, kind: "coin", label: "Spending" },
  { flow: "public", road: ROADS.gov, reverse: false, offset: -0.38, kind: "coin", label: "Public spending" },
  { flow: "taxes", road: ROADS.gov, reverse: true, offset: 0.38, kind: "coin", label: "Taxes" },
  { flow: "imports", road: ROADS.trade, reverse: false, offset: 0.38, kind: "crate", label: "Imports" },
  { flow: "exports", road: ROADS.trade, reverse: true, offset: -0.38, kind: "crate", label: "Exports" },
];

/** Road label spots (the midpoint, nudged off the road). */
export const ROAD_LABELS: { text: string; at: THREE.Vector3 }[] = [
  { text: "credit", at: v(-8.6, 1.2, 0.3) },
  { text: "spending", at: v(-2.2, 2.9, 0.3) },
  { text: "taxes ⇄ public spending", at: v(3.6, -2.4, 0.3) },
  { text: "imports ⇄ exports", at: v(4.4, 3.9, 0.3) },
];

/** The road a lever's pulse takes to reach a stage, from the previous one. */
export function legTo(from: StageNode, to: StageNode): { curve: THREE.Curve<THREE.Vector3>; reverse: boolean } | null {
  const key = `${from}>${to}`;
  const legs: Record<string, { curve: THREE.Curve<THREE.Vector3>; reverse: boolean }> = {
    "bank>banks": { curve: ROADS.cbBanks.curve, reverse: false },
    "banks>town": { curve: ROADS.credit.curve, reverse: false },
    "town>market": { curve: ROADS.spending.curve, reverse: false },
    "hall>market": { curve: ROADS.gov.curve, reverse: false },
    "market>hall": { curve: ROADS.gov.curve, reverse: true },
    "port>market": { curve: ROADS.trade.curve, reverse: false },
    "bank>port": { curve: bez(v(-5.6, -4.6), v(2, -9), v(7.2, 2.6)), reverse: false },
  };
  return legs[key] ?? null;
}

/** Where a stage node sits, for the arrival ring. */
export const NODE_AT: Record<StageNode, THREE.Vector3> = {
  bank: v(-7, -4.1),
  banks: v(-7.4, -1.5),
  town: v(-6.2, 3.6),
  market: v(-1.2, 1.0),
  hall: v(4.2, -4.4),
  port: v(6.8, 3.3),
};
