// Snapshot public sector data for each country into app/data/framework.json:
// the pieces of a macro framework (real, fiscal, external, monetary) that the
// WEO snapshot in weo.json does not carry. Run: node scripts/fetch-framework.mjs
//
// Sources, all public:
//   IMF DataMapper: Fiscal Monitor (revenue, expenditure, balances, net debt)
//                   and Assessing Reserve Adequacy (reserves in months, ARA ratio).
//   World Bank, World Development Indicators: national accounts by expenditure,
//                   saving, money and credit, FDI, remittances.
// The game is independent of both institutions.

import { readFile, writeFile } from "node:fs/promises";

const weo = JSON.parse(await readFile(new URL("../app/data/weo.json", import.meta.url), "utf8"));
const COUNTRIES = Object.keys(weo.countries);
const FIRST = 2015;
const LAST = 2031;

const IMF = {
  revenue: "GGR_G01_GDP_PT",
  expenditure: "G_X_G01_GDP_PT",
  primaryBalance: "GGXONLB_G01_GDP_PT",
  overallBalance: "GGXCNL_G01_GDP_PT",
  capb: "GGCBP_G01_PGDP_PT",
  netDebt: "GGXWDN_G01_GDP_PT",
  reservesMonths: "Reserves_M",
  reservesAra: "Reserves_ARA",
};
const WB = {
  exports: "NE.EXP.GNFS.ZS",
  imports: "NE.IMP.GNFS.ZS",
  privateConsumption: "NE.CON.PRVT.ZS",
  governmentConsumption: "NE.CON.GOVT.ZS",
  investment: "NE.GDI.TOTL.ZS",
  saving: "NY.GNS.ICTR.ZS",
  broadMoney: "FM.LBL.BMNY.GD.ZS",
  privateCredit: "FS.AST.PRVT.GD.ZS",
  reservesMonthsWb: "FI.RES.TOTL.MO",
  fdi: "BX.KLT.DINV.WD.GD.ZS",
  remittances: "BX.TRF.PWKR.DT.GD.ZS",
};

async function json(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "weo-lab data snapshot (github.com/CoyStan/weo-lab)" } });
      if (res.ok) return await res.json();
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  throw new Error(`Failed: ${url}`);
}

const out = { fetched: new Date().toISOString().slice(0, 10), sources: {}, countries: Object.fromEntries(COUNTRIES.map((iso) => [iso, {}])) };
const round = (v) => Math.round(Number(v) * 100) / 100;

const meta = await json("https://www.imf.org/external/datamapper/api/v1/indicators");
for (const [key, code] of Object.entries(IMF)) {
  const info = meta.indicators[code];
  out.sources[key] = { provider: "IMF", code, label: info.label, unit: info.unit, dataset: info.dataset ?? info.source };
  const data = await json(`https://www.imf.org/external/datamapper/api/v1/${code}`);
  const values = data.values?.[code] ?? {};
  for (const iso of COUNTRIES) {
    const s = {};
    for (let y = FIRST; y <= LAST; y++) if (values[iso]?.[y] !== undefined && values[iso][y] !== null) s[y] = round(values[iso][y]);
    out.countries[iso][key] = s;
  }
  await new Promise((r) => setTimeout(r, 600));
}

for (const [key, code] of Object.entries(WB)) {
  const data = await json(`https://api.worldbank.org/v2/country/${COUNTRIES.join(";")}/indicator/${code}?format=json&date=${FIRST}:2025&per_page=2000`);
  const rows = data[1] ?? [];
  out.sources[key] = { provider: "World Bank", code, label: rows[0]?.indicator?.value ?? code, unit: "", dataset: "World Development Indicators" };
  for (const iso of COUNTRIES) out.countries[iso][key] = {};
  for (const r of rows) if (r.value !== null && out.countries[r.countryiso3code]) out.countries[r.countryiso3code][key][r.date] = round(r.value);
  await new Promise((r) => setTimeout(r, 600));
}

await writeFile(new URL("../app/data/framework.json", import.meta.url), JSON.stringify(out));
const filled = (key) => COUNTRIES.filter((iso) => Object.keys(out.countries[iso][key]).length).length;
console.log(`Wrote ${COUNTRIES.length} countries. Coverage: ${Object.keys(out.sources).map((k) => `${k} ${filled(k)}`).join(", ")}`);
