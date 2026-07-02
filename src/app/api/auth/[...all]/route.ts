import { NextRequest, NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { auth, ensureAuthSchema } from "@/lib/auth";
import { canCreateAccount } from "@/lib/auth-signups";

export const runtime = "nodejs";

const handler = toNextJsHandler(auth);

export async function GET(request: NextRequest) {
  await ensureAuthSchema();
  return handler.GET(request);
}

export async function POST(request: NextRequest) {
  await ensureAuthSchema();

  if (isEmailSignUp(request) && !(await canCreateAccount())) {
    return NextResponse.json(
      { error: "This PourPilot instance already has an owner." },
      { status: 403 },
    );
  }

  return handler.POST(request);
}

function isEmailSignUp(request: NextRequest): boolean {
  return new URL(request.url).pathname.endsWith("/api/auth/sign-up/email");
}
