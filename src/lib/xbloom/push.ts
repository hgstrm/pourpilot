import { z } from "zod";
import { getSavedRecipe, updateSavedRecipe } from "../db";
import { normalizePours } from "../client-types";
import { recipeSchema } from "../recipe-schema";
import { getXbloomCredentials } from "../runtime-settings";
import { createRecipe, editRecipe, login } from "./client";
import type { CoffeeRecipe } from "./types";

export const pushRecipeInputSchema = z.object({
  recipe: recipeSchema,
  color: z.string().optional(),
  savedId: z
    .string()
    .optional()
    .describe("Saved DB row to update with the resulting xBloom id."),
  xbloomId: z
    .number()
    .optional()
    .describe("Existing xBloom recipe id to edit in place."),
});

export const pushRecipeResultSchema = z.object({
  ok: z.literal(true),
  updated: z.boolean(),
  xbloomId: z.number(),
  shareUrl: z.string().optional(),
});

export type PushRecipeInput = z.infer<typeof pushRecipeInputSchema>;
export type PushRecipeResult = z.infer<typeof pushRecipeResultSchema>;

export async function pushRecipeToXbloom(
  input: PushRecipeInput,
): Promise<PushRecipeResult> {
  const { email, password } = await getXbloomCredentials();

  const r = normalizePours(input.recipe);
  const recipe: CoffeeRecipe = {
    name: r.name,
    doseG: r.doseG,
    ratio: r.ratio,
    grindSize: r.grindSize,
    grindRpm: r.grindRpm,
    pours: r.pours,
    color: input.color,
  };

  let xbloomId = input.xbloomId ?? null;
  if (!xbloomId && input.savedId) {
    const existing = await getSavedRecipe(input.savedId);
    if (existing?.xbloomId) xbloomId = existing.xbloomId;
  }

  const creds = await login(email, password);

  if (xbloomId) {
    await editRecipe(creds, xbloomId, recipe);
    if (input.savedId) {
      await updateSavedRecipe(input.savedId, { recipe: r });
    }
    return { ok: true, updated: true, xbloomId };
  }

  const created = await createRecipe(creds, recipe);
  if (input.savedId) {
    await updateSavedRecipe(input.savedId, {
      recipe: r,
      xbloomId: created.recipeId,
      shareUrl: created.shareUrl,
    });
  }

  return {
    ok: true,
    updated: false,
    xbloomId: created.recipeId,
    shareUrl: created.shareUrl,
  };
}
