"use client";

import { useState } from "react";
import { describeChanges, formatLever, HORIZON, quarterLabel, regimeName } from "../model/economy";
import { getPreset } from "../model/presets";
import type { FxRegime, OneOffKind, RateMode } from "../model/types";
import { selectPolicyNow, useLab } from "../store";
import { Btn, Chip, SectionLabel, Segmented, Slider, Toggle } from "./ui";

const pct = (d = 2) => (v: number) => `${v.toFixed(d).replace(/\.?0+$/, "")}%`;

export default function PolicyDesk() {
  const config = useLab((s) => s.config);
  const clock = useLab((s) => s.clock);
  const decide = useLab((s) => s.decide);
  const removeDecision = useLab((s) => s.removeDecision);
  const clearDecisions = useLab((s) => s.clearDecisions);
  const addOneOff = useLab((s) => s.addOneOff);
  const removeOneOff = useLab((s) => s.removeOneOff);
  const policy = useLab(selectPolicyNow);
  const preset = getPreset(config.presetId);
  const quarter = Math.max(1, clock);
  const [devalueBy, setDevalueBy] = useState(15);
  const [haircut, setHaircut] = useState(30);

  const pegged = policy.fxRegime === "peg";

  return (
    <div>
      <p className="mb-2 rounded-lg bg-[color-mix(in_srgb,var(--lab-ink)_6%,transparent)] px-3 py-2 text-[0.72rem] leading-snug text-[var(--lab-ink-2)]">
        Levers you move now take effect from <strong className="text-[var(--lab-ink)]">{quarterLabel(quarter)}</strong> and stay until you change them. Scrub the clock to decide at a different date.
      </p>

      <SectionLabel>Monetary policy</SectionLabel>
      <div className="lab-field">
        <span className="mb-1 block text-[0.78rem] font-medium">Rate setting</span>
        <Segmented<RateMode>
          ariaLabel="Rate setting"
          options={[
            { value: "rule", label: "Policy rule", title: "Taylor-type rule around the target" },
            { value: "manual", label: "Set manually", title: "You fix the policy rate" },
          ]}
          value={policy.rateMode}
          onChange={(v) => decide({ rateMode: v })}
        />
        {pegged ? <span className="mt-1 block text-[0.68rem] text-[var(--lab-ink-2)]">Under a peg the rate follows the anchor currency plus the spread; this choice applies once the currency floats.</span> : null}
      </div>
      {policy.rateMode === "manual" ? (
        <Slider label="Policy rate" value={policy.manualRate} min={0} max={30} step={0.25} format={pct(2)} onChange={(v) => decide({ manualRate: v })} disabled={pegged} hint="Held at this level until you move it again." />
      ) : (
        <Slider label="Rule strength" value={policy.ruleStrength} min={0.5} max={2.5} step={0.1} format={(v) => `×${v.toFixed(1)}`} onChange={(v) => decide({ ruleStrength: v })} disabled={pegged} hint="Response to the inflation gap. Above 1 satisfies the Taylor principle." />
      )}
      <Slider label="Inflation target" value={policy.inflationTarget} min={1} max={10} step={0.5} format={pct(1)} onChange={(v) => decide({ inflationTarget: v })} hint="Anchor for expectations; credibility decides how much it binds." />

      <SectionLabel>Exchange rate</SectionLabel>
      <div className="lab-field">
        <span className="mb-1 block text-[0.78rem] font-medium">Regime</span>
        <Segmented<FxRegime>
          ariaLabel="Exchange-rate regime"
          options={[
            { value: "float", label: "Float" },
            { value: "managed", label: "Managed" },
            { value: "peg", label: "Peg" },
          ]}
          value={policy.fxRegime}
          onChange={(v) => decide({ fxRegime: v })}
        />
        <span className="mt-1 block text-[0.68rem] text-[var(--lab-ink-2)]">Now: {regimeName(policy.fxRegime)}. A peg absorbs pressure with reserves and breaks when they run out.</span>
      </div>
      {policy.fxRegime === "managed" ? <Slider label="Intervention" value={policy.fxIntervention} min={0} max={100} step={5} format={(v) => `${v}%`} onChange={(v) => decide({ fxIntervention: v })} hint="Share of FX pressure met from reserves rather than the exchange rate." /> : null}
      <Toggle label="Capital flow measures" checked={policy.capitalControls} onChange={(v) => decide({ capitalControls: v })} hint="Halves the FX impact of outflows; costs 60 bp of spread and a little growth." />

      <SectionLabel>Fiscal policy</SectionLabel>
      <Slider label="Fiscal adjustment" value={policy.fiscalAdjustment} min={-3} max={3} step={0.25} format={(v) => formatLever("fiscalAdjustment", v)} onChange={(v) => decide({ fiscalAdjustment: v })} hint="Change in the structural primary balance per year. Positive tightens; keeps running until set back to zero." />
      <Slider label="Adjustment mix" value={policy.adjustmentMix} min={0} max={100} step={10} format={(v) => (v === 50 ? "balanced" : v < 50 ? `${100 - v}% spending` : `${v}% taxes`)} onChange={(v) => decide({ adjustmentMix: v })} hint="Spending measures carry a larger multiplier than tax measures." />
      <Slider label="Public investment" value={policy.publicInvestment} min={1} max={8} step={0.25} format={(v) => `${v.toFixed(2).replace(/\.?0+$/, "")}% GDP`} onChange={(v) => decide({ publicInvestment: v })} hint={`Preset level ${preset.defaultPolicy.publicInvestment}% GDP. Extra investment lifts potential growth with a lag.`} />

      <SectionLabel>Structural reforms</SectionLabel>
      <Slider label="Labour market" value={policy.laborReform} min={0} max={3} step={0.5} format={(v) => (v === 0 ? "none" : `level ${v}`)} onChange={(v) => decide({ laborReform: v })} hint="Lowers structural unemployment over about two years." />
      <Slider label="Productivity" value={policy.productivityReform} min={0} max={3} step={0.5} format={(v) => (v === 0 ? "none" : `level ${v}`)} onChange={(v) => decide({ productivityReform: v })} hint="Each level adds up to 0.3 pp to potential growth." />
      <Slider label="Trade openness" value={policy.tradeOpenness} min={0} max={3} step={0.5} format={(v) => (v === 0 ? "none" : `level ${v}`)} onChange={(v) => decide({ tradeOpenness: v })} hint="Each level adds up to 0.15 pp to potential growth." />

      <SectionLabel>Financing</SectionLabel>
      <Slider label="IMF financing" value={policy.imfProgram} min={0} max={8} step={0.5} format={(v) => (v === 0 ? "no programme" : `${v}% GDP / yr`)} onChange={(v) => decide({ imfProgram: v })} hint="Disburses to reserves and trims spreads while fiscal adjustment is at least 0.5 pp/yr." />

      <SectionLabel>One-off actions</SectionLabel>
      <OneOffRow
        kind="devalue"
        label="Step devaluation"
        value={devalueBy}
        setValue={setDevalueBy}
        min={5}
        max={50}
        step={5}
        unit="%"
        disabled={policy.fxRegime === "float"}
        hint={policy.fxRegime === "float" ? "Only meaningful under a peg or managed float." : "Resets the parity at once; inflation and FX debt feel it immediately."}
        onAdd={() => addOneOff("devalue", quarter, devalueBy)}
        quarter={quarter}
      />
      <OneOffRow
        kind="restructure"
        label="Restructure debt"
        value={haircut}
        setValue={setHaircut}
        min={10}
        max={60}
        step={5}
        unit="% haircut"
        hint="Cuts the stock now; spreads jump and credibility drops for about two years."
        onAdd={() => addOneOff("restructure", quarter, haircut)}
        quarter={quarter}
      />

      <SectionLabel right={config.decisions.length || config.oneOffs.length ? <Btn size="xs" variant="danger" onClick={clearDecisions}>Clear all</Btn> : null}>Decision log</SectionLabel>
      {config.decisions.length === 0 && config.oneOffs.length === 0 ? (
        <p className="text-[0.72rem] text-[var(--lab-ink-2)]">No decisions yet. The scenario runs on the preset&rsquo;s unchanged policies.</p>
      ) : (
        <ol className="space-y-1.5">
          {[...config.decisions.map((d) => ({ q: d.quarter, text: describeChanges(d.changes), remove: () => removeDecision(d.quarter), kind: "decision" as const })), ...config.oneOffs.map((o) => ({ q: o.quarter, text: `${o.kind === "devalue" ? "Step devaluation" : "Debt restructuring"} ${o.value}%`, remove: () => removeOneOff(o.id), kind: "action" as const }))]
            .sort((a, b) => a.q - b.q)
            .map((item, i) => (
              <li key={`${item.kind}-${item.q}-${i}`} className="flex items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--lab-ink)_10%,transparent)] bg-white px-2.5 py-1.5">
                <Chip tone={item.kind === "action" ? "warn" : "info"}>{quarterLabel(item.q)}</Chip>
                <span className="flex-1 text-[0.72rem] leading-snug text-[var(--lab-ink)]">{item.text}</span>
                <button type="button" onClick={item.remove} aria-label="Remove decision" className="text-[0.9rem] leading-none text-[var(--lab-ink-2)] hover:text-[var(--lab-bad)]">×</button>
              </li>
            ))}
        </ol>
      )}
      <p className="mt-2 text-[0.66rem] text-[var(--lab-ink-2)]">Horizon: {quarterLabel(1)} to {quarterLabel(HORIZON)}.</p>
    </div>
  );
}

function OneOffRow({ kind, label, value, setValue, min, max, step, unit, hint, onAdd, quarter, disabled }: { kind: OneOffKind; label: string; value: number; setValue: (v: number) => void; min: number; max: number; step: number; unit: string; hint: string; onAdd: () => void; quarter: number; disabled?: boolean }) {
  return (
    <div className="lab-field">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.78rem] font-medium">{label}</span>
        <Btn size="xs" variant="soft" disabled={disabled} onClick={onAdd} title={`Schedule ${kind} at ${quarterLabel(quarter)}`}>
          Apply in {quarterLabel(quarter)}
        </Btn>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <input type="range" className="lab-range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => setValue(Number(e.target.value))} style={{ ["--pct" as string]: `${((value - min) / (max - min)) * 100}%` }} aria-label={`${label} size`} />
        <span className="w-16 shrink-0 text-right font-mono text-[0.74rem] tabular-nums">{value}{unit.startsWith("%") ? unit : ` ${unit}`}</span>
      </div>
      <span className="mt-0.5 block text-[0.68rem] leading-snug text-[var(--lab-ink-2)]">{hint}</span>
    </div>
  );
}
