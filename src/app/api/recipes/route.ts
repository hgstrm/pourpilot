import { NextRequest, NextResponse } from "next/server";
import { listSavedRecipes, createSavedRecipe } from "@/lib/db";
import { recipeSchema, beanInfoSchema } from "@/lib/recipe-schema";
import { z } from "zod";

export const runtime = "nodejs";

const createBody = z.object({
  name: z.string().optional(),
  bean: beanInfoSchema.nullable().optional(),
  recipe: recipeSchema,
});

export async function GET() {
  try {
    const recipes = await listSavedRecipes();
    return NextResponse.json({ recipes });
  } catch (err) {
    console.error("[recipes:list] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list recipes" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = createBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid recipe", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { recipe, bean } = parsed.data;
    const saved = await createSavedRecipe({
      name: parsed.data.name ?? recipe.name,
      bean: bean ?? null,
      recipe,
    });
    return NextResponse.json({ recipe: saved });
  } catch (err) {
    console.error("[recipes:create] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save recipe" },
      { status: 500 },
    );
  }
}
