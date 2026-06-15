import { NextRequest, NextResponse } from "next/server";
import {
  getSavedRecipe,
  updateSavedRecipe,
  deleteSavedRecipe,
} from "@/lib/db";
import { recipeSchema, beanInfoSchema } from "@/lib/recipe-schema";
import { safeError } from "@/lib/api-error";
import { z } from "zod";

export const runtime = "nodejs";

const updateBody = z.object({
  name: z.string().optional(),
  bean: beanInfoSchema.nullable().optional(),
  recipe: recipeSchema.optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const recipe = await getSavedRecipe(id);
    if (!recipe) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ recipe });
  } catch (err) {
    return safeError("recipes:get", err, 500, "Couldn't load the recipe.");
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const parsed = updateBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const updated = await updateSavedRecipe(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ recipe: updated });
  } catch (err) {
    return safeError("recipes:update", err, 500, "Couldn't update the recipe.");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const ok = await deleteSavedRecipe(id);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return safeError("recipes:delete", err, 500, "Couldn't delete the recipe.");
  }
}
