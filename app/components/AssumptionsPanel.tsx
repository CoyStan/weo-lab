"use client";

import { defaultAssumptions, WEO_REFERENCE } from "../model/presets";
import type { RerConvention } from "../model/types";
import { useLab } from "../store";
import { Btn, Chip, SectionLabel, Segmented, Slider } from "./ui";

export default function AssumptionsPanel() {
  const config = useLab((s) => s.config);
  const setAssumption = useLab((s) => s.setAssumption);
  const resetAssumptions = useLab((s) => s.resetAssumptions);
  const a = config.assumptions;
  const ref = defaultAssumptions(config.presetId);
  const changed = (Object.keys(ref) as (keyof typeof ref)[]).filter((k) => ref[k] !== a[k]);

  return (
    <div>
      <p className="mb-2 rounded-lg bg-[color-mix(in_srgb,var(--lab-ink)_6%,transparent)] px-3 py-2 text-[0.72rem] leading-snug text-[var(--lab-ink-2)]">
        The reference path keeps the WEO assumptions below (orange ticks). Move one here to test how much the projection depends on it. {changed.length ? <strong className="text-[var(--lab-ink)]">{changed.length} changed.</strong> : null}
      </p>
      <div className="mb-2 flex items-center justify-between">
        <Chip tone={changed.length ? "warn" : "neutral"}>{changed.length ? "Departs from WEO" : "On WEO assumptions"}</Chip>
        <Btn size="xs" onClick={resetAssumptions} disabled={!changed.length}>Reset to WEO</Btn>
      </div>

      <SectionLabel>External environment</SectionLabel>
      <Slider label="Oil price, start" value={a.oilPrice} min={30} max={150} step={1} format={(v) => `$${v}/bbl`} reference={WEO_REFERENCE.oilPrice} onChange={(v) => setAssumption("oilPrice", v)} hint={`WEO: $${WEO_REFERENCE.oilPrice}. Importers lose income when it rises; exporters gain revenue.`} />
      <Slider label="Oil price drift" value={a.oilDrift} min={-10} max={10} step={0.5} format={(v) => `${v > 0 ? "+" : ""}${v}% / yr`} reference={WEO_REFERENCE.oilDrift} onChange={(v) => setAssumption("oilDrift", v)} hint={`WEO: ${WEO_REFERENCE.oilDrift}% per year, from futures curves.`} />
      <Slider label="World growth" value={a.globalGrowth} min={-2} max={6} step={0.1} format={(v) => `${v.toFixed(1)}%`} reference={WEO_REFERENCE.globalGrowth} onChange={(v) => setAssumption("globalGrowth", v)} hint={`WEO: ${WEO_REFERENCE.globalGrowth}%. Shown for reference; partner growth drives demand.`} />
      <Slider label="Trading-partner growth" value={a.partnerGrowth} min={-2} max={6} step={0.1} format={(v) => `${v.toFixed(1)}%`} reference={WEO_REFERENCE.partnerGrowth} onChange={(v) => setAssumption("partnerGrowth", v)} hint={`WEO: ${WEO_REFERENCE.partnerGrowth}%. Each point adds roughly half a point to demand over a year.`} />
      <Slider label="Commodity export prices" value={a.commodityPrice} min={50} max={160} step={1} format={(v) => `${v} (idx)`} reference={WEO_REFERENCE.commodityPrice} onChange={(v) => setAssumption("commodityPrice", v)} hint="Index, 100 = WEO. Matters for commodity exporters' budgets and exports." />
      <Slider label="Commodity price drift" value={a.commodityDrift} min={-10} max={10} step={0.5} format={(v) => `${v > 0 ? "+" : ""}${v}% / yr`} reference={WEO_REFERENCE.commodityDrift} onChange={(v) => setAssumption("commodityDrift", v)} />

      <SectionLabel>Global financial conditions</SectionLabel>
      <Slider label="US policy rate" value={a.usRate} min={0} max={8} step={0.25} format={(v) => `${v.toFixed(2)}%`} reference={WEO_REFERENCE.usRate} onChange={(v) => setAssumption("usRate", v)} hint={`WEO: ${WEO_REFERENCE.usRate}%. A higher anchor rate pulls capital out and pressures the currency.`} />
      <Slider label="EM risk premium" value={a.riskPremium} min={-100} max={500} step={25} format={(v) => `${v > 0 ? "+" : ""}${v} bp`} reference={WEO_REFERENCE.riskPremium} onChange={(v) => setAssumption("riskPremium", v)} hint="Global risk appetite. Adds to spreads and FX pressure." />

      <SectionLabel>Country structure</SectionLabel>
      <Slider label="Potential growth" value={a.potentialGrowth} min={-1} max={8} step={0.1} format={(v) => `${v.toFixed(1)}%`} reference={ref.potentialGrowth} onChange={(v) => setAssumption("potentialGrowth", v)} hint={`WEO: ${ref.potentialGrowth}%. Trend growth before reforms, investment and debt overhang.`} />
      <div className="lab-field">
        <span className="mb-1 block text-[0.78rem] font-medium">Real exchange rate</span>
        <Segmented<RerConvention>
          ariaLabel="Real exchange rate convention"
          options={[
            { value: "constant", label: "WEO: hold constant" },
            { value: "model", label: "Let the model move it" },
          ]}
          value={a.rerConvention}
          onChange={(v) => setAssumption("rerConvention", v)}
        />
        <span className="mt-1 block text-[0.68rem] leading-snug text-[var(--lab-ink-2)]">
          WEO projections hold the real exchange rate constant for floaters. Switching it on lets interest differentials, the current account and capital flows move it, which changes competitiveness, pass-through and FX debt.
        </span>
      </div>
    </div>
  );
}
