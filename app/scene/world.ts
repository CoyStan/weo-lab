import { generateWorld } from "./hexmap.ts";

/** The one island everyone shares; generation is deterministic. */
export const WORLD = generateWorld();
