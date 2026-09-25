/**
 * One look for every chart, in both themes.
 *
 * Colours are CSS variables so a chart follows the light/dark toggle without
 * re-rendering. Note `--bl-surface` is NOT used: it stays white in dark mode.
 * Charts sit on `--better-surface-raised`, which does switch, so outlines and
 * label halos take that colour and blend into the card in either theme.
 */

const SURFACE = "var(--better-surface-raised)";

/** Axis labels: small and muted, so the data is what stands out. */
export const AXIS_TICK = { fill: "var(--better-text-muted)", fontSize: 12 } as const;

/** Category labels on bar charts (names, indicators): readable, not loud. */
export const CATEGORY_TICK = { fill: "var(--better-text-strong)", fontSize: 12 } as const;

/** Horizontal guides only, and faint. */
export const GRID = {
  stroke: "var(--better-border)",
  strokeOpacity: 0.7,
  vertical: false,
} as const;

/** A thin baseline for the x axis; value axes get no line at all. */
export const X_AXIS_LINE = { stroke: "var(--better-border)" } as const;

/**
 * Filled dots in the accent colour with a surface-coloured ring. Recharts'
 * default dot is white-filled, which vanishes on a white page and punches
 * gaps into the line.
 */
export const ACCENT_DOT = {
  r: 3.5,
  strokeWidth: 1.5,
  stroke: SURFACE,
  fill: "var(--bl-chart-accent)",
} as const;

export const ACCENT_ACTIVE_DOT = { ...ACCENT_DOT, r: 5, strokeWidth: 2 } as const;

/** Value labels with a halo, so they stay legible where they cross a line. */
export const VALUE_LABEL = {
  fontSize: 11,
  fill: "var(--better-text-muted)",
  stroke: SURFACE,
  strokeWidth: 3,
  paintOrder: "stroke",
} as const;
