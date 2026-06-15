import { generateObject } from "ai";
import { MODEL, withRetry } from "./ai";
import {
  recipeSchema,
  beanInfoSchema,
  type RecipeOutput,
  type BeanInfo,
} from "./recipe-schema";

// Tweak an existing recipe based on taste feedback or a desired style.
// Returns a full new recipe + a short note on what changed.

const ADJUST_PROMPT = `You are a world-class coffee brewer refining an EXISTING pour-over recipe for the xBloom Studio (Omni dripper).

You are given the current recipe and feedback about the last brew (or a desired change). Produce an improved recipe.

Apply real extraction theory:
- TOO BITTER / harsh / dry = OVER-extracted -> coarsen grind (raise grindSize a few points), lower temp 1-2C, and/or slightly shorter contact (fewer/shorter pauses), or lower ratio a touch.
- TOO SOUR / sharp / thin = UNDER-extracted -> finer grind (lower grindSize), raise temp 1-2C, add a little contact time, or raise ratio.
- TOO WEAK / watery = raise dose strength: lower ratio (e.g. 1:16 -> 1:15) or finer grind.
- TOO STRONG / intense = raise ratio or coarsen slightly.
- "BRIGHTER" / more acidity / clarity = finer grind + hotter water + higher ratio; gentler agitation.
- "SWEETER" / more body / rounder = a touch coarser or cooler, more even pours, maybe lower ratio.
- "STRONGER" = lower ratio (more coffee relative to water).

Rules:
- Make MEASURED changes (don't overcorrect). Usually adjust 1-3 variables.
- Keep the same dose unless the feedback is about strength/ratio.
- Sum of pour volumes MUST equal doseG * ratio (within ~5ml). Recompute pours if you change dose/ratio.
- grindSize uses the xBloom 40-120 scale (lower = finer). flowRate 3.0-3.5.
- Keep the recipe name stable, but you may append a short suffix like " (brighter)" if it's a style variation.

Return the FULL updated recipe.`;

export const adjustSchema = recipeSchema.extend({
  changeNote: recipeSchema.shape.reasoning.describe(
    "1-2 sentences: what you changed and why, in plain language.",
  ),
});

export type AdjustedRecipe = RecipeOutput & { changeNote: string };

export async function adjustRecipe(input: {
  recipe: RecipeOutput;
  bean?: BeanInfo | null;
  /** Free-text feedback or a preset like "too bitter" / "brighter". */
  feedback: string;
}): Promise<AdjustedRecipe> {
  const beanLine = input.bean
    ? `Bean info:\n${JSON.stringify(beanInfoSchema.parse(input.bean), null, 2)}\n\n`
    : "";

  const { object } = await withRetry(() =>
    generateObject({
      model: MODEL,
      schema: adjustSchema,
      system: ADJUST_PROMPT,
      prompt: `${beanLine}Current recipe:
${JSON.stringify(input.recipe, null, 2)}

Feedback / desired change:
"""${input.feedback}"""

Produce the improved full recipe and a short changeNote.`,
    }),
  );

  return object as AdjustedRecipe;
}

// Preset one-tap remixes / feedback chips surfaced in the UI.
export const FEEDBACK_PRESETS = [
  { key: "bitter", label: "Too bitter", feedback: "The last brew was too bitter / harsh." },
  { key: "sour", label: "Too sour", feedback: "The last brew was too sour / sharp." },
  { key: "weak", label: "Too weak", feedback: "The last brew was too weak / watery." },
  { key: "strong", label: "Too strong", feedback: "The last brew was too strong / intense." },
  { key: "brighter", label: "Brighter", feedback: "Make a brighter version with more acidity and clarity." },
  { key: "sweeter", label: "Sweeter", feedback: "Make a sweeter, rounder version with more body." },
] as const;
