import weo from "../data/weo.json";
import type { WeoData } from "./economies";

/** IMF World Economic Outlook snapshot (see scripts/fetch-weo.mjs). */
export const WEO = weo as unknown as WeoData;
