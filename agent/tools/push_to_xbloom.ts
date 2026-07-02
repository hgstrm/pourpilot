import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import {
  pushRecipeInputSchema,
  pushRecipeResultSchema,
  pushRecipeToXbloom,
} from "../../src/lib/xbloom/push";

export default defineTool({
  description:
    "Send a finished recipe to the user's xBloom account, or update an existing xBloom recipe.",
  inputSchema: pushRecipeInputSchema,
  outputSchema: pushRecipeResultSchema,
  approval: always(),
  async execute(input) {
    return pushRecipeToXbloom(input);
  },
  toModelOutput(output) {
    return {
      type: "json",
      value: {
        ok: output.ok,
        updated: output.updated,
        xbloomId: output.xbloomId,
        shareUrl: output.shareUrl,
      },
    };
  },
});
