import { NextRequest, NextResponse } from "next/server";
import { listSavedRecipes, createSavedRecipe } from "@/lib/db";
import { recipeSchema, beanInfoSchema } from "@/lib/recipe-schema";
import { safeError } from "@/lib/api-error";
import { requireApiUser } from "@/lib/auth-guard";
import { z } from "zod";

export const runtime = "nodejs";

const createBody = z.object({
  name: z.string().optional(),
  bean: beanInfoSchema.nullable().optional(),
  recipe: recipeSchema,
});

export async function GET() {
  try {
    const unauthorized = await requireApiUser();
    if (unauthorized) return unauthorized;

    const recipes = await listSavedRecipes();
    return NextResponse.json({ recipes });
  } catch (err) {
    return safeError("recipes:list", err, 500, "Couldn't load your recipes.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const unauthorized = await requireApiUser();
    if (unauthorized) return unauthorized;

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
    return safeError("recipes:create", err, 500, "Couldn't save the recipe.");
  }
}
