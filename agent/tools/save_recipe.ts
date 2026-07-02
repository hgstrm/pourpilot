import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  createSavedRecipe,
  updateSavedRecipe,
} from "../../src/lib/db";
import { beanInfoSchema, recipeSchema } from "../../src/lib/recipe-schema";

const inputSchema = z.object({
  savedId: z.string().optional().describe("Existing saved recipe id to update."),
  recipe: recipeSchema,
  bean: beanInfoSchema.nullable().optional(),
});

export default defineTool({
  description:
    "Save a recipe to PourPilot's recipe collection, or update an existing saved recipe.",
  inputSchema,
  async execute(input) {
    if (input.savedId) {
      const updated = await updateSavedRecipe(input.savedId, {
        name: input.recipe.name,
        recipe: input.recipe,
        bean: input.bean ?? null,
      });
      if (!updated) {
        throw new Error(`No saved recipe found for id ${input.savedId}.`);
      }
      return jsonSafe(updated);
    }

    return jsonSafe(await createSavedRecipe({
      name: input.recipe.name,
      recipe: input.recipe,
      bean: input.bean ?? null,
    }));
  },
  toModelOutput(output) {
    return {
      type: "json",
      value: {
        id: output.id,
        name: output.name,
        bean: output.bean,
        recipe: output.recipe,
        xbloomId: output.xbloomId,
        shareUrl: output.shareUrl,
        updatedAt: output.updatedAt,
      },
    };
  },
});

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
