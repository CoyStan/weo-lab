"use client";

import { useMemo } from "react";
import { VARIABLES } from "../model/constraints";
import { quarterYear, START_YEAR, yearLabels } from "../model/economy";
import type { ConstraintVar, QuarterState } from "../model/types";
import { selectReference, useLab, type FocusKey } from "../store";
import { fmt, METRICS } from "./format";

type RowSpec = { key: FocusKey; agg: "mean" | "end" };

const ROWS: RowSpec[] = [
  { key: "growth", agg: "mean" },
  { key: "infl", agg: "mean" },
  { key: "rate", agg: "end" },
  { key: "ob", agg: "mean" },
  { key: "debt", agg: "end" },
  { key: "ca", agg: "mean" },
  { key: "reserves", agg: "end" },
  { key: "unemp", agg: "mean" },
  { key: "spread", agg: "mean" },
  { key: "rer", agg: "end" },
  { key: "cred", agg: "end" },
  { key: "oil", agg: "mean" },
];

export function annualize(path: QuarterState[], key: FocusKey, agg: "mean" | "end"): { year: number; value: number }[] {
  const out: { year: number; value: number }[] = [{ year: START_YEAR - 1, value: path[0][key] }];
  for (const year of yearLabels()) {
    const qs = path.filter((s) => s.t >= 1 && quarterYear(s.t) === year);
    if (!qs.length) continue;
    const value = agg === "end" ? qs[qs.length - 1][key] : qs.reduce((a, s) => a + s[key], 0) / qs.length;
    out.push({ year, value });
  }
  return out;
}

export function buildCsv(scenario: QuarterState[], reference: QuarterState[], refLabel: string): string {
  const years = [START_YEAR - 1, ...yearLabels()];
  const lines = [["Indicator", "Unit", "Path", ...years.map(String)].join(",")];
  for (const row of ROWS) {
    const m = METRICS[row.key];
    const a = annualize(scenario, row.key, row.agg);
    const b = annualize(reference, row.key, row.agg);
    lines.push([m.label, m.unit, "Scenario", ...a.map((x) => x.value.toFixed(m.digits + 1))].join(","));
    lines.push([m.label, m.unit, refLabel, ...b.map((x) => x.value.toFixed(m.digits + 1))].join(","));
  }
  lines.push("");
  lines.push("Quarter," + Object.keys(METRICS).join(","));
  for (const s of scenario) lines.push([s.label, ...(Object.keys(METRICS) as FocusKey[]).map((k) => s[k].toFixed(3))].join(","));
  return lines.join("\n");
}

export default function ProjectionTable() {
  const result = useLab((s) => s.result);
  const reference = useLab(selectReference);
  const compare = useLab((s) => s.compare);
  const clock = useLab((s) => s.clock);
  const constraints = useLab((s) => s.config.constraints);
  const breaches = useLab((s) => s.result.breaches);
  const refLabel = compare === "pinned" ? "Pinned" : "WEO ref.";
  const years = [START_YEAR - 1, ...yearLabels()];
  const nowYear = quarterYear(clock);

  const breachYears = useMemo(() => {
    const map = new Map<string, Set<number>>();
    for (const b of breaches) {
      const c = constraints.find((x) => x.id === b.constraintId);
      if (!c) continue;
      const set = map.get(c.variable) ?? new Set<number>();
      set.add(quarterYear(b.quarter));
      map.set(c.variable, set);
    }
    return map;
  }, [breaches, constraints]);

  return (
    <div className="h-full min-h-0 overflow-auto rounded-xl border border-[color-mix(in_srgb,var(--lab-ink)_10%,transparent)] bg-[var(--lab-paper)]">
      <table className="lab-table">
        <thead>
          <tr>
            <th scope="col">Indicator</th>
            <th scope="col" className="!text-left">Path</th>
            {years.map((y) => (
              <th key={y} scope="col" className={y === nowYear ? "text-[var(--lab-ink)]" : ""}>
                {y}
                {y === START_YEAR - 1 ? <span className="block text-[0.58rem] font-normal">start</span> : y === nowYear ? <span className="block text-[0.58rem] font-normal">now</span> : <span className="block text-[0.58rem] font-normal">proj.</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const m = METRICS[row.key];
            const a = annualize(result.path, row.key, row.agg);
            const b = annualize(reference.path, row.key, row.agg);
            const spec = VARIABLES[row.key as ConstraintVar];
            const breached = breachYears.get(row.key) ?? new Set<number>();
            return (
              <FragmentRows key={row.key} label={`${m.label}${spec ? "" : ""}`} unit={`${m.unit}${row.agg === "end" ? ", end-year" : row.agg === "mean" && m.unit !== "bp" ? ", avg" : ", avg"}`} scenario={a} reference={b} digits={m.digits} refLabel={refLabel} nowYear={nowYear} breached={breached} />
            );
          })}
        </tbody>
      </table>
      <p className="px-3 py-2 text-[0.64rem] text-[var(--lab-ink-2)]">Annual figures are averages of quarterly values for flows and end-year values for stocks. The model and its calibration are illustrative, not official IMF projections.</p>
    </div>
  );
}

function FragmentRows({ label, unit, scenario, reference, digits, refLabel, nowYear, breached }: { label: string; unit: string; scenario: { year: number; value: number }[]; reference: { year: number; value: number }[]; digits: number; refLabel: string; nowYear: number; breached: Set<number> }) {
  return (
    <>
      <tr>
        <th scope="row" rowSpan={2}>
          {label}
          <span className="block text-[0.6rem] font-normal text-[var(--lab-ink-2)]">{unit}</span>
        </th>
        <td className="!text-left text-[0.66rem] font-semibold text-[var(--lab-scenario)]">Scenario</td>
        {scenario.map((x) => (
          <td key={x.year} className={`${x.year === nowYear ? "is-now" : ""} ${breached.has(x.year) ? "is-breach" : ""}`}>{fmt(x.value, digits)}</td>
        ))}
      </tr>
      <tr className="is-reference">
        <td className="!text-left text-[0.62rem]">{refLabel}</td>
        {reference.map((x) => (
          <td key={x.year} className={x.year === nowYear ? "is-now" : ""}>{fmt(x.value, digits)}</td>
        ))}
      </tr>
    </>
  );
}
