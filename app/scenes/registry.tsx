"use client";

// Play-screen scenes. The play screen's scene slot (the box between the levers
// and the goals, full width on phones) has two views, switched with the
// "Map / Island" control or the I key:
//   - the map: the cause-and-effect map ("story") by default, or another
//     concept chosen with ?scene=<id> in the URL;
//   - the island (app/scene/IslandScene.tsx), also the backdrop of the title,
//     mission and briefing screens.
// ?scene=island opens the play screen on the island view. Each concept owns
// its folder app/scenes/<id>/; scenes read the game through the stores
// (app/store.ts useLab, app/game/store.ts useGame), never change them.

import dynamic from "next/dynamic";
import { useSyncExternalStore, type ComponentType } from "react";

const loading = () => (
  <div className="flex h-full w-full items-center justify-center text-(length:--t-xs) text-[var(--lab-ink-2)]" role="status">
    Loading the scene…
  </div>
);

export const SCENES: Record<string, { label: string; Component: ComponentType }> = {
  island: { label: "Island", Component: dynamic(() => import("../scene/IslandScene"), { ssr: false, loading }) },
  flow: { label: "Flow island", Component: dynamic(() => import("./flow"), { ssr: false, loading }) },
  machine: { label: "Economy machine", Component: dynamic(() => import("./machine"), { ssr: false, loading }) },
  story: { label: "Cause and effect", Component: dynamic(() => import("./story"), { ssr: false, loading }) },
};

/** The map the play screen opens on. */
export const DEFAULT_SCENE = "story";

/**
 * The island as the play screen's second view: it can pause while hidden, says when its first
 * frames are drawn (onReady, once), and when fresh frames are drawn after each pause (onDrawn).
 */
export const PlayIsland = dynamic<{ paused?: boolean; onReady?: () => void; onDrawn?: () => void }>(() => import("../scene/IslandScene"), { ssr: false, loading: () => null });

const urlScene = () => {
  if (typeof window === "undefined") return DEFAULT_SCENE;
  const id = new URLSearchParams(window.location.search).get("scene") ?? DEFAULT_SCENE;
  return id in SCENES ? id : DEFAULT_SCENE;
};

export type SceneView = "map" | "island";
/** The view the player picked this session; until then the URL decides (?scene=island opens on the island). */
let picked: SceneView | null = null;
const listeners = new Set<() => void>();
const readView = (): SceneView => picked ?? (urlScene() === "island" ? "island" : "map");
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("popstate", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("popstate", cb);
  };
};

/** Which view the scene slot shows: the map or the island. */
export function useSceneView(): SceneView {
  return useSyncExternalStore(subscribe, readView, () => "map");
}

export function setSceneView(v: SceneView) {
  if (readView() === v) return;
  picked = v;
  listeners.forEach((l) => l());
}

export function toggleSceneView() {
  setSceneView(readView() === "map" ? "island" : "map");
}

/** The map scene's id: the one chosen in the URL, or the cause-and-effect map. */
export function useMapId(): string {
  const id = useSyncExternalStore(subscribe, urlScene, () => DEFAULT_SCENE);
  return id === "island" ? DEFAULT_SCENE : id;
}

/** The scene showing in the slot now ("island" while the island view is up). */
export function useSceneId(): string {
  const map = useMapId();
  return useSceneView() === "island" ? "island" : map;
}

/** The play screen's map view. */
export function PlayScene() {
  const { Component } = SCENES[useMapId()];
  return <Component />;
}
