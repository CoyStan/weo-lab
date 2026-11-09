"use client";

// Alternative play-screen scenes, chosen with ?scene=<id> in the URL. The
// island (app/scene/IslandScene.tsx) stays the default; the others are
// concepts being explored. Each concept owns its folder app/scenes/<id>/ and
// its default export fills the play screen's scene slot (the box between the
// levers and the goals, full width on phones). Scenes read the game through
// the stores (app/store.ts useLab, app/game/store.ts useGame), never change them.

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

const read = () => {
  if (typeof window === "undefined") return "island";
  const id = new URLSearchParams(window.location.search).get("scene") ?? "island";
  return id in SCENES ? id : "island";
};
const subscribe = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
};

/** The scene chosen in the URL (?scene=flow), or the island. */
export function useSceneId(): string {
  return useSyncExternalStore(subscribe, read, () => "island");
}

/** The play screen's scene. */
export function PlayScene() {
  const { Component } = SCENES[useSceneId()];
  return <Component />;
}
