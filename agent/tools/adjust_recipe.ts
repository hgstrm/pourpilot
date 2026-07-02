import { defineTool } from "eve/tools";
import { z } from "zod";
import { adjustRecipe, adjustSchema } from "../../src/lib/adjust";
import { updateSavedRecipe } from "../../src/lib/db";
import {
  beanInfoSchema,
  recipeSchema,
  type RecipeOutput,
} from "../../src/lib/recipe-schema";

const inputSchema = z.object({
  savedId: z
    .string()
    .optional()
    .describe(
      "Saved PourPilot recipe id. Pass this when adjusting a recipe from list_saved_recipes so the result can be saved and linked.",
    ),
  recipe: recipeSchema,
  bean: beanInfoSchema.nullable().optional(),
  feedback: z
    .string()
    .min(1)
    .describe("Taste feedback or desired style, such as too bitter or brighter."),
});

const changeSummarySchema = z.object({
  label: z.string(),
  before: z.string(),
  after: z.string(),
  detail: z.string(),
});

const outputSchema = z.object({
  recipe: adjustSchema,
  saved: z.boolean(),
  savedId: z.string().optional(),
  recipeUrl: z.string().optional(),
  changes: z.array(changeSummarySchema),
});

export default defineTool({
  description:
    "Adjust an existing xBloom pour-over recipe from brew feedback or a requested style change. If savedId is provided, save the adjusted recipe back to PourPilot.",
  inputSchema,
  outputSchema,
  async execute(input) {
    const adjusted = await adjustRecipe({
      recipe: input.recipe,
      bean: input.bean ?? null,
      feedback: input.feedback,
    });
    const changes = summarizeChanges(input.recipe, adjusted);
    const recipeForSave = recipeSchema.parse(adjusted);
    let savedId = input.savedId;

    if (savedId) {
      const updated = await updateSavedRecipe(savedId, {
        name: recipeForSave.name,
        recipe: recipeForSave,
        ...(input.bean !== undefined ? { bean: input.bean ?? null } : {}),
      });
      if (!updated) {
        throw new Error(`No saved recipe found for id ${savedId}.`);
      }
      savedId = updated.id;
    }

    return jsonSafe({
      recipe: adjusted,
      saved: Boolean(savedId),
      savedId,
      recipeUrl: savedId ? `/recipes/${savedId}` : undefined,
      changes,
    });
  },
  toModelOutput(output) {
    const { recipe } = output;
    return {
      type: "json",
      value: {
        name: recipe.name,
        saved: output.saved,
        savedId: output.savedId,
        recipeUrl: output.recipeUrl,
        doseG: recipe.doseG,
        ratio: recipe.ratio,
        grindSize: recipe.grindSize,
        grindRpm: recipe.grindRpm,
        pours: recipe.pours,
        changeNote: recipe.changeNote,
        changes: output.changes,
      },
    };
  },
});

function summarizeChanges(
  before: RecipeOutput,
  after: RecipeOutput,
): z.infer<typeof changeSummarySchema>[] {
  const changes: z.infer<typeof changeSummarySchema>[] = [];

  if (before.grindSize !== after.grindSize) {
    changes.push({
      label: "Grind",
      before: `${before.grindSize}`,
      after: `${after.grindSize}`,
      detail: after.grindSize < before.grindSize ? "finer" : "coarser",
    });
  }

  if (before.ratio !== after.ratio) {
    changes.push({
      label: "Ratio",
      before: `1:${formatNumber(before.ratio)}`,
      after: `1:${formatNumber(after.ratio)}`,
      detail: after.ratio < before.ratio ? "stronger cup" : "lighter cup",
    });
  }

  const beforeTemp = weightedTemperature(before);
  const afterTemp = weightedTemperature(after);
  if (beforeTemp !== afterTemp) {
    changes.push({
      label: "Water temp",
      before: `${beforeTemp}C`,
      after: `${afterTemp}C`,
      detail: afterTemp > beforeTemp ? "hotter extraction" : "cooler extraction",
    });
  }

  const beforeWater = totalWater(before);
  const afterWater = totalWater(after);
  if (beforeWater !== afterWater) {
    changes.push({
      label: "Brew water",
      before: `${beforeWater}ml`,
      after: `${afterWater}ml`,
      detail: afterWater > beforeWater ? "more dilution" : "more concentrate",
    });
  }

  const beforeBloom = before.pours[0]?.pauseSeconds;
  const afterBloom = after.pours[0]?.pauseSeconds;
  if (beforeBloom !== undefined && afterBloom !== undefined && beforeBloom !== afterBloom) {
    changes.push({
      label: "Bloom pause",
      before: `${beforeBloom}s`,
      after: `${afterBloom}s`,
      detail: afterBloom > beforeBloom ? "longer saturation" : "shorter bloom",
    });
  }

  if (before.pours.length !== after.pours.length) {
    changes.push({
      label: "Pour count",
      before: `${before.pours.length}`,
      after: `${after.pours.length}`,
      detail: after.pours.length > before.pours.length ? "more stages" : "fewer stages",
    });
  }

  return changes.slice(0, 5);
}

function weightedTemperature(recipe: RecipeOutput): number {
  const water = totalWater(recipe);
  if (!water) return Math.round(recipe.pours[0]?.temperatureC ?? 0);
  return Math.round(
    recipe.pours.reduce(
      (sum, pour) => sum + pour.temperatureC * pour.volumeMl,
      0,
    ) / water,
  );
}

function totalWater(recipe: RecipeOutput): number {
  return recipe.pours.reduce((sum, pour) => sum + pour.volumeMl, 0);
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
