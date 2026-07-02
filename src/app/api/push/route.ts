import { NextRequest, NextResponse } from "next/server";
import {
  pushRecipeInputSchema,
  pushRecipeToXbloom,
} from "@/lib/xbloom/push";
import { safeError } from "@/lib/api-error";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const parsed = pushRecipeInputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid recipe", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(await pushRecipeToXbloom(parsed.data));
  } catch (err) {
    return safeError("push", err, 500, "Couldn't send the recipe to xBloom.");
  }
}
