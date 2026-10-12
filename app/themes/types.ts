import type { ScenePalette } from "../scene/palette.ts";

/**
 * A complete visual design for the lab. One theme lives in one file under
 * app/themes/ and changes nothing outside the lab.
 */
export type LabTheme = {
  /** kebab-case id; also the file name and the ?theme= URL value. */
  id: string;
  /** Short display name, 1–3 words. */
  name: string;
  /** One sentence on the design idea, shown in the design picker. */
  description: string;
  /** "light" or "dark": sets the browser colour scheme for form controls and scrollbars. */
  scheme: "light" | "dark";
  /**
   * CSS custom properties applied on the lab root. Any key left out keeps the
   * default from weo-lab.css. Every value must be a valid CSS value.
   */
  vars: Partial<Record<ThemeVar, string>>;
  /**
   * Optional extra CSS. Every selector MUST start with `.lab[data-theme="<id>"]`
   * so the theme cannot leak. Use it for textures, borders, letter-spacing,
   * label styling, button shapes and similar finishing touches.
   */
  css?: string;
  /** The 3D island palette. Keys left out keep the default. */
  scene: Partial<ScenePalette>;
};

export type ThemeVar =
  | "--lab-bg"
  | "--lab-paper"
  | "--lab-surface"
  | "--lab-scene-bg"
  | "--lab-ink"
  | "--lab-ink-2"
  | "--lab-line"
  | "--lab-line-strong"
  | "--lab-accent-from"
  | "--lab-accent-to"
  | "--lab-on-accent"
  | "--lab-focus"
  | "--lab-scenario"
  | "--lab-reference"
  | "--lab-pinned"
  | "--lab-good"
  | "--lab-warn"
  | "--lab-bad"
  | "--lab-info"
  | "--lab-good-mark"
  | "--lab-warn-mark"
  | "--lab-alert"
  | "--lab-info-mark"
  | "--lab-bad-surface"
  | "--lab-good-surface"
  | "--lab-good-bg"
  | "--lab-warn-bg"
  | "--lab-bad-bg"
  | "--lab-info-bg"
  | "--lab-font-ui"
  | "--lab-font-display"
  | "--lab-font-mono"
  | "--lab-radius-panel"
  | "--lab-radius-card"
  | "--lab-radius-control"
  | "--lab-panel-shadow";
