"use client";

import { useMemo } from "react";
import { describeConstraint } from "../model/constraints";
import { quarterLabel } from "../model/economy";
import type { SimEvent } from "../model/types";
import { useLab } from "../store";
import { Panel, StatusDot } from "./ui";

export default function EventFeed() {
  const events = useLab((s) => s.result.events);
  const breaches = useLab((s) => s.result.breaches);
  const constraints = useLab((s) => s.config.constraints);
  const clock = useLab((s) => s.clock);

  const items = useMemo(() => {
    const list: SimEvent[] = events.filter((e) => e.quarter <= clock);
    const seen = new Set<string>();
    for (const b of breaches) {
      if (b.quarter > clock) continue;
      const c = constraints.find((x) => x.id === b.constraintId);
      if (!c) continue;
      const previous = breaches.some((x) => x.constraintId === b.constraintId && x.quarter === b.quarter - 1);
      if (previous) continue;
      const key = `${c.id}-${b.quarter}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ quarter: b.quarter, kind: "crisis", title: "Constraint breached", detail: describeConstraint(c), severity: "bad" });
    }
    return list.sort((a, b) => b.quarter - a.quarter);
  }, [events, breaches, constraints, clock]);

  return (
    <Panel title="Log" subtitle="What has happened so far, newest first.">
      {items.length === 0 ? (
        <p className="text-[0.72rem] text-[var(--lab-ink-2)]">Quiet so far. Press play, or move a lever.</p>
      ) : (
        <ol className="max-h-64 overflow-y-auto pr-1">
          {items.map((e, i) => (
            <li key={`${e.quarter}-${e.title}-${i}`} className="lab-event">
              <span className="mt-1"><StatusDot tone={e.severity === "bad" ? "bad" : e.severity === "warn" ? "warn" : e.severity === "good" ? "good" : "info"} /></span>
              <span>
                <span className="flex items-baseline gap-2">
                  <span className="text-[0.74rem] font-semibold text-[var(--lab-ink)]">{e.title}</span>
                  <span className="text-[0.62rem] tabular-nums text-[var(--lab-ink-2)]">{quarterLabel(e.quarter)}</span>
                </span>
                <span className="block text-[0.68rem] leading-snug text-[var(--lab-ink-2)]">{e.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
