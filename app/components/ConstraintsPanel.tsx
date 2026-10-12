"use client";

import { useMemo } from "react";
import { CONSTRAINT_TEMPLATES, VARIABLE_KEYS, VARIABLES } from "../model/constraints";
import { quarterLabel, yearLabels } from "../model/economy";
import type { ConstraintVar } from "../model/types";
import { useLab } from "../store";
import { Btn, Chip, NumberInput, Panel, Select } from "./ui";

const yearOptions = yearLabels().map((y, i) => ({ value: i * 4 + 1, label: `from ${y}` }));

export default function ConstraintsPanel() {
  const constraints = useLab((s) => s.config.constraints);
  const breaches = useLab((s) => s.result.breaches);
  const clock = useLab((s) => s.clock);
  const addConstraint = useLab((s) => s.addConstraint);
  const updateConstraint = useLab((s) => s.updateConstraint);
  const removeConstraint = useLab((s) => s.removeConstraint);
  const applyTemplate = useLab((s) => s.applyTemplate);
  const clearConstraints = useLab((s) => s.clearConstraints);

  const byConstraint = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const b of breaches) {
      const list = map.get(b.constraintId) ?? [];
      list.push(b.quarter);
      map.set(b.constraintId, list);
    }
    return map;
  }, [breaches]);

  return (
    <Panel
      title="Constraints"
      subtitle="Programme targets, fiscal rules or your own red lines, checked every quarter."
      action={constraints.length ? <Btn size="xs" variant="danger" onClick={clearConstraints}>Clear</Btn> : null}
    >
      <div className="mb-2 flex flex-wrap gap-1.5">
        <Select
          ariaLabel="Add a constraint template"
          value=""
          onChange={(v) => {
            if (v) applyTemplate(v);
          }}
          options={[{ value: "", label: "Add a template…" }, ...CONSTRAINT_TEMPLATES.map((t) => ({ value: t.id, label: t.name }))]}
          className="flex-1"
        />
        <Select
          ariaLabel="Add a constraint on a variable"
          value=""
          onChange={(v) => {
            if (v) addConstraint(v as ConstraintVar);
          }}
          options={[{ value: "", label: "Add on…" }, ...VARIABLE_KEYS.map((k) => ({ value: k, label: VARIABLES[k].label }))]}
          className="flex-1"
        />
      </div>
      {constraints.length === 0 ? (
        <p className="text-[0.72rem] leading-snug text-[var(--lab-ink-2)]">
          No constraints yet. Try <button type="button" className="font-semibold text-[var(--lab-ink)] underline decoration-[var(--lab-alert)] underline-offset-2" onClick={() => applyTemplate("program")}>programme-style targets</button> or add a ceiling on any indicator.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {constraints.map((c) => {
            const spec = VARIABLES[c.variable];
            const quarters = byConstraint.get(c.id) ?? [];
            const soFar = quarters.filter((q) => q <= clock);
            const tone = soFar.length ? "bad" : quarters.length ? "warn" : "good";
            const label = soFar.length ? `breached ${soFar.length}q` : quarters.length ? `breaks ${quarterLabel(quarters[0])}` : "holds";
            return (
              <li key={c.id} className={`rounded-lg border bg-white px-2.5 py-2 ${soFar.length ? "border-[color-mix(in_srgb,var(--lab-alert)_50%,transparent)]" : "border-[color-mix(in_srgb,var(--lab-ink)_10%,transparent)]"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.76rem] font-semibold">{spec.label}</span>
                  <div className="flex items-center gap-1.5">
                    <Chip tone={tone}>{label}</Chip>
                    <button type="button" onClick={() => removeConstraint(c.id)} aria-label={`Remove constraint on ${spec.label}`} className="text-[0.95rem] leading-none text-[var(--lab-ink-2)] hover:text-[var(--lab-bad)]">×</button>
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Btn size="xs" variant="soft" onClick={() => updateConstraint(c.id, { op: c.op === "<=" ? ">=" : "<=" })} title="Flip direction">
                    {c.op === "<=" ? "≤" : "≥"}
                  </Btn>
                  <NumberInput ariaLabel={`${spec.label} threshold`} value={c.threshold} step={spec.step} onChange={(v) => updateConstraint(c.id, { threshold: v })} />
                  <span className="text-[0.68rem] text-[var(--lab-ink-2)]">{spec.unit}</span>
                  <Select ariaLabel="Start year" value={c.fromQuarter} onChange={(v) => updateConstraint(c.id, { fromQuarter: Number(v) })} options={yearOptions} className="ml-auto" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
