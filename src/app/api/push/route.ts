import { NextRequest, NextResponse } from "next/server";
import { login, createRecipe, editRecipe } from "@/lib/xbloom/client";
import type { CoffeeRecipe } from "@/lib/xbloom/types";
import { recipeSchema } from "@/lib/recipe-schema";
import { getSavedRecipe, updateSavedRecipe } from "@/lib/db";
import { z } from "zod";

export const runtime = "nodejs";

const pushBody = z.object({
  recipe: recipeSchema,
  color: z.string().optional(),
  /** If set, we update this saved DB row with the resulting xBloom id. */
  savedId: z.string().optional(),
  /**
   * If set, edit this xBloom recipe in place instead of creating a new one.
   * (Takes precedence; otherwise we look it up from savedId.)
   */
  xbloomId: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const email = process.env.XBLOOM_EMAIL;
    const password = process.env.XBLOOM_PASSWORD;
    if (!email || !password) {
      return NextResponse.json(
        { error: "Server is missing XBLOOM_EMAIL / XBLOOM_PASSWORD env vars" },
        { status: 500 },
      );
    }

    const parsed = pushBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid recipe", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const r = parsed.data.recipe;
    const recipe: CoffeeRecipe = {
      name: r.name,
      doseG: r.doseG,
      ratio: r.ratio,
      grindSize: r.grindSize,
      grindRpm: r.grindRpm,
      pours: r.pours,
      color: parsed.data.color,
    };

    // Resolve whether this is an in-place edit.
    let xbloomId = parsed.data.xbloomId ?? null;
    if (!xbloomId && parsed.data.savedId) {
      const existing = await getSavedRecipe(parsed.data.savedId);
      if (existing?.xbloomId) xbloomId = existing.xbloomId;
    }

    const creds = await login(email, password);

    if (xbloomId) {
      await editRecipe(creds, xbloomId, recipe);
      if (parsed.data.savedId) {
        await updateSavedRecipe(parsed.data.savedId, { recipe: r });
      }
      return NextResponse.json({ ok: true, updated: true, xbloomId });
    }

    const created = await createRecipe(creds, recipe);
    if (parsed.data.savedId) {
      await updateSavedRecipe(parsed.data.savedId, {
        recipe: r,
        xbloomId: created.recipeId,
        shareUrl: created.shareUrl,
      });
    }
    return NextResponse.json({
      ok: true,
      updated: false,
      xbloomId: created.recipeId,
      shareUrl: created.shareUrl,
    });
  } catch (err) {
    console.error("[push] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Push failed" },
      { status: 500 },
    );
  }
}
