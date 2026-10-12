// Snapshot the IMF World Economic Outlook series the game uses, from the public
// IMF DataMapper API, into app/data/weo.json. Run: node scripts/fetch-weo.mjs
//
// Data: IMF, World Economic Outlook database (vintage reported by the API).
// The game is independent of the IMF; see the disclaimer in the README.

import { writeFile } from "node:fs/promises";

const INDICATORS = {
  growth: "NGDP_RPCH",
  infl: "PCPIPCH",
  debt: "GGXWDG_NGDP",
  balance: "GGXCNL_NGDP",
  ca: "BCA_NGDPD",
  unemp: "LUR",
  gdp: "NGDPD",
};

// Present-day countries and the countries of the historical episodes.
const COUNTRIES = ["USA", "DEU", "JPN", "GBR", "ITA", "BRA", "MEX", "IND", "IDN", "TUR", "ZAF", "CHL", "COL", "POL", "EGY", "NGA", "KEN", "PAK", "PHL", "ARG", "THA", "ISL", "GRC", "KOR", "CHN", "FRA", "CAN", "SAU", "AUS", "VNM"];
const FIRST_YEAR = 1990;
const LAST_YEAR = 2031;

const api = "https://www.imf.org/external/datamapper/api/v1";

async function json(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": "weo-lab data snapshot (github.com/CoyStan/weo-lab)" } });
    if (res.ok) return res.json();
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
  throw new Error(`Failed: ${url}`);
}

const meta = await json(`${api}/indicators`);
const countryMeta = await json(`${api}/countries`);
const out = { source: {}, fetched: new Date().toISOString().slice(0, 10), url: "https://www.imf.org/external/datamapper/", countries: {} };

for (const [key, code] of Object.entries(INDICATORS)) {
  const info = meta.indicators[code];
  out.source[key] = { code, label: info.label, unit: info.unit, dataset: info.source };
  const data = await json(`${api}/${code}`);
  const values = data.values[code];
  for (const iso of COUNTRIES) {
    const series = values[iso] ?? {};
    const c = (out.countries[iso] ??= { name: countryMeta.countries[iso]?.label ?? iso, series: {} });
    c.series[key] = {};
    for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) if (series[y] !== undefined && series[y] !== null) c.series[key][y] = Number(series[y]);
  }
  await new Promise((r) => setTimeout(r, 800));
}

const vintages = new Set(Object.values(out.source).map((s) => s.dataset));
out.vintage = [...vintages].join("; ");
await writeFile(new URL("../app/data/weo.json", import.meta.url), JSON.stringify(out));
console.log(`Wrote ${COUNTRIES.length} countries, vintage: ${out.vintage}`);
