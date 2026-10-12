"use client";

import { useState } from "react";
import { HORIZON, quarterLabel } from "../model/economy";
import { SHOCK_KINDS, SHOCKS } from "../model/shocks";
import type { ShockKind } from "../model/types";
import { useLab } from "../store";
import { Btn, Chip, NumberInput, SectionLabel, Select, Toggle } from "./ui";

const quarterOptions = Array.from({ length: HORIZON }, (_, i) => ({ value: i + 1, label: quarterLabel(i + 1) }));

export default function ShocksPanel() {
  const config = useLab((s) => s.config);
  const result = useLab((s) => s.result);
  const clock = useLab((s) => s.clock);
  const addShock = useLab((s) => s.addShock);
  const updateShock = useLab((s) => s.updateShock);
  const removeShock = useLab((s) => s.removeShock);
  const setRandomShocks = useLab((s) => s.setRandomShocks);
  const reroll = useLab((s) => s.reroll);
  const freezeRandomShocks = useLab((s) => s.freezeRandomShocks);
  const [kind, setKind] = useState<ShockKind>("oil-spike");
  const [quarter, setQuarter] = useState<number>(Math.max(1, clock));
  const [magnitude, setMagnitude] = useState(1);
  const spec = SHOCKS[kind];
  const randomDrawn = result.shocks.filter((s) => s.source === "random");

  return (
    <div>
      <p className="mb-2 rounded-lg bg-[color-mix(in_srgb,var(--lab-ink)_6%,transparent)] px-3 py-2 text-[0.72rem] leading-snug text-[var(--lab-ink-2)]">
        Schedule a shock to stress the scenario, or let the lab draw surprises so you have to react as they land.
      </p>

      <SectionLabel>Schedule a shock</SectionLabel>
      <div className="space-y-2 rounded-lg border border-[color-mix(in_srgb,var(--lab-ink)_10%,transparent)] bg-white p-2.5">
        <Select ariaLabel="Shock type" className="w-full" value={kind} onChange={(v) => setKind(v as ShockKind)} options={SHOCK_KINDS.map((k) => ({ value: k, label: SHOCKS[k].name }))} />
        <p className="text-[0.7rem] leading-snug text-[var(--lab-ink-2)]">{spec.description}</p>
        <div className="flex items-center gap-2">
          <Select ariaLabel="Onset quarter" value={quarter} onChange={(v) => setQuarter(Number(v))} options={quarterOptions} className="flex-1" />
          <label className="flex items-center gap-1 text-[0.7rem] text-[var(--lab-ink-2)]">
            size
            <NumberInput ariaLabel="Shock size multiplier" value={magnitude} step={0.1} min={0.2} max={3} onChange={setMagnitude} className="w-14" />
          </label>
          <Btn variant="primary" size="sm" onClick={() => addShock(kind, quarter, Math.max(0.2, Math.min(3, magnitude)))}>Add</Btn>
        </div>
      </div>

      <SectionLabel>Scheduled</SectionLabel>
      {config.shocks.length === 0 ? (
        <p className="text-[0.72rem] text-[var(--lab-ink-2)]">Nothing scheduled. The reference path has no shocks either.</p>
      ) : (
        <ul className="space-y-1.5">
          {[...config.shocks]
            .sort((a, b) => a.quarter - b.quarter)
            .map((s) => (
              <li key={s.id} className="rounded-lg border border-[color-mix(in_srgb,var(--lab-ink)_10%,transparent)] bg-white px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.76rem] font-semibold">{SHOCKS[s.kind].name}</span>
                  <button type="button" onClick={() => removeShock(s.id)} aria-label={`Remove ${SHOCKS[s.kind].name}`} className="text-[0.95rem] leading-none text-[var(--lab-ink-2)] hover:text-[var(--lab-bad)]">×</button>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Select ariaLabel="Onset quarter" value={s.quarter} onChange={(v) => updateShock(s.id, { quarter: Number(v) })} options={quarterOptions} className="flex-1" />
                  <label className="flex items-center gap-1 text-[0.7rem] text-[var(--lab-ink-2)]">
                    ×
                    <NumberInput ariaLabel="Size multiplier" value={s.magnitude} step={0.1} min={0.2} max={3} onChange={(v) => updateShock(s.id, { magnitude: Math.max(0.2, Math.min(3, v)) })} className="w-14" />
                  </label>
                </div>
                <span className="mt-1 block text-[0.66rem] text-[var(--lab-ink-2)]">{SHOCKS[s.kind].short}</span>
              </li>
            ))}
        </ul>
      )}

      <SectionLabel>Surprise mode</SectionLabel>
      <Toggle label="Draw random shocks" checked={config.randomShocks} onChange={setRandomShocks} hint="Up to four shocks drawn from historical-style frequencies. Same seed, same draw." />
      {config.randomShocks ? (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <Chip tone="neutral">seed {config.seed}</Chip>
            <Btn size="xs" onClick={reroll}>Reroll</Btn>
            <Btn size="xs" onClick={freezeRandomShocks} disabled={!randomDrawn.length} title="Copy the drawn shocks into the schedule so you can edit them">Freeze into schedule</Btn>
          </div>
          {randomDrawn.length ? (
            <ul className="space-y-1">
              {randomDrawn.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-[0.72rem]">
                  <Chip tone={s.quarter <= clock ? "bad" : "neutral"}>{s.quarter <= clock ? quarterLabel(s.quarter) : "hidden until it lands"}</Chip>
                  <span className={s.quarter <= clock ? "" : "blur-[3px] select-none"}>{SHOCKS[s.kind].name} × {s.magnitude.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[0.72rem] text-[var(--lab-ink-2)]">A quiet draw: no shocks this seed. Reroll for a rougher ride.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
