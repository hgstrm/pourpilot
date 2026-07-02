import { defineAgent } from "eve";

const modelContextWindowTokens = Number(
  process.env.EVE_MODEL_CONTEXT_WINDOW_TOKENS || 128000,
);

export default defineAgent({
  model: process.env.EVE_MODEL || process.env.AI_MODEL || "openai/gpt-4o",
  modelContextWindowTokens: Number.isFinite(modelContextWindowTokens)
    ? modelContextWindowTokens
    : 128000,
});
