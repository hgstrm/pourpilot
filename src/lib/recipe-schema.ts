import { z } from "zod";

// Structured output schema for the AI. Mirrors the xBloom recipe model
// with validated ranges so the model can't hand us something the machine
// would reject.

export const pourSchema = z.object({
  volumeMl: z
    .number()
    .int()
    .min(5)
    .max(500)
    .describe("Integer ml of water added during THIS pour only, not cumulative"),
  temperatureC: z
    .number()
    .min(40)
    .max(99)
    .describe("Water temperature in Celsius for this pour"),
  pattern: z
    .enum(["centered", "spiral", "circular"])
    .describe("Spout movement pattern"),
  flowRate: z.number().min(3.0).max(3.5).describe("Flow rate in ml/s"),
  pauseSeconds: z
    .number()
    .int()
    .min(0)
    .max(255)
    .describe("Pause AFTER this pour in seconds (bloom dwell, between pours)"),
  agitateBefore: z.boolean().describe("Vibrate dripper before this pour"),
  agitateAfter: z.boolean().describe("Vibrate dripper after this pour"),
});

export const beanInfoSchema = z.object({
  name: z
    .string()
    .nullable()
    .describe("Coffee name if available from the current source; otherwise null"),
  roaster: z
    .string()
    .nullable()
    .describe("Roaster / brand if available from the current source; otherwise null"),
  origin: z
    .string()
    .nullable()
    .describe("Country / region of origin if available; otherwise null"),
  process: z
    .string()
    .nullable()
    .describe("Process if listed or confirmed: washed, natural, honey, anaerobic, etc.; otherwise null"),
  varietal: z
    .string()
    .nullable()
    .describe("Coffee varietal(s) if listed or confirmed; otherwise null"),
  roastLevel: z
    .enum(["light", "medium-light", "medium", "medium-dark", "dark", "unknown"])
    .describe("Roast level only when explicitly stated or shown on a visible roast scale; otherwise unknown"),
  tastingNotes: z
    .array(z.string())
    .describe("Printed or roaster-published tasting notes; empty array if unavailable"),
});

export const recipeSchema = z.object({
  name: z
    .string()
    .max(40)
    .describe("Short recipe name, e.g. coffee name + style"),
  doseG: z.number().min(5).max(31).describe("Coffee dose in grams"),
  ratio: z
    .number()
    .min(12)
    .max(20)
    .describe("Numeric brew ratio, e.g. 16 for 1:16. Total water = doseG * ratio"),
  grindSize: z
    .number()
    .int()
    .min(40)
    .max(120)
    .describe("Grind size 40-120, lower = finer"),
  grindRpm: z
    .number()
    .int()
    .min(60)
    .max(120)
    .describe("Grinder RPM (60-120, step ~10)"),
  pours: z
    .array(pourSchema)
    .min(1)
    .max(6)
    .describe("Ordered incremental pours; the FIRST pour is the bloom"),
  reasoning: z
    .string()
    .describe(
      "1-3 sentences explaining the brewing choices. Acknowledge sparse bean info when relevant instead of inventing certainty",
    ),
});

export const analysisSchema = z.object({
  bean: beanInfoSchema,
  recipe: recipeSchema,
});

export type BeanInfo = z.infer<typeof beanInfoSchema>;
export type AnalysisResult = z.infer<typeof analysisSchema>;
export type RecipeOutput = z.infer<typeof recipeSchema>;
