/**
 * Stable DOM layer for every drei <Html> overlay. Without an explicit portal
 * drei mounts each overlay into the canvas's parent, which only exists after
 * the canvas attaches; the target then changes once and the first overlay's
 * root is torn down mid-render and left empty.
 */
export const labelLayer: { current: HTMLDivElement | null } = { current: null };
