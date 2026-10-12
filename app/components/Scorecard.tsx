"use client";

import { useMemo } from "react";
import { assess } from "../model/score";
import { selectPolicyNow, selectReference, useLab } from "../store";
import { Panel, StatusDot } from "./ui";

export default function Scorecard() {
  const result = useLab((s) => s.result);
  const reference = useLab(selectReference);
  const constraints = useLab((s) => s.config.constraints);
  const policy = useLab(selectPolicyNow);
  const compare = useLab((s) => s.compare);
  const assessment = useMemo(() => assess(result, reference, constraints, policy.inflationTarget), [result, reference, constraints, policy.inflationTarget]);
  const tone = assessment.rating === "Sustainable" ? "good" : assessment.rating === "Watch" ? "warn" : "bad";
  const color = tone === "good" ? "var(--lab-good)" : tone === "warn" ? "var(--lab-warn)" : "var(--lab-bad)";

  return (
    <Panel title="Staff assessment" subtitle={`Whole-horizon view against the ${compare === "pinned" ? "pinned scenario" : "WEO reference"}.`} action={<span className="lab-stamp" style={{ color }}>{assessment.rating}</span>}>
      <div className="mb-2 flex items-center gap-2">
        <div className="lab-progress flex-1" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={assessment.score} aria-label="Assessment score">
          <span style={{ width: `${assessment.score}%`, background: color }} />
        </div>
        <span className="text-[0.72rem] font-semibold tabular-nums text-[var(--lab-ink)]">{assessment.score}/100</span>
      </div>
      <ul className="space-y-1">
        {assessment.lines.map((line) => (
          <li key={line.key} className="flex items-start gap-2 text-[0.72rem] leading-snug" title={line.note}>
            <span className="mt-1"><StatusDot tone={line.status} /></span>
            <span className="flex-1 text-[var(--lab-ink-2)]">{line.label}</span>
            <span className="font-semibold tabular-nums text-[var(--lab-ink)]">{line.value}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
