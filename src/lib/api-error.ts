import { NextResponse } from "next/server";
import { RateLimitError } from "./ai";
import { XbloomError } from "./xbloom/client";

// Returns a JSON error response that's safe to send to the browser.
//
// Our own error types carry user-friendly, non-sensitive messages, so we pass
// those through. Anything else (e.g. a raw Neon/driver error that might embed a
// connection string or internal host) is replaced with a generic message —
// the real detail is logged server-side only.

const SAFE_ERRORS = [XbloomError, RateLimitError];

export function safeError(
  context: string,
  err: unknown,
  status = 500,
  fallback = "Something went wrong. Please try again.",
): NextResponse {
  // Always log the full detail server-side (Vercel logs, never the browser).
  console.error(`[${context}]`, err);

  const isSafe = SAFE_ERRORS.some((E) => err instanceof E);
  const message = isSafe && err instanceof Error ? err.message : fallback;

  return NextResponse.json({ error: message }, { status });
}
