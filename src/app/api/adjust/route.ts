import { NextRequest, NextResponse } from "next/server";
import { adjustRecipe } from "@/lib/adjust";
import { recipeSchema, beanInfoSchema } from "@/lib/recipe-schema";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const body = z.object({
  recipe: recipeSchema,
  bean: beanInfoSchema.nullable().optional(),
  feedback: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = body.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const result = await adjustRecipe({
      recipe: parsed.data.recipe,
      bean: parsed.data.bean ?? null,
      feedback: parsed.data.feedback,
    });
    return NextResponse.json({ recipe: result });
  } catch (err) {
    console.error("[adjust] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Adjust failed" },
      { status: 500 },
    );
  }
}
