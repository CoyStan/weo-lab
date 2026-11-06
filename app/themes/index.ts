import atlas from "./atlas.ts";
import broadsheet from "./broadsheet.ts";
import brutalist from "./brutalist.ts";
import glass from "./glass.ts";
import institutional from "./institutional.ts";
import mission from "./mission.ts";
import nordic from "./nordic.ts";
import palari from "./palari.ts";
import swiss from "./swiss.ts";
import ledger from "./ledger.ts";
import consoleTheme from "./console.ts";
import tabletop from "./tabletop.ts";
import dossier from "./dossier.ts";
import sunset from "./sunset.ts";
import terminal from "./terminal.ts";
import toybox from "./toybox.ts";
import type { LabTheme } from "./types.ts";

/** The default design (the Ledger) first, then the original Palari design and the other candidates. */
export const THEMES: LabTheme[] = [ledger, palari, institutional, nordic, broadsheet, atlas, sunset, glass, toybox, brutalist, mission, terminal, swiss, consoleTheme, tabletop, dossier];

export function getTheme(id: string | null | undefined): LabTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
