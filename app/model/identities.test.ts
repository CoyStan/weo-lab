import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { baselineConfig, simulate } from "./economy.ts";
import type { QuarterState, ScenarioConfig } from "./types.ts";
import { MISSIONS } from "../game/missions.ts";
import { buildEpisode, EPISODES, TODAY, todayMission, type WeoData } from "../game/economies.ts";

const data = JSON.parse(readFileSync(new URL("../data/weo.json", import.meta.url), "utf8")) as WeoData;
const EPS = 1e-9;

/** Every scenario we can construct: presets, campaign missions, history, today, and stress variants. */
function scenarios(): { name: string; config: ScenarioConfig }[] {
  const out: { name: string; config: ScenarioConfig }[] = [];
  for (const id of ["aurelia", "boreas", "castellan", "dumara"]) out.push({ name: `preset ${id}`, config: baselineConfig(id) });
  for (const m of MISSIONS) out.push({ name: `mission ${m.id}`, config: m.setup() });
  for (const ep of EPISODES) {
    const { mission, history } = buildEpisode(data, ep);
    out.push({ name: `episode ${ep.id} (history)`, config: history });
    out.push({ name: `episode ${ep.id} (start)`, config: mission.setup() });
  }
  for (const spec of TODAY.filter((_, i) => i % 3 === 0)) out.push({ name: `today ${spec.iso}`, config: todayMission(data, spec, 7).setup() });

  // Stress variants on two contrasting economies.
  for (const id of ["aurelia", "dumara"]) {
    const base = baselineConfig(id);
    const shock = (kind: ScenarioConfig["shocks"][number]["kind"], q: number, m = 1.5) => ({ id: `s-${kind}`, kind, quarter: q, magnitude: m, source: "scheduled" as const });
    out.push({ name: `${id} oil spike`, config: { ...base, shocks: [shock("oil-spike", 2)] } });
    out.push({ name: `${id} sudden stop`, config: { ...base, shocks: [shock("sudden-stop", 3, 2)] } });
    out.push({ name: `${id} random shocks`, config: { ...base, randomShocks: true, seed: 42 } });
    out.push({ name: `${id} devaluation + restructuring`, config: { ...base, decisions: [{ quarter: 1, changes: { fxRegime: "managed" } }], oneOffs: [{ id: "d", quarter: 3, kind: "devalue", value: 20 }, { id: "r", quarter: 5, kind: "restructure", value: 30 }] } });
    out.push({ name: `${id} IMF programme + controls`, config: { ...base, decisions: [{ quarter: 1, changes: { imfProgram: 4, fiscalAdjustment: 1, capitalControls: true } }] } });
    out.push({ name: `${id} regime switches`, config: { ...base, decisions: [{ quarter: 2, changes: { fxRegime: "peg" } }, { quarter: 6, changes: { fxRegime: "float" } }, { quarter: 10, changes: { fxRegime: "managed", fxIntervention: 80 } }] } });
    out.push({ name: `${id} swap line + reforms`, config: { ...base, institutions: [{ id: "swap-line", quarter: 4 }], decisions: [{ quarter: 1, changes: { laborReform: 3, productivityReform: 3, publicInvestment: 6, adjustmentMix: 0, fiscalAdjustment: -1 } }] } });
  }
  return out;
}

function close(a: number, b: number, what: string) {
  assert.ok(Number.isFinite(a) && Number.isFinite(b), `${what}: not finite (${a}, ${b})`);
  assert.ok(Math.abs(a - b) < EPS * Math.max(1, Math.abs(a), Math.abs(b)) * 1e3, `${what}: ${a} vs ${b} (diff ${a - b})`);
}

function checkQuarter(name: string, prev: QuarterState, s: QuarterState) {
  const a = s.acct;
  const at = `${name} ${s.label}`;
  // 1. National accounts.
  close(a.cons + a.inv + a.gov + a.exports - a.imports, 100, `${at} GDP = C + I + G + X - M`);
  close(a.nx, a.exports - a.imports, `${at} net exports`);
  // 2. Current account.
  close(s.ca, a.nx + a.primaryIncome + a.transfers, `${at} CA = trade + income + transfers`);
  // 3. Balance of payments.
  close(s.ca + a.fa + a.official - a.dReserves, 0, `${at} BoP`);
  close(a.fa, a.faFdi + a.faPortfolio + a.faOther, `${at} financial account components`);
  // 4. Reserves accumulate by the BoP.
  close(s.reservesPct, prev.reservesPct + a.dReserves / 4, `${at} reserves stock-flow`);
  // 5. External stock-flow.
  const nominalGrowth = (s.gdpLevel / prev.gdpLevel - 1) * 400 + s.infl;
  close(a.nfa, prev.acct.nfa / (1 + nominalGrowth / 400) + s.ca / 4 + a.nfaValuation, `${at} NFA stock-flow`);
  // 6. Saving - investment.
  close(a.publicSI, s.ob, `${at} public S - I = overall balance`);
  close(a.privateSI + a.publicSI, s.ca, `${at} private + public S - I = CA`);
  // 7. Monetary survey.
  close(a.money, a.mNfa + a.creditGov + a.creditPrivate + a.otherNet, `${at} money = NFA + NDA`);
  close(a.mNfa, s.reservesPct, `${at} monetary NFA = reserves`);
  // 8. Public debt dynamics.
  const d = s.drivers.debt;
  close(s.debt - prev.debt, d.interestGrowth + d.primary + d.currency + d.other, `${at} debt dynamics`);
}

function plausible(name: string, s: QuarterState) {
  const a = s.acct;
  const at = `${name} ${s.label}`;
  for (const [k, v] of Object.entries(a)) assert.ok(Number.isFinite(v), `${at} ${k} is not finite`);
  assert.ok(a.cons > 30 && a.cons < 95, `${at} consumption ${a.cons.toFixed(1)}% of GDP`);
  assert.ok(a.inv >= 5 && a.inv <= 45, `${at} investment ${a.inv.toFixed(1)}`);
  assert.ok(a.gov > 5 && a.gov < 50, `${at} government ${a.gov.toFixed(1)}`);
  assert.ok(a.exports > 0 && a.exports < 130 && a.imports > 0 && a.imports < 130, `${at} trade ${a.exports.toFixed(1)}/${a.imports.toFixed(1)}`);
  assert.ok(a.money > 5 && a.money < 220, `${at} money ${a.money.toFixed(1)}`);
  assert.ok(Math.abs(a.nfa) < 300, `${at} NFA ${a.nfa.toFixed(1)}`);
}

test("the accounts add up every quarter, in every scenario", () => {
  let quarters = 0;
  for (const { name, config } of scenarios()) {
    const path = simulate(config).path;
    for (let t = 1; t < path.length; t++) {
      checkQuarter(name, path[t - 1], path[t]);
      quarters++;
    }
    // The initial state is consistent too.
    const a = path[0].acct;
    close(a.cons + a.inv + a.gov + a.nx, 100, `${name} start GDP`);
    close(path[0].ca + a.fa + a.official - a.dReserves, 0, `${name} start BoP`);
    close(path[0].ca, a.nx + a.primaryIncome + a.transfers, `${name} start CA`);
  }
  assert.ok(quarters > 900, `checked ${quarters} quarters`);
});

test("the accounts stay in plausible ranges", () => {
  for (const { name, config } of scenarios()) for (const s of simulate(config).path) plausible(name, s);
});

test("the external accounts respond in the right direction", () => {
  // A sudden stop: private inflows dry up, and a floating currency falls until the current account
  // improves. (The real exchange rate must be allowed to move: the WEO convention holds it flat.)
  const moving = (id: string): ScenarioConfig => {
    const b = baselineConfig(id);
    return { ...b, assumptions: { ...b.assumptions, rerConvention: "model" } };
  };
  const base = simulate(moving("aurelia")).path;
  const stop = simulate({ ...moving("aurelia"), shocks: [{ id: "s", kind: "sudden-stop", quarter: 2, magnitude: 2, source: "scheduled" }] }).path;
  assert.ok(stop[3].acct.faPortfolio < base[3].acct.faPortfolio, "portfolio flows fall in a sudden stop");
  assert.ok(stop[8].ca > base[8].ca, "the current account improves after the currency falls");
  // Persistent deficits build liabilities, which raise income payments abroad.
  const dumara = simulate(baselineConfig("dumara")).path;
  assert.ok(dumara[24].acct.nfa < dumara[0].acct.nfa, "a frontier economy running deficits builds external liabilities");
  // An IMF programme shows up as official financing and rebuilds reserves.
  const prog = simulate({ ...baselineConfig("dumara"), decisions: [{ quarter: 1, changes: { imfProgram: 4, fiscalAdjustment: 1 } }] }).path;
  assert.ok(prog[4].acct.official > 0 && prog[4].reservesPct > dumara[4].reservesPct, "programme money is official financing and builds reserves");
  // A spending-based consolidation lowers government consumption in the national accounts.
  const cut = simulate({ ...baselineConfig("castellan"), decisions: [{ quarter: 1, changes: { fiscalAdjustment: 1, adjustmentMix: 0 } }] }).path;
  const castellan = simulate(baselineConfig("castellan")).path;
  assert.ok(cut[8].acct.gov < castellan[8].acct.gov - 1.5, "spending cuts reduce G");
});
