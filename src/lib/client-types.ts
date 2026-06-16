import type { BeanInfo, RecipeOutput } from "./recipe-schema";

export interface SavedRecipeDTO {
  id: string;
  name: string;
  bean: BeanInfo | null;
  recipe: RecipeOutput;
  xbloomId: number | null;
  shareUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export const PATTERNS = ["centered", "spiral", "circular"] as const;

export function totalWater(recipe: RecipeOutput): number {
  return recipe.pours.reduce((sum, p) => sum + (p.volumeMl || 0), 0);
}

export function targetWater(recipe: RecipeOutput): number {
  return Math.round(recipe.doseG * recipe.ratio);
}

/**
 * Force the pour volumes to sum exactly to dose × ratio.
 * Scales every pour proportionally, then puts any rounding remainder on the
 * last pour. Keeps the relative shape of the recipe (bloom ratio, taper).
 * No-op if pours already sum to the target.
 */
export function normalizePours(recipe: RecipeOutput): RecipeOutput {
  const target = targetWater(recipe);
  const current = totalWater(recipe);
  if (!recipe.pours.length || current <= 0) return recipe;
  if (current === target) return recipe;

  const scale = target / current;
  const scaled = recipe.pours.map((p) => ({
    ...p,
    volumeMl: Math.max(1, Math.round(p.volumeMl * scale)),
  }));

  // Fix any rounding drift by adjusting the final pour.
  const drift = target - scaled.reduce((s, p) => s + p.volumeMl, 0);
  if (drift !== 0) {
    const last = scaled.length - 1;
    scaled[last] = {
      ...scaled[last],
      volumeMl: Math.max(1, scaled[last].volumeMl + drift),
    };
  }

  return { ...recipe, pours: scaled };
}
