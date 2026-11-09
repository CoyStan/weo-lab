"use client";

/**
 * "The economy machine": a friendly homage to the Phillips machine (MONIAC).
 * Tanks are stocks, pipes are flows with moving water, valves are the
 * player's levers, and shocks pour in or leak out where they hit. Gauges name
 * the main cause of each move, and a pulse plus the lag ribbon show where a
 * lever's push travels and when it lands. See app/scenes/registry.tsx.
 *
 * The drawing is aria-hidden; the same story is in the visually hidden
 * summary next to it.
 */

import { useEffect, useRef, useState } from "react";
import { useHidden, useReduced } from "./anim";
import Compact, { COMPACT_H } from "./Compact";
import { fmt, signed, useMachine, type MachineView } from "./data";
import Full, { FULL_H, FULL_W } from "./Full";
import { MotionCtx } from "./parts";
import "./machine.css";

export default function MachineScene() {
  const v = useMachine();
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const reduced = useReduced();
  const hidden = useHidden();

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize((s) => (Math.abs(s.w - width) < 1 && Math.abs(s.h - height) < 1 ? s : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = Math.min(size.w / FULL_W, size.h / FULL_H);
  const full = scale >= 0.6;
  // Text stays at least the token size: on a slightly small board the type is scaled back up.
  const textK = full ? Math.max(1, Math.min(1.3, 1 / scale)) : 1;
  const compactW = Math.round(Math.max(340, Math.min(640, (COMPACT_H * size.w) / Math.max(1, size.h))));
  const vb = full ? `0 0 ${FULL_W} ${FULL_H}` : `0 0 ${compactW} ${COMPACT_H}`;

  return (
    <div ref={box} className={`m-scene${reduced ? " is-reduced" : ""}${hidden ? " is-paused" : ""}`} style={{ ["--m-k" as string]: textK }}>
      {v && size.w > 0 ? (
        <MotionCtx.Provider value={!reduced}>
          <svg className="m-svg" viewBox={vb} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
            {full ? <Full v={v} /> : <Compact v={v} w={compactW} />}
          </svg>
          <Summary v={v} />
        </MotionCtx.Provider>
      ) : null}
    </div>
  );
}

/** The machine in words, for screen readers. */
function Summary({ v }: { v: MachineView }) {
  const m = v.move;
  return (
    <div className="sr-only" role="region" aria-label="Economy machine summary">
      <p>
        {v.label}. Inflation {fmt(v.infl.value)}% {v.infl.arrow === "▲" ? "rising" : v.infl.arrow === "▼" ? "falling" : "steady"}
        {v.infl.cause ? `, ${v.infl.cause} (${signed(v.infl.causeValue)} pp)` : ""}. Growth {fmt(v.growth.value)}%{v.growth.cause ? `, ${v.growth.cause}` : ""}. Output gap {fmt(v.gap.value)}%.
      </p>
      {v.shocks.length ? <p>Shocks now: {v.shocks.map((s) => `${s.name}, ${s.text}`).join("; ")}.</p> : null}
      <p>
        Public debt {v.stocks.debt.text}, reserves {v.stocks.reserves.text}, money {v.stocks.money.text}, bank loans {v.stocks.credit.text}.
      </p>
      {m ? (
        <p>
          {m.title}, {m.change}: {m.stops.filter((s) => s.text).map((s) => `${s.name} (${s.when}): ${s.text}`).join(". ")}.
        </p>
      ) : (
        <p>No lever moved yet. The policy rate reaches demand next quarter and inflation over the 2 to 4 quarters after.</p>
      )}
    </div>
  );
}
