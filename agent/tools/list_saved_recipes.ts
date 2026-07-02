import { defineTool } from "eve/tools";
import { z } from "zod";
import { listSavedRecipes } from "../../src/lib/db";

export default defineTool({
  description: "List saved PourPilot recipes so the user can choose one.",
  inputSchema: z.object({}),
  async execute() {
    const recipes = await listSavedRecipes();
    return recipes.map((recipe) => jsonSafe({
      id: recipe.id,
      name: recipe.name,
      bean: recipe.bean,
      recipe: recipe.recipe,
      xbloomId: recipe.xbloomId,
      shareUrl: recipe.shareUrl,
      updatedAt: recipe.updatedAt,
    }));
  },
  toModelOutput(output) {
    return {
      type: "json",
      value: output.map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        bean: recipe.bean,
        recipe: recipe.recipe,
        xbloomId: recipe.xbloomId,
        shareUrl: recipe.shareUrl,
        updatedAt: recipe.updatedAt,
      })),
    };
  },
});

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
