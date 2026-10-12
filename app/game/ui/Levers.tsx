"use client";

import { Fragment, type ReactNode } from "react";
import { regimeName } from "../../model/economy";
import type { FxRegime, Policy, RateMode } from "../../model/types";
import { useLab } from "../../store";
import { Segmented, Slider, Toggle } from "../../components/ui";
import type { LeverId, MetricKey } from "../missions";
import { GAME_METRICS, deltaUnit, fmtNum } from "../metrics";
import { useGame } from "../store";
import { useProbeEffect, useTurn } from "../useTurn";
import { MOVE_COSTS } from "../politics";
import { CostChips } from "./Capital";

const trim = (v: number, d = 2) => v.toFixed(d).replace(/\.?0+$/, "");

/** Each lever's control, its plain-language hint and the nudge used to preview its effect. */
export default function Levers() {
  const { mission, policy, policyStart, deciding, clock, changed, books } = useTurn();
  const balance = books ?? { votes: 0, trust: 0 };
  const startedImf = policyStart.imfProgram > 0;
  const startedControls = policyStart.capitalControls;
  const decide = useGame((s) => s.decide);
  const resetTurn = useGame((s) => s.resetTurn);
  const addOneOff = useLab((s) => s.addOneOff);
  const oneOffs = useLab((s) => s.config.oneOffs);
  const unlocked = new Set(mission.unlocks);
  const metrics = Array.from(new Set(mission.objectives.map((o) => o.metric)));
  const pegged = policy.fxRegime === "peg";
  const devaluedNow = oneOffs.some((o) => o.kind === "devalue" && o.quarter === clock + 1);
  const restructured = oneOffs.some((o) => o.kind === "restructure");

  const moved = (keys: (keyof Policy)[]) => keys.some((k) => policy[k] !== policyStart[k]);

  return (
    <div className="flex flex-col gap-1">
      <p className="game-turn-note">
        Decisions for <strong>{deciding}</strong>. They stay in force until you change them.
      </p>

      {unlocked.has("rate") || unlocked.has("rule") ? (
        <LeverGroup title="Interest rate">
          {unlocked.has("rate") && unlocked.has("rule") && !pegged ? (
            <Lever id="rate-mode" lever={null} moved={moved(["rateMode"])} metrics={metrics}>
              <span className="mb-1 block text-[0.78rem] font-medium">Who sets the rate</span>
              <Segmented<RateMode>
                ariaLabel="Who sets the rate"
                value={policy.rateMode}
                onChange={(v) => decide(v === "manual" ? { rateMode: v, manualRate: Math.round(useLab.getState().result.path[clock].rate * 4) / 4 } : { rateMode: v })}
                options={[
                  { value: "rule", label: "The rule" },
                  { value: "manual", label: "You" },
                ]}
              />
            </Lever>
          ) : null}
          {pegged ? <p className="game-hint">Under a peg the rate follows the anchor currency; it is not yours to set.</p> : null}
          {!pegged && policy.rateMode === "manual" && unlocked.has("rate") ? (
            <Lever id="rate" lever="rate" moved={moved(["manualRate"])} metrics={metrics}>
              <Slider label="Policy rate" value={policy.manualRate} min={0} max={20} step={0.25} format={(v) => `${trim(v)}%`} onChange={(v) => decide({ manualRate: v })} hint="Higher rates cool demand and, a few quarters later, inflation." />
            </Lever>
          ) : null}
          {!pegged && policy.rateMode === "rule" && unlocked.has("rule") ? (
            <Lever id="rule" lever="rule" moved={moved(["ruleStrength"])} metrics={metrics}>
              <Slider label="How hard the rule reacts" value={policy.ruleStrength} min={0.5} max={2.5} step={0.1} format={(v) => `×${v.toFixed(1)}`} onChange={(v) => decide({ ruleStrength: v })} hint="Points of rate per point of excess inflation. Above ×1, real rates rise when inflation does." />
            </Lever>
          ) : null}
        </LeverGroup>
      ) : null}

      {unlocked.has("fiscal") || unlocked.has("mix") || unlocked.has("investment") ? (
        <LeverGroup title="Budget">
          {unlocked.has("fiscal") ? (
            <Lever id="fiscal" lever="fiscal" moved={moved(["fiscalAdjustment"])} metrics={metrics}>
              <Slider label="Tightening per year" value={policy.fiscalAdjustment} min={-2} max={3} step={0.25} format={(v) => (v === 0 ? "none" : `${v > 0 ? "+" : ""}${trim(v)} pp of GDP`)} onChange={(v) => decide({ fiscalAdjustment: v })} hint="Raises the budget balance a little each quarter. Negative values loosen. It keeps going until you set it back to zero." />
            </Lever>
          ) : null}
          {unlocked.has("mix") ? (
            <Lever id="mix" lever="mix" moved={moved(["adjustmentMix"])} metrics={metrics}>
              <Slider label="Through cuts or taxes" value={policy.adjustmentMix} min={0} max={100} step={10} format={(v) => (v === 50 ? "half and half" : v < 50 ? `${100 - v}% cuts` : `${v}% taxes`)} onChange={(v) => decide({ adjustmentMix: v })} hint="Spending cuts hit growth harder than tax rises." />
            </Lever>
          ) : null}
          {unlocked.has("investment") ? (
            <Lever id="investment" lever="investment" moved={moved(["publicInvestment"])} metrics={metrics}>
              <Slider label="Public investment" value={policy.publicInvestment} min={1} max={8} step={0.25} format={(v) => `${trim(v)}% of GDP`} onChange={(v) => decide({ publicInvestment: v })} hint="Costs the budget now; raises growth capacity later." />
            </Lever>
          ) : null}
        </LeverGroup>
      ) : null}

      {unlocked.has("fxRegime") || unlocked.has("intervention") || unlocked.has("controls") || unlocked.has("devalue") ? (
        <LeverGroup title="Currency">
          {unlocked.has("fxRegime") ? (
            <Lever id="fx" lever={null} moved={moved(["fxRegime"])} metrics={metrics}>
              <span className="mb-1 block text-[0.78rem] font-medium">Exchange-rate regime</span>
              <Segmented<FxRegime>
                ariaLabel="Exchange-rate regime"
                value={policy.fxRegime}
                onChange={(v) => decide({ fxRegime: v })}
                options={[
                  { value: "float", label: "Float", title: "The market sets the rate" },
                  { value: "managed", label: "Managed", title: "Reserves smooth the moves" },
                  { value: "peg", label: "Peg", title: "Reserves hold a fixed rate" },
                ]}
              />
              <span className="game-hint">Now {regimeName(policy.fxRegime)}. A peg spends reserves to hold the rate and breaks if they run out.</span>
            </Lever>
          ) : null}
          {unlocked.has("intervention") && policy.fxRegime === "managed" ? (
            <Lever id="intervention" lever="intervention" moved={moved(["fxIntervention"])} metrics={metrics}>
              <Slider label="Intervention" value={policy.fxIntervention} min={0} max={100} step={5} format={(v) => `${v}% of pressure`} onChange={(v) => decide({ fxIntervention: v })} hint="How much currency pressure the central bank absorbs with reserves." />
            </Lever>
          ) : null}
          {unlocked.has("controls") ? (
            <Lever id="controls" lever="controls" moved={moved(["capitalControls"])} metrics={metrics}>
              <Toggle
                label="Capital flow measures"
                checked={policy.capitalControls}
                onChange={(v) => decide({ capitalControls: v })}
                hint="Halves the currency impact of outflows; costs spread and a little growth."
              />
              {!startedControls ? (
                <span className="game-hint inline-flex items-center gap-1">
                  Imposing them costs <CostChips cost={MOVE_COSTS.controls.cost} /> {balance.trust < (MOVE_COSTS.controls.cost.trust ?? 0) ? "(you'll go into the red)" : ""}
                </span>
              ) : null}
            </Lever>
          ) : null}
          {unlocked.has("devalue") && policy.fxRegime !== "float" ? (
            <div className="lab-field flex items-center justify-between gap-2">
              <span>
                <span className="block text-[0.78rem] font-medium">One-off devaluation</span>
                <span className="game-hint">Reset the parity 15% weaker. Inflation and foreign-currency debt feel it at once.</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <CostChips cost={{ votes: 1, trust: 2 }} />
                <button type="button" className="lab-btn lab-btn-soft lab-btn-xs" disabled={devaluedNow} onClick={() => addOneOff("devalue", clock + 1, 15)}>
                  {devaluedNow ? "Scheduled" : "Devalue 15%"}
                </button>
              </span>
            </div>
          ) : null}
        </LeverGroup>
      ) : null}

      {unlocked.has("restructure") ? (
        <LeverGroup title="Debt">
          <div className="lab-field flex items-center justify-between gap-2">
            <span>
              <span className="block text-[0.78rem] font-medium">Restructure the debt</span>
              <span className="game-hint">Cut the debt stock by 30% now. Spreads jump and credibility falls for about two years. Once per mission.</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <CostChips cost={{ trust: 3 }} />
              <button type="button" className="lab-btn lab-btn-soft lab-btn-xs" disabled={restructured} onClick={() => addOneOff("restructure", clock + 1, 30)}>
                {restructured ? "Done" : "Restructure 30%"}
              </button>
            </span>
          </div>
        </LeverGroup>
      ) : null}

      {unlocked.has("imf") || unlocked.has("reforms") ? (
        <LeverGroup title="Support and reform">
          {unlocked.has("imf") ? (
            <Lever id="imf" lever="imf" moved={moved(["imfProgram"])} metrics={metrics}>
              <Slider
                label="IMF programme"
                value={policy.imfProgram}
                min={0}
                max={8}
                step={0.5}
                format={(v) => (v === 0 ? "none" : `${trim(v)}% of GDP / yr`)}
                onChange={(v) => decide({ imfProgram: v })}
                hint="Adds to reserves and calms markets, but only pays out while you tighten by at least 0.5 a year."
              />
              {!startedImf ? (
                <span className="game-hint inline-flex items-center gap-1">
                  Starting a programme costs <CostChips cost={MOVE_COSTS.imf.cost} /> {balance.votes < (MOVE_COSTS.imf.cost.votes ?? 0) ? "(you'll go into the red)" : ""}
                </span>
              ) : null}
              {policy.imfProgram > 0 && policy.fiscalAdjustment < 0.5 ? <span className="game-warn">Paused: the programme needs at least +0.5 pp of tightening.</span> : null}
            </Lever>
          ) : null}
          {unlocked.has("reforms") ? (
            <Lever id="reforms" lever="reforms" moved={moved(["laborReform", "productivityReform", "tradeOpenness"])} metrics={metrics}>
              <Slider label="Structural reforms" value={policy.productivityReform} min={0} max={3} step={1} format={(v) => (v === 0 ? "none" : `level ${v}`)} onChange={(v) => decide({ laborReform: v, productivityReform: v, tradeOpenness: v })} hint="Raise growth capacity and lower unemployment, slowly, over about two years." />
            </Lever>
          ) : null}
        </LeverGroup>
      ) : null}

      {changed ? (
        <button type="button" className="game-reset" onClick={resetTurn}>
          Undo this quarter&rsquo;s changes
        </button>
      ) : null}
    </div>
  );
}

function LeverGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="game-lever-group">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Lever({ id, lever, moved, metrics, children }: { id: string; lever: LeverId | null; moved: boolean; metrics: MetricKey[]; children: ReactNode }) {
  const setProbe = useGame((s) => s.setProbe);
  const current = useGame((s) => s.probe);
  const active = Boolean(lever && current === lever);
  const on = () => {
    if (lever) setProbe(lever);
  };
  const off = () => setProbe(null);
  return (
    <div className={`game-lever ${moved ? "is-moved" : ""}`} data-lever={id} onPointerEnter={on} onPointerLeave={off} onFocus={on} onBlur={off}>
      {moved ? <span className="game-moved-dot" title="Changed this quarter" /> : null}
      {children}
      {active ? <ProbeLine metrics={metrics} /> : null}
    </div>
  );
}

function ProbeLine({ metrics }: { metrics: MetricKey[] }) {
  const effect = useProbeEffect(metrics);
  if (!effect) return null;
  const parts = metrics.map((m) => ({ m, d: effect.deltas[m] })).filter((p) => Math.abs(p.d) >= 0.05);
  return (
    <div className="game-probe" role="status">
      <strong>{effect.label}</strong> would move, by {effect.by}:{" "}
      {parts.length === 0 ? (
        <span>almost nothing you are judged on.</span>
      ) : (
        parts.map((p, i) => (
          <Fragment key={p.m}>
            <span className="whitespace-nowrap">
              {GAME_METRICS[p.m].label.toLowerCase()} {fmtNum(p.d, GAME_METRICS[p.m].digits, true)}
              {deltaUnit(GAME_METRICS[p.m].unit)}
            </span>
            {i < parts.length - 1 ? ", " : ""}
          </Fragment>
        ))
      )}
    </div>
  );
}
