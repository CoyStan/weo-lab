// WEO Scenario Lab — a small open-economy model at quarterly frequency.
//
// The structure is a semi-structural "gap" model of the kind used in
// forecasting and programme work: an IS curve for the output gap, a hybrid
// Phillips curve with credibility-weighted expectations, a policy rule or a
// manual rate, an FX-pressure block that resolves into depreciation or reserve
// loss depending on the regime, standard debt dynamics with an FX valuation
// term, a current-account equation, Okun's law and a reduced-form sovereign
// spread. Everything is deterministic given the configuration, so the whole
// horizon is recomputed on every change.

import { getPreset, WEO_REFERENCE, WORLD_INFLATION } from "./presets.ts";
import type { Preset } from "./presets.ts";
import { generateRandomShocks, impulseAt } from "./shocks.ts";
import { SHOCKS } from "./shocks.ts";
import type { Decision, Drivers, FxRegime, Policy, QuarterState, ScenarioConfig, ScheduledShock, SimEvent, SimResult } from "./types.ts";
import { evaluateConstraints } from "./constraints.ts";

export const HORIZON = 24;
export const START_YEAR = 2026;

export function quarterLabel(t: number): string {
  if (t <= 0) return `${START_YEAR - 1}Q4`;
  return `${START_YEAR + Math.floor((t - 1) / 4)}Q${((t - 1) % 4) + 1}`;
}

export function quarterYear(t: number): number {
  return t <= 0 ? START_YEAR - 1 : START_YEAR + Math.floor((t - 1) / 4);
}

export function yearLabels(): number[] {
  return Array.from({ length: HORIZON / 4 }, (_, i) => START_YEAR + i);
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export const ZERO_DRIVERS: Drivers = {
  infl: { expectations: 0, demand: 0, currency: 0, oil: 0, shocks: 0, other: 0 },
  gap: { fading: 0, monetary: 0, fiscal: 0, external: 0, commodities: 0, currency: 0, confidence: 0, shocks: 0, other: 0 },
  debt: { interestGrowth: 0, primary: 0, currency: 0, other: 0 },
};

/** Policy in force at quarter t: preset defaults plus every decision taken at or before t. */
export function policyAt(defaults: Policy, decisions: Decision[], t: number): Policy {
  let p: Policy = { ...defaults };
  for (const d of decisions) if (d.quarter <= t) p = { ...p, ...d.changes };
  return p;
}

/** FX pressure a float would resolve into depreciation this quarter, excluding the PPP drift. */
function fundamentalPressure(preset: Preset, rate: number, usRate: number, spread: number, ca: number, flows: number, controls: boolean): number {
  const P = preset.params;
  const interestDiff = rate - (usRate + spread / 100);
  const flowTerm = flows < 0 ? (controls ? 0.5 : 1) * flows : flows;
  return -P.k1 * interestDiff + (P.k2 * -ca) / 4 - P.k3 * flowTerm;
}

const sum = (parts: Record<string, number>) => Object.values(parts).reduce((a, b) => a + b, 0);

export function simulate(config: ScenarioConfig): SimResult {
  const preset = getPreset(config.presetId);
  const P = preset.params;
  const A = config.assumptions;
  const shocks: ScheduledShock[] = [...config.shocks, ...(config.randomShocks ? generateRandomShocks(config.seed, HORIZON) : [])].sort((a, b) => a.quarter - b.quarter);
  const decisions = [...config.decisions].sort((a, b) => a.quarter - b.quarter);
  const events: SimEvent[] = [];
  const path: QuarterState[] = [];

  const init = preset.initial;
  const policy0 = policyAt(preset.defaultPolicy, decisions, 0);
  const monthOfImports = P.importsGDP / 12;

  const initial: QuarterState = {
    t: 0,
    label: quarterLabel(0),
    gap: init.gap,
    growth: init.growth,
    infl: init.infl,
    rate: init.rate,
    realRate: init.rate - init.infl,
    rer: 100,
    dE: 0,
    debt: init.debt,
    pb: init.structPB + P.autoStabilizer * init.gap,
    ob: init.structPB + P.autoStabilizer * init.gap - (init.iEff / 100) * init.debt,
    structPB: init.structPB,
    iEff: init.iEff,
    interest: (init.iEff / 100) * init.debt,
    gfn: Math.max(0, -(init.structPB + P.autoStabilizer * init.gap - (init.iEff / 100) * init.debt)) + init.debt / P.avgMaturity,
    ca: init.ca,
    reserves: init.reserves,
    reservesPct: init.reserves * monthOfImports,
    unemp: init.unemp,
    nairu: P.nairu,
    spread: init.spread,
    cred: init.cred,
    oil: A.oilPrice,
    commodity: A.commodityPrice,
    potGrowth: A.potentialGrowth,
    potLevel: 100,
    gdpLevel: 100 * (1 + init.gap / 100),
    regime: policy0.fxRegime,
    imfDisb: 0,
    pressure: 0,
    activeShocks: [],
    drivers: ZERO_DRIVERS,
  };
  path.push(initial);

  // GDP levels for the four quarters before the start, so year-on-year growth is defined from quarter 1.
  const gdpHist: number[] = [];
  for (let k = 4; k >= 1; k--) gdpHist.push(initial.gdpLevel / Math.pow(1 + init.growth / 100, k / 4));
  gdpHist.push(initial.gdpLevel);

  // Pressure at the initial equilibrium is netted out so a baseline without shocks sits still.
  const pressure0 = fundamentalPressure(preset, init.rate, A.usRate, init.spread, init.ca, 0, policy0.capitalControls);

  let regime: FxRegime = policy0.fxRegime;
  let effReform = { labor: 0, prod: 0, trade: 0 };
  let effInvest = preset.defaultPolicy.publicInvestment;
  let restructurePenalty = 0;
  let programWasActive = false;
  let offTrackLogged = -99;
  let elbLogged = false;
  let reserveCrisisLogged = false;
  let inflationSpiralLogged = false;
  let marketAccessLogged = false;

  const adopted = config.institutions ?? [];
  const sinceAdoption = (id: string, t: number) => {
    const a = adopted.find((x) => x.id === id && x.quarter <= t);
    return a ? t - a.quarter : -1;
  };

  for (let t = 1; t <= HORIZON; t++) {
    const prev = path[t - 1];
    const has = (id: string) => sinceAdoption(id, t) >= 0;
    const pol = policyAt(preset.defaultPolicy, decisions, t);
    const { impulse: imp, active } = impulseAt(shocks, t);

    for (const sh of shocks) {
      if (sh.quarter !== t) continue;
      const spec = SHOCKS[sh.kind];
      events.push({ quarter: t, kind: "shock", title: spec.name, detail: `${spec.short}${sh.magnitude !== 1 ? ` × ${sh.magnitude.toFixed(1)}` : ""}${sh.source === "random" ? " (random draw)" : ""}`, severity: spec.severity });
    }
    for (const d of decisions) {
      if (d.quarter !== t) continue;
      events.push({ quarter: t, kind: "decision", title: "Policy decision", detail: describeChanges(d.changes), severity: "info" });
    }

    // Regime switches happen only through an explicit decision this quarter, so a
    // peg that broke stays broken until the economist re-pegs on purpose.
    const regimeDecision = decisions.find((d) => d.quarter === t && d.changes.fxRegime !== undefined);
    if (regimeDecision && regimeDecision.changes.fxRegime && regimeDecision.changes.fxRegime !== regime) {
      regime = regimeDecision.changes.fxRegime;
      events.push({ quarter: t, kind: "regime", title: `Exchange-rate regime: ${regimeName(regime)}`, detail: regime === "peg" ? "Parity fixed at the current rate; reserves now absorb all pressure." : regime === "managed" ? `Intervention absorbs ${pol.fxIntervention}% of pressure.` : "The currency now floats.", severity: "info" });
    }

    // One-off actions this quarter.
    let devalueAdd = 0;
    let haircut = 0;
    for (const action of config.oneOffs) {
      if (action.quarter !== t) continue;
      if (action.kind === "devalue") {
        if (regime === "float") {
          events.push({ quarter: t, kind: "action", title: "Step devaluation has no effect", detail: "The currency already floats; there is no parity to move.", severity: "warn" });
        } else {
          devalueAdd += action.value;
          events.push({ quarter: t, kind: "action", title: `Step devaluation of ${action.value}%`, detail: "The parity is reset; pass-through lifts inflation and FX debt revalues.", severity: "warn" });
        }
      } else if (action.kind === "restructure") {
        haircut += action.value;
        events.push({ quarter: t, kind: "action", title: `Debt restructuring, ${action.value}% haircut`, detail: "Debt falls at once; spreads and credibility pay for it over the next two years.", severity: "warn" });
      }
    }

    // Exogenous paths.
    const oilBase = A.oilPrice * Math.pow(1 + A.oilDrift / 100, t / 4);
    const oil = oilBase * imp.oilMult;
    const commodityBase = A.commodityPrice * Math.pow(1 + A.commodityDrift / 100, t / 4);
    const commodity = commodityBase * imp.commodityMult;
    const partnerGrowth = A.partnerGrowth + imp.partnerGrowthAdd;
    const globalGrowth = A.globalGrowth + imp.globalGrowthAdd;
    const usRate = A.usRate;
    const riskPremium = A.riskPremium + imp.riskPremiumAdd;
    const oilChangeQ = (oil / prev.oil - 1) * 100;
    const oilDev = oil / WEO_REFERENCE.oilPrice - 1;
    const prevOilDev = prev.oil / WEO_REFERENCE.oilPrice - 1;
    const commodityDev = commodity / WEO_REFERENCE.commodityPrice - 1;
    const prevCommodityDev = prev.commodity / WEO_REFERENCE.commodityPrice - 1;

    // Reforms and investment phase in gradually.
    effReform = {
      labor: effReform.labor + (pol.laborReform - effReform.labor) * 0.12,
      prod: effReform.prod + (pol.productivityReform - effReform.prod) * 0.12,
      trade: effReform.trade + (pol.tradeOpenness - effReform.trade) * 0.12,
    };
    const prevInvest = effInvest;
    effInvest += (pol.publicInvestment - effInvest) * 0.25;
    const investDelta = effInvest - preset.defaultPolicy.publicInvestment;

    // Potential output.
    const debtOverhang = Math.max(0, prev.debt - 90) * 0.004;
    const hysteresis = prev.gap < -3 ? 0.05 : 0;
    const potGrowth = A.potentialGrowth + 0.3 * effReform.prod + 0.15 * effReform.trade + 0.1 * effReform.labor + (has("investment-agency") ? 0.18 : 0.12) * investDelta - debtOverhang - hysteresis;
    const potLevel = prev.potLevel * (1 + potGrowth / 400) * imp.potentialLevelMult;

    // Expectations anchored by credibility.
    // An inflation-targeting framework anchors expectations as if credibility were 10 points higher.
    const anchor = Math.min(1, (prev.cred + (has("inflation-targeting") ? 10 : 0)) / 100);
    const inflExp = anchor * pol.inflationTarget + (1 - anchor) * prev.infl;
    const realRatePrev = prev.rate - inflExp;

    // Structural fiscal path and the demand impulse it carries.
    const structPB = prev.structPB + pol.fiscalAdjustment / 4;
    const dStruct = structPB - prev.structPB;
    const slack = Math.max(0, -prev.gap);
    const multiplier = (P.multiplierSpend * (1 - pol.adjustmentMix / 100) + P.multiplierTax * (pol.adjustmentMix / 100)) * (1 + 0.1 * slack);
    const fiscalImpulse = -dStruct * multiplier + (effInvest - prevInvest) * P.multiplierSpend;

    // Demand from abroad, commodities, competitiveness and financial conditions.
    const externalImpulse = (P.externalDemand * (partnerGrowth - WEO_REFERENCE.partnerGrowth)) / 4;
    const oilImpulse = -P.oilImportShare * 0.5 * (oilDev - prevOilDev);
    const commodityImpulse = P.commodityExportShare * 0.4 * (commodityDev - prevCommodityDev);
    const rerImpulse = 0.03 * (prev.rer - 100);
    const riskImpulse = -0.0012 * (prev.spread - P.spreadBase);
    const controlsCost = pol.capitalControls ? -0.05 : 0;
    // High inflation erodes real incomes and raises uncertainty; it does not buy output for long.
    const inflationDrag = -0.03 * Math.max(0, prev.infl - 12);

    const monetaryImpulse = -(P.sigma / 4) * (realRatePrev - P.neutralRealRate);
    const gap = clamp(
      P.rhoGap * prev.gap + monetaryImpulse + fiscalImpulse + externalImpulse + oilImpulse + commodityImpulse + rerImpulse + riskImpulse + controlsCost + inflationDrag + imp.gapAdd,
      -15,
      10,
    );
    const gapParts = {
      fading: (P.rhoGap - 1) * prev.gap,
      monetary: monetaryImpulse,
      fiscal: fiscalImpulse,
      external: externalImpulse,
      commodities: oilImpulse + commodityImpulse,
      currency: rerImpulse,
      confidence: riskImpulse + controlsCost + inflationDrag,
      shocks: imp.gapAdd,
    };

    // FX block. "Fundamentals" is the pressure from interest differentials, the current
    // account, capital flows and the financing gap, net of the initial equilibrium; the
    // PPP drift is the inflation differential. A float resolves both into depreciation;
    // a peg absorbs the fundamentals with reserves and lets the real rate appreciate.
    const flows = imp.capitalFlowAdd < 0 && has("macroprudential") ? imp.capitalFlowAdd * 0.7 : imp.capitalFlowAdd;
    const fundamentals = fundamentalPressure(preset, prev.rate, usRate, prev.spread, prev.ca, flows, pol.capitalControls) - pressure0 + (P.k3 * P.financingGap) / 4 + riskPremium / 800;
    const pppDrift = (prev.infl - WORLD_INFLATION) / 4;
    const pressure = fundamentals + pppDrift;
    let dE = 0;
    let absorbed = 0;
    let pegBreak = false;
    if (regime === "float") {
      dE = pressure;
    } else if (regime === "managed") {
      const share = prev.reserves > 0.5 ? pol.fxIntervention / 100 : 0;
      absorbed = share * fundamentals;
      dE = pressure - absorbed;
    } else {
      if (prev.reserves <= 0.5 && fundamentals > 0) {
        pegBreak = true;
        dE = 20 + pressure;
        regime = "float";
      } else {
        absorbed = fundamentals;
        dE = 0;
      }
    }
    dE += devalueAdd;
    if (A.rerConvention === "constant" && regime === "float" && !pegBreak) {
      // WEO convention: the real rate is held flat, the nominal rate moves with the inflation differential.
      dE = pppDrift + devalueAdd;
    }
    const dRer = dE - pppDrift;
    const rer = Math.max(40, prev.rer * (1 + dRer / 100));

    // Inflation: hybrid Phillips curve with pass-through from real depreciation surprises and oil.
    // The PPP-consistent part of nominal depreciation is the inflation already in the system.
    const backward = Math.max(0.2, 0.35 + 0.4 * (1 - prev.cred / 100) - (has("cb-independence") ? 0.05 : 0));
    const infl = Math.max(-3, backward * prev.infl + (1 - backward) * inflExp + P.kappa * gap + P.passthrough * dRer + P.oilInflation * oilChangeQ + imp.inflAdd);
    const inflParts = {
      expectations: (1 - backward) * (inflExp - prev.infl),
      demand: P.kappa * gap,
      currency: P.passthrough * dRer,
      oil: P.oilInflation * oilChangeQ,
      shocks: imp.inflAdd,
    };

    // Policy rate.
    let rate: number;
    if (regime === "peg") {
      rate = usRate + prev.spread / 100 + Math.max(0, pressure) * 0.5;
    } else if (pol.rateMode === "manual") {
      rate = pol.manualRate;
    } else {
      const ruleTarget = P.neutralRealRate + inflExp + pol.ruleStrength * (infl - pol.inflationTarget) + 0.5 * gap;
      rate = 0.7 * prev.rate + 0.3 * ruleTarget;
      if (ruleTarget < P.elb && !elbLogged) {
        elbLogged = true;
        events.push({ quarter: t, kind: "crisis", title: "Policy rate at the effective lower bound", detail: "The rule asks for a negative rate; monetary policy is constrained.", severity: "warn" });
      }
    }
    rate = Math.max(P.elb, rate);
    const realRate = rate - infl;

    // Programme status.
    const programActive = pol.imfProgram > 0;
    const onTrack = pol.fiscalAdjustment >= 0.5;
    const imfDisb = programActive && onTrack ? pol.imfProgram / 4 : 0;
    if (programActive && !programWasActive) {
      events.push({ quarter: t, kind: "program", title: "IMF programme approved", detail: `${pol.imfProgram}% of GDP per year, conditional on at least 0.5 pp/yr of fiscal adjustment.`, severity: "good" });
    }
    if (programActive && !onTrack && t - offTrackLogged >= 4) {
      offTrackLogged = t;
      events.push({ quarter: t, kind: "program", title: "Programme off track", detail: "Fiscal adjustment is below the 0.5 pp/yr condition; disbursements are paused.", severity: "bad" });
    }
    programWasActive = programActive;

    // Sovereign spread.
    restructurePenalty = restructurePenalty * 0.8 + (haircut > 0 ? (400 * haircut) / 30 : 0);
    const spreadTarget =
      P.spreadBase +
      4 * Math.max(0, prev.debt - P.debtThreshold) +
      60 * Math.max(0, 3 - prev.reserves) +
      25 * Math.max(0, -prev.ca - 4) +
      riskPremium +
      (100 - prev.cred) * 1.2 -
      (100 - init.cred) * 1.2 +
      restructurePenalty +
      (pol.capitalControls ? 60 : 0) -
      (programActive && onTrack ? 40 : 0) +
      15 * Math.max(0, prev.infl - pol.inflationTarget - 3) +
      (pegBreak ? 300 : 0) -
      (has("fiscal-rule") ? 30 : 0);
    const spreadBaseline = 4 * Math.max(0, init.debt - P.debtThreshold) + 60 * Math.max(0, 3 - init.reserves) + 25 * Math.max(0, -init.ca - 4) + 15 * Math.max(0, init.infl - preset.defaultPolicy.inflationTarget - 3);
    const spread = Math.max(20, 0.6 * prev.spread + 0.4 * (spreadTarget - spreadBaseline));

    // Fiscal block and debt dynamics.
    const exporterOilRevenue = P.oilImportShare < 0 ? -P.oilImportShare * 0.4 * oilDev : 0;
    const commodityRevenue = P.commodityRevenueShare * commodityDev + exporterOilRevenue;
    const taxAdmin = sinceAdoption("tax-admin", t);
    const pb = structPB + P.autoStabilizer * gap + commodityRevenue - investDelta - imp.spendingAdd + (taxAdmin >= 0 ? 0.4 * Math.min(1, (taxAdmin + 1) / 4) : 0);
    // New debt is priced off the policy rate and spread; the stock reprices as it rolls over.
    const marketRate = rate + spread / 100 + P.termPremium;
    const marketRate0 = init.rate + init.spread / 100 + P.termPremium;
    const iEffTarget = init.iEff + P.marketDebtShare * (marketRate - marketRate0) - (has("debt-office") ? 0.3 : 0);
    const iEff = 0.95 * prev.iEff + 0.05 * iEffTarget;
    const interest = (iEff / 100) * prev.debt;
    const ob = pb - interest;
    const gdpLevel = potLevel * (1 + gap / 100);
    const growthQ = (gdpLevel / prev.gdpLevel - 1) * 400;
    const nominalGrowth = growthQ + infl;
    const debtParts = {
      interestGrowth: (prev.debt * (1 + iEff / 400)) / (1 + nominalGrowth / 400) - prev.debt,
      primary: -pb / 4,
      currency: P.fxDebtShare * prev.debt * (dE / 100),
    };
    let debt = prev.debt + debtParts.interestGrowth + debtParts.primary + debtParts.currency + imp.debtOneOff;
    if (haircut > 0) debt *= 1 - haircut / 100;
    debt = clamp(debt, 0, 400);
    const gfn = Math.max(0, -ob) + prev.debt / P.avgMaturity;

    // Current account.
    const ca =
      init.ca +
      P.exportElasticity * clamp(prev.rer - 100, -50, 80) -
      0.3 * (gap - init.gap) +
      (P.externalDemand * 0.6) * (partnerGrowth - WEO_REFERENCE.partnerGrowth) -
      P.oilImportShare * oilDev +
      P.commodityExportShare * commodityDev -
      0.3 * imp.spendingAdd -
      0.2 * investDelta;

    // Reserves.
    let reservesPct = prev.reservesPct - absorbed * P.k5 + imfDisb + (sinceAdoption("swap-line", t) === 0 ? 1.5 * monthOfImports : 0);
    if (pegBreak) reservesPct = Math.max(reservesPct, 0.5 * monthOfImports);
    reservesPct = Math.max(0.1 * monthOfImports, reservesPct);
    const reserves = reservesPct / monthOfImports;

    // Labour market.
    const nairu = prev.nairu + (P.nairu - 0.6 * effReform.labor - prev.nairu) * 0.1;
    const unemp = Math.max(1, nairu - P.okun * (has("safety-net") ? 0.8 : 1) * gap);

    // Growth, year on year.
    gdpHist.push(gdpLevel);
    const growth = (gdpLevel / gdpHist[gdpHist.length - 5] - 1) * 100;

    // Credibility.
    let dCred = 0;
    const inflDev = Math.abs(infl - pol.inflationTarget);
    dCred += inflDev <= 1 ? 0.5 : inflDev <= 3 ? 0 : -Math.min(2, (0.6 * (inflDev - 3)) / 2);
    dCred += debt < prev.debt ? 0.3 : debt > P.debtThreshold ? -0.3 : 0;
    if (reserves < 3 && regime !== "float") dCred -= 0.5;
    if (pol.rateMode === "manual" && regime !== "peg" && infl > pol.inflationTarget + 2 && realRate < 0) dCred -= 0.8;
    if (programActive) dCred += onTrack ? 0.3 : -0.8;
    if (haircut > 0) dCred -= 20;
    if (devalueAdd > 0) dCred -= 5;
    if (pegBreak) dCred -= 15;
    dCred += imp.credAdd < 0 && has("forward-guidance") ? imp.credAdd / 2 : imp.credAdd;
    if (has("cb-independence")) dCred += 0.25;
    if (has("fiscal-rule")) dCred += 0.1;
    const cred = clamp(prev.cred + dCred, 5, 100);

    if (pegBreak) events.push({ quarter: t, kind: "crisis", title: "Peg abandoned", detail: "Reserves ran out; the currency drops 20% and floats from here.", severity: "bad" });
    if (reserves < 1 && !reserveCrisisLogged) {
      reserveCrisisLogged = true;
      events.push({ quarter: t, kind: "crisis", title: "Reserves below one month of imports", detail: "Import cover is critically low; spreads climb and the peg is at risk.", severity: "bad" });
    } else if (reserves >= 2) reserveCrisisLogged = false;
    if (infl > 20 && !inflationSpiralLogged) {
      inflationSpiralLogged = true;
      events.push({ quarter: t, kind: "crisis", title: "Inflation above 20%", detail: "Expectations are de-anchoring; credibility is draining.", severity: "bad" });
    } else if (infl < 12) inflationSpiralLogged = false;
    if (spread > 1000 && !marketAccessLogged) {
      marketAccessLogged = true;
      events.push({ quarter: t, kind: "crisis", title: "Market access lost", detail: "Spreads above 1,000 bp; refinancing at market rates is no longer realistic.", severity: "bad" });
    } else if (spread < 700) marketAccessLogged = false;

    path.push({
      t,
      label: quarterLabel(t),
      gap,
      growth,
      infl,
      rate,
      realRate,
      rer,
      dE,
      debt,
      pb,
      ob,
      structPB,
      iEff,
      interest,
      gfn,
      ca,
      reserves,
      reservesPct,
      unemp,
      nairu,
      spread,
      cred,
      oil,
      commodity,
      potGrowth,
      potLevel,
      gdpLevel,
      regime,
      imfDisb,
      pressure,
      activeShocks: active,
      drivers: {
        infl: { ...inflParts, other: infl - prev.infl - sum(inflParts) },
        gap: { ...gapParts, other: gap - prev.gap - sum(gapParts) },
        debt: { ...debtParts, other: debt - prev.debt - sum(debtParts) },
      },
    });
    void globalGrowth;
  }

  const breaches = evaluateConstraints(path, config.constraints);
  return { path, events, breaches, shocks };
}

/** The WEO-style reference: preset defaults, reference assumptions, no decisions, no shocks. */
export function baselineConfig(presetId: string): ScenarioConfig {
  const preset = getPreset(presetId);
  return {
    presetId,
    assumptions: { ...WEO_REFERENCE, potentialGrowth: preset.potentialGrowth },
    decisions: [],
    oneOffs: [],
    shocks: [],
    randomShocks: false,
    seed: 1,
    constraints: [],
  };
}

export function regimeName(regime: FxRegime): string {
  return regime === "float" ? "floating" : regime === "managed" ? "managed float" : "peg";
}

const LEVER_LABELS: Record<keyof Policy, string> = {
  rateMode: "Rate setting",
  manualRate: "Policy rate",
  inflationTarget: "Inflation target",
  ruleStrength: "Rule strength",
  fxRegime: "FX regime",
  fxIntervention: "FX intervention",
  fiscalAdjustment: "Fiscal adjustment",
  adjustmentMix: "Adjustment mix",
  publicInvestment: "Public investment",
  laborReform: "Labour reform",
  productivityReform: "Productivity reform",
  tradeOpenness: "Trade openness",
  imfProgram: "IMF financing",
  capitalControls: "Capital controls",
};

export function describeChanges(changes: Partial<Policy>): string {
  const parts: string[] = [];
  for (const key of Object.keys(changes) as (keyof Policy)[]) {
    const v = changes[key];
    if (v === undefined) continue;
    const label = LEVER_LABELS[key];
    if (typeof v === "boolean") parts.push(`${label} ${v ? "on" : "off"}`);
    else if (key === "fxRegime") parts.push(`${label}: ${regimeName(v as FxRegime)}`);
    else if (key === "rateMode") parts.push(`${label}: ${v === "rule" ? "policy rule" : "manual"}`);
    else parts.push(`${label} ${formatLever(key, v as number)}`);
  }
  return parts.join(" · ");
}

export function formatLever(key: keyof Policy, v: number): string {
  switch (key) {
    case "manualRate":
    case "inflationTarget":
      return `${v.toFixed(2).replace(/\.?0+$/, "")}%`;
    case "fxIntervention":
    case "adjustmentMix":
      return `${Math.round(v)}%`;
    case "fiscalAdjustment":
      return `${v > 0 ? "+" : ""}${v.toFixed(2).replace(/\.?0+$/, "")} pp/yr`;
    case "publicInvestment":
    case "imfProgram":
      return `${v.toFixed(2).replace(/\.?0+$/, "")}% GDP`;
    case "ruleStrength":
      return `×${v.toFixed(1)}`;
    default:
      return `${v}`;
  }
}
