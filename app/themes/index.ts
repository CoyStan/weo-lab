import atlas from "./atlas.ts";
import broadsheet from "./broadsheet.ts";
import brutalist from "./brutalist.ts";
import glass from "./glass.ts";
import institutional from "./institutional.ts";
import mission from "./mission.ts";
import nordic from "./nordic.ts";
import palari from "./palari.ts";
import sunset from "./sunset.ts";
import terminal from "./terminal.ts";
import toybox from "./toybox.ts";
import type { LabTheme } from "./types.ts";

/** The original design first, then the ten candidate designs. */
export const THEMES: LabTheme[] = [palari, institutional, nordic, broadsheet, atlas, sunset, glass, toybox, brutalist, mission, terminal];

export function getTheme(id: string | null | undefined): LabTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
