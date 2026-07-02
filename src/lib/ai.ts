import { createGateway } from "ai";
import {
  assertAiGatewayConfigured,
  getAiGatewayApiKey,
  hasAiGatewayEnvironmentAuth,
} from "./runtime-settings";

// Shared AI helpers: the model id and a retry/backoff wrapper so transient
// Gateway rate-limits / hiccups don't surface as scary errors.

const MODEL_ID = process.env.AI_MODEL || "openai/gpt-4o";

export async function getModel() {
  const apiKey = await getAiGatewayApiKey();
  if (apiKey) return createGateway({ apiKey })(MODEL_ID);
  if (hasAiGatewayEnvironmentAuth()) return MODEL_ID;

  await assertAiGatewayConfigured();
  return MODEL_ID;
}

/** True if the error looks like a transient rate-limit / overload. */
function isRetryable(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("rate-limit") ||
    msg.includes("rate limit") ||
    msg.includes("429") ||
    msg.includes("overloaded") ||
    msg.includes("timeout") ||
    msg.includes("503") ||
    msg.includes("502")
  );
}

export class RateLimitError extends Error {
  constructor() {
    super(
      "The AI service is busy right now (rate limit). Wait a few seconds and try again.",
    );
    this.name = "RateLimitError";
  }
}

/**
 * Run an AI call with exponential backoff on transient failures.
 * Throws a friendly RateLimitError if all attempts are exhausted on a 429.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; baseMs?: number } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 5;
  const baseMs = opts.baseMs ?? 1_200;
  let lastErr: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || i === attempts - 1) break;
      // exponential backoff with jitter: ~1.2s, 2.4s, 4.8s ...
      const delay = baseMs * 2 ** i + Math.random() * 300;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  if (isRetryable(lastErr)) throw new RateLimitError();
  throw lastErr;
}
