// xBloom recipe domain types.
//
// These mirror the params the xBloom app exposes for a custom recipe,
// expressed in friendly units. The wire-format translation lives in client.ts.

export type PourPattern = "centered" | "spiral" | "circular";

export interface Pour {
  /** Water added during THIS pour step, in ml/grams (not cumulative). */
  volumeMl: number;
  /** Water temperature in Celsius (40-95 typical; boiling ~95-98). */
  temperatureC: number;
  /** Spout movement pattern. */
  pattern: PourPattern;
  /** Flow rate in ml/s (3.0-3.5). */
  flowRate: number;
  /** Pause AFTER this pour, in seconds (0-255). Used for bloom dwell etc. */
  pauseSeconds: number;
  /** Agitate (vibrate dripper) before pouring. */
  agitateBefore: boolean;
  /** Agitate (vibrate dripper) after pouring. */
  agitateAfter: boolean;
}

export interface CoffeeRecipe {
  name: string;
  /** Coffee dose in grams (1-31). */
  doseG: number;
  /** Brew ratio, e.g. 15 means 1:15. Total water = doseG * ratio. */
  ratio: number;
  /** Grind size 40-120 (lower = finer). */
  grindSize: number;
  /** Grinder RPM 60-120. */
  grindRpm: number;
  /** Ordered pour steps; first is treated as the Bloom. */
  pours: Pour[];
  /** Optional hex color shown in the app. */
  color?: string;
}

export interface XbloomCredentials {
  memberId: number;
  token: string;
  email: string;
}

export interface XbloomApiResult {
  result?: string;
  error?: string;
  [key: string]: unknown;
}
