import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  analyzeBeanImage,
  analyzeResponseSchema,
} from "../../src/lib/analyze";

const inputSchema = z.object({
  images: z
    .array(z.string().startsWith("data:image/"))
    .max(3)
    .optional()
    .describe("Coffee bag photos as data URLs. Include front and back when available."),
  search: z
    .boolean()
    .optional()
    .describe("Force online research even if the bag read is not sparse."),
  url: z.string().url().optional().describe("Optional roaster product URL."),
  details: z
    .string()
    .optional()
    .describe("User notes, preferences, dose targets, or known bean details."),
  brewMode: z.enum(["hot", "iced"]).optional(),
  brewWaterMl: z
    .number()
    .min(40)
    .max(500)
    .optional()
    .describe("For iced recipes, hot water poured by xBloom."),
  iceG: z
    .number()
    .min(0)
    .max(500)
    .optional()
    .describe("For iced recipes, ice added separately to the cup or carafe."),
});

export default defineTool({
  description:
    "Analyze optional coffee bag photos, roaster context, or notes, then produce a full xBloom pour-over recipe.",
  inputSchema,
  outputSchema: analyzeResponseSchema,
  async execute(input) {
    const result = await analyzeBeanImage(input.images ?? [], {
      search: input.search,
      url: input.url,
      details: input.details,
      brewMode: input.brewMode,
      brewWaterMl: input.brewWaterMl,
      iceG: input.iceG,
    });
    return result;
  },
  toModelOutput(output) {
    return {
      type: "json",
      value: {
        bean: output.bean,
        recipe: {
          name: output.recipe.name,
          doseG: output.recipe.doseG,
          ratio: output.recipe.ratio,
          grindSize: output.recipe.grindSize,
          grindRpm: output.recipe.grindRpm,
          pours: output.recipe.pours,
          reasoning: output.recipe.reasoning,
        },
        searched: output.searched,
        sources: output.sources,
      },
    };
  },
});
