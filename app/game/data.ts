import weo from "../data/weo.json";
import framework from "../data/framework.json";
import type { FrameworkData } from "../desk/framework";
import { setFrameworkData, type WeoData } from "./economies";

/** IMF World Economic Outlook snapshot (see scripts/fetch-weo.mjs). */
export const WEO = weo as unknown as WeoData;

/** Public sector data by country: IMF Fiscal Monitor and reserve adequacy, World Bank national accounts (see scripts/fetch-framework.mjs). */
export const FRAMEWORK = framework as unknown as FrameworkData;
setFrameworkData(FRAMEWORK);
