"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import "../../weo-lab.css";
import "../game.css";
import { useLab } from "../../store";
import { getTheme } from "../../themes";
import WeoLab from "../../WeoLab";
import { useGame } from "../store";
import Modals from "./Modals";
import Play from "./Play";
import { Briefing, MissionSelect, TitleScreen } from "./Screens";

const IslandScene = dynamic(() => import("../../scene/IslandScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-[0.78rem] text-[var(--lab-ink-2)]" role="status">
      Building the island…
    </div>
  ),
});

/** Campaign screens, or the full lab in free play. */
export default function Game() {
  const screen = useGame((s) => s.screen);
  const sandboxKeep = useGame((s) => s.sandboxKeep);
  const loadProgress = useGame((s) => s.loadProgress);
  const setScreen = useGame((s) => s.setScreen);
  const themeId = useLab((s) => s.theme);
  const setTheme = useLab((s) => s.setTheme);
  const theme = getTheme(themeId);

  useEffect(() => {
    loadProgress();
    const params = new URLSearchParams(window.location.search);
    if (/[#&]s=/.test(window.location.hash) || params.get("mode") === "sandbox") setScreen("sandbox");
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem("palari.weo-lab.theme");
    } catch {
      // Storage blocked: keep the default design.
    }
    setTheme(getTheme(params.get("theme") ?? saved).id);
  }, [loadProgress, setScreen, setTheme]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (screen === "sandbox") url.searchParams.set("mode", "sandbox");
    else {
      url.searchParams.delete("mode");
      url.hash = "";
    }
    window.history.replaceState(null, "", url);
  }, [screen]);

  if (screen === "sandbox") return <WeoLab key="sandbox" restoreSaved={!sandboxKeep} />;

  return (
    <div className="lab game min-h-dvh bg-[var(--lab-bg)] text-[var(--lab-ink)]" data-theme={theme.id} style={{ ...(theme.vars as React.CSSProperties), colorScheme: theme.scheme }}>
      {theme.css ? <style>{theme.css}</style> : null}
      {screen === "play" ? (
        <Play scene={<IslandScene />} />
      ) : (
        <div className="game-backdrop">
          <div className="game-backdrop-scene" aria-hidden="true">
            <IslandScene />
          </div>
          {screen === "title" ? <TitleScreen /> : screen === "missions" ? <MissionSelect /> : <Briefing />}
        </div>
      )}
      <Modals />
    </div>
  );
}
