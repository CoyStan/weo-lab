"use client";

// Flow island: the economy as five landmarks (households and firms, the
// government, the central bank and banks, the port, the market square) linked
// by roads that carry its flows. A lever's move travels as a pulse along its
// channel, timed by the channel's lags; shocks arrive as things you can see.
//
// The canvas is aria-hidden: the same story is in the visually hidden text
// beside it (landmark states, shocks and the lever's route).

import { Canvas } from "@react-three/fiber";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { channels, policyTouched, untouchedConfig, type FrameworkInput } from "../../game/framework";
import { policyForTurn } from "../../game/missions";
import { forecastFor, useGame } from "../../game/store";
import { useTurn } from "../../game/useTurn";
import { getPreset } from "../../model/presets";
import { useLab } from "../../store";
import { describe, flows as flowsOf, focus, landmarks, pulseFor, shockProps } from "./story";
import World, { tagLayer, type Colors, type StageLine } from "./World";
import "./flow.css";

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <p className="flow-fallback" role="status">The 3D view could not start in this browser. The goals and the Macro framework still show every change.</p>;
    return this.props.children;
  }
}

/** Reduced motion from the system or from the game's settings. */
function useReduced(): boolean {
  const forced = useLab((s) => s.reduceMotion);
  const [sys, setSys] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const up = () => setSys(mq.matches);
    up();
    mq.addEventListener("change", up);
    return () => mq.removeEventListener("change", up);
  }, []);
  return sys || forced;
}

function useHidden(): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const up = () => setHidden(document.visibilityState === "hidden");
    up();
    document.addEventListener("visibilitychange", up);
    return () => document.removeEventListener("visibilitychange", up);
  }, []);
  return hidden;
}

/** Meaning colours from the theme's tokens. */
function useColors(root: React.RefObject<HTMLElement | null>): Colors {
  const theme = useLab((s) => s.theme);
  const [c, setC] = useState<Colors>({ good: "#4caf50", bad: "#f46f61", warn: "#e7b83d", pulse: "#4a3aa7", ink: "#2e2a7b" });
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const read = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
    setC({ good: read("--lab-good-mark", "#4caf50"), bad: read("--lab-alert", "#f46f61"), warn: read("--lab-warn-mark", "#e7b83d"), pulse: read("--lab-scenario", "#4a3aa7"), ink: read("--lab-ink", "#2e2a7b") });
  }, [root, theme]);
  return c;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function FlowScene() {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReduced();
  const hidden = useHidden();
  const colors = useColors(root);
  const turns = useGame((s) => s.turns);
  const { mission, config, clock, actual, forecast, forecastStart, policy, policyStart } = useTurn();
  const start = turns[0] ?? config;
  const end = mission?.quarters ?? Math.min(8, forecast.length - 1);
  const touched = policyTouched(config, start);
  const untouched = useMemo(() => (touched ? forecastFor(untouchedConfig(config, start), clock) : forecast), [touched, config, start, clock, forecast]);

  const view = useMemo(() => {
    const input: FrameworkInput = { config, actual, forecast, untouched, clock, end, policy, policyStart, changedSinceStart: touched };
    const { now, prev, forecastOnly } = focus(actual, forecast, clock);
    const marks = landmarks(now, prev, policy, getPreset(config.presetId).params.neutralRealRate);
    const chans = channels(input);
    // This turn's move, or else the moves made earlier in the mission, still on their way.
    const pulse = pulseFor(chans, policy, policyStart, { forecast, before: forecastStart, clock }) ?? (touched ? pulseFor(chans, policy, policyForTurn(start, clock), { forecast, before: untouched, clock, earlier: true }) : null);
    const shocks = shockProps(now);
    // The lever line already says how the rate moved; the bank's own line keeps the stance.
    if (pulse?.id === "rates") {
      const bank = marks.find((m) => m.id === "bank");
      if (bank) Object.assign(bank, { move: bank.why, why: "", dir: "flat" });
    }
    const lines: StageLine[] = (pulse?.stages ?? []).map((s, index) => ({
      node: s.node,
      index,
      tone: s.tone,
      text: index === 0 ? `${pulse!.title} ${s.effect}` : `${cap(s.when)}: ${s.label.toLowerCase()} ${s.effect}`,
    }));
    return { now, marks, pulse, shocks, lines, forecastOnly, flows: flowsOf(now, actual[0]), text: describe(marks, pulse, shocks, now.label, forecastOnly) };
  }, [config, actual, forecast, forecastStart, untouched, clock, end, policy, policyStart, touched, start]);

  // Stage lines (on landmarks and in the caption) light up as the pulse reaches them.
  const els = useRef(new Map<number, Set<HTMLElement>>());
  const lit = useRef(-1);
  const paint = useCallback(() => {
    for (const [i, set] of els.current) for (const el of set) el.classList.toggle("is-lit", i <= lit.current);
  }, []);
  const register = useCallback(
    (i: number, el: HTMLElement | null) => {
      if (!el) return;
      const set = els.current.get(i) ?? new Set<HTMLElement>();
      for (const e of set) if (!e.isConnected) set.delete(e);
      set.add(el);
      els.current.set(i, set);
      el.classList.toggle("is-lit", i <= lit.current);
    },
    [],
  );
  const onStage = useCallback(
    (reached: number) => {
      lit.current = reached;
      paint();
    },
    [paint],
  );

  const { pulse } = view;
  return (
    <div ref={root} className="flow-root">
      <div className="flow-canvas" aria-hidden="true">
        <Boundary>
          <Canvas shadows dpr={[1, 1.5]} frameloop={hidden ? "never" : reduced ? "demand" : "always"} camera={{ fov: 30, near: 1, far: 260, position: [4, 40, 36] }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}>
            <World
              marks={view.marks}
              flows={view.flows}
              pulse={pulse}
              lines={view.lines}
              shocks={view.shocks}
              infl={view.now.infl}
              target={policy.inflationTarget}
              output={Math.max(0.2, 1 + 0.2 * view.now.gap)}
              colors={colors}
              reduced={reduced}
              register={register}
              onStage={onStage}
            />
          </Canvas>
        </Boundary>
      </div>
      <div className="flow-tags" aria-hidden="true" ref={(el) => void (tagLayer.current = el)} />
      <p className="flow-route" aria-hidden="true">
        <span className="flow-route-when">{view.forecastOnly ? `${view.now.label} forecast` : view.now.label}</span>
        {pulse ? (
          <>
            <span className="flow-route-head">
              <i /> <span className="flow-long">{pulse.title} </span>{pulse.move}
            </span>
            {pulse.stages.slice(1).map((s, k) => (
              <span key={k} ref={(el) => register(k + 1, el)} className={`flow-route-step ${s.lag === 0 ? "is-now" : ""}`}>
                <span className="flow-route-arrow">→</span> {s.label} <em className="flow-long">{s.when}</em>
                <em className="flow-short">{s.when.replace(/quarters?/, "qtr")}</em>
              </span>
            ))}
          </>
        ) : (
          <span className="flow-route-hint">Move a lever to see where it travels</span>
        )}
      </p>
      <p className="flow-sr">{view.text}</p>
    </div>
  );
}
