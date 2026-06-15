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
